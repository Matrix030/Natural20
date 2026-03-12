import { WorldState, Item } from '@/lib/types';

export function applyHpChange(
  prev: WorldState,
  amount: number,
): { state: WorldState; died: boolean } {
  const hp = Math.max(0, Math.min(prev.maxHp, prev.hp + amount));
  return { state: { ...prev, hp }, died: hp === 0 };
}

export function applyInventoryAdd(prev: WorldState, item: Item): WorldState {
  if (prev.inventory.length >= 6) return prev;
  return { ...prev, inventory: [...prev.inventory, item] };
}

export function applyStatusEffect(prev: WorldState, effect: string): WorldState {
  if (prev.statusEffects.includes(effect)) return prev;
  return { ...prev, statusEffects: [...prev.statusEffects, effect] };
}
