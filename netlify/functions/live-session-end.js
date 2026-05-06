const { getSql } = require('./_shared/db');
const { json, error, options } = require('./_shared/response');

function requireLiveSecret(event) {
  const configured = process.env.LIVE_INGEST_SECRET;
  if (!configured) {
    const err = new Error('LIVE_INGEST_SECRET no está configurado.');
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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'POST') return error(405, 'Use POST.');
  try {
    requireLiveSecret(event);
    const sql = getSql();
    const body = JSON.parse(event.body || '{}');
    const id = body.live_session_id || body.liveSessionId || body.id;
    if (!id) return error(400, 'live_session_id es requerido.');

    const rows = await sql`
      update live_sessions
      set status = 'ended', ended_at = coalesce(ended_at, now())
      where id = ${id}
      returning id, platform, external_live_id, title, status, started_at, ended_at, notes
    `;
    if (!rows.length) return error(404, 'Sesión LIVE no encontrada.');
    return json(200, { ok: true, live_session: rows[0] });
  } catch (err) {
    return error(err.statusCode || 400, err.message || 'No se pudo cerrar la sesión LIVE.', err);
  }
};
