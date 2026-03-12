export type AppView = 'landing' | 'session' | 'recap' | 'death';

export type LiveState = 'disconnected' | 'connecting' | 'connected';

export interface NPC {
  name: string;
  status: string;
  relationship: string;
}

export interface Item {
  name: string;
  description: string;
  effect: 'heal' | 'damage_boost' | 'status_cure' | 'clue';
  magnitude: number;
}

export interface WorldState {
  playerName: string;
  playerRole: string;
  currentLocation: string;
  currentObjective: string;
  knownClues: string[];
  npcs: NPC[];
  hazards: string[];
  lastCheckResult?: string;
  hp: number;
  maxHp: number;
  inventory: Item[];
  statusEffects: string[];
}

export interface Message {
  role: 'DM' | 'Player' | 'System';
  text: string;
  timestamp: number;
}

// Typed window extension for AI Studio embed.
export interface AIStudioWindow extends Window {
  aistudio?: {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  };
}
