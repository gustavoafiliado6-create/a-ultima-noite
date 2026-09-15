export const PLAYER = Object.freeze({ radius: 0.3, height: 1.72, walkSpeed: 3.25, runSpeed: 5.8, sensitivity: 0.0018, spawn: { x: 0, z: 26 } });
export const WORLD = Object.freeze({ radius: 57, seed: 17021986 });

export function seededRandom(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
    n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n;
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
