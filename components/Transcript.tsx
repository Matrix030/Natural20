import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Scroll } from 'lucide-react';
import { Message } from '@/lib/types';

interface TranscriptProps {
  messages: Message[];
}

export const Transcript: React.FC<TranscriptProps> = ({ messages }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full dnd-panel overflow-hidden">
      {/* Header */}
      <div className="dnd-panel-header px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Scroll className="w-3.5 h-3.5 text-gold-500" />
          <h3 className="text-[10px] font-cinzel text-gold-400 uppercase tracking-[0.25em]">Chronicle of Events</h3>
        </div>
        <div className="text-[9px] font-cinzel text-stone-500 uppercase tracking-widest">
          Live Session
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-600 gap-4 opacity-50 py-12">
              <Scroll className="w-10 h-10 text-gold-700/50" />
              <p className="text-xs font-serif italic text-gold-700/60">The adventure awaits...</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`flex flex-col gap-1.5 ${msg.role === 'Player' ? 'items-end' : 'items-start'}`}
              >
                {/* Role label */}
                <div className={`flex items-center gap-1.5 ${msg.role === 'Player' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-5 h-5 flex items-center justify-center border ${
                    msg.role === 'Player'
                      ? 'bg-indigo-900/50 border-indigo-600/40 text-indigo-300'
                      : msg.role === 'DM'
                      ? 'bg-gold-900/50 border-gold-600/40 text-gold-400'
                      : 'bg-stone-900 border-stone-700 text-stone-500'
                  }`}>
                    {msg.role === 'Player'
                      ? <User className="w-2.5 h-2.5" />
                      : <span className="text-[9px] leading-none">⚔</span>
                    }
                  </div>
                  <span className={`text-[9px] font-cinzel uppercase tracking-[0.2em] ${
                    msg.role === 'Player' ? 'text-indigo-400' : msg.role === 'DM' ? 'text-gold-500' : 'text-stone-500'
                  }`}>
                    {msg.role === 'DM' ? 'Dungeon Master' : msg.role}
                  </span>
                </div>

                {/* Message bubble */}
                <div className={`px-4 py-3 text-sm leading-relaxed max-w-[90%] shadow-md ${
                  msg.role === 'Player'
                    ? 'msg-player rounded-sm rounded-tr-none'
                    : msg.role === 'DM'
                    ? 'msg-dm rounded-sm rounded-tl-none font-serif italic'
                    : 'msg-system rounded-sm text-xs'
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
