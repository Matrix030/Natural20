/**
 * @jest-environment jsdom
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that transitively use them.
// ---------------------------------------------------------------------------

// @google/genai ships an ESM-only browser build which Jest (CJS mode) cannot
// parse when the jsdom environment triggers browser export conditions.
// Stub the whole package so tools.ts can be imported without error.
jest.mock('@google/genai', () => ({
  Type: {
    STRING: 'STRING', NUMBER: 'NUMBER', BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY', OBJECT: 'OBJECT', INTEGER: 'INTEGER',
  },
}));

// Stub out the Gemini hook; sendText is the spy we care about.
const mockSendText = jest.fn();
jest.mock('@/hooks/use-live-api', () => ({
  useLiveAPI: () => ({
    liveState: 'connected',
    connect: jest.fn(),
    disconnect: jest.fn(),
    sendText: mockSendText,
    sendToolResponse: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-image-generation', () => ({
  useImageGeneration: () => ({
    sceneImages: [],
    isGeneratingScene: false,
    currentSceneDesc: '',
    generateSceneImage: jest.fn(),
    resetImages: jest.fn(),
  }),
}));

// Motion — same cached-Proxy pattern as CharacterCreation.test.tsx.
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

// Stub all presentational components. LandingPage and CharacterCreation
// auto-advance so the component reaches 'session' view during render.
jest.mock('@/components/LandingPage', () => ({
  LandingPage: ({ onStart }: { onStart: () => void }) => {
    const { useEffect } = require('react') as typeof import('react');
    useEffect(() => { onStart(); }, [onStart]);
    return null;
  },
}));

jest.mock('@/components/CharacterCreation', () => ({
  CharacterCreation: ({ onComplete }: { onComplete: (n: string, r: string, t: string) => void }) => {
    const { useEffect } = require('react') as typeof import('react');
    useEffect(() => { onComplete('Aldric', 'Warrior', 'Local Guide'); }, [onComplete]);
    return null;
  },
  TRAIT_HP_BONUS: { 'Battle Scarred': 5 },
}));

jest.mock('@/components/SessionView', () => ({ SessionView: () => null }));
jest.mock('@/components/ApiKeyGate', () => ({ ApiKeyGate: () => null }));
jest.mock('@/components/DeathScreen', () => ({ DeathScreen: () => null }));
jest.mock('@/components/EndRecap', () => ({ EndRecap: () => null }));

// ---------------------------------------------------------------------------
// Actual imports (after mocks are in place)
// ---------------------------------------------------------------------------

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { buildBootstrapMessage, DM_SYSTEM_INSTRUCTION } from '@/lib/engine';
import Home from '@/app/page';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseCharacter = {
  playerName: 'Aldric',
  playerRole: 'Warrior',
  trait: 'Local Guide',
  hp: 20,
  maxHp: 20,
};

// ---------------------------------------------------------------------------
// buildBootstrapMessage — content assertions
// ---------------------------------------------------------------------------

describe('buildBootstrapMessage — content', () => {
  it('contains the player name', () => {
    expect(buildBootstrapMessage({ ...baseCharacter, playerName: 'Seraphel' })).toContain('Seraphel');
  });

  it('contains the player role', () => {
    expect(buildBootstrapMessage({ ...baseCharacter, playerRole: 'Rogue' })).toContain('Rogue');
  });

  it('contains the player trait', () => {
    expect(buildBootstrapMessage({ ...baseCharacter, trait: 'Silver Tongue' })).toContain('Silver Tongue');
  });

  it('contains the current hp value', () => {
    expect(buildBootstrapMessage({ ...baseCharacter, hp: 17, maxHp: 20 })).toContain('17');
  });

  it('contains the maxHp value', () => {
    expect(buildBootstrapMessage({ ...baseCharacter, hp: 17, maxHp: 25 })).toContain('25');
  });

  it('contains a reference to Black Hollow Square', () => {
    expect(buildBootstrapMessage(baseCharacter)).toContain('Black Hollow Square');
  });
});

// ---------------------------------------------------------------------------
// DM_SYSTEM_INSTRUCTION — trait awareness
// ---------------------------------------------------------------------------

describe('DM_SYSTEM_INSTRUCTION — trait mechanics', () => {
  it('mentions "Silver Tongue"', () => {
    expect(DM_SYSTEM_INSTRUCTION).toContain('Silver Tongue');
  });

  it('mentions "Local Guide"', () => {
    expect(DM_SYSTEM_INSTRUCTION).toContain('Local Guide');
  });

  it('mentions "Battle Scarred"', () => {
    expect(DM_SYSTEM_INSTRUCTION).toContain('Battle Scarred');
  });
});

// ---------------------------------------------------------------------------
// Session bootstrap — sent exactly once when the session connects
// ---------------------------------------------------------------------------

describe('Session bootstrap — sent exactly once on session start', () => {
  beforeEach(() => mockSendText.mockClear());

  it('calls sendText exactly once after character creation completes', async () => {
    render(React.createElement(Home));
    await waitFor(() => expect(mockSendText).toHaveBeenCalledTimes(1));
  });

  it('bootstrap message contains the player name set during character creation', async () => {
    render(React.createElement(Home));
    await waitFor(() => expect(mockSendText).toHaveBeenCalledTimes(1));
    const [msg] = mockSendText.mock.calls[0] as [string];
    expect(msg).toContain('Aldric');
  });

  it('bootstrap message contains the player role set during character creation', async () => {
    render(React.createElement(Home));
    await waitFor(() => expect(mockSendText).toHaveBeenCalledTimes(1));
    const [msg] = mockSendText.mock.calls[0] as [string];
    expect(msg).toContain('Warrior');
  });

  it('bootstrap message contains the trait set during character creation', async () => {
    render(React.createElement(Home));
    await waitFor(() => expect(mockSendText).toHaveBeenCalledTimes(1));
    const [msg] = mockSendText.mock.calls[0] as [string];
    expect(msg).toContain('Local Guide');
  });

  it('bootstrap message contains hp and maxHp', async () => {
    render(React.createElement(Home));
    await waitFor(() => expect(mockSendText).toHaveBeenCalledTimes(1));
    const [msg] = mockSendText.mock.calls[0] as [string];
    // Both values must appear; exact numbers depend on the initial state.
    expect(msg).toMatch(/HP:/i);
    expect(msg).toMatch(/\d+ \/ \d+/);
  });
});
