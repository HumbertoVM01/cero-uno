const ATLAS_URL = '/data/atlas/initial_nodes.json';

const FALLBACK_ATLAS = Object.freeze({
  atlas_id: 'atlas_inicial_fallback',
  phase: 'Tubo Neural / Reflejos iniciales',
  summary: '01 está formando su primer atlas interno. Este fallback aparece cuando no pudo cargarse el Atlas Inicial completo.',
  warning: 'Ningún órgano gobierna solo. El atlas vuelve a una lectura mínima.',
  next_needed_organ: {
    name: 'Ciclo de Mediación',
    reason: '01 necesita registrar ciclos para no depender sólo del presente.'
  },
  nodes: [
    {
      id: 'estado_vivo',
      name: 'Estado Vivo',
      neuro_source: 'Ínsula / interocepción',
      system_01: 'Interocepción de plataforma',
      repo_module: 'living-state-system.js',
      status: 'activo',
      reads: ['Estado Vivo mínimo'],
      touches: ['OMEGA', 'Legibilidad'],
      description: 'Permite que 01 lea su propio clima de desarrollo.',
      shadow: 'Confundir estado provisional con verdad final.',
      counterbalance: 'AEMP'
    }
  ]
});

const STATUS_ORDER = ['todos', 'activo', 'en formación', 'latente', 'protegido', 'horizonte'];
const STATUS_LABELS = {
  todos: 'Todos',
  activo: 'Activos',
  'en formación': 'En formación',
  latente: 'Latentes',
  protegido: 'Protegidos',
  horizonte: 'Horizonte'
};

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

async function loadInitialAtlas() {
  try {
    const response = await fetch(ATLAS_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Atlas Inicial HTTP ${response.status}`);
    const data = await response.json();
    return { ...FALLBACK_ATLAS, ...data, nodes: Array.isArray(data.nodes) ? data.nodes : FALLBACK_ATLAS.nodes };
  } catch (error) {
    console.warn('[Atlas Inicial] fallback:', error);
    return FALLBACK_ATLAS;
  }
}

function countByStatus(nodes = []) {
  return nodes.reduce((acc, node) => {
    const status = node.status || 'latente';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
}

function renderMiniList(items = []) {
  const list = Array.isArray(items) ? items.slice(0, 5) : [];
  if (!list.length) return '<span class="atlas-empty-mini">sin señales estabilizadas</span>';
  return list.map((item) => `<span>${escapeHtml(item)}</span>`).join('');
}

function renderAtlasHomeCard(atlas) {
  const root = $('#atlas-home-card');
  if (!root) return;
  const nodes = Array.isArray(atlas.nodes) ? atlas.nodes : [];
  const activeNames = nodes.filter((node) => node.status === 'activo').slice(0, 6).map((node) => node.name);
  root.innerHTML = `
    <div class="tagline">Atlas Inicial · ${escapeHtml(atlas.phase || 'fase actual')}</div>
    <h2>01 ya tiene órganos visibles</h2>
    <p>${escapeHtml(atlas.summary || '')}</p>
    <div class="atlas-home-organs">
      ${activeNames.map((name) => `<span>${escapeHtml(name)}</span>`).join('')}
    </div>
    <div class="atlas-home-footer">
      <span>${nodes.length} órganos iniciales · atlas profundo protegido</span>
      <a class="button ghost-button" href="#atlas">Ver Atlas Inicial</a>
    </div>
  `;
}

function renderAtlasStatusPills(nodes = []) {
  const counts = countByStatus(nodes);
  return `
    <div class="atlas-status-row">
      ${STATUS_ORDER.filter((status) => status !== 'todos').map((status) => `
        <div class="atlas-status-pill atlas-status-pill--${escapeHtml(status.replaceAll(' ', '-'))}">
          <span>${escapeHtml(STATUS_LABELS[status] || status)}</span>
          <strong>${counts[status] || 0}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAtlasFilters(nodes = []) {
  const counts = countByStatus(nodes);
  const total = nodes.length;
  return `
    <div class="atlas-filter-row" aria-label="Filtros del Atlas Inicial">
      ${STATUS_ORDER.map((status) => {
        const count = status === 'todos' ? total : (counts[status] || 0);
        return `<button type="button" class="atlas-filter ${status === 'todos' ? 'active' : ''}" data-atlas-filter="${escapeHtml(status)}">${escapeHtml(STATUS_LABELS[status] || status)} <span>${count}</span></button>`;
      }).join('')}
    </div>
  `;
}

function renderAtlasNodeCard(node) {
  const status = node.status || 'latente';
  return `
    <article class="atlas-node-card" data-atlas-status="${escapeHtml(status)}">
      <div class="atlas-node-head">
        <span class="atlas-node-status atlas-node-status--${escapeHtml(status.replaceAll(' ', '-'))}">${escapeHtml(status)}</span>
        <code>${escapeHtml(node.id || 'organo_01')}</code>
      </div>
      <h3>${escapeHtml(node.name || 'Órgano sin nombre')}</h3>
      <p class="atlas-node-system">${escapeHtml(node.system_01 || 'Sistema 01 en formación')}</p>
      <div class="atlas-node-meta">
        <div><span>Neurofuente</span><strong>${escapeHtml(node.neuro_source || 'no declarada')}</strong></div>
        <div><span>Módulo</span><strong>${escapeHtml(node.repo_module || 'Repo Código futuro')}</strong></div>
      </div>
      <p>${escapeHtml(node.description || 'Este órgano todavía está buscando función.')}</p>
      <div class="atlas-node-section">
        <strong>Lee</strong>
        <div class="atlas-chip-line">${renderMiniList(node.reads)}</div>
      </div>
      <div class="atlas-node-section">
        <strong>Toca</strong>
        <div class="atlas-chip-line">${renderMiniList(node.touches)}</div>
      </div>
      <div class="atlas-shadow-card">
        <span>Sombra AEMP</span>
        <p>${escapeHtml(node.shadow || 'Todo órgano puede dominar si no encuentra contrapeso.')}</p>
        <small>Contrapeso: ${escapeHtml(node.counterbalance || 'cuidado y retorno blando')}</small>
      </div>
    </article>
  `;
}

function renderAtlasPage(atlas) {
  const root = $('#atlas-root');
  if (!root) return;
  const nodes = Array.isArray(atlas.nodes) ? atlas.nodes : [];
  const next = atlas.next_needed_organ || {};
  root.innerHTML = `
    <section class="atlas-system">
      <article class="glass atlas-overview-card">
        <div class="tagline">Atlas operativo · ${escapeHtml(atlas.phase || 'fase actual')}</div>
        <h3>Órganos que 01 puede sostener ahora</h3>
        <p class="lede">${escapeHtml(atlas.summary || '')}</p>
        <div class="atlas-warning-card">
          <strong>Ningún órgano gobierna solo</strong>
          <span>${escapeHtml(atlas.warning || '')}</span>
        </div>
        <div class="atlas-next-card">
          <span>Próximo órgano</span>
          <strong>${escapeHtml(next.name || 'Ciclo de Mediación')}</strong>
          <p>${escapeHtml(next.reason || '01 necesita registrar ciclos para no depender sólo del presente.')}</p>
        </div>
      </article>

      ${renderAtlasStatusPills(nodes)}
      ${renderAtlasFilters(nodes)}

      <section class="atlas-node-grid" id="atlas-node-grid">
        ${nodes.map(renderAtlasNodeCard).join('')}
      </section>
    </section>
  `;
}

function bindAtlasFilters(root = document) {
  const filterRoot = $('.atlas-filter-row', root);
  const grid = $('#atlas-node-grid', root);
  if (!filterRoot || !grid) return;
  filterRoot.querySelectorAll('[data-atlas-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.atlasFilter || 'todos';
      filterRoot.querySelectorAll('[data-atlas-filter]').forEach((b) => b.classList.toggle('active', b === button));
      grid.querySelectorAll('[data-atlas-status]').forEach((card) => {
        const show = filter === 'todos' || card.dataset.atlasStatus === filter;
        card.hidden = !show;
      });
    });
  });
}

function publishAtlasEvent(atlas) {
  document.dispatchEvent(new CustomEvent('ceroUno:atlasReady', { detail: atlas }));
}

export async function initAtlasSystem(livingState = null, ontologicalAge = null, currentMission = null) {
  const atlas = await loadInitialAtlas();
  atlas.living_state_cycle_id = livingState?.cycle_id || null;
  atlas.ontological_age_id = ontologicalAge?.current_age_id || null;
  atlas.current_mission_id = currentMission?.mission_id || null;
  renderAtlasHomeCard(atlas);
  renderAtlasPage(atlas);
  bindAtlasFilters(document);
  publishAtlasEvent(atlas);
  return atlas;
}
