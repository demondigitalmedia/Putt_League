# Putt League (DDM Creative Works / Flightline DG)

Over-the-top arcade disc golf putting game. Cel-shaded three.js r128, oddly good physics,
ridiculous rewards. Ships as one self-contained HTML file.

## Play
- Modes: PUTT (two putts a hole, 25 ft and 40 ft, one spot tucked behind something), PITCH (tee to basket, par 2/3), UNLIMITED (no score).
- Venue: The Taproom, 6 holes: the taproom (1), the beer garden (2, 3), the back lot (4 Silo Sweep, 5 Truck Stop, 6 The Loading Dock).
- Controls: tap where you want to throw (no auto aim), drag the reticle anywhere (in the air too), hold the disc and slide to set hyzer/anhyzer (left/right) and nose (up/down), then pull back and flick. The reticle sets a flat line; your angle bends it. Power bar adds arm. VIEW cycles tee, drone, basket. Pinch zoom, tap the disc to return to tee view.

## Layout
- `src/flightline-physics.js`, `flightline-basket.js`, `ddm-contact.js`, `ddm-materials.js`: physics engines. Engine frame: metres, x right, y downrange, z up. three.js maps it to (x, z, -y).
- `src/venues.js`: the venue registry. Each venue registers itself by id; `Course.use(id)` makes one live (the first registered is the default).
- `src/venues/taproom.js`: The Taproom model: rooms, garden, back lot, holes, solids, surfaces, where the disc is in play, relief obstacles, ceilings, camera bounds, and its own trick reads (over the barrels, thread the door, under the oak). Runs in Node.
- `src/venues/taproom.scene.js`: The Taproom in 3D (brick, kettles, the bar, garden, back lot, lights) and its bonus-target glows. Browser only.
- `src/course.js`: the rules for whichever venue is live: every solid (the venue's plus each basket and bank board), discs, the throw solver (flat line to or through the reticle), lie rules and relief, reading a throw for points, scoring. The live venue's layout (`ROOM`, `OAK`, ...) and `HOLES` are mirrored onto `Course`.
- `src/scene.js`: the scene kit (toon materials, ink outlines, painted panels, merged batches, baskets with live chains, bank boards and tee mats by kind, glow shells). Calls the live venue's `buildScene`.
- `src/game.js`: input (flick read with Putt Reader 1.1 chord classes, angle setting), aiming, cameras (smart aim spots, spring arm, follow cam), course intro and hole flyovers, playback, scoring, cards. Venue specifics come through the venue's hooks.
- `src/shell.html`: HUD markup and CSS.
- `build.py`: builds `dist/putt-league-taproom.html` and `docs/index.html` (three.js from cdnjs) with every venue in `src/venues/`. `python3 build.py --local` makes a `-local.html` that loads `./three.min.js` for offline tests. Add `?venue=<id>` to the page URL to play a venue other than the default.
- `design/`: venue designs not built yet (`the-mall.md`).
- `test-*.js`: Node tests. `node test-course.js` (play-outs, holes 1-3), `node test-play6.js` (searching bot, all 6 holes), `node test-putt2.js` (putt make rates), `node test-bank2.js` (bank shots off a kettle), `node test-angle.js` (how far each angle bends a line), `node test-venues.js` (a second venue drops in, plays, and switching back restores the Taproom).

## Adding a venue
1. `src/venues/<id>.js`: `Venues.register({ id, name, layout, HOLES, SURFACES, surfaceAt, inPlay, solids(box, cyl, S), ... })`. Required: `id`, `name`, `HOLES` (each with `basket`, `tee`, `short`, `long`, `par`, and a `backstop` the kit can draw: `gong`, `kegs`, `crates`, `sacks` or `pallets`, or any other kind the venue draws itself, like the Taproom's `dock`; `bank` is its bank-in call), `SURFACES`, `surfaceAt`, `inPlay`, `solids`. Optional hooks (leave them out for an open-air venue with no walls): `nearEdge`, `bigObstacles`, `defaultTarget`, `inside`, `ceilingFor`, `airCap`, `introVia`, `cam` (`blockers`, `clamp`, `underRoof`, `roofZ`), `tricks` (`start`, `sample`, `make`, `miss`, `hits`). `src/venues/taproom.js` uses every one.
2. `src/venues/<id>.scene.js`: `Venues.register({ id, buildScene(K, scene, stat, ceilB, out), bonus(B) })`. `K` is the scene kit; call `K.dressHoles(scene, stat, out)` for the baskets, bank boards and tee mats. `out` needs `grounds` (meshes you can aim at on the floor); `roof`, `bulbMat`, `gong`/`gongFace` and `anim` are used when present.
3. `python3 build.py` picks both files up. Open the page with `?venue=<id>`.

## Build
    python3 build.py

This writes `dist/putt-league-taproom.html` and the public test page `docs/index.html`. `./publish_pages.sh` rebuilds and pushes that page to the `gh-pages` branch, which GitHub Pages serves.

## Play the test build
https://demondigitalmedia.github.io/Putt_League/

## Roadmap (next, in Claude Code)
1. ~~Split venues into their own files (venue registry) so new venues drop in.~~ Done: see Adding a venue.
2. Sound: chains, gong, skips, crowd, jackpot reel, all driven by the physics events.
3. Spectacle pass: slow-mo replays, patrons reacting, kettles venting, lights chasing; comic fails (sad trombone, tumbleweed, dog steals the disc).
4. Background life: bartender, patrons, TV replaying your last throw, garden dog, taco truck cook.
5. Progression and swag: XP, ranks, personal bests, daily hole, unlockable discs, player card; GroundCrew shirts and Flightline DG discs as in-game rewards with item IDs and a real-world-eligible flag.
6. The Flight Deck: aircraft carrier venue (see the Putt League Venue List doc).
