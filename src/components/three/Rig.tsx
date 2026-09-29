"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { state } from "@/lib/state";
import { easeTrack, poseAt, type CameraPose } from "@/lib/shots";
import { SCREEN, STOPS } from "@/lib/timeline";
import { isSideLayout } from "@/lib/layout";
import { aim, cornerPin, screenCorners } from "@/lib/pin";

const _r = new THREE.Vector3();
const landed = new THREE.PerspectiveCamera();
const landedPose: CameraPose = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 35, shift: 0, lift: 0 };

/** How quickly the camera catches up with the scroll (higher = tighter). */
const FOLLOW = 5.5;

/** True once the camera has landed on the screen: nothing in view moves, so the scene can stop rendering. */
export function cameraAtRest() {
  return easeTrack(state.track.p) === SCREEN && Math.abs(state.shown - SCREEN) < 1e-4;
}

/** Drives the camera from the scroll, and tells the DOM where the centre screen is. */
export function Rig() {
  const pose = useMemo<CameraPose>(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 35, shift: 0, lift: 0 }), []);
  const parallax = useRef({ x: 0, y: 0 });
  const dom = useRef<{ rect: string; vis: string; stop: string; tf: string; layer: HTMLElement | null; panel: HTMLElement | null }>({
    rect: "",
    vis: "",
    stop: "",
    tf: "",
    layer: null,
    panel: null,
  });

  useFrame((st, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const cam = st.camera as THREE.PerspectiveCamera;
    const { width, height } = st.size;
    const aspect = width / height;
    const side = isSideLayout(width, height);

    const target = easeTrack(state.track.p);
    state.shown = THREE.MathUtils.damp(state.shown, target, FOLLOW, dt);
    if (Math.abs(state.shown - target) < 1e-4) state.shown = target;

    poseAt(state.shown, aspect, side, pose);

    // a touch of mouse parallax and breathing on the first shot only
    const hero = THREE.MathUtils.clamp(1 - state.shown, 0, 1);
    const px = parallax.current;
    px.x = THREE.MathUtils.damp(px.x, st.pointer.x, 2.5, dt);
    px.y = THREE.MathUtils.damp(px.y, st.pointer.y, 2.5, dt);
    if (hero > 0) {
      _r.copy(pose.target).sub(pose.pos).cross(cam.up).normalize();
      pose.pos.addScaledVector(_r, px.x * 0.08 * hero);
      pose.pos.y += px.y * 0.05 * hero + Math.sin(st.clock.elapsedTime * 0.5) * 0.012 * hero;
    }

    cam.position.copy(pose.pos);
    cam.lookAt(pose.target);
    cam.fov = pose.fov;
    cam.setViewOffset(width, height, (-pose.shift * width) / 2, (pose.lift * height) / 2, width, height);
    cam.updateProjectionMatrix();

    // ---- DOM hand-off (variables live on the overlay layer, so changing them never restyles the page) -------
    const d = dom.current;
    const layer = (d.layer ??= document.querySelector<HTMLElement>(".overlay"));
    if (!layer) return;

    // The screen panel is laid out at the size the monitor has once the camera has landed (so its text never
    // reflows), then a perspective transform pins its four corners onto the monitor's four corners on screen.
    // While the camera is still moving in, it therefore sits exactly on the display, at whatever angle.
    const vis = STOPS.map((s, i) => Math.max(0, 1 - Math.abs(state.shown - i) * 3));
    const panel = (d.panel ??= layer.querySelector<HTMLElement>(".screen"));
    if (panel && state.shown > SCREEN - 0.6) {
      poseAt(SCREEN, aspect, side, landedPose);
      aim(landed, landedPose, width, height);
      const rest = screenCorners(landed, width, height);
      const now = screenCorners(cam, width, height);
      if (rest) {
        const [tl, tr, bl, br] = rest;
        const x = Math.min(tl[0], bl[0]);
        const y = Math.min(tl[1], tr[1]);
        const w = Math.max(tr[0], br[0]) - x;
        const h = Math.max(bl[1], br[1]) - y;
        const rect = `${x.toFixed(1)}|${y.toFixed(1)}|${w.toFixed(1)}|${h.toFixed(1)}`;
        if (rect !== d.rect) {
          d.rect = rect;
          layer.style.setProperty("--sx", `${x.toFixed(1)}px`);
          layer.style.setProperty("--sy", `${y.toFixed(1)}px`);
          layer.style.setProperty("--sw", `${w.toFixed(1)}px`);
          layer.style.setProperty("--sh", `${h.toFixed(1)}px`);
        }
        if (side && now) {
          // fade in over the last stretch of the move, already sitting on the monitor
          vis[SCREEN] = THREE.MathUtils.smoothstep(state.shown, SCREEN - 0.45, SCREEN - 0.08);
          const m = cornerPin(w, h, now.map(([px, py]) => [px - x, py - y]));
          const tf = m ? `matrix3d(${m.map((v) => v.toFixed(6)).join(",")})` : "none";
          if (tf !== d.tf) {
            d.tf = tf;
            panel.style.transform = tf;
          }
        } else {
          vis[SCREEN] = Math.max(0, 1 - Math.abs(state.shown - SCREEN) * 6);
          if (d.tf !== "none") {
            d.tf = "none";
            panel.style.transform = "none";
          }
        }
      }
    } else {
      vis[SCREEN] = 0;
    }

    const visKey = vis.map((x) => x.toFixed(2)).join(",");
    if (visKey !== d.vis) {
      d.vis = visKey;
      STOPS.forEach((s, i) => layer.style.setProperty(`--v-${s.id}`, vis[i].toFixed(2)));
    }
    const nearest = Math.round(THREE.MathUtils.clamp(state.shown, 0, SCREEN));
    const stop = vis[nearest] > 0.5 ? STOPS[nearest].id : "";
    if (stop !== d.stop) {
      d.stop = stop;
      document.documentElement.dataset.stop = stop;
    }
  });

  return null;
}
