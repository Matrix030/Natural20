// Re-export shim — import from '@/lib/engine' or '@/lib/types' in new code.
export type { WorldState, NPC } from '@/lib/types';
export { initialWorldState, questTools, DM_SYSTEM_INSTRUCTION } from '@/lib/engine';
