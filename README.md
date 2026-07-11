# World Printer Lab For 3D Worlds

Standalone Three.js laboratory for visibly fabricating interoperable world-building parts, then picking them up, snapping them together, and placing them into a persistent multiplayer world.

This repository remains separate from Fable Survival and SYL so printer mechanics and object form can be proven before they are integrated into larger games.

## Canonical current build

The repository root now opens the most advanced working build:

```text
index.html
→ src/main-current.js
→ src/runtime-guards.js
→ src/main-v2e.js
```

Use the root route for development and testing.

### Current capabilities

- real Three.js scene, not CSS 3D
- visible printer-bed fabrication
- exact nozzle-tip deposition on a coherent Cartesian carriage
- grounded horizontal-contour Hero Layered Form with hot-to-cool material progression
- geometry-following tube, helix, latitude, and perimeter paths for world recipes
- dry lift/cross/descent travel moves between disconnected pieces
- driven X/depth belts, moving pulleys/collars, and a carriage-following filament guide
- granular piece-by-piece slicer
- a versioned 26-family modular catalog for structures, roads, vehicles, energy, and flight
- connector-aware snapping with legacy bounding-box fallback
- Compact, Workshop, and Industrial printers with real regenerated hardware/build envelopes
- independent Mini, Standard, and Mega part scales so bigger hardware does not silently resize modules
- exact preflight fit checks with no silent down-scaling
- deposited-height-aware dry travel and collision-safe finished-part parking
- removable temporary support geometry for wheel/tire, axle, tank, and thruster jobs
- curated Blueprint compatibility category for older whole-object demonstrations
- a Trimesh mesh-admission and contour-export tool for CC0/community assets
- pickup, preview, move, rotate, stack, place, cancel, and delete
- Supabase world-state persistence
- Supabase Realtime multiplayer place/move/delete synchronization
- Orbit, third-person, and first-person camera modes
- mobile joystick and desktop walking
- browser-native speech recognition when supported

The current build proves this loop:

```text
text or voice command
→ approved part recipe
→ visible printer-bed fabrication
→ finished part waits on the bed while the toolhead parks clear
→ player picks it up
→ ghost placement preview
→ connector or edge snap
→ player places or stacks it
→ part persists in the shared world
```

## Runtime safety layer

`src/runtime-guards.js` loads before `src/main-v2e.js` and narrowly addresses two verified faults without replacing the large proven printer implementation:

1. **Persistence truth:** optimistic “saved” and “deleted” messages are changed to a pending state until the Supabase request actually succeeds. A failed request is shown as local-only instead of being silently reported as saved.
2. **Realtime size correction:** objects are already rebuilt with their saved size baked into geometry. The guard omits `scale` only from Realtime UPDATE callback payloads so a Large object is not scaled from `1.8×` to `3.24×` after another player moves it.

These guards are compatibility fixes. They may later be folded directly into `main-v2e.js` after equivalent behavior is tested.

## Older versions are preserved

The newest build contains the broadest system, but older files still contain a few object ideas that were not fully ported. Nothing was deleted or overwritten.

Explicit historical routes:

```text
/legacy/v1/   → src/main.js
/legacy/v2d/  → src/main-v2d.js
/legacy/v3/   → src/main-v3.js
/v2/          → original parallel v2 experiment
```

Notable details still present in `main-v3.js` include an Arched Bridge recipe, cottage chimney, fuller cart details, and boat benches. See [`VERSION_INVENTORY.md`](./VERSION_INVENTORY.md) before removing or consolidating any legacy source.

## Current source of truth

For new printer work:

```text
src/main-v2e.js
```

For the root application startup and temporary compatibility guards:

```text
src/main-current.js
src/runtime-guards.js
```

For placed world objects:

```text
Supabase placements table
world = printer-lab
```

The database—not Git—is the source of truth for what players have placed in the shared world.

## Live on Heartbeat Observatory

The public version is hosted as a build-free vendored feature at:

```text
https://www.heartbeatobservatory.com/3DPrinterAsset/
```

The live files are stored in:

```text
heartbeat-observatory/3DPrinterAsset/
```

Pushing only to this repository does **not** update the public Heartbeat route. Every public release must also update the vendored Heartbeat files and verify both repositories represent the same printer behavior.

## Development sequence

Current priority order:

1. adopt Manifold as the worker-isolated printable-solid and contour kernel;
2. load `world-printer-layer-paths@1` output from the Trimesh admission tool;
3. add parameter editing and validated connector families;
4. add road corner/T modules, wall windows, doors, and multi-axis part rotation;
5. migrate persistence to catalog parameters and assembly IDs;
6. turn Cottage, car, aircraft, and spacecraft blueprints into queued part jobs;
7. integrate the proven printer system into Fable and SYL.

Research and architecture:

- [`docs/OPEN_SOURCE_PARTS_RESEARCH_2026-07-11.md`](./docs/OPEN_SOURCE_PARTS_RESEARCH_2026-07-11.md)
- [`docs/PART_CATALOG_SCHEMA_V1.md`](./docs/PART_CATALOG_SCHEMA_V1.md)
- [`docs/HANDOFF_2026-07-11_V2I_MODULAR_PARTS.md`](./docs/HANDOFF_2026-07-11_V2I_MODULAR_PARTS.md)
- [`tools/README.md`](./tools/README.md)

## Run locally

```bash
npm install
npm run dev
```

Open the root route for the canonical build. The explicit legacy routes remain available for comparison.

## Deploy on Vercel

Use the Vite preset:

```text
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

## Agent rule

Map the live repository state before changing it. Do not assume the numerically newest filename contains every prior recipe detail. Develop against the canonical build, compare legacy versions before deletion, and synchronize the public Heartbeat copy when shipping.

## License

MIT. Use it, fork it, remix it, and build from it. Keep secrets such as service-role keys, private credentials, and environment files out of the repository.
