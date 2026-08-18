// Synthesized entirely via Web Audio API -- no audio files ship with this app,
// and none are fetched from anywhere.

export type AmbientPreset = 'OFF' | 'BROWN_NOISE' | 'RAIN' | 'ALPHA_BEATS' | 'BETA_BEATS';

export const AMBIENT_PRESETS: { id: AmbientPreset; label: string }[] = [
  { id: 'OFF', label: 'Off' },
  { id: 'BROWN_NOISE', label: 'Brown Noise' },
  { id: 'RAIN', label: 'Gentle Rain' },
  { id: 'ALPHA_BEATS', label: 'Alpha Beats' },
  { id: 'BETA_BEATS', label: 'Beta Beats' },
];

export interface AmbientAudioEngine {
  setPreset(preset: AmbientPreset): void;
  setVolume(volume: number): void;
  close(): void;
}

// Leaky integrator over white noise -- deep, warm rumble.
function buildBrownNoiseSource(ctx: AudioContext, destination: AudioNode): AudioNode[] {
  const duration = 2;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(destination);
  source.start();
  return [source];
}

// Paul Kellet's refined pink-noise filter, run through a bandpass filter
// whose center frequency drifts slowly (an LFO) to suggest rain patter/swell.
function buildRainSource(ctx: AudioContext, destination: AudioNode): AudioNode[] {
  const duration = 2;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    data[i] = pink * 0.11;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 2200;
  bandpass.Q.value = 0.6;

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 400;
  lfo.connect(lfoGain).connect(bandpass.frequency);
  lfo.start();

  source.connect(bandpass).connect(destination);
  source.start();

  return [source, bandpass, lfo, lfoGain];
}

// Two sine oscillators, one per ear, `diffHz` apart -- the brain perceives
// the difference as a binaural beat at that frequency.
function buildBinauralSource(ctx: AudioContext, destination: AudioNode, diffHz: number): AudioNode[] {
  const baseHz = 200;
  const merger = ctx.createChannelMerger(2);
  merger.connect(destination);

  const left = ctx.createOscillator();
  left.type = 'sine';
  left.frequency.value = baseHz;
  const leftPan = ctx.createStereoPanner();
  leftPan.pan.value = -1;
  left.connect(leftPan).connect(merger, 0, 0);
  left.start();

  const right = ctx.createOscillator();
  right.type = 'sine';
  right.frequency.value = baseHz + diffHz;
  const rightPan = ctx.createStereoPanner();
  rightPan.pan.value = 1;
  right.connect(rightPan).connect(merger, 0, 1);
  right.start();

  return [left, right, leftPan, rightPan, merger];
}

export function createAmbientAudioEngine(initialVolume = 0.4): AmbientAudioEngine {
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.gain.value = initialVolume;
  gain.connect(ctx.destination);
  let nodes: AudioNode[] = [];

  function teardown() {
    for (const node of nodes) {
      try {
        (node as OscillatorNode | AudioBufferSourceNode).stop?.();
      } catch {
        // already stopped
      }
      node.disconnect();
    }
    nodes = [];
  }

  return {
    setPreset(preset) {
      teardown();
      if (preset === 'OFF') return;
      ctx.resume();
      if (preset === 'BROWN_NOISE') nodes = buildBrownNoiseSource(ctx, gain);
      else if (preset === 'RAIN') nodes = buildRainSource(ctx, gain);
      else if (preset === 'ALPHA_BEATS') nodes = buildBinauralSource(ctx, gain, 10);
      else if (preset === 'BETA_BEATS') nodes = buildBinauralSource(ctx, gain, 15);
    },
    setVolume(volume) {
      gain.gain.value = volume;
    },
    close() {
      teardown();
      ctx.close().catch(() => {});
    },
  };
}
