// Shot duration options
export type ShotDuration = 'short' | 'medium' | 'long';

// Camera movement types
export type CameraMovement = 'pan' | 'zoom' | 'dolly' | 'static';

export const VOICE_PERSONA_OPTIONS = ['Energetic', 'Professional', 'Warm'] as const;
export type VoicePersona = (typeof VOICE_PERSONA_OPTIONS)[number];

export type Beat = {
  scene: string;
  shot: string;
  line: string;
  duration?: ShotDuration;
  cameraMovement?: CameraMovement;
  voicePersona?: VoicePersona;
  voiceId?: string;
  audioUrl?: string;
  audioDuration?: number;
};
