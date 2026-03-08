import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Book, MessageSquare, Target, ArrowRight, RotateCcw } from 'lucide-react';
import { WorldState } from '@/lib/quest-engine';

interface EndRecapProps {
  state: WorldState;
  onRestart: () => void;
}

export const EndRecap: React.FC<EndRecapProps> = ({ state, onRestart }) => {
  return (
    <div className="min-h-screen dnd-bg text-parchment-200 flex items-center justify-center p-6 overflow-y-auto relative">
      {/* Torch glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-amber-900/15 rounded-full blur-[120px] torch-flicker" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-900/10 rounded-full blur-[120px] torch-flicker" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-blood-900/10 rounded-full blur-[100px]" />
      </div>

      {/* Corner decorations */}
      <div className="absolute top-6 left-6 w-12 h-12 border-l-2 border-t-2 border-gold-600/30 pointer-events-none" />
      <div className="absolute top-6 right-6 w-12 h-12 border-r-2 border-t-2 border-gold-600/30 pointer-events-none" />
      <div className="absolute bottom-6 left-6 w-12 h-12 border-l-2 border-b-2 border-gold-600/30 pointer-events-none" />
      <div className="absolute bottom-6 right-6 w-12 h-12 border-r-2 border-b-2 border-gold-600/30 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl w-full dnd-panel p-0 relative overflow-hidden"
      >
        {/* Header band */}
        <div className="dnd-panel-header p-8 text-center space-y-4">
          {/* Trophy seal */}
          <div className="inline-flex items-center justify-center w-20 h-20 border-2 border-gold-500/50 bg-stone-900/80 mb-2 relative">
            <Trophy className="w-9 h-9 text-gold-400" />
            <div className="absolute -top-1 -left-1 w-3 h-3 border-l border-t border-gold-500/50" />
            <div className="absolute -top-1 -right-1 w-3 h-3 border-r border-t border-gold-500/50" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-l border-b border-gold-500/50" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r border-b border-gold-500/50" />
          </div>

          <h1 className="text-4xl md:text-5xl font-cinzel-deco text-gold-gradient">
            Quest Concluded
          </h1>

          <div className="dnd-divider max-w-sm mx-auto"><span>⚔</span></div>

          <p className="text-parchment-400 text-base font-serif italic">
            The bells of Black Hollow have found their peace.
          </p>
        </div>

        {/* Recap grid */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          <RecapSection
            icon={<Book className="w-4 h-4 text-gold-400" />}
            title="The Outcome"
            content={state.currentObjective}
          />
          <RecapSection
            icon={<Target className="w-4 h-4 text-blood-400" />}
            title="Final Location"
            content={state.currentLocation}
          />
          <RecapSection
            icon={<MessageSquare className="w-4 h-4 text-gold-500/70" />}
            title="Key Clues Found"
            content={state.knownClues.length > 0 ? state.knownClues.join(' · ') : 'None discovered.'}
          />
          <RecapSection
            icon={<RotateCcw className="w-4 h-4 text-parchment-500" />}
            title="Legacy"
            content={`As ${state.playerName} the ${state.playerRole}, your actions in Black Hollow shall be remembered for generations.`}
          />
        </div>

        {/* CTA */}
        <div className="px-8 pb-8 flex flex-col items-center gap-5">
          <button
            onClick={onRestart}
            className="dnd-btn-secondary group inline-flex items-center gap-3 px-8 py-4 font-cinzel text-xs uppercase tracking-widest"
          >
            <ArrowRight className="w-4 h-4 scale-x-[-1]" />
            Return to the Square
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-stone-500 text-[9px] font-cinzel uppercase tracking-[0.25em]">
            Thank you for playing DungeonFlow Live
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const RecapSection = ({ icon, title, content }: { icon: React.ReactNode; title: string; content: string }) => (
  <div className="dnd-panel-inset p-5 flex flex-col gap-2.5">
    <div className="flex items-center gap-2.5">
      {icon}
      <h3 className="text-[10px] font-cinzel text-gold-600 uppercase tracking-widest">{title}</h3>
    </div>
    <div className="dnd-divider"><span>◆</span></div>
    <p className="text-sm text-parchment-300 leading-relaxed font-serif italic">{content}</p>
  </div>
);
