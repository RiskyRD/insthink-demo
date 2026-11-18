import { useMemo, useSyncExternalStore } from 'react';

/**
 * Efek suara kartun berbasis Web Audio API murni (oscillator + noise sintesis).
 * Tidak ada berkas mp3/wav, sehingga aman untuk lab offline.
 *
 * Status bisu disimpan di localStorage dan dibagikan ke semua komponen
 * yang memakai hook ini (satu sumber kebenaran di tingkat modul).
 */

const MUTE_KEY = 'insthink.muted';
const MASTER_VOLUME = 0.6;

let ctx = null;
let master = null;
let muted = readMuted();
const listeners = new Set();

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function setMutedGlobal(value) {
  muted = Boolean(value);
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* penyimpanan browser tidak tersedia */
  }
  if (ctx && master) master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, ctx.currentTime, 0.02);
  listeners.forEach((notify) => notify());
}

function subscribe(notify) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

/** AudioContext dibuat saat suara pertama dimainkan (harus dari interaksi pengguna). */
function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!ctx) {
    ctx = new AudioCtx();
    const compressor = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(compressor);
    compressor.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// ----------------------------------------------------------------------
// Blok penyusun suara
// ----------------------------------------------------------------------
function tone(ac, { freq, start = 0, dur = 0.15, type = 'sine', gain = 0.3, slideTo, attack = 0.005, lowpass, vibrato }) {
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);

  if (vibrato) {
    const lfo = ac.createOscillator();
    const depth = ac.createGain();
    lfo.frequency.value = vibrato.rate;
    depth.gain.value = vibrato.depth;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.05);
  }

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  let node = osc;
  if (lowpass) {
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    osc.connect(filter);
    node = filter;
  }
  node.connect(env).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(ac, { start = 0, dur = 0.08, gain = 0.2, highpass = 3000 }) {
  const t0 = ac.currentTime + start;
  const length = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = highpass;
  const env = ac.createGain();
  env.gain.setValueAtTime(gain, t0);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filter).connect(env).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// ----------------------------------------------------------------------
// Efek suara
// ----------------------------------------------------------------------
const SFX = {
  /** "Tik" pendek untuk tombol. */
  click(ac) {
    tone(ac, { freq: 880, slideTo: 440, dur: 0.06, type: 'triangle', gain: 0.25 });
    tone(ac, { freq: 1760, dur: 0.025, type: 'square', gain: 0.04 });
  },

  /** Lonceng dua nada "ting-tong" untuk sinyal dari pasangan. */
  ping(ac) {
    tone(ac, { freq: 1318.5, dur: 0.5, gain: 0.3 });
    tone(ac, { freq: 2637, dur: 0.25, gain: 0.05 });
    tone(ac, { freq: 1760, start: 0.13, dur: 0.6, gain: 0.26 });
    tone(ac, { freq: 3520, start: 0.13, dur: 0.3, gain: 0.04 });
  },

  /** Koin "ba-ding" lalu fanfare ceria naik C–E–G–C. */
  success(ac) {
    tone(ac, { freq: 987.8, dur: 0.09, type: 'square', gain: 0.12 });
    tone(ac, { freq: 1318.5, start: 0.08, dur: 0.4, type: 'square', gain: 0.12 });

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => tone(ac, { freq, start: 0.28 + i * 0.09, dur: 0.18, type: 'triangle', gain: 0.24 }));
    notes.forEach((freq) => tone(ac, { freq, start: 0.66, dur: 0.75, type: 'triangle', gain: 0.1 }));
  },

  /** Buzz kartun lembut "bwomp-bwomp" yang turun (difilter agar tidak menusuk). */
  error(ac) {
    tone(ac, { freq: 233, slideTo: 196, dur: 0.22, type: 'sawtooth', gain: 0.14, lowpass: 900, vibrato: { rate: 12, depth: 6 } });
    tone(ac, { freq: 175, slideTo: 116, start: 0.24, dur: 0.42, type: 'sawtooth', gain: 0.14, lowpass: 700, vibrato: { rate: 9, depth: 5 } });
  },

  /** Mesin kasir "cek-cring!" untuk pesanan pelanggan. */
  cashRegister(ac) {
    noise(ac, { dur: 0.05, gain: 0.18, highpass: 2500 });
    tone(ac, { freq: 2093, start: 0.05, dur: 0.06, type: 'square', gain: 0.06 });
    tone(ac, { freq: 2637, start: 0.11, dur: 0.55, gain: 0.22 });
    tone(ac, { freq: 3136, start: 0.11, dur: 0.45, gain: 0.12 });
    noise(ac, { start: 0.11, dur: 0.18, gain: 0.06, highpass: 6000 });
  },
};

function play(effect) {
  if (muted) return;
  const ac = getContext();
  if (!ac) return;
  try {
    SFX[effect](ac);
  } catch {
    /* audio tidak wajib — abaikan kegagalan */
  }
}

const playClick = () => play('click');
const playPing = () => play('ping');
const playSuccess = () => play('success');
const playError = () => play('error');
const playCashRegister = () => play('cashRegister');
const toggleMute = () => setMutedGlobal(!muted);

/**
 * @returns {{ muted: boolean, toggleMute: () => void, setMuted: (v: boolean) => void,
 *   playClick: () => void, playPing: () => void, playSuccess: () => void,
 *   playError: () => void, playCashRegister: () => void }}
 */
export function useGameAudio() {
  const isMuted = useSyncExternalStore(subscribe, () => muted, () => false);

  return useMemo(
    () => ({
      muted: isMuted,
      toggleMute,
      setMuted: setMutedGlobal,
      playClick,
      playPing,
      playSuccess,
      playError,
      playCashRegister,
    }),
    [isMuted],
  );
}

export default useGameAudio;
