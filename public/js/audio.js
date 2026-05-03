import { bitSeed } from './sequence.js';

let ctx;
function getContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, duration = 0.09, gainValue = 0.05, type = 'sine', startOffset = 0, detune = 0) {
  const audio = getContext();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  const start = audio.currentTime + startOffset;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

function click(duration = 0.035, gainValue = 0.018, startOffset = 0) {
  const audio = getContext();
  const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * duration), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const env = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * env * env;
  }
  const source = audio.createBufferSource();
  const gain = audio.createGain();
  gain.gain.value = gainValue;
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(audio.destination);
  source.start(audio.currentTime + startOffset);
}

const PAIR_PRESETS = Object.freeze({
  '00': { freq: 196, type: 'sine', gain: 0.018, duration: 0.13, label: 'respiración blanda' },
  '01': { freq: 392, type: 'triangle', gain: 0.024, duration: 0.11, label: 'apertura/pregunta' },
  '10': { freq: 294, type: 'square', gain: 0.018, duration: 0.09, label: 'impulso/desplazamiento' },
  '11': { freq: 784, type: 'triangle', gain: 0.022, duration: 0.10, label: 'aparición/gema' }
});

function cleanBits(bits, max = 256) {
  return String(bits || '').replace(/[^01]/g, '').slice(0, max);
}

function playPair(pair, startOffset = 0, opts = {}) {
  const clean = (pair || '00').padEnd(2, '0').slice(0, 2);
  const p = PAIR_PRESETS[clean] || PAIR_PRESETS['00'];
  const gain = (opts.gain ?? 1) * p.gain;
  tone(p.freq, p.duration, gain, p.type, startOffset);
  if (clean === '01') tone(p.freq * 1.5, p.duration * 0.72, gain * 0.42, 'sine', startOffset + 0.028);
  if (clean === '10') click(0.026, gain * 0.68, startOffset + 0.008);
  if (clean === '11') tone(p.freq * 1.25, p.duration * 0.78, gain * 0.5, 'sine', startOffset + 0.018, 4);
  if (clean === '00') tone(p.freq / 2, p.duration * 1.15, gain * 0.38, 'sine', startOffset + 0.012);
}


const SEQUENCE_ASSET_FILES = Object.freeze({
  bit_0: {
    ogg: '/assets/cero-uno-system/audio/sequence/ogg/cero_uno_sequence_bit_0_soft_body_v01.ogg',
    mp3: '/assets/cero-uno-system/audio/sequence/mp3/cero_uno_sequence_bit_0_soft_body_v01.mp3',
    fallbackBits: '0'
  },
  bit_1: {
    ogg: '/assets/cero-uno-system/audio/sequence/ogg/cero_uno_sequence_bit_1_gem_ping_v01.ogg',
    mp3: '/assets/cero-uno-system/audio/sequence/mp3/cero_uno_sequence_bit_1_gem_ping_v01.mp3',
    fallbackBits: '1'
  },
  pair_00: {
    ogg: '/assets/cero-uno-system/audio/sequence/ogg/cero_uno_sequence_bitpair_00_v01.ogg',
    mp3: '/assets/cero-uno-system/audio/sequence/mp3/cero_uno_sequence_bitpair_00_v01.mp3',
    fallbackBits: '00'
  },
  pair_01: {
    ogg: '/assets/cero-uno-system/audio/sequence/ogg/cero_uno_sequence_bitpair_01_v01.ogg',
    mp3: '/assets/cero-uno-system/audio/sequence/mp3/cero_uno_sequence_bitpair_01_v01.mp3',
    fallbackBits: '01'
  },
  pair_10: {
    ogg: '/assets/cero-uno-system/audio/sequence/ogg/cero_uno_sequence_bitpair_10_v01.ogg',
    mp3: '/assets/cero-uno-system/audio/sequence/mp3/cero_uno_sequence_bitpair_10_v01.mp3',
    fallbackBits: '10'
  },
  pair_11: {
    ogg: '/assets/cero-uno-system/audio/sequence/ogg/cero_uno_sequence_bitpair_11_v01.ogg',
    mp3: '/assets/cero-uno-system/audio/sequence/mp3/cero_uno_sequence_bitpair_11_v01.mp3',
    fallbackBits: '11'
  },
  example_0100011011: {
    ogg: '/assets/cero-uno-system/audio/sequence/ogg/cero_uno_sequence_example_0100011011_v01.ogg',
    mp3: '/assets/cero-uno-system/audio/sequence/mp3/cero_uno_sequence_example_0100011011_v01.mp3',
    fallbackBits: '0100011011'
  },
  example_soft_to_gem: {
    ogg: '/assets/cero-uno-system/audio/sequence/ogg/cero_uno_sequence_example_soft_to_gem_v01.ogg',
    mp3: '/assets/cero-uno-system/audio/sequence/mp3/cero_uno_sequence_example_soft_to_gem_v01.mp3',
    fallbackBits: '000001011111'
  },
  example_alternating: {
    ogg: '/assets/cero-uno-system/audio/sequence/ogg/cero_uno_sequence_example_alternating_collapse_return_v01.ogg',
    mp3: '/assets/cero-uno-system/audio/sequence/mp3/cero_uno_sequence_example_alternating_collapse_return_v01.mp3',
    fallbackBits: '010110100101'
  }
});

function canUseAudioElement() {
  return typeof Audio !== 'undefined';
}

async function playAudioFile(file, volume = 0.72) {
  if (!canUseAudioElement() || !file) return false;
  const player = new Audio(file);
  player.volume = volume;
  try {
    await player.play();
    return true;
  } catch (_) {
    return false;
  }
}

export async function playSequenceAsset(assetId = 'example_0100011011', opts = {}) {
  const asset = SEQUENCE_ASSET_FILES[assetId] || SEQUENCE_ASSET_FILES.example_0100011011;
  const preferred = opts.format === 'mp3' ? asset.mp3 : asset.ogg;
  const fallback = opts.format === 'mp3' ? asset.ogg : asset.mp3;
  const ok = await playAudioFile(preferred, opts.volume ?? 0.72) || await playAudioFile(fallback, opts.volume ?? 0.72);
  if (!ok) playBits(asset.fallbackBits, { step: opts.step ?? 0.066, gain: opts.gain ?? 1 });
  return asset.fallbackBits;
}

export function sequenceAssetIdForPair(pair) {
  const clean = String(pair || '').replace(/[^01]/g, '').padEnd(2, '0').slice(0, 2);
  return `pair_${clean}`;
}

export function playTapSound(seed = 'tap') {
  const bits = bitSeed(seed, 4);
  click(0.028, 0.022, 0);
  playBits(bits, { step: 0.032, gain: 0.85, maxBits: 4 });
}

export function playBits(bits, opts = {}) {
  const clean = cleanBits(bits, opts.maxBits ?? 256);
  const step = opts.step ?? 0.074;
  for (let i = 0; i < clean.length; i += 2) {
    playPair(clean.slice(i, i + 2), (i / 2) * step, opts);
  }
  return clean;
}

export function playSequence(seed = 'cero-uno', count = 32) {
  const bits = bitSeed(seed, count);
  playBits(bits, { maxBits: count });
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
  playBits(bits, { step: 0.036, gain: 0.82, maxBits: 128 });
  return bits;
}

export function playDeployChime() {
  playBits('0100011011', { step: 0.06, gain: 1.05, maxBits: 10 });
  [440, 660, 880, 1320].forEach((f, i) => tone(f, 0.22, 0.018, 'triangle', 0.24 + i * 0.075));
}

export function describeBitPair(pair) {
  const clean = String(pair || '').replace(/[^01]/g, '').padEnd(2, '0').slice(0, 2);
  return PAIR_PRESETS[clean]?.label || PAIR_PRESETS['00'].label;
}
