import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CollisionWorld } from '../src/collision.js';
import { Player } from '../src/player.js';
import { createWorld } from '../src/world.js';

const events = { addEventListener() {} };
globalThis.document = { ...events, createElement() { return { getContext() { return { fillRect() {}, strokeRect() {}, fillText() {}, set fillStyle(v) {}, set strokeStyle(v) {}, set font(v) {}, set textAlign(v) {} }; } }; } };
globalThis.window = events;
function player(collision = new CollisionWorld()) { const p = new Player(new THREE.PerspectiveCamera(), collision); p.active = true; return p; }
function walk(p, seconds) { for (let i = 0; i < seconds * 60; i++) p.update(1 / 60); }

test('W walks forward, Shift runs, diagonals are normalized', () => {
  const a = player(); a.keys.add('KeyW'); walk(a, 1); assert.ok(Math.abs(a.position.z - 22.75) < .01);
  const b = player(); b.keys.add('KeyW'); b.keys.add('ShiftLeft'); walk(b, 1); assert.ok(Math.abs(b.position.z - 20.2) < .01);
  const c = player(); c.keys.add('KeyW'); c.keys.add('KeyD'); walk(c, 1); assert.ok(Math.abs(Math.hypot(c.position.x, c.position.z - 26) - 3.25) < .01);
});
test('pause stops movement and keeps first-person height', () => {
  const p = player(); p.active = false; p.keys.add('KeyW'); walk(p, 2);
  assert.equal(p.position.z, 26); assert.equal(p.camera.position.y, 1.72);
});
test('actual map allows entering the house, rooms and shed', () => {
  const { collision } = createWorld(new THREE.Scene());
  const p = player(collision); p.keys.add('KeyW'); walk(p, 8.5);
  assert.ok(p.position.z < -1.5, `house entrance blocked at ${p.position.z}`);
  assert.ok(p.position.z > -4.7);
  p.position = { x: -23, y: 0, z: -7 }; walk(p, 2);
  assert.ok(p.position.z < -12, `shed entrance blocked at ${p.position.z}`);
});
test('actual map supports ascending, entering and descending the treehouse', () => {
  const { collision } = createWorld(new THREE.Scene()); const p = player(collision);
  p.position = { x: 23, y: 0, z: -4 }; p.keys.add('KeyW'); walk(p, 4);
  assert.ok(p.position.y > 3.99, `height ${p.position.y}`);
  assert.ok(p.position.z < -15, `stopped at ${p.position.z}`);
  p.keys.clear(); p.keys.add('KeyS'); walk(p, 4.2);
  assert.ok(p.position.z > -5.5); assert.equal(p.position.y, 0);
});
