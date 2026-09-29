"use client";

import { useEffect, useState } from "react";
import { profile } from "@/data/content";

/**
 * The opening moment: the name rises in letter by letter while the 3D scene boots, then the cover opens like a
 * curtain (top half up, bottom half down) onto the scene. No clicks needed.
 */
export default function Loader() {
  const [phase, setPhase] = useState<"on" | "leaving" | "gone">("on");

  useEffect(() => {
    let t = 0;
    const start = performance.now();
    const done = () => {
      // hold long enough for the name to finish arriving, so the reveal never cuts it off
      t = window.setTimeout(() => setPhase("leaving"), Math.max(0, 1500 - (performance.now() - start)));
    };
    if (window.__sceneReady) done();
    else window.addEventListener("scene-ready", done, { once: true });
    return () => {
      window.removeEventListener("scene-ready", done);
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (phase !== "leaving") return;
    // lets the hero copy make its entrance (see html:not([data-loading]) in globals.css)
    document.documentElement.removeAttribute("data-loading");
    const t = window.setTimeout(() => setPhase("gone"), 1300);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;
  let n = 0;
  return (
    <div className={`loader ${phase === "leaving" ? "is-leaving" : ""}`} aria-hidden>
      <span className="curtain curtain-top" />
      <span className="curtain curtain-bottom" />
      <div className="loader-inner">
        <p className="loader-name">
          {profile.name.split(" ").map((w, wi) => (
            <span key={wi} className="loader-word">
              {[...w].map((ch, ci) => (
                <span key={ci} className="loader-ch" style={{ animationDelay: `${0.25 + n++ * 0.045}s` }}>
                  {ch}
                </span>
              ))}
              {wi === 1 && <span className="loader-ch stop" style={{ animationDelay: `${0.25 + n * 0.045}s` }}>.</span>}
            </span>
          ))}
        </p>
        <p className="loader-role">{profile.role}</p>
        <span className="loader-line">
          <span />
        </span>
      </div>
    </div>
  );
}
