"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { state } from "@/lib/state";
import { stopStart, TABS, tabAt, tabStart, trackAt } from "@/lib/timeline";

/** Every resting point on the page, in viewport heights: the two wide shots, then each tab on the screen. */
const restPoints = () => [stopStart(0), stopStart(1), ...TABS.map((_, i) => tabStart(i))];

const glide = (y: number) => {
  const l = state.lenis;
  if (!l) return;
  const far = Math.abs(y * window.innerHeight - l.scroll) / window.innerHeight;
  l.scrollTo(y * window.innerHeight, { duration: Math.min(0.9 + far * 0.35, 2.2), easing: (t) => 1 - Math.pow(1 - t, 4) });
};

/** Scroll to a camera stop. */
export const goToStop = (i: number) => glide(stopStart(i));
/** Scroll to a tab on the screen. */
export const goToTab = (i: number) => glide(tabStart(i));

/**
 * Lenis smooth scroll, mapped onto the track. The camera and the tabs are scrubbed straight from the
 * (smoothed) scroll position, so the page moves exactly with the visitor, never on its own.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.8, touchMultiplier: 1.3 });
    state.lenis = lenis;

    const sync = () => {
      const y = lenis.scroll / window.innerHeight;
      state.track = trackAt(y);
      state.tab = tabAt(y);
    };
    lenis.on("scroll", sync);
    window.addEventListener("resize", sync);
    sync();

    // arrows / page keys / space glide to the next resting point
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      const fwd = k === "ArrowDown" || k === "PageDown" || k === "ArrowRight" || (k === " " && !e.shiftKey);
      const back = k === "ArrowUp" || k === "PageUp" || k === "ArrowLeft" || (k === " " && e.shiftKey);
      if (!fwd && !back) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable]")) return;
      e.preventDefault();
      const y = lenis.targetScroll / window.innerHeight;
      const pts = restPoints();
      const next = fwd ? pts.find((p) => p > y + 0.02) : [...pts].reverse().find((p) => p < y - 0.02);
      if (next !== undefined) glide(next);
    };
    window.addEventListener("keydown", onKey);

    let raf = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", sync);
      window.removeEventListener("keydown", onKey);
      lenis.destroy();
      state.lenis = null;
    };
  }, []);

  return null;
}
