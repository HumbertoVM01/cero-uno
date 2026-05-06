const { getSql } = require('./_shared/db');
const { json, error, options } = require('./_shared/response');

function normalizeLimit(value, fallback = 120, max = 500) {
  const n = Number(value || fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(n)));
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'GET') return error(405, 'Use GET.');
  try {
    const sql = getSql();
    const params = event.queryStringParameters || {};
    const limit = normalizeLimit(params.limit, 120, 500);
    let sessionId = params.live_session_id || params.liveSessionId || '';

    let sessions;
    if (sessionId) {
      sessions = await sql`select id, platform, external_live_id, title, status, started_at, ended_at, notes from live_sessions where id = ${sessionId} limit 1`;
    } else {
      sessions = await sql`select id, platform, external_live_id, title, status, started_at, ended_at, notes from live_sessions order by started_at desc limit 1`;
      if (sessions[0]) sessionId = sessions[0].id;
    }

    if (!sessions.length) {
      return json(200, { ok: true, live_session: null, comments: [], stats: { total: 0, visible: 0 } });
    }

    const comments = await sql`
      select id, live_session_id, source, event_type, username, posted_at, text, raw_event_id, created_at
      from live_comments
      where live_session_id = ${sessionId}
      order by coalesce(posted_at, created_at) desc, created_at desc
      limit ${limit}
    `;

    const totalRows = await sql`select count(*)::int as total from live_comments where live_session_id = ${sessionId}`;
    return json(200, {
      ok: true,
      live_session: sessions[0],
      comments,
      stats: { total: totalRows[0]?.total || 0, visible: comments.length }
    });
  } catch (err) {
    return error(500, 'No se pudieron listar comentarios LIVE.', err);
  }
};
