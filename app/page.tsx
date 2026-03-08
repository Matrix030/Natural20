'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLiveAPI } from '@/hooks/use-live-api';
import { GoogleGenAI } from '@google/genai';
import { Camera, Mic, Play, Square, Dices, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';

import { WorldState, initialWorldState, questTools, DM_SYSTEM_INSTRUCTION } from '@/lib/quest-engine';
import { StatePanel } from '@/components/StatePanel';
import { Transcript, Message } from '@/components/Transcript';
import { SceneImage } from '@/components/SceneImage';
import { LandingPage } from '@/components/LandingPage';
import { EndRecap } from '@/components/EndRecap';

export default function Home() {
  const [view, setView] = useState<'landing' | 'session' | 'recap'>('landing');
  const [mounted, setMounted] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [worldState, setWorldState] = useState<WorldState>(initialWorldState);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sceneImages, setSceneImages] = useState<string[]>([]);
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  const [currentSceneDesc, setCurrentSceneDesc] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    const checkApiKey = async () => {
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Failed to access camera:', err);
    }
  };

  useEffect(() => {
    if (view === 'session' && mounted && hasApiKey) startCamera();
    const videoElement = videoRef.current;
    return () => {
      if (videoElement?.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [view, mounted, hasApiKey]);

  const sendToolResponseRef = useRef<((responses: any[]) => void) | null>(null);
  const dmTurnBufferRef = useRef<string>('');

  const generateSceneImage = useCallback(async (description: string, tone: string) => {
    if (sceneImages.length >= 3) return;
    setIsGeneratingScene(true);
    setCurrentSceneDesc(description);

    const attemptGenerate = async (retryCount = 0): Promise<void> => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) throw new Error('Missing API Key');
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `A highly detailed, cinematic fantasy illustration. ${description}. Tone: ${tone}. Masterpiece, trending on artstation, 8k.`;
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
          contents: { parts: [{ text: prompt }] },
          config: { imageConfig: { aspectRatio: '16:9', imageSize: '1K' } }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            setSceneImages(prev => [...prev, `data:image/png;base64,${part.inlineData!.data}`]);
            break;
          }
        }
      } catch (error: any) {
        const status = error?.status ?? error?.error?.code;
        if (status === 429 && retryCount < 2) {
          // Parse suggested retry delay from error, default to 35s
          const retryAfterMatch = JSON.stringify(error).match(/"retryDelay"\s*:\s*"(\d+)s"/);
          const delayMs = retryAfterMatch ? parseInt(retryAfterMatch[1]) * 1000 : 35000;
          await new Promise(res => setTimeout(res, delayMs));
          return attemptGenerate(retryCount + 1);
        }
        console.error('Failed to generate scene image:', error);
      }
    };

    try {
      await attemptGenerate();
    } finally {
      setIsGeneratingScene(false);
    }
  }, [sceneImages.length]);

  const handleMessage = useCallback(async (message: any) => {
    if (message.serverContent?.outputTranscription?.text) {
      dmTurnBufferRef.current += message.serverContent.outputTranscription.text;
    }
    if (message.serverContent?.turnComplete && dmTurnBufferRef.current.trim()) {
      setMessages(prev => [...prev, { role: 'DM', text: dmTurnBufferRef.current.trim(), timestamp: Date.now() }]);
      dmTurnBufferRef.current = '';
    }
    if (message.toolCall) {
      const functionCalls = message.toolCall.functionCalls;
      if (functionCalls) {
        const responses: any[] = [];
        for (const call of functionCalls) {
          if (call.name === 'update_world_state') {
            setWorldState(prev => {
              if (call.args.currentLocation && call.args.currentLocation !== prev.currentLocation) setSceneImages([]);
              return { ...prev, ...call.args };
            });
            responses.push({ id: call.id, name: call.name, response: { result: 'State updated successfully.' } });
          } else if (call.name === 'resolve_skill_check') {
            setWorldState(prev => ({ ...prev, lastCheckResult: call.args.outcome }));
            responses.push({ id: call.id, name: call.name, response: { result: 'Check resolved.' } });
          } else if (call.name === 'trigger_visual_scene') {
            generateSceneImage(call.args.description, call.args.tone);
            responses.push({ id: call.id, name: call.name, response: { result: 'Visual scene triggered.' } });
          }
        }
        if (sendToolResponseRef.current && responses.length > 0) sendToolResponseRef.current(responses);
      }
    }
  }, [generateSceneImage]);

  const { liveState, connect, disconnect, sendImage, sendToolResponse } = useLiveAPI({
    systemInstruction: DM_SYSTEM_INSTRUCTION,
    tools: [{ functionDeclarations: questTools }],
    onMessage: handleMessage,
  });

  useEffect(() => { sendToolResponseRef.current = sendToolResponse; }, [sendToolResponse]);

  const handleRollDice = () => {
    if (!videoRef.current || liveState !== 'connected') return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];
    setMessages(prev => [...prev, { role: 'Player', text: '[Rolled Dice on Camera]', timestamp: Date.now() }]);
    sendImage(base64Data, 'image/jpeg');
  };

  const handleStartSession = () => setView('session');
  const handleEndSession = () => { disconnect(); setView('recap'); };
  const handleRestart = () => { setWorldState(initialWorldState); setMessages([]); setSceneImages([]); setView('landing'); };

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
        {/* Torch glow corners on header */}
        <div className="absolute top-0 left-0 w-24 h-full bg-amber-900/8 pointer-events-none" />
        <div className="absolute top-0 right-0 w-24 h-full bg-amber-900/8 pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          {/* Emblem */}
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
          {/* Connection status */}
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
        {/* Left: World State */}
        <div className="lg:col-span-3 flex flex-col gap-5 h-[calc(100vh-8rem)]">
          <StatePanel state={worldState} />
        </div>

        {/* Center: Stage & Visuals */}
        <div className="lg:col-span-6 flex flex-col gap-5 h-[calc(100vh-8rem)]">
          <SceneImage images={sceneImages} isGenerating={isGeneratingScene} description={currentSceneDesc} />

          {/* Control Stage */}
          <div className="flex-1 dnd-panel flex flex-col items-center justify-center text-center gap-6 p-6 relative overflow-hidden">
            {/* Subtle ambient glow */}
            <div className="absolute inset-0 pointer-events-none opacity-5">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_rgba(201,162,39,0.4)_0%,_transparent_70%)]" />
            </div>

            {/* Mic / listening indicator */}
            <div className="relative z-10 space-y-4">
              <div className="relative w-16 h-16 border border-gold-600/30 bg-stone-950 flex items-center justify-center mx-auto">
                {/* Corner ornaments on indicator */}
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

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm relative z-10">
              <button
                onClick={handleRollDice}
                disabled={liveState !== 'connected'}
                className="dnd-btn-secondary flex flex-col items-center gap-2 p-4 disabled:opacity-25 disabled:cursor-not-allowed group"
              >
                <Dices className="w-6 h-6 text-gold-500 group-hover:rotate-12 transition-transform" />
                <span className="text-[9px] font-cinzel uppercase tracking-widest">Roll d20</span>
              </button>
              <div className="flex flex-col items-center gap-2 p-4 border border-stone-800/50 bg-stone-950/50 text-stone-600 opacity-40 cursor-not-allowed">
                <Camera className="w-6 h-6" />
                <span className="text-[9px] font-cinzel uppercase tracking-widest">Dice Cam</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Transcript + Camera */}
        <div className="lg:col-span-3 flex flex-col gap-5 h-[calc(100vh-8rem)]">
          <Transcript messages={messages} />

          {/* Camera Preview */}
          <div className="dnd-panel overflow-hidden aspect-video relative shrink-0">
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-950/80 text-stone-600 gap-2">
                <Camera className="w-5 h-5 text-gold-700/30" />
                <span className="text-[9px] font-cinzel uppercase tracking-widest text-stone-600/50">
                  Camera Offline
                </span>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover grayscale opacity-50"
            />
            <div className="absolute top-2 left-2 z-10">
              <div className="px-2 py-1 bg-stone-950/70 border border-gold-700/25 text-[8px] font-cinzel uppercase tracking-widest text-gold-600/60">
                Live Feed
              </div>
            </div>
            {/* Frame corners */}
            <div className="absolute top-1 left-1 w-3 h-3 border-l border-t border-gold-600/30 pointer-events-none" />
            <div className="absolute top-1 right-1 w-3 h-3 border-r border-t border-gold-600/30 pointer-events-none" />
            <div className="absolute bottom-1 left-1 w-3 h-3 border-l border-b border-gold-600/30 pointer-events-none" />
            <div className="absolute bottom-1 right-1 w-3 h-3 border-r border-b border-gold-600/30 pointer-events-none" />
          </div>
        </div>
      </main>
    </div>
  );
}
