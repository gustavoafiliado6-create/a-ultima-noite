import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { seededRandom } from '../src/config.js';
import { TerrorDirector, TerrorManager } from '../src/terrorManager.js';
import { TERROR_EVENTS, appearanceRange, terrorLocation } from '../src/terrorEvents.js';
import { MonsterAudio, SOUND_RECIPES } from '../src/monsterAudio.js';
import { MonsterAppearances } from '../src/monsterAppearances.js';
import { CollisionWorld } from '../src/collision.js';
import { createWorld } from '../src/world.js';
import { MonsterSystem } from '../src/monsterAI.js';

globalThis.document = { createElement() { return { getContext() { return { fillRect() {}, strokeRect() {}, fillText() {} }; } }; } };
function setup(real = false) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(72, 1.6, .06, 200);
  const collision = real ? createWorld(scene).collision : new CollisionWorld();
  camera.position.set(0, 1.72, 10); scene.add(camera); scene.updateMatrixWorld(true);
  const view = new MonsterAppearances(scene, camera, collision, { intensity: 55, visible: true, distance: 32, angle: .45 });
  const played = [], duck = [], sound = { play: (...a) => played.push(a), stop() {}, ambient: { duck: n => duck.push(n) } };
  const manager = new TerrorManager(scene, view, collision, sound, seededRandom(93));
  const player = { position: { x: 0, y: 0, z: 10 } };
  return { scene, camera, collision, view, manager, player, played, duck };
}
test('catalog contains 25 contextual events, seven apparitions and valid sound recipes', () => {
  assert.equal(TERROR_EVENTS.length, 25); assert.equal(TERROR_EVENTS.filter(e => e.type === 'apparition').length, 7);
  for (const e of TERROR_EVENTS) { assert.ok(e.min <= e.max && e.cooldown > e.duration); if (e.sound) assert.ok(SOUND_RECIPES[e.sound]); }
});
test('events and repeatable figures start at zero items; global and individual cooldowns hold', () => {
  const d = new TerrorDirector(seededRandom(31)), records = [];
  for (let i = 0; i < 18000; i++) d.update(.1, 0, 'woods', false, e => { records.push({ e, t: d.time }); return true; });
  assert.ok(records[0].t >= 12 && records[0].t < 13);
  assert.ok(records.filter(r => r.e.type === 'apparition').length > 5);
  const previous = new Map();
  records.forEach((r, i) => {
    if (i) { assert.notEqual(r.e.id, records[i - 1].e.id); assert.ok(r.t - records[i - 1].t >= 9); }
    if (previous.has(r.e.id)) assert.ok(r.t - previous.get(r.e.id) >= r.e.cooldown);
    previous.set(r.e.id, r.t);
  });
  assert.ok(d.history.length <= 64); assert.ok(d.intensity >= 0 && d.intensity <= 100);
});
test('0–4 progression respects eligibility and 5/5 blocks random events', () => {
  for (let count = 0; count <= 5; count++) {
    const d = new TerrorDirector(seededRandom(10)); let n = 0;
    for (let i = 0; i < 3000; i++) d.update(.1, count, 'house', false, e => { n++; assert.ok(e.minItems <= count && e.maxItems >= count && e.interior); return true; });
    assert.equal(n > 0, count < 5);
  }
  assert.deepEqual(appearanceRange(4, () => .5), [10, 25]);
  assert.deepEqual(appearanceRange(4, () => .1), [42, 75]);
  assert.deepEqual(appearanceRange(4, () => .5, true), [42, 75]);
});
test('failed placements retry without consuming history; busy scenes cannot overlap', () => {
  const d = new TerrorDirector(() => .5); d.update(13, 0, 'woods', false, () => false);
  assert.equal(d.history.length, 0); assert.equal(d.cooldowns.size, 0);
  d.update(100, 0, 'woods', true, () => { throw Error('overlap'); });
});
test('actual map keeps interior candidates clear and sources attached to real areas', () => {
  const s = setup(true); assert.ok(s.manager.interiorPoints.length >= 2);
  for (const p of s.manager.interiorPoints) assert.equal(s.collision.blocked(p.x, p.z, 0, .8, 1.85), false);
  assert.deepEqual(s.manager.source(TERROR_EVENTS.find(e => e.id === 'house-knock'), s.player), { x: 0, y: 1.5, z: 0 });
  assert.equal(s.manager.source(TERROR_EVENTS.find(e => e.id === 'radio-static'), s.player), null);
  assert.equal(terrorLocation({ x: 23, y: 4, z: -16 }), 'treehouse');
  assert.equal(terrorLocation({ x: -23, y: 0, z: -13 }), 'shed');
});
test('dynamic apparition remains still under gaze, disappears only after looking away', () => {
  const s = setup(); const e = TERROR_EVENTS.find(e => e.id === 'watcher');
  s.view.choose = () => ({ id: 'test', zone: 'woods', x: 0, z: 45 });
  let visible = true; s.view.sense = () => ({ visible, direct: visible, lit: false, distance: 35 });
  assert.equal(s.manager.start(e, 0, s.player), true); const position = s.view.monster.root.position.clone();
  for (let i = 0; i < 25; i++) s.manager.update(.1, 0, s.player);
  assert.ok(s.view.monster.root.position.equals(position)); assert.ok(s.manager.active);
  visible = false; for (let i = 0; i < 5; i++) s.manager.update(.1, 0, s.player);
  assert.equal(s.manager.active, null); assert.equal(s.view.monster.root.visible, false);
});
test('quick glimpse fades within two seconds of being seen; no clone or extra entity', () => {
  const s = setup(); s.view.choose = () => ({ id: 'test', zone: 'woods', x: 0, z: 45 });
  s.view.sense = () => ({ visible: true, direct: true, distance: 35, lit: false });
  s.manager.start(TERROR_EVENTS.find(e => e.id === 'glimpse'), 3, s.player);
  for (let i = 0; i < 20; i++) s.manager.update(.1, 3, s.player);
  assert.equal(s.manager.active, null); assert.equal(s.view.monster.root.visible, false);
});
test('flicker restores intensity without overriding F; transition clears effects', () => {
  const s = setup(); s.manager.start(TERROR_EVENTS.find(e => e.id === 'flicker'), 3, s.player);
  s.view.flashlight.visible = false;
  for (let i = 0; i < 10; i++) s.manager.update(.1, 3, s.player);
  assert.equal(s.view.flashlight.intensity, 55); assert.equal(s.view.flashlight.visible, false);
  s.manager.transition(); assert.equal(s.duck.at(-1), .025); assert.equal(s.manager.effect, null);
});
function audioMock() {
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect(n) { return n; }, disconnect() {}, start() {}, stop() {}, playbackRate: param(), frequency: param(), Q: param(), gain: param(), positionX: param(), positionY: param(), positionZ: param() });
  const listener = {}; for (const prefix of ['position', 'forward', 'up']) for (const axis of ['X', 'Y', 'Z']) listener[prefix + axis] = param();
  return { enabled: true, noise: {}, master: node(), context: { state: 'running', currentTime: 0, listener, destination: node(), createBufferSource: node, createBiquadFilter: node, createGain: node, createPanner: node } };
}
test('spatial sound uses HRTF, world positions, listener orientation and four-voice cap', () => {
  const a = audioMock(), sound = new MonsterAudio(a), camera = new THREE.PerspectiveCamera(); camera.position.set(4, 2, 8);
  sound.update(.1, true, camera); assert.equal(a.context.listener.positionX.value, 4); assert.equal(a.context.listener.forwardZ.value, -1);
  for (let i = 0; i < 4; i++) assert.ok(sound.play('breath', { x: -10, y: 2, z: 20 }));
  assert.equal(sound.play('step', camera.position), false);
  const voice = [...sound.voices][0]; assert.equal(voice.panner.panningModel, 'HRTF'); assert.equal(voice.panner.positionX.value, -10);
  voice.source.onended(); assert.equal(sound.voices.size, 3);
  sound.update(.1, false, camera); assert.equal(sound.voices.size, 0);
  a.enabled = false; assert.equal(sound.play('heavy', camera.position), false);
});
test('audio safely works without a context or recorded files', async () => {
  const sound = new MonsterAudio({ enabled: true }); assert.equal(sound.play('breath', {}), false);
  assert.equal(await sound.loadAsset('breath', './audio/breath.ogg'), false);
});
test('hunt stops under direct gaze and resumes physically when gaze is broken', () => {
  const s = setup(), player = { position: { x: 0, y: 0, z: 10 }, moving: false, keys: new Set() };
  const monster = new MonsterSystem(s.scene, s.camera, s.collision, s.view.flashlight, null, () => {});
  monster.model.show({ x: 0, z: 20 }, player.position); monster.phase = 'hunting';
  let direct = true; monster.appearances.sense = () => ({ direct });
  for (let i = 0; i < 20; i++) monster.update(.05, true, player, 5);
  assert.equal(monster.model.root.position.z, 20);
  direct = false; for (let i = 0; i < 20; i++) monster.update(.05, true, player, 5);
  assert.ok(monster.model.root.position.z < 19);
});
test('fifth item starts five seconds of silence before the transition cue, pause freezes time', () => {
  const s = setup(), player = { position: { x: 0, y: 0, z: 10 }, moving: false, keys: new Set() }, cues = [];
  const monster = new MonsterSystem(s.scene, s.camera, s.collision, s.view.flashlight, { duck() {} }, () => {});
  monster.sound.play = kind => cues.push(kind);
  monster.update(.05, true, player, 5);
  for (let i = 0; i < 90; i++) monster.update(.05, true, player, 5);
  assert.deepEqual(cues, []); const time = monster.timer;
  monster.update(.05, false, player, 5); assert.equal(monster.timer, time);
  for (let i = 0; i < 20; i++) monster.update(.05, true, player, 5);
  assert.deepEqual(cues, ['thunder']);
});
