import {
  CameraShotConfig,
  CameraShotPreset,
  CharacterAsset,
  ExpressionAtlasBundle,
  StoryNode,
  StoryProject,
} from '../types/story';

export const CAMERA_PRESETS: Record<
  CameraShotPreset,
  { label: string; config: Omit<CameraShotConfig, 'preset'> }
> = {
  wide_establishing: {
    label: 'Wide Establishing',
    config: {
      position: [0, 1.58, 5.4],
      target: [0, 1.25, 0],
      fov: 46,
      transitionSpeed: 2.4,
      handheldDrift: 0.018,
      shakeIntensity: 0,
      dofEnabled: false,
      dofFocusDistance: 5.4,
      dofBlurRadius: 2.0,
    },
  },
  medium_two_shot: {
    label: 'Medium Two-Shot',
    config: {
      position: [0, 1.5, 4.0],
      target: [0, 1.36, 0],
      fov: 40,
      transitionSpeed: 2.8,
      handheldDrift: 0.015,
      shakeIntensity: 0,
      dofEnabled: false,
      dofFocusDistance: 4.0,
      dofBlurRadius: 2.5,
    },
  },
  closeup_left: {
    label: 'Close-Up Left',
    config: {
      position: [-0.95, 1.58, 2.35],
      target: [-1.32, 1.52, 0.05],
      fov: 32,
      transitionSpeed: 3.4,
      handheldDrift: 0.012,
      shakeIntensity: 0,
      dofEnabled: true,
      dofFocusDistance: 2.35,
      dofBlurRadius: 4.2,
    },
  },
  closeup_center: {
    label: 'Close-Up Center',
    config: {
      position: [0.08, 1.58, 2.3],
      target: [0, 1.52, 0.15],
      fov: 32,
      transitionSpeed: 3.4,
      handheldDrift: 0.012,
      shakeIntensity: 0,
      dofEnabled: true,
      dofFocusDistance: 2.2,
      dofBlurRadius: 4.2,
    },
  },
  closeup_right: {
    label: 'Close-Up Right',
    config: {
      position: [0.95, 1.58, 2.35],
      target: [1.32, 1.52, 0.05],
      fov: 32,
      transitionSpeed: 3.4,
      handheldDrift: 0.012,
      shakeIntensity: 0,
      dofEnabled: true,
      dofFocusDistance: 2.35,
      dofBlurRadius: 4.2,
    },
  },
  dramatic_low: {
    label: 'Dramatic Low Angle',
    config: {
      position: [-0.55, 0.88, 3.1],
      target: [0.15, 1.56, 0],
      fov: 38,
      transitionSpeed: 4.2,
      handheldDrift: 0.024,
      shakeIntensity: 0.025,
      dofEnabled: true,
      dofFocusDistance: 3.1,
      dofBlurRadius: 3.5,
    },
  },
  over_shoulder: {
    label: 'Over-the-Shoulder',
    config: {
      position: [-1.85, 1.62, 2.05],
      target: [1.05, 1.48, 0],
      fov: 35,
      transitionSpeed: 3.0,
      handheldDrift: 0.014,
      shakeIntensity: 0,
      dofEnabled: true,
      dofFocusDistance: 3.5,
      dofBlurRadius: 4.0,
    },
  },
  custom: {
    label: 'Custom Camera',
    config: {
      position: [0, 1.5, 4.2],
      target: [0, 1.35, 0],
      fov: 42,
      transitionSpeed: 2.8,
      handheldDrift: 0.015,
      shakeIntensity: 0,
      dofEnabled: false,
      dofFocusDistance: 4.2,
      dofBlurRadius: 3.0,
    },
  },
};

export function makeCameraFromPreset(preset: CameraShotPreset): CameraShotConfig {
  const base = CAMERA_PRESETS[preset] ?? CAMERA_PRESETS.medium_two_shot;
  return {
    preset,
    position: [...base.config.position] as [number, number, number],
    target: [...base.config.target] as [number, number, number],
    fov: base.config.fov,
    transitionSpeed: base.config.transitionSpeed,
    handheldDrift: base.config.handheldDrift,
    shakeIntensity: base.config.shakeIntensity,
    dofEnabled: base.config.dofEnabled,
    dofFocusDistance: base.config.dofFocusDistance,
    dofBlurRadius: base.config.dofBlurRadius,
  };
}

export function buildDefaultStoryProject(
  characters: CharacterAsset[],
  expressionAtlas: ExpressionAtlasBundle
): StoryProject {
  // Select 4 distinct leads from the sliced Indonesian portrait sheet
  const raka = characters[0]; // Black hoodie guy
  const nadia = characters[1]; // Denim jacket woman
  const dina = characters[5]; // Black hijab woman
  const bima = characters[8]; // GoBos green jacket courier

  const rakaId = raka?.id ?? 'char_raka_0';
  const nadiaId = nadia?.id ?? 'char_nadia_1';
  const dinaId = dina?.id ?? 'char_dina_5';
  const bimaId = bima?.id ?? 'char_bima_8';

  const nodes: StoryNode[] = [
    {
      id: 'node_intro',
      type: 'cinematic',
      title: 'Platform 04 — Golden Dusk',
      position: { x: 60, y: 180 },
      emotion: 'neutral',
      text: 'Jakarta Kota Station, 17:42. Amber light cuts across the wet concrete platform as the last commuter train pulls away.',
      typingSpeed: 38,
      duration: 4.5,
      stageCast: [
        { characterId: rakaId, slot: 'left', emotion: 'neutral' },
        { characterId: nadiaId, slot: 'right', emotion: 'neutral' },
      ],
      camera: makeCameraFromPreset('wide_establishing'),
      mood: 'golden_hour',
      particleEffect: 'dust',
      nextNodeId: 'node_nadia_ask',
      choices: [],
    },
    {
      id: 'node_nadia_ask',
      type: 'dialogue',
      title: 'Missing Film Roll',
      position: { x: 380, y: 180 },
      speakerId: nadiaId,
      emotion: 'sad',
      text: 'Raka, tell me you still have the backup drive in your hoodie. The transit blueprint photos from Manggarai are gone from my camera.',
      typingSpeed: 42,
      duration: 5.0,
      stageCast: [
        { characterId: rakaId, slot: 'left', emotion: 'neutral' },
        { characterId: nadiaId, slot: 'right', emotion: 'sad' },
      ],
      camera: makeCameraFromPreset('closeup_right'),
      mood: 'golden_hour',
      particleEffect: 'dust',
      nextNodeId: 'node_bima_arrive',
      choices: [],
    },
    {
      id: 'node_bima_arrive',
      type: 'dialogue',
      title: 'Courier Interception',
      position: { x: 700, y: 180 },
      speakerId: bimaId,
      emotion: 'surprised',
      text: 'Wait—are you Nadia? A woman in a black hijab just flagged me down near the turnstiles with a sealed courier envelope addressed to you!',
      typingSpeed: 46,
      duration: 5.2,
      stageCast: [
        { characterId: rakaId, slot: 'left', emotion: 'surprised' },
        { characterId: bimaId, slot: 'center', emotion: 'surprised' },
        { characterId: nadiaId, slot: 'right', emotion: 'surprised' },
      ],
      camera: makeCameraFromPreset('dramatic_low'),
      mood: 'golden_hour',
      particleEffect: 'embers',
      nextNodeId: 'node_branch_choice',
      choices: [],
    },
    {
      id: 'node_branch_choice',
      type: 'choice',
      title: 'Decision at the Turnstile',
      position: { x: 1020, y: 180 },
      speakerId: rakaId,
      emotion: 'neutral',
      text: 'The rain clouds are rolling in fast. How should we handle Bima’s parcel before security closes the east concourse?',
      typingSpeed: 44,
      duration: 4.0,
      stageCast: [
        { characterId: rakaId, slot: 'left', emotion: 'neutral' },
        { characterId: bimaId, slot: 'center', emotion: 'neutral' },
        { characterId: nadiaId, slot: 'right', emotion: 'neutral' },
      ],
      camera: makeCameraFromPreset('medium_two_shot'),
      mood: 'neon_rain',
      particleEffect: 'rain',
      choices: [
        {
          id: 'ch_trust_bima',
          label: 'Trust Bima and open the parcel immediately',
          setVar: 'trust',
          setDelta: 2,
          targetNodeId: 'node_branch_open',
        },
        {
          id: 'ch_track_dina',
          label: 'Hold the parcel and confront Dina on Platform 2',
          setVar: 'trust',
          setDelta: -1,
          targetNodeId: 'node_branch_confront',
        },
      ],
    },
    {
      id: 'node_branch_open',
      type: 'dialogue',
      title: 'Encrypted SD Card',
      position: { x: 1360, y: 40 },
      speakerId: nadiaId,
      emotion: 'happy',
      text: 'Look at this—it’s the original raw negatives AND Dina’s handwritten station map! She wasn’t hiding it from us; she was keeping it out of the contractor’s hands.',
      typingSpeed: 45,
      duration: 5.5,
      stageCast: [
        { characterId: rakaId, slot: 'left', emotion: 'happy' },
        { characterId: bimaId, slot: 'center', emotion: 'happy' },
        { characterId: nadiaId, slot: 'right', emotion: 'happy' },
      ],
      camera: makeCameraFromPreset('over_shoulder'),
      mood: 'morning_mist',
      particleEffect: 'dust',
      nextNodeId: 'node_ending_alliance',
      choices: [],
    },
    {
      id: 'node_branch_confront',
      type: 'dialogue',
      title: 'Midnight Standoff',
      position: { x: 1360, y: 320 },
      speakerId: dinaId,
      emotion: 'angry',
      text: 'You really thought I sold out the archive, Raka? Keep your voice down—the city inspectors are scanning every turnstile badge tonight!',
      typingSpeed: 48,
      duration: 5.5,
      stageCast: [
        { characterId: rakaId, slot: 'left', emotion: 'angry' },
        { characterId: dinaId, slot: 'right', emotion: 'angry' },
      ],
      camera: makeCameraFromPreset('closeup_right'),
      mood: 'midnight_station',
      particleEffect: 'rain',
      nextNodeId: 'node_ending_solo',
      choices: [],
    },
    {
      id: 'node_ending_alliance',
      type: 'dialogue',
      title: 'Ending A — Full Disclosure',
      position: { x: 1700, y: 40 },
      speakerId: dinaId,
      emotion: 'happy',
      text: 'Glad you trusted the courier, Nadia. Together we have enough evidence to publish the heritage station report before dawn.',
      typingSpeed: 40,
      duration: 6.0,
      stageCast: [
        { characterId: nadiaId, slot: 'left', emotion: 'happy' },
        { characterId: dinaId, slot: 'center', emotion: 'happy' },
        { characterId: rakaId, slot: 'right', emotion: 'happy' },
      ],
      camera: makeCameraFromPreset('wide_establishing'),
      mood: 'golden_hour',
      particleEffect: 'embers',
      choices: [],
    },
    {
      id: 'node_ending_solo',
      type: 'dialogue',
      title: 'Ending B — Fractured Trail',
      position: { x: 1700, y: 320 },
      speakerId: rakaId,
      emotion: 'sad',
      text: 'Dina vanished into the rain before we could check the manifest. We recovered the drive, but we’re on our own for the morning hearing.',
      typingSpeed: 40,
      duration: 6.0,
      stageCast: [
        { characterId: rakaId, slot: 'center', emotion: 'sad' },
        { characterId: nadiaId, slot: 'right', emotion: 'sad' },
      ],
      camera: makeCameraFromPreset('closeup_center'),
      mood: 'midnight_station',
      particleEffect: 'rain',
      choices: [],
    },
  ];

  return {
    version: '1.0.0',
    storyName: 'senja_stasiun_jakarta',
    title: 'Dusk at Jakarta Station',
    subtitle: 'Interactive Branching Cinematic Story',
    startNodeId: 'node_intro',
    initialVariables: { trust: 0 },
    characters,
    nodes,
    expressionAtlas,
  };
}
