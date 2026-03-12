import { initialWorldState, questTools, DM_SYSTEM_INSTRUCTION } from '@/lib/engine';
import type { Item } from '@/lib/types';

// ---------------------------------------------------------------------------
// initialWorldState defaults
// ---------------------------------------------------------------------------

describe('initialWorldState', () => {
  it('has hp of 20', () => {
    expect(initialWorldState.hp).toBe(20);
  });

  it('has maxHp of 20', () => {
    expect(initialWorldState.maxHp).toBe(20);
  });

  it('has an empty inventory', () => {
    expect(initialWorldState.inventory).toEqual([]);
  });

  it('has no status effects', () => {
    expect(initialWorldState.statusEffects).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Item magnitude boundary values (type-level contract enforced at runtime)
// ---------------------------------------------------------------------------

describe('Item magnitude', () => {
  const makeItem = (magnitude: number): Item => ({
    name: 'Test Item',
    description: 'A test item.',
    effect: 'heal',
    magnitude,
  });

  it('accepts magnitude 1 (lower bound)', () => {
    expect(makeItem(1).magnitude).toBe(1);
  });

  it('accepts magnitude 2 (mid)', () => {
    expect(makeItem(2).magnitude).toBe(2);
  });

  it('accepts magnitude 3 (upper bound)', () => {
    expect(makeItem(3).magnitude).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// questTools — new tool declarations
// ---------------------------------------------------------------------------

const findTool = (name: string) => questTools.find(t => t.name === name);
const paramKeys = (tool: ReturnType<typeof findTool>) =>
  Object.keys(tool?.parameters?.properties ?? {});

describe('questTools — modify_player_hp', () => {
  const tool = findTool('modify_player_hp');

  it('exists', () => {
    expect(tool).toBeDefined();
  });

  it('declares an "amount" parameter', () => {
    expect(paramKeys(tool)).toContain('amount');
  });

  it('declares a "reason" parameter', () => {
    expect(paramKeys(tool)).toContain('reason');
  });
});

describe('questTools — add_to_inventory', () => {
  const tool = findTool('add_to_inventory');

  it('exists', () => {
    expect(tool).toBeDefined();
  });

  it('declares a "name" parameter', () => {
    expect(paramKeys(tool)).toContain('name');
  });

  it('declares a "description" parameter', () => {
    expect(paramKeys(tool)).toContain('description');
  });

  it('declares an "effect" parameter', () => {
    expect(paramKeys(tool)).toContain('effect');
  });

  it('declares a "magnitude" parameter', () => {
    expect(paramKeys(tool)).toContain('magnitude');
  });
});

describe('questTools — apply_status_effect', () => {
  const tool = findTool('apply_status_effect');

  it('exists', () => {
    expect(tool).toBeDefined();
  });

  it('declares an "effect" parameter', () => {
    expect(paramKeys(tool)).toContain('effect');
  });

  it('declares a "duration" parameter', () => {
    expect(paramKeys(tool)).toContain('duration');
  });
});

// ---------------------------------------------------------------------------
// DM_SYSTEM_INSTRUCTION mentions all three new tool names
// ---------------------------------------------------------------------------

describe('DM_SYSTEM_INSTRUCTION', () => {
  it('mentions modify_player_hp', () => {
    expect(DM_SYSTEM_INSTRUCTION).toContain('modify_player_hp');
  });

  it('mentions add_to_inventory', () => {
    expect(DM_SYSTEM_INSTRUCTION).toContain('add_to_inventory');
  });

  it('mentions apply_status_effect', () => {
    expect(DM_SYSTEM_INSTRUCTION).toContain('apply_status_effect');
  });
});
