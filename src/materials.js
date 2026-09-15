import * as THREE from 'three';
import { seededRandom } from './config.js';

function texture(kind) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'); const random = seededRandom(425 + kind.length);
  ctx.fillStyle = kind === 'wood' ? '#655e4f' : kind === 'dirt' ? '#746a52' : '#424d3c';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) {
    const brightness = 30 + Math.floor(random() * 130);
    ctx.fillStyle = `rgba(${brightness},${brightness},${brightness},${random() * .24})`;
    ctx.fillRect(random() * 256, random() * 256, kind === 'wood' ? 1 : random() * 4, kind === 'wood' ? random() * 70 : random() * 4);
  }
  if (kind === 'wood') {
    ctx.fillStyle = '#171e1ba8';
    for (let x = 0; x < 256; x += 32) ctx.fillRect(x, 0, 2, 256);
  }
  const result = new THREE.CanvasTexture(canvas);
  result.wrapS = result.wrapT = THREE.RepeatWrapping; result.colorSpace = THREE.SRGBColorSpace;
  result.repeat.set(kind === 'wood' ? 2 : 45, kind === 'wood' ? 1 : 45);
  return result;
}

export function createMaterials() {
  const standard = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .96, ...extra });
  return {
    ground: standard('#929b7a', { map: texture('ground') }),
    dirt: standard('#918575', { map: texture('dirt') }),
    wood: standard('#a9aaa0', { map: texture('wood') }),
    darkWood: standard('#585f59', { map: texture('wood') }),
    bark: standard('#343b37'), leaves: standard('#1e302a'),
    roof: standard('#333e3e', { metalness: .15 }),
    stone: standard('#66716a'), iron: standard('#3d4441', { metalness: .6 }),
    fabric: standard('#666253'),
    glass: standard('#53645f', { roughness: .25, transparent: true, opacity: .3 }),
  };
}
