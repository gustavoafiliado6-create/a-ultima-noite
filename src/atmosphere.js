import * as THREE from 'three';
import { seededRandom } from './config.js';

export function createAtmosphere(scene, camera) {
  scene.background = new THREE.Color('#101d24');
  scene.fog = new THREE.FogExp2('#18282d', .025);
  const ambient = new THREE.HemisphereLight('#a0c5d5', '#202c23', .65); scene.add(ambient);
  const moonlight = new THREE.DirectionalLight('#a9c8df', 1.35); moonlight.position.set(-25, 45, -35);
  moonlight.castShadow = true; moonlight.shadow.mapSize.set(2048, 2048);
  Object.assign(moonlight.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 130 });
  moonlight.shadow.bias = -.0005; moonlight.shadow.normalBias = .035; scene.add(moonlight);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.8, 24, 16), new THREE.MeshBasicMaterial({ color: '#d2dfda', fog: false }));
  moon.position.set(-33, 44, -74); scene.add(moon);
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 128;
  const ctx = glowCanvas.getContext('2d'); const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, '#dae7de65'); grad.addColorStop(.3, '#b4c8ca20'); grad.addColorStop(1, '#b4c8ca00'); ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, fog: false })); glow.position.copy(moon.position); glow.scale.set(26, 26, 1); scene.add(glow);
  const random = seededRandom(849); const starPositions = [];
  for (let i = 0; i < 300; i++) { const a = random() * Math.PI * 2, elevation = .15 + random() * 1.3; starPositions.push(Math.cos(a) * Math.cos(elevation) * 140, Math.sin(elevation) * 140, Math.sin(a) * Math.cos(elevation) * 140); }
  const starsGeometry = new THREE.BufferGeometry(); starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ size: .1, color: '#a8bfca', transparent: true, opacity: .5, fog: false })));
  const positions = new Float32Array(380 * 3);
  for (let i = 0; i < positions.length; i += 3) { positions[i] = (random() - .5) * 75; positions[i + 1] = .4 + random() * 8; positions[i + 2] = (random() - .5) * 75; }
  const particleGeometry = new THREE.BufferGeometry(); particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: '#a6bcb5', size: .035, transparent: true, opacity: .35, depthWrite: false })); scene.add(particles);
  const flashlight = new THREE.SpotLight('#fff0ca', 55, 32, Math.PI / 7, .65, 1.2);
  flashlight.position.set(.16, -.15, -.05); flashlight.target.position.set(0, -.08, -1);
  flashlight.castShadow = true; flashlight.shadow.mapSize.set(1024, 1024); flashlight.shadow.bias = -.0001; flashlight.shadow.normalBias = .02;
  camera.add(flashlight, flashlight.target); scene.add(camera);
  const torchBody = new THREE.Mesh(new THREE.CylinderGeometry(.04, .055, .19, 10), new THREE.MeshStandardMaterial({ color: '#3e4943', metalness: .5, roughness: .45 }));
  torchBody.rotation.x = Math.PI / 2; torchBody.position.set(.23, -.24, -.39); camera.add(torchBody);
  return {
    flashlight,
    toggle() { flashlight.visible = !flashlight.visible; return flashlight.visible; },
    quality(high) { moonlight.castShadow = high; flashlight.castShadow = high; },
    update(time) { particles.rotation.y = Math.sin(time * .015) * .1; particles.position.y = Math.sin(time * .22) * .13; },
  };
}
