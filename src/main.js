import * as THREE from 'three';
import { createWorld, locationAt } from './world.js';
import { createAtmosphere } from './atmosphere.js';
import { Player } from './player.js';
import { AmbientAudio } from './audio.js';

const canvas = document.querySelector('#game');
const menu = document.querySelector('#menu');
const hud = document.querySelector('#hud');
const start = document.querySelector('#start');
const label = document.querySelector('#start-label');
const message = document.querySelector('#message');

try {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, .06, 200);
  const world = createWorld(scene);
  const player = new Player(camera, world.collision);
  const atmosphere = createAtmosphere(scene, camera);
  const audio = new AmbientAudio();
  let started = false, active = false, elapsed = 0, previous = performance.now();
  const location = document.querySelector('#location');
  const compass = document.querySelector('#compass');
  const torchStatus = document.querySelector('#flashlight-state');

  function pause() {
    active = player.active = false; player.resetInput(); audio.setActive(false);
    menu.hidden = false; hud.hidden = true;
    label.textContent = started ? 'Continuar a exploração' : 'Entrar na floresta';
    message.textContent = started ? 'Jogo pausado. Clique para continuar.' : 'Use fones de ouvido. Jogue com teclado e mouse.';
  }
  start.addEventListener('click', async () => {
    if (!canvas.requestPointerLock) { message.textContent = 'Este navegador não oferece captura do mouse. Use um navegador desktop compatível.'; return; }
    try {
      // Request mouse capture directly inside the click gesture, before any await.
      const request = canvas.requestPointerLock();
      audio.start().catch(() => { message.textContent = 'Áudio indisponível; você pode jogar sem som.'; });
      if (request) await request;
    } catch { message.textContent = 'Não foi possível capturar o mouse. Clique novamente para entrar.'; audio.setActive(false); }
  });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      started = active = player.active = true; player.resetInput(); menu.hidden = true; hud.hidden = false;
      audio.setActive(true); previous = performance.now();
    } else pause();
  });
  document.addEventListener('pointerlockerror', () => { pause(); message.textContent = 'Captura do mouse bloqueada. Abra o jogo em uma aba própria e tente novamente.'; });
  document.addEventListener('keydown', event => {
    if (active && event.code === 'KeyF' && !event.repeat) {
      const on = atmosphere.toggle();
      torchStatus.innerHTML = `${on ? '◉ &nbsp; LANTERNA ACESA' : '○ &nbsp; LANTERNA APAGADA'} <kbd>F</kbd>`;
    }
  });
  document.querySelector('#sound').addEventListener('change', event => { audio.enabled = event.target.checked; audio.setActive(active); });
  document.querySelector('#quality').addEventListener('change', event => {
    const high = event.target.value === 'high';
    renderer.setPixelRatio(high ? Math.min(window.devicePixelRatio, 1.5) : 1);
    renderer.shadowMap.enabled = high; atmosphere.quality(high);
    scene.traverse(object => { if (object.material) for (const material of [object.material].flat()) material.needsUpdate = true; });
  });
  window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
  function releaseMouse() { if (document.pointerLockElement) document.exitPointerLock(); pause(); }
  window.addEventListener('blur', releaseMouse);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseMouse(); });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); releaseMouse(); start.disabled = true; message.textContent = 'A conexão com a placa gráfica foi perdida. Recarregue a página.'; });
  // Read-only diagnostics for regression tests; no gameplay cheats or extra systems.
  if (import.meta.env.DEV) window.__gameDebug = () => ({ position: { ...player.position }, yaw: player.yaw, pitch: player.pitch, active, flashlight: atmosphere.flashlight.visible, trees: world.treeCount, location: locationAt(player.position), drawCalls: renderer.info.render.calls });
  renderer.setAnimationLoop(now => {
    const dt = Math.min((now - previous) / 1000, .05); previous = now;
    if (!document.hidden) {
      elapsed += dt;
      if (started) player.update(dt);
      else { camera.position.set(8, 2.5, 23); camera.lookAt(0, 3, 0); }
      atmosphere.update(elapsed);
      if (active) {
        audio.step(player.distance, player.moving);
        location.textContent = locationAt(player.position);
        const direction = ((-player.yaw * 180 / Math.PI) % 360 + 360) % 360;
        compass.textContent = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(direction / 45) % 8];
      }
      renderer.render(scene, camera);
    }
  });
  renderer.compile(scene, camera);
  start.disabled = false; pause();
} catch (error) {
  console.error(error); start.disabled = true; label.textContent = 'Não foi possível iniciar';
  message.textContent = 'O jogo precisa de WebGL 2. Ative a aceleração de hardware ou tente outro navegador atualizado.';
}
