import {
  ADDRESS_CLAMP_TO_EDGE,
  Application,
  BLEND_NORMAL,
  CameraFrame,
  Color,
  CULLFACE_NONE,
  Curve,
  CurveSet,
  ElementInput,
  EMITTERSHAPE_BOX,
  Entity,
  FILLMODE_NONE,
  FILTER_LINEAR,
  FOG_EXP2,
  Keyboard,
  math,
  Mesh,
  Mouse,
  PIXELFORMAT_RGBA8,
  PlaneGeometry,
  RESOLUTION_AUTO,
  Script,
  SHADOW_PCF3_32F,
  SHADOWUPDATE_REALTIME,
  Sprite,
  SPRITE_RENDERMODE_SIMPLE,
  SPRITETYPE_SIMPLE,
  StandardMaterial,
  Texture,
  TextureAtlas,
  TONEMAP_ACES2,
  TouchDevice,
  Vec2,
  Vec3,
  Vec4,
} from 'playcanvas';
import {
  AtmosphereMood,
  CameraShotConfig,
  CharacterAsset,
  EmotionType,
  ExpressionAtlasBundle,
  EyeFrameKey,
  MouthFrameKey,
  ParticleEffectType,
  StageCharacterPlacement,
  StageSlot,
} from '../types/story';

const EYE_FRAME_LIST: EyeFrameKey[] = [
  'eyes_neutral',
  'eyes_blink',
  'eyes_happy',
  'eyes_sad',
  'eyes_angry',
  'eyes_surprised',
  'eyes_wink',
];

const MOUTH_FRAME_LIST: MouthFrameKey[] = [
  'mouth_closed',
  'mouth_talk_1',
  'mouth_talk_2',
  'mouth_talk_3',
  'mouth_smile',
  'mouth_frown',
  'mouth_open_shock',
];

const SLOT_POSITIONS: Record<StageSlot, Vec3> = {
  left: new Vec3(-1.35, 0, 0),
  center: new Vec3(0, 0, 0.16),
  right: new Vec3(1.35, 0, 0),
};

const MOOD_PRESETS: Record<
  AtmosphereMood,
  {
    skyClear: Color;
    fogColor: Color;
    fogDensity: number;
    ambient: Color;
    keyColor: Color;
    keyIntensity: number;
    keyEuler: [number, number, number];
    fillColor: Color;
    fillIntensity: number;
    rimColor: Color;
    rimIntensity: number;
    gradingTint: Color;
    gradingSat: number;
    gradingContrast: number;
    bloomIntensity: number;
    vignetteIntensity: number;
  }
> = {
  golden_hour: {
    skyClear: new Color(0.11, 0.09, 0.14),
    fogColor: new Color(0.14, 0.1, 0.13),
    fogDensity: 0.045,
    ambient: new Color(0.38, 0.31, 0.34),
    keyColor: new Color(1.0, 0.78, 0.52),
    keyIntensity: 2.1,
    keyEuler: [42, -32, 0],
    fillColor: new Color(0.45, 0.62, 0.92),
    fillIntensity: 0.85,
    rimColor: new Color(1.0, 0.62, 0.25),
    rimIntensity: 1.6,
    gradingTint: new Color(1.04, 0.99, 0.94),
    gradingSat: 1.08,
    gradingContrast: 1.04,
    bloomIntensity: 0.038,
    vignetteIntensity: 0.34,
  },
  neon_rain: {
    skyClear: new Color(0.05, 0.08, 0.13),
    fogColor: new Color(0.06, 0.09, 0.15),
    fogDensity: 0.058,
    ambient: new Color(0.24, 0.3, 0.42),
    keyColor: new Color(0.42, 0.82, 1.0),
    keyIntensity: 1.85,
    keyEuler: [48, 28, 0],
    fillColor: new Color(0.95, 0.48, 0.62),
    fillIntensity: 0.75,
    rimColor: new Color(0.22, 0.9, 0.95),
    rimIntensity: 1.7,
    gradingTint: new Color(0.94, 0.99, 1.06),
    gradingSat: 1.12,
    gradingContrast: 1.08,
    bloomIntensity: 0.048,
    vignetteIntensity: 0.42,
  },
  midnight_station: {
    skyClear: new Color(0.03, 0.04, 0.07),
    fogColor: new Color(0.04, 0.05, 0.09),
    fogDensity: 0.065,
    ambient: new Color(0.18, 0.21, 0.3),
    keyColor: new Color(0.75, 0.84, 1.0),
    keyIntensity: 1.55,
    keyEuler: [56, -18, 0],
    fillColor: new Color(0.32, 0.4, 0.62),
    fillIntensity: 0.65,
    rimColor: new Color(0.95, 0.68, 0.32),
    rimIntensity: 1.45,
    gradingTint: new Color(0.92, 0.96, 1.05),
    gradingSat: 0.92,
    gradingContrast: 1.12,
    bloomIntensity: 0.04,
    vignetteIntensity: 0.52,
  },
  morning_mist: {
    skyClear: new Color(0.14, 0.18, 0.22),
    fogColor: new Color(0.18, 0.22, 0.26),
    fogDensity: 0.036,
    ambient: new Color(0.48, 0.52, 0.56),
    keyColor: new Color(1.0, 0.96, 0.88),
    keyIntensity: 2.0,
    keyEuler: [36, -40, 0],
    fillColor: new Color(0.66, 0.82, 0.96),
    fillIntensity: 1.0,
    rimColor: new Color(0.95, 0.92, 0.8),
    rimIntensity: 1.2,
    gradingTint: new Color(1.0, 1.02, 1.02),
    gradingSat: 1.04,
    gradingContrast: 1.0,
    bloomIntensity: 0.03,
    vignetteIntensity: 0.26,
  },
};

export class NpcRigScript extends Script {
  static scriptName = 'npcRigScript';

  targetPos = new Vec3();
  targetOpacity = 1;
  currentOpacity = 1;
  emotion: EmotionType = 'neutral';
  isSpeaking = false;
  isActiveSpeaker = true;
  flipX = false;

  eyesEntity: Entity | null = null;
  mouthEntity: Entity | null = null;
  bodyMaterial: StandardMaterial | null = null;

  private _blinkTimer = 2.6;
  private _isBlinking = false;
  private _blinkDuration = 0.12;
  private _lipTimer = 0;
  private _lipPhase = 0;
  private _breathTime = 0;
  private _baseEyeScale = new Vec3(1, 1, 1);

  initialize() {
    this._breathTime = Math.random() * Math.PI * 2;
    this._blinkTimer = 1.6 + Math.random() * 2.8;
    if (this.eyesEntity) {
      this._baseEyeScale.copy(this.eyesEntity.getLocalScale());
    }
  }

  setTargetTransform(pos: Vec3, flipX: boolean, isSpeaker: boolean) {
    this.targetPos.copy(pos);
    this.flipX = flipX;
    this.isActiveSpeaker = isSpeaker;
  }

  setExpression(emotion: EmotionType, isSpeaking: boolean) {
    this.emotion = emotion;
    this.isSpeaking = isSpeaking;
  }

  private getEyeFrameIndex(emotion: EmotionType, blinking: boolean): number {
    if (blinking) return EYE_FRAME_LIST.indexOf('eyes_blink');
    switch (emotion) {
      case 'happy':
        return EYE_FRAME_LIST.indexOf('eyes_happy');
      case 'sad':
        return EYE_FRAME_LIST.indexOf('eyes_sad');
      case 'angry':
        return EYE_FRAME_LIST.indexOf('eyes_angry');
      case 'surprised':
        return EYE_FRAME_LIST.indexOf('eyes_surprised');
      default:
        return EYE_FRAME_LIST.indexOf('eyes_neutral');
    }
  }

  private getRestMouthFrameIndex(emotion: EmotionType): number {
    switch (emotion) {
      case 'happy':
        return MOUTH_FRAME_LIST.indexOf('mouth_smile');
      case 'sad':
      case 'angry':
        return MOUTH_FRAME_LIST.indexOf('mouth_frown');
      case 'surprised':
        return MOUTH_FRAME_LIST.indexOf('mouth_open_shock');
      default:
        return MOUTH_FRAME_LIST.indexOf('mouth_closed');
    }
  }

  update(dt: number) {
    this._breathTime += dt;

    // Smooth position interpolation + speaker forward emphasis
    const curPos = this.entity.getLocalPosition();
    const zBoost = this.isActiveSpeaker ? 0.18 : -0.15;
    const targetX = this.targetPos.x;
    const targetY = this.targetPos.y + Math.sin(this._breathTime * 1.9) * 0.012;
    const targetZ = this.targetPos.z + zBoost;

    const lerpRate = Math.min(1, dt * 6.5);
    this.entity.setLocalPosition(
      math.lerp(curPos.x, targetX, lerpRate),
      math.lerp(curPos.y, targetY, lerpRate),
      math.lerp(curPos.z, targetZ, lerpRate)
    );

    // Subtle breathing scale
    const breathScale = 1 + Math.sin(this._breathTime * 1.9) * 0.005;
    const focusScale = this.isActiveSpeaker ? 1.02 : 0.96;
    const sx = (this.flipX ? -1 : 1) * focusScale;
    const curScale = this.entity.getLocalScale();
    this.entity.setLocalScale(
      math.lerp(curScale.x, sx, lerpRate),
      math.lerp(curScale.y, focusScale * breathScale, lerpRate),
      1
    );

    // Dim non-speaking characters subtly for cinematic hierarchy
    const desiredBrightness = this.isActiveSpeaker ? 1.0 : 0.62;
    this.currentOpacity = math.lerp(this.currentOpacity, desiredBrightness, lerpRate);
    if (this.bodyMaterial) {
      this.bodyMaterial.diffuse.set(this.currentOpacity, this.currentOpacity, this.currentOpacity);
      this.bodyMaterial.update();
    }
    if (this.eyesEntity?.sprite) {
      this.eyesEntity.sprite.color = new Color(
        this.currentOpacity,
        this.currentOpacity,
        this.currentOpacity
      );
    }
    if (this.mouthEntity?.sprite) {
      this.mouthEntity.sprite.color = new Color(
        this.currentOpacity,
        this.currentOpacity,
        this.currentOpacity
      );
    }

    // Autonomous blinking
    this._blinkTimer -= dt;
    if (this._blinkTimer <= 0) {
      if (!this._isBlinking) {
        this._isBlinking = true;
        this._blinkTimer = this._blinkDuration;
      } else {
        this._isBlinking = false;
        this._blinkTimer = 2.2 + Math.random() * 3.4;
      }
    }

    if (this.eyesEntity?.sprite) {
      const targetEyeFrame = this.getEyeFrameIndex(this.emotion, this._isBlinking);
      if (this.eyesEntity.sprite.frame !== targetEyeFrame && targetEyeFrame >= 0) {
        this.eyesEntity.sprite.frame = targetEyeFrame;
      }
    }

    // Real-time lip-sync phoneme cadence while speaking
    if (this.mouthEntity?.sprite) {
      let targetMouthFrame: number;
      if (this.isSpeaking) {
        this._lipTimer -= dt;
        if (this._lipTimer <= 0) {
          this._lipTimer = 0.085 + Math.random() * 0.055;
          const sequence: MouthFrameKey[] = [
            'mouth_talk_1',
            'mouth_talk_2',
            'mouth_talk_3',
            'mouth_talk_2',
            'mouth_talk_1',
            'mouth_closed',
          ];
          this._lipPhase = (this._lipPhase + 1) % sequence.length;
        }
        const sequence: MouthFrameKey[] = [
          'mouth_talk_1',
          'mouth_talk_2',
          'mouth_talk_3',
          'mouth_talk_2',
          'mouth_talk_1',
          'mouth_closed',
        ];
        targetMouthFrame = MOUTH_FRAME_LIST.indexOf(sequence[this._lipPhase]);
      } else {
        targetMouthFrame = this.getRestMouthFrameIndex(this.emotion);
      }

      if (this.mouthEntity.sprite.frame !== targetMouthFrame && targetMouthFrame >= 0) {
        this.mouthEntity.sprite.frame = targetMouthFrame;
      }
    }
  }
}

export class CinematicCameraScript extends Script {
  static scriptName = 'cinematicCameraScript';

  targetPosition = new Vec3(0, 1.55, 5.2);
  targetLookAt = new Vec3(0, 1.3, 0);
  currentLookAt = new Vec3(0, 1.3, 0);
  targetFov = 45;
  transitionSpeed = 2.8;
  handheldDrift = 0.015;
  shakeIntensity = 0;

  orbitMode = false;
  orbitYaw = 0;
  orbitPitch = 6;
  orbitDistance = 4.4;

  private _time = 0;
  private _tempPos = new Vec3();
  private _tempLook = new Vec3();

  applyShot(config: CameraShotConfig) {
    this.targetPosition.set(config.position[0], config.position[1], config.position[2]);
    this.targetLookAt.set(config.target[0], config.target[1], config.target[2]);
    this.targetFov = config.fov;
    this.transitionSpeed = Math.max(0.5, config.transitionSpeed);
    this.handheldDrift = config.handheldDrift;
    this.shakeIntensity = config.shakeIntensity;

    // Sync orbit parameters from shot vector so toggling orbit mode stays seamless
    const offset = new Vec3().sub2(this.targetPosition, this.targetLookAt);
    this.orbitDistance = Math.max(1.5, offset.length());
    this.orbitYaw = Math.atan2(offset.x, offset.z) * math.RAD_TO_DEG;
    this.orbitPitch = Math.asin(math.clamp(offset.y / this.orbitDistance, -0.8, 0.8)) * math.RAD_TO_DEG;
  }

  update(dt: number) {
    this._time += dt;
    const cam = this.entity.camera;
    if (!cam) return;

    const lerpFactor = Math.min(1, dt * this.transitionSpeed);

    if (this.orbitMode) {
      const yawRad = this.orbitYaw * math.DEG_TO_RAD;
      const pitchRad = this.orbitPitch * math.DEG_TO_RAD;
      const cosP = Math.cos(pitchRad);
      const desiredX = this.targetLookAt.x + this.orbitDistance * cosP * Math.sin(yawRad);
      const desiredY = this.targetLookAt.y + this.orbitDistance * Math.sin(pitchRad);
      const desiredZ = this.targetLookAt.z + this.orbitDistance * cosP * Math.cos(yawRad);
      this.targetPosition.set(desiredX, desiredY, desiredZ);
    }

    const pos = this.entity.getPosition();
    this._tempPos.lerp(pos, this.targetPosition, lerpFactor);
    this.currentLookAt.lerp(this.currentLookAt, this.targetLookAt, lerpFactor);

    // Handheld cinematic drift + trauma shake
    const driftX = Math.sin(this._time * 0.73) * this.handheldDrift;
    const driftY = Math.cos(this._time * 1.12) * this.handheldDrift * 0.65;
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0.001) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 0.035);
    }

    this.entity.setPosition(
      this._tempPos.x + driftX + shakeX,
      this._tempPos.y + driftY + shakeY,
      this._tempPos.z
    );

    this._tempLook.set(
      this.currentLookAt.x + driftX * 0.35,
      this.currentLookAt.y + driftY * 0.35,
      this.currentLookAt.z
    );
    this.entity.lookAt(this._tempLook);

    cam.fov = math.lerp(cam.fov, this.targetFov, lerpFactor);
  }
}

export interface PlayCanvasRuntimeOverrides {
  bloomIntensity?: number;
  vignetteIntensity?: number;
  dofEnabled?: boolean;
  dofFocusDistance?: number;
  fovOffset?: number;
  timeScale?: number;
}

export class PlayCanvasStoryStage {
  readonly app: Application;
  readonly canvas: HTMLCanvasElement;
  readonly cameraEntity: Entity;
  readonly cameraFrame: CameraFrame;
  private cameraScript: CinematicCameraScript | null = null;

  private keyLight: Entity;
  private fillLight: Entity;
  private rimLight: Entity;
  private particleEntity: Entity;
  private stageRoot: Entity;
  private castRoot: Entity;

  private expressionAtlas: TextureAtlas | null = null;
  private atlasTexture: Texture | null = null;
  private eyesSprite: Sprite | null = null;
  private mouthSprite: Sprite | null = null;

  private characterTextures = new Map<string, Texture>();
  private activeNpcEntities = new Map<string, Entity>();
  private portraitPlaneMesh: Mesh | null = null;

  private currentMood: AtmosphereMood = 'golden_hour';
  private currentParticleType: ParticleEffectType = 'dust';
  private isDraggingOrbit = false;
  private lastPointer = new Vec2();
  private overrides: PlayCanvasRuntimeOverrides = {};
  private currentCameraConfig: CameraShotConfig | null = null;
  private destroyed = false;

  private onResize = () => {
    if (!this.destroyed) {
      this.app.resizeCanvas();
    }
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
  };

  private onMouseDown = (e: MouseEvent) => {
    if (!this.cameraScript?.orbitMode) return;
    this.isDraggingOrbit = true;
    this.lastPointer.set(e.clientX, e.clientY);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDraggingOrbit || !this.cameraScript?.orbitMode) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer.set(e.clientX, e.clientY);
    this.cameraScript.orbitYaw -= dx * 0.35;
    this.cameraScript.orbitPitch = math.clamp(this.cameraScript.orbitPitch + dy * 0.25, -20, 45);
  };

  private onMouseUp = () => {
    this.isDraggingOrbit = false;
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.cameraScript?.orbitMode) return;
    e.preventDefault();
    this.cameraScript.orbitDistance = math.clamp(
      this.cameraScript.orbitDistance + e.deltaY * 0.004,
      1.6,
      9.0
    );
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.app = new Application(canvas, {
      mouse: new Mouse(canvas),
      keyboard: new Keyboard(window),
      touch: new TouchDevice(canvas),
      elementInput: new ElementInput(canvas),
      graphicsDeviceOptions: {
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      },
    });

    this.app.setCanvasFillMode(FILLMODE_NONE);
    this.app.setCanvasResolution(RESOLUTION_AUTO);
    this.app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    this.stageRoot = new Entity('stage_root');
    this.castRoot = new Entity('cast_root');
    this.app.root.addChild(this.stageRoot);
    this.app.root.addChild(this.castRoot);

    // Build Camera + CameraFrame post-processing pipeline
    this.cameraEntity = new Entity('cinematic_camera');
    this.cameraEntity.addComponent('camera', {
      clearColor: MOOD_PRESETS.golden_hour.skyClear.clone(),
      fov: 44,
      nearClip: 0.1,
      farClip: 60,
    });
    this.cameraEntity.setPosition(0, 1.58, 5.2);
    this.cameraEntity.lookAt(0, 1.3, 0);
    this.app.root.addChild(this.cameraEntity);

    this.cameraEntity.addComponent('script');
    this.cameraScript = this.cameraEntity.script!.create(CinematicCameraScript) as CinematicCameraScript;

    this.cameraFrame = new CameraFrame(this.app, this.cameraEntity.camera!);
    this.cameraFrame.rendering.toneMapping = TONEMAP_ACES2;
    this.cameraFrame.rendering.sharpness = 0.25;
    this.cameraFrame.bloom.intensity = 0.038;
    this.cameraFrame.bloom.threshold = 0.85;
    this.cameraFrame.bloom.blurLevel = 8;
    this.cameraFrame.vignette.intensity = 0.34;
    this.cameraFrame.vignette.inner = 0.55;
    this.cameraFrame.vignette.outer = 1.25;
    this.cameraFrame.grading.enabled = true;
    this.cameraFrame.update();

    // Build 3-point stage lighting
    this.keyLight = new Entity('key_light');
    this.keyLight.addComponent('light', {
      type: 'directional',
      color: new Color(1, 0.82, 0.58),
      intensity: 2.0,
      castShadows: true,
      shadowBias: 0.2,
      normalOffsetBias: 0.05,
      shadowDistance: 16,
      shadowResolution: 2048,
      shadowType: SHADOW_PCF3_32F,
      shadowUpdateMode: SHADOWUPDATE_REALTIME,
    });
    this.keyLight.setEulerAngles(42, -32, 0);
    this.stageRoot.addChild(this.keyLight);

    this.fillLight = new Entity('fill_light');
    this.fillLight.addComponent('light', {
      type: 'directional',
      color: new Color(0.45, 0.62, 0.92),
      intensity: 0.85,
      castShadows: false,
    });
    this.fillLight.setEulerAngles(25, 145, 0);
    this.stageRoot.addChild(this.fillLight);

    this.rimLight = new Entity('rim_light');
    this.rimLight.addComponent('light', {
      type: 'spot',
      color: new Color(1.0, 0.65, 0.3),
      intensity: 3.5,
      range: 14,
      innerConeAngle: 28,
      outerConeAngle: 52,
      castShadows: false,
    });
    this.rimLight.setPosition(0, 3.6, -2.8);
    this.rimLight.setEulerAngles(-48, 0, 0);
    this.stageRoot.addChild(this.rimLight);

    // Build 3D architectural stage environment
    this.buildArchitecturalStage();

    // Build atmospheric ParticleSystem
    this.particleEntity = this.buildParticleSystem();
    this.stageRoot.addChild(this.particleEntity);

    // Prebuild upright portrait mesh
    const planeGeom = new PlaneGeometry({
      halfExtents: new Vec2(1.2, 1.2),
      widthSegments: 1,
      lengthSegments: 1,
    });
    this.portraitPlaneMesh = Mesh.fromGeometry(this.app.graphicsDevice, planeGeom);

    this.applyAtmosphereMood('golden_hour');

    // Bind lifecycle & camera orbit listeners
    window.addEventListener('resize', this.onResize);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });

    this.app.start();
    this.app.resizeCanvas();
  }

  private buildArchitecturalStage() {
    // Platform floor
    const floorMat = new StandardMaterial();
    floorMat.diffuse = new Color(0.08, 0.09, 0.12);
    floorMat.useMetalness = true;
    floorMat.metalness = 0.35;
    floorMat.gloss = 0.72;
    floorMat.update();

    const floorEntity = new Entity('stage_floor');
    floorEntity.addComponent('render', {
      type: 'box',
      material: floorMat,
      receiveShadows: true,
      castShadows: false,
    });
    floorEntity.setLocalScale(15, 0.2, 11);
    floorEntity.setPosition(0, -0.1, -0.5);
    this.stageRoot.addChild(floorEntity);

    // Subtle glowing horizon rail / station platform edge
    const edgeMat = new StandardMaterial();
    edgeMat.diffuse = new Color(0.25, 0.22, 0.18);
    edgeMat.emissive = new Color(0.95, 0.62, 0.18);
    edgeMat.emissiveIntensity = 1.4;
    edgeMat.update();

    const safetyStrip = new Entity('platform_safety_strip');
    safetyStrip.addComponent('render', {
      type: 'box',
      material: edgeMat,
      castShadows: false,
      receiveShadows: false,
    });
    safetyStrip.setLocalScale(14, 0.025, 0.08);
    safetyStrip.setPosition(0, 0.012, -1.65);
    this.stageRoot.addChild(safetyStrip);

    // Architectural concrete pillars (for real PlayCanvas depth & DOF bokeh)
    const pillarMat = new StandardMaterial();
    pillarMat.diffuse = new Color(0.14, 0.16, 0.21);
    pillarMat.useMetalness = true;
    pillarMat.metalness = 0.2;
    pillarMat.gloss = 0.35;
    pillarMat.update();

    const pillarPositions: [number, number, number][] = [
      [-4.6, 2.2, -2.8],
      [-2.1, 2.2, -3.6],
      [2.1, 2.2, -3.6],
      [4.6, 2.2, -2.8],
    ];

    pillarPositions.forEach(([px, py, pz], idx) => {
      const pillar = new Entity(`station_pillar_${idx}`);
      pillar.addComponent('render', {
        type: 'box',
        material: pillarMat,
        castShadows: true,
        receiveShadows: true,
      });
      pillar.setLocalScale(0.45, 4.4, 0.45);
      pillar.setPosition(px, py, pz);
      this.stageRoot.addChild(pillar);

      // Overhead station lamp bar
      const lamp = new Entity(`station_lamp_${idx}`);
      lamp.addComponent('render', {
        type: 'box',
        material: edgeMat,
        castShadows: false,
      });
      lamp.setLocalScale(0.48, 0.08, 0.48);
      lamp.setPosition(px, 3.85, pz);
      this.stageRoot.addChild(lamp);
    });

    // Overhead canopy beam
    const beam = new Entity('station_canopy_beam');
    beam.addComponent('render', {
      type: 'box',
      material: pillarMat,
      castShadows: true,
      receiveShadows: true,
    });
    beam.setLocalScale(12.5, 0.28, 0.7);
    beam.setPosition(0, 4.25, -3.2);
    this.stageRoot.addChild(beam);

    // Distant station backdrop wall
    const wallMat = new StandardMaterial();
    wallMat.diffuse = new Color(0.06, 0.07, 0.11);
    wallMat.useMetalness = true;
    wallMat.metalness = 0.1;
    wallMat.gloss = 0.2;
    wallMat.update();

    const backWall = new Entity('station_backdrop');
    backWall.addComponent('render', {
      type: 'box',
      material: wallMat,
      receiveShadows: true,
    });
    backWall.setLocalScale(22, 8, 0.25);
    backWall.setPosition(0, 3.8, -6.2);
    this.stageRoot.addChild(backWall);

    // Cylindrical bollard props on edges
    [-3.1, 3.1].forEach((bx, i) => {
      const bollard = new Entity(`platform_bollard_${i}`);
      bollard.addComponent('render', {
        type: 'cylinder',
        material: pillarMat,
        castShadows: true,
        receiveShadows: true,
      });
      bollard.setLocalScale(0.24, 0.85, 0.24);
      bollard.setPosition(bx, 0.425, -1.25);
      this.stageRoot.addChild(bollard);
    });
  }

  private buildParticleSystem(): Entity {
    const entity = new Entity('atmosphere_particles');
    entity.setPosition(0, 2.1, -0.8);

    // Soft radial particle texture
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32;
    pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d')!;
    const grad = pCtx.createRadialGradient(16, 16, 1, 16, 16, 15);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.55)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 32, 32);

    const particleTex = new Texture(this.app.graphicsDevice, {
      width: 32,
      height: 32,
      format: PIXELFORMAT_RGBA8,
    });
    particleTex.setSource(pCanvas);

    entity.addComponent('particlesystem', {
      numParticles: 90,
      lifetime: 4.5,
      rate: 0.04,
      emitterShape: EMITTERSHAPE_BOX,
      emitterExtents: new Vec3(7.5, 3.6, 4.5),
      loop: true,
      colorMap: particleTex,
      velocityGraph: new CurveSet([
        [0, -0.08, 1, 0.08],
        [0, -0.05, 1, 0.06],
        [0, -0.04, 1, 0.04],
      ]),
      scaleGraph: new Curve([0, 0.025, 0.5, 0.045, 1, 0.015]),
      alphaGraph: new Curve([0, 0, 0.25, 0.55, 0.8, 0.45, 1, 0]),
      colorGraph: new CurveSet([
        [0, 1],
        [0, 0.88],
        [0, 0.65],
      ]),
    });

    return entity;
  }

  async loadExpressionAtlas(bundle: ExpressionAtlasBundle): Promise<void> {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = bundle.imageDataUrl;
    });

    if (this.destroyed) return;

    if (this.atlasTexture) {
      this.atlasTexture.destroy();
    }

    const tex = new Texture(this.app.graphicsDevice, {
      width: bundle.width,
      height: bundle.height,
      format: PIXELFORMAT_RGBA8,
      mipmaps: false,
      minFilter: FILTER_LINEAR,
      magFilter: FILTER_LINEAR,
      addressU: ADDRESS_CLAMP_TO_EDGE,
      addressV: ADDRESS_CLAMP_TO_EDGE,
      flipY: false,
      srgb: true,
    });
    tex.setSource(img);
    this.atlasTexture = tex;

    const atlas = new TextureAtlas();
    atlas.texture = tex;

    for (const [key, frame] of Object.entries(bundle.frames)) {
      atlas.setFrame(key, {
        rect: new Vec4(frame.pcRect[0], frame.pcRect[1], frame.pcRect[2], frame.pcRect[3]),
        pivot: new Vec2(frame.pivot[0], frame.pivot[1]),
        border: new Vec4(0, 0, 0, 0),
      });
    }

    if (this.expressionAtlas) {
      this.expressionAtlas.destroy();
    }
    this.expressionAtlas = atlas;

    if (this.eyesSprite) this.eyesSprite.destroy();
    if (this.mouthSprite) this.mouthSprite.destroy();

    this.eyesSprite = new Sprite(this.app.graphicsDevice, {
      pixelsPerUnit: 305,
      renderMode: SPRITE_RENDERMODE_SIMPLE,
      atlas,
      frameKeys: EYE_FRAME_LIST,
    });

    this.mouthSprite = new Sprite(this.app.graphicsDevice, {
      pixelsPerUnit: 305,
      renderMode: SPRITE_RENDERMODE_SIMPLE,
      atlas,
      frameKeys: MOUTH_FRAME_LIST,
    });

    for (const npcRoot of this.activeNpcEntities.values()) {
      const rig = npcRoot.script?.get(NpcRigScript) as NpcRigScript | undefined;
      if (rig?.eyesEntity?.sprite) {
        rig.eyesEntity.sprite.sprite = this.eyesSprite;
      }
      if (rig?.mouthEntity?.sprite) {
        rig.mouthEntity.sprite.sprite = this.mouthSprite;
      }
    }
  }

  private async ensureCharacterTexture(char: CharacterAsset): Promise<Texture> {
    const cached = this.characterTextures.get(char.id);
    if (cached) return cached;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = char.portraitDataUrl;
    });

    const tex = new Texture(this.app.graphicsDevice, {
      width: img.naturalWidth || 512,
      height: img.naturalHeight || 512,
      format: PIXELFORMAT_RGBA8,
      mipmaps: true,
      minFilter: FILTER_LINEAR,
      magFilter: FILTER_LINEAR,
      addressU: ADDRESS_CLAMP_TO_EDGE,
      addressV: ADDRESS_CLAMP_TO_EDGE,
      flipY: false,
      srgb: true,
    });
    tex.setSource(img);
    this.characterTextures.set(char.id, tex);
    return tex;
  }

  async syncStageCast(
    placements: StageCharacterPlacement[],
    characters: CharacterAsset[],
    speakerId: string | undefined,
    isSpeaking: boolean
  ): Promise<void> {
    if (this.destroyed || !this.portraitPlaneMesh) return;

    const desiredIds = new Set(placements.map((p) => p.characterId));

    // Disable characters not in current shot
    for (const [charId, entity] of this.activeNpcEntities.entries()) {
      if (!desiredIds.has(charId)) {
        entity.enabled = false;
      }
    }

    for (const placement of placements) {
      const char = characters.find((c) => c.id === placement.characterId);
      if (!char) continue;

      let npcRoot = this.activeNpcEntities.get(char.id);
      if (!npcRoot) {
        const tex = await this.ensureCharacterTexture(char);
        if (this.destroyed) return;

        npcRoot = new Entity(`npc_${char.id}`);
        npcRoot.addComponent('script');
        const rig = npcRoot.script!.create(NpcRigScript) as NpcRigScript;

        // Faceless base portrait quad (2.4m x 2.4m centered at y = 1.2m so y=0 is floor)
        const bodyEntity = new Entity(`npc_body_${char.id}`);
        const bodyMat = new StandardMaterial();
        bodyMat.diffuseMap = tex;
        bodyMat.opacityMap = tex;
        bodyMat.opacityMapChannel = 'a';
        bodyMat.blendType = BLEND_NORMAL;
        bodyMat.alphaTest = 0.25;
        bodyMat.depthWrite = true;
        bodyMat.cull = CULLFACE_NONE;
        bodyMat.useLighting = true;
        bodyMat.gloss = 0.12;
        bodyMat.emissive = new Color(0.16, 0.16, 0.18);
        bodyMat.update();

        bodyEntity.addComponent('render', {
          type: 'plane',
          material: bodyMat,
          castShadows: true,
          receiveShadows: true,
        });
        // PlaneGeometry default is 1x1 on XZ; scale to 2.4x2.4 and rotate +90 X with flipY=false
        bodyEntity.setLocalScale(2.4, 1, 2.4);
        bodyEntity.setLocalEulerAngles(90, 0, 0);
        bodyEntity.setLocalPosition(0, 1.2, 0);
        npcRoot.addChild(bodyEntity);

        // Eyes SpriteComponent from TextureAtlas
        const eyesEntity = new Entity(`npc_eyes_${char.id}`);
        if (this.eyesSprite) {
          eyesEntity.addComponent('sprite', {
            type: SPRITETYPE_SIMPLE,
            sprite: this.eyesSprite,
            frame: 0,
            drawOrder: 10,
          });
        }
        npcRoot.addChild(eyesEntity);

        // Mouth SpriteComponent from TextureAtlas
        const mouthEntity = new Entity(`npc_mouth_${char.id}`);
        if (this.mouthSprite) {
          mouthEntity.addComponent('sprite', {
            type: SPRITETYPE_SIMPLE,
            sprite: this.mouthSprite,
            frame: 0,
            drawOrder: 12,
          });
        }
        npcRoot.addChild(mouthEntity);

        rig.eyesEntity = eyesEntity;
        rig.mouthEntity = mouthEntity;
        rig.bodyMaterial = bodyMat;

        this.castRoot.addChild(npcRoot);
        this.activeNpcEntities.set(char.id, npcRoot);
      }

      npcRoot.enabled = true;

      // Apply latest anchor coordinates (so live anchor edits in Builder reflect immediately!)
      const rig = npcRoot.script?.get(NpcRigScript) as NpcRigScript | undefined;
      if (rig) {
        if (rig.eyesEntity) {
          rig.eyesEntity.setLocalPosition(
            (char.eyeAnchor.x - 0.5) * 2.4,
            (1 - char.eyeAnchor.y) * 2.4,
            0.016
          );
          rig.eyesEntity.setLocalScale(
            char.eyeAnchor.scale,
            char.eyeAnchor.scale,
            1
          );
        }
        if (rig.mouthEntity) {
          rig.mouthEntity.setLocalPosition(
            (char.mouthAnchor.x - 0.5) * 2.4,
            (1 - char.mouthAnchor.y) * 2.4,
            0.02
          );
          rig.mouthEntity.setLocalScale(
            char.mouthAnchor.scale,
            char.mouthAnchor.scale,
            1
          );
        }

        const slotPos = SLOT_POSITIONS[placement.slot] ?? SLOT_POSITIONS.center;
        const isSpeaker = !speakerId || speakerId === char.id;
        rig.setTargetTransform(slotPos, Boolean(placement.flipX), isSpeaker);
        rig.setExpression(
          placement.emotion,
          Boolean(isSpeaking && speakerId === char.id)
        );
      }
    }
  }

  updateSpeakingState(speakerId: string | undefined, isSpeaking: boolean) {
    for (const [charId, entity] of this.activeNpcEntities.entries()) {
      if (!entity.enabled) continue;
      const rig = entity.script?.get(NpcRigScript) as NpcRigScript | undefined;
      if (rig) {
        rig.isSpeaking = Boolean(isSpeaking && speakerId === charId);
      }
    }
  }

  applyCameraShot(config: CameraShotConfig) {
    this.currentCameraConfig = config;
    const effectiveConfig: CameraShotConfig = {
      ...config,
      fov: math.clamp(config.fov + (this.overrides.fovOffset ?? 0), 18, 80),
    };
    this.cameraScript?.applyShot(effectiveConfig);
    this.syncPostProcessing();
  }

  applyAtmosphereMood(mood: AtmosphereMood) {
    this.currentMood = mood;
    const preset = MOOD_PRESETS[mood] ?? MOOD_PRESETS.golden_hour;
    const scene = this.app.scene;

    if (this.cameraEntity.camera) {
      this.cameraEntity.camera.clearColor = preset.skyClear.clone();
    }
    scene.ambientLight = preset.ambient.clone();
    scene.fog.type = FOG_EXP2;
    scene.fog.color = preset.fogColor.clone();
    scene.fog.density = preset.fogDensity;

    if (this.keyLight.light) {
      this.keyLight.light.color = preset.keyColor.clone();
      this.keyLight.light.intensity = preset.keyIntensity;
    }
    this.keyLight.setEulerAngles(...preset.keyEuler);

    if (this.fillLight.light) {
      this.fillLight.light.color = preset.fillColor.clone();
      this.fillLight.light.intensity = preset.fillIntensity;
    }

    if (this.rimLight.light) {
      this.rimLight.light.color = preset.rimColor.clone();
      this.rimLight.light.intensity = preset.rimIntensity;
    }

    this.cameraFrame.grading.tint = preset.gradingTint.clone();
    this.cameraFrame.grading.saturation = preset.gradingSat;
    this.cameraFrame.grading.contrast = preset.gradingContrast;
    this.syncPostProcessing();
  }

  applyParticleEffect(effect: ParticleEffectType) {
    this.currentParticleType = effect;
    const ps = this.particleEntity.particlesystem;
    if (!ps) return;

    if (effect === 'none') {
      this.particleEntity.enabled = false;
      return;
    }

    this.particleEntity.enabled = true;

    if (effect === 'rain') {
      ps.velocityGraph = new CurveSet([
        [0, -0.3, 1, -0.2],
        [0, -4.6, 1, -3.8],
        [0, 0, 1, 0],
      ]);
      ps.scaleGraph = new Curve([0, 0.018, 1, 0.018]);
      ps.colorGraph = new CurveSet([
        [0, 0.65],
        [0, 0.85],
        [0, 1.0],
      ]);
      ps.rate = 0.014;
      ps.lifetime = 1.4;
    } else if (effect === 'embers') {
      ps.velocityGraph = new CurveSet([
        [0, -0.18, 1, 0.18],
        [0, 0.35, 1, 0.85],
        [0, -0.1, 1, 0.1],
      ]);
      ps.scaleGraph = new Curve([0, 0.032, 0.5, 0.048, 1, 0.01]);
      ps.colorGraph = new CurveSet([
        [0, 1.0],
        [0, 0.58],
        [0, 0.18],
      ]);
      ps.rate = 0.035;
      ps.lifetime = 3.2;
    } else {
      // dust
      ps.velocityGraph = new CurveSet([
        [0, -0.07, 1, 0.07],
        [0, -0.04, 1, 0.06],
        [0, -0.04, 1, 0.04],
      ]);
      ps.scaleGraph = new Curve([0, 0.025, 0.5, 0.04, 1, 0.015]);
      ps.colorGraph = new CurveSet([
        [0, 1.0],
        [0, 0.9],
        [0, 0.7],
      ]);
      ps.rate = 0.045;
      ps.lifetime = 4.6;
    }
    ps.reset();
    ps.play();
  }

  setOrbitMode(enabled: boolean) {
    if (this.cameraScript) {
      this.cameraScript.orbitMode = enabled;
    }
  }

  setRuntimeOverrides(next: PlayCanvasRuntimeOverrides) {
    this.overrides = { ...this.overrides, ...next };
    if (typeof this.overrides.timeScale === 'number') {
      this.app.timeScale = this.overrides.timeScale;
    }
    if (this.currentCameraConfig) {
      this.applyCameraShot(this.currentCameraConfig);
    } else {
      this.syncPostProcessing();
    }
  }

  private syncPostProcessing() {
    const preset = MOOD_PRESETS[this.currentMood] ?? MOOD_PRESETS.golden_hour;
    const bloomVal = this.overrides.bloomIntensity ?? preset.bloomIntensity;
    const vigVal = this.overrides.vignetteIntensity ?? preset.vignetteIntensity;

    this.cameraFrame.bloom.intensity = math.clamp(bloomVal, 0, 0.1);
    this.cameraFrame.vignette.intensity = math.clamp(vigVal, 0, 1);

    const dofActive =
      this.overrides.dofEnabled ?? this.currentCameraConfig?.dofEnabled ?? false;
    this.cameraFrame.dof.enabled = dofActive;
    if (dofActive) {
      this.cameraFrame.dof.focusDistance =
        this.overrides.dofFocusDistance ??
        this.currentCameraConfig?.dofFocusDistance ??
        3.2;
      this.cameraFrame.dof.focusRange = 1.6;
      this.cameraFrame.dof.blurRadius =
        this.currentCameraConfig?.dofBlurRadius ?? 3.8;
    }

    this.cameraFrame.update();
  }

  invalidateCharacterTextures(characterId?: string) {
    if (characterId) {
      const tex = this.characterTextures.get(characterId);
      tex?.destroy();
      this.characterTextures.delete(characterId);
      const ent = this.activeNpcEntities.get(characterId);
      ent?.destroy();
      this.activeNpcEntities.delete(characterId);
    }
  }

  getRuntimeStats() {
    return {
      activeEntities: Array.from(this.activeNpcEntities.values()).filter((e) => e.enabled).length,
      mood: this.currentMood,
      particleEffect: this.currentParticleType,
      fov: this.cameraEntity.camera?.fov ?? 44,
      pixelRatio: this.app.graphicsDevice.maxPixelRatio,
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);

    for (const tex of this.characterTextures.values()) {
      tex.destroy();
    }
    this.characterTextures.clear();

    this.eyesSprite?.destroy();
    this.mouthSprite?.destroy();
    this.expressionAtlas?.destroy();
    this.atlasTexture?.destroy();
    this.portraitPlaneMesh?.destroy();

    this.cameraFrame.destroy();
    this.app.destroy();
  }
}
