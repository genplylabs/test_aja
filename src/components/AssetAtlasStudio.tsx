import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Eye,
  FolderInput,
  MessageSquare,
  RotateCcw,
  Upload,
} from 'lucide-react';
import {
  CharacterAsset,
  EmotionType,
  ExpressionAtlasBundle,
  EyeFrameKey,
  MouthFrameKey,
  StoryProject,
} from '../types/story';
import { processUploadedPortraitFile } from '../utils/portraitSlicer';

interface AssetAtlasStudioProps {
  project: StoryProject;
  selectedCharacterId: string;
  onSelectCharacter: (id: string) => void;
  onUpdateCharacter: (char: CharacterAsset) => void;
  onAddCharacter: (char: CharacterAsset) => void;
  onUpdateProjectMeta: (patch: Partial<Pick<StoryProject, 'storyName' | 'title' | 'subtitle'>>) => void;
  onRegenerateAtlas: (irisColor: string) => void;
  onImportZip: (file: File) => void;
}

const IRIS_SWATCHES = [
  { label: 'Espresso', color: '#4A2E20' },
  { label: 'Amber', color: '#B45309' },
  { label: 'Ocean', color: '#0369A1' },
  { label: 'Emerald', color: '#047857' },
  { label: 'Slate', color: '#334155' },
];

const EMOTIONS: { id: EmotionType; label: string }[] = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'happy', label: 'Happy' },
  { id: 'sad', label: 'Sad' },
  { id: 'angry', label: 'Angry' },
  { id: 'surprised', label: 'Surprised' },
];

export const AssetAtlasStudio: React.FC<AssetAtlasStudioProps> = ({
  project,
  selectedCharacterId,
  onSelectCharacter,
  onUpdateCharacter,
  onAddCharacter,
  onUpdateProjectMeta,
  onRegenerateAtlas,
  onImportZip,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewEmotion, setPreviewEmotion] = useState<EmotionType>('neutral');
  const [simulateBlink, setSimulateBlink] = useState(false);
  const [simulateTalk, setSimulateTalk] = useState(false);
  const [talkPhase, setTalkPhase] = useState(0);
  const [activeIris, setActiveIris] = useState('#4A2E20');
  const [dragTarget, setDragTarget] = useState<'eyes' | 'mouth' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const rigBoxRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const zipInputRef = useRef<HTMLInputElement | null>(null);

  const selectedChar =
    project.characters.find((c) => c.id === selectedCharacterId) ?? project.characters[0];

  // Auto-cycle lip-sync frames when Simulate Lip-Sync is toggled on
  useEffect(() => {
    if (!simulateTalk) return;
    const timer = window.setInterval(() => {
      setTalkPhase((p) => (p + 1) % 4);
    }, 115);
    return () => window.clearInterval(timer);
  }, [simulateTalk]);

  // Auto-release single blink simulation
  useEffect(() => {
    if (!simulateBlink) return;
    const timer = window.setTimeout(() => setSimulateBlink(false), 180);
    return () => window.clearTimeout(timer);
  }, [simulateBlink]);

  const filteredChars = project.characters.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q);
  });

  const handleUploadPortrait = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const char = await processUploadedPortraitFile(file);
      onAddCharacter(char);
      onSelectCharacter(char.id);
    } catch {
      setUploadError('Could not read the uploaded image. Please choose a valid PNG or WebP portrait.');
    } finally {
      e.target.value = '';
    }
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onImportZip(file);
    e.target.value = '';
  };

  const updateAnchorFromPointer = (clientX: number, clientY: number, target: 'eyes' | 'mouth') => {
    const box = rigBoxRef.current;
    if (!box || !selectedChar) return;
    const rect = box.getBoundingClientRect();
    const nx = Math.max(0.15, Math.min(0.85, (clientX - rect.left) / rect.width));
    const ny = Math.max(0.1, Math.min(0.9, (clientY - rect.top) / rect.height));
    const roundedX = Number(nx.toFixed(3));
    const roundedY = Number(ny.toFixed(3));

    if (target === 'eyes') {
      onUpdateCharacter({
        ...selectedChar,
        eyeAnchor: { ...selectedChar.eyeAnchor, x: roundedX, y: roundedY },
      });
    } else {
      onUpdateCharacter({
        ...selectedChar,
        mouthAnchor: { ...selectedChar.mouthAnchor, x: roundedX, y: roundedY },
      });
    }
  };

  const getEyeKey = (): EyeFrameKey => {
    if (simulateBlink) return 'eyes_blink';
    switch (previewEmotion) {
      case 'happy':
        return 'eyes_happy';
      case 'sad':
        return 'eyes_sad';
      case 'angry':
        return 'eyes_angry';
      case 'surprised':
        return 'eyes_surprised';
      default:
        return 'eyes_neutral';
    }
  };

  const getMouthKey = (): MouthFrameKey => {
    if (simulateTalk) {
      const seq: MouthFrameKey[] = ['mouth_talk_1', 'mouth_talk_2', 'mouth_talk_3', 'mouth_closed'];
      return seq[talkPhase];
    }
    switch (previewEmotion) {
      case 'happy':
        return 'mouth_smile';
      case 'sad':
      case 'angry':
        return 'mouth_frown';
      case 'surprised':
        return 'mouth_open_shock';
      default:
        return 'mouth_closed';
    }
  };

  const downloadAtlasPng = () => {
    const a = document.createElement('a');
    a.href = project.expressionAtlas.imageDataUrl;
    a.download = 'expressions_atlas.png';
    a.click();
  };

  const downloadAtlasJson = () => {
    const payload = {
      meta: {
        format: 'PlayCanvas.TextureAtlas',
        width: project.expressionAtlas.width,
        height: project.expressionAtlas.height,
        flipY: false,
      },
      frames: Object.fromEntries(
        Object.entries(project.expressionAtlas.frames).map(([k, f]) => [
          k,
          { rect: f.pcRect, pivot: f.pivot, border: [0, 0, 0, 0] },
        ])
      ),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expressions_atlas.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden">
      {/* Left Sidebar: Story Metadata & Faceless Character Roster */}
      <aside className="w-[290px] shrink-0 flex flex-col border-r border-white/[0.08] bg-[#12161F]">
        <div className="p-4 border-b border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Story Bundle
            </h2>
            <button
              type="button"
              onClick={() => zipInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <FolderInput className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Import ZIP</span>
            </button>
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip"
              onChange={handleZipChange}
              className="hidden"
            />
          </div>

          <div className="space-y-2">
            <label className="block">
              <span className="block text-[11px] text-slate-400 mb-1">
                Story Archive Slug (story_x.zip)
              </span>
              <input
                type="text"
                value={project.storyName}
                onChange={(e) => onUpdateProjectMeta({ storyName: e.target.value })}
                placeholder="senja_stasiun_jakarta"
                className="w-full px-2.5 py-1.5 rounded bg-[#0B0D12] border border-white/[0.1] text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] text-slate-400 mb-1">Story Title</span>
              <input
                type="text"
                value={project.title}
                onChange={(e) => onUpdateProjectMeta({ title: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-[#0B0D12] border border-white/[0.1] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </label>
          </div>
        </div>

        <div className="p-4 border-b border-white/[0.08] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-100">
              NPC Portraits ({project.characters.length})
            </h2>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-xs font-medium text-cyan-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Upload PNG</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/webp,image/jpeg"
              onChange={handleUploadPortrait}
              className="hidden"
            />
          </div>

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter characters..."
            className="w-full px-2.5 py-1.5 rounded bg-[#0B0D12] border border-white/[0.08] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
          {uploadError && <p className="text-[11px] text-rose-400">{uploadError}</p>}
        </div>

        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
          {filteredChars.map((char) => {
            const active = char.id === selectedChar?.id;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => onSelectCharacter(char.id)}
                className={`group flex flex-col items-center p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-amber-500/10 border-amber-400/70'
                    : 'bg-[#0B0D12]/60 border-white/[0.07] hover:border-white/[0.18]'
                }`}
              >
                <div className="w-full aspect-square rounded bg-[#181D29] overflow-hidden flex items-end justify-center mb-1.5">
                  <img
                    src={char.portraitDataUrl}
                    alt={char.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="w-full truncate text-xs font-medium text-slate-100">
                  {char.name}
                </span>
                <span className="w-full truncate text-[10px] text-slate-400">
                  {char.role}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Center Stage: Interactive Facial Anchor Rigging Canvas */}
      <section className="flex-1 min-w-0 flex flex-col bg-[#0B0D12]">
        <div className="px-6 py-3.5 border-b border-white/[0.08] flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-sm font-semibold text-slate-100">
              Facial Rig &amp; Expression Alignment
            </h1>
            <p className="text-xs text-slate-400">
              Drag the cyan (Eyes) or amber (Mouth) crosshair directly on the faceless portrait to calibrate PlayCanvas sprite offsets.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSimulateBlink(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181D29] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
              <span>Test Blink</span>
            </button>
            <button
              type="button"
              onClick={() => setSimulateTalk((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                simulateTalk
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-[#181D29] hover:bg-white/[0.1] border-white/[0.08] text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{simulateTalk ? 'Stop Lip-Sync' : 'Test Lip-Sync'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Portrait Rig Preview */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 overflow-auto">
          {selectedChar ? (
            <div
              ref={rigBoxRef}
              onPointerMove={(e) => {
                if (dragTarget) {
                  updateAnchorFromPointer(e.clientX, e.clientY, dragTarget);
                }
              }}
              onPointerUp={() => setDragTarget(null)}
              onPointerLeave={() => setDragTarget(null)}
              className="relative w-[380px] h-[380px] max-w-full aspect-square rounded-xl border border-white/[0.12] overflow-hidden select-none shadow-2xl"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #131722 25%, transparent 25%), linear-gradient(-45deg, #131722 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #131722 75%), linear-gradient(-45deg, transparent 75%, #131722 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                backgroundColor: '#0E121B',
              }}
            >
              {/* Faceless base portrait */}
              <img
                src={selectedChar.portraitDataUrl}
                alt={selectedChar.name}
                draggable={false}
                className="w-full h-full object-contain pointer-events-none"
              />

              {/* Composited Eye Sprite from Generated Atlas */}
              <AtlasSpriteOverlay
                atlas={project.expressionAtlas}
                frameKey={getEyeKey()}
                anchorX={selectedChar.eyeAnchor.x}
                anchorY={selectedChar.eyeAnchor.y}
                scale={selectedChar.eyeAnchor.scale}
                containerSize={380}
              />

              {/* Composited Mouth Sprite from Generated Atlas */}
              <AtlasSpriteOverlay
                atlas={project.expressionAtlas}
                frameKey={getMouthKey()}
                anchorX={selectedChar.mouthAnchor.x}
                anchorY={selectedChar.mouthAnchor.y}
                scale={selectedChar.mouthAnchor.scale}
                containerSize={380}
              />

              {/* Draggable Eye Handle */}
              <button
                type="button"
                aria-label="Drag eye anchor"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDragTarget('eyes');
                }}
                style={{
                  left: `${selectedChar.eyeAnchor.x * 100}%`,
                  top: `${selectedChar.eyeAnchor.y * 100}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border border-cyan-400/80 bg-cyan-500/15 hover:bg-cyan-500/30 cursor-grab active:cursor-grabbing flex items-center justify-center"
                title="Drag to align Eyes"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
              </button>

              {/* Draggable Mouth Handle */}
              <button
                type="button"
                aria-label="Drag mouth anchor"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDragTarget('mouth');
                }}
                style={{
                  left: `${selectedChar.mouthAnchor.x * 100}%`,
                  top: `${selectedChar.mouthAnchor.y * 100}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-amber-400/80 bg-amber-500/15 hover:bg-amber-500/30 cursor-grab active:cursor-grabbing flex items-center justify-center"
                title="Drag to align Mouth"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Select or upload a faceless portrait to begin rigging.</p>
          )}

          {/* Emotion State Selector */}
          <div className="mt-5 flex items-center gap-1.5 p-1 rounded-lg bg-[#12161F] border border-white/[0.08]">
            {EMOTIONS.map((em) => (
              <button
                key={em.id}
                type="button"
                onClick={() => setPreviewEmotion(em.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  previewEmotion === em.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {em.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Right Inspector: Coordinates & Procedural Expression Atlas */}
      <aside className="w-[340px] shrink-0 flex flex-col border-l border-white/[0.08] bg-[#12161F] overflow-y-auto">
        {selectedChar && (
          <div className="p-4 border-b border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Character Rig Parameters
              </h2>
              <button
                type="button"
                onClick={() =>
                  onUpdateCharacter({
                    ...selectedChar,
                    eyeAnchor: { x: 0.5, y: 0.36, scale: 1.0 },
                    mouthAnchor: { x: 0.5, y: 0.47, scale: 1.0 },
                  })
                }
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>Reset Anchors</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="block text-[11px] text-slate-400 mb-1">Display Name</span>
                <input
                  type="text"
                  value={selectedChar.name}
                  onChange={(e) =>
                    onUpdateCharacter({ ...selectedChar, name: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-[#0B0D12] border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] text-slate-400 mb-1">Narrative Role</span>
                <input
                  type="text"
                  value={selectedChar.role}
                  onChange={(e) =>
                    onUpdateCharacter({ ...selectedChar, role: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-[#0B0D12] border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </label>
            </div>

            {/* Eye Anchor Sliders */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-cyan-300">Eye Sprite Anchor</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {selectedChar.eyeAnchor.x.toFixed(2)}, {selectedChar.eyeAnchor.y.toFixed(2)} ·{' '}
                  {selectedChar.eyeAnchor.scale.toFixed(2)}x
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="block text-[10px] text-slate-400">X Offset</span>
                  <input
                    type="range"
                    min={0.2}
                    max={0.8}
                    step={0.005}
                    value={selectedChar.eyeAnchor.x}
                    onChange={(e) =>
                      onUpdateCharacter({
                        ...selectedChar,
                        eyeAnchor: { ...selectedChar.eyeAnchor, x: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] text-slate-400">Y Offset</span>
                  <input
                    type="range"
                    min={0.15}
                    max={0.7}
                    step={0.005}
                    value={selectedChar.eyeAnchor.y}
                    onChange={(e) =>
                      onUpdateCharacter({
                        ...selectedChar,
                        eyeAnchor: { ...selectedChar.eyeAnchor, y: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] text-slate-400">Scale</span>
                  <input
                    type="range"
                    min={0.5}
                    max={1.6}
                    step={0.02}
                    value={selectedChar.eyeAnchor.scale}
                    onChange={(e) =>
                      onUpdateCharacter({
                        ...selectedChar,
                        eyeAnchor: { ...selectedChar.eyeAnchor, scale: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                </label>
              </div>
            </div>

            {/* Mouth Anchor Sliders */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-amber-300">Mouth Sprite Anchor</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {selectedChar.mouthAnchor.x.toFixed(2)}, {selectedChar.mouthAnchor.y.toFixed(2)} ·{' '}
                  {selectedChar.mouthAnchor.scale.toFixed(2)}x
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="block text-[10px] text-slate-400">X Offset</span>
                  <input
                    type="range"
                    min={0.2}
                    max={0.8}
                    step={0.005}
                    value={selectedChar.mouthAnchor.x}
                    onChange={(e) =>
                      onUpdateCharacter({
                        ...selectedChar,
                        mouthAnchor: { ...selectedChar.mouthAnchor, x: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] text-slate-400">Y Offset</span>
                  <input
                    type="range"
                    min={0.2}
                    max={0.8}
                    step={0.005}
                    value={selectedChar.mouthAnchor.y}
                    onChange={(e) =>
                      onUpdateCharacter({
                        ...selectedChar,
                        mouthAnchor: { ...selectedChar.mouthAnchor, y: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] text-slate-400">Scale</span>
                  <input
                    type="range"
                    min={0.5}
                    max={1.6}
                    step={0.02}
                    value={selectedChar.mouthAnchor.scale}
                    onChange={(e) =>
                      onUpdateCharacter({
                        ...selectedChar,
                        mouthAnchor: { ...selectedChar.mouthAnchor, scale: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Procedural Expression Atlas Generator Inspector */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Generated Expression Atlas
            </h2>
            <span className="font-mono text-[11px] text-slate-400">
              {project.expressionAtlas.width}×{project.expressionAtlas.height}
            </span>
          </div>

          <div>
            <span className="block text-[11px] text-slate-400 mb-1.5">
              Atlas Eye Iris Palette
            </span>
            <div className="flex items-center gap-2">
              {IRIS_SWATCHES.map((sw) => (
                <button
                  key={sw.color}
                  type="button"
                  onClick={() => {
                    setActiveIris(sw.color);
                    onRegenerateAtlas(sw.color);
                  }}
                  title={sw.label}
                  className={`w-7 h-7 rounded-md border transition-transform cursor-pointer ${
                    activeIris === sw.color
                      ? 'border-amber-400 scale-110'
                      : 'border-white/20 hover:scale-105'
                  }`}
                  style={{ backgroundColor: sw.color }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-[#0B0D12] p-2">
            <img
              src={project.expressionAtlas.imageDataUrl}
              alt="Generated PlayCanvas Expression Sprite Atlas"
              className="w-full h-auto rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={downloadAtlasPng}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Atlas PNG</span>
            </button>
            <button
              type="button"
              onClick={downloadAtlasJson}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Atlas JSON</span>
            </button>
          </div>

          <div className="pt-2 border-t border-white/[0.06]">
            <p className="text-[11px] text-slate-400 mb-2">
              PlayCanvas TextureAtlas Frames ({Object.keys(project.expressionAtlas.frames).length})
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {Object.values(project.expressionAtlas.frames).map((frame) => (
                <div
                  key={frame.key}
                  className="flex items-center justify-between text-[11px] py-1 border-b border-white/[0.04]"
                >
                  <span className="font-mono text-slate-200">{frame.key}</span>
                  <span className="font-mono text-slate-400">
                    [{frame.pcRect.join(', ')}]
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

interface AtlasSpriteOverlayProps {
  atlas: ExpressionAtlasBundle;
  frameKey: EyeFrameKey | MouthFrameKey;
  anchorX: number;
  anchorY: number;
  scale: number;
  containerSize: number;
}

const AtlasSpriteOverlay: React.FC<AtlasSpriteOverlayProps> = ({
  atlas,
  frameKey,
  anchorX,
  anchorY,
  scale,
  containerSize,
}) => {
  const frame = atlas.frames[frameKey];
  if (!frame) return null;

  // Match PlayCanvas proportions (pixelsPerUnit=305 over 2.4m height => frame width = 136/305/2.4 ≈ 18.6% of portrait height)
  const displayWidth = (frame.width / 305 / 2.4) * containerSize * scale;
  const displayHeight = (frame.height / 305 / 2.4) * containerSize * scale;

  const scaleX = displayWidth / frame.width;
  const scaleY = displayHeight / frame.height;

  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{
        left: `${anchorX * 100}%`,
        top: `${anchorY * 100}%`,
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
        transform: 'translate(-50%, -50%)',
        backgroundImage: `url(${atlas.imageDataUrl})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${atlas.width * scaleX}px ${atlas.height * scaleY}px`,
        backgroundPosition: `-${frame.canvasX * scaleX}px -${frame.canvasY * scaleY}px`,
      }}
    />
  );
};
