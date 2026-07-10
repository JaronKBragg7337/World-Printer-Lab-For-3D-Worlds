# v2g nozzle-truth and grounded-contour pass — 2026-07-10

## Why this pass happened

Phone screenshots proved that v2f's visible nozzle apex entered the bed while extrusion appeared beside the heater block. The old coordinates were internally inconsistent:

```text
bed/deposition Y:         0.56 + pathY
visible cone apex Y:     -0.205 + pathY
error:                    0.765 world units
```

The saved `nozzleTipLocal` was inside the cone rather than at its apex. The trefoil also descended through prior geometry and could not be printed collision-free by a three-axis Cartesian machine.

## v2g outcome

- Rebuilt the printer as a readable Cartesian chain: four Z uprights → depth stage → X rail → compact orange carriage → brass hotend.
- Made the brass cone apex the single canonical nozzle coordinate.
- Both hero and legacy paths now derive machine pose from that exact tip.
- Replaced the airborne trefoil with a grounded layered sculpt made from 20–48 closed horizontal contours, depending on size.
- Each contour is generated as one closed `TubeGeometry`; only the active partial layer is rebuilt during printing. Final medium geometry is about 30 draw calls.
- Printing is strictly bed-up. The nozzle never descends through completed hero geometry.
- Added a dry approach, short descent, localized pale molten front, warm layer tail, lift, and park.
- Switched the showcase toward neutral studio lighting and an orange/lime reference palette.
- Added a mobile-specific full-machine camera and hid joystick/help overlays during the hero sequence.
- Removed unsaved starter props from the showcase.
- Ground-normalized every non-hero recipe before printing or persistence reconstruction.
- Rebuilt Boat from converging longitudinal curved strakes instead of radial block rings.
- Rebuilt Creature from one coherent body, two eyes, and six continuous curved limbs instead of disconnected rubble and bead legs.

The persisted recipe id remains `spiral` for database compatibility, but its visible label is now `Hero Layered Form`.

## Verification

- `npm run build`: pass.
- Desktop hero mid-print and final state visually inspected.
- 390 × 844 mobile hero mid-print and final state visually inspected.
- Exact nozzle-tip contact is visibly aligned at the active contour.
- Full machine fits the mobile showcase frame.
- Repaired Boat and Creature final states visually inspected.
- No JavaScript errors during hero, Boat, or Creature checks.

## Rollback

- v2f parent: `ee76d0d`.
- Revert the v2g release commit to restore the earlier trefoil implementation.

## Known limits / next work

- Legacy structural recipes still use bounding-box-derived local paths and chunk reveal; promoted recipes should receive explicit paths or contour pipelines.
- The hero is a procedural layered sculpt, not a general mesh slicer.
- Replace per-frame partial-layer `TubeGeometry` rebuilding with a preallocated draw-range mesh if profiling shows pressure on older phones.
- Add actual belt/pulley details and update the filament guide to follow the moving carriage.
