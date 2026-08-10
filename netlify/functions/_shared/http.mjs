export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}
export async function readJson(req) {
  try { return await req.json(); } catch { return {}; }
}
export function fail(error) {
  console.error(error);
  if (error?.code === 'NO_DATABASE_URL') return json({ error: 'DATABASE_NOT_CONFIGURED' }, 503);
  return json({ error: 'SERVER_ERROR' }, 500);
}
export function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
