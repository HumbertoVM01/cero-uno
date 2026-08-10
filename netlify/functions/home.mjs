import { db } from './_shared/db.mjs';
import { json, fail } from './_shared/http.mjs';
import { rowToAllive } from './_shared/rank.mjs';
export default async (req) => {
  if (req.method !== 'GET') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const sql = db();
    const rows = await sql`select * from allives order by total_caresses desc, created_at asc, id asc limit 3`;
    const items = rows.map((r, i) => ({ ...rowToAllive({ ...r, historical_rank: i + 1 }), trueRank: i + 1 }));
    for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
    return json({ items });
  } catch (e) { return fail(e); }
};
