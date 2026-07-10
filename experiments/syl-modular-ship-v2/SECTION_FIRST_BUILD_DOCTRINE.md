# Section-First Asset Build Doctrine

This document records the process used to move the SYL ship from a patched shell prototype to the section-first Modular Ship V2 experiment.

It is written so future AI agents can reproduce the reasoning rather than merely copying the final geometry.

## Core lesson

The main visual-quality problem was not lighting, shadows, or texture resolution. It was structural decomposition.

The first walkable ship proved scale, silhouette, interior traversal, and piece-by-piece fabrication. However, it was initially designed as one large curved shell made from approximate plate courses. When gaps appeared, additional overlap plates were added. That reduced some visible holes but created a double-layered, patched-shell appearance.

The successful correction was to stop treating the ship as one object.

```text
World style
→ object class
→ major sections
→ section subassemblies
→ whole printable pieces
→ functional connections
→ complete object
```

The cottage roof and Modular Ship V2 use the same underlying principle: break the object into meaningful structural regions, shape the pieces for those regions, and make each region whole before judging the complete asset.

## Failed approach: shell first, patches later

Avoid this sequence:

1. Approximate the complete object with boxes, ribs, or repeated primitives.
2. Notice holes between those approximations.
3. Add a second layer of cover pieces over the holes.
4. Add more detail to disguise the remaining weak joins.

This creates:

- visible double layers;
- pieces that do not look complete by themselves;
- accidental gaps that expose the world outside;
- floating decoration rather than structural components;
- weak control over interior volume;
- difficulty mapping gameplay function to physical parts.

The result may gain more polygons without gaining believable construction.

## Successful approach: sections first

The ship was rebuilt as independent major assemblies:

- rear entry and pressure-door frame;
- cargo hall pressure module;
- systems-spine pressure module;
- cockpit pressure module;
- port and starboard wings;
- port and starboard thrusters;
- landing gear.

Each section owns its own pieces. Cargo, systems, and cockpit each have their own floor, sidewalls, curved roof, interior fittings, and interface boundaries.

Different-sized pressure sections connect through deliberate collars. They are not blended by generic cover plates.

## Piece requirements

Every piece should satisfy all of these conditions before it is accepted:

1. **Whole form** — it must read as a complete panel, frame, tile, strut, console, shroud sector, or connector.
2. **Purpose** — its role should be clear structurally, visually, or functionally.
3. **Designed boundary** — its edges should meet neighboring pieces intentionally.
4. **Printable identity** — it should remain a distinct object that could be fabricated, placed, removed, damaged, or replaced.
5. **No repair-by-decoration** — it must not exist only to hide a mistake in the underlying assembly.

Visible seams are acceptable. Open holes, accidental overlaps, and floating pieces are not.

## Shared-edge geometry

Modular Ship V2 uses closed custom prism geometry for pressure-shell panels rather than scaled boxes placed approximately next to one another.

Neighboring floor, wall, and roof pieces derive their vertices from the same boundary coordinates. This makes the visible line a seam between two solids rather than empty space between approximations.

Use shared-edge geometry when:

- building curved roofs;
- tapering a cockpit or hull;
- joining floors to walls;
- building wing skins;
- dividing cylindrical or annular housings into printable sectors.

Use a designed connector or collar when neighboring sections have different dimensions.

## Section acceptance standard

A section is not complete merely because all planned pieces exist.

Before connecting it to the rest of the object, verify:

- exterior closure from all inspection angles;
- interior closure from first-person view;
- continuous floor and traversal surfaces where required;
- no unintended sightline through the pressure shell;
- no floating details;
- connection boundary is explicit;
- silhouette is intentional;
- section still reads correctly when isolated.

The isolate and exploded-view controls exist specifically for this test.

## Functional structure must be physical

Visual resemblance must not grant gameplay capability.

For the ship, mobility is represented as a dependency chain:

```text
pilot input
→ flight-control core
→ command bus in systems spine
→ port/starboard couplers
→ port/starboard thruster cores
```

The future game should enable mobility only when the required physical modules and their connections exist.

This principle applies elsewhere:

- a door requires a frame, panel, hinge or actuator, and control path;
- a powered building requires generation, distribution, and consuming devices;
- a vehicle requires controls, propulsion, structure, and connection between them;
- an apartment requires exterior shell, circulation, usable rooms, openings, and building systems—not merely a rectangular facade.

## Shape language before lighting

Lighting and materials cannot rescue weak forms.

Recommended order:

```text
silhouette
→ proportion
→ section breakdown
→ piece shape
→ connection logic
→ collision and traversal
→ material language
→ lighting and atmosphere
```

World identity should come first from repeated form rules, not from applying different colors to the same blockout.

Examples:

- **SYL:** pressure modules, aerospace collars, functional conduits, tapered forms, serviceable components.
- **Fable Survival:** grounded construction, shaped timber/stone/metal assemblies, practical wear, irregular but structurally believable silhouettes.
- **Heartbeat social world:** architectural kits, human-scale entrances, apartment modules, curved or stepped facades, coherent streets and public-space furniture.

## Agent workflow

When asked to create or improve an asset:

1. Inspect the world’s existing style and scale.
2. Name the object’s major sections before writing geometry.
3. Define what each section must do and what space it encloses.
4. Define the connection interfaces between sections.
5. List the piece families inside each section.
6. Build one section completely.
7. Test it isolated, inside and outside.
8. Correct gaps by changing piece boundaries or adding legitimate structural pieces—not cover layers.
9. Connect completed sections.
10. Add gameplay dependencies to physical modules.
11. Validate mobile camera, traversal, collision, scale, and performance.
12. Only then add materials, decals, wear, lighting, and atmospheric polish.

## Current Modular Ship V2 status

Branch:

```text
gpt56/syl-modular-ship-v2
```

Draft PR:

```text
#13 — Prototype section-first modular SYL ship v2
```

This work is isolated. It does not modify:

- the canonical World Printer runtime;
- Heartbeat Observatory live deployment;
- SYL-Full-Game;
- Claude’s active printer verification work;
- persistence, multiplayer, or snapping.

## Known visual defect

The rear entry is substantially improved, but the pressure-door surround still has visible openings around the upper and side transition areas from some viewpoints.

Do not solve this by adding another generic outer cover layer.

The next correction should redesign the rear-entry section itself:

- inspect the entry section in isolation;
- define the exact door aperture;
- create complete left jamb, right jamb, header, sill/threshold, and curved corner transition pieces;
- ensure those pieces share boundaries with the cargo-module collar;
- preserve the traversable opening and ramp;
- inspect from outside, inside, low angle, and first person.

## Handoff rule

Future agents should treat this experiment as evidence for a general asset-building method, not as production SYL code ready to merge.

Do not port it into SYL-Full-Game until:

- the rear pressure-door boundary is closed correctly;
- all sections pass isolated gap inspection;
- moving-ship player transforms are designed;
- authoritative ship quaternion and visible mesh remain synchronized;
- module state, damage, save/load, multiplayer, and collision are integrated deliberately.
