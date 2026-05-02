// sequencia-binario-universal.js
// v0.1.6
// Definición: concatenación de TODOS los strings binarios posibles por longitud:
// 0 1 00 01 10 11 000 001 010 011 100 101 110 111 0000...
// La secuencia se invoca: no se guarda en Neon.

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

export function generarBits(cantidad) {
  const count = Math.max(0, Number(cantidad) || 0);
  const key = `0:${count}`;
  if (bitCache.has(key)) return bitCache.get(key);
  const generador = sequenciaBinariaUniversal();
  let resultado = '';
  for (let i = 0; i < count; i++) resultado += generador.next().value;
  bitCache.set(key, resultado);
  return resultado;
}

export function generarBitsDesdeOffset(offset, cantidad) {
  const start = Math.max(0, Number(offset) || 0);
  const count = Math.max(0, Number(cantidad) || 0);
  const key = `${start}:${count}`;
  if (bitCache.has(key)) return bitCache.get(key);
  const generador = sequenciaBinariaUniversal();
  for (let i = 0; i < start; i++) generador.next();
  let resultado = '';
  for (let i = 0; i < count; i++) resultado += generador.next().value;
  bitCache.set(key, resultado);
  return resultado;
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
  const offset = hashToUint32(seed) % 4096;
  return generarBitsDesdeOffset(offset, count);
}

export function bitOfDay(date = new Date()) {
  const key = date.toISOString().slice(0, 10);
  const bits = bitSeed(`cero-uno-day-${key}`, 8);
  return bits[bits.length - 1];
}

export function interpretBits(bits) {
  const clean = String(bits || '').replace(/[^01]/g, '');
  const zeros = [...clean].filter((b) => b === '0').length;
  const ones = clean.length - zeros;
  let alternations = 0;
  for (let i = 1; i < clean.length; i++) if (clean[i] !== clean[i - 1]) alternations++;
  const density = ones / Math.max(1, clean.length);
  if (alternations > clean.length * 0.62) return 'Alta alternancia: muta sin romper tu centro.';
  if (density > 0.68) return 'Alta aparición: convierte una idea en forma visible.';
  if (density < 0.32) return 'Alta gestación: observa antes de desplegar.';
  return 'Equilibrio 0/1: sostén pausa y acción al mismo tiempo.';
}
