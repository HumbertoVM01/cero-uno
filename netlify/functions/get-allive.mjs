import { db } from './_shared/db.mjs';
import { json, fail } from './_shared/http.mjs';
import { rowToAllive } from './_shared/rank.mjs';
export default async (req) => {
  if (req.method !== 'GET') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'ID_REQUIRED' }, 400);
    const sql = db();
    const rows = await sql.query(`
      select a.*,
        1 + (select count(*) from allives b where b.total_caresses > a.total_caresses
          or (b.total_caresses = a.total_caresses and (b.created_at < a.created_at or (b.created_at = a.created_at and b.id < a.id)))) as historical_rank
      from allives a where a.id = $1::uuid
    `, [id]);
    if (!rows.length) return json({ error: 'NOT_FOUND' }, 404);
    return json({ allive: rowToAllive(rows[0]) });
  } catch (e) { return fail(e); }
};
