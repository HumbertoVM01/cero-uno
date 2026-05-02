const { getSql } = require('./_shared/db');
const { json, error, options } = require('./_shared/response');
const { visitorHash, secondBucket, safeUuid } = require('./_shared/zero');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'POST') return error(405, 'Use POST.');
  try {
    const sql = getSql();
    const body = JSON.parse(event.body || '{}');
    const zero_one_id = safeUuid(body.zero_one_id || body.id);
    if (!zero_one_id) return error(400, 'Invalid zero_one_id.');
    const voter_hash = visitorHash(event, body);
    const bucket = secondBucket();

    const inserted = await sql`
      insert into tap_guard (zero_one_id, voter_hash, second_bucket)
      values (${zero_one_id}, ${voter_hash}, ${bucket})
      on conflict do nothing
      returning zero_one_id
    `;
    if (!inserted.length) {
      const current = await sql`select tap_count from zero_ones where id = ${zero_one_id}`;
      return json(429, { ok: false, accepted: false, error: 'Only one tap per second.', tap_count: current[0]?.tap_count ?? null });
    }

    const rows = await sql`
      update zero_ones
      set tap_count = tap_count + 1, updated_at = now()
      where id = ${zero_one_id}
      returning tap_count
    `;
    await sql`
      insert into zero_one_tap_daily (zero_one_id, day, tap_count)
      values (${zero_one_id}, current_date, 1)
      on conflict (zero_one_id, day)
      do update set tap_count = zero_one_tap_daily.tap_count + 1
    `;
    return json(200, { ok: true, accepted: true, tap_count: rows[0]?.tap_count ?? 0 });
  } catch (err) {
    return error(500, 'Could not register tap.', err);
  }
};
