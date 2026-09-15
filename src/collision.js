// Upright player cylinder against static boxes/cylinders, with height filtering.
export class CollisionWorld {
  constructor(boundary = 57) { this.shapes = []; this.boundary = boundary; }
  box(x, z, width, depth, minY = 0, maxY = 4) {
    this.shapes.push({ type: 'box', x, z, halfX: width / 2, halfZ: depth / 2, minY, maxY });
  }
  circle(x, z, radius, minY = 0, maxY = 20) {
    this.shapes.push({ type: 'circle', x, z, radius, minY, maxY });
  }
  blocked(x, z, feet, radius = .3, height = 1.72) {
    if (Math.hypot(x, z) + radius > this.boundary) return true;
    return this.shapes.some(s => {
      if (feet >= s.maxY - .02 || feet + height <= s.minY + .02) return false;
      if (s.type === 'circle') return Math.hypot(x - s.x, z - s.z) < radius + s.radius;
      const dx = x - Math.max(s.x - s.halfX, Math.min(x, s.x + s.halfX));
      const dz = z - Math.max(s.z - s.halfZ, Math.min(z, s.z + s.halfZ));
      return dx * dx + dz * dz < radius * radius;
    });
  }
  move(position, dx, dz, radius = .3, height = 1.72) {
    // Substeps prevent tunneling even when a frame stalls. Resolve axes separately to slide.
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (radius * .5)));
    for (let i = 0; i < steps; i++) {
      if (!this.blocked(position.x + dx / steps, position.z, position.y, radius, height)) position.x += dx / steps;
      if (!this.blocked(position.x, position.z + dz / steps, position.y, radius, height)) position.z += dz / steps;
    }
    return position;
  }
}

export function floorHeight(x, z, feet) {
  // Treehouse stairs (south to north), then raised platform. No teleport from below.
  if (Math.abs(x - 23) < 1.2 && z <= -5.5 && z >= -12.5) {
    const height = (-z - 5.5) / 7 * 4;
    if (height <= feet + .35) return height;
  }
  if (x >= 19 && x <= 27 && z >= -19.5 && z <= -12.5 && feet >= 3.65) return 4;
  return 0;
}
