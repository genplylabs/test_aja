import { useEffect, useState } from 'react';
import { TopBar } from './components/TopBar';
import { AssetAtlasStudio } from './components/AssetAtlasStudio';
import { StoryGraphEditor } from './components/StoryGraphEditor';
import { TimelineCameraEditor } from './components/TimelineCameraEditor';
import { PlaybackEngineView } from './components/PlaybackEngineView';
import { buildDefaultStoryProject } from './data/defaultStory';
import { CharacterAsset, EditorTab, StoryNode, StoryProject } from './types/story';
import { generateExpressionAtlas } from './utils/expressionAtlasGenerator';
import { DEFAULT_SHEET_URL, sliceIndonesianPortraitSheet } from './utils/portraitSlicer';
import { exportStoryToZip, importStoryFromZip } from './utils/storyZipExporter';

export default function App() {
  const [project, setProject] = useState<StoryProject | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('assets');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node_intro');
  const [playbackEntryNodeId, setPlaybackEntryNodeId] = useState<string | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const characters = await sliceIndonesianPortraitSheet(DEFAULT_SHEET_URL);
        const atlas = generateExpressionAtlas();
        if (cancelled) return;

        const initialProject = buildDefaultStoryProject(characters, atlas);
        setProject(initialProject);
        setSelectedCharacterId(characters[0]?.id ?? '');
        setSelectedNodeId(initialProject.startNodeId);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : 'Failed to slice default Indonesian character portrait sheet.'
          );
        }
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(t);
  }, [notice]);

  const handleExportZip = async () => {
    if (!project || isExporting) return;
    setIsExporting(true);
    try {
      const filename = await exportStoryToZip(project);
      setNotice({
        kind: 'ok',
        text: `Exported ${filename} with story_${project.storyName || 'untitled'}.json and PlayCanvas atlases.`,
      });
    } catch (err) {
      setNotice({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Failed to generate ZIP archive.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportZip = async (file: File) => {
    try {
      const imported = await importStoryFromZip(file);
      setProject(imported);
      setSelectedCharacterId(imported.characters[0]?.id ?? '');
      setSelectedNodeId(imported.startNodeId);
      setPlaybackEntryNodeId(imported.startNodeId);
      setNotice({
        kind: 'ok',
        text: `Loaded "${imported.title}" (${imported.nodes.length} nodes, ${imported.characters.length} portraits).`,
      });
    } catch (err) {
      setNotice({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Invalid story ZIP archive.',
      });
    }
  };

  const handleUpdateCharacter = (updated: CharacterAsset) => {
    setProject((prev) =>
      prev
        ? {
            ...prev,
            characters: prev.characters.map((c) => (c.id === updated.id ? updated : c)),
          }
        : prev
    );
  };

  const handleAddCharacter = (created: CharacterAsset) => {
    setProject((prev) =>
      prev ? { ...prev, characters: [created, ...prev.characters] } : prev
    );
  };

  const handleUpdateNode = (updated: StoryNode) => {
    setProject((prev) =>
      prev
        ? {
            ...prev,
            nodes: prev.nodes.map((n) => (n.id === updated.id ? updated : n)),
          }
        : prev
    );
  };

  const handleAddNode = (created: StoryNode) => {
    setProject((prev) =>
      prev ? { ...prev, nodes: [...prev.nodes, created] } : prev
    );
  };

  const handleDeleteNode = (nodeId: string) => {
    setProject((prev) => {
      if (!prev || prev.nodes.length <= 1) return prev;
      const remaining = prev.nodes
        .filter((n) => n.id !== nodeId)
        .map((n) => ({
          ...n,
          nextNodeId: n.nextNodeId === nodeId ? undefined : n.nextNodeId,
          choices: n.choices.filter((c) => c.targetNodeId !== nodeId),
        }));
      const nextStart =
        prev.startNodeId === nodeId ? remaining[0].id : prev.startNodeId;
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(remaining[0].id);
      }
      return { ...prev, startNodeId: nextStart, nodes: remaining };
    });
  };

  const handleRegenerateAtlas = (irisColor: string) => {
    const atlas = generateExpressionAtlas({ irisColor });
    setProject((prev) => (prev ? { ...prev, expressionAtlas: atlas } : prev));
  };

  if (loadError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0B0D12] text-slate-200 p-6">
        <h1 className="font-display text-lg font-semibold text-rose-400">
          Asset Initialization Error
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-md text-center">{loadError}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0B0D12] text-slate-200 p-6">
        <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-200">
          Slicing faceless character portraits and generating PlayCanvas expression atlas...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0B0D12] text-slate-100">
      <TopBar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab !== 'playback') setPlaybackEntryNodeId(undefined);
          setActiveTab(tab);
        }}
        onExportZip={handleExportZip}
        isExporting={isExporting}
      />

      {notice && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg border text-xs font-medium shadow-xl ${
            notice.kind === 'ok'
              ? 'bg-[#12161F] border-emerald-500/50 text-emerald-300'
              : 'bg-[#12161F] border-rose-500/50 text-rose-300'
          }`}
        >
          {notice.text}
        </div>
      )}

      {activeTab === 'assets' && (
        <AssetAtlasStudio
          project={project}
          selectedCharacterId={selectedCharacterId}
          onSelectCharacter={setSelectedCharacterId}
          onUpdateCharacter={handleUpdateCharacter}
          onAddCharacter={handleAddCharacter}
          onUpdateProjectMeta={(patch) =>
            setProject((prev) => (prev ? { ...prev, ...patch } : prev))
          }
          onRegenerateAtlas={handleRegenerateAtlas}
          onImportZip={handleImportZip}
        />
      )}

      {activeTab === 'graph' && (
        <StoryGraphEditor
          project={project}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onUpdateNode={handleUpdateNode}
          onAddNode={handleAddNode}
          onDeleteNode={handleDeleteNode}
          onSetStartNode={(id) =>
            setProject((prev) => (prev ? { ...prev, startNodeId: id } : prev))
          }
          onTestFromNode={(nodeId) => {
            setPlaybackEntryNodeId(nodeId);
            setActiveTab('playback');
          }}
        />
      )}

      {activeTab === 'timeline' && (
        <TimelineCameraEditor
          project={project}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onUpdateNode={handleUpdateNode}
        />
      )}

      {activeTab === 'playback' && (
        <PlaybackEngineView
          project={project}
          initialNodeId={playbackEntryNodeId}
          onImportZip={handleImportZip}
        />
      )}
    </div>
  );
}
