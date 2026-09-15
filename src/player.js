import { PLAYER } from './config.js';
import { floorHeight } from './collision.js';

export class Player {
  constructor(camera, collision) {
    this.camera = camera; this.collision = collision;
    this.position = { x: PLAYER.spawn.x, y: 0, z: PLAYER.spawn.z };
    this.yaw = 0; this.pitch = 0; this.fallSpeed = 0; this.keys = new Set();
    this.active = false; this.distance = 0; this.moving = false;
    camera.rotation.order = 'YXZ';
    document.addEventListener('keydown', event => {
      if (!this.active) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Space'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
    });
    document.addEventListener('keyup', event => this.keys.delete(event.code));
    document.addEventListener('mousemove', event => {
      if (!this.active) return;
      this.yaw -= event.movementX * PLAYER.sensitivity;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - event.movementY * PLAYER.sensitivity));
    });
    window.addEventListener('blur', () => this.resetInput());
    this.update(0);
  }
  resetInput() { this.keys.clear(); this.moving = false; }
  update(dt) {
    const oldX = this.position.x, oldZ = this.position.z;
    if (this.active) {
      let forward = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
      let right = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
      const length = Math.hypot(forward, right) || 1;
      forward /= length; right /= length;
      const running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const speed = (running ? PLAYER.runSpeed : PLAYER.walkSpeed) * dt;
      const dx = (right * Math.cos(this.yaw) - forward * Math.sin(this.yaw)) * speed;
      const dz = (-right * Math.sin(this.yaw) - forward * Math.cos(this.yaw)) * speed;
      this.collision.move(this.position, dx, dz, PLAYER.radius, PLAYER.height);
      const ground = floorHeight(this.position.x, this.position.z, this.position.y);
      if (this.position.y <= ground + .35 && ground >= this.position.y) {
        this.position.y = ground; this.fallSpeed = 0;
      } else {
        this.fallSpeed += 12 * dt;
        this.position.y = Math.max(ground, this.position.y - this.fallSpeed * dt);
        if (this.position.y === ground) this.fallSpeed = 0;
      }
    }
    const traveled = Math.hypot(this.position.x - oldX, this.position.z - oldZ);
    this.distance += traveled; this.moving = traveled > .001;
    const bob = this.moving ? Math.sin(this.distance * 8) * .022 : 0;
    this.camera.position.set(this.position.x, this.position.y + PLAYER.height + bob, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
