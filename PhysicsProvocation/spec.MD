# Design Spec: Interactive Forces & Motion Rube Goldberg Simulator

## 1. Purpose

Build a single-page browser simulation for a Grade 8 Forces & Motion provocation.

The simulation shows a simple Rube Goldberg machine that initially fails at several points. Students or teachers can change a small number of variables and rerun the system to investigate why the machine succeeds or fails.

The application is not an explainer. It should not label Newton’s Laws or tell students what is happening. The point is to create observable situations students can reason about.

The sequence is:

**steel ball → dominoes → weighted cart → launcher → projectile → cup**

The three main failure points are:

1. The ball does not have enough motion to knock over the first domino.
2. The dominoes hit a heavily loaded cart, but the cart barely moves.
3. The launcher fires the projectile forward while the launcher itself rolls backward.

Students should be able to change the system so each problem is resolved.

---

# 2. Technical approach

Use:

- **Matter.js** for physics
- **p5.js** for rendering and interaction
- Plain HTML/CSS/JavaScript
- No framework
- No build step
- No backend
- No external data storage

Deliverable should run by opening:

```text
index.html
```

Ideally dependencies are loaded by CDN initially.

Possible structure:

```text
/index.html
/style.css
/js/
  main.js
  simulation.js
  objects.js
  ui.js
```

A later version can bundle Matter.js and p5.js locally if needed.

---

# 3. Design principle

The physics engine owns all motion.

Do not animate positions manually except where required for UI or resetting.

Objects should interact through:

- gravity
- collisions
- friction
- mass
- constraints
- applied forces/impulses

Avoid hard-coded sequences such as:

```js
if (time > 3) moveCart();
```

Instead:

```js
ball collides with domino
→ dominoes actually fall
→ last domino actually contacts cart
→ cart actually rolls
```

The launcher trigger can be event-driven, but the resulting projectile and recoil should use physics forces.

---

# 4. Visual design

Use the visual language from the earlier assets:

- light gray/white background
- orthogonal side view
- black/dark-gray ramp
- polished gray steel ball
- blue dominoes
- red wagon
- gray bricks
- charcoal launcher
- orange projectile
- white target cup

Keep forms simple and diagrammatic.

The scene should resemble a physical tabletop setup rather than a game.

Avoid:

- gradients unless subtle
- textures
- excessive shadows
- decorative UI
- labels attached to objects
- arrows showing forces by default
- equations
- Newton’s Law names

Suggested canvas:

```text
16:9
1280 × 720 logical size
```

Scale responsively to browser width.

---

# 5. Scene layout

Use one continuous horizontal world.

Conceptual layout:

```text
      STEEL BALL
          O
         /
        /
_______/____   | | | | | |     [BRICKS]              orange ball
               dominoes         =========             o
                                  O   O       launcher /        [cup]
_______________________________________________________________
```

Approximate horizontal zones:

| Zone | X range |
|---|---:|
| Ramp | 50–280 |
| Dominoes | 320–550 |
| Cart | 600–790 |
| Launcher | 850–1050 |
| Projectile path | 1000–1180 |
| Cup | 1180–1250 |

These are starting points only. Tune according to simulation behavior.

---

# 6. Simulation states

The machine should support a full reset.

Recommended states:

```js
READY
RUNNING
FAILED_DOMINO
FAILED_CART
FAILED_LAUNCHER
SUCCESS
```

Do not immediately display these states to students as explanations.

They are mainly for internal control and optional teacher diagnostics.

---

# 7. Controls

Keep student controls very limited.

## Primary controls

### Ramp

Control:

```text
Ramp angle
[ Low ] [ Medium ] [ High ]
```

or a three-position slider.

Suggested values:

```js
low:    8°
medium: 14°
high:   22°
```

Exact numbers should be tuned experimentally.

Default:

```text
Low
```

At the default angle, the ball should reach the first domino but fail to knock it over consistently.

At the high setting, it should topple the first domino reliably.

---

### Cart mass

Use a visible brick count.

Control:

```text
Cart load

[ 8 bricks ]
[-]         [+]
```

Possible values:

```text
1–8 bricks
```

Default:

```text
8 bricks
```

The bricks should visibly disappear from the wagon as mass is reduced.

Changing the brick count must also change the physics mass.

Do not simply alter acceleration independently.

---

### Launcher restraint

Control:

```text
Launcher

○ Free
○ Anchored
```

Default:

```text
Free
```

When free:

- projectile moves right
- launcher recoils left

When anchored:

- projectile follows approximately the same trajectory
- launcher remains effectively stationary

Show a visible brace/chock/anchor when anchored.

---

# 8. Main interaction buttons

Always visible:

```text
[ RESET ]     [ RUN ]
```

Optional:

```text
[ 0.25× ] [ 0.5× ] [ 1× ]
```

Slow motion would be useful for classroom discussion.

Default:

```text
1×
```

Possible Matter.js implementation:

adjust engine time scale rather than manually altering velocities.

---

# 9. Initial machine configuration

On initial load:

```text
Ramp: LOW
Cart: 8 bricks
Launcher: FREE
```

This intentionally creates a failure at the first stage.

The students therefore see:

```text
RUN

ball rolls
ball hits first domino
domino wobbles
domino remains upright
machine stops
```

No explanation appears automatically.

The student must decide what to change.

---

# 10. Ramp and ball

## Ramp

Static Matter.js body.

Suggested properties:

```js
isStatic: true
friction: 0.3
```

Ramp should pivot around or be repositioned around a fixed bottom point when angle changes.

Do not let the user continuously drag the ramp in MVP.

---

## Ball

Dynamic circle.

Suggested starting properties:

```js
radius: 14
density: moderate
friction: 0.02
frictionAir: 0.001
restitution: 0.1
```

Ball starts near top of ramp.

On reset:

- velocity = 0
- angular velocity = 0
- position reset
- sleeping disabled if necessary

The ball should roll rather than visibly slide.

Tune friction accordingly.

---

# 11. Dominoes

Use 8–10 identical dynamic rectangles.

Suggested dimensions:

```text
14 px wide
60 px tall
```

Spacing should be slightly less than domino height so each falling domino reaches the next.

Example:

```text
40–45 px center-to-center
```

Properties:

```js
density: moderate
friction: 0.5
restitution: very low
```

Dominoes must behave through collision, not scripted rotation.

The first domino is deliberately resistant enough that the low-angle ball does not knock it over.

Possible tuning variables:

- first domino mass
- ball mass
- ramp angle
- ball starting height
- coefficient of friction

Prefer changing ramp height/angle over giving the first domino artificial resistance.

---

# 12. Cart

The cart should be a Matter.js composite.

Components:

```text
cart chassis
left wheel
right wheel
brick bodies
```

For MVP, the easiest reliable approach is probably:

- rectangular chassis
- two circular wheels
- rigid constraints between wheels and chassis

Alternatively, use a single invisible collision body for the cart and render the wheels decoratively.

That may be more stable and is acceptable for this simulation.

## Recommended MVP approach

Physics body:

```text
one rectangular cart body
```

Visual rendering:

```text
chassis + wheels + bricks
```

This avoids wheel-constraint instability.

The cart should slide/roll horizontally with low friction.

---

# 13. Brick mass

Each visible brick represents added mass.

The visual brick count must correspond to actual total mass.

Example model:

```js
baseCartMass = 2
brickMass = 1.25

totalMass = baseCartMass + brickCount * brickMass
```

Matter.js may require using:

```js
Body.setMass(cartBody, totalMass);
```

Tune values rather than treating the numbers as SI units.

Default 8-brick state:

last domino hits cart and produces only a small displacement.

Target:

```text
approximately 20–50 px
```

Reduced state around 2–3 bricks:

cart should travel far enough to hit the launcher trigger.

---

# 14. Cart failure

With high mass:

```text
domino chain completes
last domino strikes wagon
wagon moves slightly
wagon stops before launcher
```

This should be visually obvious.

Do not artificially stop the cart after a fixed distance.

Its failure should emerge from:

- high mass
- collision impulse
- rolling/ground friction

Tune these values until the result is stable.

---

# 15. Launcher

The launcher can be simplified.

Do not attempt to physically model a real spring, latch, barrel, and trigger mechanism in MVP.

The important observable interaction is:

```text
cart contacts trigger
projectile accelerates right/up
launcher receives opposite impulse
```

Visually draw:

- wheeled base
- angled barrel or launching arm
- small spring graphic
- trigger lever
- orange projectile

---

# 16. Launcher trigger

Create a small sensor body at the launcher entrance.

Example:

```js
Bodies.rectangle(x, y, width, height, {
  isStatic: true,
  isSensor: true
});
```

When the cart overlaps the sensor:

```js
fireLauncher();
```

Only allow firing once per run.

```js
if (!launcher.hasFired) {
    fireLauncher();
    launcher.hasFired = true;
}
```

---

# 17. Launcher firing physics

On trigger, apply an impulse or force to the projectile.

For example:

```js
Body.setVelocity(projectile, {
  x: projectileVX,
  y: projectileVY
});
```

However, for the Newton’s third-law phenomenon, it is preferable to use equivalent momentum changes.

Conceptually:

```js
projectileImpulse = { x: +Jx, y: -Jy }
launcherImpulse   = { x: -Jx, y: +Jy }
```

Matter.js force application can approximate this.

If using direct velocity changes, calculate launcher recoil based on mass:

```text
mProjectile × ΔvProjectile
≈
-mLauncher × ΔvLauncher
```

The visual effect matters more than exact numerical units, but the relationship should be physically defensible.

---

# 18. Free launcher

Default state.

The launcher base is dynamic.

When fired:

```text
orange projectile → right/up
launcher → left
```

The recoil should be obvious but not cartoonish.

Target displacement:

```text
50–100 px backward
```

This is the third failure.

The projectile may therefore miss the cup.

That is acceptable and probably preferable.

---

# 19. Anchored launcher

When:

```js
launcherAnchored = true
```

either:

```js
Body.setStatic(launcherBody, true);
```

or create a strong ground constraint.

For the MVP, making it static is fine.

Visually add:

- floor brace
- wheel chocks
- anchor block

The orange projectile should still fire using approximately the same launch conditions.

The launcher does not translate.

---

# 20. Projectile

Dynamic circle.

Properties:

```js
radius: 12–15
restitution: 0.2
frictionAir: low
```

Projectile initially sits in or near launcher.

Before firing:

```js
isStatic: true
```

or keep it outside the physics world until firing.

On fire:

```js
Body.setStatic(projectile, false)
```

then apply launch velocity/impulse.

---

# 21. Cup

For the first version, the cup can be represented by three static collision bodies:

```text
left wall
right wall
bottom
```

Render them visually as one white cup.

Example:

```text
\_____/
```

The opening must be wide enough for the projectile.

Do not worry about a realistic tapered collision shape initially.

---

# 22. Success condition

Detect whether the projectile enters the cup.

Simplest approach:

create an invisible sensor inside the cup.

```js
cupSensor.isSensor = true;
```

When projectile collides with it:

```js
state = SUCCESS;
```

Then optionally:

- freeze after 1–2 seconds
- display subtle confetti
- or simply leave the projectile in the cup

I would make confetti optional.

---

# 23. Failure detection

The application does not need sophisticated failure-state logic initially.

A simple inactivity detector is enough.

Example:

If:

```text
all relevant bodies have speed < threshold
```

for:

```text
1.5 seconds
```

and success has not occurred:

```js
simulationStopped = true;
```

Then allow another adjustment.

Do not display:

```text
FAILURE: F = ma
```

A simple:

```text
Try changing something and run it again.
```

is enough if any message is used at all.

---

# 24. Student-facing UI

Recommended layout:

```text
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│                   PHYSICS SIMULATION                          │
│                                                               │
│      [ actual simulation canvas ]                             │
│                                                               │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ Ramp          Cart load         Launcher                      │
│ LOW ▪ ○ ○     − 8 bricks +      ● Free   ○ Anchored          │
│                                                               │
│                     RESET    RUN                              │
└───────────────────────────────────────────────────────────────┘
```

Do not title it:

```text
Newton's Laws Simulator
```

Prefer something neutral such as:

```text
Can you make it work?
```

or no title at all.

---

# 25. Optional teacher mode

Add a small gear icon or keyboard shortcut:

```text
T
```

Teacher mode can expose numeric tuning controls.

Example:

```text
Ramp angle          8°
Ball mass           1.2
Domino mass         1.0
Cart mass           12
Ground friction     0.08
Launch impulse      0.042
Launcher mass       5
Gravity              1.0
```

These controls are useful for tuning locally but should not be visible to students.

Teacher mode could also toggle:

```text
☐ show velocity vectors
☐ show collision points
☐ show center of mass
☐ show object speeds
☐ pause after each interaction
```

These are later features, not MVP requirements.

---

# 26. Debug overlay

Build this early.

Keyboard shortcut:

```text
D
```

Show:

```text
FPS
ball speed
cart speed
projectile speed
cart mass
launcher speed
simulation state
```

Also optionally draw Matter.js collision bodies.

This will make tuning much faster.

---

# 27. Reset behavior

Reset must rebuild the world completely.

Do not attempt to manually reposition every body after each run unless necessary.

Recommended:

```js
function resetSimulation() {
    World.clear(world);
    Engine.clear(engine);

    createGround();
    createRamp();
    createBall();
    createDominoes();
    createCart();
    createLauncher();
    createCup();
}
```

Preserve user settings:

```js
rampSetting
brickCount
launcherAnchored
```

Reset physical state but not control state.

---

# 28. Running behavior

A useful design is to hold the ball static before RUN.

On setup:

```js
Body.setStatic(ball, true);
```

When user presses RUN:

```js
Body.setStatic(ball, false);
simulationRunning = true;
```

That makes the starting state predictable.

---

# 29. Camera

No moving camera.

Use one fixed orthographic-like view.

The entire machine should remain visible.

This matters because students need to reason about relative movement, especially launcher recoil.

Do not zoom to follow objects.

---

# 30. Determinism

Aim for highly repeatable results.

Matter.js can show small variations, but the same settings should reliably give the same outcome.

Avoid:

- random starting rotations
- random forces
- random restitution
- procedural object placement

Use exact starting positions.

---

# 31. Physics tuning philosophy

Do not start by trying to use realistic kilogram/metre/Newton values.

Matter.js does not require real-world units.

Start with dimensionless values that create plausible relative behavior.

The important physical relationships are:

```text
steeper ramp → faster ball
greater cart mass → smaller acceleration from same interaction
free launcher → visible recoil
anchored launcher → recoil transferred to ground
```

Those relationships should remain internally consistent.

---

# 32. MVP build order

Do not build the whole machine at once.

## Phase 1

Build:

```text
ground
ramp
ball
first domino
```

Success condition:

Low ramp:

```text
domino remains upright
```

High ramp:

```text
domino falls
```

---

## Phase 2

Add full domino chain.

Success:

```text
all dominoes fall sequentially
```

---

## Phase 3

Add cart.

Tune until:

```text
8 bricks → barely moves
3 bricks → reaches launcher
```

---

## Phase 4

Add launcher.

First implement:

```text
cart sensor → projectile launch
```

Then add recoil.

---

## Phase 5

Add anchored state.

---

## Phase 6

Add cup and success detection.

---

## Phase 7

Polish rendering and UI.

This order is important. Each stage gives you a small, testable physical system.

---

# 33. Suggested object configuration constants

Keep tuning values in one place.

Example:

```js
const CONFIG = {
  gravity: 1,

  ramp: {
    angles: {
      low: 8,
      medium: 14,
      high: 22
    }
  },

  ball: {
    radius: 14,
    mass: 1.2,
    friction: 0.02,
    restitution: 0.05
  },

  domino: {
    width: 14,
    height: 60,
    count: 9,
    spacing: 42,
    mass: 1
  },

  cart: {
    baseMass: 2,
    brickMass: 1.25,
    defaultBricks: 8,
    friction: 0.08
  },

  launcher: {
    mass: 5,
    launchImpulseX: 0.04,
    launchImpulseY: -0.025
  },

  projectile: {
    radius: 13,
    mass: 0.7
  }
};
```

Treat these as tuning placeholders, not final physics values.

---

# 34. Code architecture

Suggested responsibilities:

## `main.js`

- p5 setup
- p5 draw loop
- initialize simulation
- keyboard shortcuts

## `simulation.js`

- Matter.js engine
- world creation
- collision events
- run/reset
- simulation state

## `objects.js`

Factory functions:

```js
createRamp()
createBall()
createDominoes()
createCart()
createLauncher()
createCup()
```

## `ui.js`

- controls
- buttons
- student mode
- teacher mode
- debug mode

---

# 35. Rendering approach

Use Matter.js for body geometry but draw everything yourself in p5.js.

Do not use Matter.Render for the final visuals.

Example:

```js
push();
translate(body.position.x, body.position.y);
rotate(body.angle);

rectMode(CENTER);
rect(0, 0, width, height);

pop();
```

This gives much more control over appearance.

Keep collision shapes visible only in debug mode.

---

# 36. Events

Use Matter.js collision events:

```js
Events.on(engine, "collisionStart", event => {
    for (const pair of event.pairs) {
        // cart reaches launcher trigger
        // projectile reaches cup sensor
    }
});
```

Use labels on bodies:

```js
body.label = "cart";
body.label = "launcherTrigger";
body.label = "projectile";
body.label = "cupSensor";
```

Avoid determining collisions from screen coordinates.

---

# 37. Launcher momentum implementation

This is worth isolating into one function.

Something like:

```js
function fireLauncher() {
    if (launcher.hasFired) return;

    launcher.hasFired = true;

    const projectileMomentum = 6;

    const vx =
      projectileMomentum / projectile.mass;

    Body.setVelocity(projectile, {
        x: vx,
        y: -6
    });

    if (!settings.launcherAnchored) {
        const launcherVx =
          -projectileMomentum / launcher.body.mass;

        Body.setVelocity(launcher.body, {
            x: launcherVx,
            y: launcher.body.velocity.y
        });
    }
}
```

This explicitly maintains the relationship:

```text
m₁v₁ ≈ -m₂v₂
```

It is easier to tune and explain than applying a force over an arbitrary frame interval.

---

# 38. Do not expose the physics answer

This is important.

Student controls should say:

```text
Ramp
Cart load
Launcher
```

Not:

```text
Increase force
Decrease inertia
Change F=ma
Fix action-reaction
```

Likewise, do not put:

```text
Newton's First Law
Newton's Second Law
Newton's Third Law
```

above the three controls.

Those are interpretations students should develop.

---

# 39. Possible classroom flow

The simulator should make this interaction possible without requiring any special mode.

Teacher:

> What happened?

Students observe.

Teacher:

> What could we change?

Student suggests ramp.

Change ramp.

Run again.

Now another part fails.

Repeat.

The machine itself therefore controls the pacing of the discussion.

---

# 40. Success criteria

The MVP is ready when all of these work reliably:

- Low ramp causes ball to reach but not topple first domino.
- High ramp reliably starts the chain.
- Dominoes fall through real collision.
- Heavy cart moves noticeably but stops before launcher.
- Removing mass causes cart to reach launcher.
- Cart triggers launcher through collision/sensor.
- Free launcher visibly recoils.
- Anchored launcher stays in place.
- Projectile follows a plausible arc.
- Projectile can reach the cup.
- Reset always returns the system to a consistent starting state.
- Same settings produce essentially the same result each run.
- No explanatory physics terminology is required on screen.

---

# 41. Nice-to-have features after MVP

Once the machine itself works, these are useful additions:

- pause button
- frame-step button
- slow motion
- velocity vectors
- force vectors
- replay last run
- ghost trail of cart/projectile motion
- measurement ruler
- stopwatch
- graph of velocity versus time
- export screenshot
- preset scenarios
- teacher-lockable controls
- fullscreen classroom mode

I would resist adding any of these until the core chain behaves properly.

---

# 42. First implementation target

I would give your local coding agent this very narrow first milestone:

> Build a single-page p5.js + Matter.js simulation containing only a static floor, adjustable ramp, steel ball, and nine blue dominoes.
>
> The ball begins fixed near the top of the ramp and is released when RUN is pressed.
>
> There are three ramp-angle settings: low, medium, and high.
>
> Tune the simulation so that at the low setting the ball reaches and contacts the first domino but normally fails to knock it over, while at the high setting it reliably knocks over the first domino and starts a physically simulated domino chain.
>
> Use a locked side view and simple shapes on a light gray background. Include RESET and RUN buttons. Add a hidden debug mode toggled with D showing collision bodies and current ball speed.
>
> Do not implement the cart, launcher, cup, equations, labels, or Newton’s Law terminology yet.

If that first piece behaves correctly, the rest of the project is mostly adding one physical subsystem at a time rather than debugging an entire Rube Goldberg machine simultaneously.