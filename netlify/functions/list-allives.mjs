import { db } from './_shared/db.mjs';
import { json, fail, clampInt } from './_shared/http.mjs';
import { VIEW_CONFIG, rowToAllive } from './_shared/rank.mjs';

export default async (req) => {
  if (req.method !== 'GET') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const url = new URL(req.url);
    const view = url.searchParams.get('view') || 'all';
    const limit = clampInt(url.searchParams.get('limit'), 3, 25, 15);
    const position = clampInt(url.searchParams.get('position'), 1, 1000000000, 1);
    const sql = db();

    if (view === 'random') {
      let seed = Number(url.searchParams.get('seed'));
      if (!Number.isFinite(seed) || seed < 0 || seed >= 1) seed = Math.random();
      const rows = await sql.query(`
        with picked as (
          (select * from allives where random_key >= $1 order by random_key asc, id asc limit $2)
          union all
          (select * from allives where random_key < $1 order by random_key asc, id asc limit $2)
        ), limited as (select * from picked limit $2)
        select l.*,
          1 + (select count(*) from allives b where b.total_caresses > l.total_caresses
            or (b.total_caresses = l.total_caresses and (b.created_at < l.created_at or (b.created_at = l.created_at and b.id < l.id)))) as historical_rank
        from limited l
      `, [seed, limit]);
      const countRows = await sql`select count(*)::bigint as n from allives`;
      return json({ view, seed, total: Number(countRows[0].n), position: 1, items: rows.map(r => rowToAllive(r, view)) });
    }

    if (view === 'recent') {
      const start = Math.max(1, position - Math.floor(limit / 2));
      const end = start + limit - 1;
      const rows = await sql.query(`
        with hist as (
          select id, row_number() over(order by total_caresses desc, created_at asc, id asc) historical_rank from allives
        ), ordered as (
          select a.*, row_number() over(order by created_at desc, id desc) position from allives a
        ), meta as (select count(*)::bigint total from allives)
        select o.*, h.historical_rank, m.total
        from ordered o join hist h using(id) cross join meta m
        where o.position between $1 and $2
        order by o.position
      `, [start, end]);
      return json({ view, total: rows.length ? Number(rows[0].total) : 0, position: start, items: rows.map(r => rowToAllive(r, view)) });
    }

    const cfg = VIEW_CONFIG[view] || VIEW_CONFIG.all;
    const start = Math.max(1, position - Math.floor(limit / 2));
    const end = start + limit - 1;
    const newExpr = cfg.seconds ? `created_at >= clock_timestamp() - interval '${cfg.seconds} seconds'` : 'false';
    const query = `
      with ordered as (
        select a.*,
          row_number() over(order by ${cfg.column} desc, total_caresses desc, created_at asc, id asc) position,
          (${newExpr}) is_new
        from allives a
        where ${cfg.where}
      ), meta as (select count(*)::bigint total from ordered)
      select o.*, o.position historical_rank, m.total
      from ordered o cross join meta m
      where o.position between $1 and $2
      order by o.position
    `;
    const rows = await sql.query(query, [start, end]);
    return json({ view, total: rows.length ? Number(rows[0].total) : 0, position: start, items: rows.map(r => rowToAllive(r, view)) });
  } catch (e) { return fail(e); }
};
