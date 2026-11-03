# Putt League (DDM Creative Works / Flightline DG)

Over-the-top arcade disc golf putting game. Cel-shaded three.js r128, oddly good physics,
ridiculous rewards. Ships as one self-contained HTML file.

## Play
- Modes: PUTT (two putts a hole, 25 ft and 40 ft, one spot tucked behind something), PITCH (tee to basket, par 2/3), UNLIMITED (no score).
- Venue: The Taproom, 6 holes: the taproom (1), the beer garden (2, 3), the back lot (4 Silo Sweep, 5 Truck Stop, 6 The Loading Dock).
- Controls: tap where you want to throw (no auto aim), drag the reticle anywhere (in the air too), hold the disc and slide to set hyzer/anhyzer (left/right) and nose (up/down), then pull back and flick. The reticle sets a flat line; your angle bends it. Power bar adds arm. VIEW cycles tee, drone, basket. Pinch zoom, tap the disc to return to tee view.

## Layout
- `src/flightline-physics.js`, `flightline-basket.js`, `ddm-contact.js`, `ddm-materials.js`: physics engines. Engine frame: metres, x right, y downrange, z up. three.js maps it to (x, z, -y).
- `src/course.js`: the venue model: rooms, garden, back lot, holes, solids, surfaces, the throw solver (flat line to or through the reticle), lie rules and relief, scoring.
- `src/scene.js`: builds the 3D venue (toon materials, ink outlines, baskets, bank boards, glow shells).
- `src/game.js`: input (flick read with Putt Reader 1.1 chord classes, angle setting), aiming, cameras (smart aim spots, spring arm, follow cam), course intro and hole flyovers, playback, scoring, cards.
- `src/shell.html`: HUD markup and CSS.
- `build.py`: builds `dist/putt-league-taproom.html` (three.js from cdnjs). `python3 build.py --local` makes a `-local.html` that loads `./three.min.js` for offline tests.
- `test-*.js`: Node tests. `node test-course.js` (play-outs, holes 1-3), `node test-play6.js` (searching bot, all 6 holes), `node test-putt2.js` (putt make rates), `node test-bank2.js` (bank shots off a kettle), `node test-angle.js` (how far each angle bends a line).

## Build
    python3 build.py

This writes `dist/putt-league-taproom.html` and the public test page `docs/index.html` (served by GitHub Pages from the `docs/` folder on `main`).

## Play the test build
https://demondigitalmedia.github.io/putt_league/

## Roadmap (next, in Claude Code)
1. Split venues into their own files (venue registry) so new venues drop in.
2. Sound: chains, gong, skips, crowd, jackpot reel, all driven by the physics events.
3. Spectacle pass: slow-mo replays, patrons reacting, kettles venting, lights chasing; comic fails (sad trombone, tumbleweed, dog steals the disc).
4. Background life: bartender, patrons, TV replaying your last throw, garden dog, taco truck cook.
5. Progression and swag: XP, ranks, personal bests, daily hole, unlockable discs, player card; GroundCrew shirts and Flightline DG discs as in-game rewards with item IDs and a real-world-eligible flag.
6. The Flight Deck: aircraft carrier venue (see the Putt League Venue List doc).
