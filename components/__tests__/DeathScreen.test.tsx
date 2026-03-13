/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DeathScreen } from '@/components/DeathScreen';
import type { Item } from '@/lib/types';

// ---------------------------------------------------------------------------
// Mock motion/react — same pattern as StatePanel tests
// ---------------------------------------------------------------------------

jest.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        // eslint-disable-next-line react/display-name
        ({ children, initial, animate, transition, ...rest }: React.HTMLAttributes<HTMLElement> & {
          initial?: unknown; animate?: unknown; transition?: unknown;
        }) =>
          React.createElement(tag, rest, children),
    },
  ),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeItem = (name: string, effect: Item['effect'] = 'heal'): Item => ({
  name, description: `A ${name}.`, effect, magnitude: 1,
});

const defaultProps = {
  playerName: 'Seraphel',
  playerRole: 'Cleric',
  finalLocation: 'Bell Warden Crypt',
  inventory: [] as Item[],
  onRestart: jest.fn(),
};

const renderScreen = (overrides: Partial<typeof defaultProps> = {}) =>
  render(<DeathScreen {...defaultProps} {...overrides} />);

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

describe('DeathScreen content', () => {
  it('renders the player name', () => {
    renderScreen();
    expect(screen.getByText(/Seraphel/)).toBeInTheDocument();
  });

  it('renders the player role', () => {
    renderScreen();
    expect(screen.getByText(/Cleric/)).toBeInTheDocument();
  });

  it('renders name and role together in the subtitle', () => {
    renderScreen({ playerName: 'Aldric', playerRole: 'Paladin' });
    expect(screen.getByText(/Aldric the Paladin/)).toBeInTheDocument();
  });

  it('renders the final location', () => {
    renderScreen({ finalLocation: 'Ruined Chapel' });
    expect(screen.getByTestId('final-location')).toHaveTextContent('Ruined Chapel');
  });

  it('renders "You Have Fallen" title', () => {
    renderScreen();
    expect(screen.getByText('You Have Fallen')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

describe('DeathScreen inventory', () => {
  it('shows an empty-inventory message when no items are carried', () => {
    renderScreen({ inventory: [] });
    expect(screen.getByText(/Nothing but dust and regret/i)).toBeInTheDocument();
    expect(screen.queryAllByTestId('inventory-item')).toHaveLength(0);
  });

  it('renders each inventory item name', () => {
    renderScreen({
      inventory: [
        makeItem('Healing Herb'),
        makeItem('Torn Note', 'clue'),
        makeItem('War Rune', 'damage_boost'),
      ],
    });
    expect(screen.getByText('Healing Herb')).toBeInTheDocument();
    expect(screen.getByText('Torn Note')).toBeInTheDocument();
    expect(screen.getByText('War Rune')).toBeInTheDocument();
  });

  it('renders one list item per inventory entry', () => {
    renderScreen({ inventory: [makeItem('Herb'), makeItem('Rune')] });
    expect(screen.getAllByTestId('inventory-item')).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

describe('DeathScreen buttons', () => {
  it('"Rise Again" button is present', () => {
    renderScreen();
    expect(screen.getByTestId('btn-rise-again')).toBeInTheDocument();
  });

  it('"Accept Fate" button is present', () => {
    renderScreen();
    expect(screen.getByTestId('btn-accept-fate')).toBeInTheDocument();
  });

  it('"Rise Again" calls onRestart when clicked', async () => {
    const onRestart = jest.fn();
    renderScreen({ onRestart });
    await userEvent.click(screen.getByTestId('btn-rise-again'));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('"Accept Fate" calls onRestart when clicked', async () => {
    const onRestart = jest.fn();
    renderScreen({ onRestart });
    await userEvent.click(screen.getByTestId('btn-accept-fate'));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('both buttons share the same onRestart handler', async () => {
    const onRestart = jest.fn();
    renderScreen({ onRestart });
    await userEvent.click(screen.getByTestId('btn-rise-again'));
    await userEvent.click(screen.getByTestId('btn-accept-fate'));
    expect(onRestart).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Motion animation props
// ---------------------------------------------------------------------------

describe('DeathScreen animation', () => {
  it('root motion container is rendered', () => {
    renderScreen();
    // The mocked motion.div renders as a plain div; confirm the screen mounts
    expect(screen.getByTestId('death-screen')).toBeInTheDocument();
  });

  it('the component mounts without errors (animation wrappers do not throw)', () => {
    expect(() => renderScreen()).not.toThrow();
  });
});
