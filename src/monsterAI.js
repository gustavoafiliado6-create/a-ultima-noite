import * as THREE from 'three';
import { MonsterAppearances } from './monsterAppearances.js';
import { MonsterNavigation } from './monsterNavigation.js';
import { MonsterAudio } from './monsterAudio.js';
import { TerrorManager } from './terrorManager.js';

export class MonsterSystem {
  constructor(scene, camera, collision, flashlight, audio, onCaught) {
    this.appearances = new MonsterAppearances(scene, camera, collision, flashlight, audio);
    this.model = this.appearances.monster; this.navigation = new MonsterNavigation(collision);
    this.camera = camera; this.collision = collision; this.audio = audio; this.onCaught = onCaught;
    this.phase = 'presence'; this.timer = 0; this.lastKnown = null; this.route = []; this.lostFor = 0;
    this.senseTimer = 0; this.pathTimer = 0; this.spawnTimer = 0; this.used = new Set(); this.footstep = 0;
    this.sound = new MonsterAudio(audio); this.terror = new TerrorManager(scene, this.appearances, collision, this.sound);
  }
  setPhase(phase) { this.phase = phase; this.timer = 0; }
  spawn(min, max) {
    const point = this.appearances.choose(-1, { min, max }, this.used);
    if (!point) return false;
    this.used.add(point.zone); this.model.show(point, this.appearances.eye); return true;
  }
  sees(player) {
    const eye = this.model.root.position.clone(); eye.y = this.model.root.scale.y < .8 ? 1.5 : 3.2;
    const target = new THREE.Vector3(player.position.x, player.position.y + 1.2, player.position.z);
    const distance = eye.distanceTo(target); if (distance > 38) return false;
    const ray = this.appearances.ray; ray.set(eye, target.sub(eye).normalize()); ray.far = Math.max(0, distance - .15);
    const obstacles = this.appearances.obstacles.filter(mesh => {
      let node = mesh; while (node) { if (!node.visible) return false; if (node.isScene) return true; node = node.parent; } return false;
    });
    return ray.intersectObjects(obstacles, false).length === 0;
  }
  move(dt, player, speed, canCatch) {
    const position = this.model.root.position;
    const indoors = (Math.abs(position.x) < 6.9 && position.z > -5.5 && position.z < 7.5)
      || (Math.abs(position.x + 23) < 3.9 && Math.abs(position.z + 13) < 3.9);
    // Compact ducked pose fits the existing doorways; navigation never ignores lintels.
    this.model.root.scale.y = indoors ? .48 : 1;
    this.senseTimer -= dt; this.pathTimer -= dt;
    if (this.senseTimer <= 0) {
      this.senseTimer = .35;
      const visible = this.sees(player), distance = Math.hypot(position.x - player.position.x, position.z - player.position.z);
      const heard = player.moving && (player.keys.has('ShiftLeft') || player.keys.has('ShiftRight')) && distance < 11;
      if (visible || heard) {
        // No climbing AI yet: investigate the foot of the real stairs if the player is above ground.
        this.lastKnown = player.position.y > 2 ? { x: 23, z: -4.5 } : { x: player.position.x, z: player.position.z };
        this.lostFor = 0;
      } else this.lostFor += .35;
    }
    if (this.lostFor > 12) { this.lastKnown = null; this.route = []; }
    if (this.lastKnown && this.pathTimer <= 0) { this.pathTimer = 1.2; this.route = this.navigation.path(position, this.lastKnown); }
    const oldX = position.x, oldZ = position.z;
    this.gazeTimer = (this.gazeTimer ?? 0) - dt;
    if (this.gazeTimer <= 0) {
      this.gazeTimer = .1;
      this.watched = this.appearances.sense({ x: position.x, z: position.z, scale: this.model.root.scale.y }).direct;
    }
    while (this.route.length && Math.hypot(position.x - this.route[0].x, position.z - this.route[0].z) < .12) this.route.shift();
    if (this.route.length && !this.watched) {
      const target = this.route[0], dx = target.x - position.x, dz = target.z - position.z, distance = Math.hypot(dx, dz);
      const step = Math.min(distance, speed * dt);
      this.collision.move(position, dx / distance * step, dz / distance * step, .32, 1.72);
      if (Math.hypot(position.x - oldX, position.z - oldZ) > .001) this.model.root.rotation.y = Math.atan2(dx, dz);
    }
    const moved = Math.hypot(position.x - oldX, position.z - oldZ);
    this.model.animate(dt, moved > .001, canCatch); this.footstep += moved;
    if (this.footstep > 2) { this.footstep = 0; this.sound.play('step', position); }
    if (canCatch && player.position.y < .6 && Math.hypot(position.x - player.position.x, position.z - player.position.z) < .85 && this.sees(player)) {
      this.setPhase('caught'); this.model.animate(0, false); this.terror.restore(); this.sound.stop(); this.onCaught();
      this.sound.play('impact', this.camera.position, true);
    }
  }
  update(dt, playing, player, inventoryCount) {
    if (this.phase === 'caught') return;
    this.sound.update(dt, playing, this.camera);
    if (!playing) this.terror.suspend();
    if (!playing || this.phase === 'caught') return;
    dt = Math.min(dt, .05); this.timer += dt;
    if (this.phase === 'presence') {
      if (inventoryCount >= 5) { this.setPhase('transition'); this.terror.transition(); }
      else this.terror.update(dt, inventoryCount, player);
      return;
    }
    if (this.phase === 'transition') {
      this.audio?.duck?.(this.timer < 5 ? .025 : .35);
      if (this.timer >= 5 && !this.transitionSound) { this.transitionSound = true; this.sound.play('thunder', { x: player.position.x + 15, y: 4, z: player.position.z - 12 }); }
      this.model.opacity(Math.max(0, 1 - this.timer));
      if (this.timer >= 1) this.model.hide();
      if (this.timer >= 10) { this.audio?.duck?.(1); this.setPhase('warning-spawn'); }
    } else if (this.phase === 'warning-spawn' || this.phase === 'walking-spawn') {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = 1;
        if (this.spawn(this.phase === 'warning-spawn' ? 25 : 20, this.phase === 'warning-spawn' ? 45 : 35)) {
          this.sound.play('breath', this.model.root.position); this.setPhase(this.phase === 'warning-spawn' ? 'warning' : 'walking-pause');
        }
      }
    } else if (this.phase === 'warning') {
      if (this.timer >= 4) this.setPhase('warning-fade');
    } else if (this.phase === 'warning-fade') {
      this.model.opacity(Math.max(0, 1 - this.timer));
      if (this.timer >= 1) { this.model.hide(); this.setPhase('gap'); }
    } else if (this.phase === 'gap') {
      if (this.timer >= 8) this.setPhase('walking-spawn');
    } else if (this.phase === 'walking-pause') {
      if (this.timer >= 3) this.setPhase('walking');
    } else if (this.phase === 'walking') {
      this.move(dt, player, 1.5, false);
      if (this.timer >= 8) { this.setPhase('hunting'); this.sound.play('heavy', this.model.root.position); }
    } else if (this.phase === 'hunting') this.move(dt, player, 4.1, true);
    if (this.phase !== 'transition' && this.phase !== 'caught') this.sound.contextual(dt, this.phase, this.model.root);
  }
}
