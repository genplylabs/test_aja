import JSZip from 'jszip';
import { CharacterAsset, StoryProject } from '../types/story';

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(',');
  const base64 = parts[1] ?? '';
  const binStr = atob(base64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToDataUrl(bytes: Uint8Array, mime = 'image/png'): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export function sanitizeStorySlug(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'untitled';
}

export async function exportStoryToZip(project: StoryProject): Promise<string> {
  const slug = sanitizeStorySlug(project.storyName || project.title);
  const zip = new JSZip();

  // Strip heavy base64 data URLs from the JSON and point to clean relative atlas/portrait paths
  const portableCharacters = project.characters.map((char) => ({
    id: char.id,
    name: char.name,
    role: char.role,
    portraitPath: `assets/portraits/${char.id}.png`,
    width: char.width,
    height: char.height,
    eyeAnchor: char.eyeAnchor,
    mouthAnchor: char.mouthAnchor,
    accentColor: char.accentColor,
    sourceType: char.sourceType,
    sheetIndex: char.sheetIndex,
  }));

  const storyJson = {
    version: project.version,
    storyName: slug,
    title: project.title,
    subtitle: project.subtitle,
    startNodeId: project.startNodeId,
    initialVariables: project.initialVariables,
    characters: portableCharacters,
    nodes: project.nodes,
    atlases: {
      expressionsPng: 'assets/atlases/expressions_atlas.png',
      expressionsJson: 'assets/atlases/expressions_atlas.json',
    },
  };

  // Primary requested output: story_x.json
  zip.file(`story_${slug}.json`, JSON.stringify(storyJson, null, 2));

  // Expression TextureAtlas PNG + PlayCanvas JSON
  zip.file(
    'assets/atlases/expressions_atlas.png',
    dataUrlToUint8Array(project.expressionAtlas.imageDataUrl)
  );

  const playcanvasAtlasJson = {
    meta: {
      format: 'PlayCanvas.TextureAtlas',
      width: project.expressionAtlas.width,
      height: project.expressionAtlas.height,
      flipY: false,
      generatedAt: new Date().toISOString(),
    },
    frames: Object.fromEntries(
      Object.entries(project.expressionAtlas.frames).map(([key, frame]) => [
        key,
        {
          rect: frame.pcRect,
          pivot: frame.pivot,
          border: [0, 0, 0, 0],
          canvasRect: [frame.canvasX, frame.canvasY, frame.width, frame.height],
        },
      ])
    ),
  };

  zip.file(
    'assets/atlases/expressions_atlas.json',
    JSON.stringify(playcanvasAtlasJson, null, 2)
  );

  // Individual faceless NPC portrait PNGs
  for (const char of project.characters) {
    zip.file(
      `assets/portraits/${char.id}.png`,
      dataUrlToUint8Array(char.portraitDataUrl)
    );
  }

  // Runtime manifest for PlayCanvas dynamic loader
  const runtimeManifest = {
    engineTarget: 'playcanvas',
    minEngineVersion: '2.24.0',
    entryStory: `story_${slug}.json`,
    expressionAtlas: {
      texture: 'assets/atlases/expressions_atlas.png',
      descriptor: 'assets/atlases/expressions_atlas.json',
    },
    characterCount: project.characters.length,
    nodeCount: project.nodes.length,
  };
  zip.file(
    'playcanvas_runtime_manifest.json',
    JSON.stringify(runtimeManifest, null, 2)
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = `story_${slug}.zip`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return filename;
}

export async function importStoryFromZip(file: File): Promise<StoryProject> {
  const zip = await JSZip.loadAsync(file);

  // Locate story_*.json
  const storyJsonFileName = Object.keys(zip.files).find(
    (name) => /^story_.*\.json$/i.test(name) && !zip.files[name].dir
  );

  if (!storyJsonFileName) {
    throw new Error('Archive does not contain a valid story_<name>.json file.');
  }

  const rawStoryText = await zip.files[storyJsonFileName].async('text');
  const parsed = JSON.parse(rawStoryText);

  // Reconstruct expression atlas
  const atlasPngEntry =
    zip.files[parsed.atlases?.expressionsPng ?? 'assets/atlases/expressions_atlas.png'];
  const atlasJsonEntry =
    zip.files[parsed.atlases?.expressionsJson ?? 'assets/atlases/expressions_atlas.json'];

  if (!atlasPngEntry || !atlasJsonEntry) {
    throw new Error('Archive is missing expression atlas PNG or JSON descriptor.');
  }

  const atlasBytes = await atlasPngEntry.async('uint8array');
  const atlasDataUrl = uint8ArrayToDataUrl(atlasBytes, 'image/png');
  const atlasJson = JSON.parse(await atlasJsonEntry.async('text'));

  const reconstructedFrames: any = {};
  for (const [key, val] of Object.entries<any>(atlasJson.frames ?? {})) {
    const canvasRect = val.canvasRect ?? [0, 0, 136, 96];
    reconstructedFrames[key] = {
      key,
      category: key.startsWith('eyes_') ? 'eyes' : 'mouth',
      canvasX: canvasRect[0],
      canvasY: canvasRect[1],
      width: canvasRect[2],
      height: canvasRect[3],
      pcRect: val.rect,
      pivot: val.pivot ?? [0.5, 0.5],
    };
  }

  // Reconstruct character portraits
  const characters: CharacterAsset[] = [];
  for (const charMeta of parsed.characters ?? []) {
    const portraitPath = charMeta.portraitPath || `assets/portraits/${charMeta.id}.png`;
    const entry = zip.files[portraitPath];
    let portraitDataUrl = '';
    if (entry) {
      const bytes = await entry.async('uint8array');
      portraitDataUrl = uint8ArrayToDataUrl(bytes, 'image/png');
    }
    characters.push({
      id: charMeta.id,
      name: charMeta.name,
      role: charMeta.role ?? 'NPC',
      portraitDataUrl,
      width: charMeta.width ?? 512,
      height: charMeta.height ?? 512,
      eyeAnchor: charMeta.eyeAnchor ?? { x: 0.5, y: 0.42, scale: 1.0 },
      mouthAnchor: charMeta.mouthAnchor ?? { x: 0.5, y: 0.53, scale: 1.0 },
      accentColor: charMeta.accentColor ?? '#F59E0B',
      sourceType: charMeta.sourceType ?? 'sheet',
      sheetIndex: charMeta.sheetIndex,
    });
  }

  return {
    version: parsed.version ?? '1.0.0',
    storyName: parsed.storyName ?? 'imported_story',
    title: parsed.title ?? 'Imported Story',
    subtitle: parsed.subtitle ?? '',
    startNodeId: parsed.startNodeId ?? parsed.nodes?.[0]?.id ?? 'node_1',
    initialVariables: parsed.initialVariables ?? { trust: 0 },
    characters,
    nodes: parsed.nodes ?? [],
    expressionAtlas: {
      width: atlasJson.meta?.width ?? 1024,
      height: atlasJson.meta?.height ?? 512,
      imageDataUrl: atlasDataUrl,
      frames: reconstructedFrames,
    },
  };
}
