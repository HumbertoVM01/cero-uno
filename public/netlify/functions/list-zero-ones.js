const { getSql } = require('./_shared/db');
const { json, error, options } = require('./_shared/response');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'GET') return error(405, 'Use GET.');
  try {
    const sql = getSql();
    const params = event.queryStringParameters || {};
    const sort = params.sort === 'new' ? 'new' : 'top';
    const limit = Math.max(1, Math.min(60, Number(params.limit || 30)));
    let rows;
    if (sort === 'new') {
      rows = await sql`
        select id, body_hex, top_hex, left_arm_hex, right_arm_hex, left_leg_hex, right_leg_hex, left_eye_hex, right_eye_hex,
          scent, genome_code, genome_hash, parent_id, root_id, depth, mutation_type, tap_count, created_at
        from zero_ones
        order by created_at desc
        limit ${limit}
      `;
    } else {
      rows = await sql`
        select id, body_hex, top_hex, left_arm_hex, right_arm_hex, left_leg_hex, right_leg_hex, left_eye_hex, right_eye_hex,
          scent, genome_code, genome_hash, parent_id, root_id, depth, mutation_type, tap_count, created_at
        from zero_ones
        order by tap_count desc, created_at desc
        limit ${limit}
      `;
    }
    return json(200, { ok: true, zero_ones: rows });
  } catch (err) {
    return error(500, 'Could not list Cero Unos.', err);
  }
};
