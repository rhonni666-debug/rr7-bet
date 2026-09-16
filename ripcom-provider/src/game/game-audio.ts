type OscillatorKind = OscillatorType;

type WebkitAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

class EclipseAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  setMuted(value: boolean) {
    this.muted = value;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(value ? 0 : 0.55, this.context.currentTime, 0.03);
    }
  }

  get isMuted() {
    return this.muted;
  }

  async unlock() {
    const ctx = this.getContext();
    if (ctx?.state === 'suspended') await ctx.resume().catch(() => undefined);
  }

  private getContext() {
    if (this.context) return this.context;
    const AudioCtor = window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext;
    if (!AudioCtor) return null;
    const context = new AudioCtor();
    const master = context.createGain();
    master.gain.value = this.muted ? 0 : 0.55;
    master.connect(context.destination);
    this.context = context;
    this.master = master;
    return context;
  }

  private tone(frequency: number, duration: number, offset = 0, gain = 0.08, type: OscillatorKind = 'sine', endFrequency?: number) {
    const ctx = this.getContext();
    if (!ctx || !this.master || this.muted) return;
    const start = ctx.currentTime + offset;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.035, duration * 0.15));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  private noise(duration: number, offset = 0, gain = 0.035) {
    const ctx = this.getContext();
    if (!ctx || !this.master || this.muted) return;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const envelope = ctx.createGain();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.7;
    envelope.gain.value = gain;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master);
    const start = ctx.currentTime + offset;
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  spin() {
    void this.unlock();
    this.tone(150, 0.16, 0, 0.045, 'triangle', 280);
    this.tone(210, 0.13, 0.09, 0.035, 'triangle', 360);
    this.noise(0.18, 0, 0.018);
  }

  reelStop(index: number) {
    this.tone(420 + index * 85, 0.08, 0, 0.035, 'sine', 330 + index * 55);
  }

  tease() {
    void this.unlock();
    [110, 138, 165, 196].forEach((frequency, index) => {
      this.tone(frequency, 0.52, index * 0.22, 0.035 + index * 0.006, 'sawtooth', frequency * 1.35);
    });
    this.tone(55, 1.25, 0, 0.045, 'sine', 76);
  }

  bonusTrigger() {
    void this.unlock();
    this.noise(0.42, 0.02, 0.055);
    this.tone(65, 1.5, 0, 0.09, 'sine', 42);
    [220, 330, 440, 660, 880].forEach((frequency, index) => {
      this.tone(frequency, 0.55, 0.42 + index * 0.12, 0.06, index % 2 ? 'triangle' : 'sine', frequency * 1.08);
    });
  }

  freeSpin(index: number) {
    void this.unlock();
    const base = 250 + Math.min(index, 8) * 22;
    this.tone(base, 0.12, 0, 0.045, 'triangle', base * 1.35);
    this.tone(base * 1.5, 0.11, 0.1, 0.028, 'sine', base * 1.8);
  }

  win(multiplier: number) {
    void this.unlock();
    if (multiplier >= 25) {
      [330, 440, 554, 659, 880, 1108].forEach((frequency, index) => this.tone(frequency, 0.55, index * 0.1, 0.06, 'triangle', frequency * 1.03));
      this.noise(0.42, 0.05, 0.035);
      return;
    }
    if (multiplier >= 10) {
      [330, 440, 554, 659].forEach((frequency, index) => this.tone(frequency, 0.38, index * 0.11, 0.052, 'triangle'));
      return;
    }
    if (multiplier >= 5) {
      [392, 494, 587].forEach((frequency, index) => this.tone(frequency, 0.3, index * 0.1, 0.04, 'sine'));
      return;
    }
    if (multiplier > 0) {
      this.tone(520, 0.2, 0, 0.036, 'sine', 690);
      this.tone(690, 0.22, 0.12, 0.028, 'sine', 830);
    }
  }

  bonusOutro() {
    void this.unlock();
    [659, 554, 440, 330].forEach((frequency, index) => this.tone(frequency, 0.48, index * 0.14, 0.048, 'triangle', frequency * 0.94));
    this.tone(110, 1.1, 0, 0.035, 'sine', 70);
  }
}

export const eclipseAudio = new EclipseAudioEngine();
