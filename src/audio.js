// Quiet procedural wind and footsteps, generated locally. No music or jump scares.
export class AmbientAudio {
  constructor() { this.context = null; this.enabled = true; this.lastStep = 0; }
  async start() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      const ctx = this.context;
      this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
      this.noise = buffer;
      const source = ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 280;
      const gain = ctx.createGain(); gain.gain.value = .11; this.windGain = gain;
      source.connect(filter).connect(gain).connect(this.master); source.start();
    }
    await this.context.resume(); this.setActive(true);
  }
  setActive(active) { if (this.context) this.master.gain.setTargetAtTime(active && this.enabled ? .32 : 0, this.context.currentTime, .1); }
  duck(amount) { if (this.context && this.windGain) this.windGain.gain.setTargetAtTime(.11 * amount, this.context.currentTime, .25); }
  presence(kind = 'wind') {
    if (!this.context || !this.enabled || this.context.state !== 'running') return;
    const ctx = this.context, now = ctx.currentTime, duration = kind === 'step' ? .22 : 2.8;
    const source = ctx.createBufferSource(); source.buffer = this.noise;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = kind === 'step' ? 210 : 105;
    filter.Q.value = .6;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(.001, now);
    gain.gain.linearRampToValueAtTime(kind === 'transition' ? .12 : .06, now + duration * .3);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    source.connect(filter).connect(gain).connect(this.master); source.start(now); source.stop(now + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  step(distance, moving) {
    if (!this.context || !moving || distance - this.lastStep < 1.35) return;
    this.lastStep = distance;
    const ctx = this.context, now = ctx.currentTime;
    const source = ctx.createBufferSource(); source.buffer = this.noise;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 700;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(.28, now); gain.gain.exponentialRampToValueAtTime(.001, now + .12);
    source.connect(filter).connect(gain).connect(this.master); source.start(now, Math.random()); source.stop(now + .14);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
}
