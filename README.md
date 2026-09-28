# Workstation portfolio

A scroll-driven 3D portfolio: a developer at a triple-monitor gaming setup. The camera starts on their face, orbits
round behind the chair while JARVIS boots the screens and says "Welcome to my portfolio", then crash-zooms into
one monitor per section. The section content is real HTML laid exactly over the 3D screen.

Next.js 16 (static export) · React Three Fiber · drei · postprocessing · Lenis.

```bash
npm install
npm run dev        # http://localhost:3000  (add ?skip to bypass the intro gate while developing)
npm run build      # static site in out/
```

## How it fits together

| File | What it does |
| --- | --- |
| `src/lib/timeline.ts` | The scroll track: one "stop" per shot, with scroll length for the move in and the dwell (long dwells page through tabs). |
| `src/lib/shots.ts` | Camera shot per stop, the easing (smooth orbit first, fast whips after), the arcs that swing past the person, the FOV punch. |
| `src/components/three/Rig.tsx` | Drives the camera, the zoom blur and the whoosh, and writes the focused monitor's on-screen rectangle into CSS vars (`--sx/--sy/--sw/--sh`). |
| `src/components/Overlay.tsx` | The readable content. Screen panels use those CSS vars to sit exactly on the monitor. |
| `src/components/three/screenFeeds.ts` | What each monitor shows (IDE, terminal, browser, git log, JARVIS boot, the "LET'S BUILD SOMETHING" triptych), drawn to canvas textures. |
| `src/components/three/Person.tsx` | The character: primitives + live two-bone IK arms, head tracking, blinking, chair swivel. |
| `src/components/three/Workstation.tsx` | Desk, monitors, gaming PC, keyboard, arc-reactor desk piece, props. |
| `src/lib/jarvis.ts` | All sound: the startup + voice clips, plus a synthesised room hum and whooshes. |
| `src/data/content.ts` | Every word on the site. |

## The JARVIS sound

When the camera starts swinging behind the chair, the startup clip plays (from `public/audio/`):

| File | Role | If missing |
| --- | --- | --- |
| `jarvis-startup.mp3` | The startup sound. It dips while the voice speaks and drops back once the camera whips to the first screen. | A synthesised power-up + chime |
| `jarvis.voiceClip` (off by default) | An optional separate voice line, laid over the startup sound at `jarvis.voiceAt` seconds. Set both in `src/data/content.ts`. | Nothing: the startup clip carries the greeting on its own |

Browsers block sound until the visitor clicks, which is why the site opens with an **Initialize** button.

## Swapping in a downloaded model

The person and desk are built from code so they can be posed and lit live. To use a downloaded GLB instead,
load it with drei's `useGLTF` in `Scene.tsx` in place of `<Workstation />` / `<Person />`, then line the monitor
positions in `src/lib/scene.ts` up with the model's screens (the camera shots and the HTML overlay are computed from those).
