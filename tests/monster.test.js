import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { AppearanceDirector, APPEARANCE_RULES, MonsterAppearances, surveyAppearancePoints } from '../src/monsterAppearances.js';
import { MonsterNavigation } from '../src/monsterNavigation.js';
import { MonsterSystem } from '../src/monsterAI.js';
import { createMonster } from '../src/monster.js';
import { createWorld } from '../src/world.js';
import { CollisionWorld } from '../src/collision.js';
import { Inventory } from '../src/inventory.js';
import { ITEMS, createCollectibles } from '../src/collectibles.js';
import { CollectionSystem } from '../src/interaction.js';
import { AmbientAudio } from '../src/audio.js';

globalThis.document = { addEventListener() {}, createElement() { return { getContext() { return { fillRect() {}, strokeRect() {}, fillText() {} }; } }; } };
globalThis.window = { addEventListener() {} };
function tick(director, seconds, playing = true) { for (let i = 0; i < seconds * 10; i++) director.update(.1, playing); }
function director() {
  const state = { visible: true, direct: true, lit: false, distance: 45, shown: 0, hidden: 0 };
  const d = new AppearanceDirector({ choose: (stage, rule, used) => ({ id: `point${stage}`, zone: `zone${stage}` }), sense: () => state, show() { state.shown++; }, hide() { state.hidden++; }, opacity(n) { state.opacity = n; } });
  return { d, state };
}
function worldSetup() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(72, 16 / 9, .06, 200);
  const world = createWorld(scene), items = createCollectibles(scene, world.collision), inventory = new Inventory(ITEMS);
  camera.position.set(0, 1.72, 10); scene.add(camera); scene.updateMatrixWorld(true);
  const torch = { visible: true, distance: 32, angle: Math.PI / 7 };
  const player = { position: { x: 0, y: 0, z: 10 }, moving: false, keys: new Set() };
  return { scene, camera, world, items, inventory, torch, player };
}

test('five rare apparitions: initial delay, gaze, look away, minimum cooldown, no repetition', () => {
  const { d, state } = director(); tick(d, 24); assert.equal(state.shown, 0); tick(d, 2); assert.equal(state.shown, 1);
  tick(d, 4); assert.equal(state.hidden, 0); state.visible = state.direct = false; tick(d, 1);
  assert.equal(state.hidden, 1); assert.equal(d.history[0].reason, 'looked-away');
  tick(d, 70); assert.equal(state.shown, 1);
  for (let stage = 1; stage < 5; stage++) { tick(d, 80); state.visible = state.direct = true; tick(d, .2); state.visible = state.direct = false; tick(d, 1); }
  tick(d, 200); assert.equal(d.history.length, 5); assert.equal(new Set(d.history.map(h => h.zone)).size, 5);
});
test('pause freezes appearance clocks; long looks fade rather than teleport', () => {
  const { d, state } = director(); tick(d, 26); const age = d.active.age;
  tick(d, 100, false); assert.equal(d.active.age, age);
  tick(d, 36); assert.equal(d.history[0].reason, 'long-look'); assert.equal(state.hidden, 1);
});
test('house apparition reacts to flashlight; approach is safe and never attacks', () => {
  const { d, state } = director(); tick(d, 26); d.active.rule = APPEARANCE_RULES[3];
  state.distance = 20; state.lit = true; tick(d, .3); assert.equal(d.active.record.reason, 'flashlight'); tick(d, 1); assert.equal(state.hidden, 1);
  const second = director(); tick(second.d, 26); second.state.distance = 5; tick(second.d, 1.2); assert.equal(second.d.history[0].reason, 'approach');
});
test('model has a tall human silhouette, closed mouth material, no glow; reused without idle movement', () => {
  const model = createMonster(); assert.equal(model.root.visible, false);
  model.show({ x: 3, z: 4 }, { x: 0, z: 0 }); const matrix = model.root.matrix.clone();
  const bounds = new THREE.Box3().setFromObject(model.root), size = bounds.getSize(new THREE.Vector3());
  assert.ok(size.y > 3.5 && size.x < 1.3);
  model.root.traverse(m => { if (m.isMesh) { assert.equal(m.material.emissive.getHex(), 0); assert.equal(m.material.fog, true); } });
  model.animate(10, false); model.root.updateMatrix(); assert.deepEqual(model.root.matrix.elements, matrix.elements);
  const uuid = model.root.uuid; model.hide(); model.show({ x: -2, z: -5 }, { x: 0, z: 0 }); assert.equal(model.root.uuid, uuid);
});
test('survey rejects occupied points; every scripted phase has options on the actual map', () => {
  const s = worldSetup(), points = surveyAppearancePoints(s.world.collision);
  assert.ok(points.length >= 10);
  for (let stage = 0; stage < 5; stage++) assert.ok(points.some(p => p.stages.includes(stage)), `No points for phase ${stage}`);
  for (const p of points) assert.equal(s.world.collision.blocked(p.x, p.z, 0, .8, 3.8), false);
  console.log(`Validated ${points.length} spawn points in ${new Set(points.map(p => p.zone)).size} zones.`);
});
test('camera frustum rejects on-screen spawn; house walls occlude; flashlight range enforced', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(72, 1, .06, 200); camera.position.set(0, 1.72, 0); scene.add(camera);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 1), new THREE.MeshStandardMaterial()); wall.position.set(0, 2.5, -10); scene.add(wall); scene.updateMatrixWorld(true);
  const system = new MonsterAppearances(scene, camera, new CollisionWorld(), { visible: true, distance: 32, angle: .4 });
  const p = { id: 'x', zone: 'x', stages: [0,4], x: 0, z: -50 }; system.points = [p];
  assert.equal(system.choose(0, APPEARANCE_RULES[0], new Set()), null);
  assert.equal(system.clearSight(p), false); wall.visible = false;
  camera.lookAt(0, 1.72, 50); assert.ok(system.choose(0, APPEARANCE_RULES[0], new Set()));
  camera.lookAt(0, 2.7, -50); assert.equal(system.sense(p).lit, false);
  p.z = -20; camera.lookAt(0, 2.7, -20); assert.equal(system.sense(p).lit, true);
  system.flashlight.visible = false; assert.equal(system.sense(p).lit, false);
});
test('actual forest has eligible first, house, treehouse and rear scenes, not just empty point lists', () => {
  const s = worldSetup(), system = new MonsterAppearances(s.scene, s.camera, s.world.collision, s.torch);
  const viewpoints = [[10,12],[-10,12],[0,18],[15,0],[-18,0],[0,-15],[23,0],[-23,-5],[12,-20],[0,30],[-30,-15],[25,10]];
  for (const stage of [0,1,2,3,4]) {
    let found = null;
    for (const [x,z] of viewpoints) {
      if (s.world.collision.blocked(x,z,0)) continue;
      s.camera.position.set(x,1.72,z);
      for (const p of system.points.filter(p => p.stages.includes(stage))) {
        s.camera.lookAt(x + (x-p.x),1.72,z + (z-p.z));
        for (let i=0;i<4&&!found;i++) found=system.choose(stage,APPEARANCE_RULES[stage],new Set());
        if(found) break;
      }
      if(found) break;
    }
    assert.ok(found, `No real visible scene available for stage ${stage}`);
  }
});
test('navigation routes around walls and trees; blocked routes never teleport', () => {
  const world = new CollisionWorld(20); world.box(0, 0, 7, .4); world.circle(4.5, 1, .8);
  const nav = new MonsterNavigation(world), start = { x: 0, z: 4 }, end = { x: 0, z: -4 };
  const path = nav.path(start,end); assert.ok(path.length > 2); let last = start;
  for (const p of path) { assert.equal(nav.segment(last,p),true); last = p; }
  const prison = new CollisionWorld(10); prison.box(0,0,30,1); assert.equal(new MonsterNavigation(prison).path(start,end).length,0);
});
test('5/5 starts tension, then stationary warning, later walk and finally hunt; pause freezes transition', () => {
  const s = worldSetup(); let caught = 0; const system = new MonsterSystem(s.scene,s.camera,s.world.collision,s.torch,null,()=>caught++);
  const advance = (seconds,count=5,playing=true) => { for(let i=0;i<seconds*20;i++) system.update(.05,playing,s.player,count); };
  advance(2,4); assert.equal(system.phase,'presence'); advance(.1); assert.equal(system.phase,'transition');
  const t = system.timer; advance(10,5,false); assert.equal(system.timer,t);
  system.spawn = () => { system.model.show({x:20,z:20},{x:0,z:0}); return true; };
  advance(10.2); assert.equal(system.phase,'warning'); advance(4.5); assert.ok(['warning','warning-fade'].includes(system.phase));
  advance(1); assert.equal(system.phase,'gap'); advance(9.2); assert.equal(system.phase,'walking-pause');
  advance(3.2); assert.equal(system.phase,'walking'); advance(8.2); assert.equal(system.phase,'hunting'); assert.equal(caught,0);
});
test('catch requires hunt, proximity, same floor and line of sight; fresh session resets inventory and monster', () => {
  const s = worldSetup(); let caught = 0; const system = new MonsterSystem(s.scene,s.camera,s.world.collision,s.torch,null,()=>caught++);
  s.player.position = {x:0,y:0,z:15}; s.camera.position.set(0,1.72,15); system.model.show({x:0,z:15.6},{x:0,z:15});
  system.phase = 'walking'; system.update(.05,true,s.player,5); assert.equal(caught,0);
  system.phase = 'hunting'; s.player.position.y=4; system.update(.05,true,s.player,5); assert.equal(caught,0);
  s.player.position.y=0; system.update(.05,true,s.player,5); assert.equal(caught,1); assert.equal(system.phase,'caught'); system.update(.05,true,s.player,5); assert.equal(caught,1);
  s.inventory.add(ITEMS[0].id); const fresh = worldSetup(); const restart = new MonsterSystem(fresh.scene,fresh.camera,fresh.world.collision,fresh.torch,null,()=>{});
  assert.equal(fresh.inventory.count,0); assert.ok(fresh.items.every(i=>i.group.visible)); assert.equal(restart.phase,'presence'); assert.equal(restart.model.root.visible,false);
});
test('monster presence preserves all five collections and existing collision shapes', () => {
  const s=worldSetup(); const count=s.world.collision.shapes.length;
  const ui={setCount(){},setTarget(){},showFound(){}}; const collection=new CollectionSystem(s.scene,s.camera,s.items,s.inventory,ui);
  const system=new MonsterSystem(s.scene,s.camera,s.world.collision,s.torch,null,()=>{});
  system.model.show({x:40,z:30},{x:0,z:0}); assert.equal(s.world.collision.shapes.length,count);
  const views=[[-3.4,1.72,.95],[-19,1.72,-7.95],[22.3,5.72,-15.8],[-13,1.72,-22.85],[-2.4,1.72,-2.35]];
  views.forEach((p,i)=>{s.camera.position.set(...p);s.camera.lookAt(s.items[i].bounds.getCenter(new THREE.Vector3()));assert.equal(collection.handleKey({code:'KeyE'},true),true);});
  assert.equal(s.inventory.count,5);
});
test('presence audio is optional and respects disabled audio without creating a context', () => {
  const audio=new AmbientAudio(); audio.presence(); assert.equal(audio.context,null);
  audio.enabled=false; audio.context={state:'running'}; assert.doesNotThrow(()=>audio.presence('transition'));
});

test('hunt enters the real house through the doorway, respects collisions and catches on the same floor', () => {
  const s=worldSetup(); let caught=0; const system=new MonsterSystem(s.scene,s.camera,s.world.collision,s.torch,null,()=>caught++);
  s.player.position={x:0,y:0,z:-3}; s.camera.position.set(0,1.72,-3);
  system.model.show({x:0,z:11},{x:0,z:-3}); system.phase='hunting';
  let ducked=false;
  for(let i=0;i<180&&system.phase!=='caught';i++) {
    system.update(.05,true,s.player,5);
    const p=system.model.root.position; assert.equal(s.world.collision.blocked(p.x,p.z,0,.32,1.72),false);
    if(p.z<5&&p.z>-5) ducked ||= system.model.root.scale.y<.8;
  }
  assert.ok(ducked); assert.equal(caught,1);
});
test('walls prevent capture and lost visual contact expires the last known target', () => {
  const s=worldSetup(); let caught=0; const system=new MonsterSystem(s.scene,s.camera,s.world.collision,s.torch,null,()=>caught++);
  s.player.position={x:-6,y:0,z:0}; system.model.show({x:-6.8,z:0},{x:-6,z:0}); system.model.root.scale.y=.48;
  assert.equal(system.sees(s.player),false);
  system.phase='hunting'; system.lastKnown={x:-6.8,z:0};
  for(let i=0;i<300;i++) system.update(.05,true,s.player,5);
  assert.equal(caught,0); assert.equal(system.lastKnown,null);
});
