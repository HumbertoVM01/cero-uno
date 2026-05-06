const STORE_KEY = 'cero_uno_social_field_v1';
const MAX_RENDERED_COMMENTS = 120;
const EXPORT_COMMENT_LIMIT = 2000;

const $ = (sel, root = document) => root.querySelector(sel);

const DEFAULT_STORE = {
  posts: [],
  comments: [],
  cycles: [],
  lastImportAt: null,
  lastCycleAt: null,
  lastExportIds: [],
  lastExportText: '',
  lastReadingSummary: '',
  localLivingState: null,
  localMission: null
};

function cloneDefaultStore() {
  return JSON.parse(JSON.stringify(DEFAULT_STORE));
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return cloneDefaultStore();
    const parsed = JSON.parse(raw);
    return { ...cloneDefaultStore(), ...(parsed || {}) };
  } catch (_) {
    return cloneDefaultStore();
  }
}

function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function setText(sel, value) {
  const el = $(sel);
  if (el) el.textContent = value;
}

function setValue(sel, value) {
  const el = $(sel);
  if (el) el.value = value;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeLine(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDateTime(value, fallback = '—') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeLine(value) || fallback;
  return date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function formatTime(value) {
  if (!value) return 'hora no registrada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeLine(value) || 'hora no registrada';
  return date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function stableId(prefix = 'id') {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function hashText(input) {
  let hash = 2166136261;
  const text = String(input || '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function firstPresent(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] != null && String(obj[key]).trim() !== '') return obj[key];
  }
  return '';
}

function normalizeTimestamp(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number') {
    const ms = value > 100000000000 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }
  const text = String(value).trim();
  if (/^\d{10}$/.test(text)) return new Date(Number(text) * 1000).toISOString();
  if (/^\d{13}$/.test(text)) return new Date(Number(text)).toISOString();
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toISOString();
}

function normalizeComment(input = {}, inherited = {}) {
  const postUrl = safeLine(firstPresent(input, ['post_url', 'postUrl', 'url', 'videoUrl', 'webVideoUrl', 'shareUrl', 'link']) || inherited.post_url || inherited.url);
  const postId = safeLine(firstPresent(input, ['post_id', 'postId', 'awemeId', 'videoId', 'video_id', 'itemId']) || inherited.post_id || inherited.postId || inherited.awemeId || inherited.videoId);
  const postCaption = safeLine(firstPresent(input, ['post_caption', 'postCaption', 'caption', 'description', 'desc', 'textExtra']) || inherited.post_caption || inherited.caption || inherited.desc);
  const commentId = safeLine(firstPresent(input, ['comment_id', 'commentId', 'cid', 'id', 'commentCid']));
  const usernameRaw = firstPresent(input, ['username', 'uniqueId', 'authorName', 'author', 'user', 'nickname', 'displayName']);
  const username = safeLine(typeof usernameRaw === 'object' ? firstPresent(usernameRaw, ['uniqueId', 'username', 'nickname', 'name']) : usernameRaw);
  const commentText = safeLine(firstPresent(input, ['comment_text', 'commentText', 'text', 'comment', 'content', 'body', 'message']));
  const commentTime = normalizeTimestamp(firstPresent(input, ['comment_time', 'commentTime', 'createTime', 'createdAt', 'posted_at', 'postedAt', 'timestamp', 'time', 'date']));
  const scrapedAt = normalizeTimestamp(firstPresent(input, ['scraped_at', 'scrapedAt', 'collectedAt']) || new Date().toISOString());
  const likes = Number(firstPresent(input, ['likes', 'likeCount', 'diggCount']) || 0) || 0;
  const replyTo = safeLine(firstPresent(input, ['reply_to', 'replyTo', 'parentCommentId', 'parent_id']));
  const fallbackPostUrl = postUrl || (postId ? `tiktok_post:${postId}` : 'post_desconocido');
  const fallbackUsername = username || 'usuario_desconocido';
  if (!commentText) return null;
  const dedupeKey = commentId
    ? `comment:${commentId}`
    : `soft:${hashText([fallbackPostUrl, fallbackUsername, commentText, commentTime || scrapedAt].join('|'))}`;
  return {
    id: dedupeKey,
    dedupe_key: dedupeKey,
    post_url: fallbackPostUrl,
    post_id: postId || hashText(fallbackPostUrl),
    post_caption: postCaption,
    comment_id: commentId,
    username: fallbackUsername.replace(/^@/, ''),
    comment_text: commentText,
    comment_time: commentTime,
    likes,
    reply_to: replyTo,
    scraped_at: scrapedAt,
    status: 'new',
    cycle_id: '',
    imported_at: new Date().toISOString(),
    raw: input
  };
}

function extractJsonItems(value, inherited = {}) {
  if (Array.isArray(value)) return value.flatMap((item) => extractJsonItems(item, inherited));
  if (!value || typeof value !== 'object') return [];

  const postContext = {
    post_url: firstPresent(value, ['post_url', 'postUrl', 'url', 'videoUrl', 'webVideoUrl', 'shareUrl', 'link']) || inherited.post_url,
    post_id: firstPresent(value, ['post_id', 'postId', 'awemeId', 'videoId', 'video_id', 'itemId']) || inherited.post_id,
    post_caption: firstPresent(value, ['post_caption', 'postCaption', 'caption', 'description', 'desc']) || inherited.post_caption
  };

  const children = firstPresent(value, ['comments', 'commentList', 'items', 'data', 'results']);
  if (Array.isArray(children)) {
    const nested = children.flatMap((child) => extractJsonItems(child, { ...inherited, ...postContext }));
    const own = normalizeComment(value, inherited);
    return own ? [own, ...nested] : nested;
  }

  const normalized = normalizeComment(value, inherited);
  return normalized ? [normalized] : [];
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (quoted && ch === '"' && next === '"') {
      current += '"';
      i += 1;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values.map((v) => v.trim());
}

function parseCsv(rawText) {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2 || !lines[0].includes(',')) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const obj = {};
    headers.forEach((header, index) => { obj[header] = values[index] || ''; });
    return normalizeComment(obj);
  }).filter(Boolean);
}

function parsePlainText(rawText) {
  return rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const postUrl = (line.match(/https?:\/\/\S+/) || [])[0] || 'texto_manual';
    let rest = line.replace(postUrl, '').trim();
    const userMatch = rest.match(/@([\w.\-]+)\s*[:—-]\s*(.+)$/);
    const clockMatch = rest.match(/^\[?([^\]\s]+(?:\s+[^\]\s]+)?)\]?\s+@/);
    let username = 'usuario_desconocido';
    let comment = rest;
    if (userMatch) {
      username = userMatch[1];
      comment = userMatch[2];
    }
    return normalizeComment({
      post_url: postUrl,
      username,
      comment_text: comment,
      comment_time: clockMatch ? clockMatch[1] : '',
      scraped_at: new Date().toISOString()
    });
  }).filter(Boolean);
}

export function parseImportedComments(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return extractJsonItems(parsed);
  } catch (_) {
    const csv = parseCsv(text);
    if (csv.length) return csv;
    return parsePlainText(text);
  }
}

function buildPosts(comments) {
  const map = new Map();
  comments.forEach((comment) => {
    const key = comment.post_url || comment.post_id || 'post_desconocido';
    const current = map.get(key) || {
      id: comment.post_id || hashText(key),
      post_url: comment.post_url,
      post_id: comment.post_id,
      post_caption: comment.post_caption,
      comment_count: 0,
      scraped_at: comment.scraped_at
    };
    current.comment_count += 1;
    if (!current.post_caption && comment.post_caption) current.post_caption = comment.post_caption;
    if (comment.scraped_at && (!current.scraped_at || new Date(comment.scraped_at) > new Date(current.scraped_at))) current.scraped_at = comment.scraped_at;
    map.set(key, current);
  });
  return [...map.values()].sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
}

function mergeComments(existing, incoming) {
  const map = new Map(existing.map((comment) => [comment.dedupe_key || comment.id, comment]));
  let added = 0;
  let duplicates = 0;
  incoming.forEach((comment) => {
    const key = comment.dedupe_key || comment.id;
    if (map.has(key)) {
      duplicates += 1;
      map.set(key, { ...comment, ...map.get(key) });
    } else {
      added += 1;
      map.set(key, comment);
    }
  });
  const comments = [...map.values()].sort((a, b) => {
    const ad = new Date(a.comment_time || a.scraped_at || a.imported_at).getTime() || 0;
    const bd = new Date(b.comment_time || b.scraped_at || b.imported_at).getTime() || 0;
    return bd - ad;
  });
  return { comments, added, duplicates };
}

function filterComments(store) {
  const mode = $('#social-filter-mode')?.value || 'new';
  const postFilter = $('#social-post-filter')?.value || 'all';
  const now = Date.now();
  let list = toArray(store.comments);
  if (postFilter !== 'all') list = list.filter((comment) => (comment.post_url || comment.post_id) === postFilter);
  if (mode === 'new') list = list.filter((comment) => comment.status !== 'cycled');
  if (mode === '7d') list = list.filter((comment) => now - (new Date(comment.comment_time || comment.scraped_at || comment.imported_at).getTime() || now) <= 7 * 864e5);
  if (mode === '30d') list = list.filter((comment) => now - (new Date(comment.comment_time || comment.scraped_at || comment.imported_at).getTime() || now) <= 30 * 864e5);
  if (mode === 'questions') list = list.filter((comment) => /\?|qué|como|cómo|cu[aá]nto|dónde|por qué|porque|quien|quién/i.test(comment.comment_text));
  if (mode === 'desire') list = list.filter((comment) => /quiero|hacer|comprar|precio|vender|me interesa|deseo|necesito|entiendo|entender/i.test(comment.comment_text));
  if (mode === 'tension') list = list.filter((comment) => /caro|precio|no entiendo|confus|raro|cr[ií]tica|ia|inteligencia|manual|valor|por qué/i.test(comment.comment_text));
  return { mode, postFilter, comments: list };
}

function getRange(comments) {
  const dates = comments
    .map((comment) => new Date(comment.comment_time || comment.scraped_at || comment.imported_at))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b);
  if (!dates.length) return 'sin rango registrado';
  return `${formatDateTime(dates[0].toISOString())} → ${formatDateTime(dates.at(-1).toISOString())}`;
}

function getLivingStateText(context, store) {
  if (store.localLivingState?.state_change) return store.localLivingState.state_change;
  const living = context?.livingState;
  if (!living) return 'Estado Vivo previo no disponible en este navegador.';
  const phase = living.ontological_age?.phase || living.current_label || '';
  const reading = living.dominant_reading || living.public_summary || '';
  const omega = living.variables?.omega?.reading || living.soft_warning || '';
  return [phase && `Edad ontológica: ${phase}`, reading && `Lectura: ${reading}`, omega && `OMEGA: ${omega}`].filter(Boolean).join('\n');
}

function getMissionText(context, store) {
  if (store.localMission?.mission_update) return store.localMission.mission_update;
  const mission = context?.currentMission;
  return mission?.mission?.title || mission?.current_mission || mission?.title || 'Ayuda a 01 a formar lenguaje sin cerrar el misterio.';
}

function buildExportText(store, context = {}) {
  const { mode, comments } = filterComments(store);
  const included = comments.slice(0, EXPORT_COMMENT_LIMIT);
  const posts = buildPosts(included);
  const exportDate = new Date().toISOString();
  const modeLabel = {
    new: 'Comentarios nuevos desde último ciclo',
    all: 'Todo el campo compilado',
    '7d': 'Últimos 7 días',
    '30d': 'Últimos 30 días',
    questions: 'Comentarios con preguntas',
    desire: 'Deseo de crear / comprar / entender',
    tension: 'Tensión / crítica'
  }[mode] || mode;
  const postLines = posts.length
    ? posts.map((post, index) => `${index + 1}. ${post.post_url || post.post_id}\n   Caption: ${safeLine(post.post_caption) || 'sin caption'}\n   Comentarios incluidos: ${post.comment_count}`)
    : ['sin posts incluidos'];
  const commentLines = included.length
    ? included.map((comment) => `[${comment.post_url || 'post_desconocido'}] [${formatTime(comment.comment_time || comment.scraped_at)}] @${safeLine(comment.username)}: ${safeLine(comment.comment_text)}`)
    : ['sin comentarios incluidos'];

  return [
    'CICLO CERO UNO — CAMPO SOCIAL COMPILADO',
    '',
    `Fecha de exportación: ${formatDateTime(exportDate)}`,
    'Fuente: TikTok posts de @0100011011...0100011011',
    `Modo de exportación: ${modeLabel}`,
    '',
    'Posts incluidos:',
    ...postLines,
    '',
    'Resumen bruto:',
    `Total de posts incluidos: ${posts.length}`,
    `Total de comentarios incluidos: ${included.length}`,
    `Comentarios nuevos en almacenamiento local: ${toArray(store.comments).filter((comment) => comment.status !== 'cycled').length}`,
    `Rango de fechas: ${getRange(included)}`,
    '',
    'ESTADO PREVIO DE 01:',
    getLivingStateText(context, store),
    '',
    'MISIÓN ACTUAL:',
    getMissionText(context, store),
    '',
    'COMENTARIOS CRUDOS:',
    ...commentLines,
    '',
    'INSTRUCCIÓN PARA CHATGPT:',
    'Lee este Campo Social compilado como ciclo de Cero Uno.',
    'No analices comentario por comentario de forma aislada.',
    'No conviertas comentarios en votos.',
    'No absolutices el campo.',
    'Detecta señales, tensiones, deseos, dudas, preguntas recurrentes, riesgos OMEGA, postura AEMP sugerida, cambio de Estado Vivo, misión posible y memoria de Archivo.',
    'El mediador conserva la decisión final.'
  ].join('\n');
}

function renderMetrics(store) {
  const posts = buildPosts(store.comments);
  const newCount = store.comments.filter((comment) => comment.status !== 'cycled').length;
  const metrics = $('#social-field-metrics');
  if (metrics) {
    metrics.innerHTML = `
      <div><span>Posts escaneados</span><strong>${posts.length.toLocaleString('es-MX')}</strong></div>
      <div><span>Comentarios compilados</span><strong>${store.comments.length.toLocaleString('es-MX')}</strong></div>
      <div><span>Comentarios nuevos</span><strong>${newCount.toLocaleString('es-MX')}</strong></div>
      <div><span>Última importación</span><strong>${formatDateTime(store.lastImportAt)}</strong></div>
      <div><span>Último ciclo</span><strong>${formatDateTime(store.lastCycleAt)}</strong></div>
      <div><span>Deduplicación</span><strong>por id / huella</strong></div>`;
  }
  setText('#social-field-status', store.comments.length ? 'campo compilado localmente' : 'sin compilación todavía');
  const home = $('#social-field-home-card h2');
  if (home) home.textContent = `${store.comments.length.toLocaleString('es-MX')} comentarios compilados`;
}

function renderPostFilter(store) {
  const select = $('#social-post-filter');
  if (!select) return;
  const current = select.value || 'all';
  const posts = buildPosts(store.comments);
  select.innerHTML = '<option value="all">Todos los posts</option>' + posts.map((post) => {
    const value = post.post_url || post.post_id;
    const label = safeLine(post.post_caption) || value;
    return `<option value="${escapeHtml(value)}">${escapeHtml(label.slice(0, 70))} · ${post.comment_count}</option>`;
  }).join('');
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function renderComments(store) {
  const root = $('#social-comments-list');
  if (!root) return;
  const { comments, mode } = filterComments(store);
  if (!comments.length) {
    root.innerHTML = '<p class="social-empty">No hay comentarios para este filtro. Importa campo o cambia el modo.</p>';
    return;
  }
  root.innerHTML = comments.slice(0, MAX_RENDERED_COMMENTS).map((comment) => `
    <article class="social-comment-card" data-status="${escapeHtml(comment.status || 'new')}">
      <div class="social-comment-meta">
        <strong>@${escapeHtml(comment.username || 'usuario_desconocido')}</strong>
        <span>${escapeHtml(formatTime(comment.comment_time || comment.scraped_at))}</span>
        <em>${comment.status === 'cycled' ? 'llevado a ciclo' : 'crudo / nuevo'}</em>
      </div>
      <p>${escapeHtml(comment.comment_text)}</p>
      <small>${escapeHtml(comment.post_url || comment.post_id || 'post desconocido')}</small>
    </article>`).join('') + (comments.length > MAX_RENDERED_COMMENTS ? `<p class="microcopy">Mostrando ${MAX_RENDERED_COMMENTS} de ${comments.length} comentarios filtrados (${escapeHtml(mode)}).</p>` : '');
}

function renderSocialField(store) {
  renderMetrics(store);
  renderPostFilter(store);
  renderComments(store);
  if (store.lastExportText) setValue('#social-export-output', store.lastExportText);
  if (store.lastReadingSummary) setValue('#social-reading-summary', store.lastReadingSummary);
}

function importRawComments(store) {
  const input = $('#social-import-input');
  const rawText = input?.value || '';
  const incoming = parseImportedComments(rawText);
  if (!incoming.length) {
    setText('#social-import-feedback', 'No encontré comentarios válidos. Revisa que exista comment_text/text/comment y username/user.');
    return store;
  }
  const merged = mergeComments(store.comments, incoming);
  const next = {
    ...store,
    comments: merged.comments,
    posts: buildPosts(merged.comments),
    lastImportAt: new Date().toISOString()
  };
  saveStore(next);
  setText('#social-import-feedback', `Importación completa: ${merged.added} nuevos, ${merged.duplicates} duplicados conservados.`);
  return next;
}

async function copyText(value, label = 'Copiado.') {
  const text = String(value || '');
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    setText('#social-import-feedback', label);
    return true;
  } catch (_) {
    return false;
  }
}

function collectReading() {
  return {
    signal: $('#reading-signal')?.value.trim() || '',
    tensions: $('#reading-tensions')?.value.trim() || '',
    desires: $('#reading-desires')?.value.trim() || '',
    doubts: $('#reading-doubts')?.value.trim() || '',
    omega: $('#reading-omega')?.value.trim() || '',
    aemp_posture: $('#reading-aemp')?.value.trim() || '',
    mission_update: $('#reading-mission')?.value.trim() || '',
    living_state_change: $('#reading-state-change')?.value.trim() || '',
    archive_note: $('#reading-archive-note')?.value.trim() || ''
  };
}

function saveMediatedReading(store) {
  const reading = collectReading();
  const cycleId = `cycle_social_${String(store.cycles.length + 1).padStart(3, '0')}_${Date.now()}`;
  const exportedIds = toArray(store.lastExportIds);
  const comments = store.comments.map((comment) => exportedIds.includes(comment.dedupe_key || comment.id)
    ? { ...comment, status: 'cycled', cycle_id: cycleId }
    : comment);
  const cycle = {
    id: cycleId,
    created_at: new Date().toISOString(),
    source: 'tiktok_posts_compiled',
    post_count: buildPosts(comments.filter((comment) => comment.cycle_id === cycleId)).length,
    comment_count: exportedIds.length,
    export_text: store.lastExportText,
    ...reading
  };
  const summary = [
    `CICLO GUARDADO — ${cycleId}`,
    `Señal: ${reading.signal || 'sin señal escrita'}`,
    `Tensiones: ${reading.tensions || 'sin tensiones escritas'}`,
    `OMEGA: ${reading.omega || 'sin lectura OMEGA'}`,
    `Postura AEMP: ${reading.aemp_posture || 'sin postura escrita'}`,
    `Misión: ${reading.mission_update || 'sin misión actualizada'}`,
    `Archivo: ${reading.archive_note || 'sin nota de archivo'}`,
    '',
    'Integración local realizada. Para volverlo estado del repo, traslada esta lectura a los JSON de data/archive, data/state y data/missions.'
  ].join('\n');
  const next = {
    ...store,
    comments,
    posts: buildPosts(comments),
    cycles: [cycle, ...toArray(store.cycles)],
    lastCycleAt: cycle.created_at,
    lastReadingSummary: summary,
    localLivingState: { state_change: reading.living_state_change, omega: reading.omega },
    localMission: { mission_update: reading.mission_update }
  };
  saveStore(next);
  setValue('#social-reading-summary', summary);
  setText('#social-import-feedback', 'Lectura mediada integrada localmente. Estado, misión y archivo quedan actualizados en este navegador.');
  const missionCard = $('#mission-home-card p');
  if (missionCard && reading.mission_update) missionCard.textContent = reading.mission_update;
  const stateCard = $('#living-state-home-card p');
  if (stateCard && reading.living_state_change) stateCard.textContent = reading.living_state_change;
  return next;
}

function markLastExportAsCycled(store) {
  const ids = toArray(store.lastExportIds);
  if (!ids.length) {
    setText('#social-import-feedback', 'Primero exporta un ciclo para saber qué comentarios marcar.');
    return store;
  }
  const cycleId = `marked_social_${Date.now()}`;
  const comments = store.comments.map((comment) => ids.includes(comment.dedupe_key || comment.id)
    ? { ...comment, status: 'cycled', cycle_id: comment.cycle_id || cycleId }
    : comment);
  const next = { ...store, comments, posts: buildPosts(comments), lastCycleAt: new Date().toISOString() };
  saveStore(next);
  setText('#social-import-feedback', `${ids.length} comentarios marcados como llevados a ciclo.`);
  return next;
}

export async function initSocialFieldSystem(context = {}) {
  if (!$('#social-field-root')) return null;
  let store = loadStore();
  store.posts = buildPosts(store.comments);
  saveStore(store);
  renderSocialField(store);

  $('#social-import-button')?.addEventListener('click', () => {
    store = importRawComments(store);
    renderSocialField(store);
  });

  $('#social-clear-import-button')?.addEventListener('click', () => {
    if (!confirm('¿Limpiar comentarios, ciclos y lecturas guardadas localmente?')) return;
    store = cloneDefaultStore();
    saveStore(store);
    setValue('#social-import-input', '');
    setValue('#social-export-output', '');
    setValue('#social-reading-summary', '');
    setText('#social-import-feedback', 'Importación local limpiada.');
    renderSocialField(store);
  });

  $('#social-filter-mode')?.addEventListener('change', () => renderSocialField(store));
  $('#social-post-filter')?.addEventListener('change', () => renderComments(store));

  $('#social-export-button')?.addEventListener('click', () => {
    const filtered = filterComments(store).comments.slice(0, EXPORT_COMMENT_LIMIT);
    const exportText = buildExportText(store, context);
    store = {
      ...store,
      lastExportText: exportText,
      lastExportIds: filtered.map((comment) => comment.dedupe_key || comment.id)
    };
    saveStore(store);
    setValue('#social-export-output', exportText);
    setText('#social-import-feedback', `Ciclo exportado localmente con ${filtered.length} comentarios.`);
  });

  $('#social-copy-export-button')?.addEventListener('click', () => copyText($('#social-export-output')?.value, 'Export copiado para ChatGPT.'));
  $('#social-copy-summary-button')?.addEventListener('click', () => copyText($('#social-reading-summary')?.value, 'Resumen de integración copiado.'));

  $('#social-mark-cycled-button')?.addEventListener('click', () => {
    store = markLastExportAsCycled(store);
    renderSocialField(store);
  });

  $('#social-save-reading-button')?.addEventListener('click', () => {
    store = saveMediatedReading(store);
    renderSocialField(store);
  });

  return {
    getStore: () => store,
    exportCycle: () => buildExportText(store, context),
    parseImportedComments
  };
}
