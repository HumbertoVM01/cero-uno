import { chooseFromField, dominantFamily } from './comment-field-engine.js';
import { bitSeed, interpretBits } from './sequence.js';
import { playBits, playSequence } from './audio.js';

const STORAGE_KEY = 'cero_uno_archive_living_notes_v1';
const $ = (sel, root = document) => root.querySelector(sel);

const BASE_GLOSSARY = Object.freeze([
  {
    term: 'Cero Uno',
    body: 'Forma de comparecencia de la Sequencia de Binario Universal: puede aparecer como cuerpo, imagen, sonido, texto, plataforma, objeto, dibujo, live o gesto comunitario.'
  },
  {
    term: 'Campo Social',
    body: 'Voz colectiva metabolizada: preguntas, ternura, ruido, defensa, deseo, spam, duda y contradicción que presionan el siguiente ciclo sin gobernarlo.'
  },
  {
    term: 'Comparecencia',
    body: 'Aparición situada del concepto. No requiere registro, autenticidad oficial ni soporte privilegiado.'
  },
  {
    term: 'Tap',
    body: 'Contacto rítmico con una comparecencia. No es like, no es voto ontológico y no vuelve superior al Cero Uno que lo recibe.'
  },
  {
    term: 'Acta de Comparecencia',
    body: 'Huella de generación de una aparición específica. No certifica propiedad ni oficialidad.'
  },
  {
    term: 'Archivo Vivo',
    body: 'Memoria del concepto: conserva aprendizaje, glosario, tensiones y reglas provisionales. No inventaria criaturas.'
  }
]);

const BASE_RULES = Object.freeze([
  'No se registran Cero Unos. Se propagan comparecencias.',
  'El Archivo no autentifica, no posee y no jerarquiza instancias.',
  'Los comentarios se digieren como campo; no se publican crudos cuando pueden amplificar daño.',
  'Una tensión útil no necesita resolverse rápido: puede conservarse para AEMP.',
  'La plataforma escucha sin someterse y cambia sin perder centro.',
  'Físico, virtual, sonoro, audiovisual, dibujado o hecho por otra persona tienen la misma dignidad de comparecencia.'
]);

let snapshotCache = null;
let localNotes = [];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function setText(sel, value) {
  const el = $(sel);
  if (el) el.textContent = value == null ? '' : String(value);
}

function typeLabel(type) {
  return {
    pensamiento_en_voz_alta: 'Pensamiento en voz alta',
    glosario_vivo: 'Glosario vivo',
    tension_conservada: 'Tensión conservada',
    regla_provisional: 'Regla provisional',
    mutacion_observada: 'Mutación observada',
    artefacto_derivado: 'Artefacto derivado'
  }[type] || 'Memoria viva';
}

function loadLocalNotes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 40) : [];
  } catch (_) {
    return [];
  }
}

function saveLocalNotes() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(localNotes.slice(0, 40))); } catch (_) {}
}

function makeEntry(type, title, body, source = 'archive-living', extra = {}) {
  const bits = bitSeed(`${type}|${title}|${body}|${source}`, 24);
  return {
    id: `${type}_${Math.abs(hashCode(`${title}|${body}|${source}`))}`,
    type,
    title,
    body,
    source,
    bits,
    reading: interpretBits(bits),
    created_at: new Date().toISOString(),
    ...extra
  };
}

function hashCode(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i += 1) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h;
}

function snapshotEntries(snapshot) {
  const entries = [];
  (snapshot?.archive_entries || []).forEach((entry, index) => {
    entries.push(makeEntry(
      entry.type || 'pensamiento_en_voz_alta',
      entry.title || `Entrada del campo ${index + 1}`,
      entry.body || 'El campo dejó una formulación sin cuerpo.',
      'comment-field-snapshot',
      { created_at: snapshot?.snapshot_id || 'snapshot' }
    ));
  });

  const top = dominantFamily(snapshot);
  if (top) {
    entries.push(makeEntry(
      'pensamiento_en_voz_alta',
      `Familia dominante: ${top.label}`,
      `${top.readout || 'El campo marcó una familia dominante.'} Efecto de plataforma: ${top.platform_effect || 'seguir escuchando sin someterse.'}`,
      'dominant-family'
    ));
  }

  const prompt = snapshot?.creator_suggestions?.collective_prompt;
  if (prompt) {
    entries.push(makeEntry('artefacto_derivado', 'Semilla de Creador desde el campo', prompt, 'creator-suggestions'));
  }

  return entries;
}

function tensionEntries(snapshot) {
  const tensions = Array.isArray(snapshot?.aemp_tensions) ? snapshot.aemp_tensions : [];
  return tensions.map((tension, index) => {
    const title = tension?.title || String(tension || `Tensión ${index + 1}`);
    const seed = tension?.seed_phrase || title;
    return makeEntry(
      'tension_conservada',
      title,
      `Frase semilla: “${seed}”. Esta tensión no se cierra desde una defensa única; entra al Archivo para seguir produciendo lectura AEMP.`,
      'aemp-field'
    );
  });
}

function directiveEntries(snapshot) {
  return (Array.isArray(snapshot?.platform_directives) ? snapshot.platform_directives : []).slice(0, 8).map((directive) => (
    makeEntry('regla_provisional', directive, 'Directiva derivada del snapshot del Campo Social. Útil para este ciclo; revisable en el siguiente.', 'platform-directive')
  ));
}

function allEntries() {
  const fromSnapshot = snapshotEntries(snapshotCache);
  const tensions = tensionEntries(snapshotCache).slice(0, 5);
  const directives = directiveEntries(snapshotCache).slice(0, 6);
  return [...localNotes, ...fromSnapshot, ...tensions, ...directives].slice(0, 36);
}

function renderPulse() {
  const top = dominantFamily(snapshotCache);
  setText('#archive-field-title', top ? `Archivo escuchando: ${top.label}` : 'Archivo escuchando el campo');
  setText('#archive-field-summary', snapshotCache?.field_summary || 'El Archivo todavía espera un snapshot.');
  const bits = bitSeed(`${snapshotCache?.snapshot_id || 'archive'}|${top?.id || 'field'}`, 10);
  setText('#archive-pulse-bits', bits);
  document.body.dataset.archivePulse = top?.id || 'field';
}

function renderEntries() {
  const root = $('#archive-entry-grid');
  if (!root) return;
  const entries = allEntries();
  setText('#archive-entry-count', `${entries.length} entradas`);
  root.innerHTML = entries.map((entry) => `
    <article class="archive-live-entry" data-type="${escapeHtml(entry.type)}">
      <div class="archive-live-entry-head">
        <span>${escapeHtml(typeLabel(entry.type))}</span>
        <code>${escapeHtml(entry.bits || '0100011011')}</code>
      </div>
      <h4>${escapeHtml(entry.title)}</h4>
      <p>${escapeHtml(entry.body)}</p>
      <small>${escapeHtml(entry.source || 'archivo')} · ${escapeHtml(entry.reading || 'lectura pendiente')}</small>
    </article>
  `).join('');
}

function renderGlossary() {
  const root = $('#archive-glossary-dynamic');
  if (!root) return;
  const dynamic = [];
  const top = dominantFamily(snapshotCache);
  if (top) dynamic.push({ term: `Familia dominante: ${top.label}`, body: top.readout || 'Familia activa del Campo Social.' });
  (snapshotCache?.creator_suggestions?.formats || []).slice(0, 4).forEach((format) => {
    dynamic.push({ term: `Formato soñado: ${format}`, body: 'Deseo de soporte o forma detectado en el Campo Social. No es pedido oficial; es semilla de creación.' });
  });
  const items = [...BASE_GLOSSARY, ...dynamic].slice(0, 12);
  root.innerHTML = items.map((item, index) => `
    <details class="memory-detail" ${index === 0 ? 'open' : ''}>
      <summary>${escapeHtml(item.term)}</summary>
      <p>${escapeHtml(item.body)}</p>
    </details>
  `).join('');
}

function renderTensions() {
  const root = $('#archive-tension-grid');
  if (!root) return;
  const items = tensionEntries(snapshotCache).slice(0, 6);
  root.innerHTML = items.length ? items.map((entry) => `
    <div data-type="${escapeHtml(entry.type)}"><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(entry.body)}</span></div>
  `).join('') : '<div><strong>Esperando tensiones</strong><span>El Archivo todavía no recibió tensiones del Campo Social.</span></div>';
}

function renderRules() {
  const root = $('#archive-rule-grid');
  if (!root) return;
  const directives = (snapshotCache?.platform_directives || []).slice(0, 6);
  const rules = [...BASE_RULES, ...directives].slice(0, 12);
  root.innerHTML = rules.map((rule, index) => `
    <article><strong>${String(index + 1).padStart(2, '0')}</strong><span>${escapeHtml(rule)}</span></article>
  `).join('');
}

function renderAll() {
  renderPulse();
  renderEntries();
  renderGlossary();
  renderTensions();
  renderRules();
}

function addLocalEntry(entry) {
  localNotes.unshift(entry);
  localNotes = localNotes.slice(0, 40);
  saveLocalNotes();
  renderAll();
  document.dispatchEvent(new CustomEvent('ceroUno:toast', { detail: 'Archivo Vivo guardó una nota local del ciclo.' }));
}

function captureFieldPulse() {
  const top = dominantFamily(snapshotCache);
  const scent = chooseFromField(snapshotCache?.creator_suggestions?.scents || [], 'archive-field') || 'archivo vivo';
  addLocalEntry(makeEntry(
    'pensamiento_en_voz_alta',
    top ? `Pulso del campo: ${top.label}` : 'Pulso del campo',
    `${snapshotCache?.field_summary || 'El campo se sintió latente.'} El Archivo lo conserva con olor a ${scent}, como memoria de ciclo y no como veredicto final.`,
    'manual-field-capture'
  ));
  playArchive();
}

function saveManualNote() {
  const type = $('#archive-note-type')?.value || 'pensamiento_en_voz_alta';
  const title = ($('#archive-note-title')?.value || '').trim();
  const body = ($('#archive-note-body')?.value || '').trim();
  if (!title || !body) {
    document.dispatchEvent(new CustomEvent('ceroUno:toast', { detail: 'El Archivo necesita título y cuerpo para guardar la formulación.' }));
    return;
  }
  addLocalEntry(makeEntry(type, title.slice(0, 90), body.slice(0, 720), 'local-note'));
  if ($('#archive-note-title')) $('#archive-note-title').value = '';
  if ($('#archive-note-body')) $('#archive-note-body').value = '';
}

function clearLocal() {
  localNotes = [];
  saveLocalNotes();
  renderAll();
  document.dispatchEvent(new CustomEvent('ceroUno:toast', { detail: 'Notas locales del Archivo limpiadas. El snapshot público permanece.' }));
}

function playArchive() {
  const top = dominantFamily(snapshotCache);
  const seed = `archive|${snapshotCache?.snapshot_id || 'field'}|${top?.id || 'memory'}|${localNotes.length}`;
  const bits = playSequence(seed, 36);
  setText('#archive-pulse-bits', bits.slice(0, 10));
  return bits;
}

function wireEvents() {
  $('#archive-listen-memory')?.addEventListener('click', () => playArchive());
  $('#archive-capture-field')?.addEventListener('click', captureFieldPulse);
  $('#archive-save-note')?.addEventListener('click', saveManualNote);
  $('#archive-clear-local')?.addEventListener('click', clearLocal);

  document.addEventListener('ceroUno:creatorSeedChanged', (event) => {
    const detail = event.detail || {};
    addLocalEntry(makeEntry(
      'mutacion_observada',
      `Creador sembrado: ${detail.origin || 'semilla local'}`,
      `El Creador cambió por ${detail.origin || 'una acción local'}${detail.format ? ` con formato imaginado “${detail.format}”` : ''}. El Archivo conserva la mutación como evento de ciclo, no como instancia oficial.`,
      'creator-event',
      { bits: detail.bits || bitSeed(detail.origin || 'creator', 24) }
    ));
  });

  document.addEventListener('ceroUno:aempTensionPlayed', (event) => {
    const tension = event.detail?.tension;
    if (!tension) return;
    addLocalEntry(makeEntry(
      'tension_conservada',
      `AEMP escuchó: ${tension.title}`,
      `La tensión “${tension.seed_phrase || tension.title}” fue sonificada. Marco activo: ${event.detail?.frame || 'sin marco'}; modo: ${event.detail?.mode || 'sin modo'}.`,
      'aemp-event',
      { bits: event.detail?.bits || bitSeed(tension.id || tension.title, 24) }
    ));
  });

  document.addEventListener('ceroUno:sequenceObserved', (event) => {
    const bits = String(event.detail?.bits || '').slice(0, 48);
    if (!bits) return;
    addLocalEntry(makeEntry(
      'mutacion_observada',
      'Sequencia observada',
      `Se consultó un fragmento de la Sequencia: ${bits}. Lectura: ${interpretBits(bits)}.`,
      'sequence-event',
      { bits }
    ));
  });
}

export function initArchiveLivingSystem(snapshot) {
  snapshotCache = snapshot || {};
  localNotes = loadLocalNotes();
  renderAll();
  wireEvents();
  document.addEventListener('ceroUno:commentFieldUpdated', (event) => {
    snapshotCache = event.detail?.snapshot || snapshotCache;
    renderAll();
  });
  return { renderAll, captureFieldPulse, playArchive };
}
