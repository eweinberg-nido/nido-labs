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
| Medium/High, 8 bricks | All 8 dominoes fall. The wagon moves about 67 px and stops short of the trigger. |
| … 5 or 4 bricks | The wagon gets further (about 94 / 110 px) but still stops short. |
| … 3 bricks or fewer | The wagon reaches the trigger post and the launcher fires. |
| … Free launcher | The launcher rolls back about 52 px. The ball falls short and hits the outside of the cup. |
| … Anchored launcher | The launcher stays put. The ball lands in the cup and confetti fires. |

The low ramp topples nothing up to about 8.5°, and the whole chain falls from 9° up. The same settings give the identical run every time: the browser and headless runs match event for event.

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
js/config.js      every tuning value (CONFIG)
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
- **Tuned numbers:** ramp 7°/14°/22°; 8 dominoes at 44 px spacing (36–40 px left a "jam" band where a domino leaned without toppling the next); smooth domino faces (friction 0.3); gravity 20 so the tabletop scale reads right. All of these live in `js/config.js` and can be changed live in teacher mode (**T**). **Copy values** exports the current set as JSON.
