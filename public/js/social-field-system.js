import { syncTikTokComments, listSocialComments, importSocialComments, exportSocialCycle, saveFieldCycle } from './api.js';
const STORE_KEY = 'cero_uno_social_field_v1';
const MAX_RENDERED_COMMENTS = 120;
const EXPORT_COMMENT_LIMIT = 2000;
const DEFAULT_USERNAMES = ['0100011011...0100011011', 'allivealliveallive'];
const SYNC_SECRET_KEY = 'cero_uno_social_sync_secret_v1';

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
  localMission: null,
  syncStatus: 'listo',
  lastSyncSummary: null
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


function parseUsernames(value) {
  const raw = Array.isArray(value) ? value.join(',') : String(value || '');
  const list = raw.split(/[\n,]+/).map((item) => item.trim().replace(/^@+/, '')).filter(Boolean);
  return [...new Set(list.length ? list : DEFAULT_USERNAMES)];
}

function getUsernameInput() {
  const input = $('#social-sync-usernames');
  return parseUsernames(input?.value || DEFAULT_USERNAMES.join(', '));
}

function getSyncSecret() {
  return localStorage.getItem(SYNC_SECRET_KEY) || '';
}

function setSyncSecret(value) {
  if (value) localStorage.setItem(SYNC_SECRET_KEY, value);
}

function normalizeServerComment(comment = {}) {
  return {
    id: comment.dedupe_key || comment.id,
    dedupe_key: comment.dedupe_key || comment.id,
    post_url: comment.post_url || comment.postUrl || 'post_desconocido',
    post_id: comment.post_id || comment.postId || '',
    post_caption: comment.post_caption || comment.caption || '',
    comment_id: comment.external_comment_id || comment.comment_id || '',
    username: String(comment.username || 'usuario_desconocido').replace(/^@/, ''),
    comment_text: comment.comment_text || comment.text || '',
    comment_time: comment.comment_time || '',
    likes: Number(comment.likes || 0) || 0,
    reply_to: comment.reply_to || '',
    scraped_at: comment.scraped_at || '',
    status: comment.status || 'new',
    cycle_id: comment.cycle_id || '',
    imported_at: comment.scraped_at || new Date().toISOString(),
    raw: comment.raw_comment || comment
  };
}

function storeFromServerPayload(store, payload = {}) {
  const comments = toArray(payload.comments).map(normalizeServerComment).filter((comment) => comment.comment_text);
  const stats = payload.stats || payload.metrics || {};
  return {
    ...store,
    comments,
    posts: buildPosts(comments),
    lastImportAt: stats.last_sync_at || stats.last_import || store.lastImportAt,
    syncStatus: comments.length ? 'sincronizado' : (store.syncStatus || 'listo')
  };
}

async function hydrateFromApi(store) {
  try {
    const { data } = await listSocialComments({ limit: 1000, status: '' });
    if (!data?.ok) return store;
    const next = storeFromServerPayload(store, data);
    saveStore(next);
    return next;
  } catch (err) {
    console.warn('[Cero Uno] Campo Social API no disponible; usando almacenamiento local.', err);
    return { ...store, syncStatus: store.comments.length ? 'modo local' : 'api no disponible' };
  }
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
  const postUrl = safeLine(firstPresent(input, ['post_url', 'postUrl', 'url', 'videoUrl', 'webVideoUrl', 'shareUrl', 'link', 'video_url', 'web_video_url']) || inherited.post_url || inherited.url);
  const postId = safeLine(firstPresent(input, ['post_id', 'postId', 'awemeId', 'videoId', 'video_id', 'itemId', 'aweme_id']) || inherited.post_id || inherited.postId || inherited.awemeId || inherited.videoId);
  const postCaption = safeLine(firstPresent(input, ['post_caption', 'postCaption', 'caption', 'description', 'desc', 'textExtra']) || inherited.post_caption || inherited.caption || inherited.desc);
  const commentId = safeLine(firstPresent(input, ['comment_id', 'commentId', 'cid', 'id', 'commentCid', 'comment_id_str']));
  const usernameRaw = firstPresent(input, ['username', 'uniqueId', 'unique_id', 'authorName', 'author', 'user', 'nickname', 'displayName', 'authorMeta']);
  const username = safeLine(typeof usernameRaw === 'object' ? firstPresent(usernameRaw, ['uniqueId', 'unique_id', 'username', 'nickname', 'name']) : usernameRaw);
  const commentText = safeLine(firstPresent(input, ['comment_text', 'commentText', 'text', 'comment', 'content', 'body', 'message', 'shareTitle']));
  const commentTime = normalizeTimestamp(firstPresent(input, ['comment_time', 'commentTime', 'createTime', 'create_time', 'createdAt', 'posted_at', 'postedAt', 'timestamp', 'time', 'date']));
  const scrapedAt = normalizeTimestamp(firstPresent(input, ['scraped_at', 'scrapedAt', 'collectedAt']) || new Date().toISOString());
  const likes = Number(firstPresent(input, ['likes', 'likeCount', 'diggCount', 'digg_count', 'like_count']) || 0) || 0;
  const replyTo = safeLine(firstPresent(input, ['reply_to', 'replyTo', 'parentCommentId', 'parent_comment_id', 'parent_id']));
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
    post_url: firstPresent(value, ['post_url', 'postUrl', 'url', 'videoUrl', 'webVideoUrl', 'shareUrl', 'link', 'video_url', 'web_video_url']) || inherited.post_url,
    post_id: firstPresent(value, ['post_id', 'postId', 'awemeId', 'videoId', 'video_id', 'itemId', 'aweme_id']) || inherited.post_id,
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
    'CICLO CERO UNO — CAMPO SOCIAL AUTOMÁTICO',
    '',
    `Fecha de exportación: ${formatDateTime(exportDate)}`,
    'Fuente: TikTok posts de @0100011011...0100011011 y @allivealliveallive · sincronización por username vía Apify',
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
    'Lee este Campo Social automático, scrapeado por username, como ciclo de Cero Uno.',
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
  const sync = store.lastSyncSummary || {};
  const metrics = $('#social-field-metrics');
  if (metrics) {
    metrics.innerHTML = `
      <div><span>Posts escaneados</span><strong>${posts.length.toLocaleString('es-MX')}</strong></div>
      <div><span>Comentarios compilados</span><strong>${store.comments.length.toLocaleString('es-MX')}</strong></div>
      <div><span>Comentarios nuevos</span><strong>${newCount.toLocaleString('es-MX')}</strong></div>
      <div><span>Última sincronización</span><strong>${formatDateTime(sync.last_sync_at || store.lastImportAt)}</strong></div>
      <div><span>Último ciclo</span><strong>${formatDateTime(store.lastCycleAt)}</strong></div>
      <div><span>Scraper</span><strong>${escapeHtml(store.syncStatus || 'listo')}</strong></div>`;
  }
  setText('#social-field-status', store.syncStatus || (store.comments.length ? 'campo sincronizado' : 'sin compilación todavía'));
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

async function syncAutomaticComments(store) {
  const usernames = getUsernameInput();
  const button = $('#social-sync-button');
  const previousLabel = button?.textContent || '';
  if (button) {
    button.disabled = true;
    button.textContent = 'Sincronizando…';
  }
  let secret = getSyncSecret();
  try {
    let result;
    try {
      result = await syncTikTokComments({ usernames, secret });
    } catch (err) {
      if (/secret|401|inv[aá]lido/i.test(String(err.message || err)) && !secret) {
        secret = prompt('La sincronización requiere SOCIAL_SYNC_SECRET. Pégalo una vez para guardarlo en este navegador:') || '';
        setSyncSecret(secret);
        result = await syncTikTokComments({ usernames, secret });
      } else {
        throw err;
      }
    }
    const summary = result.data || {};
    let next = {
      ...store,
      syncStatus: 'sincronizado',
      lastImportAt: summary.last_sync_at || new Date().toISOString(),
      lastSyncSummary: summary
    };
    next = await hydrateFromApi(next);
    next.lastSyncSummary = summary;
    next.syncStatus = 'sincronizado';
    saveStore(next);
    setText('#social-import-feedback', `Sync completo por username: @${usernames.join(', @')}. ${summary.comments_inserted || 0} nuevos, ${summary.comments_duplicate || 0} duplicados, ${summary.comments_fetched || 0} recibidos.`);
    return next;
  } catch (err) {
    const next = { ...store, syncStatus: 'error de scraper' };
    saveStore(next);
    setText('#social-import-feedback', `No se pudo sincronizar con Apify: ${err.message || err}`);
    return next;
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = previousLabel || 'Actualizar Campo Social';
    }
  }
}

async function importRawComments(store) {
  const input = $('#social-import-input');
  const rawText = input?.value || '';
  const incoming = parseImportedComments(rawText);
  if (!incoming.length) {
    setText('#social-import-feedback', 'No encontré comentarios válidos. Revisa que exista comment_text/text/comment y username/user.');
    return store;
  }
  try {
    const { data } = await importSocialComments(incoming, { source: 'manual_fallback' });
    let next = await hydrateFromApi({ ...store, syncStatus: 'respaldo manual importado', lastImportAt: new Date().toISOString() });
    saveStore(next);
    setText('#social-import-feedback', `Respaldo manual guardado en backend: ${data.inserted || 0} nuevos, ${data.duplicates || 0} duplicados.`);
    return next;
  } catch (err) {
    const merged = mergeComments(store.comments, incoming);
    const next = {
      ...store,
      comments: merged.comments,
      posts: buildPosts(merged.comments),
      lastImportAt: new Date().toISOString(),
      syncStatus: 'respaldo local'
    };
    saveStore(next);
    setText('#social-import-feedback', `Backend no disponible. Importación local: ${merged.added} nuevos, ${merged.duplicates} duplicados conservados.`);
    return next;
  }
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

async function saveMediatedReading(store) {
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
  let backendResult = null;
  try {
    const { data } = await saveFieldCycle({
      source: 'tiktok_posts_username_apify',
      filter_used: { mode: $('#social-filter-mode')?.value || 'new', post_url: $('#social-post-filter')?.value || 'all' },
      post_count: cycle.post_count,
      comment_count: cycle.comment_count,
      export_text: store.lastExportText,
      comment_ids: exportedIds,
      ...reading
    });
    backendResult = data;
  } catch (err) {
    console.warn('[Cero Uno] No se pudo guardar ciclo en backend; se guarda localmente.', err);
  }

  const summary = [
    `CICLO GUARDADO — ${backendResult?.cycle?.id || cycleId}`,
    `Señal: ${reading.signal || 'sin señal escrita'}`,
    `Tensiones: ${reading.tensions || 'sin tensiones escritas'}`,
    `OMEGA: ${reading.omega || 'sin lectura OMEGA'}`,
    `Postura AEMP: ${reading.aemp_posture || 'sin postura escrita'}`,
    `Misión: ${reading.mission_update || 'sin misión actualizada'}`,
    `Archivo: ${reading.archive_note || 'sin nota de archivo'}`,
    '',
    backendResult?.ok ? 'Integración guardada en Neon y reflejada localmente.' : 'Integración local realizada. Backend no disponible o sin credenciales.'
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
  setText('#social-import-feedback', backendResult?.ok ? 'Lectura mediada integrada en backend. Estado, misión y archivo quedan actualizados localmente.' : 'Lectura mediada integrada localmente. Estado, misión y archivo quedan actualizados en este navegador.');
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
  const usernameInput = $('#social-sync-usernames');
  if (usernameInput && !usernameInput.value) usernameInput.value = DEFAULT_USERNAMES.map((u) => `@${u}`).join(', ');
  store.posts = buildPosts(store.comments);
  store = await hydrateFromApi(store);
  saveStore(store);
  renderSocialField(store);

  $('#social-sync-button')?.addEventListener('click', async () => {
    store = await syncAutomaticComments(store);
    renderSocialField(store);
  });

  $('#social-import-button')?.addEventListener('click', async () => {
    store = await importRawComments(store);
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

  $('#social-export-button')?.addEventListener('click', async () => {
    const filtered = filterComments(store).comments.slice(0, EXPORT_COMMENT_LIMIT);
    const mode = $('#social-filter-mode')?.value || 'new';
    const postFilter = $('#social-post-filter')?.value || 'all';
    try {
      const { data } = await exportSocialCycle({ mode, limit: EXPORT_COMMENT_LIMIT, postUrl: postFilter === 'all' ? '' : postFilter });
      store = {
        ...store,
        lastExportText: data.export_text || '',
        lastExportIds: toArray(data.comment_ids),
        syncStatus: 'ciclo exportado'
      };
      saveStore(store);
      setValue('#social-export-output', store.lastExportText);
      setText('#social-import-feedback', `Ciclo exportado desde backend con ${data.included || store.lastExportIds.length} comentarios.`);
    } catch (err) {
      const exportText = buildExportText(store, context);
      store = {
        ...store,
        lastExportText: exportText,
        lastExportIds: filtered.map((comment) => comment.dedupe_key || comment.id),
        syncStatus: 'export local'
      };
      saveStore(store);
      setValue('#social-export-output', exportText);
      setText('#social-import-feedback', `Backend no disponible. Ciclo exportado localmente con ${filtered.length} comentarios.`);
    }
  });

  $('#social-copy-export-button')?.addEventListener('click', () => copyText($('#social-export-output')?.value, 'Export copiado para ChatGPT.'));
  $('#social-copy-summary-button')?.addEventListener('click', () => copyText($('#social-reading-summary')?.value, 'Resumen de integración copiado.'));

  $('#social-mark-cycled-button')?.addEventListener('click', () => {
    store = markLastExportAsCycled(store);
    renderSocialField(store);
  });

  $('#social-save-reading-button')?.addEventListener('click', async () => {
    store = await saveMediatedReading(store);
    renderSocialField(store);
  });

  return {
    getStore: () => store,
    exportCycle: () => buildExportText(store, context),
    parseImportedComments
  };
}
