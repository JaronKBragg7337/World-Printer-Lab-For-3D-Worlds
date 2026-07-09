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

## License

MIT. Use it, fork it, remix it, build from it. Keep secrets like API keys out of the repo.
