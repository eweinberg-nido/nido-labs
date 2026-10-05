// All tuning values live here. Teacher mode (T) edits these live; RESET
// rebuilds the world from them.
//
// Geometry is in screen px on a 1280×720 stage. Physics runs in planck.js
// (Box2D) in metres, with SCALE px per metre. Masses are relative. Speeds,
// gravity and energies are in physics units (m, s).

const CONFIG = {
  world: { width: 1280, height: 720, groundY: 470 },
  SCALE: 100,              // px per metre

  // Fixed physics step. 240 Hz keeps contacts crisp and lets slow motion stay
  // smooth: 1× = 4 steps per 60 fps frame, 0.5× = 2, 0.25× = 1.
  stepHz: 240,
  velocityIterations: 10,
  positionIterations: 8,
  gravity: 20,             // m/s² — higher than 9.8 so the tabletop scale reads right

  ramp: {
    pivotX: 250,           // bottom end of the ramp, on the floor
    length: 236,
    thickness: 10,
    friction: 0.6,
    angles: { low: 7, medium: 14, high: 22 },
  },

  ball: {
    radius: 14,
    mass: 0.6,
    friction: 0.5,
    rollingDamping: 0.6,   // angular damping: stands in for rolling resistance
    restitution: 0.05,
    startInset: 26,        // distance from top end of ramp
  },

  domino: {
    width: 14,
    height: 60,
    count: 8,
    firstX: 295,
    spacing: 44,
    mass: 1,
    friction: 0.3,         // low face friction, so leaning dominoes don't wedge
    restitution: 0.02,
  },

  cart: {
    gap: 26,               // gap between last domino and cart's rear edge
    width: 130,
    height: 46,
    baseMass: 0.4,
    brickMass: 1.6,
    defaultBricks: 8,
    maxBricks: 8,
    rollingResistance: 0.022, // wheel drag as a fraction of weight
  },

  // Buffer post with the trigger lever. The cart stops against it; a cord
  // runs from the lever to the launcher's latch.
  trigger: {
    x: 894,                // left face of the post
    width: 14,
    height: 54,
  },

  launcher: {
    x: 980,                // rear (left) edge of launcher base
    width: 80,
    height: 30,
    mass: 1.6,
    rollingResistance: 0.12,
    barrelAngle: 55,       // degrees above horizontal
    barrelLength: 64,
    springEnergy: 16,         // energy the spring releases each shot
  },

  projectile: {
    radius: 12,
    mass: 1,
    friction: 0.3,
    rollingDamping: 1.5,
    restitution: 0.2,
  },

  cup: {
    x: 1240,               // centre
    topWidth: 66,
    bottomWidth: 50,
    height: 64,
    wall: 6,
  },

  stop: {
    speed: 0.05,           // m/s — everything slower than this counts as still
    holdMs: 1500,
    successHoldMs: 2500,
    maxRunMs: 30000,
  },
};

// Snapshot so teacher mode can restore defaults.
const CONFIG_DEFAULTS = JSON.parse(JSON.stringify(CONFIG));
