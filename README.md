# World Printer Lab For 3D Worlds

Standalone visual proof lab for a Three.js world where players can type or speak object requests into existence.

This repo is intentionally separate from Fable Survival and Heartbeat Observatory so the visual language is not contaminated by the current block/rectangle placeholder style.

## Purpose

Prove this loop:

```text
text or voice command
→ approved object recipe
→ visible printer-bed fabrication
→ finished object waits on the print bed
→ player picks it up
→ ghost placement preview
→ player places it
→ shaped object appears in the same Three.js world
```

The object language should move toward shaped, stylized, readable silhouettes:

- curved cottage roofs
- arched doors
- layered trees
- cart wheels and rails
- arched bridges
- market stalls with canopy shape
- boats with hull forms
- a printer station with rails, nozzle, bed, cable, and moving parts

## Current prototype features

- real Three.js scene, not CSS 3D
- mobile-friendly collapsed UI
- printer nozzle animation
- visible layer-contour fabrication on the printer bed
- finished print pickup stage
- placement preview after pickup
- move, rotate, place, cancel, and delete controls
- browser-native speech recognition when supported

## Parallel v2 folder (safe experimentation)

A complete parallel copy lives in the `v2/` folder:

- `v2/index.html` → open this for the experimental improved version
- `v2/src/main-v2.js` → starting point for higher-fidelity printer model, better printing animation, and realistic PBR + procedural textures
- `v2/src/style.css` → baseline styles

**The root remains the stable, untouched v1.**
You can always fall back to the original by opening the root `index.html` or the main deployed URL. The `v2/` version is where we will iterate on closer matching to high-quality Three.js printer/CNC demos (detailed mechanical models, authentic layer deposition with visible lines + glow, PBR materials with procedural textures for wood/metal/plastic, etc.) while preserving the core "print on bed → pickup → place in world" workflow.

This structure gives us both safety and rapid iteration without risking the working version.

## AI-agent capability note

This prototype is also a workflow proof: a user on a phone in the ChatGPT app was able to describe the desired behavior, inspect screenshots, and have an AI agent patch the connected GitHub repository using app connectors. The important lesson for other AI agents is not that every task is easy; it is that capability should be tested against the live toolchain before assuming the work must wait for a different session, desktop access, or a local-only coding environment.

The practical loop used here was:

```text
user reports live behavior from mobile screenshots
→ agent inspects the connected repo
→ agent writes a stricter implementation path
→ agent updates the app entrypoint
→ Vercel can redeploy from the committed repo state
→ user validates the behavior in the browser
```

When an agent has repository and deployment connectors, it should map the available tools, verify the live state, and attempt a bounded patch before deferring the task. The standard is not confidence from assumption; the standard is proof from the actual connected environment.

## Run locally

```bash
npm install
npm run dev
```

Open `index.html` (v1) or `v2/index.html` (v2) directly, or use the Vite dev server.

## Deploy on Vercel

Use the **Vite** preset.

```text
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Both root and the `v2/` static folder will be available after deploy.

## Live on Heartbeat Observatory (vendored copy — read this before shipping)

As of 2026-07-09, **v2d is live on the real site** at:

```text
https://www.heartbeatobservatory.com/3DPrinterAsset/
```

It is reachable from the homepage grid ("3D Printer" card) so nobody has to type the URL.

**How it's hosted — important for other AI agents (ChatGPT/Grok/Claude):**
The live version is a **build-free vendored copy** that lives in the *Heartbeat Observatory* repo at `heartbeat-observatory/3DPrinterAsset/`, not a deploy of this repo. It runs the raw source directly in the browser via an import map (Three.js is vendored as static files), so there is **no build step**.

⚠️ **Pushing to THIS repo does not update the live site.** To ship a change to the live printer:

1. Make/verify the change here (e.g. a new `src/main-v2dX.js`).
2. Copy that source into `heartbeat-observatory/3DPrinterAsset/main.js` (drop the `import './style.css'` line — the styles are loaded via `<link>` there). Re-copy `vendor/three.*` only if the Three.js version changes.
3. Open a PR on `heartbeat-observatory` (direct pushes to `main` are blocked); the owner merges to deploy.

See `heartbeat-observatory/HANDOFF.md` for the full session log.

## Building pieces + snapping (2026-07-09)

Individual printable **building pieces** — Block, Wall, Floor, Pillar — built from small bricks via `brickPanel()` and size-parametrised (bigger = more small bricks). Print one, pick it up, move on the integer grid (arrows) and **Up/Down** to stack (Y snaps to 0.5), then Place. Pieces persist + sync like any placement, so players assemble structures piece by piece — the general alternative to a giant printer rig. Snapping is currently grid-based (flush tiling + vertical stacking); true edge-magnet snapping is a later refinement.

## World state + multiplayer (2026-07-09)

Placed objects are the world's source of truth in Supabase (`placements` table), not the repo. The printer lab (`src/main-v2e.js`) does place=INSERT, move/rotate=UPDATE, delete=DELETE, load=SELECT+rebuild, and subscribes to Supabase **Realtime** so every builder's placements/moves/deletes appear live for all connected players (multiplayer). Client-generated row ids avoid duplicate echoes. Any AI can SELECT to map the world or DELETE to clean it up. Independent of the engine's netcode — when the printer is later embedded in `/engine`, the table can coexist or the engine can read from it.

## Roadmap notes (2026-07-09)

Requested next, in priority order:
- **Printer sizes:** a large printer (~5× this one, extended range) for giant buildings that still slices into *small* pieces; a small printer for tiny props; pick size + object in the same menu. Medium = current.
- **Auto-hide menu on build** ✅ (done — menu collapses when a print starts).
- **Clean finished piece** ✅ (done — nozzle-path trail cleared when the print finishes).
- **Small printer: individual pieces + edge-snapping** so players print single pieces and snap them together to make new objects.
- **Camera/menu options** for the player (angles, controls) to support the piece/snapping workflow.
- Slice remaining objects (market stall, cart, tree); `pyramidRoof()` is the blocky "castle-type" roof style.

## License

MIT. Use it, fork it, remix it, build from it. Keep secrets like API keys out of the repo.
