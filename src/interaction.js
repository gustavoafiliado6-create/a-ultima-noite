import * as THREE from 'three';

export class CollectionSystem {
  constructor(scene, camera, items, inventory, ui) {
    this.camera = camera; this.items = items; this.inventory = inventory; this.ui = ui;
    this.raycaster = new THREE.Raycaster(); this.reach = 2.2; this.target = null; this.toastTime = 0;
    const itemMeshes = new Set(); items.forEach(item => item.group.traverse(mesh => itemMeshes.add(mesh)));
    this.occluders = [];
    // Only static world geometry blocks sight; the camera/torch and particles do not.
    scene.traverse(mesh => {
      let parent = mesh; while (parent && parent !== camera) parent = parent.parent;
      if (mesh.isMesh && !itemMeshes.has(mesh) && parent !== camera) this.occluders.push(mesh);
    });
    this.ui.setCount(inventory.count, inventory.total);
  }
  findTarget() {
    this.camera.updateWorldMatrix(true, false);
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.near = 0; this.raycaster.far = this.reach;
    let nearest = null, distance = this.reach;
    for (const item of this.items) {
      if (!item.group.visible || this.inventory.has(item.definition.id)) continue;
      const point = this.raycaster.ray.intersectBox(item.bounds, new THREE.Vector3());
      if (!point) continue;
      const d = point.distanceTo(this.raycaster.ray.origin);
      if (d < distance) { nearest = item; distance = d; }
    }
    if (!nearest) return null;
    this.raycaster.far = distance;
    // Ensure transforms are current even on the first frame or in a CPU test.
    for (const mesh of this.occluders) mesh.updateWorldMatrix(true, false);
    const obstruction = this.raycaster.intersectObjects(this.occluders, false)[0];
    return obstruction && obstruction.distance < distance - .005 ? null : nearest;
  }
  update(dt, active) {
    this.target = active ? this.findTarget() : null;
    this.ui.setTarget(this.target?.definition.name ?? null);
    if (active && this.toastTime > 0) {
      this.toastTime = Math.max(0, this.toastTime - dt);
      if (this.toastTime === 0) this.ui.showFound(null);
    }
  }
  handleKey(event, active) {
    if (!active || event.code !== 'KeyE' || event.repeat || event.isComposing) return false;
    // Recheck sight/range now, never collect from a stale previous-frame target.
    const item = this.findTarget();
    if (!item || !this.inventory.add(item.definition.id)) return false;
    item.group.visible = false; item.group.removeFromParent(); this.target = null;
    this.ui.setTarget(null); this.ui.setCount(this.inventory.count, this.inventory.total);
    this.ui.showFound(item.definition.name); this.toastTime = 3;
    event.preventDefault?.(); return true;
  }
}

export function collectionUI(root = document) {
  const prompt = root.querySelector('#interaction-prompt');
  const name = root.querySelector('#interaction-name');
  const count = root.querySelector('#collection-count');
  const toast = root.querySelector('#collection-toast');
  const crosshair = root.querySelector('.crosshair');
  return {
    setCount(found, total) { count.textContent = `${found}/${total}`; },
    setTarget(item) { prompt.hidden = !item; name.textContent = item ?? ''; crosshair.classList.toggle('interactive', Boolean(item)); },
    showFound(item) { toast.hidden = !item; toast.textContent = item ? `Item encontrado: ${item}` : ''; },
  };
}
