import * as THREE from 'three';
import { TERROR_EVENTS, terrorLocation, appearanceRange } from './terrorEvents.js';

export class TerrorDirector {
  constructor(random = Math.random) {
    this.random = random; this.time = 0; this.next = 12; this.nextFigure = 28;
    this.intensity = 0; this.history = []; this.cooldowns = new Map(); this.figures = 0;
  }
  update(dt, count, location, busy, trigger) {
    this.time += dt;
    this.intensity = Math.max(0, Math.min(100, 8 + count * 14 + Math.min(15, this.time / 60) + Math.sin(this.time / 27) * 9 + (busy ? 12 : 0)));
    if (count >= 5 || busy || this.time < this.next) return;
    const last = this.history.at(-1)?.id;
    const eligible = TERROR_EVENTS.filter(e => e.id !== last && count >= e.minItems && count <= e.maxItems
      && (location === 'woods' ? e.exterior : e.interior) && (this.cooldowns.get(e.id) ?? 0) <= this.time
      && (e.repeatable || !this.cooldowns.has(e.id)) && (e.type !== 'apparition' || this.time >= this.nextFigure));
    // Try a bounded weighted shuffle. Failed placements never consume the event cooldown.
    const ranked = eligible.map(e => ({ e, weight: this.random() / (e.chance * (e.type === 'apparition' ? 2 : 1) / (1 + Math.abs(this.intensity - e.intensity) / 100)) })).sort((a, b) => a.weight - b.weight);
    this.next = this.time + 3;
    for (const { e } of ranked.slice(0, 6)) {
      if (!trigger(e)) continue;
      this.history.push({ id: e.id, type: e.type, time: this.time, count });
      if (this.history.length > 64) this.history.shift();
      this.cooldowns.set(e.id, this.time + e.cooldown);
      this.next = this.time + e.duration + 9 + this.random() * 12 - count;
      if (e.type === 'apparition') { this.figures++; this.nextFigure = this.time + 38 + this.random() * 24 - count * 3; }
      return;
    }
  }
}

export class TerrorManager {
  constructor(scene, appearances, collision, sound, random = Math.random) {
    this.scene = scene; this.view = appearances; this.collision = collision; this.sound = sound; this.random = random;
    this.director = new TerrorDirector(random); this.active = null; this.recentZones = []; this.tick = 0;
    this.flashlight = appearances.flashlight; this.normalIntensity = this.flashlight.intensity;
    this.effect = null; this.flash = new THREE.DirectionalLight('#c3d3df', 0); this.flash.position.set(-20, 40, 10); scene.add(this.flash);
    this.interiorPoints = [
      { id: 'house-door', zone: 'house-interior', x: 0, z: 2, scale: .48 },
      { id: 'house-room', zone: 'house-room', x: 2, z: -3, scale: .48 },
      { id: 'shed-door', zone: 'shed-interior', x: -23, z: -12, scale: .48 },
    ].filter(p => !collision.blocked(p.x, p.z, 0, .8, 1.85)).map(p => ({ ...p, stages: [3, 4] }));
  }
  restore() { this.flashlight.intensity = this.normalIntensity; this.flash.intensity = 0; this.sound.ambient?.duck?.(1); }
  suspend() { this.restore(); this.sound.stop(); }
  transition() { this.active = null; this.effect = null; this.restore(); this.sound.stop(); this.sound.ambient?.duck?.(.025); }
  source(event, player) {
    const anchors = { house: { x: 0, y: 1.5, z: 0 }, shed: { x: -23, y: 1.5, z: -13 }, treehouse: { x: 23, y: 4.5, z: -16 } };
    if (event.location === 'radio') {
      const radio = this.scene.getObjectByName('old-radio');
      if (!radio) return null;
      return radio.getWorldPosition(new THREE.Vector3());
    }
    if (anchors[event.location]) {
      const point = anchors[event.location];
      return Math.hypot(point.x - player.position.x, point.z - player.position.z) < 28 ? point : null;
    }
    this.view.refreshCamera();
    for (let i = 0; i < 5; i++) {
      const angle = event.location === 'behind' ? Math.atan2(-this.view.forward.x, -this.view.forward.z) + (this.random() - .5) * .8 : this.random() * Math.PI * 2;
      const distance = event.min + this.random() * (event.max - event.min);
      const point = { x: player.position.x + Math.sin(angle) * distance, y: 1.5, z: player.position.z + Math.cos(angle) * distance };
      if (!this.collision.blocked(point.x, point.z, 0, .3, 1.7)) return point;
    }
    return null;
  }
  start(event, count, player) {
    if (event.type === 'apparition') {
      const [min, max] = event.location === 'behind' ? [10, 20] : appearanceRange(count, this.random, this.director.figures === 0);
      const original = this.view.points;
      const matches = p => event.location === 'house' ? /house/.test(p.zone) && !/treehouse/.test(p.zone)
        : event.location === 'shed' ? /shed/.test(p.zone) : event.location === 'treehouse' ? /treehouse/.test(p.zone) : true;
      this.view.points = [...original, ...this.interiorPoints].filter(matches);
      const point = this.view.choose(event.location === 'behind' ? 4 : -1, { min, max }, new Set(this.recentZones));
      this.view.points = original;
      if (!point) return false;
      this.recentZones.push(point.zone); if (this.recentZones.length > 2) this.recentZones.shift();
      this.view.monster.show(point, this.view.eye);
      this.view.monster.root.scale.y = point.scale ?? 1;
      this.active = { event, point, age: 0, seen: false, seenFor: 0, away: 0, fade: 0 };
      this.sound.play('breath', point); return true;
    }
    const point = this.source(event, player);
    if (!point && event.location !== 'any') return false;
    if (event.type !== 'sound') this.effect = { type: event.type, age: 0, duration: event.duration };
    if (event.sound) this.sound.play(event.sound, point || player.position);
    return true;
  }
  update(dt, count, player) {
    this.tick += dt; if (this.tick < .1) return;
    dt = Math.min(.2, this.tick); this.tick = 0;
    if (this.effect) {
      const e = this.effect; e.age += dt;
      if (e.type === 'silence') this.sound.ambient?.duck?.(.04);
      if (e.type === 'flicker') this.flashlight.intensity = this.normalIntensity * (Math.sin(e.age * 24) > .3 ? .3 : 1);
      if (e.type === 'lightning') this.flash.intensity = e.age < .25 ? 1.1 : 0;
      if (e.age >= e.duration) { this.effect = null; this.restore(); }
    }
    const a = this.active;
    if (a) {
      a.age += dt; const sense = this.view.sense(a.point);
      if (sense.visible) { a.seen = true; a.seenFor += dt; }
      a.away = sense.visible ? 0 : a.away + dt;
      if (a.event.id === 'lightning-figure' && sense.visible && !a.flashed) {
        a.flashed = true; this.effect = { type: 'lightning', age: 0, duration: .5 }; this.sound.play('thunder', a.point);
      }
      const leave = (a.seen && a.away >= .4) || a.age > 28 || a.seenFor >= a.event.duration
        || sense.distance < 7 || (a.event.location === 'house' && sense.lit);
      if (leave || a.fade) {
        if (sense.visible) { a.fade += dt; this.view.monster.opacity(Math.max(0, 1 - a.fade / .4)); }
        if (!sense.visible || a.fade >= .4) { this.view.monster.hide(); this.active = null; }
      }
    }
    this.director.update(dt, count, terrorLocation(player.position), !!this.active || !!this.effect, event => this.start(event, count, player));
  }
}
