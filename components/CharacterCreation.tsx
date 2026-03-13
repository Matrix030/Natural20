import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Eye, Plus, Compass, ChevronRight } from 'lucide-react';

interface CharacterCreationProps {
  onComplete: (name: string, role: string, trait: string) => void;
}

// HP bonus applied by page.tsx when trait is selected — exported for tests.
export const TRAIT_HP_BONUS: Record<string, number> = {
  'Battle Scarred': 5,
};

const CLASSES = [
  { id: 'Warrior', Icon: Shield, desc: 'Frontline fighter, high HP' },
  { id: 'Rogue', Icon: Eye, desc: 'Cunning and fast, skilled checks' },
  { id: 'Cleric', Icon: Plus, desc: 'Healer, resists status effects' },
  { id: 'Ranger', Icon: Compass, desc: 'Keen senses, advantage on clues' },
] as const;

const TRAITS = [
  { id: 'Local Guide', desc: 'Knows Black Hollow lore' },
  { id: 'Battle Scarred', desc: 'Starts with +5 maxHp' },
  { id: 'Silver Tongue', desc: 'Easier persuasion checks' },
] as const;

const TOTAL_STEPS = 3;

export const CharacterCreation: React.FC<CharacterCreationProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTrait, setSelectedTrait] = useState('');

  const handleNextFromStep1 = () => {
    if (name.trim().length === 0) {
      setNameError('Please enter your name before continuing.');
      return;
    }
    setNameError('');
    setStep(2);
  };

  const handleSelectClass = (cls: string) => {
    setSelectedClass(cls);
    setStep(3);
  };

  const handleSelectTrait = (trait: string) => {
    setSelectedTrait(trait);
  };

  const handleConfirm = () => {
    onComplete(name.trim(), selectedClass, selectedTrait);
  };

  return (
    <div className="min-h-screen dnd-bg text-parchment-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Torch-glow background */}
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
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="max-w-2xl w-full relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl md:text-4xl font-cinzel-deco text-gold-gradient">
            Forge Your Legend
          </h1>
          <div className="dnd-divider max-w-xs mx-auto"><span>◆</span></div>
          <p
            className="text-[10px] font-cinzel text-gold-600 uppercase tracking-[0.25em]"
            data-testid="step-indicator"
          >
            Step {step} of {TOTAL_STEPS}
          </p>
        </div>

        {/* Step panels */}
        <AnimatePresence mode="wait">
          {/* ── Step 1: Name ─────────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35 }}
              className="dnd-panel p-8 space-y-6"
              data-testid="step-1-content"
            >
              <div className="dnd-panel-header px-4 py-3 -mx-8 -mt-8 mb-6">
                <h2 className="text-[10px] font-cinzel text-gold-400 uppercase tracking-[0.25em] text-center">
                  What is your name, adventurer?
                </h2>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNextFromStep1()}
                  maxLength={20}
                  placeholder="Enter your name…"
                  className="w-full dnd-panel-inset px-4 py-3 text-sm font-serif text-parchment-200 placeholder-stone-500 bg-transparent outline-none focus:border-gold-500/60 transition-colors"
                  data-testid="name-input"
                />
                {nameError && (
                  <p className="text-xs text-blood-400 font-serif italic" data-testid="name-error">
                    {nameError}
                  </p>
                )}
                <p className="text-[9px] text-stone-500 font-cinzel text-right">
                  {name.length} / 20
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextFromStep1}
                  className="dnd-btn-secondary inline-flex items-center gap-2 px-6 py-3 font-cinzel text-xs uppercase tracking-widest"
                  data-testid="btn-next"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Class ─────────────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35 }}
              className="dnd-panel p-8"
              data-testid="step-2-content"
            >
              <div className="dnd-panel-header px-4 py-3 -mx-8 -mt-8 mb-6">
                <h2 className="text-[10px] font-cinzel text-gold-400 uppercase tracking-[0.25em] text-center">
                  Choose Your Class
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {CLASSES.map(({ id, Icon, desc }) => (
                  <button
                    key={id}
                    onClick={() => handleSelectClass(id)}
                    className="dnd-panel-inset p-5 text-left flex flex-col gap-3 hover:border-gold-500/50 transition-colors cursor-pointer group"
                    data-testid={`class-card-${id}`}
                  >
                    <Icon className="w-6 h-6 text-gold-500 group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-xs font-cinzel text-gold-400 uppercase tracking-widest mb-1">{id}</p>
                      <p className="text-[10px] font-serif italic text-parchment-500">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Trait ─────────────────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35 }}
              className="dnd-panel p-8 space-y-5"
              data-testid="step-3-content"
            >
              <div className="dnd-panel-header px-4 py-3 -mx-8 -mt-8 mb-6">
                <h2 className="text-[10px] font-cinzel text-gold-400 uppercase tracking-[0.25em] text-center">
                  Choose Your Background Trait
                </h2>
              </div>

              <div className="space-y-3">
                {TRAITS.map(({ id, desc }) => {
                  const isSelected = selectedTrait === id;
                  return (
                    <button
                      key={id}
                      onClick={() => handleSelectTrait(id)}
                      className={`w-full dnd-panel-inset p-4 text-left flex items-center gap-4 transition-colors cursor-pointer group
                        ${isSelected ? 'border-gold-500/60 bg-gold-900/10' : 'hover:border-gold-500/30'}`}
                      data-testid={`trait-card-${id.replace(/\s+/g, '-')}`}
                      aria-pressed={isSelected}
                    >
                      <div className={`w-2 h-2 border shrink-0 transition-colors ${isSelected ? 'bg-gold-500 border-gold-500' : 'border-stone-500'}`} />
                      <div>
                        <p className="text-xs font-cinzel text-gold-400 uppercase tracking-widest mb-0.5">{id}</p>
                        <p className="text-[10px] font-serif italic text-parchment-500">{desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedTrait && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="pt-2 flex justify-end"
                >
                  <button
                    onClick={handleConfirm}
                    className="dnd-btn-primary inline-flex items-center gap-3 px-8 py-4 font-cinzel text-xs uppercase tracking-widest"
                    data-testid="btn-confirm"
                  >
                    Enter the Hollow
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
