import React, { useEffect, useRef, useState } from 'react';
import {
  PlayCanvasRuntimeOverrides,
  PlayCanvasStoryStage,
} from '../playcanvas/PlayCanvasStoryStage';
import {
  CharacterAsset,
  ExpressionAtlasBundle,
  StoryNode,
} from '../types/story';

interface PlayCanvasViewportProps {
  node: StoryNode | undefined;
  characters: CharacterAsset[];
  expressionAtlas: ExpressionAtlasBundle;
  isSpeaking: boolean;
  orbitMode?: boolean;
  overrides?: PlayCanvasRuntimeOverrides;
  className?: string;
}

export const PlayCanvasViewport: React.FC<PlayCanvasViewportProps> = ({
  node,
  characters,
  expressionAtlas,
  isSpeaking,
  orbitMode = false,
  overrides,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<PlayCanvasStoryStage | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [atlasReady, setAtlasReady] = useState(false);

  // Initialize PlayCanvas Application once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let stage: PlayCanvasStoryStage | null = null;
    try {
      stage = new PlayCanvasStoryStage(canvas);
      stageRef.current = stage;
      setInitError(null);
    } catch (err) {
      setInitError(
        err instanceof Error ? err.message : 'Unable to initialize PlayCanvas WebGL context.'
      );
    }

    return () => {
      stage?.destroy();
      stageRef.current = null;
      setAtlasReady(false);
    };
  }, []);

  // Load or reload expression TextureAtlas whenever atlas changes
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !expressionAtlas.imageDataUrl) return;
    let cancelled = false;
    stage.loadExpressionAtlas(expressionAtlas).then(() => {
      if (!cancelled) setAtlasReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [expressionAtlas]);

  // Sync stage cast, camera, mood, particles whenever active node or characters update
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !atlasReady || !node) return;

    stage.applyAtmosphereMood(node.mood);
    stage.applyParticleEffect(node.particleEffect);
    stage.applyCameraShot(node.camera);
    stage.syncStageCast(node.stageCast, characters, node.speakerId, isSpeaking);
  }, [atlasReady, node, characters, isSpeaking]);

  // Fast lip-sync state update without rebuilding scene cast
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !node) return;
    stage.updateSpeakingState(node.speakerId, isSpeaking);
  }, [isSpeaking, node?.speakerId]);

  // Orbit mode toggle
  useEffect(() => {
    stageRef.current?.setOrbitMode(orbitMode);
  }, [orbitMode]);

  // Live CameraFrame & runtime overrides
  useEffect(() => {
    if (overrides) {
      stageRef.current?.setRuntimeOverrides(overrides);
    }
  }, [overrides]);

  if (initError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#090B10] text-slate-300 p-6 ${className}`}
      >
        <p className="text-sm font-medium text-amber-400">PlayCanvas Runtime Unavailable</p>
        <p className="mt-1 text-xs text-slate-400 max-w-md text-center">{initError}</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#090B10] ${className}`}>
      <canvas
        ref={canvasRef}
        className={`block w-full h-full ${orbitMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
      />
    </div>
  );
};
