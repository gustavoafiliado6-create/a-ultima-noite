import test from 'node:test';
import assert from 'node:assert/strict';
import { CollisionWorld, floorHeight } from '../src/collision.js';
import { seededRandom } from '../src/config.js';

test('walls stop the player, including a very large displacement', () => {
  const world = new CollisionWorld(); world.box(0, 0, 8, .2);
  const position = { x: 0, y: 0, z: 3 };
  world.move(position, 0, -12);
  assert.ok(position.z >= .39);
});
test('wall sliding and doorway clearance', () => {
  const world = new CollisionWorld(); world.box(-3, 0, 4, .2); world.box(3, 0, 4, .2);
  const position = { x: 0, y: 0, z: 2 };
  world.move(position, 0, -4); assert.ok(position.z < -1);
  const sliding = { x: 3, y: 0, z: 1 };
  world.move(sliding, 1, -2); assert.ok(sliding.x > 3.9); assert.ok(sliding.z >= .39);
});
test('trees, furniture and map boundary stop the player', () => {
  const world = new CollisionWorld(10); world.circle(0, 0, .6);
  assert.equal(world.blocked(.7, 0, 0), true);
  assert.equal(world.blocked(2, 0, 0), false);
  assert.equal(world.blocked(9.8, 0, 0), true);
  world.box(3, 3, 1, 1, .7, .95);
  assert.equal(world.blocked(3, 3, 0), true);
});
test('overhead objects do not block ground-level movement', () => {
  const world = new CollisionWorld(); world.box(0, 0, 3, 3, 4, 7);
  assert.equal(world.blocked(0, 0, 0), false);
  assert.equal(world.blocked(0, 0, 4), true);
});
test('treehouse stairs ascend smoothly and the deck cannot teleport a player', () => {
  let y = 0;
  for (let z = -5.5; z >= -12.5; z -= .1) y = floorHeight(23, z, y);
  assert.ok(y > 3.9);
  assert.equal(floorHeight(23, -14, y), 4);
  assert.equal(floorHeight(23, -14, 0), 0);
  assert.equal(floorHeight(30, -14, 4), 0);
});
test('world seed is repeatable', () => {
  const a = seededRandom(10), b = seededRandom(10);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});
