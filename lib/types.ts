export type AppView = 'landing' | 'session' | 'recap';

export type LiveState = 'disconnected' | 'connecting' | 'connected';

export interface NPC {
  name: string;
  status: string;
  relationship: string;
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
