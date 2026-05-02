const { getSql } = require('./_shared/db');
const { json, error, options } = require('./_shared/response');
const { buildGenome, visitorHash, safeUuid } = require('./_shared/zero');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'POST') return error(405, 'Use POST.');
  try {
    const sql = getSql();
    const body = JSON.parse(event.body || '{}');
    const genome = buildGenome(body);
    const author_hash = visitorHash(event, body);
    const parent_id = safeUuid(body.parent_id || body.parentId);
    let root_id = null;
    let depth = 0;
    let mutation_type = parent_id ? 'community_remix' : 'origin';
    let mutation_diff = {};

    if (parent_id) {
      const parents = await sql`select id, root_id, depth, body_hex, top_hex, left_arm_hex, right_arm_hex, left_leg_hex, right_leg_hex, left_eye_hex, right_eye_hex, scent from zero_ones where id = ${parent_id} limit 1`;
      if (parents.length) {
        const parent = parents[0];
        root_id = parent.root_id || parent.id;
        depth = Math.min(Number(parent.depth || 0) + 1, 32);
        for (const [k, v] of Object.entries(genome)) {
          if (k.endsWith('_hex') && parent[k] && parent[k].toUpperCase() !== v) mutation_diff[k] = [parent[k], v];
        }
        if ((parent.scent || '') !== genome.scent) mutation_diff.scent = [parent.scent || '', genome.scent];
      }
    }

    const rows = await sql`
      insert into zero_ones (
        body_hex, top_hex, left_arm_hex, right_arm_hex, left_leg_hex, right_leg_hex, left_eye_hex, right_eye_hex,
        scent, genome_hash, parent_id, root_id, depth, mutation_type, mutation_diff, author_hash
      ) values (
        ${genome.body_hex}, ${genome.top_hex}, ${genome.left_arm_hex}, ${genome.right_arm_hex},
        ${genome.left_leg_hex}, ${genome.right_leg_hex}, ${genome.left_eye_hex}, ${genome.right_eye_hex},
        ${genome.scent}, ${genome.genome_hash}, ${parent_id}, ${root_id}, ${depth}, ${mutation_type}, ${JSON.stringify(mutation_diff)}::jsonb, ${author_hash}
      )
      on conflict (genome_hash) do update set updated_at = now()
      returning id, body_hex, top_hex, left_arm_hex, right_arm_hex, left_leg_hex, right_leg_hex, left_eye_hex, right_eye_hex,
        scent, genome_code, genome_hash, parent_id, root_id, depth, mutation_type, mutation_diff, tap_count, created_at
    `;

    const created = rows[0];
    if (!created.root_id) {
      const updated = await sql`update zero_ones set root_id = id where id = ${created.id} and root_id is null returning root_id`;
      if (updated[0]) created.root_id = updated[0].root_id;
    }
    return json(200, { ok: true, zero_one: created });
  } catch (err) {
    if (err.code === 'NO_DATABASE_URL') return error(500, err.message, err);
    return error(400, err.message || 'Could not create Cero Uno.', err);
  }
};
