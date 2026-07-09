# Experimental Version Archive

This file preserves the working history without keeping outdated experimental engines in the active `src/` folder.

## Current active structure

- `/` uses the stable root build.
- `/v2/` is the current experimental lane.
- `v2/index.html` currently points to `src/main-v2d.js`.

## Archived / removed from active source

These older experimental engines were useful while testing, but are now considered noise because `v2d` is the first clean working state worth continuing from.

- `src/main-v2.js` — early detailed-printer/PBR experiment.
- `src/main-v2b.js` — path-following printer and variable print-time experiment.
- `src/main-v2c.js` — component-driven reveal experiment with a coordinate-space bug where nozzle paths could print away from the visible object.

The code is still recoverable from Git commit history if needed. The active branch should continue from `src/main-v2d.js` unless a later version supersedes it.

## Current next work from testing feedback

Keep stable:

- Campfire
- Market Stall
- Cart
- Boat

Needs work:

- Tree: trunk appears too early; needs a true hidden-then-printed reveal.
- Cottage: too swirly; should trace walls and roof more like cart/stall.
- Spiral: path is a little funky; needs a cleaner intentional print path.
- Creature: needs a rebuild after the core printer loop is locked.

## Workflow rule

Do not overwrite the stable root. Risky iteration should happen in the experimental lane first. Once a version becomes the new baseline, archive/delete older noisy experiment files and keep the repo clean.
