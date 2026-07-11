# v2h geometry paths and driven mechanics — 2026-07-10

## Outcome

v2h promotes the non-hero printer from synthetic bounding-box scribbles to geometry-following paths and makes the machine's belts/filament routing visibly respond to the same pose that drives the nozzle.

## Geometry-following path system

`geometryPrintPath(mesh)` builds a path in each mesh's own coordinate system, then `collectPartsLocal()` transforms it through the mesh's actual rotation, scale, and hierarchy into recipe-local bed coordinates.

- `TubeGeometry`: samples the real stored curve with arc-length mapping.
- Cylinders/cones: uses a radius-aware helical path.
- Spheres/polyhedra: uses a bottom-up latitude spiral.
- Boxes/extrusions/irregular fallback: uses stacked perimeter contours.

Tube pieces reveal with indexed `drawRange`, so Boat strakes, the keel, Creature limbs, Tree branches, and the Cart handle appear only behind the nozzle along their real curves. `restoreFinal()` restores the complete draw range before pickup/placement.

Each part reserves a dry-travel phase:

```text
extrusion off
→ lift
→ cross at clearance
→ descend
→ enable extrusion
→ follow geometry path
```

## Machine mechanics

- Four moving Z collars are parented to the gantry.
- Two depth saddles connect the moving X rail to the side rails.
- Twin depth belts/pulleys and an X belt loop clarify axis motion.
- Orange belt witness markers rotate/move with carriage position.
- Eleven reusable PTFE guide segments follow a cubic Bézier from spool to the carriage inlet.
- Guide meshes reuse fixed geometry and transforms; no per-frame geometry is created.

## Recipe/product repairs

- Large non-hero recipes are measured and uniformly baked to stay inside the glass bed.
- Market Stall posts now meet the canopy.
- Tree gained six explicit curved branches connecting trunk to canopy.
- Campfire flame and PointLight are lifecycle effects: absent during printing, activated only at completion.

## Verification

- `npm run build`: pass.
- Boat mid-print: exact strake curve reveal; no geometry ahead of nozzle.
- Boat final: complete draw ranges restored.
- Creature final: coherent body and all six continuous limbs.
- Tree final: branch-connected canopy.
- Large Cottage: fitted within glass bed.
- Campfire mid-print: flame/light absent.
- Campfire final: flame/light active.
- 390×844 Boat and Hero motion checks: pass.
- No JavaScript errors in tested routes.

## Rollback

- v2g parent: `99e51a6`.

## Next highest-value work

Move Creature's spherical body/eyes and the remaining complex roofs from generic geometry paths to native contour stacks, then profile active geometry and guide transforms on an older iPhone.
