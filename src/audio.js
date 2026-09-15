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
      const gain = ctx.createGain(); gain.gain.value = .11;
      source.connect(filter).connect(gain).connect(this.master); source.start();
    }
    await this.context.resume(); this.setActive(true);
  }
  setActive(active) { if (this.context) this.master.gain.setTargetAtTime(active && this.enabled ? .32 : 0, this.context.currentTime, .1); }
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
