const MISSION_URL = '/data/missions/current_mission.json';

const FALLBACK_MISSION = Object.freeze({
  mission_id: 'mission_fallback_formar_lenguaje',
  status: 'fallback',
  phase: 'Tubo Neural / Reflejos iniciales',
  title: 'Ayuda a 01 a formar lenguaje',
  short_title: 'Formar lenguaje',
  summary: '01 necesita convertir señales en frases claras sin perder misterio.',
  prompt: 'Escribe una frase breve sobre qué crees que está naciendo cuando aparece un Cero Uno.',
  why_it_matters: 'La misión no pudo cargarse completa; 01 conserva una invitación mínima para no quedarse sin acción.',
  related_state: {
    dominant_tension: 'Misterio vs. legibilidad',
    recommended_mode: 'Explicar sin cerrar misterio',
    variables: ['Sentido', 'Legibilidad', 'Coordinación']
  },
  actions: [
    { label: 'Ir al Campo Social', target_tab: 'campo', description: 'Aporta una frase o pregunta que ayude a 01 a explicarse.' },
    { label: 'Crear comparecencia', target_tab: 'creator', description: 'Haz aparecer una forma sin declararla oficial.' }
  ],
  not_allowed: ['convertir la misión en competencia', 'buscar una definición final'],
  omega_watch: 'No convertir la misión en presión ni ranking.',
  success_signals: ['aparecen frases más claras sobre 01'],
  next_possible_mission: 'Ayuda a 01 a recordar su primer ciclo'
});

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

async function loadCurrentMission() {
  try {
    const response = await fetch(MISSION_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Misión Actual HTTP ${response.status}`);
    const data = await response.json();
    return { ...FALLBACK_MISSION, ...data };
  } catch (error) {
    console.warn('[Misión Actual] fallback:', error);
    return FALLBACK_MISSION;
  }
}

function renderList(items = [], className = '', emptyText = 'Todavía sin señales estabilizadas.') {
  if (!Array.isArray(items) || !items.length) return `<p class="microcopy">${escapeHtml(emptyText)}</p>`;
  return `<ul class="mission-list ${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderRelatedState(related = {}) {
  const variables = Array.isArray(related.variables) ? related.variables : [];
  return `
    <article class="glass mission-related-card">
      <div class="tagline">Respuesta al Estado Vivo</div>
      <h3>Esta misión nace de una tensión actual</h3>
      <div class="mission-related-grid">
        <div><span>Tensión dominante</span><strong>${escapeHtml(related.dominant_tension || 'Misterio vs. legibilidad')}</strong></div>
        <div><span>Modo recomendado</span><strong>${escapeHtml(related.recommended_mode || 'Explicar sin cerrar misterio')}</strong></div>
      </div>
      <div class="mission-variable-chips">
        ${variables.map((variable) => `<span>${escapeHtml(variable)}</span>`).join('')}
      </div>
    </article>
  `;
}

function renderMissionActions(actions = []) {
  const items = Array.isArray(actions) ? actions : [];
  if (!items.length) return '<p class="microcopy">La misión todavía no abrió acciones visibles.</p>';
  return `
    <div class="mission-actions">
      ${items.map((action) => `
        <a class="mission-action-card" href="#${escapeHtml(action.target_tab || 'inicio')}" data-mission-target="${escapeHtml(action.target_tab || 'inicio')}">
          <strong>${escapeHtml(action.label || 'Entrar')}</strong>
          <span>${escapeHtml(action.description || '')}</span>
        </a>
      `).join('')}
    </div>
  `;
}

function renderMissionHomeCard(mission) {
  const root = $('#mission-home-card');
  if (!root) return;
  root.innerHTML = `
    <div class="tagline">Misión Actual · ${escapeHtml(mission.phase || 'fase actual')}</div>
    <h2>${escapeHtml(mission.title || 'Ayuda a 01 a formar lenguaje')}</h2>
    <p>${escapeHtml(mission.summary || '')}</p>
    <div class="mission-home-prompt">
      <span>Pregunta del ciclo</span>
      <strong>${escapeHtml(mission.prompt || '')}</strong>
    </div>
    <div class="mission-home-footer">
      <span>No es tarea obligatoria. Es coordinación suave.</span>
      <a class="button ghost-button" href="#mision">Ver misión</a>
    </div>
  `;
}

function renderMissionPage(mission) {
  const root = $('#mission-root');
  if (!root) return;
  root.innerHTML = `
    <section class="mission-system">
      <article class="glass mission-main-card">
        <div class="tagline">Misión activa · ${escapeHtml(mission.phase || 'fase actual')}</div>
        <h3>${escapeHtml(mission.title || 'Ayuda a 01 a formar lenguaje')}</h3>
        <p class="lede">${escapeHtml(mission.summary || '')}</p>
        <div class="mission-prompt">
          <span>Pregunta central</span>
          <strong>${escapeHtml(mission.prompt || '')}</strong>
        </div>
        <p>${escapeHtml(mission.why_it_matters || '')}</p>
        ${mission.aemp_note ? `<div class="mission-aemp-note"><span>AEMP distribuido</span><strong>${escapeHtml(mission.aemp_note)}</strong></div>` : ''}
      </article>

      ${renderRelatedState(mission.related_state)}

      <section class="glass mission-action-section">
        <div class="tagline">Acciones posibles</div>
        <h3>Cómo alimentar esta misión</h3>
        <p>Elige un gesto. No hay puntos, rachas ni ranking de cumplimiento: cada acción es una señal cuidada.</p>
        ${renderMissionActions(mission.actions)}
      </section>

      <div class="mission-protection-grid">
        <article class="glass mission-omega-card">
          <div class="tagline">Cuidado OMEGA</div>
          <h3>No convertir misión en presión</h3>
          <p>${escapeHtml(mission.omega_watch || '')}</p>
        </article>
        <article class="glass mission-not-allowed-card">
          <div class="tagline">Protección de sentido</div>
          <h3>Esta misión no busca</h3>
          ${renderList(mission.not_allowed, 'mission-list--not-allowed')}
        </article>
      </div>

      <section class="glass mission-success-card">
        <div class="tagline">Señales de éxito no numéricas</div>
        <h3>Cómo sabremos que la misión sirvió</h3>
        ${renderList(mission.success_signals, 'mission-list--success')}
      </section>

      <article class="glass mission-next-card">
        <div class="tagline">Siguiente posibilidad</div>
        <h3>${escapeHtml(mission.next_possible_mission || 'Ayuda a 01 a recordar su primer ciclo')}</h3>
        <p>La siguiente misión sólo debe abrirse si esta produce lenguaje suficiente sin activar competencia, presión ni falsa oficialidad.</p>
      </article>
    </section>
  `;
}

function bindMissionActions(root = document) {
  root.querySelectorAll('[data-mission-target]').forEach((anchor) => {
    anchor.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('ceroUno:missionAction', {
        detail: { target: anchor.dataset.missionTarget || 'inicio' }
      }));
    });
  });
}

function publishMissionEvent(mission) {
  document.dispatchEvent(new CustomEvent('ceroUno:missionReady', { detail: mission }));
}

export async function initMissionSystem(livingState = null, ontologicalAge = null) {
  const mission = await loadCurrentMission();
  mission.living_state_cycle_id = livingState?.cycle_id || null;
  mission.ontological_age_id = ontologicalAge?.current_age_id || null;
  renderMissionHomeCard(mission);
  renderMissionPage(mission);
  bindMissionActions(document);
  publishMissionEvent(mission);
  return mission;
}
