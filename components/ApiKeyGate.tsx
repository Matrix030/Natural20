import React from 'react';
import { Sparkles } from 'lucide-react';

interface ApiKeyGateProps {
  onSelectKey: () => void;
}

export const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ onSelectKey }) => (
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
      <button onClick={onSelectKey} className="dnd-btn-primary w-full py-3 font-cinzel text-xs uppercase tracking-widest text-gold-300">
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
