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
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function parsePostedAt(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function makeDedupeKey(body) {
  if (body.dedupe_key) return cleanText(body.dedupe_key, 220);
  const raw = [body.live_session_id, body.raw_event_id, body.username, body.posted_at, body.text].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'POST') return error(405, 'Use POST.');
  try {
    requireLiveSecret(event);
    const sql = getSql();
    const body = JSON.parse(event.body || '{}');
    const liveSessionId = body.live_session_id || body.liveSessionId;
    if (!liveSessionId) return error(400, 'live_session_id es requerido.');

    const text = cleanText(body.text || body.comment || body.raw_text || '', 700);
    if (!text) return error(400, 'text es requerido.');

    const source = cleanText(body.source || 'tiktok_live', 80) || 'tiktok_live';
    const eventType = cleanText(body.event_type || body.eventType || 'comment', 80) || 'comment';
    const username = cleanText(body.username || body.author_handle || body.author || '', 160) || null;
    const postedAt = parsePostedAt(body.posted_at || body.postedAt || body.timestamp) || new Date().toISOString();
    const rawEventId = cleanText(body.raw_event_id || body.rawEventId || body.id || '', 220) || null;
    const rawEvent = body.raw_event && typeof body.raw_event === 'object' ? body.raw_event : { provider_payload: body.raw_event || null };
    const dedupeKey = makeDedupeKey({ ...body, text, live_session_id: liveSessionId, posted_at: postedAt, username });

    const rows = await sql`
      insert into live_comments (live_session_id, source, event_type, username, posted_at, text, raw_event_id, raw_event, dedupe_key)
      values (${liveSessionId}, ${source}, ${eventType}, ${username}, ${postedAt}, ${text}, ${rawEventId}, ${JSON.stringify(rawEvent)}::jsonb, ${dedupeKey})
      on conflict (dedupe_key) do update set raw_event = live_comments.raw_event
      returning id, live_session_id, source, event_type, username, posted_at, text, raw_event_id, created_at
    `;

    return json(200, { ok: true, live_comment: rows[0] });
  } catch (err) {
    return error(err.statusCode || 400, err.message || 'No se pudo recibir el comentario LIVE.', err);
  }
};
