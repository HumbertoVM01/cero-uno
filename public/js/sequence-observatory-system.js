import { bitSeed, interpretBits } from './sequence.js';
import { playBits, playSequenceAsset, sequenceAssetIdForPair, describeBitPair } from './audio.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let activeSnapshot = null;
let activeBits = '0100011011';

function cleanBits(bits, max = 256) {
  return String(bits || '').replace(/[^01]/g, '').slice(0, max);
}

function setText(sel, value) {
  const el = $(sel);
  if (el) el.textContent = value;
}

function pairsOf(bits) {
  const clean = cleanBits(bits, 256);
  const pairs = [];
  for (let i = 0; i < clean.length; i += 2) pairs.push(clean.slice(i, i + 2).padEnd(2, '0'));
  return pairs;
}

function pairStats(bits) {
  const pairs = pairsOf(bits);
  const stats = { '00': 0, '01': 0, '10': 0, '11': 0 };
  pairs.forEach((pair) => { stats[pair] = (stats[pair] || 0) + 1; });
  return { pairs, stats };
}

function chip(label, title = '') {
  const span = document.createElement('span');
  span.className = 'sequence-chip';
  span.textContent = label;
  if (title) span.title = title;
  return span;
}

function renderPairChips(bits) {
  const root = $('#sequence-pair-chips');
  if (!root) return;
  root.innerHTML = '';
  const { pairs, stats } = pairStats(bits);
  Object.entries(stats).forEach(([pair, count]) => {
    const item = chip(`${pair} · ${count}`, describeBitPair(pair));
    item.dataset.pair = pair;
    root.appendChild(item);
  });
  const preview = pairs.slice(0, 18).join(' ');
  if (preview) root.appendChild(chip(`pares: ${preview}`, 'Primeros pares del fragmento activo'));
}

function drawSequenceVisualizer(bits) {
  const canvas = $('#sequence-visualizer');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const clean = cleanBits(bits, 160) || '0100011011';
  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, 'rgba(103,255,240,0.18)');
  bg.addColorStop(0.52, 'rgba(255,255,255,0.035)');
  bg.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const margin = 42;
  const usable = width - margin * 2;
  const mid = height * 0.5;
  const step = usable / Math.max(1, clean.length - 1);

  ctx.lineWidth = 1.4;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  for (let y = 60; y < height; y += 60) {
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.stroke();
  }

  ctx.beginPath();
  for (let i = 0; i < clean.length; i++) {
    const bit = clean[i];
    const x = margin + i * step;
    const alternation = i > 0 && clean[i] !== clean[i - 1] ? 1 : 0;
    const y = mid + (bit === '1' ? -76 : 76) + Math.sin(i * 0.75) * 18 + alternation * (bit === '1' ? -18 : 18);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(103,255,240,0.86)';
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(103,255,240,0.36)';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (let i = 0; i < clean.length; i++) {
    const bit = clean[i];
    const x = margin + i * step;
    const y = mid + (bit === '1' ? -76 : 76) + Math.sin(i * 0.75) * 18;
    ctx.beginPath();
    ctx.arc(x, y, bit === '1' ? 5.4 : 3.8, 0, Math.PI * 2);
    ctx.fillStyle = bit === '1' ? 'rgba(255,255,255,0.96)' : 'rgba(103,255,240,0.68)';
    ctx.fill();
  }

  ctx.font = '700 20px ui-monospace, monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fillText(clean.slice(0, 42), margin, height - 30);
}

export function updateSequenceObservatory(bits, meta = {}) {
  const clean = cleanBits(bits, 512);
  if (!clean) return;
  activeBits = clean;
  const title = meta.title || meta.source || 'Fragmento activo';
  setText('#sequence-current-title', title);
  setText('#sequence-current-reading', interpretBits(clean));
  if (meta.offset) setText('#sequence-offset', `Offset aleatorio: ${Number(meta.offset).toLocaleString('es-MX')} · ventana visible: ${clean.length} bits`);
  renderPairChips(clean);
  drawSequenceVisualizer(clean);
  document.body.dataset.sequenceActive = 'true';
}

function fieldSeed(snapshot) {
  const families = (snapshot?.dominant_families || []).map((f) => `${f.id}:${f.intensity}`).join('|');
  const questions = (snapshot?.home_questions || []).join('|');
  const desires = Object.values(snapshot?.creator_suggestions || {}).flat?.().join('|') || '';
  return `${snapshot?.snapshot_id || 'campo'}|${families}|${questions}|${desires}`;
}

function renderFieldWeather(snapshot) {
  const root = $('#sequence-field-weather');
  if (!root) return;
  root.innerHTML = '';
  (snapshot?.dominant_families || []).slice(0, 6).forEach((family) => {
    const card = document.createElement('article');
    card.className = 'sequence-weather-card';
    card.innerHTML = `<strong>${family.label}</strong><span>${Math.round((family.intensity || 0) * 100)}%</span><p>${family.audio_weather?.slice(0, 2).join(' · ') || family.platform_effect || 'señal latente'}</p>`;
    root.appendChild(card);
  });
}

function syncFieldToSequence(snapshot) {
  activeSnapshot = snapshot;
  const bits = bitSeed(fieldSeed(snapshot), 64);
  setText('#sequence-field-title', 'Campo traducido a semilla binaria');
  setText('#sequence-field-reading', snapshot?.field_summary || 'El Campo Social todavía no ha cargado.');
  setText('#sequence-field-bits', bits);
  setText('#sequence-field-bridge', 'El Campo Social no se publica crudo: se convierte en presión sonora, preguntas y fragmentos binarios seguros.');
  renderFieldWeather(snapshot);
  if (!activeBits || activeBits === '0100011011') updateSequenceObservatory(bits, { source: 'Campo Social → Sequencia' });
  return bits;
}

async function playActivePair(pair) {
  const assetId = sequenceAssetIdForPair(pair);
  await playSequenceAsset(assetId, { volume: 0.7 });
}

export function initSequenceObservatorySystem(snapshot) {
  const fieldBits = syncFieldToSequence(snapshot);

  $('#sequence-play-field')?.addEventListener('click', () => {
    const bits = syncFieldToSequence(activeSnapshot || snapshot);
    playBits(bits, { step: 0.052, gain: 0.92, maxBits: 64 });
    updateSequenceObservatory(bits, { source: 'Campo Social → Sequencia' });
  });

  $('#sequence-play-universal-example')?.addEventListener('click', () => {
    updateSequenceObservatory('0100011011', { source: 'Semilla pública 0100011011' });
    playBits('0100011011', { step: 0.07, gain: 1.05, maxBits: 10 });
  });

  $('#sequence-play-asset-example')?.addEventListener('click', async () => {
    updateSequenceObservatory('0100011011', { source: 'Asset Pack · ejemplo 0100011011' });
    await playSequenceAsset('example_0100011011', { volume: 0.78 });
  });

  $('#sequence-copy-field-bits')?.addEventListener('click', () => {
    const custom = $('#custom-sequence-bits');
    if (custom) custom.value = fieldBits;
    updateSequenceObservatory(fieldBits, { source: 'Bits del Campo Social copiados' });
  });

  $('#sequence-use-custom')?.addEventListener('click', () => {
    const customBits = cleanBits($('#custom-sequence-bits')?.value || '', 256) || '0100011011';
    updateSequenceObservatory(customBits, { source: 'Fragmento escrito manualmente' });
    playBits(customBits, { step: 0.052, gain: 0.96, maxBits: 128 });
  });

  $('#sequence-observe-first')?.addEventListener('click', () => {
    const bits = cleanBits($('#first-500')?.textContent || '', 256);
    updateSequenceObservatory(bits, { source: 'Primeros bits de la fuente' });
  });

  $$('.sequence-pair-button').forEach((button) => {
    button.addEventListener('click', async () => {
      const pair = button.dataset.pair || '00';
      updateSequenceObservatory(pair.repeat(12), { source: `Par ${pair} · ${describeBitPair(pair)}` });
      await playActivePair(pair);
    });
  });

  document.addEventListener('ceroUno:sequenceObserved', (event) => {
    updateSequenceObservatory(event.detail?.bits || '', event.detail || {});
  });

  updateSequenceObservatory(fieldBits, { source: 'Campo Social → Sequencia' });
}
