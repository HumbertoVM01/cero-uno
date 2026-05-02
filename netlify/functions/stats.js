const { getSql } = require('./_shared/db');
const { json, error, options } = require('./_shared/response');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'GET') return error(405, 'Use GET.');
  try {
    const sql = getSql();
    const [totals, today, topColors] = await Promise.all([
      sql`select count(*)::int as zero_ones, coalesce(sum(tap_count),0)::int as taps from zero_ones`,
      sql`select coalesce(sum(tap_count),0)::int as taps_today from zero_one_tap_daily where day = current_date`,
      sql`
        select body_hex as color, count(*)::int as count
        from zero_ones
        group by body_hex
        order by count desc, body_hex asc
        limit 5
      `
    ]);
    return json(200, {
      ok: true,
      totals: totals[0] || { zero_ones: 0, taps: 0 },
      today: today[0] || { taps_today: 0 },
      top_body_colors: topColors
    });
  } catch (err) {
    return error(500, 'Could not read stats.', err);
  }
};
