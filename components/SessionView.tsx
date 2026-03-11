'use client';

import React from 'react';
import { Mic, Play, Square, Dices } from 'lucide-react';
import { motion } from 'motion/react';
import { LiveState, WorldState, Message } from '@/lib/types';
import { StatePanel } from '@/components/StatePanel';
import { Transcript } from '@/components/Transcript';
import { SceneImage } from '@/components/SceneImage';

interface SessionViewProps {
  liveState: LiveState;
  worldState: WorldState;
  messages: Message[];
  sceneImages: string[];
  isGeneratingScene: boolean;
  currentSceneDesc: string;
  onConnect: () => void;
  onEndSession: () => void;
  onRollDice: () => void;
}

export const SessionView: React.FC<SessionViewProps> = ({
  liveState,
  worldState,
  messages,
  sceneImages,
  isGeneratingScene,
  currentSceneDesc,
  onConnect,
  onEndSession,
  onRollDice,
}) => {
  return (
    <div className="min-h-screen dnd-bg text-parchment-200 flex flex-col">
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
          <StatusIndicator liveState={liveState} />
          {liveState === 'disconnected' ? (
            <button onClick={onConnect} className="dnd-btn-primary flex items-center gap-2 px-5 py-2 font-cinzel text-[10px] uppercase tracking-widest text-gold-300">
              <Play className="w-3.5 h-3.5 fill-current" />
              Begin Session
            </button>
          ) : (
            <button onClick={onEndSession} className="dnd-btn-secondary flex items-center gap-2 px-5 py-2 font-cinzel text-[10px] uppercase tracking-widest">
              <Square className="w-3.5 h-3.5 fill-current" />
              End Session
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1800px] mx-auto w-full overflow-hidden">
        <div className="lg:col-span-3 flex flex-col gap-5 h-[calc(100vh-8rem)]">
          <StatePanel state={worldState} />
        </div>

        <div className="lg:col-span-6 flex flex-col gap-5 h-[calc(100vh-8rem)]">
          <SceneImage images={sceneImages} isGenerating={isGeneratingScene} description={currentSceneDesc} />
          <MicPanel liveState={liveState} onRollDice={onRollDice} />
        </div>

        <div className="lg:col-span-3 flex flex-col gap-5 h-[calc(100vh-8rem)]">
          <Transcript messages={messages} />
        </div>
      </main>
    </div>
  );
};

const StatusIndicator: React.FC<{ liveState: LiveState }> = ({ liveState }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 dnd-panel-inset border border-gold-700/20">
    <div className={`w-2 h-2 rounded-full ${
      liveState === 'connected' ? 'bg-blood-500 blood-pulse'
      : liveState === 'connecting' ? 'bg-gold-500 animate-pulse'
      : 'bg-stone-600'
    }`} />
    <span className="text-[9px] font-cinzel uppercase tracking-widest text-stone-400">{liveState}</span>
  </div>
);

const MicPanel: React.FC<{ liveState: LiveState; onRollDice: () => void }> = ({ liveState, onRollDice }) => (
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
        onClick={onRollDice}
        disabled={liveState !== 'connected'}
        className="dnd-btn-secondary flex flex-col items-center gap-2 p-4 disabled:opacity-25 disabled:cursor-not-allowed group"
      >
        <Dices className="w-6 h-6 text-gold-500 group-hover:rotate-12 transition-transform" />
        <span className="text-[9px] font-cinzel uppercase tracking-widest">Roll d20</span>
      </button>
    </div>
  </div>
);
