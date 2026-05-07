const { getSql } = require('./_shared/db');
const { json, error, options } = require('./_shared/response');
const { normalizePayload, safeLine } = require('./_shared/social');

const DEFAULT_USERNAMES = ['0100011011...0100011011', 'allivealliveallive'];
const DEFAULT_ACTOR_ID = 'clockworks/tiktok-comments-scraper';

function headerValue(headers = {}, name) {
  const needle = name.toLowerCase();
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === needle);
  return found ? found[1] : '';
}

function authorized(headers = {}) {
  const required = process.env.SOCIAL_SYNC_SECRET || process.env.SOCIAL_INGEST_SECRET || '';
  if (!required) return true;
  return headerValue(headers, 'x-social-sync-secret') === required || headerValue(headers, 'x-social-ingest-secret') === required;
}

function parseCsvEnv(value) {
  return String(value || '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@+/, '');
}

function getUsernames(body = {}) {
  const fromBody = Array.isArray(body.usernames) ? body.usernames : parseCsvEnv(body.usernames || body.username || '');
  const fromEnv = parseCsvEnv(process.env.TIKTOK_USERNAMES || process.env.TIKTOK_USERNAME || process.env.APIFY_TIKTOK_USERNAMES || '');
  const source = fromBody.length ? fromBody : (fromEnv.length ? fromEnv : DEFAULT_USERNAMES);
  return [...new Set(source.map(normalizeUsername).filter(Boolean))];
}

function getActorId() {
  return process.env.APIFY_TIKTOK_COMMENTS_ACTOR_ID || process.env.APIFY_ACTOR_ID || DEFAULT_ACTOR_ID;
}

function actorPath(actorId) {
  // Apify acepta username~actor-name en rutas; muchas configuraciones humanas lo escriben como username/actor-name.
  return encodeURIComponent(String(actorId || DEFAULT_ACTOR_ID).replace('/', '~'));
}

function parsePositiveInt(value, fallback, max) {
  const n = Number(value || fallback);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

function buildApifyInput({ body = {}, usernames }) {
  if (body.apifyInput && typeof body.apifyInput === 'object') return body.apifyInput;
  if (process.env.APIFY_TIKTOK_COMMENTS_INPUT_JSON) {
    try {
      const parsed = JSON.parse(process.env.APIFY_TIKTOK_COMMENTS_INPUT_JSON);
      if (parsed && typeof parsed === 'object') return { ...parsed, usernames: parsed.usernames || usernames };
    } catch (_) {
      // Sigue con input flexible.
    }
  }
  const commentsPerPost = parsePositiveInt(body.commentsPerPost || process.env.MAX_COMMENTS_PER_POST, 200, 5000);
  const maxPosts = parsePositiveInt(body.maxPosts || process.env.MAX_POSTS_PER_SYNC, 25, 500);
  const maxRepliesPerComment = parsePositiveInt(body.maxRepliesPerComment || process.env.MAX_REPLIES_PER_COMMENT, 0, 1000);
  const withAt = usernames.map((username) => `@${username}`);
  return {
    username: usernames[0],
    usernames,
    handles: usernames,
    profiles: usernames,
    profileNames: usernames,
    startUrls: withAt.map((username) => ({ url: `https://www.tiktok.com/${username}` })),
    commentsPerPost,
    maxCommentsPerPost: commentsPerPost,
    maxComments: commentsPerPost,
    maxPosts,
    resultsPerPage: maxPosts,
    maxRepliesPerComment,
    includeReplies: maxRepliesPerComment > 0,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false
  };
}

async function runApifyActor({ token, actorId, input }) {
  const endpoint = `https://api.apify.com/v2/acts/${actorPath(actorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&clean=true&format=json`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  const text = await res.text();
  let payload;
  try { payload = text ? JSON.parse(text) : []; } catch (_) { payload = text; }
  if (!res.ok) {
    const err = new Error(`Apify respondió HTTP ${res.status}: ${typeof payload === 'string' ? payload.slice(0, 500) : JSON.stringify(payload).slice(0, 500)}`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return Array.isArray(payload) ? payload : (payload?.items || payload?.data || []);
}

function sourceUserFromItem(item, usernames) {
  const values = [
    item?.source_username,
    item?.sourceUsername,
    item?.profileUsername,
    item?.profileName,
    item?.authorMeta?.name,
    item?.videoAuthor,
    item?.videoAuthorName,
    item?.ownerUsername,
    item?.author?.uniqueId
  ].map(normalizeUsername).filter(Boolean);
  const found = values.find((value) => usernames.includes(value));
  return found || values[0] || '';
}

function uniquePosts(comments) {
  const keys = new Set();
  comments.forEach((comment) => keys.add(comment.post_url || comment.post_id || 'post_desconocido'));
  return keys.size;
}

async function ensureSyncRun(sql, values) {
  try {
    const rows = await sql`
      insert into social_sync_runs (status, actor_id, mode, usernames, raw_summary)
      values (${values.status || 'running'}, ${values.actor_id || ''}, ${values.mode || 'username'}, ${values.usernames || []}, ${values.raw_summary || {}})
      returning id
    `;
    return rows[0]?.id || null;
  } catch (_) {
    // Permite que el scraper funcione aunque la tabla social_sync_runs aún no se haya aplicado.
    return null;
  }
}

async function finishSyncRun(sql, runId, values) {
  if (!runId) return;
  try {
    await sql`
      update social_sync_runs set
        finished_at = now(),
        status = ${values.status},
        posts_scanned = ${values.posts_scanned || 0},
        comments_fetched = ${values.comments_fetched || 0},
        comments_inserted = ${values.comments_inserted || 0},
        comments_duplicate = ${values.comments_duplicate || 0},
        error_message = ${values.error_message || null},
        raw_summary = ${values.raw_summary || {}}
      where id = ${runId}
    `;
  } catch (_) {
    // No bloquear respuesta por una métrica auxiliar.
  }
}

async function insertComments(sql, comments) {
  let inserted = 0;
  let duplicates = 0;
  const postIds = new Map();

  for (const comment of comments) {
    const postKey = comment.post_url;
    let postRowId = postIds.get(postKey);
    if (!postRowId) {
      const rows = await sql`
        insert into social_posts (platform, post_id, post_url, caption, scraped_at, raw_post)
        values (${comment.platform}, ${comment.post_id}, ${comment.post_url}, ${comment.post_caption || null}, ${comment.scraped_at}, ${comment.raw_post || {}})
        on conflict (platform, post_url)
        do update set
          caption = coalesce(excluded.caption, social_posts.caption),
          scraped_at = greatest(social_posts.scraped_at, excluded.scraped_at),
          raw_post = social_posts.raw_post || excluded.raw_post
        returning id
      `;
      postRowId = rows[0].id;
      postIds.set(postKey, postRowId);
    }

    const rows = await sql`
      insert into social_comments (
        post_id, platform, external_comment_id, username, comment_text, comment_time,
        likes, reply_to, scraped_at, raw_comment, dedupe_key, status
      ) values (
        ${postRowId}, ${comment.platform}, ${comment.comment_id}, ${comment.username}, ${comment.comment_text}, ${comment.comment_time},
        ${comment.likes}, ${comment.reply_to}, ${comment.scraped_at}, ${comment.raw_comment || {}}, ${comment.dedupe_key}, 'new'
      )
      on conflict (dedupe_key) do nothing
      returning id
    `;
    if (rows.length) inserted += 1;
    else duplicates += 1;
  }

  return { inserted, duplicates, posts_touched: postIds.size };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'POST') return error(405, 'Use POST.');
  if (!authorized(event.headers || {})) return error(401, 'social sync secret inválido.');

  const token = process.env.APIFY_TOKEN || '';
  if (!token) return error(500, 'APIFY_TOKEN no está configurado en Netlify.');

  const actorId = getActorId();
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) { body = {}; }
  const usernames = getUsernames(body);
  const input = buildApifyInput({ body, usernames });
  const mode = 'username';
  const sql = getSql();
  const runId = await ensureSyncRun(sql, { status: 'running', actor_id: actorId, mode, usernames, raw_summary: { usernames, input_preview: input } });

  try {
    const datasetItems = await runApifyActor({ token, actorId, input });
    const enriched = datasetItems.map((item) => ({
      ...item,
      source_username: sourceUserFromItem(item, usernames) || usernames.join(','),
      scraped_at: item?.scraped_at || item?.scrapedAt || new Date().toISOString()
    }));
    const comments = normalizePayload({ items: enriched }).slice(0, parsePositiveInt(body.maxDatasetItems || process.env.MAX_DATASET_ITEMS_PER_SYNC, 50000, 100000));
    const insertResult = await insertComments(sql, comments);
    const summary = {
      ok: true,
      status: 'synced',
      mode,
      actor_id: actorId,
      usernames,
      posts_scanned: uniquePosts(comments),
      comments_fetched: comments.length,
      comments_inserted: insertResult.inserted,
      comments_duplicate: insertResult.duplicates,
      posts_touched: insertResult.posts_touched,
      last_sync_at: new Date().toISOString(),
      apify_dataset_items: Array.isArray(datasetItems) ? datasetItems.length : 0,
      note: 'Scrape por username. El scraper compila; el mediador interpreta.'
    };
    await finishSyncRun(sql, {
      id: runId
    }.id, {
      status: 'synced',
      posts_scanned: summary.posts_scanned,
      comments_fetched: summary.comments_fetched,
      comments_inserted: summary.comments_inserted,
      comments_duplicate: summary.comments_duplicate,
      raw_summary: summary
    });
    return json(200, summary);
  } catch (err) {
    await finishSyncRun(sql, runId, { status: 'error', error_message: safeLine(err.message || err), raw_summary: { actor_id: actorId, usernames } });
    return error(502, 'No se pudo sincronizar Campo Social desde Apify.', err);
  }
};
