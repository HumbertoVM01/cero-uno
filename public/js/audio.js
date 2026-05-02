import { bitSeed } from './sequence.js';

let ctx;
function getContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, duration = 0.09, gainValue = 0.05, type = 'sine', startOffset = 0) {
  const audio = getContext();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, audio.currentTime + startOffset);
  gain.gain.exponentialRampToValueAtTime(gainValue, audio.currentTime + startOffset + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + startOffset + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(audio.currentTime + startOffset);
  osc.stop(audio.currentTime + startOffset + duration + 0.02);
}

export function playTapSound(seed = 'tap') {
  const bits = bitSeed(seed, 4);
  playBits(bits, { step: 0.035, duration: 0.08, gain: 0.035 });
}

export function playBits(bits, opts = {}) {
  const clean = String(bits || '').replace(/[^01]/g, '').slice(0, 256);
  const step = opts.step ?? 0.105;
  const duration = opts.duration ?? 0.08;
  const gain = opts.gain ?? 0.032;
  clean.split('').forEach((bit, i) => {
    const pair = clean.slice(i, i + 2);
    let freq = bit === '1' ? 660 : 330;
    let type = bit === '1' ? 'triangle' : 'sine';
    if (pair === '11') { freq = 990; type = 'sawtooth'; }
    if (pair === '00') { freq = 220; type = 'sine'; }
    if (pair === '01') { freq = 520; type = 'triangle'; }
    if (pair === '10') { freq = 410; type = 'square'; }
    tone(freq, duration, pair === '00' ? gain * 0.56 : gain, type, i * step);
  });
  return clean;
}

export function playSequence(seed = 'cero-uno', count = 32) {
  const bits = bitSeed(seed, count);
  playBits(bits);
  return bits;
}


export function genomeToBinary(input) {
  const genome = typeof input === 'string'
    ? input
    : [
        input?.body_hex,
        input?.top_hex,
        input?.left_arm_hex,
        input?.right_arm_hex,
        input?.left_leg_hex,
        input?.right_leg_hex,
        input?.left_eye_hex,
        input?.right_eye_hex
      ].filter(Boolean).join('');

  return String(genome || '')
    .toUpperCase()
    .replace(/[^0-9A-F]/g, '')
    .split('')
    .map((digit) => Number.parseInt(digit, 16).toString(2).padStart(4, '0'))
    .join('');
}

export function playZeroOneSound(z) {
  const bits = genomeToBinary(z);
  playBits(bits, { step: 0.034, duration: 0.055, gain: 0.026 });
  return bits;
}

export function playDeployChime() {
  [440, 660, 880, 1320].forEach((f, i) => tone(f, 0.24, 0.032, 'triangle', i * 0.08));
}
