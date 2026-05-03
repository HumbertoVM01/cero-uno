import { chooseFromField, dominantFamily } from './comment-field-engine.js';
import { scentFromSeed } from './platform-assets.js';
import { playBits, playSequence } from './audio.js';

const $ = (sel, root = document) => root.querySelector(sel);
const PART_KEYS = ['body_hex','top_hex','left_arm_hex','right_arm_hex','left_leg_hex','right_leg_hex','left_eye_hex','right_eye_hex'];

const FIELD_COLOR_HEX = {
  'lila': '#c7a4ff', 'blanco': '#fffaf5', 'rosa': '#ff8bd7', 'amarillo pastel': '#fff176',
  'azul fuerte': '#275dff', 'azul claro': '#76ddff', 'verde': '#5dff9c', 'menta': '#9fffd7',
  'rojo': '#ff304f', 'café': '#8b5e3c', 'negro': '#111111', 'sandía': '#ff3f6e',
  'mandarina': '#ff9f2e', 'algodón de azúcar': '#ffc6f5', 'coco': '#fff8e7', 'limón': '#ddff33',
  'mango': '#ffb52e', 'plátano': '#ffe56a', 'uva': '#9b5cff', 'frambuesa': '#e5326d',
  'cereza': '#b9002d', 'hierbabuena': '#8dffb2', 'vainilla': '#fff0bf', 'baby powder': '#d7efff',
  'peppermint': '#d7fff6'
};

const FIELD_EYE_HEX = {
  'negros': '#050505', 'blancos': '#ffffff', 'azules': '#57b7ff', 'grises': '#a9a9a9',
  'uno azul y uno verde': '#57b7ff', 'lila': '#c7a4ff', 'verdes': '#5dff9c'
};

const MODE_POOLS = {
  field: { label: 'campo social completo', colors: null, scents: null, formats: null, eyes: null, bits: '0100011011' },
  tender: {
    label: 'ternura pastel',
    colors: ['lila', 'blanco', 'rosa', 'amarillo pastel', 'azul claro', 'menta', 'algodón de azúcar'],
    scents: ['coco', 'baby powder', 'vainilla', 'algodón de azúcar'],
    formats: ['llavero', 'broche', 'avatar'],
    eyes: ['blancos', 'azules', 'lila'],
    bits: '0101110101'
  },
  question: {
    label: 'pregunta viva',
    colors: ['azul claro', 'verde', 'menta', 'blanco'],
    scents: ['limón', 'hierbabuena', 'café'],
    formats: ['avatar', 'sticker', 'funda'],
    eyes: ['azules', 'grises', 'blancos'],
    bits: '0101010001'
  },
  value: {
    label: 'tensión valor / retorno blando',
    colors: ['negro', 'blanco', 'rojo', 'café', 'azul fuerte'],
    scents: ['café', 'peppermint', 'mango'],
    formats: ['broche', 'gorro', 'llavero'],
    eyes: ['negros', 'grises', 'blancos'],
    bits: '1110000101'
  },
  surprise: {
    label: 'mutación sorpresa',
    colors: ['sandía', 'mandarina', 'verde', 'uva', 'rojo', 'lila', 'azul fuerte'],
    scents: ['sandía', 'mango', 'plátano', 'uva', 'frambuesa', 'cereza'],
    formats: ['gigante', 'vela', 'peluche', 'almohada', 'gorro'],
    eyes: ['negros', 'azules', 'uno azul y uno verde'],
    bits: '0110111010'
  }
};

let localState = {
  snapshot: null,
  seedOrigin: 'manual',
  activeMode: null,
  activeFormat: '',
  lastBits: '0100011011'
};

function setText(selector, text) {
  const el = $(selector);
  if (el) el.textContent = text ?? '';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

function hashToHex(seed) {
  let h = 2166136261;
  const s = String(seed || 'cero_uno_field');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `#${((h >>> 0) & 0xFFFFFF).toString(16).padStart(6, '0')}`;
}

function colorFromFieldName(name, fallbackSeed) {
  const key = String(name || '').toLowerCase().trim();
  if (FIELD_COLOR_HEX[key]) return FIELD_COLOR_HEX[key];
  if (FIELD_EYE_HEX[key]) return FIELD_EYE_HEX[key];
  return hashToHex(fallbackSeed || key);
}

function normalizeList(list) {
  return Array.isArray(list) ? list.filter(Boolean).map(String) : [];
}

function unique(values) {
  return [...new Set(normalizeList(values))];
}

function poolFor(snapshot, mode, key) {
  const suggestions = snapshot?.creator_suggestions || {};
  const modePool = MODE_POOLS[mode] || MODE_POOLS.field;
  if (modePool[key]) return unique(modePool[key]);
  if (key === 'colors') return unique(suggestions.colors);
  if (key === 'eyes') return unique(suggestions.eyes);
  if (key === 'scents') return unique(suggestions.scents);
  if (key === 'formats') return unique(suggestions.formats);
  return [];
}

function pick(list, seed) {
  return chooseFromField(list, seed) || '';
}

function dispatchInput(form) {
  form.dispatchEvent(new Event('input', { bubbles: true }));
}

function updateReadouts() {
  setText('#creator-seed-origin', localState.seedOrigin || 'manual');
  setText('#creator-format-readout', localState.activeFormat || 'sin formato declarado');
  setText('#creator-field-genome-note', localState.seedOrigin === 'manual'
    ? 'Genoma manual · el campo puede sembrar, pero no gobierna.'
    : `Genoma sembrado por ${localState.seedOrigin}. Puedes editar cualquier parte.`);
}

function formEl() {
  return $('#creator-form');
}

function applyFormat(format) {
  const form = formEl();
  localState.activeFormat = format || '';
  if (form?.elements?.local_format) {
    form.elements.local_format.value = localState.activeFormat;
  }
  updateReadouts();
}

function setSeedOrigin(origin, bits = null) {
  localState.seedOrigin = origin || 'manual';
  if (bits) localState.lastBits = bits;
  updateReadouts();
  document.dispatchEvent(new CustomEvent('ceroUno:creatorSeedChanged', { detail: { origin: localState.seedOrigin, format: localState.activeFormat, bits: localState.lastBits } }));
}

export function applyCreatorFieldSeed(snapshot = localState.snapshot, mode = 'field') {
  const form = formEl();
  if (!form || !snapshot) return;
  const now = `${Date.now()}|${performance.now?.() || 0}`;
  const colors = poolFor(snapshot, mode, 'colors');
  const eyes = poolFor(snapshot, mode, 'eyes');
  const scents = poolFor(snapshot, mode, 'scents');
  const formats = poolFor(snapshot, mode, 'formats');
  const modeInfo = MODE_POOLS[mode] || MODE_POOLS.field;
  const colorForSlot = (slot) => colorFromFieldName(pick(colors, `${snapshot.snapshot_id}|${mode}|${slot}|${now}`), `${mode}|${slot}`);

  form.elements.body_hex.value = colorForSlot('body');
  form.elements.top_hex.value = colorForSlot('top');
  form.elements.left_arm_hex.value = colorForSlot('left_arm');
  form.elements.right_arm_hex.value = colorForSlot('right_arm');
  form.elements.left_leg_hex.value = colorForSlot('left_leg');
  form.elements.right_leg_hex.value = colorForSlot('right_leg');
  form.elements.left_eye_hex.value = colorFromFieldName(pick(eyes, `${snapshot.snapshot_id}|${mode}|left_eye|${now}`), `${mode}|left_eye`);
  form.elements.right_eye_hex.value = colorFromFieldName(pick(eyes, `${snapshot.snapshot_id}|${mode}|right_eye|${now}`), `${mode}|right_eye`);
  form.elements.scent.value = (pick(scents, `${snapshot.snapshot_id}|${mode}|scent|${now}`) || scentFromSeed(`${snapshot.snapshot_id}|${mode}|scent`)).slice(0, 100);
  applyFormat(pick(formats, `${snapshot.snapshot_id}|${mode}|format|${now}`));
  dispatchInput(form);
  setSeedOrigin(modeInfo.label || mode, modeInfo.bits || '0100011011');
  document.body.dataset.creatorSeed = mode;
}

function applyChip(category, value) {
  const form = formEl();
  if (!form || !value) return;
  const seed = `${localState.snapshot?.snapshot_id || 'field'}|chip|${category}|${value}|${Date.now()}`;
  if (category === 'color') {
    const slot = pick(['body_hex', 'top_hex', 'left_arm_hex', 'right_arm_hex', 'left_leg_hex', 'right_leg_hex'], seed) || 'body_hex';
    form.elements[slot].value = colorFromFieldName(value, seed);
    setSeedOrigin(`chip de color: ${value}`, '0110');
  }
  if (category === 'eye') {
    const slot = pick(['left_eye_hex', 'right_eye_hex'], seed) || 'left_eye_hex';
    form.elements[slot].value = colorFromFieldName(value, seed);
    setSeedOrigin(`chip de ojo: ${value}`, '0101');
  }
  if (category === 'scent') {
    form.elements.scent.value = String(value).slice(0, 100);
    setSeedOrigin(`chip de olor: ${value}`, '0011');
  }
  if (category === 'format') {
    applyFormat(String(value).slice(0, 60));
    setSeedOrigin(`chip de formato: ${value}`, '1010');
  }
  dispatchInput(form);
}

function renderClickableChips(selector, items, category) {
  const el = $(selector);
  if (!el) return;
  const list = normalizeList(items).slice(0, 18);
  el.innerHTML = list.map((item) => `<button type="button" class="field-chip field-chip-button" data-category="${category}" data-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('');
  el.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => applyChip(button.dataset.category, button.dataset.value));
  });
}

function fieldBitsFromSnapshot(snapshot) {
  const families = normalizeList(snapshot?.dominant_families).length ? snapshot.dominant_families : [];
  const bits = families.map((f) => (Number(f.intensity || 0) > 0.9 ? '11' : Number(f.intensity || 0) > 0.82 ? '10' : '01')).join('');
  return bits || localState.lastBits || '0100011011';
}

function wireButtons(snapshot) {
  $('#creator-seed-field')?.addEventListener('click', () => applyCreatorFieldSeed(snapshot, 'field'));
  $('#creator-seed-tender')?.addEventListener('click', () => applyCreatorFieldSeed(snapshot, 'tender'));
  $('#creator-seed-question')?.addEventListener('click', () => applyCreatorFieldSeed(snapshot, 'question'));
  $('#creator-seed-value')?.addEventListener('click', () => applyCreatorFieldSeed(snapshot, 'value'));
  $('#creator-seed-surprise')?.addEventListener('click', () => applyCreatorFieldSeed(snapshot, 'surprise'));
  $('#creator-listen-field-seed')?.addEventListener('click', () => {
    const bits = fieldBitsFromSnapshot(snapshot);
    playBits(bits, { step: 0.07, gain: 0.88, maxBits: 80 });
  });
  $('#suggest-field-scent-button')?.addEventListener('click', () => {
    const scent = pick(snapshot?.creator_suggestions?.scents || [], `${snapshot?.snapshot_id}|field-scent|${Date.now()}`) || scentFromSeed(`${snapshot?.snapshot_id}|field-scent`);
    const form = formEl();
    if (form?.elements?.scent) {
      form.elements.scent.value = scent.slice(0, 100);
      dispatchInput(form);
      setSeedOrigin(`olor del campo: ${scent}`, '0011');
    }
  });
  formEl()?.elements?.local_format?.addEventListener('input', (event) => {
    localState.activeFormat = String(event.target.value || '').slice(0, 60);
    updateReadouts();
  });
}

export function initCreatorFieldSystem(snapshot) {
  localState.snapshot = snapshot;
  const top = dominantFamily(snapshot);
  setText('#creator-field-summary', snapshot?.field_summary || 'El campo espera su siguiente snapshot.');
  setText('#creator-field-prompt', snapshot?.creator_suggestions?.collective_prompt || 'Crear desde una señal suave, sin obedecerla literalmente.');
  setText('#creator-field-status', top ? `${top.label} · ${Math.round((top.intensity || 0) * 100)}%` : 'campo disponible');
  renderClickableChips('#creator-suggestion-colors', snapshot?.creator_suggestions?.colors, 'color');
  renderClickableChips('#creator-suggestion-eyes', snapshot?.creator_suggestions?.eyes, 'eye');
  renderClickableChips('#creator-suggestion-formats', snapshot?.creator_suggestions?.formats, 'format');
  renderClickableChips('#creator-suggestion-scents', snapshot?.creator_suggestions?.scents, 'scent');
  wireButtons(snapshot);
  updateReadouts();
  window.__ceroUnoApplyCreatorFieldSeed = (mode = 'field') => applyCreatorFieldSeed(snapshot, mode);
  document.addEventListener('ceroUno:externalFieldSeed', (event) => {
    const mode = event.detail?.mode || 'field';
    applyCreatorFieldSeed(snapshot, mode);
  });
}
