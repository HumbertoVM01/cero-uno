import { db } from './_shared/db.mjs';
import { json, readJson, fail } from './_shared/http.mjs';
import { VIEW_CONFIG } from './_shared/rank.mjs';
export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const body = await readJson(req);
    const ids = Array.isArray(body.ids) ? body.ids.slice(0, 30) : [];
    const view = String(body.view || 'all');
    if (!ids.length) return json({ items: [] });
    const cfg = VIEW_CONFIG[view] || VIEW_CONFIG.all;
    const rankedView = ['day','week','month','year','all'].includes(view);
    const qualifies = rankedView && view !== 'all' ? `a.${cfg.column} > 0` : 'true';
    const activeRank = rankedView ? `
      case when ${qualifies} then 1 + (select count(*) from allives b where ${view==='all'?'true':`b.${cfg.column} > 0`} and (
        b.${cfg.column} > a.${cfg.column} or
        (b.${cfg.column} = a.${cfg.column} and (b.total_caresses > a.total_caresses or
          (b.total_caresses = a.total_caresses and (b.created_at < a.created_at or (b.created_at = a.created_at and b.id < a.id)))))
      )) else null end
    ` : `
      1 + (select count(*) from allives b where b.total_caresses > a.total_caresses
        or (b.total_caresses = a.total_caresses and (b.created_at < a.created_at or (b.created_at = a.created_at and b.id < a.id))))
    `;
    const sql = db();
    const rows = await sql.query(`
      select a.id, a.total_caresses, a.caresses_24h, a.caresses_7d, a.caresses_30d, a.caresses_365d,
        ${activeRank} as active_rank,
        1 + (select count(*) from allives b where b.total_caresses > a.total_caresses
          or (b.total_caresses = a.total_caresses and (b.created_at < a.created_at or (b.created_at = a.created_at and b.id < a.id)))) as historical_rank,
        (${qualifies}) as qualifies
      from allives a where a.id = any($1::uuid[])
    `, [ids]);
    return json({ items: rows.map(r => ({ id:r.id, activeRank:r.active_rank==null?null:Number(r.active_rank), historicalRank:Number(r.historical_rank), qualifies:Boolean(r.qualifies), caresses:{ day:Number(r.caresses_24h), week:Number(r.caresses_7d), month:Number(r.caresses_30d), year:Number(r.caresses_365d), total:Number(r.total_caresses) } })) });
  } catch (e) { return fail(e); }
};
