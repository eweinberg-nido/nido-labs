// Factory functions. Each builds planck.js bodies from CONFIG and the student
// settings. Positions in CONFIG are screen px; px() / m() convert.
// No rendering here — see render.js.

const DEG = Math.PI / 180;

// Shared negative group: the launcher and its projectile never collide.
const LAUNCHER_GROUP = -1;

function m(px) { return px / CONFIG.SCALE; }
function px(metres) { return metres * CONFIG.SCALE; }
function V(xPx, yPx) { return planck.Vec2(m(xPx), m(yPx)); }

// Screen-space pose of a body, for rendering and metrics.
function pose(body) {
  const p = body.getPosition();
  return { x: px(p.x), y: px(p.y), angle: body.getAngle() };
}

// Explicit mass and rotational inertia, so the visible brick count is the
// actual mass and balls/dominoes have true inertia for their shape.
function setMass(body, mass, inertia) {
  body.setMassData({ mass, center: planck.Vec2(0, 0), I: inertia });
}

function tag(body, label, extra = {}) {
  body.setUserData({ label, ...extra });
  return body;
}

function labelOf(body) {
  const d = body.getUserData();
  return d ? d.label : null;
}

function createGround(world) {
  const { width, groundY } = CONFIG.world;
  const ground = tag(world.createBody({ position: V(width / 2, groundY + 100) }), "ground");
  ground.createFixture(planck.Box(m(width * 1.5), m(100)), { friction: 1 });
  return ground;
}

// Geometry of the ramp for a given angle setting. The ramp pivots around a
// fixed bottom point on the floor, so steeper also means higher.
function rampGeometry(rampSetting) {
  const r = CONFIG.ramp;
  const theta = r.angles[rampSetting] * DEG;
  const pivot = { x: r.pivotX, y: CONFIG.world.groundY };
  const up = { x: -Math.cos(theta), y: -Math.sin(theta) };   // along ramp, uphill
  const normal = { x: Math.sin(theta), y: -Math.cos(theta) }; // out of top surface
  const top = { x: pivot.x + up.x * r.length, y: pivot.y + up.y * r.length };
  return { theta, pivot, up, normal, top };
}

function createRamp(world, rampSetting) {
  const r = CONFIG.ramp;
  const g = rampGeometry(rampSetting);
  const cx = g.pivot.x + g.up.x * (r.length / 2) - g.normal.x * (r.thickness / 2);
  const cy = g.pivot.y + g.up.y * (r.length / 2) - g.normal.y * (r.thickness / 2);
  const ramp = tag(world.createBody({ position: V(cx, cy), angle: g.theta }), "ramp");
  ramp.createFixture(planck.Box(m(r.length / 2), m(r.thickness / 2)), { friction: r.friction });
  return ramp;
}

function ballInertia() {
  const b = CONFIG.ball;
  return 0.4 * b.mass * m(b.radius) ** 2; // solid sphere
}

// The ball is created static (held at the top) and released on RUN.
function createBall(world, rampSetting) {
  const b = CONFIG.ball;
  const g = rampGeometry(rampSetting);
  const d = CONFIG.ramp.length - b.startInset;
  const ball = tag(world.createBody({
    type: "static",
    bullet: true,
    angularDamping: b.rollingDamping,
    position: V(
      g.pivot.x + g.up.x * d + g.normal.x * (b.radius + 0.5),
      g.pivot.y + g.up.y * d + g.normal.y * (b.radius + 0.5)
    ),
  }), "ball");
  ball.createFixture(planck.Circle(m(b.radius)), {
    density: 1, friction: b.friction, restitution: b.restitution,
  });
  return ball;
}

function releaseBall(ball) {
  ball.setDynamic();
  setMass(ball, CONFIG.ball.mass, ballInertia());
  ball.setAwake(true);
}

function createDominoes(world) {
  const d = CONFIG.domino;
  const gy = CONFIG.world.groundY;
  const list = [];
  for (let i = 0; i < d.count; i++) {
    const dom = tag(world.createDynamicBody({
      position: V(d.firstX + i * d.spacing, gy - d.height / 2),
    }), "domino", { index: i });
    dom.createFixture(planck.Box(m(d.width / 2), m(d.height / 2)), {
      density: 1, friction: d.friction, restitution: d.restitution,
    });
    setMass(dom, d.mass, (d.mass * (m(d.width) ** 2 + m(d.height) ** 2)) / 12);
    list.push(dom);
  }
  return list;
}

function cartLeftX() {
  const d = CONFIG.domino;
  return d.firstX + (d.count - 1) * d.spacing + d.width / 2 + CONFIG.cart.gap;
}

function cartMass(brickCount) {
  return CONFIG.cart.baseMass + brickCount * CONFIG.cart.brickMass;
}

// One rigid box carries the wagon; wheels and bricks are drawn on top of it.
// The bricks are mass, not separate bodies, so the load can't fall off.
function createCart(world, brickCount) {
  const c = CONFIG.cart;
  const gy = CONFIG.world.groundY;
  const x = cartLeftX();
  const cart = tag(world.createDynamicBody({
    position: V(x + c.width / 2, gy - c.height / 2),
    fixedRotation: true,     // wagons roll, they don't tip
  }), "cart", { startX: x + c.width / 2, bricks: brickCount });
  cart.createFixture(planck.Box(m(c.width / 2), m(c.height / 2)), {
    density: 1, friction: 0, restitution: 0, // wheels: see applyRollingResistance()
  });
  setMass(cart, cartMass(brickCount), 1);
  return cart;
}

function createLauncher(world, anchored) {
  const l = CONFIG.launcher;
  const gy = CONFIG.world.groundY;
  const base = tag(world.createBody({
    type: anchored ? "static" : "dynamic",
    position: V(l.x + l.width / 2, gy - l.height / 2),
    fixedRotation: true,
  }), "launcher", { startX: l.x + l.width / 2 });
  base.createFixture(planck.Box(m(l.width / 2), m(l.height / 2)), {
    density: 1, friction: 0, restitution: 0,
    filterGroupIndex: LAUNCHER_GROUP,
  });
  if (!anchored) setMass(base, l.mass, 1);
  return { base, hasFired: false, firedAt: null, anchored };
}

// Buffer post + trigger lever. The cart's arrival is detected by a thin
// sensor on the post's face; the post itself stops the cart.
function createTrigger(world) {
  const t = CONFIG.trigger;
  const gy = CONFIG.world.groundY;
  const post = tag(world.createBody({ position: V(t.x + t.width / 2, gy - t.height / 2) }), "triggerPost");
  post.createFixture(planck.Box(m(t.width / 2), m(t.height / 2)), { friction: 0.3 });
  const sensor = tag(world.createBody({ position: V(t.x - 3, gy - t.height / 2) }), "launcherTrigger");
  sensor.createFixture(planck.Box(m(3), m(t.height / 2)), { isSensor: true });
  return { post, sensor };
}

// Barrel pivot, relative to the launcher base centre (px).
function barrelPivotOffset() {
  const l = CONFIG.launcher;
  return { x: l.width * 0.12, y: -l.height / 2 - 10 };
}

function barrelTip(basePose) {
  const l = CONFIG.launcher;
  const a = l.barrelAngle * DEG;
  const p = barrelPivotOffset();
  return {
    x: basePose.x + p.x + Math.cos(a) * l.barrelLength,
    y: basePose.y + p.y - Math.sin(a) * l.barrelLength,
  };
}

function createProjectile(world, posPx) {
  const p = CONFIG.projectile;
  const proj = tag(world.createDynamicBody({
    position: V(posPx.x, posPx.y),
    bullet: true,
    angularDamping: p.rollingDamping,
  }), "projectile");
  proj.createFixture(planck.Circle(m(p.radius)), {
    density: 1, friction: p.friction, restitution: p.restitution,
    filterGroupIndex: LAUNCHER_GROUP,
  });
  setMass(proj, p.mass, 0.4 * p.mass * m(p.radius) ** 2);
  return proj;
}

// Cup = two slanted walls + a bottom on one static body, plus a sensor inside.
function cupGeometry() {
  const c = CONFIG.cup;
  const gy = CONFIG.world.groundY;
  return {
    cx: c.x,
    top: gy - c.height,
    bottom: gy,
    topHalf: c.topWidth / 2,
    bottomHalf: c.bottomWidth / 2,
  };
}

function createCup(world) {
  const c = CONFIG.cup;
  const g = cupGeometry();
  const cup = tag(world.createBody({ position: V(g.cx, g.bottom) }), "cup");
  const slant = Math.atan2(g.topHalf - g.bottomHalf, c.height);
  const wallLen = Math.hypot(c.height, g.topHalf - g.bottomHalf);
  const midHalf = (g.topHalf + g.bottomHalf) / 2 - c.wall / 2;
  const opts = { friction: 0.4, restitution: 0.1 };

  cup.createFixture(planck.Box(m(c.wall / 2), m(wallLen / 2), V(-midHalf, -c.height / 2), -slant), opts);
  cup.createFixture(planck.Box(m(c.wall / 2), m(wallLen / 2), V(midHalf, -c.height / 2), slant), opts);
  cup.createFixture(planck.Box(m(c.bottomWidth / 2), m(c.wall / 2), V(0, -c.wall / 2), 0), opts);

  const sensor = tag(world.createBody({ position: V(g.cx, g.bottom - c.height * 0.3) }), "cupSensor");
  sensor.createFixture(planck.Box(m(c.bottomWidth / 2 - c.wall), m(c.height * 0.2)), { isSensor: true });
  return { body: cup, sensor };
}
