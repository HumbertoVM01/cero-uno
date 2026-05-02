const API = {
  create: '/api/create-zero-one',
  list: '/api/list-zero-ones',
  tap: '/api/tap-zero-one',
  stats: '/api/stats'
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
