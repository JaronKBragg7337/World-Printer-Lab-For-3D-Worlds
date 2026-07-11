# v2i modular world-parts foundry — 2026-07-11

## Outcome

World Printer Lab now treats **parts as recipes and finished objects as blueprints**. The default library is no longer a flat row of whole props. It exposes 26 modular families across construction, roads, vehicles, energy, and flight, while keeping eight older whole-object demonstrations in a clearly labeled Blueprint compatibility category.

This release also fixes the reported cottage/toolhead collision: printer hardware has real class-specific dimensions and the carriage parks above the measured object height at a clear bed corner after every job.

## Architecture

- `PartSpec` schema v1 attaches stable family/category/source, measured and nominal dimensions, explicit part scale, placement grid, and world-transformable connectors to every modular instance.
- Connector snapping runs before the legacy AABB fallback, accepts only compatible same-scale ports with near-opposite normals, and uses measured grounded bounds. Axle/chassis/wheel and wing/thruster roles have specific port layouts.
- Printer Class and Part Scale are independent:
  - Compact: 4.5 × 3.82 × 3.6
  - Workshop: 8.4 × 6.8 × 6.2
  - Industrial: 15.4 × 13.4 × 11
  - Part scales: Mini 0.55×, Standard 1×, Mega 1.8×
- Preflight validates real centered bounds against the active safe envelope. It upgrades to the smallest larger printer when required and never silently shrinks a native part.
- Dry travel clears the maximum deposited height. Finished-part parking uses measured height plus profile clearance.
- Wheels/tires, axles, tanks, and thrusters visibly print temporary support material first; supports disappear after the head parks. Tire animation uses horizontal boundary layers.
- Existing Supabase recipe IDs and the baked `scale` persistence contract remain compatible.

## Catalog shipped

- **Build:** Block, Wall Panel, Door Wall, Floor / Slab, Post / Pillar, Beam, Triangle / Gable, Flat Roof, Incline Roof, Stairs, Fence Panel, Diagonal Brace.
- **Roads:** Straight Road, Road + Sidewalk, Four-way Road, Terrain Tile.
- **Vehicles:** Vehicle Chassis, Wheel Assembly, Tire, Axle.
- **Energy:** Battery Module, Wire / Conduit, Gas Tank, Hydrogen Tank.
- **Flight:** Wing Panel, Thruster.
- **Blueprints:** Market Stall, Cottage, Boat, Tree, Cart, Hero Layered Form, Creature, Campfire.

## Open-source strategy

Research is recorded in `OPEN_SOURCE_PARTS_RESEARCH_2026-07-11.md`.

- Kenney and Quaternius CC0 kits are the strongest design-vocabulary and source candidates.
- Manifold (`manifold-3d`, Apache-2.0) is the preferred future browser solid/contour kernel.
- Trimesh (MIT) is the build-time admission and QA layer.
- Kiri:Moto / GridSpace (MIT) is the later full browser slicer candidate.
- CuraEngine and PrusaSlicer remain external AGPL validation oracles.

No third-party model files ship in v2i. Native parametric parts avoid pretending that a reusable game mesh is automatically printable.

## Mesh admission tool

`tools/mesh_to_layers.py` exports `world-printer-layer-paths@1` **boundary contours**, not G-code. It is fail-closed and records per-asset license/source/author, SHA-256, dependency versions, declared/detected units, fit scaling, health, components, and rejection reasons.

It bakes scene transforms/instances, normalizes units and up-axis, centers X/Y, grounds Z, applies a clearance-reduced printer profile, caps faces/layers/points, and rejects non-watertight, inconsistent, disconnected/floating, or zero-contour input by default.

Validated dependency set is pinned in `tools/constraints-mesh.txt`.

## Verification evidence

- `npm run build`: passed repeatedly with Vite 8.1.4.
- Python compile: passed.
- Mesh suite passed in a fresh isolated dependency target:
  - centered watertight STL: admitted, 8 layers;
  - 0.04-high mesh with 0.1 requested layer: admitted, 1 layer;
  - transformed/instanced GLB: transforms preserved;
  - 3MF: admitted with detected millimeter conversion;
  - open mesh: rejected, exit code 2, zero admitted layers.
- Desktop browser at 1920 × 1080:
  - all categories/printer classes/part scales rendered;
  - Industrial hardware did not change Standard part scale;
  - Compact Standard Road + Sidewalk auto-upgraded to Workshop and kept all hardware/scale buttons disabled during printing;
  - battery, cottage, incline roof, road + sidewalk, wheel, and wing jobs completed;
  - Workshop cottage carriage parked outside and above the completed roof;
  - wheel supports printed first and were absent from the final part;
  - no browser console errors.
- Mobile browser at 390 × 844:
  - compact collapsed HUD and opened scrollable controls both worked;
  - Printer Class, Part Scale, and all catalog category controls fit with no horizontal overflow.

## Compatibility and limitations

- Imported layer JSON is not loaded by the browser yet; v2i establishes and validates the interchange.
- Boundary contours are not production FDM toolpaths. Perimeter offsets, infill, support planning for arbitrary imports, flow, and G-code remain future work.
- Connector occupancy/detach semantics are not persisted yet.
- Placement persists yaw only. X/Z rotation, vertical stabilizers, and arbitrary assembly orientation require a schema migration.
- Road corner/T/curb, roof ridge, window wall, fuselage/tail/seat/suspension, and terrain slope/cliff/water families are the next catalog tranche.
- Blueprint demos remain whole persisted rows for backward compatibility; they should later expand into queued part jobs.

## Rollback and release

- Previous lab rollback point: `27fb18f` (`Add geometry paths and driven printer mechanics`).
- The v2i release is the commit containing this document.
- Public Heartbeat must vendor `src/main-v2e.js` as `3DPrinterAsset/main.js` without the CSS import, copy `src/style.css`, bump `?v=2i`, and deploy.

## Next highest-value improvement

Add X/Z rotation with persistence and connector occupancy, then implement road corner/T-junction, roof ridge/window wall, fuselage/tail, and terrain-slope modules. In parallel, worker-load Manifold and consume admitted `world-printer-layer-paths@1` boundary data behind a slicer adapter.
