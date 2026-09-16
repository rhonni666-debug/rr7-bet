type OscType = OscillatorType;

class EclipseAudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private unlocked = false;

  isEnabled() {
    return this.enabled;
  }

  setEnabled(value: boolean) {
    this.enabled = value;
    if (this.master) this.master.gain.value = value ? 0.32 : 0;
  }

  async unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      this.ctx = new AudioCtor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.32 : 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.unlocked = true;
  }

  private ready() {
    return Boolean(this.enabled && this.unlocked && this.ctx && this.master);
  }

  private tone(freq: number, duration: number, opts: { type?: OscType; gain?: number; when?: number; endFreq?: number } = {}) {
    if (!this.ready() || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime + (opts.when ?? 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, now);
    if (opts.endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.endFreq), now + duration);
    const peak = opts.gain ?? 0.11;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + Math.min(0.035, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  private noise(duration: number, gainAmount = 0.08, when = 0) {
    if (!this.ready() || !this.ctx || !this.master) return;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    gain.gain.value = gainAmount;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(this.ctx.currentTime + when);
  }

  spin() {
    this.tone(180, 0.22, { type: 'sawtooth', gain: 0.055, endFreq: 520 });
    this.noise(0.18, 0.045);
  }

  freeSpin() {
    this.tone(320, 0.16, { type: 'triangle', gain: 0.06, endFreq: 720 });
    this.tone(640, 0.14, { type: 'sine', gain: 0.035, when: 0.08, endFreq: 980 });
  }

  tease() {
    [220, 294, 392, 523, 698].forEach((freq, index) => {
      this.tone(freq, 0.28, { type: 'triangle', gain: 0.055 + index * 0.008, when: index * 0.22, endFreq: freq * 1.12 });
    });
    this.tone(82, 1.25, { type: 'sine', gain: 0.065, endFreq: 110 });
  }

  bonusHit() {
    this.noise(0.55, 0.13);
    this.tone(72, 0.7, { type: 'sine', gain: 0.16, endFreq: 48 });
    [196, 294, 392, 587, 784].forEach((freq, index) => {
      this.tone(freq, 0.7, { type: index < 2 ? 'triangle' : 'sine', gain: 0.075, when: 0.12 + index * 0.1, endFreq: freq * 1.18 });
    });
  }

  win(multiplier: number) {
    const scale = multiplier >= 25 ? [392, 523, 659, 784, 1047] : multiplier >= 8 ? [330, 440, 554, 659] : [440, 554, 659];
    scale.forEach((freq, index) => {
      this.tone(freq, multiplier >= 8 ? 0.48 : 0.3, { type: 'sine', gain: multiplier >= 25 ? 0.1 : 0.065, when: index * 0.085, endFreq: freq * 1.03 });
    });
    if (multiplier >= 8) this.noise(0.32, multiplier >= 25 ? 0.1 : 0.06, 0.08);
  }

  bonusComplete() {
    [262, 330, 392, 523, 659, 784].forEach((freq, index) => {
      this.tone(freq, 0.55, { type: 'sine', gain: 0.07, when: index * 0.09, endFreq: freq * 1.04 });
    });
  }
}

export const eclipseAudio = new EclipseAudioEngine();
