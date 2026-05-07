function safeLine(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function hashText(input) {
  let hash = 2166136261;
  const text = String(input || '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function firstPresent(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] != null && String(obj[key]).trim() !== '') return obj[key];
  }
  return '';
}

function normalizeTimestamp(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    const ms = value > 100000000000 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const text = String(value).trim();
  if (/^\d{10}$/.test(text)) return new Date(Number(text) * 1000).toISOString();
  if (/^\d{13}$/.test(text)) return new Date(Number(text)).toISOString();
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeComment(input = {}, inherited = {}) {
  const postUrl = safeLine(firstPresent(input, ['post_url', 'postUrl', 'url', 'videoUrl', 'webVideoUrl', 'shareUrl', 'link', 'video_url', 'web_video_url']) || inherited.post_url || inherited.url);
  const postId = safeLine(firstPresent(input, ['post_id', 'postId', 'awemeId', 'videoId', 'video_id', 'itemId', 'aweme_id']) || inherited.post_id || inherited.postId || inherited.awemeId || inherited.videoId);
  const postCaption = safeLine(firstPresent(input, ['post_caption', 'postCaption', 'caption', 'description', 'desc']) || inherited.post_caption || inherited.caption || inherited.desc);
  const commentId = safeLine(firstPresent(input, ['comment_id', 'commentId', 'cid', 'id', 'commentCid', 'comment_id_str']));
  const usernameRaw = firstPresent(input, ['username', 'uniqueId', 'unique_id', 'authorName', 'author', 'user', 'nickname', 'displayName', 'authorMeta']);
  const username = safeLine(typeof usernameRaw === 'object' ? firstPresent(usernameRaw, ['uniqueId', 'unique_id', 'username', 'nickname', 'name']) : usernameRaw).replace(/^@/, '');
  const commentText = safeLine(firstPresent(input, ['comment_text', 'commentText', 'text', 'comment', 'content', 'body', 'message', 'shareTitle']));
  const commentTime = normalizeTimestamp(firstPresent(input, ['comment_time', 'commentTime', 'createTime', 'create_time', 'createdAt', 'posted_at', 'postedAt', 'timestamp', 'time', 'date']));
  const scrapedAt = normalizeTimestamp(firstPresent(input, ['scraped_at', 'scrapedAt', 'collectedAt'])) || new Date().toISOString();
  const likes = Number(firstPresent(input, ['likes', 'likeCount', 'diggCount', 'digg_count', 'like_count']) || 0) || 0;
  const replyTo = safeLine(firstPresent(input, ['reply_to', 'replyTo', 'parentCommentId', 'parent_comment_id', 'parent_id']));
  if (!commentText) return null;
  const fallbackPostUrl = postUrl || (postId ? `tiktok_post:${postId}` : 'post_desconocido');
  const fallbackUsername = username || 'usuario_desconocido';
  const dedupeKey = commentId
    ? `comment:${commentId}`
    : `soft:${hashText([fallbackPostUrl, fallbackUsername, commentText, commentTime || scrapedAt].join('|'))}`;
  return {
    platform: 'tiktok',
    post_url: fallbackPostUrl,
    post_id: postId || hashText(fallbackPostUrl),
    post_caption: postCaption,
    comment_id: commentId || null,
    username: fallbackUsername,
    comment_text: commentText,
    comment_time: commentTime,
    likes,
    reply_to: replyTo || null,
    scraped_at: scrapedAt,
    dedupe_key: dedupeKey,
    raw_comment: input,
    raw_post: inherited || {}
  };
}

function extractItems(value, inherited = {}) {
  if (Array.isArray(value)) return value.flatMap((item) => extractItems(item, inherited));
  if (!value || typeof value !== 'object') return [];
  const postContext = {
    post_url: firstPresent(value, ['post_url', 'postUrl', 'url', 'videoUrl', 'webVideoUrl', 'shareUrl', 'link', 'video_url', 'web_video_url']) || inherited.post_url,
    post_id: firstPresent(value, ['post_id', 'postId', 'awemeId', 'videoId', 'video_id', 'itemId', 'aweme_id']) || inherited.post_id,
    post_caption: firstPresent(value, ['post_caption', 'postCaption', 'caption', 'description', 'desc']) || inherited.post_caption
  };
  const children = firstPresent(value, ['comments', 'commentList', 'items', 'data', 'results']);
  if (Array.isArray(children)) {
    const nested = children.flatMap((child) => extractItems(child, { ...inherited, ...postContext }));
    const own = normalizeComment(value, inherited);
    return own ? [own, ...nested] : nested;
  }
  const own = normalizeComment(value, inherited);
  return own ? [own] : [];
}

function normalizePayload(body) {
  if (Array.isArray(body)) return extractItems(body);
  if (body && Array.isArray(body.items)) return extractItems(body.items);
  if (body && Array.isArray(body.comments)) return extractItems(body.comments);
  if (body && body.data) return extractItems(body.data);
  return extractItems(body);
}

module.exports = { safeLine, hashText, normalizePayload };
