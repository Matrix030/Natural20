import React from 'react';
import { MapPin, Target, Search, Users, AlertTriangle, User } from 'lucide-react';
import { WorldState } from '@/lib/quest-engine';
import { motion } from 'motion/react';

interface StatePanelProps {
  state: WorldState;
}

export const StatePanel: React.FC<StatePanelProps> = ({ state }) => {
  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Player Info */}
      <div className="dnd-panel">
        <div className="dnd-panel-header flex items-center gap-2 px-4 py-2.5">
          <User className="w-3.5 h-3.5 text-gold-500" />
          <span className="text-[10px] font-cinzel text-gold-400 uppercase tracking-[0.25em]">Adventurer</span>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">
          <div className="dnd-panel-inset p-2.5">
            <span className="text-[9px] font-cinzel text-gold-600 uppercase tracking-widest block mb-1">Name</span>
            <span className="text-sm font-serif text-parchment-200">{state.playerName}</span>
          </div>
          <div className="dnd-panel-inset p-2.5">
            <span className="text-[9px] font-cinzel text-gold-600 uppercase tracking-widest block mb-1">Class</span>
            <span className="text-sm font-serif text-parchment-200">{state.playerRole}</span>
          </div>
        </div>
      </div>

      {/* Location & Objective */}
      <div className="dnd-panel">
        <div className="dnd-panel-header flex items-center gap-2 px-4 py-2.5">
          <MapPin className="w-3.5 h-3.5 text-gold-500" />
          <span className="text-[10px] font-cinzel text-gold-400 uppercase tracking-[0.25em]">World State</span>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <MapPin className="w-3 h-3 text-gold-500" />
              <span className="text-[9px] font-cinzel text-gold-600 uppercase tracking-widest">Location</span>
            </div>
            <p className="text-sm font-serif italic text-parchment-300 pl-5">{state.currentLocation}</p>
          </div>
          <div className="dnd-divider"><span>◆</span></div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Target className="w-3 h-3 text-blood-400" />
              <span className="text-[9px] font-cinzel text-blood-500 uppercase tracking-widest">Objective</span>
            </div>
            <p className="text-sm font-serif italic text-parchment-300 pl-5">{state.currentObjective}</p>
          </div>
        </div>
      </div>

      {/* Clues & NPCs */}
      <div className="flex-1 dnd-panel overflow-y-auto">
        <div className="dnd-panel-header flex items-center gap-2 px-4 py-2.5">
          <Search className="w-3.5 h-3.5 text-gold-500" />
          <span className="text-[10px] font-cinzel text-gold-400 uppercase tracking-[0.25em]">Chronicle</span>
        </div>
        <div className="p-4 space-y-5">
          {/* Clues */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-3 h-3 text-gold-500/70" />
              <span className="text-[9px] font-cinzel text-gold-600 uppercase tracking-widest">Known Clues</span>
            </div>
            {state.knownClues.length === 0 ? (
              <p className="text-[11px] text-stone-500 italic font-serif pl-5">No clues discovered yet...</p>
            ) : (
              <ul className="space-y-2 pl-5">
                {state.knownClues.map((clue, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs font-serif text-parchment-400 leading-relaxed flex gap-2"
                  >
                    <span className="text-gold-600 mt-0.5 shrink-0">◈</span>
                    {clue}
                  </motion.li>
                ))}
              </ul>
            )}
          </div>

          <div className="dnd-divider"><span>◆</span></div>

          {/* NPCs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-3 h-3 text-gold-500/70" />
              <span className="text-[9px] font-cinzel text-gold-600 uppercase tracking-widest">Key NPCs</span>
            </div>
            <div className="space-y-3 pl-5">
              {state.npcs.map((npc, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <span className="text-xs font-serif text-parchment-300">{npc.name}</span>
                  <span className="text-[10px] text-stone-400 font-cinzel tracking-wide">
                    {npc.status} · {npc.relationship}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Hazards */}
          {state.hazards.length > 0 && (
            <>
              <div className="dnd-divider"><span>◆</span></div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-3 h-3 text-blood-500" />
                  <span className="text-[9px] font-cinzel text-blood-500 uppercase tracking-widest">Hazards</span>
                </div>
                <div className="flex flex-wrap gap-2 pl-5">
                  {state.hazards.map((hazard, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-blood-900/60 border border-blood-700/40 text-[10px] text-blood-300 font-cinzel tracking-wide"
                    >
                      {hazard}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
