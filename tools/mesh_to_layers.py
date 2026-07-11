#!/usr/bin/env python3
"""Validate, normalize, and export mesh boundary contours for World Printer.

This is a fail-closed admission tool for CC0/community GLB, OBJ, STL, PLY, and
3MF assets. Its output is boundary geometry for browser animation and inspection,
not production G-code: perimeter offsets, infill, support planning, flow, and
machine commands belong to the later Manifold/Kiri:Moto adapter.

Requires Python 3.10+. Project license: MIT. Trimesh is MIT; lxml, NetworkX,
NumPy, SciPy, and Shapely use BSD-family licenses.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import math
from pathlib import Path
from typing import Iterable

import numpy as np
import trimesh


TOOL_VERSION = "1.1.0"
PROFILE_ENVELOPES = {
    # Safe X,Y(horizontal depth),Z(up) volumes after browser clearances.
    "compact": np.asarray([4.14, 3.46, 3.26]),
    "workshop": np.asarray([7.90, 6.30, 5.74]),
    "industrial": np.asarray([14.60, 12.60, 10.30]),
}
UNIT_TO_METERS = {
    "mm": 0.001,
    "millimeter": 0.001,
    "millimeters": 0.001,
    "cm": 0.01,
    "centimeter": 0.01,
    "centimeters": 0.01,
    "m": 1.0,
    "meter": 1.0,
    "meters": 1.0,
    "in": 0.0254,
    "inch": 0.0254,
    "inches": 0.0254,
    "ft": 0.3048,
    "foot": 0.3048,
    "feet": 0.3048,
}


def parse_envelope(value: str) -> np.ndarray:
    try:
        values = np.asarray([float(part.strip()) for part in value.split(",")], dtype=float)
    except ValueError as error:
        raise argparse.ArgumentTypeError("envelope values must be numbers: X,Y,Z") from error
    if values.shape != (3,) or not np.all(np.isfinite(values)) or np.any(values <= 0):
        raise argparse.ArgumentTypeError("envelope must be three finite positive numbers: X,Y,Z")
    return values


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_mesh(path: Path) -> tuple[trimesh.Trimesh, str | None]:
    loaded = trimesh.load(path, force="scene", process=False)
    detected_units = getattr(loaded, "units", None)
    if isinstance(loaded, trimesh.Scene):
        # Bake graph transforms and every instance; geometry.values() is wrong for
        # GLB/3MF scenes because it discards per-node transforms and instances.
        if hasattr(loaded, "to_mesh"):
            mesh = loaded.to_mesh()
        elif hasattr(loaded, "to_geometry"):
            mesh = loaded.to_geometry()
        else:
            mesh = loaded.dump(concatenate=True)
        if not isinstance(mesh, trimesh.Trimesh) or mesh.is_empty:
            raise ValueError(f"{path.name} contains no mesh geometry")
    elif isinstance(loaded, trimesh.Trimesh):
        mesh = loaded.copy()
    else:
        raise TypeError(f"unsupported loaded type: {type(loaded).__name__}")
    mesh.remove_infinite_values()
    mesh.merge_vertices()
    mesh.remove_unreferenced_vertices()
    return mesh, str(detected_units) if detected_units else None


def source_unit_scale(source_units: str, detected_units: str | None, world_units_per_meter: float) -> tuple[float, str]:
    chosen = detected_units.lower() if source_units == "auto" and detected_units else source_units.lower()
    if chosen in ("auto", "world"):
        return 1.0, "unitless-as-world" if chosen == "auto" else "declared-world"
    meters = UNIT_TO_METERS.get(chosen)
    if meters is None:
        raise ValueError(f"unsupported source units: {chosen}")
    return meters * world_units_per_meter, chosen


def center_and_ground(mesh: trimesh.Trimesh) -> None:
    bounds = mesh.bounds
    center = (bounds[0] + bounds[1]) / 2
    mesh.apply_translation([-center[0], -center[1], -bounds[0, 2]])


def normalize_mesh(
    mesh: trimesh.Trimesh,
    up_axis: str,
    unit_scale: float,
    fit: np.ndarray | None,
) -> tuple[trimesh.Trimesh, float]:
    mesh.apply_scale(unit_scale)
    if up_axis == "y":
        mesh.apply_transform(trimesh.transformations.rotation_matrix(math.pi / 2, [1, 0, 0]))
    center_and_ground(mesh)
    fit_scale = 1.0
    if fit is not None:
        extents = np.maximum(mesh.extents, 1e-12)
        fit_scale = float(min(1.0, *(fit / extents)))
        mesh.apply_scale(fit_scale)
        center_and_ground(mesh)
    return mesh, fit_scale


def rounded_points(points: np.ndarray, precision: int) -> list[list[float]]:
    rounded: list[list[float]] = []
    for x, y in points:
        point = [round(float(x), precision), round(float(y), precision)]
        if not rounded or point != rounded[-1]:
            rounded.append(point)
    if len(rounded) > 1 and rounded[0] == rounded[-1]:
        rounded.pop()
    if len({(point[0], point[1]) for point in rounded}) < 3:
        return []
    area2 = sum(
        rounded[i][0] * rounded[(i + 1) % len(rounded)][1]
        - rounded[(i + 1) % len(rounded)][0] * rounded[i][1]
        for i in range(len(rounded))
    )
    if abs(area2) <= 10 ** (-precision * 2):
        return []
    rounded.append(rounded[0].copy())
    return rounded


def contours_for_layers(
    mesh: trimesh.Trimesh,
    requested_height: float,
    precision: int,
    max_layers: int,
    max_points: int,
) -> tuple[list[dict], float]:
    height = float(mesh.bounds[1, 2] - mesh.bounds[0, 2])
    if not math.isfinite(height) or height <= 0:
        raise ValueError("mesh has no finite positive height")
    layer_count = max(1, math.ceil(height / requested_height))
    if layer_count > max_layers:
        raise ValueError(f"requested slicing needs {layer_count} layers; limit is {max_layers}")
    effective_height = height / layer_count
    offsets = (np.arange(layer_count, dtype=float) + 0.5) * effective_height
    sections = mesh.section_multiplane(
        plane_origin=[0.0, 0.0, float(mesh.bounds[0, 2])],
        plane_normal=[0.0, 0.0, 1.0],
        heights=offsets,
    )
    layers: list[dict] = []
    total_points = 0
    for offset, section in zip(offsets, sections):
        contours: list[list[list[float]]] = []
        if section is not None:
            for polyline in section.discrete:
                contour = rounded_points(np.asarray(polyline), precision)
                if contour:
                    total_points += len(contour)
                    if total_points > max_points:
                        raise ValueError(f"contour point budget exceeded ({max_points})")
                    contours.append(contour)
        if contours:
            layers.append({"height": round(float(offset), precision), "contours": contours})
    if not layers:
        raise ValueError("no closed boundary contours were generated")
    return layers, effective_height


def component_report(mesh: trimesh.Trimesh) -> Iterable[dict]:
    for index, component in enumerate(mesh.split(only_watertight=False)):
        yield {
            "index": index,
            "faces": int(len(component.faces)),
            "vertices": int(len(component.vertices)),
            "watertight": bool(component.is_watertight),
            "grounded": bool(abs(float(component.bounds[0, 2])) <= 1e-6),
            "extents": [round(float(value), 6) for value in component.extents],
        }


def dependency_versions() -> dict[str, str]:
    result = {"pythonMinimum": "3.10", "tool": TOOL_VERSION}
    for package in ("trimesh", "numpy", "scipy", "networkx", "shapely", "lxml"):
        try:
            result[package] = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            result[package] = "not-installed"
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Input GLB/GLTF/OBJ/STL/PLY/3MF mesh")
    parser.add_argument("output", type=Path, help="Output admission/contour JSON")
    parser.add_argument("--source-license", required=True, help="Per-asset license or ownership declaration, e.g. CC0-1.0")
    parser.add_argument("--source-url", help="Canonical asset page or provenance URL")
    parser.add_argument("--source-author", help="Creator/organization name")
    parser.add_argument("--asset-id", help="Stable project asset id; defaults to the input stem")
    parser.add_argument("--layer-height", type=float, default=0.1, help="Maximum layer height in world units")
    parser.add_argument("--up-axis", choices=("y", "z"), default="y", help="Up axis used by the source asset")
    parser.add_argument("--source-units", default="auto", choices=("auto", "world", "mm", "cm", "m", "in", "ft"))
    parser.add_argument("--world-units-per-meter", type=float, default=1.0)
    fit_group = parser.add_mutually_exclusive_group()
    fit_group.add_argument("--profile", choices=tuple(PROFILE_ENVELOPES), help="Fit to a runtime printer's safe volume")
    fit_group.add_argument("--fit-envelope", type=parse_envelope, help="Maximum X,Y(horizontal depth),Z(up) volume")
    parser.add_argument("--precision", type=int, default=5, help="JSON decimal places (0-8)")
    parser.add_argument("--max-layers", type=int, default=4096)
    parser.add_argument("--max-points", type=int, default=2_000_000)
    parser.add_argument("--max-faces", type=int, default=2_000_000)
    parser.add_argument("--allow-multiple-bodies", action="store_true", help="Allow disconnected bodies after reporting them")
    parser.add_argument("--require-watertight", action="store_true", help=argparse.SUPPRESS)  # backwards-compatible; strict is now default
    args = parser.parse_args()

    numeric = (args.layer_height, args.world_units_per_meter)
    if not all(math.isfinite(value) and value > 0 for value in numeric):
        parser.error("layer height and world-units-per-meter must be finite and positive")
    if not 0 <= args.precision <= 8:
        parser.error("--precision must be between 0 and 8")
    if min(args.max_layers, args.max_points, args.max_faces) < 1:
        parser.error("resource limits must be positive")
    if not args.input.exists() or not args.input.is_file():
        parser.error(f"input does not exist or is not a file: {args.input}")

    envelope = PROFILE_ENVELOPES.get(args.profile) if args.profile else args.fit_envelope
    mesh, detected_units = load_mesh(args.input)
    if len(mesh.faces) > args.max_faces:
        parser.error(f"mesh has {len(mesh.faces)} faces; limit is {args.max_faces}")
    original_extents = mesh.extents.copy()
    unit_scale, units_status = source_unit_scale(args.source_units, detected_units, args.world_units_per_meter)
    mesh, fit_scale = normalize_mesh(mesh, args.up_axis, unit_scale, envelope)
    components = list(component_report(mesh))
    body_count = int(mesh.body_count)
    rejected: list[str] = []
    if not mesh.is_watertight:
        rejected.append("mesh is not watertight")
    if not mesh.is_winding_consistent:
        rejected.append("mesh winding is inconsistent")
    if body_count != 1 and not args.allow_multiple_bodies:
        rejected.append(f"mesh has {body_count} disconnected bodies; expected 1")
    if any(not component["grounded"] for component in components):
        rejected.append("one or more components do not contact the build plane")

    layers: list[dict] = []
    effective_height: float | None = None
    if not rejected:
        try:
            layers, effective_height = contours_for_layers(mesh,args.layer_height,args.precision,args.max_layers,args.max_points)
        except (ValueError, RuntimeError) as error:
            rejected.append(str(error))

    admitted = not rejected
    report = {
        "schema": "world-printer-layer-paths@1",
        "contourType": "boundary-contours",
        "admitted": admitted,
        "rejectedReasons": rejected,
        "provenance": {
            "assetId": args.asset_id or args.input.stem,
            "filename": args.input.name,
            "sha256": sha256_file(args.input),
            "sourceUrl": args.source_url,
            "sourceAuthor": args.source_author,
            "sourceLicense": args.source_license,
        },
        "implementation": dependency_versions(),
        "sourceUpAxis": args.up_axis,
        "normalizedUpAxis": "z",
        "sourceUnits": args.source_units,
        "detectedUnits": detected_units,
        "unitsInterpretation": units_status,
        "worldUnitsPerMeter": args.world_units_per_meter,
        "requestedLayerHeight": args.layer_height,
        "effectiveLayerHeight": effective_height,
        "unitScale": unit_scale,
        "fitScale": fit_scale,
        "profile": args.profile,
        "safeFitEnvelope": envelope.tolist() if envelope is not None else None,
        "originalExtents": [round(float(value), args.precision) for value in original_extents],
        "bounds": [[round(float(value), args.precision) for value in row] for row in mesh.bounds],
        "health": {
            "watertight": bool(mesh.is_watertight),
            "windingConsistent": bool(mesh.is_winding_consistent),
            "volume": round(float(mesh.volume), args.precision) if mesh.is_volume else None,
            "bodyCount": body_count,
            "components": components,
        },
        "layerCount": len(layers),
        "layers": layers,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2),encoding="utf-8")
    print(json.dumps({"output":str(args.output),"admitted":admitted,"layers":len(layers),"watertight":bool(mesh.is_watertight),"unitScale":unit_scale,"fitScale":fit_scale}))
    return 0 if admitted else 2


if __name__ == "__main__":
    raise SystemExit(main())
