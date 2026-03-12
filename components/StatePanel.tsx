import React from 'react';
import { MapPin, Target, Search, Users, AlertTriangle, User, Heart, Sword, Shield, Backpack } from 'lucide-react';
import { WorldState, Item } from '@/lib/types';
import { motion } from 'motion/react';

interface StatePanelProps {
  state: WorldState;
}

const EFFECT_ICONS: Record<Item['effect'], React.ElementType> = {
  heal: Heart,
  damage_boost: Sword,
  status_cure: Shield,
  clue: Search,
};

function hpBarColor(percent: number): string {
  if (percent > 50) return 'bg-gold-400';
  if (percent >= 25) return 'bg-gold-700';
  return 'bg-blood-500';
}

export const StatePanel: React.FC<StatePanelProps> = ({ state }) => {
  const hpPercent = state.maxHp > 0 ? (state.hp / state.maxHp) * 100 : 0;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Player Info + HP */}
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

        {/* HP Bar */}
        <div className="px-4 pb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-cinzel text-gold-600 uppercase tracking-widest">Vitality</span>
            <span className="text-xs font-serif text-parchment-300" aria-label="hp-text">
              {state.hp} / {state.maxHp}
            </span>
          </div>
          <div className="dnd-panel-inset h-3 overflow-hidden" aria-label="hp-bar-track">
            <div
              className={`h-full transition-all duration-500 ${hpBarColor(hpPercent)}`}
              style={{ width: `${hpPercent}%` }}
              data-testid="hp-bar-fill"
            />
          </div>
          {state.statusEffects.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2" aria-label="status-effects">
              {state.statusEffects.map((effect, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 bg-blood-900/60 border border-blood-700/40 text-[9px] text-blood-300 font-cinzel tracking-wide"
                  data-testid="status-badge"
                >
                  {effect}
                </span>
              ))}
            </div>
          )}
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

      {/* Inventory */}
      <div className="dnd-panel">
        <div className="dnd-panel-header flex items-center gap-2 px-4 py-2.5">
          <Backpack className="w-3.5 h-3.5 text-gold-500" />
          <span className="text-[10px] font-cinzel text-gold-400 uppercase tracking-[0.25em]">Inventory</span>
        </div>
        <div className="p-4 grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => {
            const item = state.inventory[i];
            const Icon = item ? EFFECT_ICONS[item.effect] : null;
            return (
              <div
                key={i}
                className={`dnd-panel-inset p-2 min-h-[52px] flex flex-col items-center justify-center gap-1 ${item ? '' : 'opacity-30'}`}
                title={item?.description}
                data-testid="inventory-slot"
              >
                {item ? (
                  <>
                    <span data-testid={`icon-${item.effect}`}>
                      {Icon && <Icon className="w-3.5 h-3.5 text-gold-500" />}
                    </span>
                    <span className="text-[9px] font-cinzel text-parchment-300 text-center leading-tight">
                      {item.name}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-stone-600">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
