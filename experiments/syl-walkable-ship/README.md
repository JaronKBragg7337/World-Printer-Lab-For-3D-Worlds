# SYL Walkable Ship — isolated experiment

This route is intentionally separate from the canonical printer runtime and from `SYL-Full-Game`.

## Goal

Prove that a replacement SYL ship can be:

- constructed from hundreds of discrete printable pieces rather than one opaque hull primitive;
- visually shaped as one connected craft;
- entered through a real rear ramp;
- walked through continuously from cargo bay to systems corridor to cockpit;
- inspected in Orbit, third-person, and first-person views;
- viewed as a starboard/roof cutaway without changing the underlying model.

## Route

```text
/experiments/syl-walkable-ship/
```

Add `?auto=1` to begin the piece-by-piece assembly automatically.

## Current implementation

- curved pressure hull assembled from longitudinal plate courses;
- tapered nose and segmented cockpit glazing;
- tiled deck and physically sloped rear ramp;
- piece-built swept wings;
- segmented twin engine nacelles;
- landing gear;
- cargo benches and deck tie-down rails;
- systems consoles and two doorway bulkheads;
- two-seat cockpit, forward console, and navigation table;
- continuous walk-surface model for ground, ramp, and interior deck;
- mobile joystick plus desktop WASD/arrows;
- Orbit, third-person, and first-person camera modes;
- cutaway and interior-light controls.

## Isolation rule

Do not copy this into the canonical printer or `SYL-Full-Game` until the preview has been visually and interactively reviewed. This branch does not alter:

- `src/main-v2e.js`;
- runtime persistence or multiplayer;
- Heartbeat Observatory;
- any file in `SYL-Full-Game`.

## Integration work still required

A production SYL port would need to connect this visual/interior layout to:

- authoritative ship physics and quaternion synchronization;
- module slots and damage state;
- player collision and moving-platform transforms;
- cockpit piloting transition;
- ship door/ramp state;
- save/load and multiplayer state;
- scene-validation and collider-debug tests.
