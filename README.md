# World Printer Lab For 3D Worlds

Standalone Three.js laboratory for visibly fabricating shaped world objects, picking them up, and placing them into a persistent multiplayer world.

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
- granular piece-by-piece slicer
- curved tiled cottage roof
- printable Block, Wall, Floor, and Pillar pieces
- Small, Medium, and Large print sizes
- pickup, preview, move, rotate, stack, place, cancel, and delete
- Supabase world-state persistence
- Supabase Realtime multiplayer place/move/delete synchronization
- Orbit, third-person, and first-person camera modes
- mobile joystick and desktop walking
- browser-native speech recognition when supported

The current build proves this loop:

```text
text or voice command
→ approved object recipe
→ visible printer-bed fabrication
→ finished object waits on the bed
→ player picks it up
→ ghost placement preview
→ player places or stacks it
→ object persists in the shared world
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

1. true edge-magnet snapping with overlap prevention and manual-grid fallback;
2. port or deliberately reject useful legacy object details;
3. slice the market stall, cart, and tree to cottage-level granularity;
4. improve visible layer lines and hot-extrusion glow;
5. integrate the proven printer system into Fable and SYL.

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
