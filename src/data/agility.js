// Agility courses and shortcuts.
// A course is a loop of steps from `start` (overworld tiles):
//   ['walk', dir, n]              a plain path of n tiles
//   [obstacle, dir, gap, ground]  an obstacle, then `gap` impassable tiles (`ground`) you cross with it
// dir is 'n' | 's' | 'e' | 'w'. Obstacles give `xp`; finishing them all in order gives `lap` more.
export const DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

export const COURSES = [
  {
    id: 'yard', name: 'Brindlewood Agility Yard', lvl: 1, xp: 8, lap: 40, start: [158, 192], floor: 'DIRT',
    steps: [['log_balance', 'e', 5, 'WATER'], ['walk', 'e', 2], ['net_climb', 's', 1, 'WALL_WOOD'], ['walk', 's', 2], ['low_wall', 'w', 1, 'WALL_WOOD'], ['walk', 'w', 2],
      ['rope_swing', 'w', 3, 'DITCH'], ['walk', 'n', 2], ['pipe', 'n', 2, 'CAVE_WALL'], ['walk', 'e', 1]],
  },
  {
    id: 'docks', name: 'Port Selby Docks', lvl: 15, xp: 12, lap: 60, start: [134, 182], floor: 'DOCK',
    steps: [['stepping_stone', 'e', 4, 'WATER'], ['walk', 'e', 2], ['rope_swing', 's', 3, 'WATER'], ['walk', 's', 1], ['low_wall', 'w', 1, 'WALL_WOOD'], ['walk', 'w', 3],
      ['log_balance', 'w', 4, 'WATER'], ['walk', 'n', 2], ['net_climb', 'n', 1, 'WALL_WOOD'], ['walk', 'e', 2]],
  },
  {
    id: 'walls', name: 'Highcrest Walls', lvl: 30, xp: 18, lap: 90, start: [258, 100], floor: 'COBBLE',
    steps: [['net_climb', 'e', 1, 'WALL'], ['walk', 'e', 2], ['ledge', 'e', 4, 'VOID'], ['walk', 's', 2], ['gap_jump', 's', 2, 'VOID'], ['walk', 's', 1],
      ['low_wall', 'w', 1, 'WALL'], ['walk', 'w', 3], ['zip_line', 'w', 4, 'VOID'], ['walk', 'n', 3], ['gap_jump', 'n', 2, 'VOID'], ['walk', 'n', 1]],
  },
  {
    id: 'wild', name: 'Wilderness Course', lvl: 52, xp: 35, lap: 250, start: [124, 26], floor: 'DIRT',
    steps: [['pipe', 'e', 3, 'CAVE_WALL'], ['walk', 'e', 2], ['rope_swing', 's', 4, 'LAVA'], ['walk', 's', 1], ['stepping_stone', 'w', 4, 'LAVA'], ['walk', 'w', 2],
      ['log_balance', 'n', 4, 'LAVA'], ['walk', 'n', 1], ['net_climb', 'e', 1, 'WALL_DARK'], ['walk', 'e', 1]],
  },
  {
    id: 'canopy', name: 'Elderglen Canopy', lvl: 65, xp: 40, lap: 250, start: [24, 200], floor: 'DARKGRASS',
    steps: [['net_climb', 'e', 1, 'WALL_WOOD'], ['walk', 'e', 1], ['rope_swing', 'e', 4, 'VOID'], ['walk', 's', 2], ['ledge', 's', 4, 'VOID'], ['walk', 'w', 2],
      ['zip_line', 'w', 5, 'VOID'], ['walk', 'n', 2], ['gap_jump', 'n', 3, 'VOID'], ['walk', 'e', 1]],
  },
  {
    id: 'ice', name: 'Frostpeak Ice Run', lvl: 80, xp: 55, lap: 350, start: [344, 34], floor: 'SNOW',
    steps: [['ledge', 'e', 4, 'WALL_ICE'], ['walk', 'e', 2], ['stepping_stone', 's', 4, 'WATER'], ['walk', 's', 1], ['gap_jump', 'w', 3, 'VOID'], ['walk', 'w', 2],
      ['rope_swing', 'w', 4, 'WATER'], ['walk', 'n', 2], ['zip_line', 'n', 4, 'VOID'], ['walk', 'e', 2]],
  },
];

// Two-way shortcuts: an obstacle between `a` and `b` (tiles either side).
export const SHORTCUTS = [
  { id: 'brindle_stones', type: 'stepping_stone', lvl: 12, xp: 8, from: [236, 172], dir: 'e', across: 'water' },
  { id: 'highcrest_crack', type: 'wall_crack', lvl: 21, xp: 10, a: [205, 100], b: [207, 100] },
  { id: 'elderglen_stones', type: 'stepping_stone', lvl: 45, xp: 15, from: [36, 140], dir: 'w', across: 'water' },
  { id: 'mortmire_log', type: 'log_balance', lvl: 33, xp: 12, from: [224, 244], dir: 'w', across: 'water' },
];

// How obstacles are used, and whether a low level can slip.
export const OBSTACLE_VERBS = {
  log_balance: ['Walk-across', true], stepping_stone: ['Jump-across', true], rope_swing: ['Swing-on', true], net_climb: ['Climb-over', false],
  low_wall: ['Climb-over', false], pipe: ['Squeeze-through', false], ledge: ['Balance-along', true], gap_jump: ['Jump', true],
  zip_line: ['Ride', false], wall_crack: ['Squeeze-through', false],
};
