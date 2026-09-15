const event = (id, sound, location = 'woods', minItems = 0, extra = {}) => Object.freeze({
  id, type: 'sound', sound, location, minItems, maxItems: 4, intensity: 12 + minItems * 9,
  cooldown: 65, chance: 1, min: 8, max: 24, duration: 3, repeatable: true,
  interior: true, exterior: true, ...extra,
});

export const TERROR_EVENTS = Object.freeze([
  event('branch', 'branch', 'behind'), event('footsteps', 'steps'),
  event('running-leaves', 'rush', 'behind', 1), event('leaves', 'leaves'),
  event('tree-creak', 'creak'), event('house-knock', 'knock', 'house'),
  event('wood-scratch', 'scratch', 'house', 2), event('window-rattle', 'rattle', 'house', 1),
  event('fallen-object', 'impact', 'house', 2), event('shed-noise', 'knock', 'shed'),
  event('treehouse-creak', 'creak', 'treehouse'), event('distant-breath', 'breath'),
  event('close-breath', 'breath', 'behind', 3, { min: 5, max: 9, cooldown: 110 }),
  event('whisper', 'whisper', 'behind', 2), event('radio-static', 'static', 'radio', 1),
  event('silence', null, 'any', 0, { type: 'silence', duration: 6, cooldown: 100 }),
  event('flicker', 'static', 'any', 2, { type: 'flicker', duration: .8, cooldown: 100 }),
  event('thunder', 'thunder', 'woods', 1, { type: 'lightning', cooldown: 120, chance: .35 }),
  ...[
    ['watcher', 'woods', 0], ['house-figure', 'house', 2], ['shed-figure', 'shed', 2],
    ['treehouse-figure', 'treehouse', 1], ['behind-figure', 'behind', 3],
    ['glimpse', 'woods', 2], ['lightning-figure', 'woods', 2],
  ].map(([id, location, minItems]) => event(id, 'breath', location, minItems, {
    type: 'apparition', min: 10, max: 75, cooldown: 85, chance: .85, duration: id === 'glimpse' || id === 'lightning-figure' ? 1.2 : 18,
  })),
]);

export function terrorLocation(position) {
  if (position.y > 3 && Math.abs(position.x - 23) < 5 && Math.abs(position.z + 16) < 5) return 'treehouse';
  if (Math.abs(position.x) < 6.5 && position.z > -5 && position.z < 5) return 'house';
  if (Math.abs(position.x + 23) < 3.5 && Math.abs(position.z + 13) < 3.5) return 'shed';
  return 'woods';
}

export function appearanceRange(count, random = Math.random, first = false) {
  const ranges = [[42, 75], [34, 65], [25, 50], [15, 35], [10, 25]];
  return ranges[first ? 0 : random() < .22 ? 0 : Math.min(4, count)];
}
