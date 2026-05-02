// sequencia-binario-universal.js
// v0.1.7
// Definición: concatenación de TODOS los strings binarios posibles por longitud:
// 0 1 00 01 10 11 000 001 010 011 100 101 110 111 0000...
// La secuencia es infinita. Por eso no existe una selección uniforme sobre "toda" la secuencia.
// Para consultas aleatorias usamos un rango finito configurable de offsets computables.

export const MAX_FIRST_BITS_MOBILE = 8192;
export const DEFAULT_FIRST_BITS = 512;
export const DEFAULT_RANDOM_OFFSET_MAX = 1000000000000n; // 1 billón de posiciones; directo y rápido con BigInt.

export function* sequenciaBinariaUniversal() {
  for (let length = 1; ; length++) {
    const total = 2 ** length;
    for (let n = 0; n < total; n++) {
      const binario = n.toString(2).padStart(length, '0');
      for (const bit of binario) yield bit;
    }
  }
}

const bitCache = new Map();

export function clampFirstBitCount(value) {
  const n = Math.floor(Number(value) || DEFAULT_FIRST_BITS);
  return Math.max(1, Math.min(MAX_FIRST_BITS_MOBILE, n));
}

export function generarBits(cantidad) {
  const count = clampFirstBitCount(cantidad);
  const key = `first:${count}`;
  if (bitCache.has(key)) return bitCache.get(key);
  const generador = sequenciaBinariaUniversal();
  let resultado = '';
  for (let i = 0; i < count; i++) resultado += generador.next().value;
  bitCache.set(key, resultado);
  return resultado;
}

function normalizeBigInt(value, fallback = 0n) {
  try {
    if (typeof value === 'bigint') return value < 0n ? 0n : value;
    const clean = String(value ?? '').replace(/[^0-9]/g, '');
    if (!clean) return fallback;
    const out = BigInt(clean);
    return out < 0n ? 0n : out;
  } catch (_) {
    return fallback;
  }
}

function totalBitsThroughLength(length) {
  const L = BigInt(length);
  if (L <= 0n) return 0n;
  // Sum_{k=1..L} k * 2^k = (L - 1) * 2^(L + 1) + 2
  return (L - 1n) * (2n ** (L + 1n)) + 2n;
}

function lengthForOffset(offset) {
  const target = normalizeBigInt(offset);
  let lo = 1n;
  let hi = 1n;
  while (totalBitsThroughLength(hi) <= target) hi *= 2n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1n;
    if (totalBitsThroughLength(mid) > target) hi = mid;
    else lo = mid + 1n;
  }
  return lo;
}

export function bitAtOffset(offset) {
  const target = normalizeBigInt(offset);
  const length = lengthForOffset(target);
  const prevTotal = totalBitsThroughLength(length - 1n);
  const local = target - prevTotal;
  const stringIndex = local / length;
  const bitIndex = Number(local % length);
  const binary = stringIndex.toString(2).padStart(Number(length), '0');
  return binary[bitIndex] || '0';
}

export function generarBitsDesdeOffset(offset, cantidad) {
  const start = normalizeBigInt(offset);
  const count = Math.max(0, Math.min(4096, Math.floor(Number(cantidad) || 0)));
  const key = `offset:${start.toString()}:${count}`;
  if (bitCache.has(key)) return bitCache.get(key);
  let resultado = '';
  for (let i = 0; i < count; i++) resultado += bitAtOffset(start + BigInt(i));
  bitCache.set(key, resultado);
  return resultado;
}

export function cryptoRandomBigInt(maxInclusive = DEFAULT_RANDOM_OFFSET_MAX) {
  const max = normalizeBigInt(maxInclusive, DEFAULT_RANDOM_OFFSET_MAX);
  const limit = max <= 0n ? 1n : max + 1n;
  try {
    const arr = new Uint32Array(2);
    crypto.getRandomValues(arr);
    const value = (BigInt(arr[0]) << 32n) + BigInt(arr[1]);
    return value % limit;
  } catch (_) {
    return BigInt(Math.floor(Math.random() * Number(limit < 9007199254740991n ? limit : 9007199254740991n)));
  }
}

export function randomSegment(count = 32, maxOffset = DEFAULT_RANDOM_OFFSET_MAX) {
  const offset = cryptoRandomBigInt(maxOffset);
  return {
    offset: offset.toString(),
    bits: generarBitsDesdeOffset(offset, count)
  };
}

export function hashToUint32(input) {
  let h = 2166136261;
  const str = String(input || 'cero-uno');
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bitSeed(seed, count = 32) {
  const offset = BigInt(hashToUint32(seed) % 1000000);
  return generarBitsDesdeOffset(offset, count);
}

export function interpretBits(bits) {
  const clean = String(bits || '').replace(/[^01]/g, '');
  const zeros = [...clean].filter((b) => b === '0').length;
  const ones = clean.length - zeros;
  let alternations = 0;
  for (let i = 1; i < clean.length; i++) if (clean[i] !== clean[i - 1]) alternations++;
  const density = ones / Math.max(1, clean.length);
  return `32 bits consultados · ${zeros} ceros · ${ones} unos · ${alternations} alternancias · densidad de 1: ${density.toFixed(2)}`;
}
