const API = {
  create: '/api/create-zero-one',
  list: '/api/list-zero-ones',
  tap: '/api/tap-zero-one',
  stats: '/api/stats',
  importSocialComments: '/api/import-social-comments',
  listSocialComments: '/api/list-social-comments',
  exportSocialCycle: '/api/export-social-cycle',
  saveFieldCycle: '/api/save-field-cycle'
};

function deviceId() {
  const key = 'cero_uno_device_id_v1';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Cero-Uno-Device': deviceId(),
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 429) throw new Error(data.error || `HTTP ${res.status}`);
  return { status: res.status, data };
}

export async function createZeroOne(payload) {
  return request(API.create, { method: 'POST', body: JSON.stringify({ ...payload, device_id: deviceId() }) });
}

export async function listZeroOnes(sort = 'top') {
  return request(`${API.list}?sort=${encodeURIComponent(sort)}&limit=36`);
}

export async function tapZeroOne(id) {
  return request(API.tap, { method: 'POST', body: JSON.stringify({ zero_one_id: id, device_id: deviceId() }) });
}

export async function getStats() {
  return request(API.stats);
}

export async function importSocialComments(items, options = {}) {
  return request(API.importSocialComments, {
    method: 'POST',
    headers: options.secret ? { 'X-Social-Ingest-Secret': options.secret } : {},
    body: JSON.stringify({ source: options.source || 'manual', items })
  });
}

export async function listSocialComments({ limit = 250, status = '', postUrl = '' } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (status) params.set('status', status);
  if (postUrl) params.set('post_url', postUrl);
  const qs = params.toString();
  return request(`${API.listSocialComments}${qs ? `?${qs}` : ''}`);
}

export async function exportSocialCycle({ mode = 'new', limit = 2000, postUrl = '' } = {}) {
  const params = new URLSearchParams();
  if (mode) params.set('mode', mode);
  if (limit) params.set('limit', String(limit));
  if (postUrl) params.set('post_url', postUrl);
  const qs = params.toString();
  return request(`${API.exportSocialCycle}${qs ? `?${qs}` : ''}`);
}

export async function saveFieldCycle(payload) {
  return request(API.saveFieldCycle, { method: 'POST', body: JSON.stringify(payload || {}) });
}
