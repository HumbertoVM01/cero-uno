const { getSql } = require('./_shared/db');
const { json, error, options } = require('./_shared/response');

function requireLiveSecret(event) {
  const configured = process.env.LIVE_INGEST_SECRET;
  if (!configured) {
    const err = new Error('LIVE_INGEST_SECRET no está configurado. Campo LIVE no debe aceptar sesiones externas abiertas.');
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

function trimText(value, max = 240) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'POST') return error(405, 'Use POST.');
  try {
    requireLiveSecret(event);
    const sql = getSql();
    const body = JSON.parse(event.body || '{}');
    const platform = trimText(body.platform || 'tiktok', 40) || 'tiktok';
    const externalLiveId = trimText(body.external_live_id || body.externalLiveId || '', 180) || null;
    const title = trimText(body.title || 'TikTok LIVE · Cero Uno', 180) || 'TikTok LIVE · Cero Uno';
    const notes = trimText(body.notes || '', 500) || null;

    const rows = await sql`
      insert into live_sessions (platform, external_live_id, title, status, notes)
      values (${platform}, ${externalLiveId}, ${title}, 'active', ${notes})
      returning id, platform, external_live_id, title, status, started_at, ended_at, notes
    `;

    return json(200, { ok: true, live_session: rows[0] });
  } catch (err) {
    return error(err.statusCode || 400, err.message || 'No se pudo iniciar la sesión LIVE.', err);
  }
};
