# Can you make it work?

A Rube Goldberg machine that fails at three places. Students change the ramp, the cart load, or the launcher and run it again. It's a provocation, not an explainer, so there are no labels, force arrows, or law names on screen.

**steel ball → dominoes → loaded wagon → trigger → launcher → projectile → cup**

## Run it

Open `index.html` in a browser. It needs an internet connection the first time, because planck.js and p5.js load from CDNs. You can also serve the folder locally:

```bash
python3 -m http.server 8765
```

and visit http://localhost:8765.

## Controls

| Control | What it does |
|---|---|
| Ramp: Low / Medium / High | 7° / 14° / 22°. The ramp pivots at its bottom end, so steeper also means higher. |
| Cart load: − / + | 1–8 bricks. Each brick drawn is real mass in the physics. |
| Launcher: Free / Anchored | Anchored adds wheel chocks and a floor bracket. |
| Reset / Run | Run always starts from the set-up state, so it doubles as "run again". |
| Speed ¼× ½× 1× | Slow motion. The physics step size never changes, so every speed gives the same outcome. |

Keyboard shortcuts: **Space** run · **R** reset · **P** pause · **D** debug overlay · **T** teacher tuning panel · **C** film camera · **H** hide all UI · **F** fullscreen · **Esc** leave hidden-UI mode

## Behaviour (tested headless and in the browser)

| Settings | What happens |
|---|---|
| Low, 8 bricks, Free (the default) | The ball hits the first domino, which wobbles (about 4°) and stays up. |
| Medium/High, 8 bricks | All 8 dominoes fall. The wagon moves about 0.33 m and stops short of the trigger. |
| … 5 or 4 bricks | The wagon gets further (about 0.47 / 0.55 m) but still stops short. |
| … 3 bricks or fewer | The wagon reaches the trigger post and the launcher fires. |
| … Free launcher | The launcher rolls back about 0.26 m. The ball falls short and hits the outside of the cup. |
| … Anchored launcher | The launcher stays put. The ball lands in the cup and confetti fires. |

The low ramp topples nothing up to about 8.5°, and the whole chain falls from 9° up. The same settings give the identical run every time: the browser and headless runs match event for event.

## Units (SI)

Every value in `js/config.js` is in SI: metres, kilograms, seconds, joules, m/s². Positions are measured from the left edge of the stage. The debug overlay (**D**) and the teacher panel (**T**) also read in SI.

Real-world scale:

| Thing | Size |
|---|---|
| Stage | 6.4 m × 3.6 m (1 px = 5 mm) |
| Dominoes | 0.30 m × 0.07 m, 1 kg, 0.22 m apart |
| Steel ball | radius 0.07 m, 0.6 kg |
| Ramp | 1.18 m long |
| Wagon | 0.65 m long, 0.4 kg empty, plus 1.6 kg per brick |
| Launcher | 1.6 kg; the spring releases 3.924 J |
| Projectile | radius 0.06 m, 1 kg |
| Cup | 0.32 m tall |
| Gravity | 9.81 m/s² |

The physics engine still runs in its own internal units. `deriveEngineConfig()` converts the SI values using three base scale factors in `UNITS`:

| Base unit | Factor |
|---|---|
| Length | `metresPerPixel = 0.005` |
| Mass | `kilogramsPerMassUnit = 1` |
| Time | `secondsPerEngineSecond = √(10 / 9.81) ≈ 1.0096` |

Derived quantities follow from these: speed L/T, acceleration L/T², energy ML²/T², rates 1/T, momentum ML/T.

The time factor isn't a free choice. The machine was tuned with engine gravity 20, and reading that as 9.81 m/s² with 5 mm pixels requires T ≈ 1.0096. In practice, **1× playback is about 1% slower than real time**, which is well below what a stopwatch can detect.

The engine values produced by the conversion are the original tuned ones. The full 17-case test matrix gives identical results to the pre-SI version.

Two things to know when editing:

- **Edit the SI values in `CONFIG`, not the factors.** Changing a factor reinterprets the scale of the whole stage, so every SI value would need rescaling with it to keep the machine behaving as tuned.
- **Changing gravity alone is a real physics change.** For example, 1.62 m/s² (the Moon) gives a genuinely different, slower machine.

## Recording the provocation video

1. Use a URL preset so each take is set up the same way, for example:
   - `index.html?ramp=low&bricks=8&launcher=free&clean=1&autorun=1` (failure 1)
   - `index.html?ramp=high&bricks=8&launcher=free&clean=1&autorun=1` (failure 2)
   - `index.html?ramp=high&bricks=3&launcher=free&clean=1&autorun=1` (failure 3)
   - `index.html?ramp=high&bricks=3&launcher=anchored&camera=1&speed=0.5&clean=1&autorun=1` (success)

   Parameters: `ramp` (low|medium|high), `bricks` (1–8), `launcher` (free|anchored), `speed` (0.25|0.5|1), `camera=1`, `clean=1`, `debug=1`, `autorun=1`, `delay` (ms before autorun, default 1500).
2. Press **F** for fullscreen. `clean=1` (or **H**) hides the UI, and the canvas fills the screen at 16:9.
3. Screen-record. At 1× a successful run takes about 5 s; at ½× it takes about 10 s, which is close to the storyboard's 10–15 s.

**Film camera (C)** is off by default. The classroom view is one fixed wide shot, as the spec requires, so students can judge relative motion. When it's on, the camera follows the storyboard beats (ramp → domino wave → cart and launcher → flight → cup close-up). Each shot change is triggered by a physics event, not a timer, and it only affects rendering.

## Files

```
index.html, style.css
js/config.js      every tuning value in SI (CONFIG), unit factors (UNITS), SI → engine conversion
js/objects.js     body factories: ramp, ball, dominoes, cart, trigger, launcher, projectile, cup
js/simulation.js  world, contact events, run/reset, states, launcher firing, stop detection
js/render.js      p5 drawing; reads physics state only (plus confetti and the debug overlay)
js/camera.js      optional film camera
js/ui.js          controls, teacher panel, keys, URL presets
js/main.js        p5 setup and the fixed-step loop
```

The simulation files (`config`, `objects`, `simulation`) have no rendering dependencies, so they can be stepped headless in Node for tuning.

## Where this departs from the spec, and why

- **planck.js (Box2D) instead of Matter.js.** I built and tuned with Matter.js first, but its contact solver can't run a domino chain reliably. Leaning dominoes jammed, slid apart, or fell backwards, and it got worse with smaller steps or hinge constraints. planck.js gives a clean, repeatable chain, and the structure the spec asks for is unchanged: the engine owns all motion, bodies are labelled, and the launcher and cup are driven by sensor events.
- **Real rotational inertia.** Balls and dominoes get the true inertia for their shape. The cart and launcher don't rotate.
- **Wagon and launcher wheels use rolling resistance.** A constant drag proportional to weight acts on them instead of sliding friction. That makes the extra load matter: heavier means less speed and more drag.
- **Trigger is a separate floor post with a lever and cord**, not a lever on the launcher. On the launcher, the arriving wagon's forward momentum almost exactly cancelled the recoil, so the launcher barely moved. Now the wagon stops against the post, and the launcher has clear floor behind it to roll back on.
- **Launcher is energy-based.** The spring releases a fixed energy E, and the projectile and launcher get equal and opposite momentum p, with E = p²/2mₚ + p²/2m_L. Anchored to the floor (effectively infinite mass), the projectile gets all of E. Free, it gets less, so it falls short. The miss comes from the physics, not a scripted value.
- **Tuned numbers:** ramp 7°/14°/22°; 8 dominoes at 44 px spacing (36–40 px left a "jam" band where a domino leaned without toppling the next); smooth domino faces (friction 0.3); gravity 9.81 m/s² at a 1 px = 5 mm stage scale (see Units). All of these live in `js/config.js` and can be changed live in teacher mode (**T**). **Copy values** exports the current set as JSON.
