# World Printer Part Catalog schema v1

## Product rule

**Parts are recipes. Finished objects are blueprints.**

A house is no longer the atomic print request. It is a blueprint containing wall panels, posts, floor slabs, roof panels, stairs, fences, and openings. Cars, aircraft, spacecraft, cities, and landscapes follow the same rule.

## Runtime contract

Each catalog recipe keeps the legacy fields required by persistence and adds stable part metadata:

```js
{
  id: 'wall',                    // stable Supabase placements.type
  schemaVersion: 1,
  category: 'structure',
  label: 'Wall Panel',
  aliases: ['wall', 'wall panel'],
  dims: [2, 0.4, 2],            // X width, Z depth, Y height
  complexity: 0.85,
  create: createWall,
  sized: true,
  modular: true,
  source: 'native-parametric',
  connectorKind: 'structure'
}
```

`buildAtSize()` attaches this instance metadata without replacing geometry-specific `userData`:

```js
root.userData.partSpec = {
  catalogVersion: 1,
  family: 'wall',
  category: 'structure',
  modular: true,
  source: 'native-parametric',
  nominalScale: 1,
  nominalDims: [2, 0.4, 2],
  measuredDims: [2, 0.4, 2],
  grid: 0.5,
  connectors: [/* local position + normal + compatible kind */]
};
```

Connector snapping is attempted before the legacy AABB face snap. Connectors are derived from measured grounded bounds (with specific axle/chassis/wheel/thruster roles), transformed into world space, restricted to matching part scale, and accepted only when their normals are nearly opposite. Snap reach and movement grids scale with the explicit Part Scale.

## v2i catalog

- **Build:** Block, Wall Panel, Door Wall, Floor / Slab, Post / Pillar, Beam, Triangle / Gable, Flat Roof, Incline Roof, Stairs, Fence Panel, Diagonal Brace.
- **Roads:** Straight Road, Road + Sidewalk, Four-way Road, Terrain Tile.
- **Vehicles:** Vehicle Chassis, Wheel Assembly, Tire, Axle.
- **Energy:** Battery Module, Wire / Conduit, Gas Tank, Hydrogen Tank.
- **Flight:** Wing Panel, Thruster.
- **Blueprint compatibility:** Market Stall, Cottage, Boat, Tree, Cart, Hero Layered Form, Creature, Campfire.

The old `block`, `wall`, `floor`, `pillar`, and blueprint IDs remain stable so existing shared-world rows still rebuild.

## Printer profiles

Printer Class and Part Scale are separate controls. Beds, rails, uprights, gantries, belts, and parking height regenerate for the selected hardware envelope without changing part dimensions. The default Standard scale is interoperable across every printer.

| Profile | Build envelope (X × Z × Y) |
| --- | --- |
| Compact | 4.5 × 3.82 × 3.6 |
| Workshop | 8.4 × 6.8 × 6.2 |
| Industrial | 15.4 × 13.4 × 11 |

Optional Part Scales are Mini 0.55×, Standard 1×, and Mega 1.8×. They are explicit module standards; differently scaled connectors do not mate accidentally.

Before printing, exact grounded bounds plus XY/travel clearance are checked. If the selected printer cannot fit the requested part unchanged, the runtime selects the smallest larger profile that can. If no profile fits, it rejects the job instead of lying by scaling it down.

At the end of a job, the toolhead parks above the finished object's measured height and toward a clear bed corner. Travel between pieces uses the maximum deposited height so far plus the active printer's travel clearance.

Wheel/tire, axle, tank, and thruster jobs include temporary support geometry that prints first and is hidden as removed support material when the job finishes. The tire path uses horizontal boundary layers instead of one unsupported vertical centerline.

## Layer-path interchange

Imported meshes use `world-printer-layer-paths@1`:

```json
{
  "schema": "world-printer-layer-paths@1",
  "contourType": "boundary-contours",
  "admitted": true,
  "provenance": { "filename": "part.glb", "sourceLicense": "CC0-1.0", "sha256": "..." },
  "normalizedUpAxis": "z",
  "requestedLayerHeight": 0.08,
  "health": { "watertight": true, "windingConsistent": true },
  "layers": [
    { "height": 0.04, "contours": [[[0, 0], [1, 0], [1, 1], [0, 0]]] }
  ]
}
```

The current browser prioritizes mesh-authored `userData.printPath`, then falls back to primitive-derived paths. The next adapter will map imported JSON contours to the same dry-travel/extrusion animation contract.

## Next schema additions

The Supabase placement schema should eventually add validated `params jsonb`, `catalog_version`, `rot_x`, `rot_z`, and `assembly_id` fields. Until that migration is explicit, v2i preserves the existing `type`, position, yaw, and baked `scale` contract.
