import crypto from 'node:crypto';
import { db } from './_shared/db.mjs';
import { json, readJson, fail } from './_shared/http.mjs';
function visitorHash(token) {
  const salt = process.env.VISITOR_HASH_SALT || 'museo-de-allives';
  return crypto.createHash('sha256').update(`${salt}:${token}`).digest('hex');
}
async function rankFor(sql, id, col, where = 'true') {
  const q = `select 1 + count(*)::bigint rank from allives a, allives me where me.id=$1::uuid and (${where}) and (a.${col} > me.${col} or (a.${col}=me.${col} and (a.total_caresses > me.total_caresses or (a.total_caresses=me.total_caresses and (a.created_at < me.created_at or (a.created_at=me.created_at and a.id < me.id))))))`;
  const r = await sql.query(q, [id]); return Number(r[0]?.rank || 1);
}
export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const body = await readJson(req);
    const id = String(body.alliveId || '');
    const visitor = String(body.visitorToken || '');
    const actionId = String(body.actionId || '');
    if (!id || visitor.length < 8 || !actionId) return json({ error: 'INVALID_REQUEST' }, 400);
    const sql = db();
    const rows = await sql`select * from caress_allive(${id}::uuid, ${visitorHash(visitor)}, ${actionId})`;
    if (!rows.length) return json({ error: 'NOT_FOUND' }, 404);
    const r = rows[0];
    if (!r.accepted) return json({ accepted: false, nextAllowedAt: r.next_allowed_at }, 429);
    const ranks = {
      day: await rankFor(sql, id, 'caresses_24h', 'a.caresses_24h > 0'),
      week: await rankFor(sql, id, 'caresses_7d', 'a.caresses_7d > 0'),
      month: await rankFor(sql, id, 'caresses_30d', 'a.caresses_30d > 0'),
      year: await rankFor(sql, id, 'caresses_365d', 'a.caresses_365d > 0'),
      all: await rankFor(sql, id, 'total_caresses', 'true')
    };
    return json({ accepted: true, nextAllowedAt: r.next_allowed_at, caresses: { day:Number(r.caresses_24h), week:Number(r.caresses_7d), month:Number(r.caresses_30d), year:Number(r.caresses_365d), total:Number(r.total_caresses) }, ranks });
  } catch (e) { return fail(e); }
};
