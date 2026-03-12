import { Type, FunctionDeclaration } from '@google/genai';

export const questTools: FunctionDeclaration[] = [
  {
    name: 'update_world_state',
    description: 'Update the current state of the world, including location, objectives, clues, and NPCs.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        playerName: { type: Type.STRING, description: "The player's chosen character name" },
        playerRole: { type: Type.STRING, description: "The player's class or role (e.g. Rogue, Cleric, Ranger)" },
        currentLocation: { type: Type.STRING, description: "The current named location (e.g. 'Ruined Chapel')" },
        currentObjective: { type: Type.STRING, description: 'The active quest objective in one sentence' },
        knownClues: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Complete list of all clues discovered so far' },
        npcs: {
          type: Type.ARRAY,
          description: 'All NPCs the player has encountered or learned about',
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "NPC's full name" },
              status: { type: Type.STRING, description: "Current location or state (e.g. 'In Chapel', 'Fled', 'Dead')" },
              relationship: { type: Type.STRING, description: "Relationship to player (e.g. 'Neutral', 'Ally', 'Hostile')" },
            },
          },
        },
        hazards: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Active environmental hazards in the current area' },
      },
    },
  },
  {
    name: 'resolve_skill_check',
    description: "Resolve a player's risky action with a d20-style check. Ask the player to roll first if needed.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: 'The action the player is attempting' },
        difficulty: { type: Type.INTEGER, description: 'DC (Difficulty Class) from 5 to 25' },
        outcome: { type: Type.STRING, description: 'The narrative result of the check' },
      },
      required: ['action', 'difficulty', 'outcome'],
    },
  },
  {
    name: 'trigger_visual_scene',
    description: 'Trigger a dramatic visual scene generation for the current location or a key moment.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        description: { type: Type.STRING, description: 'Detailed description for image generation' },
        tone: { type: Type.STRING, description: 'The mood of the scene (e.g., eerie, epic, peaceful)' },
      },
      required: ['description', 'tone'],
    },
  },
  {
    name: 'modify_player_hp',
    description: 'Modify the player\'s HP when they take damage or are healed. Use negative amount for damage, positive for healing.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.INTEGER, description: 'HP change — negative for damage, positive for healing' },
        reason: { type: Type.STRING, description: 'Narrative reason for the HP change (e.g. "struck by a cursed chain")' },
      },
      required: ['amount', 'reason'],
    },
  },
  {
    name: 'add_to_inventory',
    description: 'Add an item to the player\'s inventory when they find or receive something.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Item name' },
        description: { type: Type.STRING, description: 'Flavourful item description' },
        effect: { type: Type.STRING, enum: ['heal', 'damage_boost', 'status_cure', 'clue'], description: 'Mechanical effect type' },
        magnitude: { type: Type.INTEGER, description: 'Effect strength from 1 (minor) to 3 (major)' },
      },
      required: ['name', 'description', 'effect', 'magnitude'],
    },
  },
  {
    name: 'apply_status_effect',
    description: 'Apply a status condition to the player such as poisoned, blessed, or frightened.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        effect: { type: Type.STRING, description: 'Status condition name (e.g. "poisoned", "blessed", "frightened")' },
        duration: { type: Type.STRING, description: 'How long the effect lasts (e.g. "until dawn", "3 rounds", "permanent")' },
      },
      required: ['effect', 'duration'],
    },
  },
];
