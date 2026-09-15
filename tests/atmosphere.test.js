import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createAtmosphere } from '../src/atmosphere.js';

globalThis.document = { createElement() { return { getContext() { return { createRadialGradient() { return { addColorStop() {} }; }, fillRect() {}, set fillStyle(v) {} }; } }; } };

test('flashlight starts on, toggles off/on and follows the first-person camera', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const atmosphere = createAtmosphere(scene, camera);
  assert.equal(atmosphere.flashlight.visible, true);
  assert.equal(atmosphere.toggle(), false);
  assert.equal(atmosphere.toggle(), true);
  assert.equal(atmosphere.flashlight.parent, camera);
  assert.equal(atmosphere.flashlight.target.parent, camera);
  assert.ok(atmosphere.flashlight.target.position.z < 0);
  assert.ok(scene.fog instanceof THREE.FogExp2);
  atmosphere.quality(false); assert.equal(atmosphere.flashlight.castShadow, false);
  atmosphere.quality(true); assert.equal(atmosphere.flashlight.castShadow, true);
  atmosphere.update(20);
});
