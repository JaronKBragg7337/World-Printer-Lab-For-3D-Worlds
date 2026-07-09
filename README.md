# World Printer Lab For 3D Worlds

Standalone visual proof lab for a Three.js world where players can type or speak object requests into existence.

This repo is intentionally separate from Fable Survival and Heartbeat Observatory so the visual language is not contaminated by the current block/rectangle placeholder style.

## Purpose

Prove this loop:

```text
text or voice command
→ approved object recipe
→ ghost preview
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

## Run locally

```bash
npm install
npm run dev
```

## Deploy on Vercel

Use the **Vite** preset.

```text
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

## License

MIT. Use it, fork it, remix it, build from it. Keep secrets like API keys out of the repo.
