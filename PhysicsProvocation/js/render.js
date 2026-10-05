// p5.js drawing. Reads physics state from Sim; never moves bodies.
// Everything is drawn in the 1280×720 stage coordinate system.

const COLORS = {
  wall: "#e9eaec",
  floor: "#dcdee1",
  floorEdge: "#c9ccd0",
  shadow: "rgba(20, 24, 30, 0.08)",
  ramp: "#2a2c30",
  rampSupport: "#36393e",
  domino: "#2f6fd8",
  dominoEdge: "#2257b5",
  cart: "#d33b30",
  cartDark: "#a82d24",
  cartRim: "#e8584c",
  brick: "#8e9298",
  brickEdge: "#74787e",
  brickTop: "#a2a6ab",
  charcoal: "#2c2e33",
  charcoalMid: "#43464c",
  charcoalLight: "#5f636a",
  hub: "#a8adb3",
  steelBracket: "#80868d",
  cord: "#6b6f75",
  orange: "#f26a1b",
  cupFill: "#fcfcfb",
  cupEdge: "#c3c6ca",
  cupShade: "#eceeef",
  debug: "#e0218a",
  debugSensor: "#14a35a",
};

const CONFETTI_COLORS = ["#2f6fd8", "#d33b30", "#f26a1b", "#f5c518", "#2fb36b", "#8b5cf6"];

// ---------------------------------------------------------------- helpers

function box(p, x, y, angle, w, h, r = 0) {
  p.push();
  p.translate(x, y);
  p.rotate(angle);
  p.rect(-w / 2, -h / 2, w, h, r);
  p.pop();
}

function groundShadow(p, x, w, strength = 1) {
  if (strength <= 0) return;
  p.noStroke();
  p.fill(20, 24, 30, 20 * strength);
  p.ellipse(x, CONFIG.world.groundY + 1, w, 7);
}

// Seeded RNG so confetti is identical every take.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- scene

function drawBackdrop(p) {
  const { groundY } = CONFIG.world;
  p.background(COLORS.wall);
  p.noStroke();
  p.fill(COLORS.floor);
  p.rect(-2000, groundY, 5280, 2000);
  p.stroke(COLORS.floorEdge);
  p.strokeWeight(1.5);
  p.line(-2000, groundY, 3280, groundY);
}

function drawRamp(p) {
  const r = CONFIG.ramp;
  const g = rampGeometry(Sim.settings.ramp);
  const { groundY } = CONFIG.world;
  const rp = pose(Sim.ramp);

  // Support block under the top end, following the ramp's underside.
  const under = { x: g.top.x - g.normal.x * r.thickness, y: g.top.y - g.normal.y * r.thickness };
  const tan = Math.tan(g.theta);
  const x0 = under.x + 6, x1 = under.x + 22;
  p.noStroke();
  p.fill(COLORS.rampSupport);
  p.quad(x0, under.y + (x0 - under.x) * tan, x1, under.y + (x1 - under.x) * tan, x1, groundY, x0, groundY);
  // Foot
  p.rect(x0 - 6, groundY - 5, x1 - x0 + 12, 5, 1);

  p.fill(COLORS.ramp);
  box(p, rp.x, rp.y, rp.angle, r.length, r.thickness, 2);

  // The plank's lower corner sits below floor level at the pivot; hide it.
  p.noStroke();
  p.fill(COLORS.floor);
  p.rect(g.pivot.x - 40, groundY + 0.75, 60, r.thickness + 4);
  p.stroke(COLORS.floorEdge);
  p.strokeWeight(1.5);
  p.line(g.pivot.x - 40, groundY, g.pivot.x + 20, groundY);
}

function drawBall(p) {
  const b = CONFIG.ball;
  const bp = pose(Sim.ball);
  const lift = CONFIG.world.groundY - bp.y - b.radius;
  groundShadow(p, bp.x, b.radius * 2, Math.max(0, 1 - lift / 120));

  const ctx = p.drawingContext;
  const grad = ctx.createRadialGradient(
    bp.x - b.radius * 0.35, bp.y - b.radius * 0.4, b.radius * 0.1,
    bp.x, bp.y, b.radius
  );
  grad.addColorStop(0, "#f6f8fa");
  grad.addColorStop(0.35, "#bcc1c7");
  grad.addColorStop(1, "#6a7076");
  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(bp.x, bp.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDominoes(p) {
  const d = CONFIG.domino;
  p.stroke(COLORS.dominoEdge);
  p.strokeWeight(1);
  p.fill(COLORS.domino);
  for (const dom of Sim.dominoes) {
    const dp = pose(dom);
    box(p, dp.x, dp.y, dp.angle, d.width, d.height, 2);
  }
}

function brickSlots() {
  // Pyramid, filled bottom row first: 4, then 3, then 1.
  const w = 27, h = 14, gap = 2, left = 12;
  const slots = [];
  for (let i = 0; i < 4; i++) slots.push({ x: left + i * (w + gap), row: 0 });
  for (let i = 0; i < 3; i++) slots.push({ x: left + (w + gap) / 2 + i * (w + gap), row: 1 });
  slots.push({ x: left + (w + gap) * 1.5, row: 2 });
  return slots.map(s => ({ x: s.x, y: -(s.row + 1) * (h + gap) + gap, w, h }));
}

function drawWheel(p, x, y, r, angle) {
  p.noStroke();
  p.fill(COLORS.charcoal);
  p.circle(x, y, r * 2);
  p.fill(COLORS.hub);
  p.circle(x, y, r * 0.9);
  p.stroke(COLORS.charcoalMid);
  p.strokeWeight(1.5);
  for (let k = 0; k < 2; k++) {
    const a = angle + (k * Math.PI) / 2;
    p.line(x - Math.cos(a) * r * 0.42, y - Math.sin(a) * r * 0.42, x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42);
  }
  p.noStroke();
  p.fill(COLORS.charcoalMid);
  p.circle(x, y, 3);
}

function drawCart(p) {
  const c = CONFIG.cart;
  const cp = pose(Sim.cart);
  const left = cp.x - c.width / 2;
  const top = cp.y - c.height / 2;
  const bottom = cp.y + c.height / 2;
  const wr = 11;
  const roll = (cp.x - Sim.cart.getUserData().startX) / wr;

  groundShadow(p, cp.x, c.width * 1.02);

  // Axle and wheels
  const wx = [left + 24, left + c.width - 24];
  p.stroke(COLORS.charcoal);
  p.strokeWeight(4);
  p.line(wx[0], bottom - wr, wx[1], bottom - wr);
  for (const x of wx) drawWheel(p, x, bottom - wr, wr, roll);

  // Tub
  p.noStroke();
  p.fill(COLORS.cart);
  p.rect(left, top, c.width, 24, 2);
  p.fill(COLORS.cartDark);
  p.rect(left, top + 18, c.width, 6, 0, 0, 2, 2);
  p.fill(COLORS.cartRim);
  p.rect(left, top, c.width, 3, 2, 2, 0, 0);

  // Bricks: exactly Sim.settings.bricks of them — the same count that sets the mass.
  const slots = brickSlots();
  const n = Sim.cart.getUserData().bricks;
  for (let i = 0; i < n; i++) {
    const s = slots[i];
    p.stroke(COLORS.brickEdge);
    p.strokeWeight(1);
    p.fill(COLORS.brick);
    p.rect(left + s.x, top + s.y, s.w, s.h, 1.5);
    p.noStroke();
    p.fill(COLORS.brickTop);
    p.rect(left + s.x + 1, top + s.y + 1, s.w - 2, 2.5, 1);
  }
}

function cartFrontX() {
  return pose(Sim.cart).x + CONFIG.cart.width / 2;
}

// The lever hangs on the post's face; the cart's front pushes it back.
function leverGeometry() {
  const t = CONFIG.trigger;
  const gy = CONFIG.world.groundY;
  const pivot = { x: t.x - 1, y: gy - t.height + 6 };
  const len = 26;
  const restTipX = t.x - 11;
  const tipX = Math.min(Math.max(restTipX, cartFrontX()), t.x - 2);
  const dx = tipX - pivot.x;
  const dy = Math.sqrt(Math.max(0, len * len - dx * dx));
  const a = Math.atan2(dy, dx);
  const tip = { x: tipX, y: pivot.y + dy };
  const handle = { x: pivot.x - Math.cos(a) * 12, y: pivot.y - Math.sin(a) * 12 };
  return { pivot, tip, handle };
}

function latchPoint(lp) {
  return { x: lp.x - CONFIG.launcher.width / 2 + 4, y: lp.y - CONFIG.launcher.height / 2 + 2 };
}

function drawTrigger(p) {
  const t = CONFIG.trigger;
  const gy = CONFIG.world.groundY;
  p.noStroke();
  p.fill(COLORS.charcoalMid);
  p.rect(t.x, gy - t.height, t.width, t.height, 2, 2, 0, 0);
  p.fill(COLORS.charcoal);
  p.rect(t.x - 5, gy - 5, t.width + 10, 5, 1);

  const L = leverGeometry();
  p.stroke(COLORS.charcoal);
  p.strokeWeight(4);
  p.line(L.handle.x, L.handle.y, L.tip.x, L.tip.y);
  p.noStroke();
  p.fill(COLORS.hub);
  p.circle(L.pivot.x, L.pivot.y, 5);

  // Cord from lever handle to launcher latch. Fixed length: sags when the
  // ends come closer (e.g. when the launcher rolls back).
  const lp = pose(Sim.launcher.base);
  const end = latchPoint(lp);
  const rest = latchPoint({ x: CONFIG.launcher.x + CONFIG.launcher.width / 2, y: lp.y });
  const restLen = Math.hypot(rest.x - (t.x - 1), rest.y - (gy - t.height - 6)) * 1.03;
  const d = Math.hypot(end.x - L.handle.x, end.y - L.handle.y);
  const sag = d < restLen ? Math.sqrt(restLen * restLen - d * d) * 0.6 : 0;
  p.noFill();
  p.stroke(COLORS.cord);
  p.strokeWeight(1.4);
  p.bezier(
    L.handle.x, L.handle.y,
    L.handle.x + (end.x - L.handle.x) * 0.33, L.handle.y + sag,
    L.handle.x + (end.x - L.handle.x) * 0.66, end.y + sag,
    end.x, end.y
  );
}

function springExtension() {
  const L = Sim.launcher;
  if (!L.hasFired) return 0;
  return Math.min(1, (Sim.time - L.firedAt) / 60);
}

function drawLauncher(p) {
  const l = CONFIG.launcher;
  const lp = pose(Sim.launcher.base);
  const bottom = lp.y + l.height / 2;
  const left = lp.x - l.width / 2;
  const wr = 9;
  const roll = (lp.x - Sim.launcher.base.getUserData().startX) / wr;

  groundShadow(p, lp.x, l.width * 1.05);

  // Barrel (drawn first so the mount covers its breech)
  const piv = barrelPivotOffset();
  const P = { x: lp.x + piv.x, y: lp.y + piv.y };
  const a = -l.barrelAngle * DEG;
  p.push();
  p.translate(P.x, P.y);
  p.rotate(a);
  p.noStroke();
  p.fill(COLORS.charcoal);
  p.rect(-10, -9, l.barrelLength + 10, 18, 3);
  p.fill(COLORS.charcoalMid);
  p.rect(l.barrelLength - 6, -10.5, 8, 21, 2);  // muzzle ring
  // Slot showing the spring and piston inside
  p.fill(COLORS.charcoalLight);
  p.rect(2, -3.5, l.barrelLength - 12, 7, 2);
  const ext = springExtension();
  const pistonX = 16 + ext * (l.barrelLength - 34);
  p.stroke(COLORS.hub);
  p.strokeWeight(1.3);
  p.noFill();
  p.beginShape();
  const coils = 7;
  for (let i = 0; i <= coils * 2; i++) {
    const x = 3 + ((pistonX - 3) * i) / (coils * 2);
    p.vertex(x, i % 2 === 0 ? -3 : 3);
  }
  p.endShape();
  p.noStroke();
  p.fill(COLORS.hub);
  p.rect(pistonX, -3.5, 4, 7, 1);
  p.pop();

  // Chassis + wheels
  for (const x of [left + 14, left + l.width - 14]) drawWheel(p, x, bottom - wr, wr, roll);
  p.noStroke();
  p.fill(COLORS.charcoalMid);
  p.rect(left, lp.y - l.height / 2, l.width, 16, 3);
  p.fill(COLORS.charcoal);
  p.triangle(P.x - 16, lp.y - l.height / 2, P.x + 18, lp.y - l.height / 2, P.x, P.y);
  p.fill(COLORS.charcoalLight);
  p.circle(P.x, P.y, 16);
  p.fill(COLORS.hub);
  p.circle(P.x, P.y, 5);

  // Latch at the rear, where the cord attaches
  const latch = latchPoint(lp);
  p.fill(COLORS.charcoal);
  p.rect(latch.x - 3, latch.y - 6, 6, 8, 1);

  if (Sim.launcher.anchored) drawAnchor(p, lp, left, bottom, wr);
}

// Wheel chocks + a floor bracket bolted to the chassis.
function drawAnchor(p, lp, left, bottom, wr) {
  const l = CONFIG.launcher;
  p.noStroke();
  p.fill(COLORS.steelBracket);
  for (const x of [left + 14, left + l.width - 14]) {
    p.triangle(x - wr - 7, bottom, x - wr + 1, bottom, x - wr + 1, bottom - 8);
    p.triangle(x + wr + 7, bottom, x + wr - 1, bottom, x + wr - 1, bottom - 8);
  }
  // Rear L-bracket
  const bx = left - 10;
  p.fill(COLORS.steelBracket);
  p.rect(bx - 8, bottom - 4, 22, 4, 1);
  p.rect(bx + 6, lp.y - l.height / 2 + 2, 5, bottom - (lp.y - l.height / 2 + 2), 1);
  p.rect(bx + 6, lp.y - l.height / 2 + 2, 12, 5, 1);
  p.fill(COLORS.charcoal);
  p.circle(bx - 3, bottom - 2, 2.5);
  p.circle(bx + 14, lp.y - l.height / 2 + 4.5, 2.5);
}

function drawProjectile(p) {
  const r = CONFIG.projectile.radius;
  let pos;
  if (Sim.projectile) {
    pos = pose(Sim.projectile);
    const lift = CONFIG.world.groundY - pos.y - r;
    groundShadow(p, pos.x, r * 2, Math.max(0, 1 - lift / 150));
  } else {
    pos = barrelTip(pose(Sim.launcher.base)); // sitting in the muzzle
  }
  const ctx = p.drawingContext;
  const grad = ctx.createRadialGradient(pos.x - r * 0.35, pos.y - r * 0.4, r * 0.1, pos.x, pos.y, r);
  grad.addColorStop(0, "#ffb27a");
  grad.addColorStop(0.45, COLORS.orange);
  grad.addColorStop(1, "#c84f0c");
  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCup(p) {
  const g = cupGeometry();
  groundShadow(p, g.cx, g.bottomHalf * 2.4);
  p.stroke(COLORS.cupEdge);
  p.strokeWeight(1.5);
  p.fill(COLORS.cupFill);
  p.quad(g.cx - g.topHalf, g.top, g.cx + g.topHalf, g.top, g.cx + g.bottomHalf, g.bottom, g.cx - g.bottomHalf, g.bottom);
  // Rolled rim
  p.rect(g.cx - g.topHalf - 2, g.top - 3, g.topHalf * 2 + 4, 5, 2.5);
  // A faint band for form
  p.noStroke();
  p.fill(COLORS.cupShade);
  const y = g.top + 12;
  const half = g.topHalf - ((g.topHalf - g.bottomHalf) * 12) / CONFIG.cup.height;
  p.rect(g.cx - half + 2, y, half * 2 - 4, 2);
}

// ---------------------------------------------------------------- confetti

const Confetti = {
  parts: [],
  spawnedFor: null,

  reset() { this.parts = []; this.spawnedFor = null; },

  maybeSpawn() {
    if (Sim.successAt === null || this.spawnedFor === Sim.successAt) return;
    this.spawnedFor = Sim.successAt;
    const g = cupGeometry();
    const rand = mulberry32(7);
    for (let i = 0; i < 42; i++) {
      const a = -Math.PI / 2 + (rand() - 0.5) * 1.2;
      const s = 3 + rand() * 4.5;
      this.parts.push({
        x: g.cx + (rand() - 0.5) * 30, y: g.top - 4,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        rot: rand() * Math.PI, vr: (rand() - 0.5) * 0.4,
        w: 4 + rand() * 4, h: 7 + rand() * 5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        age: 0,
      });
    }
  },

  // dt in 60fps frames, already scaled by playback speed.
  update(dt) {
    for (const c of this.parts) {
      c.vy += 0.22 * dt;
      c.vx *= Math.pow(0.985, dt);
      c.vy *= Math.pow(0.985, dt);
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.vr * dt;
      c.age += dt;
      if (c.y > CONFIG.world.groundY - 2) { c.y = CONFIG.world.groundY - 2; c.vx *= 0.6; c.vy = 0; c.vr = 0; }
    }
  },

  draw(p) {
    p.noStroke();
    for (const c of this.parts) {
      const alpha = 255 * Math.max(0, Math.min(1, (260 - c.age) / 60));
      if (alpha <= 0) continue;
      const col = p.color(c.color);
      col.setAlpha(alpha);
      p.fill(col);
      p.push();
      p.translate(c.x, c.y);
      p.rotate(c.rot);
      p.rect(-c.w / 2, -c.h / 2, c.w, c.h * Math.abs(Math.cos(c.rot * 1.7)) + 1);
      p.pop();
    }
  },
};

// ---------------------------------------------------------------- debug

function drawDebugBodies(p) {
  p.noFill();
  p.strokeWeight(1);
  for (let b = Sim.world.getBodyList(); b; b = b.getNext()) {
    for (let f = b.getFixtureList(); f; f = f.getNext()) {
      const shape = f.getShape();
      p.stroke(f.isSensor() ? COLORS.debugSensor : COLORS.debug);
      if (shape.getType() === "circle") {
        const c = b.getWorldPoint(shape.getCenter());
        p.circle(px(c.x), px(c.y), px(shape.getRadius()) * 2);
        const e = b.getWorldPoint(planck.Vec2(shape.getCenter().x + shape.getRadius(), shape.getCenter().y));
        p.line(px(c.x), px(c.y), px(e.x), px(e.y));
      } else if (shape.getType() === "polygon") {
        p.beginShape();
        for (const v of shape.m_vertices) {
          const w = b.getWorldPoint(v);
          p.vertex(px(w.x), px(w.y));
        }
        p.endShape(p.CLOSE);
      }
    }
  }
}

function drawDebugHud(p, fps) {
  const sp = b => (b ? b.getLinearVelocity().length().toFixed(2) : "–");
  const lines = [
    `FPS            ${fps.toFixed(0)}`,
    `state          ${Sim.state}${Sim.stopped ? " (stopped)" : ""}`,
    `time           ${(Sim.time / 1000).toFixed(2)} s`,
    `ball speed     ${sp(Sim.ball)} m/s`,
    `cart speed     ${sp(Sim.cart)} m/s`,
    `cart mass      ${cartMass(Sim.settings.bricks).toFixed(2)}  (${Sim.settings.bricks} bricks)`,
    `cart moved     ${(pose(Sim.cart).x - Sim.cart.getUserData().startX).toFixed(0)} px`,
    `launcher speed ${Sim.launcher.anchored ? "anchored" : sp(Sim.launcher.base) + " m/s"}`,
    `launcher moved ${(pose(Sim.launcher.base).x - Sim.launcher.base.getUserData().startX).toFixed(0)} px`,
    `projectile     ${sp(Sim.projectile)} m/s`,
    `domino 1 max   ${Sim.metrics.firstDominoMaxAngle.toFixed(1)}°`,
    `events         ${Sim.events.filter(e => !/^domino\d/.test(e.name)).map(e => e.name).join(" › ")}`,
  ];
  p.push();
  p.resetMatrix();
  p.scale(UIState.drawScale);
  p.noStroke();
  p.fill(255, 255, 255, 215);
  p.rect(12, 12, 360, lines.length * 15 + 14, 6);
  p.fill(30);
  p.textFont("monospace");
  p.textSize(11);
  lines.forEach((t, i) => p.text(t, 22, 31 + i * 15));
  p.pop();
}
