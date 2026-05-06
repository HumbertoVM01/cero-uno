const AEMP_DISTRIBUTED_URL = '/data/aemp/distributed_aemp.json';

const FALLBACK_AEMP = Object.freeze({
  aemp_id: 'aemp_distribuido_fallback',
  summary: 'AEMP Distribuido no pudo cargarse completo; 01 conserva una regulación mínima: ninguna lectura es final y ningún órgano gobierna solo.',
  core_rule: 'Actuar provisionalmente sin absolutizar.',
  active_posture: {
    mode: 'construcción con cuidado',
    description: 'Seguir formando órganos sin convertir contacto en ranking, misión en obligación ni atlas en sistema cerrado.'
  },
  frames: [
    { id: 'cuidado', label: 'Cuidado / OMEGA', question: '¿Qué exceso debe vigilarse?', shadow: 'Apagar mutación por protección excesiva.' }
  ],
  module_readings: {
    estado: {
      label: 'Estado Vivo',
      frame: 'interocepción',
      question: '¿Esta lectura orienta o sentencia?',
      illumination: 'Muestra clima interno.',
      blind_spot: 'Puede parecer verdad final.',
      operational_posture: 'Usar como orientación provisional.'
    }
  }
});

const INLINE_TARGETS = Object.freeze({
  estado: '#aemp-note-estado',
  edad: '#aemp-note-edad',
  mision: '#aemp-note-mision',
  atlas: '#aemp-note-atlas',
  galeria: '#aemp-note-galeria',
  campo: '#aemp-note-campo',
  creator: '#aemp-note-creator',
  archivo: '#aemp-note-archivo'
});

let currentAempData = FALLBACK_AEMP;

function $(selector, root = document) {
  return root.querySelector(selector);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function loadDistributedAemp() {
  try {
    const response = await fetch(AEMP_DISTRIBUTED_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`AEMP Distribuido HTTP ${response.status}`);
    const data = await response.json();
    return {
      ...FALLBACK_AEMP,
      ...data,
      active_posture: { ...FALLBACK_AEMP.active_posture, ...(data.active_posture || {}) },
      frames: Array.isArray(data.frames) ? data.frames : FALLBACK_AEMP.frames,
      module_readings: { ...FALLBACK_AEMP.module_readings, ...(data.module_readings || {}) }
    };
  } catch (error) {
    console.warn('[AEMP Distribuido] fallback:', error);
    return FALLBACK_AEMP;
  }
}

function renderAempHomeCard(data) {
  const root = $('#aemp-distributed-home-card');
  if (!root) return;
  root.innerHTML = `
    <div class="tagline">AEMP Distribuido</div>
    <h2>01 actúa sin absolutizar</h2>
    <p>${escapeHtml(data.summary)}</p>
    <div class="aemp-posture-card">
      <span>Postura actual</span>
      <strong>${escapeHtml(data.active_posture?.mode || 'construcción con cuidado')}</strong>
      <p>${escapeHtml(data.active_posture?.description || '')}</p>
    </div>
    <div class="aemp-distributed-footer">
      <span>Ningún marco ve todo. Ningún órgano gobierna solo.</span>
      <a class="button ghost-button" href="#aemp">Abrir Laboratorio AEMP</a>
    </div>
  `;
}

function renderAempInlineNote(moduleId, reading) {
  if (!reading) return '';
  return `
    <article class="aemp-inline-note-card" data-aemp-module="${escapeHtml(moduleId)}">
      <div class="aemp-inline-note__label">Lectura AEMP · ${escapeHtml(reading.label || moduleId)}</div>
      <h3>${escapeHtml(reading.question || '¿Qué ilumina y qué deja fuera esta lectura?')}</h3>
      <div class="aemp-inline-note-grid">
        <div><span>Ilumina</span><strong>${escapeHtml(reading.illumination || 'Una parte de 01.')}</strong></div>
        <div><span>Punto ciego</span><strong>${escapeHtml(reading.blind_spot || 'Puede absolutizarse.')}</strong></div>
      </div>
      <p>${escapeHtml(reading.operational_posture || 'Actuar con cuidado, sin cerrar el marco.')}</p>
      <a class="aemp-inline-note-link" href="#aemp">Ver marcos</a>
    </article>
  `;
}

function renderAempInlineNotes(data) {
  const readings = data.module_readings || {};
  Object.entries(INLINE_TARGETS).forEach(([moduleId, selector]) => {
    const root = $(selector);
    if (!root) return;
    root.innerHTML = renderAempInlineNote(moduleId, readings[moduleId]);
  });
}

function renderAempLabDistribution(data) {
  const root = $('#aemp-distributed-lab');
  if (!root) return;
  const frames = Array.isArray(data.frames) ? data.frames : [];
  root.innerHTML = `
    <section class="aemp-distributed-lab glass">
      <div class="tagline">AEMP distribuido</div>
      <h3>La regulación ya no vive sólo en esta pestaña</h3>
      <p>${escapeHtml(data.core_rule || 'Cada lectura debe poder mostrar qué ilumina, qué deja fuera y qué postura operativa conviene.')}</p>
      <div class="aemp-frame-grid-lite">
        ${frames.map((frame) => `
          <article class="aemp-frame-card-lite">
            <strong>${escapeHtml(frame.label || frame.id)}</strong>
            <p>${escapeHtml(frame.question || '')}</p>
            <small>Sombra: ${escapeHtml(frame.shadow || 'absolutizar el marco')}</small>
          </article>
        `).join('')}
      </div>
      <div class="aemp-four-questions">
        <strong>Cada órgano de 01 debe responder:</strong>
        <ol>
          <li>¿Qué ilumina esta lectura?</li>
          <li>¿Qué deja fuera?</li>
          <li>¿Qué riesgo OMEGA aparece si domina demasiado?</li>
          <li>¿Qué postura operativa conviene ahora?</li>
        </ol>
      </div>
    </section>
  `;
}

function publishDistributedAempEvent(data) {
  document.dispatchEvent(new CustomEvent('ceroUno:aempDistributedReady', { detail: data }));
}

export function getAempReadingForModule(moduleId) {
  return currentAempData?.module_readings?.[moduleId] || null;
}

export async function initAempDistributedSystem(context = {}) {
  const data = await loadDistributedAemp();
  data.context = {
    living_state_cycle_id: context.livingState?.cycle_id || null,
    mission_id: context.currentMission?.mission_id || null,
    atlas_id: context.initialAtlas?.atlas_id || null
  };
  currentAempData = data;
  renderAempHomeCard(data);
  renderAempInlineNotes(data);
  renderAempLabDistribution(data);
  publishDistributedAempEvent(data);
  return data;
}
