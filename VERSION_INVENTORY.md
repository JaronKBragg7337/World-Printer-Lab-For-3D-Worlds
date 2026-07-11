# World Printer Version Inventory

This file prevents an agent from treating “newest” as “contains every idea ever implemented.”

## Canonical current build

**Entrypoint:** `index.html` → `src/main-current.js` → `src/main-v2e.js`

Use this build for new development. It contains the broadest working system:

- granular piece-by-piece printing
- curved tiled cottage roof and reusable slicer helpers
- 26 modular part families across structures, roads, vehicles, energy, and flight
- a versioned PartSpec metadata/connector contract
- Compact, Workshop, and Industrial printer geometry/build envelopes
- separate Mini, Standard, and Mega part-scale standards
- collision-aware dry travel and measured finished-part parking
- older whole objects isolated in the Blueprint compatibility category
- Trimesh mesh-admission and layer-contour export tooling
- grid placement and vertical stacking
- Supabase world-state persistence
- Supabase Realtime multiplayer updates
- Orbit, third-person, and first-person views
- mobile joystick and desktop walking

`src/runtime-guards.js` is loaded before `main-v2e.js` to prevent two known runtime faults without rewriting the large proven source file:

1. optimistic “saved/deleted” messages are changed to pending status until the Supabase request succeeds;
2. `scale` is omitted only from Realtime UPDATE callback payloads because saved objects are already rebuilt with size baked into their geometry.

These guards are deliberately narrow. A later cleanup may fold the same logic directly into `main-v2e.js`, after which the guards can be removed.

## Preserved legacy implementations

No source implementation was deleted or overwritten.

### `src/main.js` — original v1

Explicit route: `/legacy/v1/`

Contains the original broad proof loop and early object recipes. Keep it as historical reference and fallback.

### `src/main-v3.js` — bed-print-only v3

Explicit route: `/legacy/v3/`

Still contains ideas/details not fully carried into v2e, including:

- an **Arched Bridge** recipe;
- a cottage **chimney**;
- earlier cart details such as fuller end walls and a handle;
- earlier boat interior details such as benches.

Do not delete this file until those useful details have either been deliberately rejected or ported into the canonical recipe system.

### `src/main-v2d.js` — corrected bed-local prototype

Explicit route: `/legacy/v2d/`

Important as the direct predecessor proving corrected bed-local coordinate handling.

### `v2/`

Retained as the original parallel higher-detail experiment folder. It is historical, not the canonical current route.

## Rule for future agents

1. Develop against `src/main-v2e.js` through the canonical root.
2. Before deleting or replacing a legacy file, compare its recipes and mechanical details against the current build.
3. Port useful details first; archive only after the comparison is recorded.
4. Keep `heartbeat-observatory/3DPrinterAsset/` synchronized when shipping to the public site.
5. Treat parts as recipes and finished houses/vehicles as blueprints. Do not expand the whole-object category as the primary product path.
