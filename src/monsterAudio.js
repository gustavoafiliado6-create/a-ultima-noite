import * as THREE from 'three';

// Frequency, length, peak, number of separate impulses. No downloaded recordings.
export const SOUND_RECIPES = Object.freeze({
  branch: [1500, .45, .32, 3], steps: [420, 2.8, .24, 4], rush: [650, 1.9, .25, 8],
  leaves: [2300, 1.7, .13, 3], creak: [260, 2.4, .2, 1], knock: [150, 1.4, .35, 3],
  scratch: [1100, 2.2, .16, 3], rattle: [1900, 1.2, .15, 5], impact: [110, .8, .4, 1],
  breath: [580, 3.2, .2, 2], heavy: [380, 2.4, .32, 2], whisper: [2100, 2.1, .11, 2],
  static: [3300, 1.1, .09, 4], thunder: [75, 3.8, .28, 1], step: [330, .3, .32, 1],
});

export class MonsterAudio {
  constructor(ambient, random = Math.random) {
    this.ambient = ambient; this.random = random; this.voices = new Set(); this.assets = new Map();
    this.position = new THREE.Vector3(); this.forward = new THREE.Vector3(); this.up = new THREE.Vector3();
    this.listenerTimer = 0; this.contextTimer = 5;
  }
  async loadAsset(kind, url) {
    const ctx = this.ambient?.context; if (!ctx) return false;
    try {
      const response = await fetch(url); if (!response.ok) return false;
      this.assets.set(kind, await ctx.decodeAudioData(await response.arrayBuffer())); return true;
    } catch { return false; }
  }
  play(kind, position, final = false) {
    const a = this.ambient, ctx = a?.context;
    if (!ctx || !a.enabled || ctx.state !== 'running' || this.voices.size >= 4) return false;
    const recipe = SOUND_RECIPES[kind]; if (!recipe) return false;
    const [frequency, length, peak, pulses] = recipe, now = ctx.currentTime;
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain(), panner = ctx.createPanner();
    source.buffer = this.assets.get(kind) || a.noise; source.loop = !this.assets.has(kind);
    source.playbackRate.value = .9 + this.random() * .2;
    filter.type = 'bandpass'; filter.frequency.setValueAtTime(frequency * (.85 + this.random() * .3), now);
    filter.frequency.exponentialRampToValueAtTime(frequency * .7, now + length); filter.Q.value = kind === 'creak' ? 8 : .7;
    panner.panningModel = 'HRTF'; panner.distanceModel = 'inverse'; panner.refDistance = 7; panner.maxDistance = 100; panner.rolloffFactor = 1.25;
    panner.positionX.value = position.x; panner.positionY.value = position.y ?? 1.5; panner.positionZ.value = position.z;
    gain.gain.setValueAtTime(.0001, now);
    for (let i = 0; i < pulses; i++) {
      const t = now + i * length / pulses, span = length / pulses;
      gain.gain.setValueAtTime(.0001, t);
      gain.gain.linearRampToValueAtTime(peak * (.75 + this.random() * .25) * (final ? .32 : 1), t + span * .2);
      gain.gain.exponentialRampToValueAtTime(.0001, t + span * .95);
    }
    source.connect(filter).connect(gain).connect(panner).connect(final ? ctx.destination : a.master);
    const voice = { source, filter, gain, panner }; this.voices.add(voice);
    source.onended = () => { for (const node of Object.values(voice)) node.disconnect(); this.voices.delete(voice); };
    source.start(now); source.stop(now + length); return true;
  }
  stop() { for (const voice of this.voices) { voice.gain.gain.value = 0; voice.source.stop(); } this.voices.clear(); }
  update(dt, playing, camera) {
    if (!playing || !this.ambient?.enabled) { this.stop(); return; }
    const ctx = this.ambient?.context; if (!ctx) return;
    this.listenerTimer -= dt; if (this.listenerTimer > 0) return; this.listenerTimer = .06;
    camera.updateWorldMatrix(true, false); camera.getWorldPosition(this.position); camera.getWorldDirection(this.forward);
    this.up.set(0, 1, 0).transformDirection(camera.matrixWorld);
    const listener = ctx.listener;
    if (listener.positionX) {
      for (const axis of ['x', 'y', 'z']) {
        const suffix = axis.toUpperCase();
        listener[`position${suffix}`].value = this.position[axis];
        listener[`forward${suffix}`].value = this.forward[axis];
        listener[`up${suffix}`].value = this.up[axis];
      }
    } else { listener.setPosition(...this.position); listener.setOrientation(...this.forward, ...this.up); }
  }
  contextual(dt, phase, root) {
    this.contextTimer -= dt; if (!root.visible || this.contextTimer > 0) return;
    this.contextTimer = phase === 'hunting' ? 3 + this.random() * 4 : 7 + this.random() * 8;
    this.play(phase === 'hunting' ? 'heavy' : 'breath', root.position);
  }
}
