import { chooseFromField, dominantFamily } from './comment-field-engine.js';
import { bitSeed, interpretBits } from './sequence.js';
import { playBits, playSequence } from './audio.js';

const STORAGE_KEY = 'cero_uno_archive_living_notes_v1';
const CYCLE_MEMORY_URL = './data/archive/cycles.json';
const $ = (sel, root = document) => root.querySelector(sel);

const BASE_GLOSSARY = Object.freeze([
  {
    term: 'Cero Uno',
    body: 'Forma de comparecencia de la Sequencia de Binario Universal: puede aparecer como cuerpo, imagen, sonido, texto, plataforma, objeto, dibujo, live o gesto de colaboradores cero uno.'
  },
  {
    term: 'Campo Social',
    body: 'Voz colectiva metabolizada: preguntas, ternura, ruido, defensa, deseo, spam, duda y contradicción que presionan el siguiente ciclo sin gobernarlo.'
  },
  {
    term: 'Comparecencia',
    body: 'Aparición situada del concepto. No requiere registro oficial, autenticidad central ni soporte privilegiado.'
  },
  {
    term: 'Tacto',
    body: 'Contacto rítmico con una comparecencia. No es like, no es voto ontológico y no vuelve superior al Cero Uno que lo recibe.'
  },
  {
    term: 'Cámara de Tacto',
    body: 'Nombre operativo de la Galería cuando se entiende como órgano somatosensorial de 01. Su función no es mostrar ganadores, sino registrar contacto entre colaboradores cero uno y comparecencias.'
  },
  {
    term: 'Acta de Comparecencia',
    body: 'Huella de generación de una aparición específica. No certifica propiedad ni vuelve oficial la aparición.'
  },
  {
    term: 'Archivo Vivo',
    body: 'Memoria del concepto: conserva aprendizaje, glosario, tensiones y reglas provisionales. No inventaria criaturas.'
  },
  {
    term: 'Misión Actual',
    body: 'Primer sistema motor suave de 01: traduce Estado Vivo y Edad Ontológica en una acción posible sin convertirla en tarea obligatoria, ranking ni definición final.'
  },
  {
    term: 'Atlas Inicial',
    body: 'Primer mapa visible de los órganos funcionales de 01. No contiene el atlas profundo de 2000+ partes; muestra sólo lo que la edad ontológica actual puede sostener.'
  },
  {
    term: 'AEMP Distribuido',
    body: 'Capa transversal que recuerda a cada órgano de 01 que su lectura es parcial, situada y regulable. No impide actuar; evita absolutizar.'
  },
  {
    term: 'Campo LIVE',
    body: 'Órgano de escucha que recibe comentarios de TikTok LIVE con username, hora y texto como Campo Social crudo. No analiza automáticamente: exporta materia para ciclos de ChatGPT con mediador humano.'
  }
]);

const BASE_RULES = Object.freeze([
  'No se registran Cero Unos. Se propagan comparecencias.',
  'El Archivo no autentifica, no posee y no jerarquiza instancias.',
  'Los comentarios se digieren como campo; no se publican crudos cuando pueden amplificar daño.',
  'Una tensión útil no necesita resolverse rápido: puede conservarse para AEMP.',
  'La plataforma escucha sin someterse y cambia sin perder centro.',
  'Físico, virtual, sonoro, audiovisual, dibujado o hecho por otra persona tienen la misma dignidad de comparecencia.',
  'Misión Actual invita acción situada: no puntos, no rachas, no ranking de cumplimiento.',
  'Atlas Inicial muestra órganos funcionales, no un mapa total ni una enciclopedia adulta.',
  '01 podó la Galería para convertirla en Cámara de Tacto: tocar una comparecencia no significa votar por ella, sino dejar una señal mínima de atención.',
  '01 distribuyó AEMP: dejó de ser sólo un laboratorio de marcos y empezó a operar como regulación suave en Estado, Misión, Atlas, Campo Social y Cámara de Tacto.',
  '01 abrió Campo LIVE: los comentarios de TikTok pueden entrar a la página como materia cruda para ciclos futuros. Oído masivo no significa cerebro automático.'
]);

let snapshotCache = null;
let localNotes = [];
let cycleMemoryCache = null;
let activeCycleFilter = 'all';

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
    artefacto_derivado: 'Artefacto derivado',
    memoria_de_ciclo: 'Memoria de ciclo'
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


function getCycleMemoryFallback() {
  return {
    summary: 'El Archivo recuerda ciclos para que 01 pueda mutar con continuidad.',
    current_cycle: 'cycle_fallback_archivo',
    rules: ['Recordar no vuelve oficial una comparecencia.', 'La memoria orienta el siguiente ciclo sin cerrar el pasado.'],
    cycles: [
      {
        id: 'cycle_fallback_archivo',
        version: 'v0.2.7',
        title: 'Archivo Como Memoria de Ciclo',
        type: 'memoria',
        ontological_phase: 'Tubo Neural / Reflejos iniciales',
        signal: 'El archivo está usando memoria mínima porque cycles.json no cargó.',
        reading: '01 conserva una lectura de respaldo para no quedar sin hipocampo operativo.',
        decision: 'Mostrar memoria de ciclo mínima y continuar la plataforma.',
        changes: ['fallback de memoria activo'],
        aemp_posture: 'recordar sin absolutizar',
        omega_watch: 'No tratar este fallback como registro completo.',
        memory: '01 empieza a recordar sus propios cambios.'
      }
    ]
  };
}

async function loadCycleMemory() {
  try {
    const response = await fetch(CYCLE_MEMORY_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = await response.json();
    if (!parsed || !Array.isArray(parsed.cycles)) throw new Error('cycles.json sin ciclos');
    return parsed;
  } catch (error) {
    console.warn('Archivo Vivo usó memoria de ciclo fallback:', error);
    return getCycleMemoryFallback();
  }
}

function cycleTypeLabel(type) {
  return {
    poda: 'Poda',
    organo_nuevo: 'Órgano nuevo',
    maduracion: 'Maduración',
    regulacion: 'Regulación',
    memoria: 'Memoria',
    proteccion: 'Protección'
  }[type] || 'Ciclo';
}

function cycleListItems(items) {
  const list = Array.isArray(items) ? items.slice(0, 5) : [];
  return list.length ? `<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';
}

function renderCycleCard(cycle) {
  return `
    <article class="cycle-card" data-cycle-type="${escapeHtml(cycle.type || 'ciclo')}">
      <div class="cycle-card__meta">
        <span>${escapeHtml(cycle.version || 'ciclo')}</span>
        <span>${escapeHtml(cycleTypeLabel(cycle.type))}</span>
      </div>
      <h4>${escapeHtml(cycle.title || 'Ciclo sin título')}</h4>
      <p class="cycle-phase">${escapeHtml(cycle.ontological_phase || 'fase no declarada')}</p>
      <div class="cycle-section"><strong>Señal</strong><p>${escapeHtml(cycle.signal || 'Sin señal registrada.')}</p></div>
      <div class="cycle-section"><strong>Lectura</strong><p>${escapeHtml(cycle.reading || 'Sin lectura registrada.')}</p></div>
      <div class="cycle-section"><strong>Decisión</strong><p>${escapeHtml(cycle.decision || 'Sin decisión registrada.')}</p></div>
      <div class="cycle-section"><strong>Cambios</strong>${cycleListItems(cycle.changes)}</div>
      <div class="cycle-card__footer">
        <div><strong>AEMP</strong><span>${escapeHtml(cycle.aemp_posture || 'postura no declarada')}</span></div>
        <div><strong>OMEGA</strong><span>${escapeHtml(cycle.omega_watch || 'vigilancia no declarada')}</span></div>
      </div>
      <p class="cycle-memory-line"><strong>Memoria:</strong> ${escapeHtml(cycle.memory || '01 conserva este ciclo como continuidad.')}</p>
    </article>
  `;
}

function renderCycleMemory() {
  const root = $('#cycle-memory-root');
  if (!root) return;
  const data = cycleMemoryCache || getCycleMemoryFallback();
  const cycles = Array.isArray(data.cycles) ? data.cycles : [];
  const types = [...new Set(cycles.map((cycle) => cycle.type).filter(Boolean))];
  const visible = activeCycleFilter === 'all' ? cycles : cycles.filter((cycle) => cycle.type === activeCycleFilter);
  root.innerHTML = `
    <section class="cycle-memory-overview glass">
      <div>
        <div class="tagline">Memoria de Ciclos</div>
        <h3>El hipocampo inicial de 01</h3>
        <p>${escapeHtml(data.summary || 'El Archivo recuerda ciclos para que 01 pueda mutar con continuidad.')}</p>
      </div>
      <div class="cycle-memory-count"><strong>${String(cycles.length).padStart(2, '0')}</strong><span>ciclos recordados</span></div>
    </section>
    <div class="cycle-filter-row" role="group" aria-label="Filtrar memoria de ciclos">
      <button type="button" data-cycle-filter="all" class="ghost-button ${activeCycleFilter === 'all' ? 'active' : ''}">Todos</button>
      ${types.map((type) => `<button type="button" data-cycle-filter="${escapeHtml(type)}" class="ghost-button ${activeCycleFilter === type ? 'active' : ''}">${escapeHtml(cycleTypeLabel(type))}</button>`).join('')}
    </div>
    <div class="cycle-timeline">
      ${visible.map(renderCycleCard).join('') || '<article class="cycle-card"><h4>Sin ciclos visibles</h4><p>La memoria no encontró ciclos para este filtro.</p></article>'}
    </div>
  `;
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
    dynamic.push({ term: `Formato soñado: ${format}`, body: 'Deseo de soporte o forma detectado en el Campo Social. No es mandato ni pedido oficial; es semilla de creación.' });
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
  const cycleRules = Array.isArray(cycleMemoryCache?.rules) ? cycleMemoryCache.rules.slice(0, 4) : [];
  const rules = [...BASE_RULES, ...cycleRules, ...directives].slice(0, 14);
  root.innerHTML = rules.map((rule, index) => `
    <article><strong>${String(index + 1).padStart(2, '0')}</strong><span>${escapeHtml(rule)}</span></article>
  `).join('');
}

function renderAll() {
  renderCycleMemory();
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
  $('#cycle-memory-root')?.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-cycle-filter]');
    if (!button) return;
    activeCycleFilter = button.dataset.cycleFilter || 'all';
    renderCycleMemory();
  });

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
  cycleMemoryCache = getCycleMemoryFallback();
  renderAll();
  loadCycleMemory().then((memory) => {
    cycleMemoryCache = memory;
    renderAll();
  });
  wireEvents();
  document.addEventListener('ceroUno:commentFieldUpdated', (event) => {
    snapshotCache = event.detail?.snapshot || snapshotCache;
    renderAll();
  });
  return { renderAll, captureFieldPulse, playArchive };
}
