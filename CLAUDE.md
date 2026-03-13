# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start local development server
npm run build    # Production build
npm run start    # Run production server
npm run lint     # Run ESLint
npm run clean    # Clear Next.js build artifacts
npx jest         # Run all tests
npx jest --no-coverage --watch   # Run tests in watch mode
```

## Environment Setup

Copy `.env.example` to `.env.local` and set:
- `GEMINI_API_KEY` — required for all AI features (voice, image generation)
- `APP_URL` — self-referential URL for the app

## Architecture

**DungeonFlow Live** is a voice-first AI Dungeon Master app built with Next.js 15 App Router and Google Gemini 2.5 Flash Native Audio.

### Key Files

- `app/page.tsx` — root orchestrator: session lifecycle, state, all tool call handlers, image generation, view routing
- `lib/quest-engine.ts` — re-export shim; real logic lives in `lib/engine/`
- `lib/engine/` — game engine modules:
  - `index.ts` — barrel export
  - `world-state.ts` — `initialWorldState`
  - `tools.ts` — Gemini function tool declarations (`questTools`)
  - `system-prompt.ts` — `DM_SYSTEM_INSTRUCTION`
  - `state-helpers.ts` — pure state mutation functions (`applyHpChange`, `applyInventoryAdd`, `applyStatusEffect`)
- `lib/types.ts` — shared TypeScript types: `AppView`, `WorldState`, `Item`, `NPC`, `Message`
- `hooks/use-live-api.ts` — WebSocket connection to Gemini Live API; audio capture (16kHz PCM → base64), audio playback (24kHz), tool response queuing
- `components/` — presentational components:
  - `LandingPage.tsx` — entry screen
  - `CharacterCreation.tsx` — 3-step wizard (name → class → trait); exports `TRAIT_HP_BONUS`
  - `StatePanel.tsx` — live sidebar: HP bar, inventory slots, status badges, clues, NPCs
  - `DeathScreen.tsx` — shown when player HP reaches 0
  - `Transcript.tsx` — DM/Player conversation log
  - `SceneImage.tsx` — AI-generated scene artwork
  - `EndRecap.tsx` — post-session summary

### App Views (`AppView`)

```
landing → character-creation → session → recap
                                       ↘ death
```

- `landing` — `LandingPage`
- `character-creation` — `CharacterCreation` (3-step wizard; applies trait HP bonus on complete)
- `session` — `SessionView` with live Gemini connection
- `recap` — `EndRecap`
- `death` — `DeathScreen` (triggered when `hp` reaches 0; disconnects live session)

### Data Flow

```
User speaks → mic captured at 16kHz PCM → Gemini Live API
    ↓
DM responds with voice (24kHz) + text + optional function calls
    ↓
Tool calls handled in page.tsx:
  - update_world_state    → React state update
  - resolve_skill_check   → skill check result stored
  - trigger_visual_scene  → calls gemini-3.1-flash-image-preview API route
  - modify_player_hp      → applyHpChange(); if hp=0 → disconnect + setView('death')
  - add_to_inventory      → applyInventoryAdd() (cap: 6 items)
  - apply_status_effect   → applyStatusEffect() (deduped)
    ↓
Components re-render (StatePanel, Transcript, SceneImage)
```

### State Management

All state lives in `page.tsx` via React hooks — no external state library.

**`WorldState`** fields:
- `playerName`, `playerRole`, `trait` — set by `CharacterCreation.onComplete`
- `currentLocation`, `currentObjective`, `knownClues`, `npcs`, `hazards`, `lastCheckResult` — updated by DM tool calls
- `hp`, `maxHp` — clamped to `[0, maxHp]`; `maxHp` may be boosted by the Battle Scarred trait (+5)
- `inventory: Item[]` — capped at 6 slots
- `statusEffects: string[]` — deduplicated

**`Item`** has `name`, `description`, `effect` (`heal | damage_boost | status_cure | clue`), `magnitude` (1–3).

Location changes clear scene images. Max 3 AI-generated images per location.

### Character Creation Traits

Defined in `components/CharacterCreation.tsx`:

| Trait | Effect |
|---|---|
| Local Guide | Knows Black Hollow lore |
| Battle Scarred | +5 maxHp (applied via `TRAIT_HP_BONUS`) |
| Silver Tongue | Easier persuasion checks |

### AI Models

- **Voice/DM:** `gemini-2.5-flash-native-audio-preview-09-2025` with Zephyr voice — handles input audio, outputs speech + text + function calls
- **Image generation:** `gemini-3.1-flash-image-preview` — triggered by `trigger_visual_scene` tool, produces 16:9 images

### Testing

Jest + ts-jest + React Testing Library. Tests live next to their subjects:

```
lib/__tests__/quest-engine.test.ts      # WorldState defaults, tool declarations, DM prompt
app/__tests__/page.test.ts              # applyHpChange, applyInventoryAdd, applyStatusEffect
components/__tests__/StatePanel.test.tsx
components/__tests__/DeathScreen.test.tsx
components/__tests__/CharacterCreation.test.tsx
```

**Jest environment:** `node` by default (set in `jest.config.ts`). Component tests override per-file with `@jest-environment jsdom`.

**motion/react mock pattern for component tests:** The Proxy must cache one `FC` per HTML tag — without caching, React sees a new component type each render, unmounts/remounts, and focused inputs lose their value. Use the factory-cached Proxy from `CharacterCreation.test.tsx` as the canonical pattern for any new component tests that involve `motion`.

### Deployment

Configured for Google Cloud Run via `output: 'standalone'` in `next.config.ts`. HMR is disabled via `DISABLE_HMR` env var for AI Studio compatibility. Firebase Tools is available for deployment (`firebase deploy`).
