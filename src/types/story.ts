export type EmotionType = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised';

export type EyeFrameKey =
  | 'eyes_neutral'
  | 'eyes_blink'
  | 'eyes_happy'
  | 'eyes_sad'
  | 'eyes_angry'
  | 'eyes_surprised'
  | 'eyes_wink';

export type MouthFrameKey =
  | 'mouth_closed'
  | 'mouth_talk_1'
  | 'mouth_talk_2'
  | 'mouth_talk_3'
  | 'mouth_smile'
  | 'mouth_frown'
  | 'mouth_open_shock';

export type AtlasFrameKey = EyeFrameKey | MouthFrameKey;

export interface FacialAnchor {
  /** Normalized horizontal center on portrait (0 = left, 1 = right) */
  x: number;
  /** Normalized vertical center from top of portrait (0 = top, 1 = bottom) */
  y: number;
  /** Relative scale multiplier (default 1.0) */
  scale: number;
}

export interface CharacterAsset {
  id: string;
  name: string;
  role: string;
  /** Transparent PNG data URL of the faceless portrait */
  portraitDataUrl: string;
  width: number;
  height: number;
  eyeAnchor: FacialAnchor;
  mouthAnchor: FacialAnchor;
  accentColor: string;
  /** Source metadata */
  sourceType: 'sheet' | 'upload';
  sheetIndex?: number;
}

export interface AtlasFrameDescriptor {
  key: AtlasFrameKey;
  category: 'eyes' | 'mouth';
  /** Top-left canvas coordinates in pixels (for UI inspection) */
  canvasX: number;
  canvasY: number;
  width: number;
  height: number;
  /** PlayCanvas TextureAtlas rect [x, y_from_bottom, width, height] */
  pcRect: [number, number, number, number];
  pivot: [number, number];
}

export interface ExpressionAtlasBundle {
  width: number;
  height: number;
  imageDataUrl: string;
  frames: Record<AtlasFrameKey, AtlasFrameDescriptor>;
}

export type CameraShotPreset =
  | 'wide_establishing'
  | 'medium_two_shot'
  | 'closeup_left'
  | 'closeup_center'
  | 'closeup_right'
  | 'dramatic_low'
  | 'over_shoulder'
  | 'custom';

export interface CameraShotConfig {
  preset: CameraShotPreset;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  transitionSpeed: number;
  handheldDrift: number;
  shakeIntensity: number;
  dofEnabled: boolean;
  dofFocusDistance: number;
  dofBlurRadius: number;
}

export type AtmosphereMood =
  | 'golden_hour'
  | 'neon_rain'
  | 'midnight_station'
  | 'morning_mist';

export type ParticleEffectType = 'none' | 'dust' | 'rain' | 'embers';

export type StageSlot = 'left' | 'center' | 'right';

export interface StageCharacterPlacement {
  characterId: string;
  slot: StageSlot;
  emotion: EmotionType;
  flipX?: boolean;
}

export interface StoryChoice {
  id: string;
  label: string;
  conditionVar?: string;
  conditionMin?: number;
  setVar?: string;
  setDelta?: number;
  targetNodeId: string;
}

export type StoryNodeType = 'dialogue' | 'choice' | 'cinematic';

export interface StoryNode {
  id: string;
  type: StoryNodeType;
  title: string;
  position: { x: number; y: number };
  speakerId?: string;
  emotion: EmotionType;
  text: string;
  typingSpeed: number; // chars per second
  duration: number; // seconds for timeline pacing / cinematic beat
  stageCast: StageCharacterPlacement[];
  camera: CameraShotConfig;
  mood: AtmosphereMood;
  particleEffect: ParticleEffectType;
  nextNodeId?: string;
  choices: StoryChoice[];
}

export interface StoryProject {
  version: string;
  storyName: string; // slug used in story_<x>.zip
  title: string;
  subtitle: string;
  startNodeId: string;
  initialVariables: Record<string, number>;
  characters: CharacterAsset[];
  nodes: StoryNode[];
  expressionAtlas: ExpressionAtlasBundle;
}

export type EditorTab = 'assets' | 'graph' | 'timeline' | 'playback';
