export const MAX_IMAGES_PER_LOCATION = 3;

export const ROMAN_NUMERALS = ['I', 'II', 'III'] as const;

export const MODELS = {
  VOICE_DM: 'gemini-2.5-flash-native-audio-preview-09-2025',
  IMAGE_GEN: 'gemini-3.1-flash-image-preview',
} as const;

export const AUDIO = {
  SAMPLE_RATE_INPUT: 16000,
  SAMPLE_RATE_OUTPUT: 24000,
  PROCESSOR_BUFFER_SIZE: 4096,
  PLAYBACK_LEAD_SECONDS: 0.05,
} as const;

export const IMAGE_GEN = {
  ASPECT_RATIO: '16:9',
  IMAGE_SIZE: '1K',
  RETRY_LIMIT: 2,
  DEFAULT_RETRY_DELAY_MS: 35000,
} as const;
