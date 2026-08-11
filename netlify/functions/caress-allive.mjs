import crypto from 'node:crypto';
import { db } from './_shared/db.mjs';
import { json, readJson, fail } from './_shared/http.mjs';

function visitorHash(token) {
  const salt = process.env.VISITOR_HASH_SALT || 'museo-de-allives';
  return crypto.createHash('sha256').update(`${salt}:${token}`).digest('hex');
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const body = await readJson(req);
    const id = String(body.alliveId || '');
    const visitor = String(body.visitorToken || '');
    const actionId = String(body.actionId || '');
    if (!id || visitor.length < 8 || !actionId) return json({ error: 'INVALID_REQUEST' }, 400);

    // One database call performs the cooldown check, increments all counters,
    // and writes the minute bucket atomically. Rankings are refreshed by the
    // existing live snapshot immediately after the response.
    const sql = db();
    const rows = await sql`select * from caress_allive(${id}::uuid, ${visitorHash(visitor)}, ${actionId})`;
    if (!rows.length) return json({ error: 'NOT_FOUND' }, 404);

    const r = rows[0];
    const payload = {
      accepted: Boolean(r.accepted),
      nextAllowedAt: r.next_allowed_at,
      caresses: {
        day: Number(r.caresses_24h),
        week: Number(r.caresses_7d),
        month: Number(r.caresses_30d),
        year: Number(r.caresses_365d),
        total: Number(r.total_caresses),
      },
    };

    if (!r.accepted) return json(payload, 429);
    return json(payload);
  } catch (e) {
    return fail(e);
  }
};
