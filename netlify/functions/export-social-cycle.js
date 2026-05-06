const { getSql } = require('./_shared/db');
const { json, error, options } = require('./_shared/response');
const { safeLine } = require('./_shared/social');

function normalizeLimit(value, fallback = 2000, max = 5000) {
  const n = Number(value || fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(n)));
}

function formatDate(value) {
  if (!value) return 'sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Mexico_City' });
}

function filterMode(comments, mode) {
  const now = Date.now();
  if (mode === 'all') return comments;
  if (mode === '7d') return comments.filter((c) => now - (new Date(c.comment_time || c.scraped_at).getTime() || now) <= 7 * 864e5);
  if (mode === '30d') return comments.filter((c) => now - (new Date(c.comment_time || c.scraped_at).getTime() || now) <= 30 * 864e5);
  if (mode === 'questions') return comments.filter((c) => /\?|qué|como|cómo|cu[aá]nto|dónde|por qué|porque|quien|quién/i.test(c.comment_text));
  if (mode === 'desire') return comments.filter((c) => /quiero|hacer|comprar|precio|vender|me interesa|deseo|necesito|entiendo|entender/i.test(c.comment_text));
  if (mode === 'tension') return comments.filter((c) => /caro|precio|no entiendo|confus|raro|cr[ií]tica|ia|inteligencia|manual|valor|por qué/i.test(c.comment_text));
  return comments.filter((c) => c.status !== 'cycled');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'GET') return error(405, 'Use GET.');
  try {
    const sql = getSql();
    const params = event.queryStringParameters || {};
    const mode = params.mode || 'new';
    const limit = normalizeLimit(params.limit, 2000, 5000);
    const postUrl = params.post_url || params.postUrl || '';

    const raw = postUrl ? await sql`
      select c.dedupe_key, c.username, c.comment_text, c.comment_time, c.scraped_at, c.status, p.post_url, p.caption as post_caption
      from social_comments c join social_posts p on p.id = c.post_id
      where p.post_url = ${postUrl}
      order by coalesce(c.comment_time, c.scraped_at) asc
      limit 5000
    ` : await sql`
      select c.dedupe_key, c.username, c.comment_text, c.comment_time, c.scraped_at, c.status, p.post_url, p.caption as post_caption
      from social_comments c join social_posts p on p.id = c.post_id
      order by coalesce(c.comment_time, c.scraped_at) asc
      limit 5000
    `;
    const comments = filterMode(raw, mode).slice(0, limit);
    const posts = new Map();
    comments.forEach((c) => {
      const current = posts.get(c.post_url) || { post_url: c.post_url, caption: c.post_caption, count: 0 };
      current.count += 1;
      posts.set(c.post_url, current);
    });
    const postLines = [...posts.values()].map((p, i) => `${i + 1}. ${p.post_url}\n   Caption: ${safeLine(p.caption) || 'sin caption'}\n   Comentarios incluidos: ${p.count}`);
    const commentLines = comments.map((c) => `[${c.post_url}] [${formatDate(c.comment_time || c.scraped_at)}] @${safeLine(c.username || 'usuario_desconocido')}: ${safeLine(c.comment_text)}`);
    const exportText = [
      'CICLO CERO UNO — CAMPO SOCIAL COMPILADO',
      '',
      `Fecha de exportación: ${formatDate(new Date().toISOString())}`,
      'Fuente: TikTok posts de @0100011011...0100011011',
      `Modo de exportación: ${mode}`,
      '',
      'Posts incluidos:',
      ...(postLines.length ? postLines : ['sin posts incluidos']),
      '',
      'Resumen bruto:',
      `Total de posts incluidos: ${posts.size}`,
      `Total de comentarios incluidos: ${comments.length}`,
      '',
      'ESTADO PREVIO DE 01:',
      'Tomar de public/data/state/current_state.json o de la lectura visible actual antes de importar este ciclo.',
      '',
      'COMENTARIOS CRUDOS:',
      ...(commentLines.length ? commentLines : ['sin comentarios incluidos']),
      '',
      'INSTRUCCIÓN PARA CHATGPT:',
      'Lee este Campo Social compilado como ciclo de Cero Uno. No analices comentario por comentario de forma aislada. No conviertas comentarios en votos. No absolutices el campo. Detecta señales, tensiones, deseos, dudas, preguntas recurrentes, riesgos OMEGA, postura AEMP sugerida, cambio de Estado Vivo, misión posible y memoria de Archivo. El mediador conserva la decisión final.'
    ].join('\n');

    return json(200, { ok: true, mode, included: comments.length, comment_ids: comments.map((c) => c.dedupe_key), export_text: exportText });
  } catch (err) {
    return error(500, 'No se pudo exportar Campo Social Compilado.', err);
  }
};
