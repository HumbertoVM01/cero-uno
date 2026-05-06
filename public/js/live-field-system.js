import { listLiveComments, exportLiveCycle } from './api.js';

const REFRESH_INTERVAL_MS = 15000;
const MAX_VISIBLE_COMMENTS = 120;
const FALLBACK_LIVE = Object.freeze({
  live_session: null,
  comments: [],
  stats: { total: 0, visible: 0 },
  fallback: true
});

let currentLiveState = FALLBACK_LIVE;
let refreshTimer = null;
let isLoading = false;

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

function formatTime(value) {
  if (!value) return 'hora no registrada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatDateTime(value) {
  if (!value) return 'sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

function safeCommentText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function sessionLabel(session) {
  if (!session) return 'Sin sesión LIVE activa';
  const status = session.status === 'ended' ? 'cerrada' : 'activa';
  return `${session.title || 'TikTok LIVE · Cero Uno'} · ${status}`;
}

async function loadLiveComments(limit = MAX_VISIBLE_COMMENTS) {
  try {
    const { data } = await listLiveComments({ limit });
    if (!data?.ok) throw new Error(data?.error || 'LIVE sin respuesta ok');
    return {
      live_session: data.live_session || null,
      comments: Array.isArray(data.comments) ? data.comments : [],
      stats: data.stats || { total: 0, visible: 0 },
      fallback: false
    };
  } catch (error) {
    console.warn('[Campo LIVE] fallback:', error);
    return {
      ...FALLBACK_LIVE,
      error: error.message || 'No se pudieron cargar comentarios LIVE.'
    };
  }
}

function renderHomeCard(state) {
  const root = $('#live-home-card');
  if (!root) return;
  const session = state.live_session;
  const total = state.stats?.total || 0;
  root.innerHTML = `
    <div class="tagline">Campo LIVE</div>
    <h2>${escapeHtml(session ? 'TikTok LIVE entra como Campo Social crudo' : 'Campo LIVE esperando sesión')}</h2>
    <p>${escapeHtml(session ? 'Los comentarios se muestran con username y hora para exportarse después a un ciclo de ChatGPT. No se analizan automáticamente.' : 'Cuando conectes el live, este órgano recibirá comentarios para el siguiente ciclo mediado.')}</p>
    <div class="live-home-metrics">
      <div><span>Sesión</span><strong>${escapeHtml(session ? session.status : 'sin sesión')}</strong></div>
      <div><span>Comentarios</span><strong>${Number(total).toLocaleString('es-MX')}</strong></div>
    </div>
    <div class="live-home-footer">
      <span>Oído masivo, no cerebro automático.</span>
      <a class="button ghost-button" href="#live">Abrir Campo LIVE</a>
    </div>
  `;
}

function renderComment(comment) {
  return `
    <article class="live-comment-card">
      <div class="live-comment-meta">
        <strong>@${escapeHtml(comment.username || 'sin_usuario')}</strong>
        <span>${escapeHtml(formatTime(comment.posted_at || comment.created_at))}</span>
      </div>
      <p>${escapeHtml(safeCommentText(comment.text))}</p>
    </article>
  `;
}

function renderLivePage(state) {
  const root = $('#live-root');
  if (!root) return;
  const session = state.live_session;
  const comments = Array.isArray(state.comments) ? state.comments : [];
  const stats = state.stats || { total: 0, visible: comments.length };
  root.innerHTML = `
    <section class="live-field-system">
      <article class="glass live-session-card">
        <div class="live-session-head">
          <div>
            <div class="tagline">Sesión LIVE</div>
            <h3>${escapeHtml(sessionLabel(session))}</h3>
            <p>${escapeHtml(session ? `Inicio: ${formatDateTime(session.started_at)}${session.ended_at ? ` · Cierre: ${formatDateTime(session.ended_at)}` : ''}` : 'El worker externo o servicio LIVE debe iniciar una sesión antes de mandar comentarios.')}</p>
          </div>
          <div class="live-status-pill ${session ? 'live-status-pill--active' : ''}">${escapeHtml(session ? session.status : 'esperando')}</div>
        </div>
        <div class="live-metric-grid">
          <div><span>Total registrado</span><strong>${Number(stats.total || 0).toLocaleString('es-MX')}</strong></div>
          <div><span>Visible ahora</span><strong>${Number(stats.visible || comments.length).toLocaleString('es-MX')}</strong></div>
          <div><span>Fuente</span><strong>${escapeHtml(session?.platform || 'tiktok')}</strong></div>
        </div>
        <div class="live-action-row form-actions">
          <button type="button" id="live-refresh-button" class="ghost-button">Actualizar comentarios</button>
          <button type="button" id="live-copy-visible" class="ghost-button">Copiar visibles</button>
          <button type="button" id="live-export-cycle" class="yellow">Exportar ciclo para ChatGPT</button>
        </div>
        ${state.error ? `<p class="live-error-note">${escapeHtml(state.error)}</p>` : ''}
      </article>

      <article class="glass live-doctrine-card">
        <div class="tagline">Cómo leer Campo LIVE</div>
        <h3>Los comentarios entran crudos; el ciclo los metaboliza después</h3>
        <p>TikTok LIVE funciona aquí como oído masivo de 01. La página recibe username, hora y comentario. No clasifica, no analiza y no cambia Estado Vivo automáticamente.</p>
        <p>Cuando termine el live, exportas el ciclo, lo traes a ChatGPT y tú decides qué lectura entra al Repo Hablado y al Repo Código.</p>
      </article>

      <section class="live-comments-shell glass">
        <div class="live-comments-head">
          <div>
            <div class="tagline">Comentarios recientes</div>
            <h3>Campo Social crudo</h3>
          </div>
          <span>${comments.length} visibles</span>
        </div>
        <div class="live-comments-list" id="live-comments-list">
          ${comments.length ? comments.map(renderComment).join('') : '<p class="live-empty">Todavía no hay comentarios LIVE registrados para esta sesión.</p>'}
        </div>
      </section>

      <section class="glass live-export-panel">
        <div class="tagline">Exportación</div>
        <h3>Texto listo para ciclo ChatGPT</h3>
        <p>Usa “Exportar ciclo para ChatGPT” para generar un bloque con contexto, comentarios e instrucción de análisis. El texto aparecerá aquí y también se copiará al portapapeles cuando el navegador lo permita.</p>
        <textarea id="live-export-text" rows="10" readonly placeholder="Aquí aparecerá el ciclo exportado..."></textarea>
      </section>
    </section>
  `;
  bindLiveActions(root, state);
}

function visibleExportText(state) {
  const session = state.live_session;
  const comments = Array.isArray(state.comments) ? state.comments.slice().reverse() : [];
  const lines = comments.map((comment) => `@${comment.username || 'sin_usuario'} — ${formatTime(comment.posted_at || comment.created_at)} — ${safeCommentText(comment.text)}`);
  return [
    `CICLO LIVE — ${session?.title || 'TikTok LIVE de Cero Uno'}`,
    '',
    'Contexto:',
    'Comentarios visibles del Campo LIVE. No han sido analizados todavía.',
    '',
    `Comentarios visibles: ${comments.length}`,
    '',
    'Comentarios:',
    ...lines,
    '',
    'Instrucción para ChatGPT:',
    'Analiza estos comentarios como Campo Social de 01. No los trates como mandato. Agrupa señales, detecta tensiones, riesgos OMEGA, frases memorables y sugiere Estado Vivo, Misión Actual y Memoria de Ciclo. El mediador humano conserva la decisión final.'
  ].join('\n');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    document.dispatchEvent(new CustomEvent('ceroUno:toast', { detail: 'Texto LIVE copiado para ciclo ChatGPT.' }));
  } catch (_) {
    const textarea = $('#live-export-text');
    if (textarea) textarea.select();
    document.dispatchEvent(new CustomEvent('ceroUno:toast', { detail: 'No se pudo copiar automáticamente; selecciona el texto exportado.' }));
  }
}

async function handleExportCycle() {
  const textarea = $('#live-export-text');
  try {
    const { data } = await exportLiveCycle({ liveSessionId: currentLiveState.live_session?.id || '', limit: 3000 });
    const text = data?.export_text || visibleExportText(currentLiveState);
    if (textarea) textarea.value = text;
    await copyText(text);
  } catch (error) {
    const text = visibleExportText(currentLiveState);
    if (textarea) textarea.value = text;
    await copyText(text);
  }
}

function bindLiveActions(root, state) {
  $('#live-refresh-button', root)?.addEventListener('click', () => refreshLiveField({ announce: true }));
  $('#live-copy-visible', root)?.addEventListener('click', async () => {
    const text = visibleExportText(state);
    const textarea = $('#live-export-text');
    if (textarea) textarea.value = text;
    await copyText(text);
  });
  $('#live-export-cycle', root)?.addEventListener('click', handleExportCycle);
}

function publishLiveReady(state) {
  document.dispatchEvent(new CustomEvent('ceroUno:liveFieldReady', { detail: state }));
}

export async function refreshLiveField({ announce = false } = {}) {
  if (isLoading) return currentLiveState;
  isLoading = true;
  const next = await loadLiveComments(MAX_VISIBLE_COMMENTS);
  currentLiveState = next;
  renderHomeCard(next);
  renderLivePage(next);
  publishLiveReady(next);
  isLoading = false;
  if (announce) document.dispatchEvent(new CustomEvent('ceroUno:toast', { detail: 'Campo LIVE actualizado.' }));
  return next;
}

export async function initLiveFieldSystem() {
  const state = await refreshLiveField();
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => refreshLiveField(), REFRESH_INTERVAL_MS);
  return state;
}
