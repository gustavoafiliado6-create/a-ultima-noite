import * as THREE from 'three';

export const ITEMS = Object.freeze([
  Object.freeze({ id: 'rusty-key', name: 'Chave enferrujada', description: 'Uma chave antiga, coberta de ferrugem.', futureUse: 'Abrir uma área bloqueada.', area: 'Casa principal — sala', x: -3.4, y: .965, z: 2.1 }),
  Object.freeze({ id: 'battery', name: 'Bateria', description: 'Uma bateria guardada perto do galpão.', futureUse: 'Mecânica da lanterna.', area: 'Exterior do galpão', x: -19, y: .67, z: -9 }),
  Object.freeze({ id: 'old-radio', name: 'Rádio antigo', description: 'Um rádio de madeira com o mostrador desgastado.', futureUse: 'Reproduzir uma mensagem.', area: 'Casa na árvore', x: 21.2, y: 5.015, z: -16.8 }),
  Object.freeze({ id: 'amulet', name: 'Amuleto estranho', description: 'Um pequeno pingente de pedra marcado pelo tempo.', futureUse: 'Ativar um evento futuro.', area: 'Recanto da floresta', x: -13, y: .48, z: -24 }),
  Object.freeze({ id: 'old-map', name: 'Mapa antigo', description: 'Papel amarelado com traços de uma trilha.', futureUse: 'Revelar o caminho de saída.', area: 'Casa principal — cômodo dos fundos', x: -2.4, y: .94, z: -3.5 }),
]);

export function createCollectibles(scene, collision) {
  const material = color => new THREE.MeshStandardMaterial({ color, roughness: .92, metalness: .08 });
  const rust = material('#76553e'), metal = material('#555d55'), dark = material('#292f2c');
  const wood = material('#655c49'), paper = material('#ad9e77'), ink = material('#555342');
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  function box(parent, x, y, z, w, h, d, mat) {
    const mesh = new THREE.Mesh(boxGeometry, mat); mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function support(x, y, z, w, h, d, mat) { box(scene, x, y, z, w, h, d, mat); collision.box(x, z, w, d, y - h / 2, y + h / 2); }
  // Small props added to existing clear spaces; no terrain or building is changed.
  support(-19, .325, -9, .95, .65, .8, wood);
  support(-2.4, .86, -3.5, 1.4, .14, .8, wood);
  for (const x of [-2.95, -1.85]) for (const z of [-3.8, -3.2]) support(x, .4, z, .08, .8, .08, wood);
  support(-13, .22, -24, .65, .44, .6, metal);

  return ITEMS.map(item => {
    const group = new THREE.Group(); group.name = item.id; group.position.set(item.x, item.y, item.z);
    if (item.id === 'rusty-key') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.095, .018, 6, 16), rust);
      ring.rotation.x = Math.PI / 2; ring.position.set(-.12, .025, 0); group.add(ring);
      box(group, .05, .025, 0, .23, .035, .04, rust);
      box(group, .13, .025, .045, .035, .035, .1, rust);
      box(group, .07, .025, .035, .025, .035, .075, rust);
    } else if (item.id === 'battery') {
      box(group, 0, .19, 0, .27, .38, .19, dark);
      box(group, 0, .32, .101, .21, .055, .01, paper);
      for (const x of [-.075, .075]) box(group, x, .4, 0, .04, .04, .055, metal);
    } else if (item.id === 'old-radio') {
      box(group, 0, .24, 0, .7, .48, .28, wood);
      box(group, -.16, .23, .146, .29, .3, .015, dark);
      for (let i = 0; i < 5; i++) box(group, -.16, .12 + i * .055, .16, .25, .012, .015, metal);
      box(group, .17, .32, .15, .23, .07, .015, paper);
      for (const x of [.1, .25]) {
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .035, 12), dark);
        knob.rotation.x = Math.PI / 2; knob.position.set(x, .14, .16); group.add(knob);
      }
      box(group, .25, .66, -.08, .012, .42, .012, metal);
    } else if (item.id === 'amulet') {
      const stone = new THREE.Mesh(new THREE.OctahedronGeometry(.12), wood); stone.scale.set(1, .35, 1.4); stone.position.y = .045; group.add(stone);
      const cord = new THREE.Mesh(new THREE.TorusGeometry(.16, .008, 5, 20), dark);
      cord.rotation.x = Math.PI / 2; cord.position.set(0, .018, -.14); group.add(cord);
      box(group, 0, .083, 0, .014, .007, .13, ink);
    } else {
      box(group, 0, .01, 0, .62, .015, .42, paper);
      for (let i = 0; i < 5; i++) {
        const line = box(group, -.21 + i * .09, .02, Math.sin(i * 2) * .08, .14, .004, .009, ink); line.rotation.y = (i % 2 ? 1 : -1) * .5;
      }
      box(group, .19, .022, .09, .04, .004, .008, rust);
    }
    group.traverse(mesh => { if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
    scene.add(group); group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group).expandByScalar(.07);
    return { definition: item, group, bounds };
  });
}
