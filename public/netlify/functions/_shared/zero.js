const crypto = require('crypto');

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const PARTS = [
  'body_hex', 'top_hex', 'left_arm_hex', 'right_arm_hex',
  'left_leg_hex', 'right_leg_hex', 'left_eye_hex', 'right_eye_hex'
];

function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toUpperCase();
  return HEX_RE.test(v) ? v : null;
}

function normalizeScent(value) {
  if (value == null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, 100);
}

function buildGenome(body) {
  const out = {};
  for (const p of PARTS) {
    const v = normalizeHex(body[p]);
    if (!v) throw new Error(`Invalid ${p}. Expected #RRGGBB.`);
    out[p] = v;
  }
  out.scent = normalizeScent(body.scent);
  out.genome_code = PARTS.map((p) => out[p]).join('-');
  out.genome_hash = sha256(`${out.genome_code}|${out.scent.toLowerCase()}`);
  return out;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function visitorHash(event, body = {}) {
  const ip = event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || '';
  const ua = event.headers['user-agent'] || '';
  const device = event.headers['x-cero-uno-device'] || body.device_id || body.deviceId || '';
  return sha256(`${ip}|${ua}|${device}`).slice(0, 48);
}

function secondBucket(now = Date.now()) {
  return Math.floor(now / 1000);
}

function safeUuid(value) {
  if (!value) return null;
  const v = String(value).trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v) ? v : null;
}

module.exports = { PARTS, buildGenome, sha256, visitorHash, secondBucket, safeUuid, normalizeScent };
