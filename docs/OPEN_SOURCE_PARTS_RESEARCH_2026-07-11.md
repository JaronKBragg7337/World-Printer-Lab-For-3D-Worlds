# Open-source world-parts research — 2026-07-11

## Decision

Use a **CC0-first design vocabulary**, but rebuild admitted ideas as canonical printable `PartSpec` primitives. Do not assume that a legally reusable game mesh is printable.

The preferred stack is:

- **Manifold (`manifold-3d`, Apache-2.0):** future browser/worker kernel for guaranteed-manifold procedural solids, booleans, cross-sections, offsets, and contours.
- **Trimesh (MIT):** build-time import, repair, sectioning, and catalog QA. The first tool is `tools/mesh_to_layers.py`.
- **Kiri:Moto / GridSpace (MIT):** later adapter for full browser FDM slicing and G-code generation.
- **JSCAD (MIT):** useful parametric API reference and importer, but not the canonical solid kernel.
- **CuraEngine and PrusaSlicer (AGPL-3.0):** external regression oracles unless the project deliberately accepts AGPL obligations.

## Strongest CC0 source families

| World need | Official source candidates | What to extract |
| --- | --- | --- |
| Walls, floors, roofs, stairs, posts | [Quaternius Medieval Village MegaKit](https://quaternius.com/packs/medievalvillagemegakit.html), [Kenney Building Kit](https://kenney.nl/assets/building-kit), [Kenney Modular Buildings](https://kenney.nl/assets/modular-buildings) | Grid grammar, proportions, openings, roof families |
| Roads, sidewalks, intersections | [Quaternius Downtown City MegaKit](https://quaternius.com/packs/downtowncitymegakit.html), [Quaternius Modular Streets](https://quaternius.com/packs/modularstreets.html), [Kenney City Kit Roads](https://kenney.nl/assets/city-kit-roads) | Straight/corner/T/cross tiles, curbs, ramps, sidewalks |
| Cars and transport | [Kenney Car Kit](https://kenney.nl/assets/car-kit), [Kenney Train Kit](https://kenney.nl/assets/train-kit), [Quaternius Cars](https://quaternius.com/packs/cars.html) | Rebuild into wheels, tires, axles, chassis, cabins, seats |
| Industry and mechanisms | [Kenney Factory Kit](https://kenney.nl/assets/factory-kit), [Kenney Conveyor Kit](https://kenney.nl/assets/conveyor-kit), [KayKit Prototype Bits](https://kaylousberg.itch.io/prototype-bits) | Frames, rollers, stairs, crates, belts, mechanical language |
| Space and bases | [Kenney Modular Space Kit](https://kenney.nl/assets/modular-space-kit), [Quaternius Modular Sci-Fi MegaKit](https://quaternius.com/packs/modularscifimegakit.html), [KayKit Space Base Bits](https://kaylousberg.itch.io/space-base-bits) | Hull panels, corridors, tanks, engines, nozzles, modules |
| Landscape | [Kenney Nature Kit](https://kenney.nl/assets/nature-kit), [Quaternius Stylized Nature MegaKit](https://quaternius.com/packs/stylizednaturemegakit.html), [Poly Haven](https://polyhaven.com/license), [ambientCG license](https://docs.ambientcg.com/license/) | Terrain vocabulary and materials; avoid dense scan geometry at runtime |
| Aircraft | [OpenVSP](https://openvsp.org/) and [NASA 3D Resources](https://science.nasa.gov/3d-resources/) | Generate original parametric wings/fuselages; use NASA as credited engineering reference, not a CC0 bulk library |

Kenney's [official support policy](https://www.kenney.nl/support) says its asset-page game assets are CC0. The [Quaternius FAQ](https://quaternius.com/faq.html) says all models are CC0 and may be modified, combined, and used commercially. Attribution is optional for both, but the project should still keep provenance because it helps humans audit where design ideas came from.

Poly Haven assets are CC0, but its [API terms](https://polyhaven.com/our-api) require a commercial agreement for commercial API integration. Selected manual downloads are different from building a product around that API.

NASA media is not CC0. Follow the [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/), remove logos/identifiers, avoid implied endorsement, credit NASA where appropriate, and inspect any third-party contributor notice per asset.

## Admission pipeline

Every external asset must pass:

```text
per-asset license and provenance record
→ unit and up-axis normalization
→ origin correction and bed grounding
→ component separation
→ watertight/manifold validation
→ inverted/degenerate face repair
→ minimum wall/thickness rules
→ canonical PartSpec connectors and dimensions
→ contour generation
→ printer-envelope validation
→ mobile render/path budget
```

Common game-asset faults include open surfaces, floating decoration, texture-only details, thin walls, inconsistent scale, non-manifold junctions, and disconnected components. CC0 solves permission; it does not solve geometry.

## Geometry-library matrix

| Library | License | Role |
| --- | --- | --- |
| [Manifold](https://github.com/elalish/manifold) | Apache-2.0 | Adopt as the core solid/contour kernel. Its JS API exposes `slice(z)`, CrossSection booleans/offsets, and polygons. |
| [Trimesh](https://github.com/mikedh/trimesh) | MIT | Adopt for CI, repair, format conversion, bounds/volume checks, and `section_multiplane`. |
| [Kiri:Moto](https://github.com/GridSpace/grid-apps) | MIT | Prototype later behind `slice(mesh, profile) -> LayerPath[]`; use its Engine API or parse exported G-code. |
| [JSCAD](https://github.com/jscad/OpenJSCAD.org) | MIT | Parametric authoring/API inspiration; optional importer. |
| [three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg) | MIT | Preview-only; its own documentation warns manufacturing results can be non-manifold. |
| [CuraEngine](https://github.com/Ultimaker/CuraEngine) | AGPL-3.0 | External validation oracle, not embedded by default. |
| [PrusaSlicer](https://github.com/prusa3d/PrusaSlicer) | AGPL-3.0 | External CLI gold standard for regression comparisons. |

## License hygiene

- Maintain a record per imported asset; a code repository's license does not license its model files automatically.
- Preserve MIT/BSD/Apache notices when dependencies are distributed.
- Apache-2.0 includes notice/modification requirements and an explicit patent grant.
- Keep AGPL slicers external unless adopting their obligations intentionally.
- Do not ship any researched model until it has its own provenance entry and passes the admission pipeline.

No third-party model files are bundled in v2i. The first release uses original parametric parts informed by the researched modular vocabulary.
