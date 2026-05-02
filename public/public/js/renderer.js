import { hashToUint32, mulberry32, bitSeed } from './sequence.js';

const ASSETS = {
  pompom: '/assets/pompom.png',
  gem: '/assets/gem.png'
};

export const PART_KEYS = [
  'body_hex', 'top_hex', 'left_arm_hex', 'right_arm_hex',
  'left_leg_hex', 'right_leg_hex', 'left_eye_hex', 'right_eye_hex'
];

const images = {};
export async function loadAssets() {
  await Promise.all(Object.entries(ASSETS).map(([key, src]) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { images[key] = img; resolve(); };
    img.onerror = reject;
    img.src = src;
  })));
}

function drawTinted(ctx, img, cx, cy, size, color, material = 'pompom') {
  const temp = document.createElement('canvas');
  temp.width = size;
  temp.height = size;
  const tctx = temp.getContext('2d');
  tctx.clearRect(0, 0, size, size);
  tctx.drawImage(img, 0, 0, size, size);

  // Alpha-locked material tint: transparent pixels stay transparent.
  if (color && color.toUpperCase() !== '#FFFFFF') {
    tctx.globalCompositeOperation = 'multiply';
    tctx.fillStyle = color;
    tctx.fillRect(0, 0, size, size);
    tctx.globalCompositeOperation = 'destination-in';
    tctx.drawImage(img, 0, 0, size, size);
    if (material === 'gem') {
      tctx.globalCompositeOperation = 'screen';
      tctx.fillStyle = 'rgba(255,255,255,0.16)';
      tctx.fillRect(0, 0, size, size);
      tctx.globalCompositeOperation = 'destination-in';
      tctx.drawImage(img, 0, 0, size, size);
    }
  }
  ctx.drawImage(temp, cx - size / 2, cy - size / 2, size, size);
}

export function genomeFromForm(form) {
  const data = new FormData(form);
  const out = {};
  for (const key of PART_KEYS) out[key] = String(data.get(key) || '#FFFFFF').toUpperCase();
  out.scent = String(data.get('scent') || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  return out;
}

export function genomeCode(z) {
  return PART_KEYS.map((k) => z[k]).join('-');
}

export function renderZeroOne(canvas, z, opts = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = opts.width || canvas.clientWidth || 280;
  const cssH = opts.height || canvas.clientHeight || 360;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const code = genomeCode(z);
  const rng = mulberry32(hashToUint32(`${code}|${z.scent || ''}`));
  const t = performance.now() / 1000;

  // Aura binaria determinista: el genoma invoca la secuencia.
  const bits = bitSeed(code, 96);
  ctx.save();
  ctx.globalAlpha = 0.45;
  for (let i = 0; i < bits.length; i++) {
    const angle = i * 0.38 + t * (bits[i] === '1' ? 0.18 : -0.12);
    const radius = 100 + (i % 12) * 3 + Math.sin(t + i) * 4;
    const x = cssW / 2 + Math.cos(angle) * radius;
    const y = cssH / 2 + Math.sin(angle) * radius * 0.75;
    ctx.fillStyle = bits[i] === '1' ? 'rgba(103,255,240,0.34)' : 'rgba(255,255,255,0.17)';
    ctx.font = '11px ui-monospace, monospace';
    ctx.fillText(bits[i], x, y);
  }
  ctx.restore();

  const size = Math.min(cssW * 0.52, cssH * 0.48) * (opts.scale || 1);
  const body = size;
  const top = body * 0.50;
  const limb = body * 0.25;
  const eye = body * 0.285;
  const eyeDist = eye * 1.5;
  const cx = cssW / 2;
  const cy = cssH * 0.52 + Math.sin(t * 2 + rng() * 2) * 3;
  const armY = cy + body * 0.02;
  const sway = Math.sin(t * 1.8 + rng() * 4) * 4;

  ctx.save();
  ctx.shadowColor = 'rgba(103,255,240,0.22)';
  ctx.shadowBlur = 18;
  // limbs behind body
  drawTinted(ctx, images.pompom, cx - body * 0.49 - sway, armY, limb, z.left_arm_hex);
  drawTinted(ctx, images.pompom, cx + body * 0.49 + sway, armY, limb, z.right_arm_hex);
  drawTinted(ctx, images.pompom, cx - body * 0.30 + sway * 0.5, cy + body * 0.40, limb, z.left_leg_hex);
  drawTinted(ctx, images.pompom, cx + body * 0.30 - sway * 0.5, cy + body * 0.40, limb, z.right_leg_hex);
  drawTinted(ctx, images.pompom, cx, cy, body, z.body_hex);
  drawTinted(ctx, images.pompom, cx, cy - body * 0.50 + Math.sin(t * 2.2) * 2, top, z.top_hex);
  ctx.shadowBlur = 6;
  drawTinted(ctx, images.gem, cx - eyeDist / 2, armY, eye, z.left_eye_hex, 'gem');
  drawTinted(ctx, images.gem, cx + eyeDist / 2, armY, eye, z.right_eye_hex, 'gem');
  ctx.restore();
}

export function drawCertificate(canvas, z) {
  renderZeroOne(canvas, z, { width: 900, height: 1200, scale: 1.05 });
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.66)';
  ctx.fillRect(0, 0, 900, 180);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px Inter, system-ui, sans-serif';
  ctx.fillText('CERTIFICADO DE COMPARECENCIA', 48, 70);
  ctx.font = '22px ui-monospace, monospace';
  ctx.fillStyle = '#67fff0';
  ctx.fillText(genomeCode(z), 48, 115);
  ctx.font = '24px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Olor: ${z.scent || 'sin olor declarado'}`, 48, 152);
  ctx.restore();
}
