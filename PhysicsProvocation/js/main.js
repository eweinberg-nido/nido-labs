// p5 setup and draw loop. Physics advances in fixed steps; playback speed
// changes how many steps run per frame, never the step size, so a run looks
// the same at 0.25× as at 1×.

const UIState = {
  speed: 1,
  paused: false,
  debug: false,
  teacher: false,
  clean: false,     // hide all UI for screen recording (H)
  camera: false,    // film camera (C)
  drawScale: 1,
};

let stepAccumulator = 0;

function onWorldReset() {
  stepAccumulator = 0;
  Confetti.reset();
  FilmCamera.reset();
}

new p5(p => {
  p.setup = () => {
    const canvas = p.createCanvas(CONFIG.world.width, CONFIG.world.height);
    canvas.parent("stage");
    p.frameRate(60);
    p.pixelDensity(Math.max(2, window.devicePixelRatio || 1));
    simReset();
    onWorldReset();
    initUI(p);
    fitCanvas(p);
  };

  p.draw = () => {
    const running = Sim.state !== STATES.READY && !Sim.stopped;
    if (running && !UIState.paused) {
      stepAccumulator += (UIState.speed * CONFIG.stepHz) / 60;
      while (stepAccumulator >= 1) {
        simStep();
        stepAccumulator -= 1;
      }
    }

    const frameDt = UIState.paused ? 0 : (1000 / 60) * UIState.speed;
    Confetti.maybeSpawn();
    Confetti.update(frameDt / (1000 / 60));
    if (UIState.camera) FilmCamera.update(frameDt);

    p.push();
    p.scale(UIState.drawScale);
    if (UIState.camera) FilmCamera.apply(p);
    drawBackdrop(p);
    drawRamp(p);
    drawDominoes(p);
    drawTrigger(p);
    drawCart(p);
    drawLauncher(p);
    drawProjectile(p);
    drawCup(p);
    drawBall(p);
    Confetti.draw(p);
    if (UIState.debug) drawDebugBodies(p);
    p.pop();

    if (UIState.debug) drawDebugHud(p, p.frameRate());
    updateUIFrame();
  };

  p.windowResized = () => fitCanvas(p);
}, document.getElementById("stage"));

// Scale the 1280×720 stage to the space available, keeping 16:9.
function fitCanvas(p) {
  const stage = document.getElementById("stage");
  const { width, height } = CONFIG.world;
  let w;
  if (UIState.clean) {
    w = Math.min(window.innerWidth, (window.innerHeight * width) / height);
  } else {
    const controls = document.getElementById("controls");
    const reserved = (controls ? controls.offsetHeight : 0) + 110;
    const availH = Math.max(240, window.innerHeight - reserved);
    w = Math.min(stage.clientWidth || window.innerWidth, (availH * width) / height);
  }
  w = Math.floor(w);
  UIState.drawScale = w / width;
  p.resizeCanvas(w, Math.round((w * height) / width));
}
