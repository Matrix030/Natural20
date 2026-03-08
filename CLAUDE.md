# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start local development server
npm run build    # Production build
npm run start    # Run production server
npm run lint     # Run ESLint
npm run clean    # Clear Next.js build artifacts
```

## Environment Setup

Copy `.env.example` to `.env.local` and set:
- `GEMINI_API_KEY` — required for all AI features (voice, image generation)
- `APP_URL` — self-referential URL for the app

## Architecture

**DungeonFlow Live** is a voice-first AI Dungeon Master app built with Next.js 15 App Router and Google Gemini 2.5 Flash Native Audio.

### Key Files

- `app/page.tsx` — root orchestrator: session lifecycle, state, tool call handling, image generation
- `lib/quest-engine.ts` — all game logic: `WorldState` type, Gemini function tool declarations, DM system instruction, quest narrative
- `hooks/use-live-api.ts` — WebSocket connection to Gemini Live API; audio capture (16kHz PCM → base64), audio playback (24kHz), tool response queuing
- `components/` — presentational components: `LandingPage`, `StatePanel`, `Transcript`, `SceneImage`, `EndRecap`

### Data Flow

```
User speaks → mic captured at 16kHz PCM → Gemini Live API
    ↓
DM responds with voice (24kHz) + text + optional function calls
    ↓
Tool calls handled in page.tsx:
  - update_world_state  → React state update
  - resolve_skill_check → skill check result stored
  - trigger_visual_scene → calls gemini-3.1-flash-image-preview API route
    ↓
Components re-render (StatePanel, Transcript, SceneImage)
```

### State Management

All state lives in `page.tsx` via React hooks — no external state library. `WorldState` (from `quest-engine.ts`) tracks player, location, objective, clues, NPCs, and hazards. Location changes clear scene images. Max 3 AI-generated images per location.

### AI Models

- **Voice/DM:** `gemini-2.5-flash-native-audio-preview-09-2025` with Zephyr voice — handles input audio, outputs speech + text + function calls
- **Image generation:** `gemini-3.1-flash-image-preview` — triggered by `trigger_visual_scene` tool, produces 16:9 images

### Deployment

Configured for Google Cloud Run via `output: 'standalone'` in `next.config.ts`. HMR is disabled via `DISABLE_HMR` env var for AI Studio compatibility. Firebase Tools is available for deployment (`firebase deploy`).
