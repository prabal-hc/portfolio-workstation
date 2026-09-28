"use client";

import { useEffect, useState } from "react";
import { profile } from "@/data/content";
import { jarvis } from "@/lib/jarvis";
import { STOPS } from "@/lib/timeline";
import { state } from "@/lib/state";
import { goTo } from "./SmoothScroll";

export default function Hud() {
  const [active, setActive] = useState(0);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    let raf = 0;
    let last = -1;
    let lastP = -1;
    const bar = document.querySelector<HTMLElement>(".progress i");
    const loop = () => {
      const i = Math.round(Math.max(0, Math.min(STOPS.length - 1, state.shown)));
      if (i !== last) {
        last = i;
        setActive(i);
      }
      // a transform on one element: no style recalculation for the rest of the page
      const p = Math.round((state.shown / (STOPS.length - 1)) * 500) / 500;
      if (p !== lastP && bar) {
        lastP = p;
        bar.style.transform = `scaleX(${p})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onSound = () => setSound(jarvis.enabled);
    window.addEventListener("sound-change", onSound);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("sound-change", onSound);
    };
  }, []);

  const toggle = () => {
    jarvis.setEnabled(!sound);
    setSound(!sound);
    document.documentElement.dataset.sound = !sound ? "on" : "off";
  };

  return (
    <div className="hud">
      <button className="brand" onClick={() => goTo(0)} aria-label="Back to the top">
        <span className="brand-mark">PH</span>
        <span className="brand-name">
          {profile.name}
          <small>{profile.role}</small>
        </span>
      </button>

      <button className={`sound ${sound ? "is-on" : ""}`} onClick={toggle} aria-pressed={sound} aria-label={sound ? "Mute sound" : "Turn sound on"}>
        <span className="bars" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
        {sound ? "Sound on" : "Sound off"}
      </button>

      <nav className="stops" aria-label="Sections">
        {STOPS.map((s, i) => (
          <button key={s.id} className={i === active ? "is-on" : ""} onClick={() => goTo(i)} aria-current={i === active ? "step" : undefined}>
            <span className="stop-label">{s.label}</span>
            <span className="stop-num">{String(i).padStart(2, "0")}</span>
          </button>
        ))}
      </nav>

      <div className="readout" aria-hidden>
        <span className="blink" /> SYS.ONLINE · CAM {String(active).padStart(2, "0")} · {STOPS[active].label.toUpperCase()}
        <span className="progress">
          <i />
        </span>
      </div>
    </div>
  );
}
