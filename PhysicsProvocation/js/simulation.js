// planck.js world, construction, contact events, run/reset and state.
// Rendering-free so it can also be stepped headless for tuning.

const STATES = {
  READY: "READY",
  RUNNING: "RUNNING",
  FAILED_DOMINO: "FAILED_DOMINO",
  FAILED_CART: "FAILED_CART",
  FAILED_LAUNCHER: "FAILED_LAUNCHER",
  SUCCESS: "SUCCESS",
};

const Sim = {
  world: null,
  settings: { ramp: "low", bricks: 8, anchored: false },
  state: STATES.READY,
  stopped: false,
  time: 0,          // simulated ms since RUN
  stillFor: 0,
  successAt: null,
  events: [],       // [{ name, t }] — used by the camera and debug overlay
  pendingFire: false,

  ground: null, ramp: null, ball: null, dominoes: [], cart: null,
  trigger: null, launcher: null, projectile: null, cup: null,
  metrics: {},
};

function simLog(name) {
  if (!simHas(name)) Sim.events.push({ name, t: Sim.time });
}

function simHas(name) {
  return Sim.events.some(e => e.name === name);
}

function simEventTime(name) {
  const e = Sim.events.find(ev => ev.name === name);
  return e ? e.t : null;
}

// Full rebuild. Settings (ramp, bricks, anchored) survive; physical state doesn't.
function simReset() {
  const world = new planck.World({ gravity: planck.Vec2(0, CONFIG.gravity) });
  Sim.world = world;

  const s = Sim.settings;
  Sim.ground = createGround(world);
  Sim.ramp = createRamp(world, s.ramp);
  Sim.ball = createBall(world, s.ramp);
  Sim.dominoes = createDominoes(world);
  Sim.cart = createCart(world, s.bricks);
  Sim.trigger = createTrigger(world);
  Sim.launcher = createLauncher(world, s.anchored);
  Sim.projectile = null;
  Sim.cup = createCup(world);

  world.on("begin-contact", onBeginContact);

  Sim.state = STATES.READY;
  Sim.stopped = false;
  Sim.time = 0;
  Sim.stillFor = 0;
  Sim.successAt = null;
  Sim.events = [];
  Sim.pendingFire = false;
  Sim.metrics = { ballSpeedAtHit: null, firstDominoMaxAngle: 0, landingX: null, trail: [] };
}

function simRun() {
  if (Sim.state !== STATES.READY) return;
  releaseBall(Sim.ball);
  Sim.state = STATES.RUNNING;
  simLog("run");
}

function contactPair(contact, a, b) {
  const A = contact.getFixtureA().getBody();
  const B = contact.getFixtureB().getBody();
  if (labelOf(A) === a && labelOf(B) === b) return [A, B];
  if (labelOf(A) === b && labelOf(B) === a) return [B, A];
  return null;
}

// Contact callbacks run inside world.step(), when the world is locked, so
// anything that creates bodies is deferred until after the step.
function onBeginContact(contact) {
  let p;
  if ((p = contactPair(contact, "ball", "domino")) && p[1].getUserData().index === 0 && !simHas("ballHitDomino")) {
    Sim.metrics.ballSpeedAtHit = p[0].getLinearVelocity().length();
    simLog("ballHitDomino");
  }
  if ((p = contactPair(contact, "domino", "domino"))) {
    simLog("domino" + Math.max(p[0].getUserData().index, p[1].getUserData().index));
  }
  if ((p = contactPair(contact, "domino", "cart")) && p[0].getUserData().index === CONFIG.domino.count - 1) {
    simLog("cartHit");
  }
  if (contactPair(contact, "cart", "launcherTrigger") && !Sim.launcher.hasFired) {
    Sim.pendingFire = true;
  }
  if (contactPair(contact, "projectile", "cupSensor") && Sim.state === STATES.RUNNING) {
    Sim.state = STATES.SUCCESS;
    Sim.successAt = Sim.time;
    simLog("success");
  }
  if ((p = contactPair(contact, "projectile", "ground")) || (p = contactPair(contact, "projectile", "cup"))) {
    if (Sim.metrics.landingX === null) Sim.metrics.landingX = pose(p[0]).x;
    simLog("projectileLanded");
  }
}

// The spring releases a fixed amount of energy per shot. Projectile and
// launcher get equal and opposite momentum p, so that energy is shared:
//   E = p²/2mₚ + p²/2m_L
// Anchored, the launcher is held by the floor (effectively infinite mass),
// so the projectile receives all of it and flies further.
function fireLauncher() {
  const L = Sim.launcher;
  if (L.hasFired) return;
  L.hasFired = true;
  L.firedAt = Sim.time;
  simLog("fire");

  const lc = CONFIG.launcher;
  const mp = CONFIG.projectile.mass;
  const invMass = 1 / mp + (L.anchored ? 0 : 1 / lc.mass);
  const p = Math.sqrt((2 * lc.springEnergy) / invMass);
  const a = lc.barrelAngle * DEG;
  const baseV = L.base.getLinearVelocity();

  const proj = createProjectile(Sim.world, barrelTip(pose(L.base)));
  Sim.projectile = proj;
  proj.setLinearVelocity(planck.Vec2(baseV.x + (Math.cos(a) * p) / mp, baseV.y - (Math.sin(a) * p) / mp));

  if (!L.anchored) {
    // Horizontal recoil; the downward part of the kick goes into the floor.
    L.base.setLinearVelocity(planck.Vec2(baseV.x - (Math.cos(a) * p) / lc.mass, baseV.y));
  }
  Sim.metrics.launchMomentum = p;
}

function dynamicBodies() {
  const list = [Sim.ball, ...Sim.dominoes, Sim.cart];
  if (!Sim.launcher.anchored) list.push(Sim.launcher.base);
  if (Sim.projectile) list.push(Sim.projectile);
  return list;
}

function dominoFallen(d) {
  return Math.abs(d.getAngle()) > 20 * DEG;
}

function classifyStop() {
  if (Sim.state === STATES.SUCCESS) return STATES.SUCCESS;
  if (!Sim.dominoes.every(dominoFallen)) return STATES.FAILED_DOMINO;
  if (!Sim.launcher.hasFired) return STATES.FAILED_CART;
  return STATES.FAILED_LAUNCHER;
}

// Wheeled bodies (cart, launcher) slide frictionlessly on the floor; their
// wheels instead feel rolling resistance: a constant drag of crr × weight,
// opposing motion, that can stop the body but never reverse it.
function applyRollingResistance(body, crr, dt) {
  if (body.isStatic()) return;
  const v = body.getLinearVelocity();
  if (v.x === 0) return;
  const dv = crr * CONFIG.gravity * dt;
  const vx = Math.abs(v.x) <= dv ? 0 : v.x - Math.sign(v.x) * dv;
  body.setLinearVelocity(planck.Vec2(vx, v.y));
}

// One fixed physics step.
function simStep() {
  if (Sim.state === STATES.READY || Sim.stopped) return;
  const dt = 1 / CONFIG.stepHz;

  applyRollingResistance(Sim.cart, CONFIG.cart.rollingResistance, dt);
  applyRollingResistance(Sim.launcher.base, CONFIG.launcher.rollingResistance, dt);

  Sim.world.step(dt, CONFIG.velocityIterations, CONFIG.positionIterations);
  Sim.time += dt * 1000;

  if (Sim.pendingFire) {
    Sim.pendingFire = false;
    fireLauncher();
  }

  const a0 = Math.abs(Sim.dominoes[0].getAngle()) / DEG;
  Sim.metrics.firstDominoMaxAngle = Math.max(Sim.metrics.firstDominoMaxAngle, a0);

  // Stop detection: everything still for a while, or a success has settled.
  const v = CONFIG.stop.speed;
  const still = dynamicBodies().every(
    b => b.getLinearVelocity().length() < v && Math.abs(b.getAngularVelocity()) < v * 5
  );
  Sim.stillFor = still ? Sim.stillFor + dt * 1000 : 0;

  const settledSuccess = Sim.state === STATES.SUCCESS && Sim.time - Sim.successAt > CONFIG.stop.successHoldMs;
  if (Sim.stillFor > CONFIG.stop.holdMs || settledSuccess || Sim.time > CONFIG.stop.maxRunMs) {
    Sim.stopped = true;
    Sim.state = classifyStop();
    simLog("stopped");
  }
}

function simSetSetting(key, value) {
  Sim.settings[key] = value;
  simReset();
}
