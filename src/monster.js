import * as THREE from 'three';

// One reusable, static figure. All detail uses ordinary lighting and the scene fog.
export function createMonster() {
  const root = new THREE.Group(); root.name = 'Homem da Árvore';
  const skin = new THREE.MeshStandardMaterial({ color: '#92938b', roughness: .98 });
  const cloth = new THREE.MeshStandardMaterial({ color: '#272c29', roughness: 1 });
  const stain = new THREE.MeshStandardMaterial({ color: '#3e4239', roughness: 1 });
  const hair = new THREE.MeshStandardMaterial({ color: '#111715', roughness: 1 });
  const mouth = new THREE.MeshStandardMaterial({ color: '#393733', roughness: 1 });
  const sphere = new THREE.SphereGeometry(1, 12, 10);
  const joints = [];
  function joint(meshes, pivot, direction) {
    const group = new THREE.Group(); group.position.set(...pivot); root.add(group); root.updateMatrixWorld(true);
    for (const mesh of meshes) group.attach(mesh);
    joints.push({ group, direction });
  }
  function ellipsoid(parent, position, scale, material) {
    const mesh = new THREE.Mesh(sphere, material); mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh;
  }
  function limb(parent, a, b, r1, r2, material) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, start.distanceTo(end), 8), material);
    mesh.position.copy(start).add(end).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    parent.add(mesh); return mesh;
  }
  // Slightly uneven knees and sloping shoulders, not a skeletal or demonic body.
  for (const side of [-1, 1]) {
    let first = root.children.length;
    const knee = [side * .17, .96 + side * .06, side * .035];
    limb(root, [side * .16, 2.07, 0], knee, .1, .073, cloth);
    limb(root, knee, [side * .22, .17, .025], .074, .046, stain);
    ellipsoid(root, [side * .22, .09, .085], [.075, .09, .19], cloth);
    joint(root.children.slice(first), [side * .16, 2.07, 0], side);
    first = root.children.length;
    const elbow = [side * .44, 2.17, .015];
    limb(root, [side * .31, 3.05, 0], elbow, .098, .065, cloth);
    limb(root, elbow, [side * .47, 1.49, .06], .054, .035, skin);
    ellipsoid(root, [side * .47, 1.38, .07], [.069, .14, .04], skin);
    for (let finger = 0; finger < 4; finger++) {
      const x = side * .47 + (finger - 1.5) * .035;
      limb(root, [x, 1.29, .075], [x + side * .025, 1.02 + Math.abs(finger - 1.5) * .035, .13], .015, .008, skin);
    }
    limb(root, [side * .42, 1.4, .09], [side * .37, 1.19, .14], .02, .009, skin);
    joint(root.children.slice(first), [side * .31, 3.05, 0], -side * .5);
  }
  ellipsoid(root, [0, 2.55, 0], [.255, .61, .14], cloth);
  ellipsoid(root, [0, 3.02, 0], [.33, .13, .15], cloth);
  limb(root, [0, 3.03, 0], [.025, 3.35, 0], .066, .056, skin);
  // Irregular strips form the torn hem; no animated fabric or physics needed.
  for (let i = 0; i < 9; i++) {
    const angle = i / 9 * Math.PI * 2;
    limb(root, [Math.sin(angle) * .21, 2.25, Math.cos(angle) * .12], [Math.sin(angle) * .25, 1.82 + (i % 3) * .12, Math.cos(angle) * .15], .049, .014, i % 3 ? cloth : stain);
  }
  for (let i = 0; i < 5; i++) ellipsoid(root, [(i % 2 ? -1 : 1) * .1, 2.3 + i * .13, .126], [.045, .11, .01], stain);
  const head = new THREE.Group(); head.position.set(.025, 3.46, .015); head.rotation.z = -.19; root.add(head);
  ellipsoid(head, [0, 0, 0], [.145, .255, .14], skin);
  ellipsoid(head, [0, -.11, .09], [.118, .13, .065], skin);
  ellipsoid(head, [0, -.01, .15], [.028, .075, .034], skin);
  // Broad but closed mouth, almost concealed by hair. No emissive eyes.
  ellipsoid(head, [0, -.135, .151], [.1, .008, .007], mouth);
  ellipsoid(head, [0, .12, -.035], [.158, .15, .14], hair);
  for (let i = 0; i < 17; i++) {
    const angle = i / 17 * Math.PI * 2;
    const x = Math.sin(angle) * .14, z = Math.cos(angle) * .14;
    limb(head, [x * .7, .17, z * .7], [x * 1.13 + Math.sin(i * 3) * .025, -.25 - (i % 4) * .055, z * 1.1], .025, .008, hair);
  }
  root.traverse(mesh => { if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
  root.visible = false;
  const materials = [skin, cloth, stain, hair, mouth];
  let animationTime = 0;
  return {
    root,
    show(point, observer) {
      this.animate(0, false); root.scale.y = 1;
      root.position.set(point.x, 0, point.z);
      root.rotation.y = Math.atan2(observer.x - point.x, observer.z - point.z);
      this.opacity(1); root.visible = true; root.updateMatrixWorld(true);
    },
    hide() { root.visible = false; },
    animate(dt, moving, running = false) {
      if (moving) animationTime += dt * (running ? 8 : 4);
      for (const { group, direction } of joints) group.rotation.x = moving ? Math.sin(animationTime) * direction * (running ? .32 : .18) : 0;
    },
    opacity(value) {
      for (const material of materials) {
        const transparent = value < 1;
        if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
        material.opacity = value; material.depthWrite = !transparent;
      }
      root.traverse(mesh => { if (mesh.isMesh) mesh.castShadow = value === 1; });
    },
  };
}
