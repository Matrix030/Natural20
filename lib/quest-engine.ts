import { Type, FunctionDeclaration } from '@google/genai';

export interface WorldState {
  playerName: string;
  playerRole: string;
  currentLocation: string;
  currentObjective: string;
  knownClues: string[];
  npcs: { name: string; status: string; relationship: string }[];
  hazards: string[];
  lastCheckResult?: string;
}

export const initialWorldState: WorldState = {
  playerName: 'Adventurer',
  playerRole: 'Unknown',
  currentLocation: 'Black Hollow Square',
  currentObjective: 'Investigate the mysterious bell ringing',
  knownClues: [],
  npcs: [
    { name: 'Mayor Elira', status: 'In Square', relationship: 'Neutral' },
    { name: 'Father Orin', status: 'In Chapel', relationship: 'Neutral' }
  ],
  hazards: [],
};

export const questTools: FunctionDeclaration[] = [
  {
    name: "update_world_state",
    description: "Update the current state of the world, including location, objectives, clues, and NPCs.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        playerName: { type: Type.STRING },
        playerRole: { type: Type.STRING },
        currentLocation: { type: Type.STRING },
        currentObjective: { type: Type.STRING },
        knownClues: { type: Type.ARRAY, items: { type: Type.STRING } },
        npcs: { 
          type: Type.ARRAY, 
          items: { 
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              status: { type: Type.STRING },
              relationship: { type: Type.STRING }
            }
          } 
        },
        hazards: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    }
  },
  {
    name: "resolve_skill_check",
    description: "Resolve a player's risky action with a d20-style check. Ask the player to roll first if needed.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: "The action the player is attempting" },
        difficulty: { type: Type.INTEGER, description: "DC (Difficulty Class) from 5 to 25" },
        outcome: { type: Type.STRING, description: "The narrative result of the check" }
      },
      required: ["action", "difficulty", "outcome"]
    }
  },
  {
    name: "trigger_visual_scene",
    description: "Trigger a dramatic visual scene generation for the current location or a key moment.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        description: { type: Type.STRING, description: "Detailed description for image generation" },
        tone: { type: Type.STRING, description: "The mood of the scene (e.g., eerie, epic, peaceful)" }
      },
      required: ["description", "tone"]
    }
  }
];

export const DM_SYSTEM_INSTRUCTION = `You are the Dungeon Master (DM) for "DungeonFlow Live", a real-time fantasy adventure.
Your goal is to provide a live, immersive, and natural experience for the player.

QUEST: "The Bell of Black Hollow"
SETTING: A cursed village where a ruined chapel bell rings at night, causing disappearances.
LOCATIONS: Black Hollow Square, Ruined Chapel, Bell Warden Crypt.
NPCs: Mayor Elira (desperate), Father Orin (knows secrets), The Bell Warden (corrupted guardian).

GUIDELINES:
1. BE CONCISE: Keep your spoken responses short (1-3 sentences).
2. BE IMMERSIVE: Use sensory details.
3. BE AGENTIC: Use the 'update_world_state' tool whenever the player moves, learns something, or changes the situation.
4. BE INTERACTIVE: Ask the player for their name and role if not known.
5. SKILL CHECKS: When a player tries something risky, use 'resolve_skill_check'.
6. VISUALS: Use 'trigger_visual_scene' for dramatic reveals or new locations. Trigger these at the START of an event or when entering a new area. Each scene/location should have AT MOST 3 images generated.
7. ENVIRONMENTAL CUES: Mention hazards like "hanging bell chain" or "oil spill" in your narration.

STORY FLOW:
- Start at Black Hollow Square. Mayor Elira greets the player.
- Move to Ruined Chapel. Father Orin warns of the crypt.
- Final showdown in the Bell Warden Crypt.
- The Bell Warden is bound to the bell. Silence the bell to win.

CRITICAL: Always respond in English. Use tools frequently to keep the UI state in sync.`;
