"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { state } from "@/lib/state";
import { SEGMENTS, stopStart, STOPS, trackAt } from "@/lib/timeline";

/**
 * Lenis smooth scroll, mapped onto the stop track. When the visitor stops scrolling half-way through a move,
 * the page finishes the move for them, so every scroll gesture plays one complete cinematic cut.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
    state.lenis = lenis;
    if (!state.started) lenis.stop();

    let dir = 1;
    let idle = 0;
    let snapping = false;

    const sync = () => {
      state.track = trackAt(lenis.scroll / window.innerHeight);
    };

    const snap = () => {
      if (snapping || !state.started) return;
      const y = lenis.scroll / window.innerHeight;
      for (let i = 1; i < SEGMENTS.length; i++) {
        const s = SEGMENTS[i];
        if (y > s.transStart && y < s.dwellStart) {
          const u = (y - s.transStart) / (s.dwellStart - s.transStart);
          if (u < 0.015 || u > 0.985) return;
          const to = dir > 0 ? s.dwellStart : s.transStart;
          snapping = true;
          lenis.scrollTo(to * window.innerHeight, {
            duration: i === 1 ? 2.2 : 1.05,
            easing: (t) => 1 - Math.pow(1 - t, 3),
            onComplete: () => void (snapping = false),
          });
          window.setTimeout(() => void (snapping = false), 2600);
          return;
        }
      }
    };

    lenis.on("scroll", (l: Lenis) => {
      sync();
      if (l.direction) dir = l.direction;
      window.clearTimeout(idle);
      idle = window.setTimeout(snap, 170);
    });
    window.addEventListener("resize", sync);
    sync();

    // keyboard: arrows / page keys jump a whole stop
    const onKey = (e: KeyboardEvent) => {
      if (!state.started) return;
      const k = e.key;
      const fwd = k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey);
      const back = k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey);
      if (!fwd && !back) return;
      const target = (e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable]");
      if (target) return;
      e.preventDefault();
      const cur = Math.round(state.track.p);
      const next = Math.max(0, Math.min(STOPS.length - 1, cur + (fwd ? 1 : -1)));
      lenis.scrollTo(stopStart(next) * window.innerHeight, { duration: next === 1 || cur === 1 ? 2.2 : 1.1 });
    };
    window.addEventListener("keydown", onKey);

    let raf = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(idle);
      window.removeEventListener("resize", sync);
      window.removeEventListener("keydown", onKey);
      lenis.destroy();
      state.lenis = null;
    };
  }, []);

  return null;
}

/** Scroll to a stop (and optionally a tab within it). */
export function goTo(stop: number, page?: number) {
  const l = state.lenis;
  if (!l) return;
  const s = SEGMENTS[stop];
  const pages = STOPS[stop].pages;
  const y = page === undefined ? s.dwellStart : s.dwellStart + ((page + 0.5) / pages) * (s.dwellEnd - s.dwellStart);
  const far = Math.abs(Math.round(state.track.p) - stop) > 1;
  l.scrollTo(y * window.innerHeight, { duration: far ? 2.4 : 1.2 });
}
