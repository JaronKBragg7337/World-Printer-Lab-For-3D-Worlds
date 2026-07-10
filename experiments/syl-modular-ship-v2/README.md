# SYL Modular Ship V2 — section-first experiment

This route preserves the earlier walkable ship prototype and tests a different construction hierarchy:

```text
Ship
→ major sections
→ section subassemblies
→ printable pieces
```

## Route

```text
/experiments/syl-modular-ship-v2/
```

Query helpers:

- `?auto=1` assembles every section in sequence.
- `?instant=1` opens with the finished ship.

## Major sections

1. Rear entry and pressure door
2. Cargo hall pressure module
3. Systems spine pressure module
4. Cockpit pressure module
5. Port wing
6. Starboard wing
7. Port thruster
8. Starboard thruster
9. Landing gear

Each section owns its own printable pieces and must become visually whole before it is considered complete. Section interfaces use deliberate collars, thresholds, spars, pylons and couplers rather than generic cover plates.

## Gap-prevention method

The pressure modules are not made from tangent boxes with space between them. Their floor, sidewall and curved roof pieces are custom closed prism geometries whose neighboring edges use the same coordinates. Visible seams remain, but the pieces meet directly.

Cargo, systems and cockpit dimensions may differ. Their boundaries are joined by explicit inter-module collars that are treated as structural connector pieces.

## Functional dependency prototype

```text
pilot input
→ flight-control core
→ command bus in systems spine
→ port and starboard thruster couplers
→ port and starboard thruster cores
```

The prototype reports whether this chain is complete. It does not yet connect to authoritative SYL flight physics.

## Safety boundary

This remains an isolated World Printer experiment. It does not change:

- the canonical printer runtime;
- Heartbeat Observatory;
- `SYL-Full-Game`;
- persistence or multiplayer;
- Claude's pending verification work.
