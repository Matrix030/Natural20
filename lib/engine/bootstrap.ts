import type { WorldState } from '@/lib/types';

/** Builds the one-shot session bootstrap message sent to Gemini when the session first connects. */
export function buildBootstrapMessage(state: Pick<WorldState, 'playerName' | 'playerRole' | 'trait' | 'hp' | 'maxHp'>): string {
  return `SESSION START — player details:
Name: ${state.playerName}
Role: ${state.playerRole}
Background trait: ${state.trait}
HP: ${state.hp} / ${state.maxHp}

Please begin the quest narrative. The player arrives at Black Hollow Square. Mayor Elira greets them.`;
}
