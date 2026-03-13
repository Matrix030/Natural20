/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatePanel } from '@/components/StatePanel';
import type { WorldState, Item } from '@/lib/types';

// motion/react animate causes warnings in jsdom — silence them.
jest.mock('motion/react', () => ({
  motion: {
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) =>
      React.createElement('li', props, children),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseState: WorldState = {
  playerName: 'Aldric', playerRole: 'Paladin', trait: '',
  currentLocation: 'Black Hollow Square', currentObjective: 'Ring the bell',
  knownClues: [], npcs: [], hazards: [],
  hp: 20, maxHp: 20, inventory: [], statusEffects: [],
};

const makeItem = (overrides: Partial<Item> = {}): Item => ({
  name: 'Healing Herb', description: 'Restores a small amount of vitality.',
  effect: 'heal', magnitude: 1, ...overrides,
});

const withState = (overrides: Partial<WorldState>) =>
  render(<StatePanel state={{ ...baseState, ...overrides }} />);

// ---------------------------------------------------------------------------
// HP Bar — fill percentage
// ---------------------------------------------------------------------------

describe('HP bar fill percentage', () => {
  it('renders 100% width when hp === maxHp', () => {
    withState({ hp: 20, maxHp: 20 });
    expect(screen.getByTestId('hp-bar-fill')).toHaveStyle({ width: '100%' });
  });

  it('renders 50% width when hp is half of maxHp', () => {
    withState({ hp: 10, maxHp: 20 });
    expect(screen.getByTestId('hp-bar-fill')).toHaveStyle({ width: '50%' });
  });

  it('renders 0% width when hp is 0', () => {
    withState({ hp: 0, maxHp: 20 });
    expect(screen.getByTestId('hp-bar-fill')).toHaveStyle({ width: '0%' });
  });

  it('displays hp / maxHp text', () => {
    withState({ hp: 14, maxHp: 20 });
    expect(screen.getByLabelText('hp-text')).toHaveTextContent('14 / 20');
  });
});

// ---------------------------------------------------------------------------
// HP Bar — color thresholds
// ---------------------------------------------------------------------------

describe('HP bar color thresholds', () => {
  it('uses gold-400 (healthy) when hp is above 50%', () => {
    withState({ hp: 11, maxHp: 20 }); // 55%
    expect(screen.getByTestId('hp-bar-fill')).toHaveClass('bg-gold-400');
  });

  it('uses gold-400 at exactly 51%', () => {
    withState({ hp: 11, maxHp: 20 }); // rounds to 55 — pick exact boundary
    const fill = screen.getByTestId('hp-bar-fill');
    expect(fill.className).toContain('bg-gold-400');
  });

  it('uses gold-700 (wounded) at exactly 50%', () => {
    withState({ hp: 10, maxHp: 20 }); // 50%
    expect(screen.getByTestId('hp-bar-fill')).toHaveClass('bg-gold-700');
  });

  it('uses gold-700 (wounded) between 25% and 50%', () => {
    withState({ hp: 6, maxHp: 20 }); // 30%
    expect(screen.getByTestId('hp-bar-fill')).toHaveClass('bg-gold-700');
  });

  it('uses gold-700 at exactly 25%', () => {
    withState({ hp: 5, maxHp: 20 }); // 25%
    expect(screen.getByTestId('hp-bar-fill')).toHaveClass('bg-gold-700');
  });

  it('uses blood-500 (critical) below 25%', () => {
    withState({ hp: 4, maxHp: 20 }); // 20%
    expect(screen.getByTestId('hp-bar-fill')).toHaveClass('bg-blood-500');
  });

  it('uses blood-500 at 0 hp', () => {
    withState({ hp: 0, maxHp: 20 });
    expect(screen.getByTestId('hp-bar-fill')).toHaveClass('bg-blood-500');
  });
});

// ---------------------------------------------------------------------------
// Status effect badges
// ---------------------------------------------------------------------------

describe('Status effect badges', () => {
  it('renders no badges when statusEffects is empty', () => {
    withState({ statusEffects: [] });
    expect(screen.queryAllByTestId('status-badge')).toHaveLength(0);
  });

  it('renders one badge per status effect', () => {
    withState({ statusEffects: ['poisoned', 'blessed', 'frightened'] });
    expect(screen.getAllByTestId('status-badge')).toHaveLength(3);
  });

  it('renders the effect name inside each badge', () => {
    withState({ statusEffects: ['poisoned'] });
    expect(screen.getByTestId('status-badge')).toHaveTextContent('poisoned');
  });
});

// ---------------------------------------------------------------------------
// Inventory — empty state
// ---------------------------------------------------------------------------

describe('Inventory empty state', () => {
  it('renders exactly 6 inventory slots when inventory is empty', () => {
    withState({ inventory: [] });
    expect(screen.getAllByTestId('inventory-slot')).toHaveLength(6);
  });

  it('renders 6 slots even when partially filled', () => {
    withState({ inventory: [makeItem()] });
    expect(screen.getAllByTestId('inventory-slot')).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// Inventory — filled slots
// ---------------------------------------------------------------------------

describe('Inventory filled slots', () => {
  it('shows the item name in its slot', () => {
    withState({ inventory: [makeItem({ name: 'Elixir of Might' })] });
    expect(screen.getByText('Elixir of Might')).toBeInTheDocument();
  });

  it('shows a heal icon for heal items', () => {
    withState({ inventory: [makeItem({ effect: 'heal' })] });
    expect(screen.getByTestId('icon-heal')).toBeInTheDocument();
  });

  it('shows a damage_boost icon for damage_boost items', () => {
    withState({ inventory: [makeItem({ effect: 'damage_boost', name: 'War Rune' })] });
    expect(screen.getByTestId('icon-damage_boost')).toBeInTheDocument();
  });

  it('shows a status_cure icon for status_cure items', () => {
    withState({ inventory: [makeItem({ effect: 'status_cure', name: 'Tonic' })] });
    expect(screen.getByTestId('icon-status_cure')).toBeInTheDocument();
  });

  it('shows a clue icon for clue items', () => {
    withState({ inventory: [makeItem({ effect: 'clue', name: 'Torn Note' })] });
    expect(screen.getByTestId('icon-clue')).toBeInTheDocument();
  });

  it('does not render an icon in empty slots', () => {
    withState({ inventory: [] });
    // No icon testids should appear for any effect type
    expect(screen.queryByTestId('icon-heal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('icon-clue')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tooltip (title attribute) on hover
// ---------------------------------------------------------------------------

describe('Inventory slot tooltip', () => {
  it('sets the title attribute to the item description on a filled slot', () => {
    const item = makeItem({ description: 'A poultice made from chapel moss.' });
    withState({ inventory: [item] });
    const slots = screen.getAllByTestId('inventory-slot');
    expect(slots[0]).toHaveAttribute('title', 'A poultice made from chapel moss.');
  });

  it('does not set a title on empty slots', () => {
    withState({ inventory: [] });
    const slots = screen.getAllByTestId('inventory-slot');
    // Every empty slot has no title (or an empty/undefined title)
    slots.forEach(slot => {
      expect(slot).not.toHaveAttribute('title');
    });
  });

  it('shows description on mouseenter (title exposed on interaction)', () => {
    const item = makeItem({ description: 'Ancient relic of the Bell Warden.' });
    withState({ inventory: [item] });
    const slot = screen.getAllByTestId('inventory-slot')[0];
    fireEvent.mouseEnter(slot);
    expect(slot).toHaveAttribute('title', 'Ancient relic of the Bell Warden.');
  });
});
