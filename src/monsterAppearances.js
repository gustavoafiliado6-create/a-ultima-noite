import * as THREE from 'three';
import { createMonster } from './monster.js';

export const APPEARANCE_RULES = Object.freeze([
  Object.freeze({ id: 'distant-watcher', min: 42, max: 75, duration: 35 }),
  Object.freeze({ id: 'trail-watcher', min: 34, max: 60, duration: 28 }),
  Object.freeze({ id: 'treehouse-watcher', min: 25, max: 45, duration: 25 }),
  Object.freeze({ id: 'near-house', min: 15, max: 30, duration: 16 }),
  Object.freeze({ id: 'behind-player', min: 10, max: 20, duration: 20 }),
]);

// Zones are surveyed against the existing collision map on construction. Invalid
// points are discarded, never moved through walls or made valid by changing terrain.
export const APPEARANCE_ZONES = Object.freeze([
  { id: 'north-woods', x: -10, z: -43, stages: [0, 1, 4] },
  { id: 'east-woods', x: 40, z: -20, stages: [0, 1, 4] },
  { id: 'west-woods', x: -40, z: -18, stages: [0, 1, 4] },
  { id: 'trail-end', x: 13, z: -25, stages: [0, 1, 4] },
  { id: 'behind-house', x: 8, z: -8, stages: [1, 3, 4] },
  { id: 'house-shadow', x: -9, z: 1, stages: [3, 4] },
  { id: 'shed-shadow', x: -29, z: -9, stages: [1, 4] },
  { id: 'treehouse-shadow', x: 29, z: -15, stages: [2, 4] },
  { id: 'treehouse-grove', x: 19, z: -23, stages: [2, 4] },
  { id: 'south-trail', x: 4, z: 32, stages: [1, 4] },
]);

// Pure state machine: no inventory, movement, damage or victory dependencies.
export class AppearanceDirector {
  constructor(view) {
    this.view = view; this.history = []; this.usedZones = new Set();
    this.active = null; this.cooldown = 25; this.probe = 0; this.time = 0;
  }
  update(dt, playing) {
    if (!playing || dt <= 0) return;
    dt = Math.min(dt, .25); this.time += dt;
    if (!this.active) {
      this.cooldown = Math.max(0, this.cooldown - dt); this.probe -= dt;
      if (this.cooldown > 0 || this.history.length >= APPEARANCE_RULES.length || this.probe > 0) return;
      this.probe = 1;
      const stage = this.history.length, rule = APPEARANCE_RULES[stage];
      const point = this.view.choose(stage, rule, this.usedZones);
      if (!point) return;
      this.usedZones.add(point.zone);
      const record = { stage: rule.id, point: point.id, zone: point.zone, startedAt: this.time, seen: false, endedAt: null, reason: null };
      this.history.push(record);
      this.active = { point, rule, record, age: 0, looking: 0, away: 0, lit: 0, fade: null };
      this.view.show(point); return;
    }
    const a = this.active; a.age += dt;
    if (a.fade !== null) {
      a.fade += dt; this.view.opacity(Math.max(0, 1 - a.fade / .9));
      if (a.fade >= .9) this.finish(a.record.reason);
      return;
    }
    const sense = this.view.sense(a.point);
    if (sense.visible) a.record.seen = true;
    a.looking = sense.direct ? a.looking + dt : 0;
    a.away = !sense.visible ? a.away + dt : 0;
    a.lit = sense.lit ? a.lit + dt : 0;
    let reason = null;
    if (a.rule.id === 'near-house' && a.lit >= .15) reason = 'flashlight';
    else if (sense.distance < (a.rule.id === 'trail-watcher' ? 20 : 7)) reason = 'approach';
    else if (a.record.seen && a.away >= .6) reason = 'looked-away';
    else if (a.age >= a.rule.duration && !sense.visible) reason = 'expired-unseen';
    else if (a.age >= a.rule.duration && (a.looking >= 3 || a.age >= a.rule.duration + 8)) reason = 'long-look';
    if (reason) {
      // Only an unseen figure disappears instantly; on-screen removal fades softly.
      if (sense.visible) { a.record.reason = reason; a.fade = 0; }
      else this.finish(reason);
    }
  }
  finish(reason) {
    this.active.record.endedAt = this.time; this.active.record.reason = reason;
    this.view.hide(); this.active = null; this.cooldown = 75; this.probe = 0;
  }
}

export function surveyAppearancePoints(collision) {
  const points = [];
  for (const zone of APPEARANCE_ZONES) {
    // Prefer the zone center; small offsets fit naturally between existing trunks.
    for (const [dx, dz] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2]]) {
      const x = zone.x + dx, z = zone.z + dz;
      if (collision.blocked(x, z, 0, .8, 3.8)) continue;
      points.push({ id: `${zone.id}:${dx}:${dz}`, zone: zone.id, stages: zone.stages, x, z });
    }
  }
  return points;
}

export class MonsterAppearances {
  constructor(scene, camera, collision, flashlight, audio) {
    this.camera = camera; this.flashlight = flashlight; this.audio = audio;
    this.points = surveyAppearancePoints(collision);
    this.obstacles = [];
    scene.traverse(mesh => {
      let parent = mesh; while (parent && parent !== camera) parent = parent.parent;
      if (mesh.isMesh && parent !== camera) this.obstacles.push(mesh);
    });
    this.monster = createMonster(); scene.add(this.monster.root);
    this.frustum = new THREE.Frustum(); this.matrix = new THREE.Matrix4(); this.ray = new THREE.Raycaster();
    this.eye = new THREE.Vector3(); this.forward = new THREE.Vector3(); this.toPoint = new THREE.Vector3();
    this.director = new AppearanceDirector({
      choose: (stage, rule, used) => this.choose(stage, rule, used),
      sense: point => this.sense(point),
      show: point => { this.monster.show(point, this.eye); this.audio?.presence?.(); },
      hide: () => this.monster.hide(), opacity: value => this.monster.opacity(value),
    });
  }
  refreshCamera() {
    this.camera.updateWorldMatrix(true, false); this.camera.getWorldPosition(this.eye); this.camera.getWorldDirection(this.forward);
    this.matrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.matrix);
  }
  inView(point) {
    // Conservative sphere around the whole silhouette: no edge-of-screen pop-in.
    return this.frustum.intersectsSphere(new THREE.Sphere(new THREE.Vector3(point.x, 1.9, point.z), 2.7));
  }
  clearSight(point) {
    // Three sparse rays allow partial silhouettes between branches without seeing through walls.
    const obstacles = this.obstacles.filter(mesh => {
      let node = mesh;
      while (node) { if (!node.visible) return false; if (node.isScene) return true; node = node.parent; }
      return false;
    });
    for (const y of [3.3, 2.5, 1.5]) {
      const target = new THREE.Vector3(point.x, y, point.z), direction = target.sub(this.eye);
      const distance = direction.length(); this.ray.set(this.eye, direction.normalize()); this.ray.far = Math.max(0, distance - .5);
      if (!this.ray.intersectObjects(obstacles, false).length) return true;
    }
    return false;
  }
  choose(stage, rule, used) {
    this.refreshCamera();
    // The first scene waits for exploration near the main house, never the start menu.
    if (stage === 0 && (Math.hypot(this.eye.x, this.eye.z) > 22 || this.eye.y > 3)) return null;
    const eligible = this.points.filter(point => {
      const distance = Math.hypot(point.x - this.eye.x, point.z - this.eye.z);
      const behind = this.toPoint.set(point.x, this.eye.y, point.z).sub(this.eye).normalize().dot(this.forward) < -.5;
      return (stage === -1 || point.stages.includes(stage)) && !used.has(point.zone) && distance >= rule.min && distance <= rule.max && !this.inView(point) && (stage !== 4 || behind);
    }).sort((a, b) => Math.abs(Math.hypot(a.x - this.eye.x, a.z - this.eye.z) - (rule.min + rule.max) / 2) - Math.abs(Math.hypot(b.x - this.eye.x, b.z - this.eye.z) - (rule.min + rule.max) / 2));
    // Bound expensive occlusion checks per probe; rotate through candidates if blocked.
    const offset = this.scanOffset ?? 0;
    for (let i = 0; i < Math.min(4, eligible.length); i++) {
      const point = eligible[(offset + i) % eligible.length];
      if (this.clearSight(point)) { this.scanOffset = 0; return point; }
    }
    this.scanOffset = offset + 4; return null;
  }
  sense(point) {
    this.refreshCamera();
    const distance = this.toPoint.set(point.x, 2.7, point.z).sub(this.eye).length();
    const cosine = this.toPoint.normalize().dot(this.forward);
    const visible = this.inView(point) && this.clearSight(point);
    return { distance, visible, direct: visible && cosine > .985,
      lit: visible && this.flashlight.visible && distance < this.flashlight.distance && cosine > Math.cos(this.flashlight.angle * .7) };
  }
  update(dt, playing) {
    // Pauses freeze both timers and the figure; same position when resuming.
    if (!playing) return;
    this.accumulator = (this.accumulator ?? 0) + dt;
    if (this.accumulator >= .1) { this.director.update(Math.min(this.accumulator, .2), true); this.accumulator = 0; }
  }
}
