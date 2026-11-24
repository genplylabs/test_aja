import React, { useEffect, useState } from 'react';
import { Camera, Compass, Pause, Play, Sparkles } from 'lucide-react';
import { CAMERA_PRESETS, makeCameraFromPreset } from '../data/defaultStory';
import {
  AtmosphereMood,
  CameraShotPreset,
  ParticleEffectType,
  StoryNode,
  StoryProject,
} from '../types/story';
import { PlayCanvasViewport } from './PlayCanvasViewport';

interface TimelineCameraEditorProps {
  project: StoryProject;
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  onUpdateNode: (node: StoryNode) => void;
}

const MOODS: { id: AtmosphereMood; label: string }[] = [
  { id: 'golden_hour', label: 'Golden Hour' },
  { id: 'neon_rain', label: 'Neon Rain' },
  { id: 'midnight_station', label: 'Midnight Station' },
  { id: 'morning_mist', label: 'Morning Mist' },
];

const PARTICLES: { id: ParticleEffectType; label: string }[] = [
  { id: 'none', label: 'Off' },
  { id: 'dust', label: 'Floating Dust' },
  { id: 'rain', label: 'Station Rain' },
  { id: 'embers', label: 'Warm Embers' },
];

export const TimelineCameraEditor: React.FC<TimelineCameraEditorProps> = ({
  project,
  selectedNodeId,
  onSelectNode,
  onUpdateNode,
}) => {
  const [orbitMode, setOrbitMode] = useState(false);
  const [previewSpeaking, setPreviewSpeaking] = useState(true);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);

  const selectedNode =
    project.nodes.find((n) => n.id === selectedNodeId) ?? project.nodes[0];

  // Sequence timeline preview stepper
  useEffect(() => {
    if (!isPlayingTimeline || !selectedNode) return;
    const ms = Math.max(1500, selectedNode.duration * 1000);
    const timer = window.setTimeout(() => {
      const idx = project.nodes.findIndex((n) => n.id === selectedNode.id);
      const nextId =
        selectedNode.nextNodeId ??
        selectedNode.choices[0]?.targetNodeId ??
        project.nodes[(idx + 1) % project.nodes.length]?.id;
      if (nextId) {
        onSelectNode(nextId);
      } else {
        setIsPlayingTimeline(false);
      }
    }, ms);
    return () => window.clearTimeout(timer);
  }, [isPlayingTimeline, selectedNode, project.nodes, onSelectNode]);

  // Compute cumulative timecodes across nodes for timeline ruler
  let runningSeconds = 0;
  const timelineBlocks = project.nodes.map((node) => {
    const startSec = runningSeconds;
    const dur = Math.max(2, node.duration || 4);
    runningSeconds += dur;
    return { node, startSec, duration: dur };
  });

  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const updateCameraAxis = (
    field: 'position' | 'target',
    axisIdx: 0 | 1 | 2,
    val: number
  ) => {
    if (!selectedNode) return;
    const nextArr = [...selectedNode.camera[field]] as [number, number, number];
    nextArr[axisIdx] = val;
    onUpdateNode({
      ...selectedNode,
      camera: {
        ...selectedNode.camera,
        preset: 'custom',
        [field]: nextArr,
      },
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#0B0D12]">
      {/* Top Row: Live PlayCanvas Stage Preview + Camera/Mood Inspector */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Live PlayCanvas Preview */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="px-4 py-2 border-b border-white/[0.08] bg-[#12161F] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Camera className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-100 truncate">
                PlayCanvas Stage Preview — {selectedNode?.title}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewSpeaking((s) => !s)}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                  previewSpeaking
                    ? 'bg-amber-500/15 border-amber-400/50 text-amber-300'
                    : 'bg-[#0B0D12] border-white/[0.08] text-slate-300'
                }`}
              >
                {previewSpeaking ? 'Lip-Sync: Active' : 'Lip-Sync: Idle'}
              </button>
              <button
                type="button"
                onClick={() => setOrbitMode((o) => !o)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                  orbitMode
                    ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                    : 'bg-[#0B0D12] border-white/[0.08] text-slate-300'
                }`}
              >
                <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{orbitMode ? 'Orbit Inspect: On' : 'Orbit Inspect: Off'}</span>
              </button>
            </div>
          </div>

          <div className="relative flex-1 min-h-0">
            <PlayCanvasViewport
              node={selectedNode}
              characters={project.characters}
              expressionAtlas={project.expressionAtlas}
              isSpeaking={previewSpeaking && Boolean(selectedNode?.speakerId)}
              orbitMode={orbitMode}
            />
            {selectedNode && (
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 w-[min(640px,90%)] px-4 py-2.5 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10">
                <p className="text-[11px] font-semibold text-amber-300 mb-0.5">
                  {project.characters.find((c) => c.id === selectedNode.speakerId)?.name ??
                    'Narrator'}
                </p>
                <p className="text-xs text-slate-100 leading-relaxed line-clamp-2">
                  {selectedNode.text}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Camera & Lighting Inspector */}
        <aside className="w-[340px] shrink-0 border-l border-white/[0.08] bg-[#12161F] overflow-y-auto p-4 space-y-4">
          {selectedNode && (
            <>
              <div className="pb-2 border-b border-white/[0.08]">
                <h2 className="font-display text-sm font-semibold text-slate-100">
                  Camera &amp; Lighting Rig
                </h2>
                <p className="text-[11px] text-slate-400">
                  Configure PlayCanvas CameraFrame, DOF, and stage atmosphere for this beat.
                </p>
              </div>

              <label className="block">
                <span className="block text-[11px] text-slate-400 mb-1">
                  Camera Shot Preset
                </span>
                <select
                  value={selectedNode.camera.preset}
                  onChange={(e) => {
                    const preset = e.target.value as CameraShotPreset;
                    onUpdateNode({
                      ...selectedNode,
                      camera: makeCameraFromPreset(preset),
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded bg-[#0B0D12] border border-white/[0.1] text-xs text-slate-100"
                >
                  {Object.entries(CAMERA_PRESETS).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Camera Position */}
              <div className="space-y-1.5">
                <span className="block text-[11px] text-slate-400">
                  Camera Position (X / Y / Z m)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                    <label key={axis} className="block">
                      <span className="block text-[10px] font-mono text-slate-500">
                        {axis}
                      </span>
                      <input
                        type="number"
                        step={0.1}
                        value={selectedNode.camera.position[idx as 0 | 1 | 2]}
                        onChange={(e) =>
                          updateCameraAxis(
                            'position',
                            idx as 0 | 1 | 2,
                            Number(e.target.value)
                          )
                        }
                        className="w-full px-2 py-1 rounded bg-[#0B0D12] border border-white/[0.08] text-xs font-mono text-slate-100"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Camera Target */}
              <div className="space-y-1.5">
                <span className="block text-[11px] text-slate-400">
                  Look-At Target (X / Y / Z m)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                    <label key={axis} className="block">
                      <span className="block text-[10px] font-mono text-slate-500">
                        {axis}
                      </span>
                      <input
                        type="number"
                        step={0.1}
                        value={selectedNode.camera.target[idx as 0 | 1 | 2]}
                        onChange={(e) =>
                          updateCameraAxis(
                            'target',
                            idx as 0 | 1 | 2,
                            Number(e.target.value)
                          )
                        }
                        className="w-full px-2 py-1 rounded bg-[#0B0D12] border border-white/[0.08] text-xs font-mono text-slate-100"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Lens & Motion */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>FOV</span>
                    <span className="font-mono">{selectedNode.camera.fov}°</span>
                  </div>
                  <input
                    type="range"
                    min={22}
                    max={70}
                    step={1}
                    value={selectedNode.camera.fov}
                    onChange={(e) =>
                      onUpdateNode({
                        ...selectedNode,
                        camera: {
                          ...selectedNode.camera,
                          fov: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </label>

                <label className="block">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Beat Duration</span>
                    <span className="font-mono">{selectedNode.duration}s</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={12}
                    step={0.5}
                    value={selectedNode.duration}
                    onChange={(e) =>
                      onUpdateNode({
                        ...selectedNode,
                        duration: Number(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Handheld Drift</span>
                    <span className="font-mono">
                      {selectedNode.camera.handheldDrift.toFixed(3)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.05}
                    step={0.002}
                    value={selectedNode.camera.handheldDrift}
                    onChange={(e) =>
                      onUpdateNode({
                        ...selectedNode,
                        camera: {
                          ...selectedNode.camera,
                          handheldDrift: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                </label>

                <label className="block">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Shake Trauma</span>
                    <span className="font-mono">
                      {selectedNode.camera.shakeIntensity.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.12}
                    step={0.01}
                    value={selectedNode.camera.shakeIntensity}
                    onChange={(e) =>
                      onUpdateNode({
                        ...selectedNode,
                        camera: {
                          ...selectedNode.camera,
                          shakeIntensity: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                </label>
              </div>

              {/* DOF */}
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer">
                  <span>Depth of Field (CameraFrame)</span>
                  <input
                    type="checkbox"
                    checked={selectedNode.camera.dofEnabled}
                    onChange={(e) =>
                      onUpdateNode({
                        ...selectedNode,
                        camera: {
                          ...selectedNode.camera,
                          dofEnabled: e.target.checked,
                        },
                      })
                    }
                    className="accent-amber-400"
                  />
                </label>
                {selectedNode.camera.dofEnabled && (
                  <label className="block">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Focus Distance</span>
                      <span className="font-mono">
                        {selectedNode.camera.dofFocusDistance.toFixed(2)}m
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1.4}
                      max={8.0}
                      step={0.1}
                      value={selectedNode.camera.dofFocusDistance}
                      onChange={(e) =>
                        onUpdateNode({
                          ...selectedNode,
                          camera: {
                            ...selectedNode.camera,
                            dofFocusDistance: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-amber-400"
                    />
                  </label>
                )}
              </div>

              {/* Lighting Mood & Particles */}
              <div className="pt-2 border-t border-white/[0.06] grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-[11px] text-slate-400 mb-1">
                    Lighting Mood
                  </span>
                  <select
                    value={selectedNode.mood}
                    onChange={(e) =>
                      onUpdateNode({
                        ...selectedNode,
                        mood: e.target.value as AtmosphereMood,
                      })
                    }
                    className="w-full px-2 py-1.5 rounded bg-[#0B0D12] border border-white/[0.1] text-xs text-slate-100"
                  >
                    {MOODS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[11px] text-slate-400 mb-1">
                    Particle FX
                  </span>
                  <select
                    value={selectedNode.particleEffect}
                    onChange={(e) =>
                      onUpdateNode({
                        ...selectedNode,
                        particleEffect: e.target.value as ParticleEffectType,
                      })
                    }
                    className="w-full px-2 py-1.5 rounded bg-[#0B0D12] border border-white/[0.1] text-xs text-slate-100"
                  >
                    {PARTICLES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Bottom Multi-Track Timeline Orchestrator */}
      <section className="h-[220px] shrink-0 border-t border-white/[0.08] bg-[#12161F] flex flex-col">
        <div className="px-4 py-2 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-display text-xs font-semibold text-slate-100">
              Timeline Orchestrator
            </h3>
            <span className="font-mono text-[11px] text-slate-400">
              Total Duration: {formatTimecode(runningSeconds)} · {project.nodes.length} Shots
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsPlayingTimeline((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            {isPlayingTimeline ? (
              <>
                <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Pause Sequence</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Preview Sequence</span>
              </>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden p-3">
          <div className="min-w-max flex flex-col gap-1.5">
            {/* Track 1: Narrative & Camera Shots */}
            <div className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-[11px] font-medium text-slate-400">
                Camera &amp; Beat
              </span>
              <div className="flex items-center gap-1.5">
                {timelineBlocks.map(({ node, startSec, duration }) => {
                  const active = node.id === selectedNode?.id;
                  const widthPx = Math.max(130, duration * 32);
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => onSelectNode(node.id)}
                      style={{ width: `${widthPx}px` }}
                      className={`px-2.5 py-2 rounded border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-amber-500/20 border-amber-400 text-slate-100'
                          : 'bg-[#0B0D12] border-white/[0.08] text-slate-300 hover:border-white/[0.2]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-[11px] font-semibold">
                          {node.title}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          {formatTimecode(startSec)}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-amber-300/90 truncate">
                        {node.camera.preset.replace(/_/g, ' ')} · {node.camera.fov}°
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Track 2: Facial Expression & Lip-Sync */}
            <div className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-[11px] font-medium text-slate-400">
                Facial Atlas Rig
              </span>
              <div className="flex items-center gap-1.5">
                {timelineBlocks.map(({ node, duration }) => {
                  const active = node.id === selectedNode?.id;
                  const widthPx = Math.max(130, duration * 32);
                  const speaker = project.characters.find((c) => c.id === node.speakerId);
                  return (
                    <button
                      key={`${node.id}_rig`}
                      type="button"
                      onClick={() => onSelectNode(node.id)}
                      style={{ width: `${widthPx}px` }}
                      className={`px-2.5 py-1.5 rounded border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-cyan-500/15 border-cyan-400/70 text-cyan-100'
                          : 'bg-[#0B0D12]/80 border-white/[0.06] text-slate-400 hover:border-white/[0.16]'
                      }`}
                    >
                      <div className="truncate text-[11px] font-medium">
                        {speaker ? `${speaker.name}: ${node.emotion}` : 'Ambient / Silent'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 truncate">
                        Cast: {node.stageCast.length} · {node.typingSpeed} cps
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Track 3: Atmosphere & Particle FX */}
            <div className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                <span>Atmosphere FX</span>
              </span>
              <div className="flex items-center gap-1.5">
                {timelineBlocks.map(({ node, duration }) => {
                  const active = node.id === selectedNode?.id;
                  const widthPx = Math.max(130, duration * 32);
                  return (
                    <button
                      key={`${node.id}_fx`}
                      type="button"
                      onClick={() => onSelectNode(node.id)}
                      style={{ width: `${widthPx}px` }}
                      className={`px-2.5 py-1 rounded border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-emerald-500/15 border-emerald-400/70 text-emerald-100'
                          : 'bg-[#0B0D12]/60 border-white/[0.05] text-slate-400'
                      }`}
                    >
                      <span className="block truncate font-mono text-[10px]">
                        {node.mood.replace(/_/g, ' ')} · fx:{node.particleEffect}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
