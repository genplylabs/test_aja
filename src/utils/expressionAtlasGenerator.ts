import {
  AtlasFrameDescriptor,
  AtlasFrameKey,
  ExpressionAtlasBundle,
  EyeFrameKey,
  MouthFrameKey,
} from '../types/story';

export interface ExpressionStyleOptions {
  irisColor?: string;
  lashColor?: string;
  skinShadowColor?: string;
}

const EYE_KEYS: EyeFrameKey[] = [
  'eyes_neutral',
  'eyes_blink',
  'eyes_happy',
  'eyes_sad',
  'eyes_angry',
  'eyes_surprised',
  'eyes_wink',
];

const MOUTH_KEYS: MouthFrameKey[] = [
  'mouth_closed',
  'mouth_talk_1',
  'mouth_talk_2',
  'mouth_talk_3',
  'mouth_smile',
  'mouth_frown',
  'mouth_open_shock',
];

function drawSingleEye(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  side: -1 | 1,
  state: 'open' | 'blink' | 'happy' | 'sad' | 'angry' | 'surprised' | 'wink_closed',
  irisColor: string,
  lashColor: string,
  skinShadow: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  if (side === 1) {
    ctx.scale(-1, 1);
  }

  // Eyebrow
  ctx.strokeStyle = lashColor;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  if (state === 'angry') {
    ctx.moveTo(-18, -21);
    ctx.quadraticCurveTo(-2, -19, 15, -11);
  } else if (state === 'sad') {
    ctx.moveTo(-18, -14);
    ctx.quadraticCurveTo(-2, -20, 14, -22);
  } else if (state === 'surprised') {
    ctx.moveTo(-18, -23);
    ctx.quadraticCurveTo(0, -30, 15, -24);
  } else if (state === 'happy') {
    ctx.moveTo(-17, -21);
    ctx.quadraticCurveTo(0, -27, 14, -22);
  } else {
    ctx.moveTo(-17, -19);
    ctx.quadraticCurveTo(0, -24, 14, -20);
  }
  ctx.stroke();

  // Closed eye curves (blink, happy arc, wink)
  if (state === 'blink') {
    ctx.strokeStyle = lashColor;
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(-16, 4);
    ctx.quadraticCurveTo(0, 9, 15, 3);
    ctx.stroke();
    // Subtle lash tail
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-16, 4);
    ctx.lineTo(-19, 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (state === 'happy' || state === 'wink_closed') {
    ctx.strokeStyle = lashColor;
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(-16, 5);
    ctx.quadraticCurveTo(0, -10, 15, 5);
    ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-16, 5);
    ctx.lineTo(-19, 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Open Eye Geometry
  const eyeW = 16;
  const eyeH = state === 'surprised' ? 14 : state === 'angry' ? 9.5 : 11.5;

  // Soft upper eyelid shadow
  ctx.strokeStyle = skinShadow;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-15, -10);
  ctx.quadraticCurveTo(0, -16, 13, -10);
  ctx.stroke();

  // Sclera clip path
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-eyeW, 1);
  if (state === 'angry') {
    ctx.bezierCurveTo(-9, -eyeH + 2, 7, -eyeH + 4, eyeW - 1, 2);
  } else if (state === 'sad') {
    ctx.bezierCurveTo(-8, -eyeH - 1, 8, -eyeH + 1, eyeW - 1, 3);
  } else {
    ctx.bezierCurveTo(-9, -eyeH - 1, 8, -eyeH - 1, eyeW - 1, 2);
  }
  ctx.bezierCurveTo(9, eyeH - 1, -8, eyeH - 1, -eyeW, 1);
  ctx.closePath();

  // Sclera fill + top shadow
  ctx.fillStyle = '#F8FAFC';
  ctx.fill();
  ctx.clip();

  // Subtle sclera upper shadow
  const scleraGrad = ctx.createLinearGradient(0, -eyeH, 0, eyeH);
  scleraGrad.addColorStop(0, 'rgba(148, 163, 184, 0.32)');
  scleraGrad.addColorStop(0.35, 'rgba(248, 250, 252, 0)');
  ctx.fillStyle = scleraGrad;
  ctx.fillRect(-eyeW, -eyeH, eyeW * 2, eyeH * 2);

  // Iris
  const irisRadius = state === 'surprised' ? 7.4 : 8.8;
  const irisY = state === 'surprised' ? 0.5 : 1.0;
  const irisGrad = ctx.createRadialGradient(0, irisY + 2, 1, 0, irisY, irisRadius);
  irisGrad.addColorStop(0, irisColor);
  irisGrad.addColorStop(0.65, '#1E1B18');
  irisGrad.addColorStop(1, '#0F0D0C');

  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.ellipse(0.5, irisY, irisRadius * 0.92, irisRadius * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  const pupilScale = state === 'surprised' ? 0.65 : 1;
  ctx.fillStyle = '#09090B';
  ctx.beginPath();
  ctx.ellipse(0.5, irisY + 0.3, 3.6 * pupilScale, 4.2 * pupilScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lower iris warm bounce light
  ctx.fillStyle = 'rgba(255, 224, 178, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0.5, irisY + 5.2, 4.5, 2.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlights
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(-3.2, irisY - 3.6, 2.6, 2.1, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(3.6, irisY + 2.8, 1.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Upper lash line (crisp dark stroke)
  ctx.strokeStyle = lashColor;
  ctx.lineCap = 'round';
  ctx.lineWidth = state === 'angry' ? 4.0 : 3.5;
  ctx.beginPath();
  ctx.moveTo(-eyeW - 2, 1);
  if (state === 'angry') {
    ctx.bezierCurveTo(-9, -eyeH + 2, 7, -eyeH + 4, eyeW - 1, 2);
  } else if (state === 'sad') {
    ctx.bezierCurveTo(-8, -eyeH - 1, 8, -eyeH + 1, eyeW - 1, 3);
  } else {
    ctx.bezierCurveTo(-9, -eyeH - 1, 8, -eyeH - 1, eyeW - 1, 2);
  }
  ctx.stroke();

  // Subtle lower lash arc
  ctx.strokeStyle = 'rgba(28, 25, 23, 0.55)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-eyeW + 5, 7.5);
  ctx.quadraticCurveTo(0, eyeH - 0.5, eyeW - 4, 6.5);
  ctx.stroke();

  ctx.restore();
}

function drawMouth(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  key: MouthFrameKey,
  lineColor: string,
  skinShadow: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (key === 'mouth_closed') {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.quadraticCurveTo(0, 2.5, 14, 0);
    ctx.stroke();
    // Subtle lower lip shadow
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6, 6);
    ctx.quadraticCurveTo(0, 7.5, 6, 6);
    ctx.stroke();
  } else if (key === 'mouth_smile') {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(-17, -2);
    ctx.quadraticCurveTo(0, 10, 17, -2);
    ctx.stroke();
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, 9);
    ctx.quadraticCurveTo(0, 10.5, 6, 9);
    ctx.stroke();
  } else if (key === 'mouth_frown') {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-14, 4);
    ctx.quadraticCurveTo(0, -4, 14, 4);
    ctx.stroke();
  } else {
    // Open mouth states (talk_1, talk_2, talk_3, open_shock)
    const rx =
      key === 'mouth_talk_1'
        ? 11
        : key === 'mouth_talk_2'
        ? 15
        : key === 'mouth_talk_3'
        ? 9
        : 11;
    const ry =
      key === 'mouth_talk_1'
        ? 4.5
        : key === 'mouth_talk_2'
        ? 9.5
        : key === 'mouth_talk_3'
        ? 8.5
        : 12.5;

    ctx.save();
    ctx.beginPath();
    if (key === 'mouth_talk_2' || key === 'mouth_talk_1') {
      ctx.moveTo(-rx, -ry * 0.45);
      ctx.quadraticCurveTo(0, -ry * 0.65, rx, -ry * 0.45);
      ctx.quadraticCurveTo(rx * 0.9, ry, 0, ry);
      ctx.quadraticCurveTo(-rx * 0.9, ry, -rx, -ry * 0.45);
    } else {
      ctx.ellipse(0, 1, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.closePath();

    // Cavity
    ctx.fillStyle = '#581C24';
    ctx.fill();
    ctx.clip();

    // Upper teeth bar
    if (key !== 'mouth_talk_3') {
      ctx.fillStyle = '#FFFDF9';
      ctx.fillRect(-rx, -ry, rx * 2, ry * 0.52);
    }

    // Tongue
    ctx.fillStyle = '#D96B78';
    ctx.beginPath();
    ctx.ellipse(0, ry * 0.65, rx * 0.72, ry * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Mouth outline
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (key === 'mouth_talk_2' || key === 'mouth_talk_1') {
      ctx.moveTo(-rx, -ry * 0.45);
      ctx.quadraticCurveTo(0, -ry * 0.65, rx, -ry * 0.45);
      ctx.quadraticCurveTo(rx * 0.9, ry, 0, ry);
      ctx.quadraticCurveTo(-rx * 0.9, ry, -rx, -ry * 0.45);
    } else {
      ctx.ellipse(0, 1, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  ctx.restore();
}

export function generateExpressionAtlas(
  options: ExpressionStyleOptions = {}
): ExpressionAtlasBundle {
  const width = 1024;
  const height = 512;
  const cellW = 136;
  const cellH = 96;
  const startX = 12;
  const stepX = 144;
  const eyesRowY = 48;
  const mouthRowY = 208;

  const irisColor = options.irisColor ?? '#4A2E20';
  const lashColor = options.lashColor ?? '#1C1615';
  const skinShadow = options.skinShadowColor ?? 'rgba(166, 108, 76, 0.55)';

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create 2D context for expression atlas generator.');
  }

  ctx.clearRect(0, 0, width, height);

  const frames = {} as Record<AtlasFrameKey, AtlasFrameDescriptor>;

  // Row 0: Eyes
  EYE_KEYS.forEach((key, idx) => {
    const cx = startX + idx * stepX;
    const cy = eyesRowY;
    const centerX = cx + cellW / 2;
    const centerY = cy + cellH / 2 + 8;
    const eyeSeparation = 31;

    if (key === 'eyes_neutral') {
      drawSingleEye(ctx, centerX - eyeSeparation, centerY, -1, 'open', irisColor, lashColor, skinShadow);
      drawSingleEye(ctx, centerX + eyeSeparation, centerY, 1, 'open', irisColor, lashColor, skinShadow);
    } else if (key === 'eyes_blink') {
      drawSingleEye(ctx, centerX - eyeSeparation, centerY, -1, 'blink', irisColor, lashColor, skinShadow);
      drawSingleEye(ctx, centerX + eyeSeparation, centerY, 1, 'blink', irisColor, lashColor, skinShadow);
    } else if (key === 'eyes_happy') {
      drawSingleEye(ctx, centerX - eyeSeparation, centerY, -1, 'happy', irisColor, lashColor, skinShadow);
      drawSingleEye(ctx, centerX + eyeSeparation, centerY, 1, 'happy', irisColor, lashColor, skinShadow);
    } else if (key === 'eyes_sad') {
      drawSingleEye(ctx, centerX - eyeSeparation, centerY, -1, 'sad', irisColor, lashColor, skinShadow);
      drawSingleEye(ctx, centerX + eyeSeparation, centerY, 1, 'sad', irisColor, lashColor, skinShadow);
    } else if (key === 'eyes_angry') {
      drawSingleEye(ctx, centerX - eyeSeparation, centerY, -1, 'angry', irisColor, lashColor, skinShadow);
      drawSingleEye(ctx, centerX + eyeSeparation, centerY, 1, 'angry', irisColor, lashColor, skinShadow);
    } else if (key === 'eyes_surprised') {
      drawSingleEye(ctx, centerX - eyeSeparation, centerY, -1, 'surprised', irisColor, lashColor, skinShadow);
      drawSingleEye(ctx, centerX + eyeSeparation, centerY, 1, 'surprised', irisColor, lashColor, skinShadow);
    } else if (key === 'eyes_wink') {
      drawSingleEye(ctx, centerX - eyeSeparation, centerY, -1, 'open', irisColor, lashColor, skinShadow);
      drawSingleEye(ctx, centerX + eyeSeparation, centerY, 1, 'wink_closed', irisColor, lashColor, skinShadow);
    }

    frames[key] = {
      key,
      category: 'eyes',
      canvasX: cx,
      canvasY: cy,
      width: cellW,
      height: cellH,
      // PlayCanvas TextureAtlas with flipY=false uses bottom-left Y origin
      pcRect: [cx, height - (cy + cellH), cellW, cellH],
      pivot: [0.5, 0.5],
    };
  });

  // Row 1: Mouths
  MOUTH_KEYS.forEach((key, idx) => {
    const cx = startX + idx * stepX;
    const cy = mouthRowY;
    const centerX = cx + cellW / 2;
    const centerY = cy + cellH / 2;

    drawMouth(ctx, centerX, centerY, key, '#4A2622', skinShadow);

    frames[key] = {
      key,
      category: 'mouth',
      canvasX: cx,
      canvasY: cy,
      width: cellW,
      height: cellH,
      pcRect: [cx, height - (cy + cellH), cellW, cellH],
      pivot: [0.5, 0.5],
    };
  });

  return {
    width,
    height,
    imageDataUrl: canvas.toDataURL('image/png'),
    frames,
  };
}
