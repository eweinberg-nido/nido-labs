// Optional "film camera" for recording the provocation video (toggle: C).
// Off by default — the classroom view is one fixed, wide shot so students can
// judge relative motion. When on, it frames whichever part of the machine is
// active, chosen from simulation events (not timers), and eases between shots.
// Render-only: it never touches physics.

const FilmCamera = {
  x: 640, y: 360, zoom: 1,

  reset() {
    this.x = 640; this.y = 360; this.zoom = 1;
  },

  wide() {
    return { x: 640, y: 360, zoom: 1 };
  },

  frame(x0, x1, y0, y1, maxZoom = 2.2) {
    const { width, height } = CONFIG.world;
    const zoom = Math.max(1, Math.min(maxZoom, width / (x1 - x0), height / (y1 - y0)));
    const hw = width / 2 / zoom, hh = height / 2 / zoom;
    const margin = 120; // the backdrop extends a little past the stage edges
    return {
      x: Math.min(width + margin - hw, Math.max(hw - margin, (x0 + x1) / 2)),
      y: Math.min(height - hh, Math.max(hh, (y0 + y1) / 2)),
      zoom,
    };
  },

  target() {
    const gy = CONFIG.world.groundY;
    if (Sim.state === STATES.READY) return this.wide();

    if (simHas("success")) {
      const c = CONFIG.cup.x;
      return this.frame(c - 170, c + 120, gy - 190, gy + 40);
    }
    if (Sim.stopped) return this.wide();

    if (simHas("fire")) {
      const l = pose(Sim.launcher.base);
      const top = Sim.projectile ? Math.min(pose(Sim.projectile).y - 60, gy - 230) : gy - 230;
      return this.frame(Math.min(l.x - 110, CONFIG.trigger.x - 20), CONFIG.cup.x + 60, top, gy + 40);
    }
    if (simHas("cartHit")) {
      const c = pose(Sim.cart);
      return this.frame(c.x - CONFIG.cart.width / 2 - 70, CONFIG.launcher.x + CONFIG.launcher.width + 40, gy - 190, gy + 40);
    }
    if (simHas("ballHitDomino")) {
      let lead = 0;
      Sim.dominoes.forEach((d, i) => { if (Math.abs(d.getAngle()) > 8 * DEG) lead = i; });
      const x = pose(Sim.dominoes[lead]).x;
      return this.frame(x - 230, x + 190, gy - 170, gy + 40);
    }
    const g = rampGeometry(Sim.settings.ramp);
    return this.frame(g.top.x - 30, CONFIG.domino.firstX + 80, Math.min(g.top.y - 60, gy - 200), gy + 40);
  },

  // dtMs: frame time scaled by playback speed, so slow motion slows the camera too.
  update(dtMs) {
    const t = this.target();
    const k = 1 - Math.exp(-dtMs / 420);
    this.x += (t.x - this.x) * k;
    this.y += (t.y - this.y) * k;
    this.zoom += (t.zoom - this.zoom) * k;
  },

  apply(p) {
    const { width, height } = CONFIG.world;
    p.translate(width / 2, height / 2);
    p.scale(this.zoom);
    p.translate(-this.x, -this.y);
  },
};
