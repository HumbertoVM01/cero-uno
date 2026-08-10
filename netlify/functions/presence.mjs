import crypto from 'node:crypto';
import { db } from './_shared/db.mjs';
import { json, readJson, fail } from './_shared/http.mjs';
function h(token) { return crypto.createHash('sha256').update(`${process.env.VISITOR_HASH_SALT || 'museo-de-allives'}:${token}`).digest('hex'); }
export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const { visitorToken = '' } = await readJson(req);
    if (String(visitorToken).length < 8) return json({ active: 0 });
    const sql = db();
    await sql`insert into visitor_presence(visitor_hash,last_seen_at) values(${h(String(visitorToken))},clock_timestamp()) on conflict(visitor_hash) do update set last_seen_at=excluded.last_seen_at`;
    const rows = await sql`select count(*)::bigint active from visitor_presence where last_seen_at >= clock_timestamp() - interval '75 seconds'`;
    return json({ active: Number(rows[0].active) });
  } catch (e) { return fail(e); }
};
