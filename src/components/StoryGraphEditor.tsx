import React, { useRef, useState } from 'react';
import {
  GitBranch,
  Link2,
  Play,
  Plus,
  Trash2,
  Video,
  MessageSquareText,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  EmotionType,
  StageSlot,
  StoryChoice,
  StoryNode,
  StoryNodeType,
  StoryProject,
} from '../types/story';
import { makeCameraFromPreset } from '../data/defaultStory';

interface StoryGraphEditorProps {
  project: StoryProject;
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  onUpdateNode: (node: StoryNode) => void;
  onAddNode: (node: StoryNode) => void;
  onDeleteNode: (id: string) => void;
  onSetStartNode: (id: string) => void;
  onTestFromNode: (id: string) => void;
}

const NODE_WIDTH = 248;

export const StoryGraphEditor: React.FC<StoryGraphEditorProps> = ({
  project,
  selectedNodeId,
  onSelectNode,
  onUpdateNode,
  onAddNode,
  onDeleteNode,
  onSetStartNode,
  onTestFromNode,
}) => {
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<{
    nodeId: string;
    choiceId?: string;
  } | null>(null);

  const lastMouseRef = useRef({ x: 0, y: 0 });
  const selectedNode =
    project.nodes.find((n) => n.id === selectedNodeId) ?? project.nodes[0];

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsPanning(true);
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      setConnectingFrom(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    if (isPanning) {
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    } else if (draggingNodeId) {
      const node = project.nodes.find((n) => n.id === draggingNodeId);
      if (node) {
        onUpdateNode({
          ...node,
          position: {
            x: Math.round(node.position.x + dx / zoom),
            y: Math.round(node.position.y + dy / zoom),
          },
        });
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const createNewNode = (type: StoryNodeType) => {
    const id = `node_${Date.now().toString(36)}`;
    const anchorX = selectedNode ? selectedNode.position.x + 310 : 200;
    const anchorY = selectedNode ? selectedNode.position.y + 40 : 180;
    const defaultChar = project.characters[0]?.id;

    const newNode: StoryNode = {
      id,
      type,
      title:
        type === 'choice'
          ? 'New Branch Choice'
          : type === 'cinematic'
          ? 'New Cinematic Shot'
          : 'New Dialogue Beat',
      position: { x: anchorX, y: anchorY },
      speakerId: type === 'cinematic' ? undefined : defaultChar,
      emotion: 'neutral',
      text:
        type === 'cinematic'
          ? 'Camera pans across the station platform as ambient light shifts.'
          : 'Enter character dialogue line here...',
      typingSpeed: 42,
      duration: 4.5,
      stageCast: selectedNode?.stageCast
        ? selectedNode.stageCast.map((c) => ({ ...c }))
        : defaultChar
        ? [{ characterId: defaultChar, slot: 'center', emotion: 'neutral' }]
        : [],
      camera: makeCameraFromPreset(
        type === 'cinematic' ? 'wide_establishing' : 'medium_two_shot'
      ),
      mood: selectedNode?.mood ?? 'golden_hour',
      particleEffect: selectedNode?.particleEffect ?? 'dust',
      nextNodeId: undefined,
      choices:
        type === 'choice'
          ? [
              {
                id: `ch_${Date.now().toString(36)}_a`,
                label: 'Option A',
                targetNodeId: project.startNodeId,
              },
              {
                id: `ch_${Date.now().toString(36)}_b`,
                label: 'Option B',
                targetNodeId: project.startNodeId,
              },
            ]
          : [],
    };

    onAddNode(newNode);
    onSelectNode(id);
  };

  const completeConnectionTo = (targetNodeId: string) => {
    if (!connectingFrom) return;
    if (connectingFrom.nodeId === targetNodeId) {
      setConnectingFrom(null);
      return;
    }

    const source = project.nodes.find((n) => n.id === connectingFrom.nodeId);
    if (!source) {
      setConnectingFrom(null);
      return;
    }

    if (connectingFrom.choiceId) {
      onUpdateNode({
        ...source,
        choices: source.choices.map((c) =>
          c.id === connectingFrom.choiceId ? { ...c, targetNodeId } : c
        ),
      });
    } else {
      onUpdateNode({
        ...source,
        nextNodeId: targetNodeId,
      });
    }

    setConnectingFrom(null);
  };

  const autoLayoutNodes = () => {
    // Simple BFS topological column layout from startNodeId
    const visited = new Set<string>();
    const columns = new Map<string, number>();
    const queue: { id: string; col: number }[] = [{ id: project.startNodeId, col: 0 }];

    while (queue.length > 0) {
      const { id, col } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      columns.set(id, col);

      const node = project.nodes.find((n) => n.id === id);
      if (!node) continue;
      if (node.nextNodeId) queue.push({ id: node.nextNodeId, col: col + 1 });
      node.choices.forEach((c) => {
        if (c.targetNodeId) queue.push({ id: c.targetNodeId, col: col + 1 });
      });
    }

    project.nodes.forEach((n) => {
      if (!columns.has(n.id)) columns.set(n.id, 0);
    });

    const rowCounter = new Map<number, number>();
    project.nodes.forEach((n) => {
      const col = columns.get(n.id) ?? 0;
      const row = rowCounter.get(col) ?? 0;
      rowCounter.set(col, row + 1);
      onUpdateNode({
        ...n,
        position: { x: 60 + col * 320, y: 80 + row * 210 },
      });
    });
    setPan({ x: 32, y: 32 });
  };

  // Build SVG Bezier connection paths
  const edges: {
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    label?: string;
  }[] = [];

  project.nodes.forEach((node) => {
    const startX = node.position.x + NODE_WIDTH;
    if (node.type !== 'choice' && node.nextNodeId) {
      const target = project.nodes.find((t) => t.id === node.nextNodeId);
      if (target) {
        edges.push({
          key: `${node.id}->${target.id}`,
          x1: startX,
          y1: node.position.y + 58,
          x2: target.position.x,
          y2: target.position.y + 58,
          color: '#F59E0B',
        });
      }
    }
    if (node.type === 'choice') {
      node.choices.forEach((ch, idx) => {
        const target = project.nodes.find((t) => t.id === ch.targetNodeId);
        if (target) {
          edges.push({
            key: `${node.id}:${ch.id}->${target.id}`,
            x1: startX,
            y1: node.position.y + 84 + idx * 24,
            x2: target.position.x,
            y2: target.position.y + 58,
            color: idx % 2 === 0 ? '#06B6D4' : '#34D399',
            label: ch.label,
          });
        }
      });
    }
  });

  const updateStageSlot = (slot: StageSlot, characterId: string, emotion: EmotionType) => {
    if (!selectedNode) return;
    const existing = selectedNode.stageCast.filter((s) => s.slot !== slot);
    if (characterId) {
      existing.push({ characterId, slot, emotion });
    }
    onUpdateNode({ ...selectedNode, stageCast: existing });
  };

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden">
      {/* Main Visual Node Graph Canvas */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#0B0D12]">
        {/* Graph Toolbar */}
        <div className="px-4 py-2.5 border-b border-white/[0.08] bg-[#12161F] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => createNewNode('dialogue')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#181D29] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-slate-100 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>Dialogue Node</span>
            </button>
            <button
              type="button"
              onClick={() => createNewNode('choice')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#181D29] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-slate-100 cursor-pointer whitespace-nowrap"
            >
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
              <span>Choice Branch</span>
            </button>
            <button
              type="button"
              onClick={() => createNewNode('cinematic')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#181D29] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-slate-100 cursor-pointer whitespace-nowrap"
            >
              <Video className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>Cinematic Beat</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {connectingFrom && (
              <span className="text-xs text-cyan-300 mr-2">
                Click any target node’s Link input to connect
              </span>
            )}
            <button
              type="button"
              onClick={autoLayoutNodes}
              className="px-2.5 py-1.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-xs text-slate-200 cursor-pointer whitespace-nowrap"
            >
              Auto-Layout
            </button>
            <div className="flex items-center rounded bg-[#0B0D12] border border-white/[0.08]">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoom((z) => Math.max(0.55, Number((z - 0.1).toFixed(2))))}
                className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px] text-slate-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
                className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Pan & Zoom Node Surface */}
        <div
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          className="relative flex-1 overflow-hidden select-none cursor-grab active:cursor-grabbing"
          style={{
            backgroundImage:
              'radial-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px)',
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* SVG Connections */}
            <svg className="overflow-visible absolute top-0 left-0 w-1 h-1 pointer-events-none">
              {edges.map((edge) => {
                const dx = Math.max(60, Math.abs(edge.x2 - edge.x1) * 0.5);
                const d = `M ${edge.x1} ${edge.y1} C ${edge.x1 + dx} ${edge.y1}, ${
                  edge.x2 - dx
                } ${edge.y2}, ${edge.x2} ${edge.y2}`;
                return (
                  <g key={edge.key}>
                    <path
                      d={d}
                      fill="none"
                      stroke={edge.color}
                      strokeWidth={2}
                      strokeOpacity={0.75}
                    />
                    <circle cx={edge.x2} cy={edge.y2} r={3.5} fill={edge.color} />
                  </g>
                );
              })}
            </svg>

            {/* Story Nodes */}
            {project.nodes.map((node) => {
              const isSelected = node.id === selectedNode?.id;
              const isStart = node.id === project.startNodeId;
              const speaker = project.characters.find((c) => c.id === node.speakerId);

              return (
                <div
                  key={node.id}
                  style={{
                    left: `${node.position.x}px`,
                    top: `${node.position.y}px`,
                    width: `${NODE_WIDTH}px`,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onSelectNode(node.id);
                    setDraggingNodeId(node.id);
                    lastMouseRef.current = { x: e.clientX, y: e.clientY };
                  }}
                  className={`pointer-events-auto absolute rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-[#181D29] border-amber-400 shadow-lg shadow-black/50'
                      : 'bg-[#12161F] border-white/[0.1] hover:border-white/[0.22]'
                  }`}
                >
                  {/* Node Header */}
                  <div className="px-3 py-2 border-b border-white/[0.07] flex items-center justify-between gap-2 cursor-move">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {node.type === 'choice' ? (
                        <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : node.type === 'cinematic' ? (
                        <Video className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <MessageSquareText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate text-xs font-semibold text-slate-100">
                        {node.title}
                      </span>
                    </div>
                    {isStart && (
                      <span className="text-[10px] font-mono text-amber-300 shrink-0">
                        ENTRY
                      </span>
                    )}
                  </div>

                  {/* Input Port Button */}
                  <button
                    type="button"
                    title="Connect incoming branch to this node"
                    onClick={(e) => {
                      e.stopPropagation();
                      completeConnectionTo(node.id);
                    }}
                    className={`absolute -left-2.5 top-[50px] w-4 h-4 rounded-full border transition-colors cursor-pointer ${
                      connectingFrom && connectingFrom.nodeId !== node.id
                        ? 'bg-cyan-400 border-white scale-125'
                        : 'bg-[#12161F] border-slate-400 hover:border-cyan-400'
                    }`}
                  />

                  {/* Body Preview */}
                  <div className="px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-medium text-slate-200">
                        {speaker ? speaker.name : 'Narrator / Camera'}
                      </span>
                      <span className="font-mono text-[10px]">
                        {node.emotion} · {node.camera.preset.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {node.text}
                    </p>
                  </div>

                  {/* Output Ports */}
                  {node.type === 'choice' ? (
                    <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
                      {node.choices.map((ch) => (
                        <div
                          key={ch.id}
                          className="relative px-3 py-1.5 flex items-center justify-between text-[11px] text-cyan-200"
                        >
                          <span className="truncate pr-3">{ch.label}</span>
                          <button
                            type="button"
                            title="Click to wire this choice to a target node"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConnectingFrom({ nodeId: node.id, choiceId: ch.id });
                            }}
                            className="absolute -right-2 w-4 h-4 rounded-full bg-[#12161F] border border-cyan-400 hover:bg-cyan-400 cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      type="button"
                      title="Click to connect next node"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConnectingFrom({ nodeId: node.id });
                      }}
                      className="absolute -right-2 top-[50px] w-4 h-4 rounded-full bg-[#12161F] border border-amber-400 hover:bg-amber-400 cursor-pointer"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Logic Inspector */}
      <aside className="w-[360px] shrink-0 border-l border-white/[0.08] bg-[#12161F] overflow-y-auto p-4 space-y-5">
        {selectedNode ? (
          <>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-100">
                  Node Inspector
                </h2>
                <span className="font-mono text-[11px] text-slate-400">
                  {selectedNode.id}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onTestFromNode(selectedNode.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-3 h-3" aria-hidden="true" />
                  <span>Play Here</span>
                </button>
                {project.nodes.length > 1 && (
                  <button
                    type="button"
                    aria-label="Delete node"
                    onClick={() => onDeleteNode(selectedNode.id)}
                    className="p-1.5 rounded bg-white/[0.05] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="block text-[11px] text-slate-400 mb-1">Node Title</span>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) =>
                    onUpdateNode({ ...selectedNode, title: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-[#0B0D12] border border-white/[0.1] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-[11px] text-slate-400 mb-1">Node Type</span>
                  <select
                    value={selectedNode.type}
                    onChange={(e) =>
                      onUpdateNode({
                        ...selectedNode,
                        type: e.target.value as StoryNodeType,
                      })
                    }
                    className="w-full px-2 py-1.5 rounded bg-[#0B0D12] border border-white/[0.1] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="dialogue">Dialogue</option>
                    <option value="choice">Choice Branch</option>
                    <option value="cinematic">Cinematic Beat</option>
                  </select>
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => onSetStartNode(selectedNode.id)}
                    disabled={project.startNodeId === selectedNode.id}
                    className="w-full px-2.5 py-1.5 rounded bg-[#181D29] hover:bg-white/[0.1] disabled:opacity-50 border border-white/[0.1] text-xs text-slate-200 cursor-pointer"
                  >
                    {project.startNodeId === selectedNode.id
                      ? 'Current Entry Node'
                      : 'Set as Entry Node'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-[11px] text-slate-400 mb-1">Speaker NPC</span>
                  <select
                    value={selectedNode.speakerId ?? ''}
                    onChange={(e) =>
                      onUpdateNode({
                        ...selectedNode,
                        speakerId: e.target.value || undefined,
                      })
                    }
                    className="w-full px-2 py-1.5 rounded bg-[#0B0D12] border border-white/[0.1] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Narrator / None</option>
                    {project.characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[11px] text-slate-400 mb-1">
                    Speaker Emotion
                  </span>
                  <select
                    value={selectedNode.emotion}
                    onChange={(e) => {
                      const nextEm = e.target.value as EmotionType;
                      onUpdateNode({
                        ...selectedNode,
                        emotion: nextEm,
                        stageCast: selectedNode.stageCast.map((sc) =>
                          sc.characterId === selectedNode.speakerId
                            ? { ...sc, emotion: nextEm }
                            : sc
                        ),
                      });
                    }}
                    className="w-full px-2 py-1.5 rounded bg-[#0B0D12] border border-white/[0.1] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="neutral">Neutral</option>
                    <option value="happy">Happy</option>
                    <option value="sad">Sad</option>
                    <option value="angry">Angry</option>
                    <option value="surprised">Surprised</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="block text-[11px] text-slate-400 mb-1">
                  Dialogue / Narrative Line
                </span>
                <textarea
                  rows={3}
                  value={selectedNode.text}
                  onChange={(e) =>
                    onUpdateNode({ ...selectedNode, text: e.target.value })
                  }
                  className="w-full px-2.5 py-2 rounded bg-[#0B0D12] border border-white/[0.1] text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-amber-500"
                />
              </label>
            </div>

            {/* Stage Cast Slots */}
            <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-200">
                Stage Cast Positions
              </h3>
              {(['left', 'center', 'right'] as StageSlot[]).map((slot) => {
                const placed = selectedNode.stageCast.find((s) => s.slot === slot);
                return (
                  <div key={slot} className="grid grid-cols-12 gap-2 items-center">
                    <span className="col-span-3 text-[11px] capitalize text-slate-400">
                      {slot}
                    </span>
                    <select
                      value={placed?.characterId ?? ''}
                      onChange={(e) =>
                        updateStageSlot(
                          slot,
                          e.target.value,
                          placed?.emotion ?? 'neutral'
                        )
                      }
                      className="col-span-5 px-2 py-1 rounded bg-[#0B0D12] border border-white/[0.08] text-xs text-slate-100"
                    >
                      <option value="">Empty</option>
                      {project.characters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      disabled={!placed}
                      value={placed?.emotion ?? 'neutral'}
                      onChange={(e) =>
                        placed &&
                        updateStageSlot(
                          slot,
                          placed.characterId,
                          e.target.value as EmotionType
                        )
                      }
                      className="col-span-4 px-2 py-1 rounded bg-[#0B0D12] border border-white/[0.08] text-xs text-slate-200 disabled:opacity-40"
                    >
                      <option value="neutral">Neutral</option>
                      <option value="happy">Happy</option>
                      <option value="sad">Sad</option>
                      <option value="angry">Angry</option>
                      <option value="surprised">Surprised</option>
                    </select>
                  </div>
                );
              })}
            </div>

            {/* Flow & Branch Routing */}
            <div className="pt-3 border-t border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  <span>Script Flow &amp; Branching</span>
                </h3>
                {selectedNode.type === 'choice' && (
                  <button
                    type="button"
                    onClick={() => {
                      const newChoice: StoryChoice = {
                        id: `ch_${Date.now().toString(36)}`,
                        label: 'New Choice',
                        targetNodeId: project.startNodeId,
                      };
                      onUpdateNode({
                        ...selectedNode,
                        choices: [...selectedNode.choices, newChoice],
                      });
                    }}
                    className="text-xs text-cyan-300 hover:text-cyan-200 cursor-pointer"
                  >
                    + Add Choice
                  </button>
                )}
              </div>

              {selectedNode.type !== 'choice' ? (
                <label className="block">
                  <span className="block text-[11px] text-slate-400 mb-1">
                    Next Node
                  </span>
                  <select
                    value={selectedNode.nextNodeId ?? ''}
                    onChange={(e) =>
                      onUpdateNode({
                        ...selectedNode,
                        nextNodeId: e.target.value || undefined,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-[#0B0D12] border border-white/[0.1] text-xs text-slate-100"
                  >
                    <option value="">End of Story</option>
                    {project.nodes
                      .filter((n) => n.id !== selectedNode.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.title}
                        </option>
                      ))}
                  </select>
                </label>
              ) : (
                <div className="space-y-3">
                  {selectedNode.choices.map((ch, idx) => (
                    <div
                      key={ch.id}
                      className="p-2.5 rounded bg-[#0B0D12] border border-white/[0.08] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-cyan-300">
                          Branch {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateNode({
                              ...selectedNode,
                              choices: selectedNode.choices.filter(
                                (c) => c.id !== ch.id
                              ),
                            })
                          }
                          className="text-[11px] text-slate-400 hover:text-rose-400 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        value={ch.label}
                        onChange={(e) =>
                          onUpdateNode({
                            ...selectedNode,
                            choices: selectedNode.choices.map((c) =>
                              c.id === ch.id ? { ...c, label: e.target.value } : c
                            ),
                          })
                        }
                        className="w-full px-2 py-1 rounded bg-[#12161F] border border-white/[0.08] text-xs text-slate-100"
                      />
                      <select
                        value={ch.targetNodeId}
                        onChange={(e) =>
                          onUpdateNode({
                            ...selectedNode,
                            choices: selectedNode.choices.map((c) =>
                              c.id === ch.id
                                ? { ...c, targetNodeId: e.target.value }
                                : c
                            ),
                          })
                        }
                        className="w-full px-2 py-1 rounded bg-[#12161F] border border-white/[0.08] text-xs text-slate-200"
                      >
                        {project.nodes
                          .filter((n) => n.id !== selectedNode.id)
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              Target: {n.title}
                            </option>
                          ))}
                      </select>

                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          placeholder="Set var (e.g. trust)"
                          value={ch.setVar ?? ''}
                          onChange={(e) =>
                            onUpdateNode({
                              ...selectedNode,
                              choices: selectedNode.choices.map((c) =>
                                c.id === ch.id ? { ...c, setVar: e.target.value } : c
                              ),
                            })
                          }
                          className="px-2 py-1 rounded bg-[#12161F] border border-white/[0.08] text-[11px] font-mono text-slate-200"
                        />
                        <input
                          type="number"
                          placeholder="Delta (+1)"
                          value={ch.setDelta ?? ''}
                          onChange={(e) =>
                            onUpdateNode({
                              ...selectedNode,
                              choices: selectedNode.choices.map((c) =>
                                c.id === ch.id
                                  ? {
                                      ...c,
                                      setDelta:
                                        e.target.value === ''
                                          ? undefined
                                          : Number(e.target.value),
                                    }
                                  : c
                              ),
                            })
                          }
                          className="px-2 py-1 rounded bg-[#12161F] border border-white/[0.08] text-[11px] font-mono text-slate-200"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
};
