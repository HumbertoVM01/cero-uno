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
  for (let i = 0; i < bits.length; i++) {
    const b = bits[i];
    tone(b === '1' ? 660 + i * 40 : 260 + i * 30, 0.08, 0.035, b === '1' ? 'triangle' : 'sine', i * 0.035);
  }
}

export function playSequence(seed = 'cero-uno', count = 32) {
  const bits = bitSeed(seed, count);
  bits.split('').forEach((bit, i) => {
    const pair = bits.slice(i, i + 2);
    let freq = bit === '1' ? 660 : 330;
    let type = bit === '1' ? 'triangle' : 'sine';
    if (pair === '11') { freq = 990; type = 'sawtooth'; }
    if (pair === '00') { freq = 220; type = 'sine'; }
    tone(freq, 0.08, pair === '00' ? 0.018 : 0.032, type, i * 0.105);
  });
  return bits;
}

export function playDeployChime() {
  [440, 660, 880, 1320].forEach((f, i) => tone(f, 0.24, 0.032, 'triangle', i * 0.08));
}
