'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLiveAPI } from '@/hooks/use-live-api';
import { GoogleGenAI } from '@google/genai';
import { Camera, Mic, MicOff, Play, Square, Dices, Loader2, Sparkles, MapPin, Target, Search, Users, AlertTriangle, Shield, User, MessageSquare, Trophy, Book, RotateCcw, ArrowRight, Zap, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';

// Import our custom components and logic
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

  // Session State
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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Failed to access camera:", err);
    }
  };

  useEffect(() => {
    if (view === 'session' && mounted && hasApiKey) {
      startCamera();
    }
    const videoElement = videoRef.current;
    return () => {
      if (videoElement?.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [view, mounted, hasApiKey]);

  const sendToolResponseRef = useRef<((responses: any[]) => void) | null>(null);

  const generateSceneImage = useCallback(async (description: string, tone: string) => {
    // Limit to 3 images per scene
    if (sceneImages.length >= 3) {
      console.log("Max images for this scene reached.");
      return;
    }

    setIsGeneratingScene(true);
    setCurrentSceneDesc(description);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing API Key");
      
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `A highly detailed, cinematic fantasy illustration. ${description}. Tone: ${tone}. Masterpiece, trending on artstation, 8k.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const newImage = `data:image/png;base64,${part.inlineData.data}`;
          setSceneImages(prev => [...prev, newImage]);
          break;
        }
      }
    } catch (error) {
      console.error("Failed to generate scene image:", error);
    } finally {
      setIsGeneratingScene(false);
    }
  }, [sceneImages.length]);

  const handleMessage = useCallback(async (message: any) => {
    // Handle transcript from output audio transcription
    if (message.serverContent?.outputTranscription?.text) {
      const text = message.serverContent.outputTranscription.text;
      setMessages(prev => [...prev, { role: 'DM', text, timestamp: Date.now() }]);
    }

    // Handle tool calls
    if (message.toolCall) {
      const functionCalls = message.toolCall.functionCalls;
      if (functionCalls) {
        const responses: any[] = [];
        for (const call of functionCalls) {
          if (call.name === 'update_world_state') {
            setWorldState(prev => {
              // If location changes, clear images
              if (call.args.currentLocation && call.args.currentLocation !== prev.currentLocation) {
                setSceneImages([]);
              }
              return { ...prev, ...call.args };
            });
            responses.push({ id: call.id, name: call.name, response: { result: "State updated successfully." } });
          } else if (call.name === 'resolve_skill_check') {
            setWorldState(prev => ({ ...prev, lastCheckResult: call.args.outcome }));
            responses.push({ id: call.id, name: call.name, response: { result: "Check resolved." } });
          } else if (call.name === 'trigger_visual_scene') {
            generateSceneImage(call.args.description, call.args.tone);
            responses.push({ id: call.id, name: call.name, response: { result: "Visual scene triggered." } });
          }
        }
        if (sendToolResponseRef.current && responses.length > 0) {
          sendToolResponseRef.current(responses);
        }
      }
    }
  }, [generateSceneImage]);

  const { liveState, connect, disconnect, sendImage, sendToolResponse } = useLiveAPI({
    systemInstruction: DM_SYSTEM_INSTRUCTION,
    tools: [{ functionDeclarations: questTools }],
    onMessage: handleMessage,
  });

  useEffect(() => {
    sendToolResponseRef.current = sendToolResponse;
  }, [sendToolResponse]);

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

  const handleStartSession = () => {
    setView('session');
  };

  const handleEndSession = () => {
    disconnect();
    setView('recap');
  };

  const handleRestart = () => {
    setWorldState(initialWorldState);
    setMessages([]);
    setSceneImages([]);
    setView('landing');
  };

  if (!mounted) return null;

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center text-center gap-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <Sparkles className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">API Key Required</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              DungeonFlow Live uses advanced multimodal models that require a paid Google Cloud project API key.
            </p>
          </div>
          <button 
            onClick={handleSelectKey}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors font-medium shadow-lg shadow-indigo-500/20"
          >
            Select API Key
          </button>
          <p className="text-xs text-zinc-500">
            Learn more about <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">billing and API keys</a>.
          </p>
        </div>
      </div>
    );
  }

  if (view === 'landing') return <LandingPage onStart={handleStartSession} />;
  if (view === 'recap') return <EndRecap state={worldState} onRestart={handleRestart} />;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-md p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight leading-none">DungeonFlow <span className="text-indigo-500">Live</span></h1>
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1">The Bell of Black Hollow</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-sm">
            <div className={`w-2 h-2 rounded-full ${liveState === 'connected' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : liveState === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-zinc-600'}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{liveState}</span>
          </div>
          
          {liveState === 'disconnected' ? (
            <button 
              onClick={connect}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20"
            >
              <Play className="w-4 h-4 fill-current" /> Start Session
            </button>
          ) : (
            <button 
              onClick={handleEndSession}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-all font-bold text-xs uppercase tracking-widest"
            >
              <Square className="w-4 h-4 fill-current" /> End Session
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1800px] mx-auto w-full overflow-hidden">
        {/* Left Column: World State */}
        <div className="lg:col-span-3 flex flex-col gap-6 h-[calc(100vh-8rem)]">
          <StatePanel state={worldState} />
        </div>

        {/* Center Column: Stage & Visuals */}
        <div className="lg:col-span-6 flex flex-col gap-6 h-[calc(100vh-8rem)]">
          <SceneImage 
            images={sceneImages} 
            isGenerating={isGeneratingScene} 
            description={currentSceneDesc}
          />
          
          <div className="flex-1 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-5">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent" />
            </div>
            
            <div className="relative z-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto border border-zinc-700">
                {liveState === 'connected' ? (
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-4 h-4 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.8)]" 
                  />
                ) : (
                  <Mic className="w-6 h-6 text-zinc-600" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300">
                  {liveState === 'connected' ? 'Listening to your voice...' : 'Connect to speak'}
                </h3>
                <p className="text-xs text-zinc-500 italic">&quot;I investigate the bell chain...&quot;</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm relative z-10">
              <button
                onClick={handleRollDice}
                disabled={liveState !== 'connected'}
                className="flex flex-col items-center gap-2 p-4 bg-zinc-800/50 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-2xl transition-all border border-zinc-700 hover:border-zinc-600 group"
              >
                <Dices className="w-6 h-6 text-amber-500 group-hover:rotate-12 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Roll d20</span>
              </button>
              <div className="flex flex-col items-center gap-2 p-4 bg-zinc-800/50 text-zinc-500 rounded-2xl border border-zinc-700/50 opacity-50">
                <Camera className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Dice Cam</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Transcript */}
        <div className="lg:col-span-3 flex flex-col gap-6 h-[calc(100vh-8rem)]">
          <Transcript messages={messages} />
          
          {/* Camera Preview */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl aspect-video relative">
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 text-zinc-500 gap-2">
                <Camera className="w-6 h-6 opacity-30" />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">Camera Offline</span>
              </div>
            )}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover grayscale opacity-60"
            />
            <div className="absolute top-3 left-3">
              <div className="px-2 py-1 rounded bg-black/50 backdrop-blur text-[8px] font-bold uppercase tracking-widest text-zinc-400 border border-white/10">
                Live Feed
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
