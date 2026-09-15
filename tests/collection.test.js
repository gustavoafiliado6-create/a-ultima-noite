import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Inventory } from '../src/inventory.js';
import { ITEMS, createCollectibles } from '../src/collectibles.js';
import { CollectionSystem, collectionUI } from '../src/interaction.js';
import { createWorld } from '../src/world.js';
import { Player } from '../src/player.js';

globalThis.document = { addEventListener() {}, createElement() { return { getContext() { return { fillRect() {}, strokeRect() {}, fillText() {} }; } }; } };
globalThis.window = { addEventListener() {} };
const views = [[-3.4, 0, .95], [-19, 0, -7.95], [22.3, 4, -15.8], [-13, 0, -22.85], [-2.4, 0, -2.35]];
function setup() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(72, 1, .06, 200);
  const world = createWorld(scene), items = createCollectibles(scene, world.collision);
  const inventory = new Inventory(ITEMS);
  const state = {};
  const ui = { setCount(n, total) { state.count = `${n}/${total}`; }, setTarget(name) { state.target = name; }, showFound(name) { state.toast = name; } };
  const collection = new CollectionSystem(scene, camera, items, inventory, ui);
  function aim(i) { const [x, y, z] = views[i]; camera.position.set(x, y + 1.72, z); camera.lookAt(items[i].bounds.getCenter(new THREE.Vector3())); camera.updateMatrixWorld(true); }
  return { scene, camera, world, items, inventory, state, collection, aim };
}
const pressE = { code: 'KeyE', repeat: false };

test('inventory metadata is isolated, unique and ready for future descriptions', () => {
  const inventory = new Inventory(ITEMS);
  assert.equal(inventory.count, 0); assert.equal(inventory.total, 5);
  assert.equal(inventory.add('unknown'), false);
  assert.equal(inventory.add('rusty-key'), true); assert.equal(inventory.add('rusty-key'), false);
  const copy = inventory.list(); copy[0].name = 'changed'; copy.pop();
  assert.equal(inventory.get('rusty-key').name, 'Chave enferrujada'); assert.equal(inventory.count, 1);
  assert.equal(inventory.get('old-radio'), null);
});

test('all five actual map items are visible, reachable and collected once with E; count 0/5 to 5/5', () => {
  const s = setup(); assert.equal(s.state.count, '0/5'); assert.equal(s.items.length, 5);
  s.items.forEach((item, i) => {
    assert.deepEqual(item.group.position.toArray(), [ITEMS[i].x, ITEMS[i].y, ITEMS[i].z]);
    const [x, y, z] = views[i]; assert.equal(s.world.collision.blocked(x, z, y), false, `approach blocked: ${item.definition.id}`);
    s.aim(i); s.collection.update(.016, true);
    assert.equal(s.state.target, item.definition.name, `cannot see ${item.definition.id}`);
    assert.equal(s.collection.handleKey(pressE, true), true);
    assert.equal(item.group.visible, false); assert.equal(item.group.parent, null);
    assert.ok(s.inventory.has(item.definition.id)); assert.equal(s.state.count, `${i + 1}/5`);
    assert.equal(s.state.toast, item.definition.name); assert.equal(s.state.target, null);
    assert.equal(s.collection.handleKey(pressE, true), false);
  });
  s.collection.update(3.1, true); assert.equal(s.state.toast, null); assert.equal(s.inventory.count, 5);
});

test('distance, looking away, pause, wrong key and held E cannot collect', () => {
  const s = setup(); s.aim(0);
  for (const event of [{ code: 'KeyF' }, { code: 'KeyE', repeat: true }]) assert.equal(s.collection.handleKey(event, true), false);
  assert.equal(s.collection.handleKey(pressE, false), false);
  s.camera.position.z = 10; s.camera.lookAt(s.items[0].bounds.getCenter(new THREE.Vector3()));
  assert.equal(s.collection.handleKey(pressE, true), false);
  s.aim(0); s.camera.lookAt(-3.4, 1.72, 10); assert.equal(s.collection.handleKey(pressE, true), false);
  s.aim(0); s.collection.update(0, true); assert.ok(s.state.target);
  s.collection.update(0, false); assert.equal(s.state.target, null); assert.equal(s.inventory.count, 0);
});

test('a wall blocks line of sight even within range, including stale target', () => {
  const s = setup(); s.aim(0); s.collection.update(0, true); assert.ok(s.state.target);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 3, .12), new THREE.MeshBasicMaterial());
  wall.position.set(-3.4, 1.5, 1.3); s.scene.add(wall); s.collection.occluders.push(wall);
  assert.equal(s.collection.handleKey(pressE, true), false); assert.equal(s.inventory.count, 0);
});

test('HUD adapter updates prompt, reticle, count and toast without HTML injection', () => {
  const nodes = new Map(); const root = { querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, { hidden: false, textContent: '', classList: { toggle(name, value) { this[name] = value; } } }); return nodes.get(selector); } };
  const ui = collectionUI(root); ui.setCount(5, 5); ui.setTarget('Mapa antigo'); ui.showFound('Mapa antigo');
  assert.equal(nodes.get('#collection-count').textContent, '5/5'); assert.equal(nodes.get('#interaction-prompt').hidden, false);
  assert.equal(nodes.get('.crosshair').classList.interactive, true); assert.match(nodes.get('#collection-toast').textContent, /Mapa antigo/);
  ui.setTarget(null); ui.showFound(null); assert.equal(nodes.get('#interaction-prompt').hidden, true); assert.equal(nodes.get('#collection-toast').hidden, true);
});

test('existing house corridor and treehouse stairs stay traversable with the new props', () => {
  const s = setup(); const p = new Player(s.camera, s.world.collision); p.active = true; p.keys.add('KeyW');
  for (let i = 0; i < 510; i++) p.update(1 / 60); assert.ok(p.position.z < -1.5);
  p.position = { x: 23, y: 0, z: -4 };
  for (let i = 0; i < 240; i++) p.update(1 / 60); assert.ok(p.position.y > 3.99); assert.ok(p.position.z < -15);
  p.keys.clear(); p.keys.add('KeyS'); for (let i = 0; i < 252; i++) p.update(1 / 60);
  assert.equal(p.position.y, 0); assert.ok(p.position.z > -5.5);
});

test('ground approaches and stair entrance are connected to the player spawn', () => {
  const { world } = setup();
  // Half-meter flood fill with midpoint checks: catches items trapped in tree clusters.
  const goals = new Set(['-7,2', '-38,-16', '-26,-46', '-5,-5', '46,-8']);
  const queue = [[0, 52]], seen = new Set(['0,52']);
  const free = new Map();
  const blocked = (x, z) => { const key = `${x},${z}`; if (!free.has(key)) free.set(key, world.collision.blocked(x, z, 0)); return free.get(key); };
  for (let i = 0; i < queue.length && goals.size; i++) {
    const [x, z] = queue[i]; goals.delete(`${x},${z}`);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, key = `${nx},${nz}`;
      if (seen.has(key)) continue; seen.add(key);
      if (blocked(nx / 2, nz / 2) || blocked((x + nx) / 4, (z + nz) / 4)) continue;
      queue.push([nx, nz]);
    }
  }
  assert.equal(goals.size, 0, `Unreachable approaches: ${[...goals]}`);
});
