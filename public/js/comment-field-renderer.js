import { loadCommentFieldSnapshot, commentFieldToBodyDataset, chooseFromField } from './comment-field-engine.js';
import { playBits, playSequence } from './audio.js';
import { scentFromSeed } from './platform-assets.js';

const $ = (sel, root = document) => root.querySelector(sel);

function setText(selector, text) {
  const el = $(selector);
  if (el) el.textContent = text ?? '';
}

function renderList(selector, items, mapper = (x) => x) {
  const el = $(selector);
  if (!el) return;
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  el.innerHTML = safeItems.length
    ? safeItems.map((item) => `<li>${escapeHtml(mapper(item))}</li>`).join('')
    : '<li>El campo todavía está en silencio.</li>';
}

function renderChips(selector, items) {
  const el = $(selector);
  if (!el) return;
  const safeItems = Array.isArray(items) ? items.filter(Boolean).slice(0, 16) : [];
  el.innerHTML = safeItems.map((item) => `<span class="field-chip">${escapeHtml(item)}</span>`).join('');
}

function renderHomeWeather(selector, families) {
  const el = $(selector);
  if (!el) return;
  const list = Array.isArray(families) ? families.slice(0, 4) : [];
  el.innerHTML = list.map((family, index) => {
    const pct = Math.round((family.intensity || 0) * 100);
    const fragments = Array.isArray(family.safe_fragments) ? family.safe_fragments.slice(0, 2).join(' · ') : '';
    return `
      <article class="home-weather-card" data-family="${escapeHtml(family.id)}" style="--meter:${pct}%">
        <span>0${index + 1}</span>
        <strong>${escapeHtml(family.label)}</strong>
        <i>${pct}%</i>
        <p>${escapeHtml(family.readout || fragments || '')}</p>
      </article>`;
  }).join('');
}

function renderHomeQuestions(selector, questions) {
  const el = $(selector);
  if (!el) return;
  const list = Array.isArray(questions) ? questions.slice(0, 8) : [];
  el.innerHTML = list.map((q, idx) => `<a href="${idx < 4 ? '#archivo' : '#campo'}" class="home-question-pill">${escapeHtml(q)}</a>`).join('');
}

function renderHomeTensions(selector, tensions) {
  const el = $(selector);
  if (!el) return;
  const list = Array.isArray(tensions) ? tensions.slice(0, 4) : [];
  el.innerHTML = list.map((tension) => `
    <article class="home-tension-mini">
      <strong>${escapeHtml(tension.title || tension.id || 'Tensión')}</strong>
      <span>${escapeHtml(tension.seed_phrase || '')}</span>
    </article>`).join('');
}

function renderHomeArchivePulse(selector, entries) {
  const el = $(selector);
  if (!el) return;
  const first = Array.isArray(entries) ? entries[0] : null;
  el.innerHTML = first ? `
    <div class="tagline">Archivo sugerido por el campo</div>
    <strong>${escapeHtml(first.title || 'Entrada viva')}</strong>
    <p>${escapeHtml(first.body || '')}</p>
  ` : '<p>El archivo espera la siguiente formulación del campo.</p>';
}

const FIELD_COLOR_HEX = {
  'lila': '#c7a4ff', 'blanco': '#fffaf5', 'rosa': '#ff8bd7', 'amarillo pastel': '#fff176',
  'azul fuerte': '#275dff', 'azul claro': '#76ddff', 'verde': '#5dff9c', 'menta': '#9fffd7',
  'rojo': '#ff304f', 'café': '#8b5e3c', 'negro': '#111111', 'sandía': '#ff3f6e',
  'mandarina': '#ff9f2e', 'algodón de azúcar': '#ffc6f5'
};
const FIELD_EYE_HEX = { 'negros': '#050505', 'blancos': '#ffffff', 'azules': '#57b7ff', 'grises': '#a9a9a9', 'lila': '#c7a4ff' };

function colorFromFieldName(name, fallbackSeed) {
  const key = String(name || '').toLowerCase();
  if (FIELD_COLOR_HEX[key]) return FIELD_COLOR_HEX[key];
  if (FIELD_EYE_HEX[key]) return FIELD_EYE_HEX[key];
  let h = 2166136261;
  const s = String(fallbackSeed || key);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `#${((h >>> 0) & 0xFFFFFF).toString(16).padStart(6, '0')}`;
}

function seedCreatorFromField(snapshot) {
  if (window.__ceroUnoApplyCreatorFieldSeed) {
    window.__ceroUnoApplyCreatorFieldSeed('field');
    location.hash = '#creator';
    window.__ceroUnoShowTab?.('creator', true);
    return;
  }
  const form = $('#creator-form');
  if (!form) return;
  const suggestions = snapshot.creator_suggestions || {};
  const colors = suggestions.colors || [];
  const eyes = suggestions.eyes || [];
  const scent = chooseFromField(suggestions.scents, `${snapshot.snapshot_id}|home|scent|${Date.now()}`) || scentFromSeed(`${snapshot.snapshot_id}|home`);
  const pickColor = (slot) => colorFromFieldName(chooseFromField(colors, `${snapshot.snapshot_id}|${slot}|${Date.now()}`), slot);
  form.elements.body_hex.value = pickColor('body');
  form.elements.top_hex.value = pickColor('top');
  form.elements.left_arm_hex.value = pickColor('left_arm');
  form.elements.right_arm_hex.value = pickColor('right_arm');
  form.elements.left_leg_hex.value = pickColor('left_leg');
  form.elements.right_leg_hex.value = pickColor('right_leg');
  form.elements.left_eye_hex.value = colorFromFieldName(chooseFromField(eyes, `${snapshot.snapshot_id}|left_eye|${Date.now()}`), 'left_eye');
  form.elements.right_eye_hex.value = colorFromFieldName(chooseFromField(eyes, `${snapshot.snapshot_id}|right_eye|${Date.now()}`), 'right_eye');
  form.elements.scent.value = scent.slice(0, 100);
  form.dispatchEvent(new Event('input', { bubbles: true }));
  document.dispatchEvent(new CustomEvent('ceroUno:creatorSeedChanged', { detail: { origin: 'home / campo social', bits: '0100011011' } }));
  location.hash = '#creator';
  window.__ceroUnoShowTab?.('creator', true);
}

function renderFamilyMeters(selector, families) {
  const el = $(selector);
  if (!el) return;
  const list = Array.isArray(families) ? families : [];
  el.innerHTML = list.map((family) => {
    const pct = Math.round((family.intensity || 0) * 100);
    return `
      <article class="field-meter glass" data-family="${escapeHtml(family.id)}">
        <div class="field-meter-head">
          <strong>${escapeHtml(family.label)}</strong>
          <span>${pct}%</span>
        </div>
        <div class="field-meter-bar"><i style="width:${pct}%"></i></div>
        <p>${escapeHtml(family.readout || '')}</p>
        <small>${escapeHtml(family.platform_effect || '')}</small>
      </article>`;
  }).join('');
}

function renderTensions(selector, tensions) {
  const el = $(selector);
  if (!el) return;
  const list = Array.isArray(tensions) ? tensions : [];
  el.innerHTML = list.map((tension) => `
    <article class="tension-card glass">
      <div class="tagline">Tensión AEMP</div>
      <h3>${escapeHtml(tension.title || tension.id || 'Tensión')}</h3>
      <p>${escapeHtml(tension.seed_phrase || '')}</p>
      <small>${escapeHtml(Array.isArray(tension.frames) ? tension.frames.join(' · ') : '')}</small>
    </article>
  `).join('');
}

function renderArchiveEntries(selector, entries) {
  const el = $(selector);
  if (!el) return;
  const list = Array.isArray(entries) ? entries : [];
  el.innerHTML = list.map((entry) => `
    <article class="archive-field-entry glass">
      <div class="tagline">${escapeHtml(entry.type || 'entrada')}</div>
      <h3>${escapeHtml(entry.title || '')}</h3>
      <p>${escapeHtml(entry.body || '')}</p>
    </article>
  `).join('');
}

function applySnapshotToBody(snapshot) {
  const dataset = commentFieldToBodyDataset(snapshot);
  Object.entries(dataset).forEach(([key, value]) => { document.body.dataset[key] = value; });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

function wireFieldActions(snapshot) {
  const playHomeField = () => {
    const seed = snapshot.audio_weather?.sequence_seed || '0100011011';
    playSequence(`${seed}|${snapshot.snapshot_id}|campo`, 48);
  };

  $('#listen-field-button')?.addEventListener('click', playHomeField);
  $('#home-listen-field')?.addEventListener('click', playHomeField);
  $('#home-seed-creator-button')?.addEventListener('click', () => seedCreatorFromField(snapshot));

  $('#play-field-weather-button')?.addEventListener('click', () => {
    const families = snapshot.dominant_families || [];
    const bits = families.map((f) => (f.intensity > 0.86 ? '11' : f.intensity > 0.78 ? '10' : f.intensity > 0.66 ? '01' : '00')).join('');
    playBits(bits || '0100011011', { step: 0.065, gain: 0.94, maxBits: 64 });
  });

  $('#use-field-scent-button')?.addEventListener('click', () => {
    const form = $('#creator-form');
    const input = form?.elements?.scent;
    const fromField = chooseFromField(snapshot.creator_suggestions?.scents, `${snapshot.snapshot_id}|scent|${Date.now()}`);
    if (input) {
      input.value = (fromField || scentFromSeed(`${snapshot.snapshot_id}|fallback`)).slice(0, 100);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      location.hash = '#creator';
      window.__ceroUnoShowTab?.('creator', true);
    }
  });
}

export async function initCommentField() {
  const snapshot = await loadCommentFieldSnapshot();
  window.__ceroUnoCommentField = snapshot;
  applySnapshotToBody(snapshot);

  setText('#home-field-summary', snapshot.field_summary);
  setText('#home-field-phrase', snapshot.governing_phrase);
  setText('#comment-field-summary', snapshot.field_summary);
  setText('#comment-field-cycle', snapshot.cycle_interpretation);
  setText('#comment-field-id', snapshot.snapshot_id);

  renderFamilyMeters('#comment-field-families', snapshot.dominant_families);
  renderList('#comment-field-questions', snapshot.home_questions);
  renderList('#comment-field-directives', snapshot.platform_directives);
  renderChips('#field-colors', snapshot.creator_suggestions?.colors);
  renderChips('#field-eyes', snapshot.creator_suggestions?.eyes);
  renderChips('#field-formats', snapshot.creator_suggestions?.formats);
  renderChips('#field-scents', snapshot.creator_suggestions?.scents);
  renderHomeWeather('#home-field-weather', snapshot.dominant_families);
  renderHomeQuestions('#home-question-cloud', snapshot.home_questions);
  renderChips('#home-field-colors', snapshot.creator_suggestions?.colors);
  renderChips('#home-field-formats', snapshot.creator_suggestions?.formats);
  renderChips('#home-field-scents', snapshot.creator_suggestions?.scents);
  renderHomeTensions('#home-tension-stack', snapshot.aemp_tensions);
  renderHomeArchivePulse('#home-archive-pulse', snapshot.archive_entries);
  setText('#home-creator-prompt', snapshot.creator_suggestions?.collective_prompt || 'El campo todavía no ha formulado un deseo dominante.');
  renderTensions('#comment-field-tensions', snapshot.aemp_tensions);
  renderArchiveEntries('#comment-field-archive-entries', snapshot.archive_entries);

  const top = (snapshot.dominant_families || []).slice().sort((a, b) => b.intensity - a.intensity)[0];
  setText('#home-field-top', top ? `${top.label} · ${Math.round(top.intensity * 100)}%` : 'Campo cargando');
  setText('#home-field-effect', top?.platform_effect || 'La plataforma espera el siguiente ciclo de escucha.');

  wireFieldActions(snapshot);
  return snapshot;
}
