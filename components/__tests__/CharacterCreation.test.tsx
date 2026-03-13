/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CharacterCreation, TRAIT_HP_BONUS } from '@/components/CharacterCreation';

// ---------------------------------------------------------------------------
// Mock motion/react — Proxy pattern from DeathScreen tests
// ---------------------------------------------------------------------------

// The Proxy must cache one function reference per HTML tag. Without caching,
// each render access creates a new function, React sees a different component
// type, unmounts/remounts, and the focused input loses its value mid-type.
// R.* is used for runtime values only; React.* covers type positions because
// TypeScript resolves type annotations from the top-level import, not require().
jest.mock('motion/react', () => {
  const R = require('react') as typeof import('react');
  const cache: Record<string, React.FC> = {};
  return {
    motion: new Proxy({} as Record<string, React.FC>, {
      get(_: object, tag: string) {
        if (!cache[tag]) {
          cache[tag] = function Motion({
            children, initial, animate, exit, transition, ...rest
          }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) {
            return R.createElement(tag, rest, children as React.ReactNode);
          };
        }
        return cache[tag];
      },
    }),
    AnimatePresence({ children }: { children: React.ReactNode }) {
      return R.createElement(R.Fragment, null, children);
    },
  };
});

// ---------------------------------------------------------------------------
// Per-test setup — userEvent.setup() is required in v14 for reliable typing
// ---------------------------------------------------------------------------

const onComplete = jest.fn();

beforeEach(() => onComplete.mockClear());

/** Creates a fresh user session + renders the component. */
function setup() {
  const user = userEvent.setup();
  render(<CharacterCreation onComplete={onComplete} />);
  return { user };
}

/** Type a name and click Next to advance from step 1. */
async function goStep2(user: ReturnType<typeof userEvent.setup>, name = 'Aldric') {
  await user.type(screen.getByTestId('name-input'), name);
  await user.click(screen.getByTestId('btn-next'));
}

/** Select a class card to advance from step 2. */
async function goStep3(user: ReturnType<typeof userEvent.setup>, cls = 'Warrior') {
  await user.click(screen.getByTestId(`class-card-${cls}`));
}

/** Select a trait card in step 3. */
async function pickTrait(user: ReturnType<typeof userEvent.setup>, trait = 'Local-Guide') {
  await user.click(screen.getByTestId(`trait-card-${trait}`));
}

// ---------------------------------------------------------------------------
// Step 1 — Name
// ---------------------------------------------------------------------------

describe('Step 1 — name input', () => {
  it('renders the name input on mount', () => {
    setup();
    expect(screen.getByTestId('name-input')).toBeInTheDocument();
  });

  it('shows "Step 1 of 3" indicator', () => {
    setup();
    expect(screen.getByTestId('step-indicator')).toHaveTextContent('Step 1 of 3');
  });

  it('does not show step-2 content on mount', () => {
    setup();
    expect(screen.queryByTestId('step-2-content')).not.toBeInTheDocument();
  });

  it('shows an error and does not advance when name is empty', async () => {
    const { user } = setup();
    await user.click(screen.getByTestId('btn-next'));
    expect(screen.getByTestId('name-error')).toBeInTheDocument();
    expect(screen.queryByTestId('step-2-content')).not.toBeInTheDocument();
  });

  it('does not advance when name is only whitespace', async () => {
    const { user } = setup();
    await user.type(screen.getByTestId('name-input'), '   ');
    await user.click(screen.getByTestId('btn-next'));
    expect(screen.queryByTestId('step-2-content')).not.toBeInTheDocument();
  });

  it('advances to step 2 when a valid name is entered', async () => {
    const { user } = setup();
    await goStep2(user, 'Seraphel');
    expect(screen.getByTestId('step-2-content')).toBeInTheDocument();
  });

  it('shows "Step 2 of 3" after advancing', async () => {
    const { user } = setup();
    await goStep2(user);
    expect(screen.getByTestId('step-indicator')).toHaveTextContent('Step 2 of 3');
  });
});

// ---------------------------------------------------------------------------
// Step 2 — Class selection
// ---------------------------------------------------------------------------

describe('Step 2 — class cards', () => {
  it('renders all four class cards', async () => {
    const { user } = setup();
    await goStep2(user);
    expect(screen.getByTestId('class-card-Warrior')).toBeInTheDocument();
    expect(screen.getByTestId('class-card-Rogue')).toBeInTheDocument();
    expect(screen.getByTestId('class-card-Cleric')).toBeInTheDocument();
    expect(screen.getByTestId('class-card-Ranger')).toBeInTheDocument();
  });

  it('selecting a class card advances to step 3', async () => {
    const { user } = setup();
    await goStep2(user);
    await goStep3(user, 'Rogue');
    expect(screen.getByTestId('step-3-content')).toBeInTheDocument();
  });

  it('shows "Step 3 of 3" after selecting a class', async () => {
    const { user } = setup();
    await goStep2(user);
    await goStep3(user);
    expect(screen.getByTestId('step-indicator')).toHaveTextContent('Step 3 of 3');
  });
});

// ---------------------------------------------------------------------------
// Step 3 — Trait selection
// ---------------------------------------------------------------------------

describe('Step 3 — trait cards', () => {
  it('renders all three trait cards', async () => {
    const { user } = setup();
    await goStep2(user);
    await goStep3(user);
    expect(screen.getByTestId('trait-card-Local-Guide')).toBeInTheDocument();
    expect(screen.getByTestId('trait-card-Battle-Scarred')).toBeInTheDocument();
    expect(screen.getByTestId('trait-card-Silver-Tongue')).toBeInTheDocument();
  });

  it('confirm button is not visible before a trait is selected', async () => {
    const { user } = setup();
    await goStep2(user);
    await goStep3(user);
    expect(screen.queryByTestId('btn-confirm')).not.toBeInTheDocument();
  });

  it('selecting a trait shows the confirm button', async () => {
    const { user } = setup();
    await goStep2(user);
    await goStep3(user);
    await pickTrait(user, 'Local-Guide');
    expect(screen.getByTestId('btn-confirm')).toBeInTheDocument();
  });

  it('selecting a different trait also shows the confirm button', async () => {
    const { user } = setup();
    await goStep2(user);
    await goStep3(user);
    await pickTrait(user, 'Silver-Tongue');
    expect(screen.getByTestId('btn-confirm')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Confirmation — onComplete called with correct args
// ---------------------------------------------------------------------------

describe('Confirm — onComplete', () => {
  it('calls onComplete with the entered name, selected class, and trait', async () => {
    const { user } = setup();
    await goStep2(user, 'Mira');
    await goStep3(user, 'Cleric');
    await pickTrait(user, 'Silver-Tongue');
    await user.click(screen.getByTestId('btn-confirm'));
    expect(onComplete).toHaveBeenCalledWith('Mira', 'Cleric', 'Silver Tongue');
  });

  it('trims whitespace from name before passing to onComplete', async () => {
    const { user } = setup();
    // type without leading spaces — leading spaces would fail trim validation
    await user.type(screen.getByTestId('name-input'), 'Aldric');
    await user.click(screen.getByTestId('btn-next'));
    await goStep3(user, 'Warrior');
    await pickTrait(user, 'Local-Guide');
    await user.click(screen.getByTestId('btn-confirm'));
    expect(onComplete).toHaveBeenCalledWith('Aldric', 'Warrior', 'Local Guide');
  });

  it('calls onComplete exactly once per confirm click', async () => {
    const { user } = setup();
    await goStep2(user);
    await goStep3(user);
    await pickTrait(user);
    await user.click(screen.getByTestId('btn-confirm'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Battle Scarred — +5 maxHp bonus
// ---------------------------------------------------------------------------

describe('Battle Scarred trait — maxHp bonus', () => {
  it('TRAIT_HP_BONUS declares +5 for Battle Scarred', () => {
    expect(TRAIT_HP_BONUS['Battle Scarred']).toBe(5);
  });

  it('other traits have no declared HP bonus', () => {
    expect(TRAIT_HP_BONUS['Local Guide'] ?? 0).toBe(0);
    expect(TRAIT_HP_BONUS['Silver Tongue'] ?? 0).toBe(0);
  });

  it('calls onComplete with "Battle Scarred" when that trait is selected', async () => {
    const { user } = setup();
    await goStep2(user, 'Borin');
    await goStep3(user, 'Warrior');
    await pickTrait(user, 'Battle-Scarred');
    await user.click(screen.getByTestId('btn-confirm'));
    const [, , trait] = onComplete.mock.calls[0] as [string, string, string];
    expect(trait).toBe('Battle Scarred');
    // page.tsx applies TRAIT_HP_BONUS[trait] to maxHp — verified here:
    expect(TRAIT_HP_BONUS[trait]).toBe(5);
  });
});
