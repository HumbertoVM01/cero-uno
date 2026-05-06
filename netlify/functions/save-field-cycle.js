const { getSql } = require('./_shared/db');
const { json, error, options } = require('./_shared/response');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'POST') return error(405, 'Use POST.');
  try {
    const sql = getSql();
    const body = JSON.parse(event.body || '{}');
    const commentIds = Array.isArray(body.comment_ids) ? body.comment_ids : [];
    const rows = await sql`
      insert into field_cycles (
        source, filter_used, post_count, comment_count, export_text,
        signal, tensions, desires, doubts, omega, aemp_posture, mission_update, living_state_change, archive_note
      ) values (
        ${body.source || 'tiktok_posts'}, ${body.filter_used || {}}, ${Number(body.post_count || 0)}, ${Number(body.comment_count || commentIds.length || 0)}, ${body.export_text || ''},
        ${body.signal || ''}, ${body.tensions || ''}, ${body.desires || ''}, ${body.doubts || ''}, ${body.omega || ''}, ${body.aemp_posture || ''}, ${body.mission_update || ''}, ${body.living_state_change || ''}, ${body.archive_note || ''}
      ) returning *
    `;
    if (commentIds.length) {
      for (const dedupeKey of commentIds) {
        await sql`update social_comments set status = 'cycled', cycle_id = ${rows[0].id} where dedupe_key = ${dedupeKey}`;
      }
    }
    return json(200, { ok: true, cycle: rows[0], comments_marked: commentIds.length });
  } catch (err) {
    return error(500, 'No se pudo guardar el ciclo de Campo Social.', err);
  }
};
