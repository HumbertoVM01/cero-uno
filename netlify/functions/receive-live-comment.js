const crypto = require('crypto');
const { getSql } = require('./_shared/db');
const { json, error, options } = require('./_shared/response');

function requireLiveSecret(event) {
  const configured = process.env.LIVE_INGEST_SECRET;
  if (!configured) {
    const err = new Error('LIVE_INGEST_SECRET no está configurado. Campo LIVE no debe recibir eventos externos abiertos.');
    err.statusCode = 500;
    throw err;
  }
  const provided = event.headers['x-live-ingest-secret'] || event.headers['X-Live-Ingest-Secret'];
  if (provided !== configured) {
    const err = new Error('Secreto de ingesta LIVE inválido.');
    err.statusCode = 401;
    throw err;
  }
}

function cleanText(value, max = 500) {
  return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function pick(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
}

function nested(body) {
  return body?.raw_event || body?.event || body?.data || body?.payload || body;
}

function parsePostedAt(value) {
  if (!value) return null;
  if (typeof value === 'number') {
    // TikTok/client libraries sometimes provide seconds, sometimes milliseconds.
    const ms = value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric) && String(value).trim().match(/^\d{10,13}$/)) {
    return parsePostedAt(numeric);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getEventText(body) {
  const ev = nested(body);
  return cleanText(pick(
    body.text,
    body.comment,
    body.raw_text,
    body.message,
    body.msg,
    ev?.text,
    ev?.comment,
    ev?.message,
    ev?.msg,
    ev?.chat?.text
  ), 700);
}

function getUsername(body) {
  const ev = nested(body);
  const user = body.user || body.author || ev?.user || ev?.author || ev?.userDetails || {};
  return cleanText(pick(
    body.username,
    body.author_handle,
    body.authorHandle,
    body.author,
    body.uniqueId,
    body.nickname,
    ev?.username,
    ev?.uniqueId,
    ev?.nickname,
    ev?.author_handle,
    user?.uniqueId,
    user?.nickname,
    user?.username,
    user?.displayName,
    user?.name
  ), 160) || null;
}

function getRawEventId(body) {
  const ev = nested(body);
  return cleanText(pick(
    body.raw_event_id,
    body.rawEventId,
    body.event_id,
    body.eventId,
    body.id,
    body.comment_id,
    body.commentId,
    ev?.raw_event_id,
    ev?.eventId,
    ev?.id,
    ev?.commentId,
    ev?.msgId
  ), 220) || null;
}

function getExternalLiveId(body) {
  const ev = nested(body);
  return cleanText(pick(
    body.external_live_id,
    body.externalLiveId,
    body.live_id,
    body.liveId,
    body.room_id,
    body.roomId,
    body.webcast_id,
    body.webcastId,
    ev?.external_live_id,
    ev?.liveId,
    ev?.roomId,
    ev?.webcastId
  ), 180) || null;
}

function getPostedAt(body) {
  const ev = nested(body);
  return parsePostedAt(pick(
    body.posted_at,
    body.postedAt,
    body.timestamp,
    body.create_time,
    body.createTime,
    ev?.posted_at,
    ev?.timestamp,
    ev?.createTime,
    ev?.create_time
  )) || new Date().toISOString();
}

function getRawEvent(body) {
  const ev = body.raw_event && typeof body.raw_event === 'object' ? body.raw_event : body;
  // Keep provider data, but avoid unbounded payloads.
  const jsonString = JSON.stringify(ev || {});
  if (jsonString.length > 20_000) {
    return { truncated: true, provider: body.source || body.provider || 'unknown' };
  }
  return ev && typeof ev === 'object' ? ev : { provider_payload: ev || null };
}

function makeDedupeKey({ body, liveSessionId, text, postedAt, username, rawEventId }) {
  if (body.dedupe_key) return cleanText(body.dedupe_key, 220);
  const raw = [liveSessionId, rawEventId, username, postedAt, text].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function findOrCreateSession(sql, body) {
  const requestedId = body.live_session_id || body.liveSessionId;
  if (requestedId) {
    const rows = await sql`
      select id, platform, external_live_id, title, status, started_at, ended_at, notes
      from live_sessions
      where id = ${requestedId}
      limit 1
    `;
    if (!rows.length) {
      const err = new Error('live_session_id no existe en live_sessions.');
      err.statusCode = 404;
      throw err;
    }
    return rows[0];
  }

  const platform = cleanText(body.platform || body.source_platform || 'tiktok', 40) || 'tiktok';
  const externalLiveId = getExternalLiveId(body);
  const title = cleanText(body.title || body.live_title || body.liveTitle || (externalLiveId ? `TikTok LIVE · ${externalLiveId}` : 'TikTok LIVE · Cero Uno'), 180) || 'TikTok LIVE · Cero Uno';

  if (externalLiveId) {
    const existingByExternal = await sql`
      select id, platform, external_live_id, title, status, started_at, ended_at, notes
      from live_sessions
      where external_live_id = ${externalLiveId} and status = 'active'
      order by started_at desc
      limit 1
    `;
    if (existingByExternal.length) return existingByExternal[0];
  }

  const existingActive = await sql`
    select id, platform, external_live_id, title, status, started_at, ended_at, notes
    from live_sessions
    where platform = ${platform} and status = 'active'
    order by started_at desc
    limit 1
  `;
  if (existingActive.length) return existingActive[0];

  const created = await sql`
    insert into live_sessions (platform, external_live_id, title, status, notes)
    values (${platform}, ${externalLiveId}, ${title}, 'active', 'Sesión creada automáticamente por receive-live-comment porque el conector no mandó live_session_id.')
    returning id, platform, external_live_id, title, status, started_at, ended_at, notes
  `;
  return created[0];
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'POST') return error(405, 'Use POST.');
  try {
    requireLiveSecret(event);
    const sql = getSql();
    const body = JSON.parse(event.body || '{}');
    const session = await findOrCreateSession(sql, body);
    const liveSessionId = session.id;

    const text = getEventText(body);
    if (!text) return error(400, 'text/comment/message es requerido. El receiver aceptó el payload, pero no encontró texto de comentario.');

    const source = cleanText(body.source || body.provider || 'tiktok_live', 80) || 'tiktok_live';
    const eventType = cleanText(body.event_type || body.eventType || body.type || nested(body)?.type || 'comment', 80) || 'comment';
    const username = getUsername(body);
    const postedAt = getPostedAt(body);
    const rawEventId = getRawEventId(body);
    const rawEvent = getRawEvent(body);
    const dedupeKey = makeDedupeKey({ body, liveSessionId, text, postedAt, username, rawEventId });

    const rows = await sql`
      insert into live_comments (live_session_id, source, event_type, username, posted_at, text, raw_event_id, raw_event, dedupe_key)
      values (${liveSessionId}, ${source}, ${eventType}, ${username}, ${postedAt}, ${text}, ${rawEventId}, ${JSON.stringify(rawEvent)}::jsonb, ${dedupeKey})
      on conflict (dedupe_key) do update set raw_event = live_comments.raw_event
      returning id, live_session_id, source, event_type, username, posted_at, text, raw_event_id, created_at
    `;

    return json(200, { ok: true, auto_session: !Boolean(body.live_session_id || body.liveSessionId), live_session: session, live_comment: rows[0] });
  } catch (err) {
    return error(err.statusCode || 400, err.message || 'No se pudo recibir el comentario LIVE.', err);
  }
};
