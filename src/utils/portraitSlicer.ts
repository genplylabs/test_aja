import { CharacterAsset, FacialAnchor } from '../types/story';

export const DEFAULT_SHEET_URL =
  '/assets/aistudio/Faceless_Indonesian_Character_Portrait_Sheet_b6482c54.png';

export interface SheetCharacterPreset {
  index: number;
  name: string;
  role: string;
  accentColor: string;
}

export const SHEET_CHARACTER_PRESETS: SheetCharacterPreset[] = [
  { index: 0, name: 'Raka', role: 'Computer Science Student', accentColor: '#F59E0B' },
  { index: 1, name: 'Nadia', role: 'Documentary Photographer', accentColor: '#38BDF8' },
  { index: 2, name: 'Dimas', role: 'Architectural Intern', accentColor: '#10B981' },
  { index: 3, name: 'Salsa', role: 'Indie Cafe Barista', accentColor: '#F472B6' },
  { index: 4, name: 'Reza', role: 'Transit Systems Analyst', accentColor: '#A78BFA' },
  { index: 5, name: 'Dina', role: 'Urban Planner', accentColor: '#2DD4BF' },
  { index: 6, name: 'Fajar', role: 'Campus Radio Host', accentColor: '#60A5FA' },
  { index: 7, name: 'Citra', role: 'High School Senior', accentColor: '#818CF8' },
  { index: 8, name: 'Bima', role: 'GoBos Courier', accentColor: '#22C55E' },
  { index: 9, name: 'Aulia', role: 'Investigative Reporter', accentColor: '#FB923C' },
  { index: 10, name: 'Galih', role: 'Audio Engineer', accentColor: '#94A3B8' },
  { index: 11, name: 'Maya', role: 'Art Conservator', accentColor: '#FBBF24' },
  { index: 12, name: 'Yoga', role: 'Signal Technician', accentColor: '#34D399' },
  { index: 13, name: 'Tari', role: 'Track Sprinter', accentColor: '#38BDF8' },
  { index: 14, name: 'Bagas', role: 'Dockyard Mechanic', accentColor: '#EF4444' },
  { index: 15, name: 'Kirana', role: 'Gallery Curator', accentColor: '#E879F9' },
  { index: 16, name: 'Rendi', role: 'Junior Auditor', accentColor: '#64748B' },
  { index: 17, name: 'Bintang', role: 'Younger Brother', accentColor: '#FACC15' },
  { index: 18, name: 'Ilham', role: 'Field Researcher', accentColor: '#D97706' },
  { index: 19, name: 'Laras', role: 'Elementary Student', accentColor: '#FB7185' },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Flood-fills contiguous near-white pixels starting from canvas borders
 * so inner white clothing (shirts, hoodies, collars) stays opaque.
 */
function removeExteriorWhiteBackground(
  imageData: ImageData,
  threshold = 236
): void {
  const { width, height, data } = imageData;
  const total = width * height;
  const visited = new Uint8Array(total);

  // Check if image already has significant transparency
  let transparentCount = 0;
  for (let i = 0; i < total; i++) {
    if (data[i * 4 + 3] < 20) transparentCount++;
  }
  if (transparentCount > total * 0.12) {
    return;
  }

  const isNearWhite = (idx: number) => {
    const p = idx * 4;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const a = data[p + 3];
    if (a < 15) return true;
    return r >= threshold && g >= threshold && b >= threshold;
  };

  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const tryPush = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    if (!isNearWhite(idx)) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  };

  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    data[idx * 4 + 3] = 0;
    const x = idx % width;
    const y = (idx - x) / width;

    tryPush(x - 1, y);
    tryPush(x + 1, y);
    tryPush(x, y - 1);
    tryPush(x, y + 1);
  }

  // Soft 1px edge anti-aliasing for pixels bordering transparent background
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const p = idx * 4;
      if (data[p + 3] === 0) continue;
      const lum = (data[p] + data[p + 1] + data[p + 2]) / 3;
      if (lum > 215) {
        const hasTransparentNeighbor =
          data[((y - 1) * width + x) * 4 + 3] === 0 ||
          data[((y + 1) * width + x) * 4 + 3] === 0 ||
          data[(y * width + (x - 1)) * 4 + 3] === 0 ||
          data[(y * width + (x + 1)) * 4 + 3] === 0;
        if (hasTransparentNeighbor) {
          const factor = Math.max(0, Math.min(1, (250 - lum) / 40));
          data[p + 3] = Math.round(data[p + 3] * factor);
        }
      }
    }
  }
}

/**
 * Estimates eye and mouth anchors by locating the faceless skin oval in the upper half.
 */
function estimateFaceAnchors(
  canvas: HTMLCanvasElement
): { eyeAnchor: FacialAnchor; mouthAnchor: FacialAnchor } {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      eyeAnchor: { x: 0.5, y: 0.42, scale: 1.0 },
      mouthAnchor: { x: 0.5, y: 0.53, scale: 1.0 },
    };
  }

  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height).data;

  // Scan upper 65% of portrait for warm skin tones (faceless face area)
  const maxY = Math.floor(height * 0.65);
  let sumX = 0;
  let count = 0;
  let minFaceY = maxY;
  let maxFaceY = 0;
  let minFaceX = width;
  let maxFaceX = 0;

  const rowCounts = new Int32Array(maxY);

  for (let y = Math.floor(height * 0.08); y < maxY; y++) {
    for (let x = Math.floor(width * 0.22); x < Math.floor(width * 0.78); x++) {
      const p = (y * width + x) * 4;
      const r = imgData[p];
      const g = imgData[p + 1];
      const b = imgData[p + 2];
      const a = imgData[p + 3];
      if (a < 180) continue;

      // Skin-tone heuristic for stylized anime/illustration portraits
      if (r > 185 && g > 125 && b > 90 && r - g >= 12 && r - b >= 32 && r - b <= 115) {
        rowCounts[y]++;
        sumX += x;
        count++;
        if (x < minFaceX) minFaceX = x;
        if (x > maxFaceX) maxFaceX = x;
      }
    }
  }

  if (count < 40) {
    return {
      eyeAnchor: { x: 0.5, y: 0.42, scale: 1.0 },
      mouthAnchor: { x: 0.5, y: 0.53, scale: 1.0 },
    };
  }

  // Find peak skin-row (cheeks/jaw) and exclude neck below chin narrowing
  let peakRow = 0;
  let peakVal = 0;
  for (let y = 0; y < maxY; y++) {
    if (rowCounts[y] > peakVal) {
      peakVal = rowCounts[y];
      peakRow = y;
    }
  }

  // Expand upwards and downwards from peakRow until skin width narrows (hairline / chin)
  minFaceY = peakRow;
  while (minFaceY > 0 && rowCounts[minFaceY - 1] > peakVal * 0.28) {
    minFaceY--;
  }
  maxFaceY = peakRow;
  while (maxFaceY < maxY - 1 && rowCounts[maxFaceY + 1] > peakVal * 0.48) {
    maxFaceY++;
  }

  const faceHeight = Math.max(24, maxFaceY - minFaceY);
  const faceWidth = Math.max(24, peakVal);
  const centerX = sumX / count / width;

  // Eye line sits slightly below upper visible skin (forehead/hairline)
  const eyeY = (minFaceY + faceHeight * 0.46) / height;
  const mouthY = (minFaceY + faceHeight * 0.8) / height;
  const autoScale = Math.max(0.65, Math.min(1.45, (faceWidth / width) * 3.1));

  return {
    eyeAnchor: {
      x: Number(centerX.toFixed(3)),
      y: Number(Math.max(0.15, Math.min(0.75, eyeY)).toFixed(3)),
      scale: Number(autoScale.toFixed(2)),
    },
    mouthAnchor: {
      x: Number(centerX.toFixed(3)),
      y: Number(Math.max(0.22, Math.min(0.85, mouthY)).toFixed(3)),
      scale: Number(autoScale.toFixed(2)),
    },
  };
}

function trimAndNormalizeCell(
  sourceCanvas: HTMLCanvasElement,
  targetSize = 512
): {
  dataUrl: string;
  width: number;
  height: number;
  eyeAnchor: FacialAnchor;
  mouthAnchor: FacialAnchor;
} {
  const sCtx = sourceCanvas.getContext('2d')!;
  const imgData = sCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  removeExteriorWhiteBackground(imgData);
  sCtx.putImageData(imgData, 0, 0);

  const { width, height, data } = imgData;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    minX = 0;
    minY = 0;
    maxX = width - 1;
    maxY = height - 1;
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  // Render centered onto a clean 512x512 square canvas anchored to bottom so characters stand uniformly
  const out = document.createElement('canvas');
  out.width = targetSize;
  out.height = targetSize;
  const oCtx = out.getContext('2d')!;

  const pad = 16;
  const avail = targetSize - pad * 2;
  const scale = Math.min(avail / cropW, avail / cropH);
  const drawW = cropW * scale;
  const drawH = cropH * scale;
  const dx = (targetSize - drawW) / 2;
  const dy = targetSize - drawH; // bottom-aligned so portraits sit cleanly on stage floor

  oCtx.drawImage(sourceCanvas, minX, minY, cropW, cropH, dx, dy, drawW, drawH);

  const anchors = estimateFaceAnchors(out);
  return {
    dataUrl: out.toDataURL('image/png'),
    width: targetSize,
    height: targetSize,
    ...anchors,
  };
}

export async function sliceIndonesianPortraitSheet(
  sheetUrl: string = DEFAULT_SHEET_URL
): Promise<CharacterAsset[]> {
  const img = await loadImage(sheetUrl);
  const cols = 5;
  const rows = 4;
  const cellW = Math.floor(img.naturalWidth / cols);
  const cellH = Math.floor(img.naturalHeight / rows);

  const characters: CharacterAsset[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const preset = SHEET_CHARACTER_PRESETS[idx] ?? {
        index: idx,
        name: `Character ${idx + 1}`,
        role: 'NPC',
        accentColor: '#F59E0B',
      };

      const cellCanvas = document.createElement('canvas');
      cellCanvas.width = cellW;
      cellCanvas.height = cellH;
      const ctx = cellCanvas.getContext('2d')!;
      ctx.drawImage(img, c * cellW, r * cellH, cellW, cellH, 0, 0, cellW, cellH);

      const processed = trimAndNormalizeCell(cellCanvas, 512);
      characters.push({
        id: `char_${preset.name.toLowerCase()}_${idx}`,
        name: preset.name,
        role: preset.role,
        portraitDataUrl: processed.dataUrl,
        width: processed.width,
        height: processed.height,
        eyeAnchor: processed.eyeAnchor,
        mouthAnchor: processed.mouthAnchor,
        accentColor: preset.accentColor,
        sourceType: 'sheet',
        sheetIndex: idx,
      });
    }
  }

  return characters;
}

export async function processUploadedPortraitFile(
  file: File,
  customName?: string
): Promise<CharacterAsset> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await loadImage(dataUrl);
  const cellCanvas = document.createElement('canvas');
  cellCanvas.width = img.naturalWidth;
  cellCanvas.height = img.naturalHeight;
  const ctx = cellCanvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const processed = trimAndNormalizeCell(cellCanvas, 512);
  const baseName =
    customName?.trim() ||
    file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ') ||
    'Custom NPC';

  return {
    id: `char_upload_${Date.now().toString(36)}`,
    name: baseName,
    role: 'Custom Faceless Portrait',
    portraitDataUrl: processed.dataUrl,
    width: processed.width,
    height: processed.height,
    eyeAnchor: processed.eyeAnchor,
    mouthAnchor: processed.mouthAnchor,
    accentColor: '#06B6D4',
    sourceType: 'upload',
  };
}
