"use client";

import { useEffect, useRef } from "react";
import { profile } from "@/data/content";
import { state } from "@/lib/state";
import { TRACK } from "@/lib/timeline";
import { goToStop } from "./SmoothScroll";

/** Just the name (back to the top) and a hairline of scroll progress. */
export default function Hud() {
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = -1;
    const loop = () => {
      const l = state.lenis;
      if (l && bar.current) {
        const p = Math.round(Math.min(l.scroll / (TRACK * window.innerHeight), 1) * 1000) / 1000;
        if (p !== last) {
          last = p;
          bar.current.style.transform = `scaleX(${p})`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="hud">
      <button className="brand" onClick={() => goToStop(0)} aria-label="Back to the top">
        <span className="brand-mark">PH</span>
        <span className="brand-name">
          {profile.name}
          <small>{profile.role}</small>
        </span>
      </button>
      <span className="progress" aria-hidden>
        <span ref={bar} />
      </span>
    </div>
  );
}
