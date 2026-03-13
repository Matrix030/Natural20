import { WorldState } from '@/lib/types';

export const initialWorldState: WorldState = {
  playerName: 'Adventurer',
  playerRole: 'Unknown',
  currentLocation: 'Black Hollow Square',
  currentObjective: 'Investigate the mysterious bell ringing',
  knownClues: [],
  npcs: [
    { name: 'Mayor Elira', status: 'In Square', relationship: 'Neutral' },
    { name: 'Father Orin', status: 'In Chapel', relationship: 'Neutral' },
  ],
  hazards: [],
  hp: 20,
  maxHp: 20,
  inventory: [],
  statusEffects: [],
  trait: '',
};
