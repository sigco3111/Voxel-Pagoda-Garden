# Voxel Pagoda Garden

A small voxel diorama — a five-tier pagoda surrounded by blossom trees, a koi
pond, stone lanterns and a torii gate — rendered with Three.js and wrapped in
a minimal light-theme dashboard.

## Run it

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
```

Production build:

```bash
npm run build    # outputs the static site to dist/
npm run preview  # serve the production build locally
```

## What's inside

| File          | Purpose                                                             |
| ------------- | ------------------------------------------------------------------- |
| `index.html`  | Page shell, light-theme dashboard markup + styles                   |
| `src/main.js` | Renderer, camera, lights, controls, dashboard wiring, render loop   |
| `src/world.js`| Seeded voxel world builder (pagoda, garden, clouds) → InstancedMesh |

## Notes

- The whole scene renders in a handful of `THREE.InstancedMesh` draw calls
  (one for all static voxels, one per cloud), so it stays around ~5 draws.
- The world is generated from a fixed seed, so the layout is deterministic.
- The dashboard shows voxel count, FPS and draw-call count; buttons toggle
  auto-rotation and reset the camera.
