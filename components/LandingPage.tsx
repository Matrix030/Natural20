import React from 'react';
import { Play, Mic, Shield, Zap, BookOpen, Scroll } from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen dnd-bg text-parchment-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Torch-glow background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-80 h-80 bg-amber-900/20 rounded-full blur-[140px] torch-flicker" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-900/15 rounded-full blur-[140px] torch-flicker" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-0 left-1/4 w-96 h-64 bg-red-950/20 rounded-full blur-[100px] torch-flicker" style={{ animationDelay: '0.8s' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-64 bg-amber-950/15 rounded-full blur-[100px] torch-flicker" style={{ animationDelay: '2.2s' }} />
      </div>

      {/* Corner decorations */}
      <div className="absolute top-6 left-6 w-16 h-16 border-l-2 border-t-2 border-gold-600/40 pointer-events-none" />
      <div className="absolute top-6 right-6 w-16 h-16 border-r-2 border-t-2 border-gold-600/40 pointer-events-none" />
      <div className="absolute bottom-6 left-6 w-16 h-16 border-l-2 border-b-2 border-gold-600/40 pointer-events-none" />
      <div className="absolute bottom-6 right-6 w-16 h-16 border-r-2 border-b-2 border-gold-600/40 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className="max-w-3xl w-full text-center space-y-10 relative z-10"
      >
        {/* Badge */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="inline-flex items-center gap-2 px-5 py-2 border border-gold-600/50 bg-stone-900/80 text-gold-400 text-[10px] font-cinzel uppercase tracking-[0.3em]"
        >
          <Shield className="w-3 h-3 text-gold-500" />
          Live AI Dungeon Master
          <Shield className="w-3 h-3 text-gold-500" />
        </motion.div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-6xl md:text-8xl font-cinzel-deco leading-none tracking-tight">
            <span className="text-gold-gradient">DungeonFlow</span>
            <br />
            <span className="text-parchment-300 text-5xl md:text-6xl italic font-serif">Live</span>
          </h1>

          <div className="dnd-divider max-w-xs mx-auto mt-4">
            <span>◆</span>
          </div>

          <p className="text-base md:text-lg text-parchment-400 max-w-2xl mx-auto leading-relaxed font-serif italic">
            Step into a living world where your voice shapes destiny. A real-time
            multimodal fantasy adventure, guided by an all-knowing AI Dungeon Master.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
          <FeatureCard
            icon={<Mic className="w-5 h-5 text-gold-400" />}
            title="Voice-First"
            description="Speak naturally to your DM. No text boxes, no menus — pure conversation."
          />
          <FeatureCard
            icon={<Zap className="w-5 h-5 text-blood-400" />}
            title="Real-Time"
            description="A live, interruptible session that adapts to your every word and action."
          />
          <FeatureCard
            icon={<Shield className="w-5 h-5 text-gold-500" />}
            title="Stateful"
            description="A persistent world that remembers your choices, allies, and consequences."
          />
        </div>

        {/* CTA Button */}
        <div className="pt-6 space-y-4">
          <button
            onClick={onStart}
            className="dnd-btn-primary group relative inline-flex items-center gap-3 px-12 py-5 text-gold-300 font-cinzel text-base uppercase tracking-widest cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            Begin Your Quest
            <Play className="w-5 h-5 fill-current scale-x-[-1]" />
          </button>
          <p className="text-stone-500 text-[10px] font-cinzel uppercase tracking-[0.25em]">
            Requires Microphone &amp; Camera · Paid Google Cloud API Key
          </p>
        </div>
      </motion.div>

      {/* Footer Details */}
      <div className="absolute bottom-10 left-0 w-full px-10 flex justify-between items-end opacity-50 pointer-events-none">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-cinzel uppercase tracking-widest text-gold-600">Current Scenario</span>
          <span className="text-xs font-serif italic text-parchment-400">The Bell of Black Hollow</span>
        </div>
        <div className="flex items-center gap-3">
          <BookOpen className="w-3 h-3 text-gold-700" />
          <span className="text-[9px] font-cinzel uppercase tracking-widest text-gold-700">v1.0.0 MVP</span>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="dnd-panel p-5 group hover:border-gold-500/60 transition-colors duration-300 cursor-default">
    <div className="mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
    <h3 className="text-xs font-cinzel text-gold-400 uppercase tracking-widest mb-2">{title}</h3>
    <p className="text-xs text-parchment-500 leading-relaxed font-serif italic">{description}</p>
  </div>
);
