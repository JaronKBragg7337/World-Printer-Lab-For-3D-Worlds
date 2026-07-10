# Hero Knot reference-fidelity pass — 2026-07-10

## Outcome

The canonical runtime is now v2f. `Hero Knot` replaces the bead-chain spiral as the first reference-quality print proof. It is a closed trefoil built from 176 overlapping tube strokes that visually join into one curved extrusion.

The hero recipe uses a dedicated pipeline:

```text
dry travel to start
→ exact centreline traversal
→ localized molten bead and heat light
→ hot/warm/solid cooling tail
→ completed layered polymer form
```

Piece-built recipes, Supabase persistence, Realtime synchronization, print sizes, snapping, placement, and camera/walking controls remain on the existing v2e paths.

## Key implementation points

- `knotPoint()` defines the trefoil centreline.
- `createHeroKnot()` creates short overlapping `TubeGeometry` extrusion strokes.
- `startHeroPrint()` owns travel, deposition, cooling, and the centered showcase camera.
- The generic `collectPartsLocal()` / `revealParts()` slicer is deliberately retained for structural world objects.
- The saved recipe id remains `spiral`, so existing persisted spiral rows rebuild as the upgraded knot without a database migration.

## Verification

- `npm run build`: pass.
- Desktop browser: printing and final states visually inspected; no JavaScript errors.
- 390 × 844 mobile viewport: final silhouette, layer ridges, bed contact, HUD, and nozzle framing inspected; no JavaScript errors.
- Existing Supabase runtime guards remain installed before the canonical module.

## Known limits

- This is a hero centreline extrusion, not a general mesh slicer or G-code engine.
- The printer frame is still the v2 machine and deserves a later mechanical-model pass.
- The trefoil includes unsupported over-under spans for visual fidelity; future physical-print simulation should add support/toolpath constraints.
- Three.js reports that `PCFSoftShadowMap` is deprecated and falls back to `PCFShadowMap`.

## Rollback

The parent before this pass is `dd47bcc`. Reverting the v2f commit restores the bead-chain spiral and generic-only print pipeline.

## Next highest-value improvement

Build a physically coherent Cartesian carriage: X rail carries the extruder, Y motion carries that rail, and Z raises the complete gantry. Then add acceleration profiles and a true layer-contour vase proof on the same hot-to-cool material system.
