// Student controls, teacher panel, keyboard shortcuts, URL presets.
//
// Keys:  Space run · R reset · P pause · D debug · T teacher panel
//        C film camera · H hide UI (recording) · F fullscreen
//
// URL presets for repeatable recordings, e.g.
//   index.html?ramp=high&bricks=3&launcher=anchored&speed=0.5&camera=1&clean=1&autorun=1

const RAMP_SETTINGS = ["low", "medium", "high"];
const SPEEDS = [0.25, 0.5, 1];

// Teacher-mode tuning controls: [label, CONFIG path, min, max, step]
const TUNING = [
  ["Ramp angle — low (°)", "ramp.angles.low", 2, 30, 0.5],
  ["Ramp angle — medium (°)", "ramp.angles.medium", 2, 30, 0.5],
  ["Ramp angle — high (°)", "ramp.angles.high", 2, 30, 0.5],
  ["Ball mass", "ball.mass", 0.1, 3, 0.05],
  ["Domino mass", "domino.mass", 0.1, 3, 0.05],
  ["Cart mass (empty)", "cart.baseMass", 0.1, 5, 0.1],
  ["Mass per brick", "cart.brickMass", 0.1, 4, 0.05],
  ["Cart rolling resistance", "cart.rollingResistance", 0, 0.1, 0.001],
  ["Launcher mass", "launcher.mass", 0.2, 10, 0.1],
  ["Launcher rolling resistance", "launcher.rollingResistance", 0, 0.5, 0.005],
  ["Spring energy", "launcher.springEnergy", 2, 40, 0.5],
  ["Barrel angle (°)", "launcher.barrelAngle", 20, 80, 1],
  ["Gravity", "gravity", 2, 40, 0.5],
];

const $ = sel => document.querySelector(sel);

function getPath(obj, path) {
  return path.split(".").reduce((o, k) => o[k], obj);
}

function setPath(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  keys.reduce((o, k) => o[k], obj)[last] = value;
}

let p5ref = null;
let messageShownFor = null;

function initUI(p) {
  p5ref = p;
  applyUrlParams();

  $("#ramp").addEventListener("click", e => {
    const v = e.target.dataset.value;
    if (v) changeSetting("ramp", v);
  });
  $("#brickMinus").addEventListener("click", () => changeSetting("bricks", Math.max(1, Sim.settings.bricks - 1)));
  $("#brickPlus").addEventListener("click", () => changeSetting("bricks", Math.min(CONFIG.cart.maxBricks, Sim.settings.bricks + 1)));
  $("#launcher").addEventListener("click", e => {
    const v = e.target.dataset.value;
    if (v) changeSetting("anchored", v === "anchored");
  });
  $("#speed").addEventListener("click", e => {
    const v = e.target.dataset.value;
    if (v) { UIState.speed = Number(v); syncControls(); }
  });
  $("#run").addEventListener("click", run);
  $("#reset").addEventListener("click", reset);

  document.addEventListener("keydown", onKey);
  buildTeacherPanel();
  syncControls();
}

function changeSetting(key, value) {
  simSetSetting(key, value);
  onWorldReset();
  syncControls();
}

function reset() {
  simReset();
  onWorldReset();
  UIState.paused = false;
  syncControls();
}

// RUN always starts from the set-up state, so a second press replays.
function run() {
  if (Sim.state !== STATES.READY) reset();
  simRun();
  syncControls();
}

function onKey(e) {
  if (e.target.matches("input, textarea")) return;
  const k = e.key.toLowerCase();
  if (k === " ") { e.preventDefault(); run(); }
  else if (k === "r") reset();
  else if (k === "p") { UIState.paused = !UIState.paused; syncControls(); }
  else if (k === "d") UIState.debug = !UIState.debug;
  else if (k === "t") toggleTeacher();
  else if (k === "c") { UIState.camera = !UIState.camera; FilmCamera.reset(); syncControls(); }
  else if (k === "h") setClean(!UIState.clean);
  else if (k === "f") toggleFullscreen();
  else if (k === "escape" && UIState.clean) setClean(false);
}

function setClean(on) {
  UIState.clean = on;
  document.body.classList.toggle("clean", on);
  fitCanvas(p5ref);
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
  setTimeout(() => fitCanvas(p5ref), 150);
}

function toggleTeacher() {
  UIState.teacher = !UIState.teacher;
  $("#teacher").hidden = !UIState.teacher;
  fitCanvas(p5ref);
}

function syncControls() {
  const s = Sim.settings;
  for (const b of document.querySelectorAll("#ramp button")) b.setAttribute("aria-pressed", b.dataset.value === s.ramp);
  for (const b of document.querySelectorAll("#launcher button"))
    b.setAttribute("aria-pressed", (b.dataset.value === "anchored") === s.anchored);
  for (const b of document.querySelectorAll("#speed button")) b.setAttribute("aria-pressed", Number(b.dataset.value) === UIState.speed);
  $("#brickCount").textContent = `${s.bricks} brick${s.bricks === 1 ? "" : "s"}`;
  $("#brickMinus").disabled = s.bricks <= 1;
  $("#brickPlus").disabled = s.bricks >= CONFIG.cart.maxBricks;
  $("#run").textContent = Sim.state === STATES.READY ? "Run" : "Run again";
  $("#pauseNote").hidden = !UIState.paused;
  $("#cameraNote").hidden = !UIState.camera;
}

// Called every frame from draw(): only touches the DOM when something changes.
function updateUIFrame() {
  const key = Sim.stopped ? Sim.state + Sim.time : null;
  if (key === messageShownFor) return;
  messageShownFor = key;
  const msg = $("#message");
  const failed = Sim.stopped && Sim.state !== STATES.SUCCESS;
  msg.textContent = failed ? "Try changing something and run it again." : "";
  msg.classList.toggle("show", failed);
  syncControls();
}

// ---------------------------------------------------------------- teacher

function buildTeacherPanel() {
  const list = $("#tuning");
  list.innerHTML = "";
  for (const [label, path, min, max, step] of TUNING) {
    const row = document.createElement("label");
    row.className = "tune";
    row.innerHTML = `<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}"><output></output>`;
    const input = row.querySelector("input");
    const out = row.querySelector("output");
    const show = () => {
      const v = getPath(CONFIG, path);
      input.value = v;
      out.textContent = Number(v).toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0);
    };
    input.addEventListener("input", () => {
      setPath(CONFIG, path, Number(input.value));
      show();
      reset();
    });
    row.refresh = show;
    show();
    list.appendChild(row);
  }

  $("#presets").addEventListener("click", e => {
    const v = e.target.dataset.preset;
    if (!v) return;
    const [ramp, bricks, anchored] = v.split(",");
    Object.assign(Sim.settings, { ramp, bricks: Number(bricks), anchored: anchored === "1" });
    reset();
  });

  $("#restoreDefaults").addEventListener("click", () => {
    const fresh = JSON.parse(JSON.stringify(CONFIG_DEFAULTS));
    for (const k of Object.keys(fresh)) CONFIG[k] = fresh[k];
    for (const row of document.querySelectorAll(".tune")) row.refresh();
    reset();
  });

  $("#copyValues").addEventListener("click", async () => {
    const json = JSON.stringify(CONFIG, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      $("#copyValues").textContent = "Copied";
    } catch {
      console.log(json);
      $("#copyValues").textContent = "Logged to console";
    }
    setTimeout(() => ($("#copyValues").textContent = "Copy values"), 1500);
  });
}

// ---------------------------------------------------------------- URL presets

function applyUrlParams() {
  const q = new URLSearchParams(location.search);
  if (RAMP_SETTINGS.includes(q.get("ramp"))) Sim.settings.ramp = q.get("ramp");
  const b = Number(q.get("bricks"));
  if (b >= 1 && b <= CONFIG.cart.maxBricks) Sim.settings.bricks = b;
  if (q.get("launcher")) Sim.settings.anchored = q.get("launcher") === "anchored";
  const sp = Number(q.get("speed"));
  if (SPEEDS.includes(sp)) UIState.speed = sp;
  if (q.get("camera") === "1") UIState.camera = true;
  if (q.get("debug") === "1") UIState.debug = true;
  simReset();
  onWorldReset();
  if (q.get("clean") === "1") setTimeout(() => setClean(true), 0);
  if (q.get("autorun") === "1") setTimeout(run, Number(q.get("delay") || 1500));
}
