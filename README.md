# Workstation portfolio

A scroll-driven 3D portfolio: a developer at a triple-monitor setup. The camera starts on their face, orbits
round behind the chair, then glides past their shoulder onto the centre monitor, which is a small scrolling website of its own.
The content is real HTML pinned exactly onto the 3D screen.

Next.js 16 (static export) · React Three Fiber · drei · postprocessing · Lenis.

Live: https://prabalholla-workstation.netlify.app. Every push to `main` deploys automatically on Netlify.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in out/
```

## How it fits together

| File | What it does |
| --- | --- |
| `src/lib/timeline.ts` | The scroll track: three camera stops (face, desk, screen) and the scroll length of each section on the screen. |
| `src/lib/shots.ts` | The camera shot for each stop and the easing between them. |
| `src/components/three/Rig.tsx` | Drives the camera and writes the centre monitor's on-screen rectangle into CSS vars (`--sx/--sy/--sw/--sh`). |
| `src/lib/pin.ts` | Pins the HTML screen panel onto the 3D monitor with a perspective (matrix3d) corner pin, so it sits on the display even while the camera moves. |
| `src/components/Overlay.tsx` | The readable content: the hero, and the page inside the screen (sections that scroll up and animate in, over a parallax background). |
| `src/components/three/ScreenShapes.tsx` + `src/lib/formations.ts` | 3D logos of the tech stack (Simple Icons, CC0, extruded) inside the screen; they regroup into a new formation (cluster, orbit, grid, helix, core) for each section as you scroll. |
| `src/components/three/screenFeeds.ts` | The aurora artwork that runs across all three monitors, drawn to canvas textures. |
| `src/components/three/Person.tsx` | The character: primitives + live two-bone IK arms, head tracking, blinking, and the chair that swivels round to face you on the first shot. |
| `src/components/three/Workstation.tsx` | Desk, monitors, gaming PC, keyboard, mouse, mug. |
| `src/data/content.ts` | Every word on the site. |

## Swapping in a downloaded model

The person and desk are built from code so they can be posed and lit live. To use a downloaded GLB instead,
load it with drei's `useGLTF` in `Scene.tsx` in place of `<Workstation />` / `<Person />`, then line the monitor
positions in `src/lib/scene.ts` up with the model's screens (the camera shots and the HTML overlay are computed from those).
