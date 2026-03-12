// Mock all non-pure imports so page.tsx is loadable in Node without a browser.
jest.mock('@/hooks/use-live-api', () => ({ useLiveAPI: jest.fn() }));
jest.mock('@/hooks/use-image-generation', () => ({ useImageGeneration: jest.fn() }));
jest.mock('@/components/LandingPage', () => ({ LandingPage: () => null }));
jest.mock('@/components/EndRecap', () => ({ EndRecap: () => null }));
jest.mock('@/components/SessionView', () => ({ SessionView: () => null }));
jest.mock('@/components/ApiKeyGate', () => ({ ApiKeyGate: () => null }));
jest.mock('@/lib/engine', () => ({
  initialWorldState: {
    playerName: '', playerRole: '', currentLocation: '', currentObjective: '',
    knownClues: [], npcs: [], hazards: [],
    hp: 20, maxHp: 20, inventory: [], statusEffects: [],
  },
  questTools: [],
  DM_SYSTEM_INSTRUCTION: '',
}));

import { applyHpChange, applyInventoryAdd, applyStatusEffect } from '@/app/page';
import type { WorldState, Item } from '@/lib/types';

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const baseState: WorldState = {
  playerName: 'Hero', playerRole: 'Rogue',
  currentLocation: 'Square', currentObjective: 'Test',
  knownClues: [], npcs: [], hazards: [],
  hp: 10, maxHp: 20, inventory: [], statusEffects: [],
};

const sampleItem = (name = 'Herb'): Item => ({
  name, description: 'A test item.', effect: 'heal', magnitude: 1,
});

// ---------------------------------------------------------------------------
// applyHpChange — clamping and death detection
// ---------------------------------------------------------------------------

describe('applyHpChange', () => {
  it('reduces hp by the given amount', () => {
    const { state } = applyHpChange(baseState, -4);
    expect(state.hp).toBe(6);
  });

  it('clamps hp to 0 — cannot go below zero', () => {
    const { state } = applyHpChange(baseState, -999);
    expect(state.hp).toBe(0);
  });

  it('clamps hp to maxHp — cannot exceed maximum', () => {
    const { state } = applyHpChange(baseState, 999);
    expect(state.hp).toBe(baseState.maxHp);
  });

  it('returns died: false when hp remains above 0', () => {
    const { died } = applyHpChange(baseState, -1);
    expect(died).toBe(false);
  });

  it('returns died: true when hp reaches exactly 0', () => {
    const { died } = applyHpChange(baseState, -10);
    expect(died).toBe(true);
  });

  it('returns died: true when damage exceeds current hp', () => {
    const { died } = applyHpChange(baseState, -999);
    expect(died).toBe(true);
  });

  it('does not mutate the previous state', () => {
    const before = baseState.hp;
    applyHpChange(baseState, -5);
    expect(baseState.hp).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// applyInventoryAdd — 6-item cap
// ---------------------------------------------------------------------------

describe('applyInventoryAdd', () => {
  it('appends an item to an empty inventory', () => {
    const next = applyInventoryAdd(baseState, sampleItem());
    expect(next.inventory).toHaveLength(1);
    expect(next.inventory[0].name).toBe('Herb');
  });

  it('allows up to 6 items', () => {
    let state = baseState;
    for (let i = 0; i < 6; i++) state = applyInventoryAdd(state, sampleItem(`Item${i}`));
    expect(state.inventory).toHaveLength(6);
  });

  it('ignores the call when inventory is already at 6', () => {
    let state = baseState;
    for (let i = 0; i < 6; i++) state = applyInventoryAdd(state, sampleItem(`Item${i}`));
    const next = applyInventoryAdd(state, sampleItem('Overflow'));
    expect(next.inventory).toHaveLength(6);
    expect(next.inventory.every(it => it.name !== 'Overflow')).toBe(true);
  });

  it('returns the same reference when capped (no mutation)', () => {
    let state = baseState;
    for (let i = 0; i < 6; i++) state = applyInventoryAdd(state, sampleItem(`Item${i}`));
    const next = applyInventoryAdd(state, sampleItem('Overflow'));
    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// applyStatusEffect — no duplicates
// ---------------------------------------------------------------------------

describe('applyStatusEffect', () => {
  it('adds a new status effect', () => {
    const next = applyStatusEffect(baseState, 'poisoned');
    expect(next.statusEffects).toContain('poisoned');
  });

  it('does not add a duplicate status effect', () => {
    const withPoison = applyStatusEffect(baseState, 'poisoned');
    const again = applyStatusEffect(withPoison, 'poisoned');
    expect(again.statusEffects.filter(e => e === 'poisoned')).toHaveLength(1);
  });

  it('returns the same reference when effect is already present', () => {
    const withPoison = applyStatusEffect(baseState, 'poisoned');
    const again = applyStatusEffect(withPoison, 'poisoned');
    expect(again).toBe(withPoison);
  });

  it('allows distinct effects to coexist', () => {
    const s1 = applyStatusEffect(baseState, 'poisoned');
    const s2 = applyStatusEffect(s1, 'blessed');
    expect(s2.statusEffects).toEqual(['poisoned', 'blessed']);
  });
});
