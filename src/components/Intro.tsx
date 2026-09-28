"use client";

import { useEffect, useState } from "react";
import { jarvis } from "@/lib/jarvis";
import { state } from "@/lib/state";

/**
 * The boot gate. It waits for the 3D scene, then asks the visitor to "Initialize": that click is what lets the
 * browser play JARVIS's voice later (audio is blocked until the page is clicked).
 */
export default function Intro() {
  const [ready, setReady] = useState(false);
  const [pct, setPct] = useState(0);
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const done = () => setReady(true);
    if (window.__sceneReady) done();
    window.addEventListener("scene-ready", done);
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      setPct((p) => {
        const target = window.__sceneReady ? 100 : Math.min(92, 100 * (1 - Math.exp(-t * 0.9)));
        return Math.max(p, Math.ceil(p + (target - p) * 0.2));
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("scene-ready", done);
      cancelAnimationFrame(raf);
    };
  }, []);

  const enter = (sound: boolean) => {
    jarvis.unlock(sound);
    state.started = true;
    state.lenis?.start();
    document.documentElement.removeAttribute("data-loading");
    document.documentElement.dataset.sound = sound ? "on" : "off";
    window.dispatchEvent(new Event("sound-change"));
    setLeaving(true);
    window.setTimeout(() => setGone(true), 1100);
  };

  // dev shortcut: /?skip jumps straight in, silently
  useEffect(() => {
    if (!ready || process.env.NODE_ENV === "production" || !location.search.includes("skip")) return;
    const id = window.setTimeout(() => enter(false), 0);
    return () => window.clearTimeout(id);
  }, [ready]);

  if (gone) return null;
  const canEnter = ready && pct >= 100;
  return (
    <div className={`intro ${leaving ? "is-leaving" : ""}`} role="dialog" aria-label="Start">
      <div className="intro-ring" aria-hidden>
        <svg viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="92" className="r1" />
          <circle cx="100" cy="100" r="78" className="r2" />
          <circle cx="100" cy="100" r="64" className="r3" style={{ strokeDashoffset: 402 - (402 * pct) / 100 }} />
        </svg>
        <span className="intro-pct">{String(pct).padStart(3, "0")}</span>
      </div>
      <p className="intro-label">{canEnter ? "All systems ready" : "Booting workstation"}</p>
      <div className={`intro-actions ${canEnter ? "is-ready" : ""}`}>
        <button className="btn btn-big" onClick={() => enter(true)} disabled={!canEnter}>
          Initialize <span aria-hidden>⏻</span>
        </button>
        <button className="intro-mute" onClick={() => enter(false)} disabled={!canEnter}>
          enter without sound
        </button>
      </div>
      <p className="intro-note">Best with sound on 🎧</p>
    </div>
  );
}
