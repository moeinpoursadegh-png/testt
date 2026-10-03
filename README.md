# Material Flex Lab

An interactive 3D motion study: a polished gold smart-alloy blob is dropped through a floating glass compression rig at 0 / 25 / 50 / 75 / 100 % FLEX.
Vite + TypeScript + Three.js, no external assets.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run preview
```

Controls: play/pause, replay, auto toggle, FLEX scrubber (click a stop or drag). Keys: `Space` play/pause, `←/→` previous/next level, `R` replay.
Debug: `?level=50&t=3.2` pins one frame. `prefers-reduced-motion` starts paused with manual level selection.

Structure: `animation/` (deterministic timeline, motion path, profiles), `objects/` (blob, glass rig, receiver, pedestal), `shaders/` (vertex deformation injected into `MeshPhysicalMaterial`), `scene/`, `ui/`.
