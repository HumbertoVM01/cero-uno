const baseHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Cero-Uno-Device'
};

function normalize(value) {
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalize(v);
    return out;
  }
  return value;
}

function json(statusCode, body) {
  return { statusCode, headers: baseHeaders, body: JSON.stringify(normalize(body)) };
}

function options() {
  return { statusCode: 204, headers: baseHeaders, body: '' };
}

function error(statusCode, message, detail) {
  const payload = { ok: false, error: message };
  if (process.env.DEBUG_ERRORS === '1' && detail) payload.detail = String(detail?.stack || detail);
  return json(statusCode, payload);
}

module.exports = { json, error, options };
