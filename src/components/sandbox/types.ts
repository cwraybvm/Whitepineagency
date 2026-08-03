export type SandboxTool = 'copy' | 'ad' | 'video' | 'campaign' | 'swipe';

export const TONE_OPTIONS = ['Direct Response', 'Urgent', 'Friendly'] as const;
export type Tone = (typeof TONE_OPTIONS)[number];

export type CreativeAsset = {
  id: string;
  organizationId: string | null;
  organization?: { id: string; name: string } | null;
  title: string;
  type: string;
  status: string;
  content: string;
  metadata: any;
  version: number;
  updatedAt: string;
};

export type GeneratedDraft = {
  title: string;
  content: string;
  metadata?: any;
};

export const ANGLES = ['Fear/Urgency', 'Value/Savings', 'Social Proof', 'Scarcity', 'Direct/No-BS'] as const;
export type Angle = (typeof ANGLES)[number];

export type AngleDraft = {
  angle: Angle;
  title: string;
  content: string;
};

export type BrandDna = {
  id?: string;
  name?: string;
  brandVoice: string | null;
  brandGuidelines: string | null;
};

export const CHAR_LIMITS = [
  { id: 'sms', label: 'SMS', limit: 160 },
  { id: 'google-headline', label: 'Google Headline', limit: 30 },
  { id: 'meta-fold', label: 'Meta Primary Text (fold)', limit: 125 },
] as const;

export const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square Feed', aspectClass: 'aspect-square', maxWidth: 420 },
  { id: '9:16', label: 'Story/Reels', aspectClass: 'aspect-[9/16]', maxWidth: 280 },
  { id: '1.91:1', label: 'Landscape Header', aspectClass: 'aspect-[1.91/1]', maxWidth: 560 },
] as const;
export type AspectRatioId = (typeof ASPECT_RATIOS)[number]['id'];

export type OrgBrand = {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
};

export type DripStep = { day: string; channel: string; content: string };

export type CampaignBatch = {
  angles: AngleDraft[];
  ad: { title: string; content: string; metadata: { headline: string; cta: string } };
  video: { title: string; content: string; metadata: { beats: Beat[] } };
  drip: { title: string; content: string; metadata: { steps: DripStep[] } };
};

export const SHOT_DURATIONS = ['3s', '5s', '8s'] as const;
export type ShotDuration = (typeof SHOT_DURATIONS)[number];

export const CAMERA_MOVEMENTS = ['Static', 'Pan', 'Zoom', 'Tracking'] as const;
export type CameraMovement = (typeof CAMERA_MOVEMENTS)[number];

export type Beat = {
  scene: string;
  shot: string;
  line: string;
  duration?: ShotDuration;
  cameraMovement?: CameraMovement;
};

export type SwipeInsights = {
  hookPattern: string;
  visualStyle: string;
  targetAudience: string;
  emotionalTrigger: string;
};

export type RemixResult = {
  angles: { title: string; content: string }[];
  adPreset: { title: string; content: string; metadata: { headline: string; cta: string } };
};

export type CopyStudioMode = 'single' | 'matrix' | 'dco';

export type DcoVariant = { location: string; segment: string; title: string; content: string };

export type OptimizeResult = { title?: string; content: string; metadata?: any };
