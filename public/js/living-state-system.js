const STATE_URL = '/data/state/current_state.json';

const FALLBACK_STATE = Object.freeze({
  cycle_id: 'cero_uno_estado_vivo_fallback',
  updated_at_label: 'lectura mínima',
  ontological_age: {
    phase: 'Tubo Neural / Reflejos iniciales',
    short_label: 'Sistema nervioso naciente',
    description: '01 está formando sus primeros órganos de lectura. Este fallback aparece cuando no pudo cargarse el Estado Vivo completo.',
    can_do: ['recibir tacto', 'crear comparecencias', 'escuchar el Campo Social'],
    cannot_do_yet: ['gobernar', 'jerarquizar', 'certificar oficialidad']
  },
  variables: {
    energia: { label: 'Energía', value: 50, reading: 'Lectura mínima de energía disponible.' },
    sentido: { label: 'Sentido', value: 40, reading: 'Lectura mínima de sentido compartido.' },
    mutacion: { label: 'Mutación', value: 60, reading: 'La mutación sigue activa como forma de vida.' },
    omega: { label: 'OMEGA', value: 20, reading: 'Vigilancia mínima de captura y exceso.' }
  },
  dominant_tension: 'Misterio vs. legibilidad',
  recommended_mode: 'Explicar sin cerrar misterio',
  dominant_reading: 'Estado Vivo no pudo cargarse completo; 01 vuelve a una lectura mínima.',
  soft_warning: 'Si algo falla, 01 debe pausar, cuidar y volver a una forma legible.',
  next_needed_organ: 'Misión Actual',
  active_organs: []
});

function $(selector, root = document) {
  return root.querySelector(selector);
}

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function loadLivingState() {
  try {
    const response = await fetch(STATE_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Estado Vivo HTTP ${response.status}`);
    const data = await response.json();
    return { ...FALLBACK_STATE, ...data };
  } catch (error) {
    console.warn('[Estado Vivo] fallback:', error);
    return FALLBACK_STATE;
  }
}

function renderList(items = [], className = '') {
  if (!items.length) return '<p class="microcopy">Todavía sin lista estabilizada.</p>';
  return `<ul class="living-state-list ${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderOntologicalAge(age = {}) {
  return `
    <article class="glass living-age-card">
      <div class="tagline">Edad ontológica</div>
      <h3>${escapeHtml(age.phase || 'Tubo Neural / Reflejos iniciales')}</h3>
      <p>${escapeHtml(age.description || '')}</p>
      <div class="living-age-grid">
        <div>
          <strong>01 ya puede</strong>
          ${renderList(age.can_do || [], 'living-state-list--can')}
        </div>
        <div>
          <strong>01 todavía no debe</strong>
          ${renderList(age.cannot_do_yet || [], 'living-state-list--cannot')}
        </div>
      </div>
    </article>
  `;
}

function renderVariableCard([key, variable]) {
  const value = clampPercent(variable?.value);
  const label = variable?.label || key;
  const isOmega = key.toLowerCase() === 'omega';
  return `
    <article class="living-variable-card${isOmega ? ' living-variable-card--omega' : ''}" data-variable="${escapeHtml(key)}">
      <div class="living-variable-head">
        <strong>${escapeHtml(label)}</strong>
        <span>${value}</span>
      </div>
      <div class="living-variable-meter" aria-label="${escapeHtml(label)} ${value} de 100">
        <div class="living-variable-fill" style="width:${value}%"></div>
      </div>
      <p>${escapeHtml(variable?.reading || 'Lectura todavía en formación.')}</p>
    </article>
  `;
}

function renderVariableGrid(variables = {}) {
  const entries = Object.entries(variables);
  return `
    <section class="living-variable-section">
      <div class="living-section-head">
        <div>
          <div class="tagline">Variables de clima</div>
          <h3>No son trofeos: son señales de desarrollo</h3>
        </div>
        <p>Estas variables orientan cuándo explicar, cuidar, mutar, pausar, abrir, cerrar, coordinar o salir al mundo.</p>
      </div>
      <div class="living-variable-grid">
        ${entries.map(renderVariableCard).join('')}
      </div>
    </section>
  `;
}

function renderActiveOrgans(organs = []) {
  if (!organs.length) return '';
  return `
    <section class="glass living-organs-card">
      <div class="tagline">Órganos activos</div>
      <h3>Atlas inicial todavía en formación</h3>
      <div class="living-organs-grid">
        ${organs.map((organ) => `
          <article>
            <strong>${escapeHtml(organ.name)}</strong>
            <span>${escapeHtml(organ.system_01)}</span>
            <p>${escapeHtml(organ.reason)}</p>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderLivingState(state) {
  const root = $('#living-state-root');
  if (!root) return;
  root.innerHTML = `
    <div class="living-state-overview">
      ${renderOntologicalAge(state.ontological_age)}
      <article class="glass living-reading-card">
        <div class="tagline">Lectura dominante</div>
        <h3>${escapeHtml(state.dominant_tension || 'Tensión en formación')}</h3>
        <p class="lede">${escapeHtml(state.dominant_reading || '01 está aprendiendo a leerse sin convertirse en marcador.')}</p>
        <div class="living-mode-pill">Modo actual · ${escapeHtml(state.recommended_mode || 'explicar sin cerrar misterio')}</div>
        <div class="living-warning-card">
          <strong>Cuidado OMEGA</strong>
          <span>${escapeHtml(state.soft_warning || 'Vigilar captura, presión y exceso.')}</span>
        </div>
        <div class="living-next-organ">Próximo órgano necesario: <strong>${escapeHtml(state.next_needed_organ || 'Misión Actual')}</strong></div>
      </article>
    </div>
    ${renderVariableGrid(state.variables)}
    ${renderActiveOrgans(state.active_organs)}
  `;
}

function renderHomeCard(state) {
  const root = $('#living-state-home-card');
  if (!root) return;
  const age = state.ontological_age || FALLBACK_STATE.ontological_age;
  root.innerHTML = `
    <div class="tagline">Estado Vivo</div>
    <h2>01 está formando su sistema nervioso</h2>
    <p class="lede">Edad ontológica: <strong>${escapeHtml(age.phase)}</strong></p>
    <p>${escapeHtml(state.dominant_reading || FALLBACK_STATE.dominant_reading)}</p>
    <div class="living-home-footer">
      <span>Modo actual · ${escapeHtml(state.recommended_mode || FALLBACK_STATE.recommended_mode)}</span>
      <a class="button ghost-button" href="#estado">Ver Estado Vivo</a>
    </div>
  `;
}

function publishLivingStateEvent(state) {
  document.dispatchEvent(new CustomEvent('ceroUno:livingStateReady', { detail: state }));
}

export async function initLivingState(commentSnapshot = null) {
  const state = await loadLivingState();
  state.comment_snapshot_id = commentSnapshot?.snapshot_id || commentSnapshot?.id || null;
  renderLivingState(state);
  renderHomeCard(state);
  publishLivingStateEvent(state);
  return state;
}
