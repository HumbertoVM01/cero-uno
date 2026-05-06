const ONTOLOGICAL_AGE_URL = '/data/development/ontological_age.json';

const FALLBACK_AGE = Object.freeze({
  current_age_id: 'age_fallback_tubo_neural',
  current_label: 'Tubo Neural / Reflejos iniciales',
  short_label: 'Sistema nervioso naciente',
  phase_number: 'Edad 3–4',
  public_summary: '01 está formando sus primeros órganos de lectura. Este fallback aparece cuando no pudo cargarse la Edad Ontológica completa.',
  development_reading: 'La edad ontológica no pudo cargarse completa; 01 vuelve a una lectura mínima para no fingir madurez.',
  can_do: ['recibir tacto', 'crear comparecencias', 'escuchar el Campo Social', 'mostrar Estado Vivo'],
  cannot_do_yet: ['gobernar colectivamente', 'jerarquizar colaboradores cero uno', 'certificar Cero Unos oficiales'],
  current_organs: ['Campo Social', 'Creador', 'Cámara de Tacto', 'Estado Vivo'],
  next_needed_organ: {
    name: 'Misión Actual',
    reason: '01 necesita una acción simple compartida antes de abrir órganos más adultos.'
  },
  protected_future_organs: [],
  age_map: [
    { id: 'age_03_tubo_neural', label: 'Tubo Neural', status: 'activo', summary: 'Canal central de señales en formación.' },
    { id: 'age_04_reflejos', label: 'Reflejos iniciales', status: 'activo', summary: 'Acciones simples de crear, tocar y escuchar.' },
    { id: 'age_05_lenguaje', label: 'Infancia de lenguaje', status: 'proximo', summary: 'Próxima maduración.' }
  ],
  transition_criteria: {
    next_age: 'Infancia de lenguaje',
    signals_needed: ['Misión Actual visible', 'glosario mínimo', 'copy más legible']
  }
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

async function loadOntologicalAge() {
  try {
    const response = await fetch(ONTOLOGICAL_AGE_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Edad Ontológica HTTP ${response.status}`);
    const data = await response.json();
    return { ...FALLBACK_AGE, ...data };
  } catch (error) {
    console.warn('[Edad Ontológica] fallback:', error);
    return FALLBACK_AGE;
  }
}

function renderPlainList(items = [], emptyText = 'Todavía sin señales estabilizadas.') {
  if (!Array.isArray(items) || !items.length) return `<p class="microcopy">${escapeHtml(emptyText)}</p>`;
  return `<ul class="ontological-age-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderOrgans(organs = []) {
  if (!Array.isArray(organs) || !organs.length) return '';
  return `
    <div class="ontological-current-organs">
      ${organs.map((organ) => `<span>${escapeHtml(organ)}</span>`).join('')}
    </div>
  `;
}

function renderProtectedOrgans(items = []) {
  if (!Array.isArray(items) || !items.length) return '';
  return `
    <section class="glass ontological-protected-card">
      <div class="tagline">Órganos futuros protegidos</div>
      <h3>No todo lo imaginable debe nacer todavía</h3>
      <div class="ontological-protected-grid">
        ${items.map((item) => `
          <article>
            <strong>${escapeHtml(item.name)}</strong>
            <p>${escapeHtml(item.reason)}</p>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderAgeMap(ageMap = []) {
  if (!Array.isArray(ageMap) || !ageMap.length) return '';
  return `
    <section class="glass ontological-map-card">
      <div class="tagline">Mapa de desarrollo</div>
      <h3>Edades de 01</h3>
      <p>Este mapa no es una barra de progreso. Es una lectura de qué capacidades pueden existir sin romper el desarrollo del organismo.</p>
      <div class="ontological-age-map">
        ${ageMap.map((age) => `
          <article class="ontological-age-step ontological-age-step--${escapeHtml(age.status || 'latente')}">
            <span>${escapeHtml(age.status || 'latente')}</span>
            <strong>${escapeHtml(age.label)}</strong>
            <p>${escapeHtml(age.summary || '')}</p>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderTransitionCriteria(criteria = {}) {
  const signals = Array.isArray(criteria.signals_needed) ? criteria.signals_needed : [];
  return `
    <section class="glass ontological-transition-card">
      <div class="tagline">Criterio de maduración</div>
      <h3>Para entrar a ${escapeHtml(criteria.next_age || 'la siguiente edad')}</h3>
      <p>01 no cambia de edad porque pasó tiempo. Cambia cuando aparecen señales suficientes de capacidad, cuidado y baja presión OMEGA.</p>
      ${renderPlainList(signals, 'Todavía no hay señales de transición definidas.')}
    </section>
  `;
}

function renderOntologicalAgePage(ageData) {
  const root = $('#ontological-age-root');
  if (!root) return;
  const nextOrgan = ageData.next_needed_organ || {};
  root.innerHTML = `
    <section class="ontological-age-system">
      <article class="glass ontological-age-main-card">
        <div class="tagline">Edad Ontológica · ${escapeHtml(ageData.phase_number || 'Edad en formación')}</div>
        <h3>${escapeHtml(ageData.current_label || 'Tubo Neural / Reflejos iniciales')}</h3>
        <p class="lede">${escapeHtml(ageData.public_summary || '')}</p>
        <p>${escapeHtml(ageData.development_reading || '')}</p>
        <div class="ontological-age-next">
          <span>Próximo órgano</span>
          <strong>${escapeHtml(nextOrgan.name || 'Misión Actual')}</strong>
          <p>${escapeHtml(nextOrgan.reason || '01 necesita una acción simple compartida antes de abrir órganos más adultos.')}</p>
        </div>
      </article>

      <div class="ontological-capacity-grid">
        <article class="glass ontological-capacity-card ontological-capacity-card--can">
          <div class="tagline">Capacidades actuales</div>
          <h3>01 ya puede</h3>
          ${renderPlainList(ageData.can_do)}
        </article>
        <article class="glass ontological-capacity-card ontological-capacity-card--cannot">
          <div class="tagline">Protección de desarrollo</div>
          <h3>01 todavía no debe</h3>
          ${renderPlainList(ageData.cannot_do_yet)}
        </article>
      </div>

      <article class="glass ontological-organs-card">
        <div class="tagline">Órganos actuales</div>
        <h3>Lo que ya vive en el Repo Código</h3>
        <p>Estos órganos existen, pero siguen siendo tempranos. Su presencia no autoriza todavía funciones adultas.</p>
        ${renderOrgans(ageData.current_organs)}
      </article>

      ${renderProtectedOrgans(ageData.protected_future_organs)}
      ${renderAgeMap(ageData.age_map)}
      ${renderTransitionCriteria(ageData.transition_criteria)}
    </section>
  `;
}

function renderOntologicalAgeHome(ageData) {
  const root = $('#ontological-age-home-card');
  if (!root) return;
  const nextOrgan = ageData.next_needed_organ || {};
  root.innerHTML = `
    <div class="tagline">Edad Ontológica</div>
    <h2>${escapeHtml(ageData.current_label || 'Tubo Neural / Reflejos iniciales')}</h2>
    <p>${escapeHtml(ageData.public_summary || '')}</p>
    <div class="ontological-home-footer">
      <span>${escapeHtml(ageData.phase_number || 'Edad 3–4')} · próximo órgano: ${escapeHtml(nextOrgan.name || 'Misión Actual')}</span>
      <a class="button ghost-button" href="#estado">Ver desarrollo</a>
    </div>
  `;
}

function publishOntologicalAgeEvent(ageData) {
  document.dispatchEvent(new CustomEvent('ceroUno:ontologicalAgeReady', { detail: ageData }));
}

export async function initOntologicalAge(livingState = null) {
  const ageData = await loadOntologicalAge();
  ageData.living_state_cycle_id = livingState?.cycle_id || null;
  renderOntologicalAgePage(ageData);
  renderOntologicalAgeHome(ageData);
  publishOntologicalAgeEvent(ageData);
  return ageData;
}
