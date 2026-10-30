// ============================================================================
// Machine settings, in SI units: metres, kilograms, seconds, joules, m/s².
// Teacher mode (T) edits these live; RESET rebuilds the world from them.
// ============================================================================
//
// Positions (x) are measured in metres from the left edge of the stage.
// Heights sit on the floor. Angles are in degrees. Friction, restitution and
// rolling-resistance coefficients have no units.

const CONFIG = {
  gravity: 9.81,              // m/s²

  ramp: {
    pivotX: 1.25,             // m — bottom end of the ramp, on the floor
    length: 1.18,             // m
    thickness: 0.05,          // m
    friction: 0.6,
    angles: { low: 7, medium: 14, high: 22 }, // degrees
  },

  ball: {
    radius: 0.07,             // m
    mass: 0.6,                // kg
    friction: 0.5,
    rollingDamping: 0.594272665, // 1/s — angular damping, stands in for rolling resistance
    restitution: 0.05,
    startInset: 0.13,         // m — start distance from the top end of the ramp
  },

  domino: {
    width: 0.07,              // m
    height: 0.30,             // m
    count: 8,
    firstX: 1.475,            // m — centre of the first domino
    spacing: 0.22,            // m — centre to centre
    mass: 1,                  // kg
    friction: 0.3,            // low face friction, so leaning dominoes don't wedge
    restitution: 0.02,
  },

  cart: {
    gap: 0.13,                // m — gap between last domino and the wagon's rear
    width: 0.65,              // m
    height: 0.23,             // m — floor to top of the tub
    baseMass: 0.4,            // kg — empty wagon
    brickMass: 1.6,           // kg — each brick
    defaultBricks: 8,
    maxBricks: 8,
    rollingResistance: 0.022, // wheel drag as a fraction of weight
  },

  // Buffer post with the trigger lever. The wagon stops against it; a cord
  // runs from the lever to the launcher's latch.
  trigger: {
    x: 4.47,                  // m — left face of the post
    width: 0.07,              // m
    height: 0.27,             // m
  },

  launcher: {
    x: 4.90,                  // m — rear (left) edge of the base
    width: 0.40,              // m
    height: 0.15,             // m
    mass: 1.6,                // kg
    rollingResistance: 0.12,  // wheel drag as a fraction of weight
    barrelAngle: 55,          // degrees above horizontal
    barrelLength: 0.32,       // m
    springEnergy: 3.924,      // J released by the spring each shot
  },

  projectile: {
    radius: 0.06,             // m
    mass: 1,                  // kg
    friction: 0.3,
    rollingDamping: 1.48568166, // 1/s
    restitution: 0.2,
  },

  cup: {
    x: 6.20,                  // m — centre
    topWidth: 0.33,           // m
    bottomWidth: 0.25,        // m
    height: 0.32,             // m
    wall: 0.03,               // m
  },

  // When a run counts as finished.
  stop: {
    speed: 0.025,             // m/s — everything slower than this counts as still
    stillTime: 1.5,           // s of stillness before the run ends
    successHoldTime: 2.5,     // s to keep running after the ball lands in the cup
    maxRunTime: 30,           // s
  },
};

// ============================================================================
// Unit scale factors: how the SI values above map onto the simulation.
// ============================================================================
//
// The machine was tuned in the physics engine's own units: lengths in units
// of 100 stage pixels, gravity 20. Motion stays exactly the same if every
// length is scaled by L, every mass by M and every time by T, provided all
// derived quantities scale with them:
//
//   speed  L/T    acceleration  L/T²    rate (1/s)  1/T
//   force  ML/T² energy        ML²/T²  momentum    ML/T
//
// L and T are tied together by gravity: engine gravity 20 must become
// 9.81 m/s², so L/T² = 9.81/20. These factors put 1 stage pixel at exactly
// 5 mm (so the 1280×720 stage is 6.4 m × 3.6 m) and masses at 1 kg per unit,
// which forces T = √(0.5 × 20 / 9.81) ≈ 1.0096. One second of playback at 1×
// is therefore 1.0096 real seconds: about 1% slower than real time.
//
// Changing a factor changes how the stage maps onto the real world. To keep
// the machine behaving as tuned, the SI values above must be rescaled with it.

const UNITS = {
  metresPerPixel: 0.005,                        // L, as drawn on the stage
  kilogramsPerMassUnit: 1,                      // M
  secondsPerEngineSecond: Math.sqrt(10 / 9.81), // T ≈ 1.0096
};

// Simulation settings that aren't physical quantities.
const SIMULATION = {
  stage: { widthPx: 1280, heightPx: 720, floorPx: 470 }, // logical canvas; floor line in px from the top
  pixelsPerEngineLength: 100,
  // Fixed physics step. 240 Hz keeps contacts crisp and lets slow motion stay
  // smooth: 1× = 4 steps per 60 fps frame, 0.5× = 2, 0.25× = 1.
  stepHz: 240,
  velocityIterations: 10,
  positionIterations: 8,
};

// ----------------------------------------------------------------------------
// SI → engine conversion. ENGINE has the same shape the simulation and
// renderer read: geometry in stage px, physics in engine units.
// ----------------------------------------------------------------------------

function unitConverters(units = UNITS) {
  const L = units.metresPerPixel * SIMULATION.pixelsPerEngineLength; // m per engine length
  const M = units.kilogramsPerMassUnit;
  const T = units.secondsPerEngineSecond;
  // Round to 12 significant figures so e.g. 0.07 m comes back as exactly 14 px.
  const tidy = x => Number(x.toPrecision(12));
  return {
    toEngine: {
      px: m => tidy(m / units.metresPerPixel),
      mass: kg => tidy(kg / M),
      rate: perS => tidy(perS * T),
      speed: v => tidy((v * T) / L),
      accel: a => tidy((a * T * T) / L),
      energy: j => tidy((j * T * T) / (M * L * L)),
      ms: s => tidy((s / T) * 1000),
    },
    toSI: {
      metres: pxValue => pxValue * units.metresPerPixel,
      kg: m => m * M,
      speed: v => (v * L) / T,
      seconds: engineMs => (engineMs / 1000) * T,
      momentum: p => (p * M * L) / T,
    },
  };
}

function deriveEngineConfig(si = CONFIG) {
  const e = unitConverters().toEngine;
  const S = SIMULATION;
  return {
    world: { width: S.stage.widthPx, height: S.stage.heightPx, groundY: S.stage.floorPx },
    SCALE: S.pixelsPerEngineLength,
    stepHz: S.stepHz,
    velocityIterations: S.velocityIterations,
    positionIterations: S.positionIterations,
    gravity: e.accel(si.gravity),

    ramp: {
      pivotX: e.px(si.ramp.pivotX),
      length: e.px(si.ramp.length),
      thickness: e.px(si.ramp.thickness),
      friction: si.ramp.friction,
      angles: { ...si.ramp.angles },
    },
    ball: {
      radius: e.px(si.ball.radius),
      mass: e.mass(si.ball.mass),
      friction: si.ball.friction,
      rollingDamping: e.rate(si.ball.rollingDamping),
      restitution: si.ball.restitution,
      startInset: e.px(si.ball.startInset),
    },
    domino: {
      width: e.px(si.domino.width),
      height: e.px(si.domino.height),
      count: si.domino.count,
      firstX: e.px(si.domino.firstX),
      spacing: e.px(si.domino.spacing),
      mass: e.mass(si.domino.mass),
      friction: si.domino.friction,
      restitution: si.domino.restitution,
    },
    cart: {
      gap: e.px(si.cart.gap),
      width: e.px(si.cart.width),
      height: e.px(si.cart.height),
      baseMass: e.mass(si.cart.baseMass),
      brickMass: e.mass(si.cart.brickMass),
      defaultBricks: si.cart.defaultBricks,
      maxBricks: si.cart.maxBricks,
      rollingResistance: si.cart.rollingResistance,
    },
    trigger: {
      x: e.px(si.trigger.x),
      width: e.px(si.trigger.width),
      height: e.px(si.trigger.height),
    },
    launcher: {
      x: e.px(si.launcher.x),
      width: e.px(si.launcher.width),
      height: e.px(si.launcher.height),
      mass: e.mass(si.launcher.mass),
      rollingResistance: si.launcher.rollingResistance,
      barrelAngle: si.launcher.barrelAngle,
      barrelLength: e.px(si.launcher.barrelLength),
      springEnergy: e.energy(si.launcher.springEnergy),
    },
    projectile: {
      radius: e.px(si.projectile.radius),
      mass: e.mass(si.projectile.mass),
      friction: si.projectile.friction,
      rollingDamping: e.rate(si.projectile.rollingDamping),
      restitution: si.projectile.restitution,
    },
    cup: {
      x: e.px(si.cup.x),
      topWidth: e.px(si.cup.topWidth),
      bottomWidth: e.px(si.cup.bottomWidth),
      height: e.px(si.cup.height),
      wall: e.px(si.cup.wall),
    },
    stop: {
      speed: e.speed(si.stop.speed),
      holdMs: e.ms(si.stop.stillTime),
      successHoldMs: e.ms(si.stop.successHoldTime),
      maxRunMs: e.ms(si.stop.maxRunTime),
    },
  };
}

let ENGINE = deriveEngineConfig();

// Call after editing CONFIG (teacher mode does this), then reset the world.
function rebuildEngineConfig() {
  ENGINE = deriveEngineConfig();
}

// Snapshot so teacher mode can restore defaults.
const CONFIG_DEFAULTS = JSON.parse(JSON.stringify(CONFIG));
