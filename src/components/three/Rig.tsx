"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { state } from "@/lib/state";
import { easeTrack, FOCUS, poseAt, type CameraPose } from "@/lib/shots";
import { STOPS } from "@/lib/timeline";
import { isSideLayout } from "@/lib/layout";
import { MONITORS, SCREEN_H, SCREEN_W, SCREEN_Y } from "@/lib/scene";
import { jarvis } from "@/lib/jarvis";
import { zoomBlur } from "./ZoomBlur";

const _c = new THREE.Vector3();
const _r = new THREE.Vector3();
const _p = new THREE.Vector3();

/** Drives the camera from the scroll, and tells the DOM where the focused screen is. */
export function Rig() {
  const pose = useMemo<CameraPose>(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 35, shift: 0, lift: 0 }), []);
  const last = useMemo(() => new THREE.Vector3(), []);
  const parallax = useRef({ x: 0, y: 0 });
  const dom = useRef<{ rect: string; vis: string; stop: string; page: string; layer?: HTMLElement | null }>({ rect: "", vis: "", stop: "", page: "" });
  const whooshed = useRef(-1);

  useFrame((st, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const cam = st.camera as THREE.PerspectiveCamera;
    const { width, height } = st.size;
    const aspect = width / height;
    const side = isSideLayout(width, height);

    // eased target → damped "shown" position (the orbit glides, the whips snap)
    const target = easeTrack(state.track.p);
    const lambda = state.shown < 1 && target < 1.02 ? 2.8 : 5;
    state.shown = THREE.MathUtils.damp(state.shown, target, lambda, dt);
    if (Math.abs(state.shown - target) < 1e-4) state.shown = target;

    poseAt(state.shown, aspect, side, pose);

    // hero-only mouse parallax (screens must stay put for the DOM overlay)
    const hero = THREE.MathUtils.clamp(1 - state.shown, 0, 1);
    const px = parallax.current;
    px.x = THREE.MathUtils.damp(px.x, st.pointer.x, 2.5, dt);
    px.y = THREE.MathUtils.damp(px.y, st.pointer.y, 2.5, dt);
    _r.copy(pose.target).sub(pose.pos).cross(cam.up).normalize();
    pose.pos.addScaledVector(_r, px.x * 0.08 * hero);
    pose.pos.y += px.y * 0.05 * hero;
    // a slow breathing drift on the hero
    pose.pos.y += Math.sin(st.clock.elapsedTime * 0.5) * 0.012 * hero;

    cam.position.copy(pose.pos);
    cam.lookAt(pose.target);
    if (Math.abs(cam.fov - pose.fov) > 1e-3) cam.fov = pose.fov;
    cam.setViewOffset(width, height, (-pose.shift * width) / 2, (pose.lift * height) / 2, width, height);
    cam.updateProjectionMatrix();

    // speed → crash-zoom blur (the first, orbiting move stays clean)
    const speed = last.distanceTo(cam.position) / Math.max(dt, 1e-3);
    last.copy(cam.position);
    state.speed = THREE.MathUtils.damp(state.speed, speed, 10, dt);
    const whip = state.shown > 1 ? 1 : 0.12;
    if (zoomBlur.effect) zoomBlur.effect.strength = THREE.MathUtils.clamp((state.speed - 0.35) * 0.55 * whip, 0, 1.3);

    // sound cues
    const seg = Math.floor(state.shown);
    const frac = state.shown - seg;
    if (seg >= 1 && frac > 0.08 && frac < 0.6 && whooshed.current !== seg) {
      whooshed.current = seg;
      jarvis.whoosh(0.9);
      jarvis.settle();
    }
    if (frac < 0.02 || frac > 0.98) whooshed.current = -1;
    if (state.started && state.track.p > 0.06) jarvis.greet();
    if (state.track.p < 0.005 && state.shown < 0.02) jarvis.rearm();

    // ---- DOM hand-off --------------------------------------------------------------------------------------
    // Variables go on the overlay layer, not <html>: changing them then only restyles the overlay, not the page.
    const root = document.documentElement;
    const layer = (dom.current.layer ??= document.querySelector<HTMLElement>(".overlay"));
    if (!layer) return;
    const nearest = Math.round(THREE.MathUtils.clamp(state.shown, 0, STOPS.length - 1));
    const focus = FOCUS[STOPS[nearest].id];
    const panelVisible = focus && Math.abs(state.shown - nearest) < 1 / 7;
    if (panelVisible) {
      const m = MONITORS[focus];
      const rx = Math.cos(m.rotY);
      const rz = -Math.sin(m.rotY);
      _c.set(m.x + Math.sin(m.rotY) * 0.0116, SCREEN_Y, m.z + Math.cos(m.rotY) * 0.0116);
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const sx of [-1, 1])
        for (const sy of [-1, 1]) {
          _p.set(_c.x + rx * sx * (SCREEN_W / 2), _c.y + sy * (SCREEN_H / 2), _c.z + rz * sx * (SCREEN_W / 2)).project(cam);
          const x = ((_p.x + 1) / 2) * width;
          const y = ((1 - _p.y) / 2) * height;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      const rect = `${minX.toFixed(1)}|${minY.toFixed(1)}|${(maxX - minX).toFixed(1)}|${(maxY - minY).toFixed(1)}`;
      if (rect !== dom.current.rect) {
        dom.current.rect = rect;
        layer.style.setProperty("--sx", `${minX.toFixed(1)}px`);
        layer.style.setProperty("--sy", `${minY.toFixed(1)}px`);
        layer.style.setProperty("--sw", `${(maxX - minX).toFixed(1)}px`);
        layer.style.setProperty("--sh", `${(maxY - minY).toFixed(1)}px`);
      }
    }

    // per-stop visibility: content fades in only as its shot lands
    const vis = STOPS.map((s, i) => {
      const d = Math.abs(state.shown - i);
      const k = FOCUS[s.id] ? 7 : 3.2;
      return Math.max(0, 1 - d * k);
    });
    const visKey = vis.map((x) => x.toFixed(2)).join(",");
    if (visKey !== dom.current.vis) {
      dom.current.vis = visKey;
      STOPS.forEach((s, i) => layer.style.setProperty(`--v-${s.id}`, vis[i].toFixed(3)));
    }
    const stopId = vis[nearest] > 0.5 ? STOPS[nearest].id : "";
    if (stopId !== dom.current.stop) {
      dom.current.stop = stopId;
      root.dataset.stop = stopId;
      if (stopId && state.shown > 1.5) jarvis.blip(undefined, 2600, 0.025);
    }
    // tabs: only while parked on a stop, so a panel keeps its tab as it fades out
    const tp = Math.round(state.track.p);
    const pages = STOPS[tp].pages;
    if (state.track.dwell >= 0 && pages > 1) {
      const page = `${STOPS[tp].id}:${Math.min(Math.floor(state.track.dwell * pages), pages - 1)}`;
      if (page !== dom.current.page) {
        if (dom.current.page) jarvis.blip(undefined, 3200, 0.018);
        dom.current.page = page;
        const [id, n] = page.split(":");
        root.setAttribute(`data-page-${id}`, n);
      }
    }
  });

  return null;
}
