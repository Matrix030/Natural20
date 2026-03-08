'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLiveAPI } from '@/hooks/use-live-api';
import { getGenAI } from '@/lib/genai';
import { Mic, Play, Square, Dices, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';

import { WorldState, initialWorldState, questTools, DM_SYSTEM_INSTRUCTION } from '@/lib/quest-engine';
import { StatePanel } from '@/components/StatePanel';
import { Transcript, Message } from '@/components/Transcript';
import { SceneImage } from '@/components/SceneImage';
import { LandingPage } from '@/components/LandingPage';
import { EndRecap } from '@/components/EndRecap';

const MAX_IMAGES_PER_LOCATION = 3;

export default function Home() {
  const [view, setView] = useState<'landing' | 'session' | 'recap'>('landing');
  const [mounted, setMounted] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [worldState, setWorldState] = useState<WorldState>(initialWorldState);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sceneImages, setSceneImages] = useState<string[]>([]);
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  const [currentSceneDesc, setCurrentSceneDesc] = useState<string>('');

  // Track image count via ref to avoid stale closures and race conditions.
  const sceneImageCountRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    const checkApiKey = async () => {
      if (typeof window !== 'undefined' && (window as unknown as { aistudio?: { hasSelectedApiKey: () => Promise<boolean> } }).aistudio) {
        const hasKey = await (window as unknown as { aistudio: { hasSelectedApiKey: () => Promise<boolean> } }).aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (typeof window !== 'undefined' && (window as unknown as { aistudio?: { openSelectKey: () => Promise<void> } }).aistudio) {
      await (window as unknown as { aistudio: { openSelectKey: () => Promise<void> } }).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const sendToolResponseRef = useRef<((responses: unknown[]) => void) | null>(null);
  const dmTurnBufferRef = useRef<string>('');
  const playerTurnBufferRef = useRef<string>('');

  const generateSceneImage = useCallback(async (description: string, tone: string) => {
    // Guard via ref so concurrent calls don't both slip through the limit.
    if (sceneImageCountRef.current >= MAX_IMAGES_PER_LOCATION) return;
    sceneImageCountRef.current += 1;

    setIsGeneratingScene(true);
    setCurrentSceneDesc(description);

    const attemptGenerate = async (retryCount = 0): Promise<void> => {
      try {
        const ai = getGenAI();
        const prompt = `A highly detailed, cinematic fantasy illustration. ${description}. Tone: ${tone}. Masterpiece, trending on artstation, 8k.`;
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
          contents: { parts: [{ text: prompt }] },
          config: { imageConfig: { aspectRatio: '16:9', imageSize: '1K' } },
        });
        let found = false;
        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData) {
            setSceneImages(prev => [...prev, `data:image/png;base64,${part.inlineData!.data}`]);
            found = true;
            break;
          }
        }
        // If no image returned, release the slot so a retry can fill it.
        if (!found) sceneImageCountRef.current -= 1;
      } catch (error: unknown) {
        const status = (error as { status?: number; error?: { code?: number } })?.status
          ?? (error as { error?: { code?: number } })?.error?.code;
        if (status === 429 && retryCount < 2) {
          const retryAfterMatch = JSON.stringify(error).match(/"retryDelay"\s*:\s*"(\d+)s"/);
          const delayMs = retryAfterMatch?.[1] ? parseInt(retryAfterMatch[1]) * 1000 : 35000;
          await new Promise(res => setTimeout(res, delayMs));
          return attemptGenerate(retryCount + 1);
        }
        console.error('Failed to generate scene image:', error);
        sceneImageCountRef.current -= 1;
      }
    };

    try {
      await attemptGenerate();
    } finally {
      setIsGeneratingScene(false);
    }
  }, []);

  const handleMessage = useCallback(async (message: unknown) => {
    const msg = message as {
      serverContent?: {
        outputTranscription?: { text?: string };
        inputTranscription?: { text?: string };
        turnComplete?: boolean;
        interrupted?: boolean;
      };
      toolCall?: { functionCalls?: { id: string; name: string; args: Record<string, unknown> }[] };
    };

    if (msg.serverContent?.inputTranscription?.text) {
      playerTurnBufferRef.current += msg.serverContent.inputTranscription.text;
    }
    if (msg.serverContent?.outputTranscription?.text) {
      dmTurnBufferRef.current += msg.serverContent.outputTranscription.text;
    }
    if (msg.serverContent?.turnComplete) {
      if (playerTurnBufferRef.current.trim()) {
        setMessages(prev => [...prev, { role: 'Player', text: playerTurnBufferRef.current.trim(), timestamp: Date.now() }]);
        playerTurnBufferRef.current = '';
      }
      if (dmTurnBufferRef.current.trim()) {
        setMessages(prev => [...prev, { role: 'DM', text: dmTurnBufferRef.current.trim(), timestamp: Date.now() }]);
        dmTurnBufferRef.current = '';
      }
    }

    if (msg.toolCall?.functionCalls) {
      const responses: unknown[] = [];
      for (const call of msg.toolCall.functionCalls) {
        if (call.name === 'update_world_state') {
          setWorldState(prev => {
            if (call.args.currentLocation && call.args.currentLocation !== prev.currentLocation) {
              sceneImageCountRef.current = 0;
              setSceneImages([]);
            }
            return { ...prev, ...call.args } as WorldState;
          });
          responses.push({ id: call.id, name: call.name, response: { result: 'State updated successfully.' } });
        } else if (call.name === 'resolve_skill_check') {
          setWorldState(prev => ({ ...prev, lastCheckResult: call.args.outcome as string }));
          responses.push({ id: call.id, name: call.name, response: { result: 'Check resolved.' } });
        } else if (call.name === 'trigger_visual_scene') {
          generateSceneImage(call.args.description as string, call.args.tone as string);
          responses.push({ id: call.id, name: call.name, response: { result: 'Visual scene triggered.' } });
        }
      }
      if (sendToolResponseRef.current && responses.length > 0) {
        sendToolResponseRef.current(responses);
      }
    }
  }, [generateSceneImage]);

  const { liveState, connect, disconnect, sendToolResponse } = useLiveAPI({
    systemInstruction: DM_SYSTEM_INSTRUCTION,
    tools: [{ functionDeclarations: questTools }],
    onMessage: handleMessage,
  });

  // Keep ref in sync with the stable sendToolResponse from the hook.
  sendToolResponseRef.current = sendToolResponse;

  const handleStartSession = () => setView('session');

  const handleEndSession = () => {
    disconnect();
    setView('recap');
  };

  const handleRestart = () => {
    disconnect();
    sceneImageCountRef.current = 0;
    setWorldState(initialWorldState);
    setMessages([]);
    setSceneImages([]);
    setView('landing');
  };

  if (!mounted) return null;

  if (!hasApiKey) {
    return (
      <div className="min-h-screen dnd-bg text-parchment-200 flex items-center justify-center p-6">
        <div className="max-w-md w-full dnd-panel p-8 flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 border border-gold-600/40 bg-stone-900/80 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-gold-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-cinzel text-gold-400 tracking-wider">API Key Required</h1>
            <div className="dnd-divider"><span>◆</span></div>
            <p className="text-parchment-400 text-sm leading-relaxed font-serif italic">
              DungeonFlow Live requires a paid Google Cloud project API key for its advanced multimodal models.
            </p>
          </div>
          <button onClick={handleSelectKey} className="dnd-btn-primary w-full py-3 font-cinzel text-xs uppercase tracking-widest text-gold-300">
            Select API Key
          </button>
          <p className="text-xs text-stone-500 font-serif">
            Learn more about{' '}
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:text-gold-300 underline underline-offset-2">
              billing and API keys
            </a>.
          </p>
        </div>
      </div>
    );
  }

  if (view === 'landing') return <LandingPage onStart={handleStartSession} />;
  if (view === 'recap') return <EndRecap state={worldState} onRestart={handleRestart} />;

  return (
    <div className="min-h-screen dnd-bg text-parchment-200 flex flex-col">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="dnd-panel border-x-0 border-t-0 sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <div className="absolute top-0 left-0 w-24 h-full bg-amber-900/8 pointer-events-none" />
        <div className="absolute top-0 right-0 w-24 h-full bg-amber-900/8 pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-10 h-10 border border-gold-600/50 bg-stone-900/80 flex items-center justify-center dnd-glow-gold shrink-0">
            <span className="text-lg text-gold-400 leading-none">⚔</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-cinzel-deco text-gold-gradient leading-tight tracking-wide">
              DungeonFlow Live
            </h1>
            <span className="text-[9px] font-cinzel text-stone-500 uppercase tracking-[0.25em]">
              The Bell of Black Hollow
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="flex items-center gap-2 px-3 py-1.5 dnd-panel-inset border border-gold-700/20">
            <div className={`w-2 h-2 rounded-full ${
              liveState === 'connected'
                ? 'bg-blood-500 blood-pulse'
                : liveState === 'connecting'
                ? 'bg-gold-500 animate-pulse'
                : 'bg-stone-600'
            }`} />
            <span className="text-[9px] font-cinzel uppercase tracking-widest text-stone-400">{liveState}</span>
          </div>

          {liveState === 'disconnected' ? (
            <button
              onClick={connect}
              className="dnd-btn-primary flex items-center gap-2 px-5 py-2 font-cinzel text-[10px] uppercase tracking-widest text-gold-300"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Begin Session
            </button>
          ) : (
            <button
              onClick={handleEndSession}
              className="dnd-btn-secondary flex items-center gap-2 px-5 py-2 font-cinzel text-[10px] uppercase tracking-widest"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              End Session
            </button>
          )}
        </div>
      </header>

      {/* ── Main Grid ───────────────────────────────────────── */}
      <main className="flex-1 p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1800px] mx-auto w-full overflow-hidden">
        <div className="lg:col-span-3 flex flex-col gap-5 h-[calc(100vh-8rem)]">
          <StatePanel state={worldState} />
        </div>

        <div className="lg:col-span-6 flex flex-col gap-5 h-[calc(100vh-8rem)]">
          <SceneImage images={sceneImages} isGenerating={isGeneratingScene} description={currentSceneDesc} />

          <div className="flex-1 dnd-panel flex flex-col items-center justify-center text-center gap-6 p-6 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-5">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_rgba(201,162,39,0.4)_0%,_transparent_70%)]" />
            </div>

            <div className="relative z-10 space-y-4">
              <div className="relative w-16 h-16 border border-gold-600/30 bg-stone-950 flex items-center justify-center mx-auto">
                <div className="absolute -top-px -left-px w-3 h-3 border-l border-t border-gold-500/50" />
                <div className="absolute -top-px -right-px w-3 h-3 border-r border-t border-gold-500/50" />
                <div className="absolute -bottom-px -left-px w-3 h-3 border-l border-b border-gold-500/50" />
                <div className="absolute -bottom-px -right-px w-3 h-3 border-r border-b border-gold-500/50" />

                {liveState === 'connected' ? (
                  <motion.div
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-5 h-5 rounded-full bg-blood-600 blood-pulse"
                  />
                ) : (
                  <Mic className="w-6 h-6 text-stone-600" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-cinzel uppercase tracking-[0.25em] text-gold-400">
                  {liveState === 'connected' ? 'The DM Listens...' : 'Awaiting Connection'}
                </h3>
                <p className="text-xs text-stone-500 italic font-serif">
                  &quot;I investigate the bell chain...&quot;
                </p>
              </div>
            </div>

            <div className="relative z-10">
              <button
                disabled={liveState !== 'connected'}
                className="dnd-btn-secondary flex flex-col items-center gap-2 p-4 disabled:opacity-25 disabled:cursor-not-allowed group"
              >
                <Dices className="w-6 h-6 text-gold-500 group-hover:rotate-12 transition-transform" />
                <span className="text-[9px] font-cinzel uppercase tracking-widest">Roll d20</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-5 h-[calc(100vh-8rem)]">
          <Transcript messages={messages} />
        </div>
      </main>
    </div>
  );
}
