import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Compass,
  Film,
  FolderInput,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { PlayCanvasRuntimeOverrides } from '../playcanvas/PlayCanvasStoryStage';
import { StoryChoice, StoryNode, StoryProject } from '../types/story';
import { PlayCanvasViewport } from './PlayCanvasViewport';

interface PlaybackEngineViewProps {
  project: StoryProject;
  initialNodeId?: string;
  onImportZip: (file: File) => void;
}

interface LogEntry {
  nodeId: string;
  speaker: string;
  text: string;
}

export const PlaybackEngineView: React.FC<PlaybackEngineViewProps> = ({
  project,
  initialNodeId,
  onImportZip,
}) => {
  const [currentNodeId, setCurrentNodeId] = useState<string>(
    initialNodeId || project.startNodeId
  );
  const [variables, setVariables] = useState<Record<string, number>>({
    ...project.initialVariables,
  });
  const [revealedCount, setRevealedCount] = useState(0);
  const [historyLog, setHistoryLog] = useState<LogEntry[]>([]);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [letterbox, setLetterbox] = useState(true);
  const [orbitMode, setOrbitMode] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showFxPanel, setShowFxPanel] = useState(false);

  const [overrides, setOverrides] = useState<PlayCanvasRuntimeOverrides>({
    bloomIntensity: undefined,
    vignetteIntensity: undefined,
    dofEnabled: undefined,
    fovOffset: 0,
    timeScale: 1,
  });

  const zipInputRef = useRef<HTMLInputElement | null>(null);

  const currentNode: StoryNode | undefined =
    project.nodes.find((n) => n.id === currentNodeId) ?? project.nodes[0];

  const speaker = project.characters.find((c) => c.id === currentNode?.speakerId);

  // Reset runtime when project or initialNodeId changes
  useEffect(() => {
    setCurrentNodeId(initialNodeId || project.startNodeId);
    setVariables({ ...project.initialVariables });
    setHistoryLog([]);
    setRevealedCount(0);
  }, [project.storyName, project.startNodeId, initialNodeId]);

  // Typewriter text progression driving PlayCanvas NpcRigScript lip-sync
  useEffect(() => {
    if (!currentNode) return;
    setRevealedCount(0);
    const fullLen = currentNode.text.length;
    if (fullLen === 0) return;

    const intervalMs = Math.max(12, Math.round(1000 / (currentNode.typingSpeed || 40)));
    const timer = window.setInterval(() => {
      setRevealedCount((prev) => {
        if (prev >= fullLen) {
          window.clearInterval(timer);
          return fullLen;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [currentNode?.id, currentNode?.text, currentNode?.typingSpeed]);

  const isTyping = currentNode ? revealedCount < currentNode.text.length : false;
  const isFinished =
    currentNode &&
    currentNode.type !== 'choice' &&
    !currentNode.nextNodeId &&
    !isTyping;

  // Auto-advance mode
  useEffect(() => {
    if (!autoAdvance || !currentNode || isTyping || currentNode.type === 'choice') return;
    if (!currentNode.nextNodeId) return;

    const timer = window.setTimeout(() => {
      advanceToNode(currentNode.nextNodeId!);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [autoAdvance, currentNode?.id, isTyping]);

  const appendHistory = (node: StoryNode) => {
    const sp = project.characters.find((c) => c.id === node.speakerId)?.name ?? 'Narrator';
    setHistoryLog((prev) => {
      if (prev[prev.length - 1]?.nodeId === node.id) return prev;
      return [...prev, { nodeId: node.id, speaker: sp, text: node.text }];
    });
  };

  const advanceToNode = (nextId: string) => {
    if (currentNode) appendHistory(currentNode);
    setCurrentNodeId(nextId);
  };

  const handlePrimaryDialogueClick = () => {
    if (!currentNode) return;
    if (isTyping) {
      setRevealedCount(currentNode.text.length);
      return;
    }
    if (currentNode.type !== 'choice' && currentNode.nextNodeId) {
      advanceToNode(currentNode.nextNodeId);
    }
  };

  const handleSelectChoice = (choice: StoryChoice) => {
    if (choice.setVar && typeof choice.setDelta === 'number') {
      setVariables((prev) => ({
        ...prev,
        [choice.setVar!]: (prev[choice.setVar!] ?? 0) + choice.setDelta!,
      }));
    }
    advanceToNode(choice.targetNodeId);
  };

  const handleRestart = () => {
    setCurrentNodeId(project.startNodeId);
    setVariables({ ...project.initialVariables });
    setHistoryLog([]);
    setRevealedCount(0);
  };

  const visibleChoices =
    currentNode?.type === 'choice'
      ? currentNode.choices.filter((ch) => {
          if (!ch.conditionVar || typeof ch.conditionMin !== 'number') return true;
          return (variables[ch.conditionVar] ?? 0) >= ch.conditionMin;
        })
      : [];

  return (
    <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-[#07090D]">
      {/* 100% PlayCanvas Full-Viewport Stage */}
      <PlayCanvasViewport
        node={currentNode}
        characters={project.characters}
        expressionAtlas={project.expressionAtlas}
        isSpeaking={isTyping && Boolean(currentNode?.speakerId)}
        orbitMode={orbitMode}
        overrides={overrides}
        className="absolute inset-0"
      />

      {/* Cinematic 2.39:1 Letterbox Bars */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 left-0 right-0 bg-black transition-transform duration-300 z-10 ${
          letterbox ? 'h-9 translate-y-0' : 'h-9 -translate-y-full'
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-0 left-0 right-0 bg-black transition-transform duration-300 z-10 ${
          letterbox ? 'h-9 translate-y-0' : 'h-9 translate-y-full'
        }`}
      />

      {/* Top HUD Controls */}
      <div className="absolute top-3 left-5 right-5 z-20 flex items-center justify-between gap-4 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 px-3 py-1.5 rounded-lg bg-black/55 backdrop-blur-md border border-white/10">
          <span className="font-display text-xs font-semibold text-slate-100">
            {project.title}
          </span>
          <span className="text-white/20" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-[11px] text-amber-300">
            {currentNode?.title ?? 'End'}
          </span>
          {Object.entries(variables).map(([k, v]) => (
            <span key={k} className="font-mono text-[11px] text-slate-300">
              {k}: {v}
            </span>
          ))}
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => zipInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-xs font-medium text-slate-200 cursor-pointer whitespace-nowrap"
          >
            <FolderInput className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>Load Story ZIP</span>
          </button>
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportZip(f);
              e.target.value = '';
            }}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setOrbitMode((o) => !o)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md backdrop-blur-md border text-xs font-medium cursor-pointer whitespace-nowrap ${
              orbitMode
                ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-200'
                : 'bg-black/60 hover:bg-black/80 border-white/10 text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{orbitMode ? 'Orbit: Free' : 'Orbit: Locked'}</span>
          </button>

          <button
            type="button"
            onClick={() => setLetterbox((l) => !l)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md backdrop-blur-md border text-xs font-medium cursor-pointer whitespace-nowrap ${
              letterbox
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                : 'bg-black/60 hover:bg-black/80 border-white/10 text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Cinema Bars</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTranscript((t) => !t)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-xs font-medium text-slate-200 cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Log</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFxPanel((p) => !p)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-xs font-medium text-slate-200 cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>CameraFrame FX</span>
          </button>

          <button
            type="button"
            onClick={handleRestart}
            title="Restart Story"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-xs font-medium text-slate-200 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* PlayCanvas CameraFrame Post-Processing Drawer */}
      {showFxPanel && (
        <div className="absolute top-16 right-5 z-30 w-72 rounded-xl bg-[#12161F]/95 backdrop-blur-md border border-white/15 p-4 space-y-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xs font-semibold text-slate-100">
              PlayCanvas CameraFrame
            </h3>
            <button
              type="button"
              onClick={() => setShowFxPanel(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <label className="block">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>FOV Offset</span>
              <span className="font-mono">{overrides.fovOffset ?? 0}°</span>
            </div>
            <input
              type="range"
              min={-12}
              max={18}
              step={1}
              value={overrides.fovOffset ?? 0}
              onChange={(e) =>
                setOverrides((o) => ({ ...o, fovOffset: Number(e.target.value) }))
              }
              className="w-full accent-amber-400"
            />
          </label>

          <label className="block">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Bloom Intensity (0–0.1)</span>
              <span className="font-mono">
                {(overrides.bloomIntensity ?? 0.04).toFixed(3)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={0.1}
              step={0.005}
              value={overrides.bloomIntensity ?? 0.04}
              onChange={(e) =>
                setOverrides((o) => ({ ...o, bloomIntensity: Number(e.target.value) }))
              }
              className="w-full accent-amber-400"
            />
          </label>

          <label className="block">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Vignette Intensity</span>
              <span className="font-mono">
                {(overrides.vignetteIntensity ?? 0.35).toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={0.85}
              step={0.05}
              value={overrides.vignetteIntensity ?? 0.35}
              onChange={(e) =>
                setOverrides((o) => ({
                  ...o,
                  vignetteIntensity: Number(e.target.value),
                }))
              }
              className="w-full accent-amber-400"
            />
          </label>

          <label className="block">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Engine Time Scale</span>
              <span className="font-mono">{(overrides.timeScale ?? 1).toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={2.0}
              step={0.1}
              value={overrides.timeScale ?? 1}
              onChange={(e) =>
                setOverrides((o) => ({ ...o, timeScale: Number(e.target.value) }))
              }
              className="w-full accent-cyan-400"
            />
          </label>
        </div>
      )}

      {/* Transcript History Drawer */}
      {showTranscript && (
        <div className="absolute top-16 left-5 z-30 w-80 max-h-[60vh] rounded-xl bg-[#12161F]/95 backdrop-blur-md border border-white/15 flex flex-col shadow-2xl">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-display text-xs font-semibold text-slate-100">
              Narrative Transcript
            </h3>
            <button
              type="button"
              onClick={() => setShowTranscript(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto space-y-3 text-xs">
            {historyLog.length === 0 ? (
              <p className="text-slate-400">No dialogue lines recorded yet.</p>
            ) : (
              historyLog.map((item, idx) => (
                <div key={`${item.nodeId}_${idx}`} className="space-y-0.5">
                  <span className="font-semibold text-amber-300">{item.speaker}</span>
                  <p className="text-slate-200 leading-relaxed">{item.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Branching Choices Overlay */}
      {currentNode && currentNode.type === 'choice' && !isTyping && (
        <div className="absolute bottom-44 left-1/2 -translate-x-1/2 z-20 w-[min(640px,92%)] flex flex-col gap-2">
          {visibleChoices.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => handleSelectChoice(ch)}
              className="group w-full px-5 py-3 rounded-lg bg-[#0B0D12]/85 hover:bg-amber-500 backdrop-blur-md border border-amber-400/50 hover:border-amber-300 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
            >
              <span className="text-sm font-medium text-slate-100 group-hover:text-slate-950">
                {ch.label}
              </span>
              <ChevronRight className="w-4 h-4 text-amber-400 group-hover:text-slate-950 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Bottom Dialogue Subtitle Box */}
      {currentNode && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 w-[min(780px,94%)]">
          <div
            role="button"
            tabIndex={0}
            onClick={handlePrimaryDialogueClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePrimaryDialogueClick();
              }
            }}
            className="rounded-xl bg-black/75 hover:bg-black/80 backdrop-blur-md border border-white/15 px-6 py-4 transition-colors cursor-pointer select-none shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-semibold"
                  style={{ color: speaker?.accentColor ?? '#FBBF24' }}
                >
                  {speaker ? speaker.name : 'Narrator'}
                </span>
                {speaker && (
                  <span className="text-xs text-slate-400">· {speaker.role}</span>
                )}
              </div>

              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setAutoAdvance((a) => !a)}
                  className={`text-[11px] font-medium cursor-pointer ${
                    autoAdvance ? 'text-amber-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {autoAdvance ? 'Auto: On' : 'Auto: Off'}
                </button>
                {isFinished && (
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-semibold cursor-pointer"
                  >
                    Replay Story
                  </button>
                )}
              </div>
            </div>

            <p className="text-[15px] text-slate-100 leading-relaxed min-h-[3rem]">
              {currentNode.text.slice(0, revealedCount)}
            </p>

            {!isTyping && currentNode.type !== 'choice' && currentNode.nextNodeId && (
              <div className="mt-1 flex justify-end">
                <span className="text-[11px] text-amber-300/90 inline-flex items-center gap-1">
                  <span>Continue</span>
                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
