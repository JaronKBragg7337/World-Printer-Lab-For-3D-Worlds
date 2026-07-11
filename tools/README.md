# Mesh admission and slicing tools

`mesh_to_layers.py` is the first build-time gate for third-party and player-made meshes. It does not claim that a game mesh is printable merely because it loads. It:

1. bakes scene-node transforms and instances before merging;
2. removes invalid/unreferenced data;
3. normalizes declared units and Y-up assets to a Z-up slicing coordinate system;
4. centers the two bed axes, grounds Z, and optionally fits a safe printer envelope;
5. rejects non-watertight, inconsistent, disconnected/floating, zero-layer, or over-budget input by default;
6. records the per-asset license, source URL, author, SHA-256, dependencies, health, bounds, and volume;
7. exports actual plane intersections as `world-printer-layer-paths@1` boundary-contour JSON.

SciPy and NetworkX support Trimesh path traversal. `lxml` enables 3MF import. These contours are not production G-code: they do not yet include bead offsets, infill, supports, flow, or machine commands.

Install the optional tools in a virtual environment:

```powershell
python -m venv .venv-mesh
.\.venv-mesh\Scripts\python -m pip install -r tools\requirements-mesh.txt -c tools\constraints-mesh.txt
```

Convert a Y-up GLB for the Workshop printer:

```powershell
.\.venv-mesh\Scripts\python tools\mesh_to_layers.py input.glb output.layers.json `
  --source-license CC0-1.0 `
  --source-url https://example.org/official-asset-page `
  --source-author "Asset Creator" `
  --up-axis y `
  --source-units m `
  --layer-height 0.08 `
  --profile workshop
```

`--profile` uses the browser runtime's clearance-reduced safe volume. A custom `--fit-envelope` is ordered X, Y horizontal depth, Z up. Both only scale down imported admission candidates. Native catalog parts are never silently shrunk at print time; the browser requests a larger printer class when needed.

An output file is always an admission report. Downstream code must require `admitted: true` and `contourType: "boundary-contours"` before using its layers. Rejected reports exit with code 2 and list `rejectedReasons`.
