# TEAM MEMBERS
Rishikesh Gharat
Arya Adesh
Ruchita Sonawale
Ambica Bhatia

# DungeonFlow Live

A voice-first AI Dungeon Master web app powered by Google Gemini 2.5 Flash Native Audio. Speak your actions out loud and your DM responds in real-time with voice narration, dynamic world state tracking, and AI-generated scene illustrations.

**Featured Quest: "The Bell of Black Hollow"** — A cursed village where a ruined chapel bell rings at night, causing disappearances.

## Features

- **Live voice interaction** — Speak to the DM via your microphone; the DM responds in the Zephyr voice
- **Character creation** — 3-step wizard to set your name, class (Warrior / Rogue / Cleric / Ranger), and background trait
- **Real-time world state** — Location, objectives, clues, NPCs, hazards, HP bar, and inventory update automatically as you play
- **Combat & status effects** — The DM tracks HP damage, healing, and conditions (poisoned, blessed, etc.)
- **Inventory system** — Up to 6 item slots; items carry a typed effect (heal, damage boost, status cure, clue)
- **AI-generated scene art** — Dramatic 16:9 fantasy illustrations generated at key story moments
- **Skill checks** — Roll a d20 on camera; the DM adjudicates the outcome
- **Death screen** — Triggered when HP reaches 0; shows final location and carried items
- **Session recap** — End-of-session summary of your adventure

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| AI Voice/DM | Gemini 2.5 Flash Native Audio (`gemini-2.5-flash-native-audio-preview-09-2025`) |
| AI Image Gen | Gemini Flash Image (`gemini-3.1-flash-image-preview`) |
| Styling | Tailwind CSS v4 + custom D&D theme |
| Animations | Motion (Framer Motion) |
| Testing | Jest + ts-jest + React Testing Library |
| Deployment | Google Cloud Run (standalone output) |

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Gemini API key with billing enabled (required for native audio and image generation models)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local and set your GEMINI_API_KEY
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key — must have access to paid preview models |
| `APP_URL` | No | Self-referential URL for the deployed app |

> **Note:** The app also reads `NEXT_PUBLIC_GEMINI_API_KEY` client-side for direct browser-to-Gemini WebSocket connections (Live API and image generation). Make sure this is set if running outside AI Studio.

### Development

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Run production server
npm run lint     # Run ESLint
npm run clean    # Clear .next build artifacts
npx jest         # Run all tests
```

## Architecture

### App Flow

```
Landing → Character Creation (name / class / trait) → Session → Recap
                                                              ↘ Death (hp = 0)
```

### Data Flow

```
User speaks → mic (16kHz PCM) → Gemini Live API (WebSocket)
     ↓
DM narrates via Zephyr voice (24kHz) + text transcript + function calls
     ↓
Tool calls dispatched in page.tsx:
  update_world_state    → location, objectives, clues, NPCs, hazards
  resolve_skill_check   → stores d20 outcome in world state
  trigger_visual_scene  → Gemini image generation → base64 scene art
  modify_player_hp      → clamps hp to [0, maxHp]; death triggers on hp=0
  add_to_inventory      → appends Item (max 6 slots)
  apply_status_effect   → appends condition (deduplicated)
     ↓
UI re-renders: StatePanel (HP bar, inventory, status badges), Transcript, SceneImage
```

### Key Files

```
app/page.tsx                    # Root orchestrator — views, tool handlers, session lifecycle
lib/types.ts                    # Shared types: AppView, WorldState, Item, NPC, Message
lib/engine/
  world-state.ts                # initialWorldState
  tools.ts                      # Gemini function tool declarations
  system-prompt.ts              # DM_SYSTEM_INSTRUCTION
  state-helpers.ts              # Pure fns: applyHpChange, applyInventoryAdd, applyStatusEffect
hooks/use-live-api.ts           # WebSocket hook — audio capture/playback, tool response queue
components/
  LandingPage.tsx               # Entry screen
  CharacterCreation.tsx         # 3-step wizard (name → class → trait)
  StatePanel.tsx                # HP bar, inventory, status badges, clues, NPCs
  DeathScreen.tsx               # Shown when HP reaches 0
  Transcript.tsx                # DM/Player conversation log
  SceneImage.tsx                # AI-generated scene artwork
  EndRecap.tsx                  # Post-session summary
```

### DM Tool Declarations

| Tool | Purpose |
|---|---|
| `update_world_state` | Syncs location, objectives, clues, NPCs, and hazards |
| `resolve_skill_check` | Adjudicates risky player actions (DC 5–25) |
| `trigger_visual_scene` | Generates a cinematic 16:9 image for dramatic moments |
| `modify_player_hp` | Applies damage or healing; negative amount = damage |
| `add_to_inventory` | Adds a typed Item to the player's inventory (max 6) |
| `apply_status_effect` | Applies a named condition with a duration |

### Character Classes & Traits

**Classes:** Warrior · Rogue · Cleric · Ranger

**Background Traits:**

| Trait | Mechanical Effect |
|---|---|
| Local Guide | Knows Black Hollow lore |
| Battle Scarred | +5 maxHp at session start |
| Silver Tongue | Easier persuasion checks |

## Deployment

The app is configured for Google Cloud Run with `output: 'standalone'` in `next.config.ts`. HMR is disabled via the `DISABLE_HMR` env var for AI Studio compatibility.

```bash
# Deploy via Firebase
firebase deploy
```
