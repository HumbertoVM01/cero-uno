const { getSql } = require('./_shared/db');
const { json, error, options } = require('./_shared/response');
const { normalizePayload } = require('./_shared/social');

function authorized(headers = {}) {
  const required = process.env.SOCIAL_INGEST_SECRET || '';
  if (!required) return true;
  const given = headers['x-social-ingest-secret'] || headers['X-Social-Ingest-Secret'] || '';
  return given === required;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'POST') return error(405, 'Use POST.');
  if (!authorized(event.headers || {})) return error(401, 'social ingest secret inválido.');
  try {
    const sql = getSql();
    const body = JSON.parse(event.body || '{}');
    const comments = normalizePayload(body).slice(0, 10000);
    let inserted = 0;
    let duplicates = 0;
    const postIds = new Map();

    for (const comment of comments) {
      const postKey = comment.post_url;
      let postRowId = postIds.get(postKey);
      if (!postRowId) {
        const rows = await sql`
          insert into social_posts (platform, post_id, post_url, caption, scraped_at, raw_post)
          values (${comment.platform}, ${comment.post_id}, ${comment.post_url}, ${comment.post_caption || null}, ${comment.scraped_at}, ${comment.raw_post || {}})
          on conflict (platform, post_url)
          do update set
            caption = coalesce(excluded.caption, social_posts.caption),
            scraped_at = greatest(social_posts.scraped_at, excluded.scraped_at),
            raw_post = social_posts.raw_post || excluded.raw_post
          returning id
        `;
        postRowId = rows[0].id;
        postIds.set(postKey, postRowId);
      }

      const rows = await sql`
        insert into social_comments (
          post_id, platform, external_comment_id, username, comment_text, comment_time,
          likes, reply_to, scraped_at, raw_comment, dedupe_key, status
        ) values (
          ${postRowId}, ${comment.platform}, ${comment.comment_id}, ${comment.username}, ${comment.comment_text}, ${comment.comment_time},
          ${comment.likes}, ${comment.reply_to}, ${comment.scraped_at}, ${comment.raw_comment || {}}, ${comment.dedupe_key}, 'new'
        )
        on conflict (dedupe_key) do nothing
        returning id
      `;
      if (rows.length) inserted += 1;
      else duplicates += 1;
    }

    return json(200, { ok: true, received: comments.length, inserted, duplicates, posts_touched: postIds.size });
  } catch (err) {
    return error(500, 'No se pudieron importar comentarios del Campo Social.', err);
  }
};
