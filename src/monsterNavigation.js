// Ground-level A* on the existing collision world. Cached cells, bounded search,
// and segment checks prevent wall tunneling and diagonal corner cutting.
export class MonsterNavigation {
  constructor(collision) { this.collision = collision; this.step = .65; this.cells = new Map(); }
  clear(x, z) { return !this.collision.blocked(x, z, 0, .32, 1.72); }
  segment(a, b) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .12);
    for (let i = 0; i <= n; i++) if (!this.clear(a.x + (b.x - a.x) * i / (n || 1), a.z + (b.z - a.z) * i / (n || 1))) return false;
    return true;
  }
  cell(x, z) {
    const key = `${x},${z}`;
    if (!this.cells.has(key)) this.cells.set(key, this.clear(x * this.step, z * this.step));
    return this.cells.get(key);
  }
  nearest(position) {
    const x = Math.round(position.x / this.step), z = Math.round(position.z / this.step);
    for (let r = 0; r <= 3; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      const candidate = { x: (x + dx) * this.step, z: (z + dz) * this.step };
      if (this.cell(x + dx, z + dz) && this.segment(position, candidate)) return [x + dx, z + dz];
    }
    return null;
  }
  path(from, to) {
    if (this.segment(from, to)) return [{ x: to.x, z: to.z }];
    const start = this.nearest(from), goal = this.nearest(to); if (!start || !goal) return [];
    const key = (x, z) => `${x},${z}`, goalKey = key(...goal);
    const open = [], scores = new Map(), parents = new Map(), closed = new Set();
    function push(node) {
      open.push(node); let i = open.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (open[p].f <= node.f) break; open[i] = open[p]; i = p; } open[i] = node;
    }
    function pop() {
      const result = open[0], tail = open.pop();
      if (open.length) { let i = 0; while (i * 2 + 1 < open.length) { let c = i * 2 + 1; if (c + 1 < open.length && open[c + 1].f < open[c].f) c++; if (open[c].f >= tail.f) break; open[i] = open[c]; i = c; } open[i] = tail; }
      return result;
    }
    push({ x: start[0], z: start[1], f: 0, g: 0 }); scores.set(key(...start), 0);
    let expanded = 0;
    while (open.length && expanded++ < 5000) {
      const current = pop(), id = key(current.x, current.z); if (closed.has(id)) continue;
      if (id === goalKey) {
        const result = [{ x: to.x, z: to.z }]; let cursor = id;
        while (cursor) { const [x, z] = cursor.split(',').map(Number); result.unshift({ x: x * this.step, z: z * this.step }); cursor = parents.get(cursor); }
        return result;
      }
      closed.add(id);
      for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
        const x = current.x + dx, z = current.z + dz, next = key(x, z);
        if (closed.has(next) || !this.cell(x, z)) continue;
        const g = current.g + Math.hypot(dx, dz); if (g >= (scores.get(next) ?? Infinity)) continue;
        if (!this.segment({ x: current.x * this.step, z: current.z * this.step }, { x: x * this.step, z: z * this.step })) continue;
        scores.set(next, g); parents.set(next, id); push({ x, z, g, f: g + Math.hypot(x - goal[0], z - goal[1]) });
      }
    }
    return []; // No teleport or direct-line fallback when the route is blocked.
  }
}
