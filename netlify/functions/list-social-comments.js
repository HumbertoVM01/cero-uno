const { getSql } = require('./_shared/db');
const { json, error, options } = require('./_shared/response');

function normalizeLimit(value, fallback = 250, max = 1000) {
  const n = Number(value || fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(n)));
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'GET') return error(405, 'Use GET.');
  try {
    const sql = getSql();
    const params = event.queryStringParameters || {};
    const limit = normalizeLimit(params.limit, 250, 1000);
    const status = params.status || '';
    const postUrl = params.post_url || params.postUrl || '';

    let comments;
    if (status && postUrl) {
      comments = await sql`
        select c.dedupe_key, c.external_comment_id, c.username, c.comment_text, c.comment_time, c.likes, c.reply_to, c.scraped_at, c.status, p.post_url, p.post_id, p.caption as post_caption
        from social_comments c join social_posts p on p.id = c.post_id
        where c.status = ${status} and p.post_url = ${postUrl}
        order by coalesce(c.comment_time, c.scraped_at) desc
        limit ${limit}
      `;
    } else if (status) {
      comments = await sql`
        select c.dedupe_key, c.external_comment_id, c.username, c.comment_text, c.comment_time, c.likes, c.reply_to, c.scraped_at, c.status, p.post_url, p.post_id, p.caption as post_caption
        from social_comments c join social_posts p on p.id = c.post_id
        where c.status = ${status}
        order by coalesce(c.comment_time, c.scraped_at) desc
        limit ${limit}
      `;
    } else if (postUrl) {
      comments = await sql`
        select c.dedupe_key, c.external_comment_id, c.username, c.comment_text, c.comment_time, c.likes, c.reply_to, c.scraped_at, c.status, p.post_url, p.post_id, p.caption as post_caption
        from social_comments c join social_posts p on p.id = c.post_id
        where p.post_url = ${postUrl}
        order by coalesce(c.comment_time, c.scraped_at) desc
        limit ${limit}
      `;
    } else {
      comments = await sql`
        select c.dedupe_key, c.external_comment_id, c.username, c.comment_text, c.comment_time, c.likes, c.reply_to, c.scraped_at, c.status, p.post_url, p.post_id, p.caption as post_caption
        from social_comments c join social_posts p on p.id = c.post_id
        order by coalesce(c.comment_time, c.scraped_at) desc
        limit ${limit}
      `;
    }

    const totals = await sql`
      select
        (select count(*)::int from social_posts) as posts,
        (select count(*)::int from social_comments) as comments,
        (select count(*)::int from social_comments where status = 'new') as new_comments,
        (select max(scraped_at) from social_comments) as last_import
    `;
    const posts = await sql`
      select p.post_url, p.post_id, p.caption, count(c.id)::int as comment_count, max(c.scraped_at) as last_scraped
      from social_posts p left join social_comments c on c.post_id = p.id
      group by p.id
      order by comment_count desc, last_scraped desc nulls last
      limit 100
    `;

    return json(200, { ok: true, stats: totals[0], posts, comments });
  } catch (err) {
    return error(500, 'No se pudo listar el Campo Social Compilado.', err);
  }
};
