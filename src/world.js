import * as THREE from 'three';
import { WORLD, seededRandom } from './config.js';
import { CollisionWorld } from './collision.js';
import { createMaterials } from './materials.js';

export function createWorld(scene) {
  const collision = new CollisionWorld(WORLD.radius);
  const m = createMaterials();
  const random = seededRandom(WORLD.seed);
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  function box(x, y, z, w, h, d, material, solid = false) {
    const mesh = new THREE.Mesh(boxGeometry, material);
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
    if (solid) collision.box(x, z, w, d, y - h / 2, y + h / 2);
    return mesh;
  }
  function beam(start, end, radius, material = m.bark) {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .65, radius, a.distanceTo(b), 5), material);
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); return mesh;
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), m.ground);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const routes = [ [[0, 50], [0, 7]], [[0, 12], [23, -5.5]], [[0, 12], [-23, -9]], [[-23, -9], [-10, -20]], [[23, -5.5], [13, -25]] ];
  function distanceToRoute(x, z, route) {
    const [[ax, az], [bx, bz]] = route;
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)));
    return Math.hypot(x - ax - t * (bx - ax), z - az - t * (bz - az));
  }
  for (const [[ax, az], [bx, bz]] of routes) {
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3.3, Math.hypot(bx - ax, bz - az)), m.dirt);
    path.rotation.set(-Math.PI / 2, 0, Math.atan2(bx - ax, bz - az));
    path.position.set((ax + bx) / 2, .012, (az + bz) / 2); path.receiveShadow = true; scene.add(path);
  }

  // Window opening: physical sill/header/sides, never an invisible solid wall.
  function sideWall(x, z, depth, base, height) {
    box(x, base + .6, z, .25, 1.2, depth, m.wood, true);
    box(x, base + height - .35, z, .25, .7, depth, m.wood, true);
    box(x, base + 1.9, z - depth / 2 + 1, .25, 1.4, 2, m.wood, true);
    box(x, base + 1.9, z + depth / 2 - 1, .25, 1.4, 2, m.wood, true);
    box(x, base + 1.9, z, .16, 1.4, .08, m.darkWood);
    box(x, base + 1.9, z, .18, .09, depth - 4, m.darkWood);
    box(x, base + 1.9, z, .04, 1.4, depth - 4, m.glass);
  }
  function cabin(cx, cz, width, depth, base, height, abandoned = false) {
    box(cx, base - .1, cz, width, .2, depth, m.darkWood);
    // Open doorway 2m wide, facing south.
    box(cx - (width + 2) / 4, base + height / 2, cz + depth / 2, (width - 2) / 2, height, .26, m.wood, true);
    box(cx + (width + 2) / 4, base + height / 2, cz + depth / 2, (width - 2) / 2, height, .26, m.wood, true);
    box(cx, base + height - .35, cz + depth / 2, 2, .7, .26, m.darkWood, true);
    box(cx, base + height / 2, cz - depth / 2, width, height, .25, m.wood, true);
    sideWall(cx - width / 2, cz, depth, base, height);
    sideWall(cx + width / 2, cz, depth, base, height);
    // Pitched roof, individual rafters and triangular gable.
    const rise = width * .27;
    for (const side of [-1, 1]) {
      const roof = box(cx + side * width / 4, base + height + rise / 2, cz, Math.hypot(width / 2, rise) + .6, .18, depth + 1, m.roof);
      roof.rotation.z = -side * Math.atan2(rise, width / 2);
      for (let z = cz - depth / 2; z <= cz + depth / 2; z += 1.5) {
        beam([cx, base + height + rise, z], [cx + side * (width / 2 + .25), base + height, z], .085, m.darkWood);
      }
    }
    const shape = new THREE.Shape(); shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(0, rise); shape.closePath();
    for (const z of [cz - depth / 2, cz + depth / 2]) {
      const gable = new THREE.Mesh(new THREE.ShapeGeometry(shape), m.darkWood.clone());
      gable.material.side = THREE.DoubleSide; gable.position.set(cx, base + height, z); gable.castShadow = true; scene.add(gable);
    }
    for (const x of [cx - width / 2, cx + width / 2]) {
      for (const z of [cz - depth / 2, cz + depth / 2]) box(x, base + height / 2, z, .3, height, .3, m.darkWood, true);
    }
    // Floor seams and outside sill emphasize scale.
    for (let x = cx - width / 2 + .5; x < cx + width / 2; x += .65) box(x, base + .005, cz, .017, .013, depth, m.iron);
    if (abandoned) {
      box(cx + 3, base + height + .6, cz - 2, .9, 3, 1, m.stone);
      const shutter = box(cx - width / 2 - .18, base + 1.65, cz - 1, .12, 1.8, .7, m.darkWood);
      shutter.rotation.x = .25;
    }
  }

  // Main house: foyer, living room, and bedroom behind an open partition.
  cabin(0, 0, 13, 10, .03, 3.2, true);
  box(-4.05, 1.5, -1, 4.9, 3, .18, m.wood, true);
  box(4.05, 1.5, -1, 4.9, 3, .18, m.wood, true);
  box(0, 2.85, -1, 3.2, .3, .18, m.darkWood, true);
  // Porch is level with terrain: no jump is needed.
  box(0, .025, 6, 7, .05, 2, m.darkWood);
  for (const x of [-3.3, 3.3]) box(x, 1.55, 6.8, .18, 3.1, .18, m.darkWood, true);
  box(0, 3.2, 6, 7.3, .17, 2.6, m.roof);
  // Table with legs, abandoned chairs, bed, cupboard and fireplace.
  box(-3.4, .87, 2.1, 2.2, .16, 1.4, m.wood, true);
  for (const x of [-4.25, -2.55]) for (const z of [1.55, 2.65]) box(x, .4, z, .1, .8, .1, m.darkWood, true);
  box(-3.4, .48, 3.4, .65, .12, .65, m.darkWood, true);
  box(-3.4, .86, 3.68, .65, .8, .09, m.darkWood, true);
  box(4.6, .35, -3.4, 2, .7, 2.4, m.darkWood, true);
  box(4.6, .78, -3.4, 1.9, .22, 2.3, m.fabric, true);
  box(4.6, .96, -4.05, 1.2, .15, .5, m.wood);
  box(-4.8, 1.2, -4.25, 2, 2.4, .7, m.darkWood, true);
  for (const x of [-5.2, -4.4]) box(x, 1.2, -3.88, .04, .2, .03, m.iron);
  box(5.3, .65, 2, 1.1, 1.3, 1.8, m.stone, true);
  box(4.72, .55, 2, .03, .7, .95, m.iron);
  box(5.3, 1.34, 2, 1.5, .18, 2, m.stone, true);

  // Shed, reachable along the left trail.
  cabin(-23, -13, 7, 7, .025, 2.8);
  box(-25.4, .95, -13.7, .8, .15, 3, m.darkWood, true);
  for (const z of [-15, -12.5]) box(-25.4, .45, z, .12, .9, .12, m.wood, true);
  for (const [x, z] of [[-21, -15], [-21.5, -12.7]]) {
    box(x, .5, z, .95, 1, .95, m.wood, true);
    box(x, 1.02, z, 1.02, .05, 1.02, m.darkWood);
  }
  beam([-26.1, 0, -15.5], [-25.9, 2.4, -15.4], .05, m.iron);

  // Treehouse platform and stairs. Walking up changes the player's real elevation.
  beam([23, 0, -18.5], [23.4, 14, -18.7], .78); collision.circle(23, -18.5, .85);
  beam([23, 9, -18.5], [18.5, 13, -19.4], .35);
  beam([23.2, 10, -18.5], [28.5, 13.8, -20], .3);
  box(23, 3.88, -16, 8, .24, 7, m.darkWood);
  cabin(23, -16, 5.5, 5, 4, 2.7);
  for (const x of [19.3, 26.7]) for (const z of [-19.2, -12.8]) {
    box(x, 2, z, .22, 4, .22, m.darkWood, true);
    box(x, 4.55, z, .12, 1.1, .12, m.darkWood, true);
  }
  for (const x of [19.2, 26.8]) {
    box(x, 4.65, -16, .13, .12, 7, m.wood);
    collision.box(x, -16, .2, 7, 4, 5.2);
  }
  box(23, 4.65, -19.4, 8, .12, .13, m.wood);
  collision.box(23, -19.4, 8, .2, 4, 5.2);
  for (const x of [20.6, 25.4]) {
    box(x, 4.65, -12.6, 2.9, .12, .13, m.wood);
    collision.box(x, -12.6, 2.9, .2, 4, 5.2);
  }
  for (let i = 0; i < 28; i++) {
    const h = (i + 1) / 28 * 4;
    box(23, h / 2, -5.5 - (i + .5) * .25, 2.4, h, .25, m.darkWood);
  }
  for (const x of [21.76, 24.24]) {
    beam([x, .85, -5.5], [x, 4.85, -12.5], .055, m.wood);
    for (let i = 0; i <= 7; i++) box(x, i / 7 * 4 + .4, -5.5 - i, .08, .9, .08, m.darkWood);
    // Thin boundary along stair sides, collision approximated in short segments.
    for (let i = 0; i < 28; i++) collision.box(x, -5.5 - (i + .5) * .25, .08, .25, i / 28 * 4, i / 28 * 4 + 1);
  }
  box(21.2, 4.5, -16.8, .9, 1, 1, m.wood, true);

  function sign(text, x, z, angle = 0) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#3a3e32'; ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#7e8062'; ctx.strokeRect(9, 9, 494, 110);
    ctx.font = '27px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#d5cbb0'; ctx.fillText(text, 256, 75);
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    box(x, .75, z, .12, 1.5, .12, m.darkWood, true);
    const panel = box(x, 1.6, z, 2.9, .72, .1, m.darkWood);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.85, .7), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
    face.position.set(x, 1.6, z + .06); panel.rotation.y = angle; face.rotation.y = angle; scene.add(face);
  }
  sign('← GALPÃO   |   MIRANTE →', -2.5, 13);
  sign('PROPRIEDADE ABANDONADA', 3, 34);
  sign('CASA NA ÁRVORE ↑', 25.7, -4);

  // Instanced forest: hundreds of trunks/branches with only a few draw calls.
  const treeLocations = [];
  const clear = (x, z) => (Math.abs(x) < 9 && z > -8 && z < 10)
    || (Math.abs(x + 23) < 6 && Math.abs(z + 13) < 6)
    || (x > 17 && x < 29 && z > -22 && z < -2)
    || routes.some(route => distanceToRoute(x, z, route) < 3.1)
    || Math.hypot(x - 3, z - 34) < 2;
  for (let attempt = 0; attempt < 2500 && treeLocations.length < 370; attempt++) {
    const x = (random() - .5) * 123, z = (random() - .5) * 123;
    const r = Math.hypot(x, z);
    if (r > 62 || r < 6 || clear(x, z)) continue;
    if (treeLocations.some(t => Math.hypot(t.x - x, t.z - z) < 2.5)) continue;
    treeLocations.push({ x, z, height: 7 + random() * 9, radius: .2 + random() * .38, leaf: random() > .45 });
  }
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.55, 1, 1, 6), m.bark, treeLocations.length);
  const branches = new THREE.InstancedMesh(new THREE.CylinderGeometry(.25, 1, 1, 5), m.bark, treeLocations.length * 4);
  const canopies = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), m.leaves, treeLocations.filter(t => t.leaf).length * 2);
  const dummy = new THREE.Object3D(); let branchIndex = 0, leafIndex = 0;
  const up = new THREE.Vector3(0, 1, 0);
  treeLocations.forEach((tree, index) => {
    const { x, z, height, radius, leaf } = tree;
    dummy.position.set(x, height / 2, z); dummy.rotation.set(0, random() * 6.28, 0); dummy.scale.set(radius, height, radius); dummy.updateMatrix(); trunks.setMatrixAt(index, dummy.matrix);
    collision.circle(x, z, radius + .1);
    for (let j = 0; j < 4; j++) {
      const angle = random() * Math.PI * 2, y = height * (.35 + random() * .35);
      const a = new THREE.Vector3(x, y, z);
      const b = new THREE.Vector3(x + Math.sin(angle) * (2 + random() * 2), y + 2 + random() * 2, z + Math.cos(angle) * (2 + random() * 2));
      dummy.position.copy(a).add(b).multiplyScalar(.5);
      dummy.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
      dummy.scale.set(radius * .42, a.distanceTo(b), radius * .42); dummy.updateMatrix(); branches.setMatrixAt(branchIndex++, dummy.matrix);
    }
    if (leaf) for (let j = 0; j < 2; j++) {
      dummy.position.set(x, height * .69 + j * 2.1, z); dummy.rotation.set(0, index, 0); dummy.scale.set(2.6 - j * .7, 6 - j, 2.6 - j * .7); dummy.updateMatrix(); canopies.setMatrixAt(leafIndex++, dummy.matrix);
    }
  });
  for (const mesh of [trunks, branches, canopies]) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); scene.add(mesh); }
  // Rocks on the outer ring visibly close the map; boundary is also enforced in physics.
  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 95; i++) {
    const angle = i / 95 * Math.PI * 2, radius = 59 + random() * 2;
    const rock = new THREE.Mesh(rockGeometry, m.stone);
    rock.position.set(Math.sin(angle) * radius, .6, Math.cos(angle) * radius);
    rock.scale.set(2 + random() * 2, 2 + random() * 3, 2.5); rock.rotation.y = angle; rock.castShadow = true; rock.receiveShadow = true; scene.add(rock);
    collision.circle(rock.position.x, rock.position.z, Math.max(rock.scale.x, rock.scale.z) * .85, 0, rock.scale.y);
  }
  for (let i = 0; i < 55; i++) {
    const x = (random() - .5) * 100, z = (random() - .5) * 100;
    if (clear(x, z)) continue;
    const scale = .25 + random() * .7;
    const rock = new THREE.Mesh(rockGeometry, m.stone); rock.position.set(x, scale * .25, z); rock.scale.set(scale, scale * .6, scale); rock.castShadow = true; rock.receiveShadow = true; scene.add(rock); collision.circle(x, z, scale * .85, 0, scale);
  }

  // Grass clusters share geometry and material; keep dirt paths and entrances unobstructed.
  const grassGeometry = new THREE.ConeGeometry(.11, .55, 3);
  const grass = new THREE.InstancedMesh(grassGeometry, m.leaves, 1600);
  for (let i = 0; i < 1600; i++) {
    const x = (random() - .5) * 110, z = (random() - .5) * 110;
    dummy.position.set(x, .18, z); dummy.rotation.set(.15, random() * 6, .1);
    dummy.scale.set(1, clear(x, z) ? 0 : .5 + random(), 1); dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix);
  }
  grass.computeBoundingSphere(); scene.add(grass);

  return { collision, treeCount: treeLocations.length };
}

export function locationAt({ x, y, z }) {
  if (Math.abs(x) < 6.6 && Math.abs(z) < 5.2) return 'Casa abandonada';
  if (Math.abs(x + 23) < 4 && Math.abs(z + 13) < 4) return 'Galpão';
  if (Math.abs(x - 23) < 5 && z < -5 && z > -21) return y > 3.5 ? 'Casa na árvore' : 'Trilha do mirante';
  if (Math.abs(x) < 4 && z > 12) return 'Trilha de entrada';
  if (Math.hypot(x, z) > 49) return 'Limite da floresta';
  return 'Floresta isolada';
}
