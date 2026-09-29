import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { profile } from "@/data/content";

/**
 * The card LinkedIn (and every other site) shows when the portfolio link is shared.
 * Rendered once at build time into a static PNG.
 */
export const dynamic = "force-static";
export const alt = "Prabal Holla — Frontend Developer. An interactive 3D workstation portfolio.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STACK = ["React", "Next.js", "TypeScript", "Three.js"];

/** The site's own typeface (Sora), read from the package at build time. */
const sora = (weight: number) => readFile(join(process.cwd(), `node_modules/@fontsource/sora/files/sora-latin-${weight}-normal.woff`));

/** A soft glow centred at (x, y): satori does not fade "closest-side" gradients, so spell the falloff out. */
const glowAt = (rgb: string, a: number, x: number, y: number) =>
  `radial-gradient(circle 520px at ${x}px ${y}px, rgba(${rgb},${a}) 0%, rgba(${rgb},${(a * 0.4).toFixed(3)}) 45%, rgba(${rgb},0) 100%)`;

export default async function OpengraphImage() {
  const [regular, semibold, extrabold] = await Promise.all([sora(400), sora(600), sora(800)]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          // aurora glow, the same palette as the monitors, painted as layered backgrounds on the card itself
          backgroundColor: "#05070b",
          backgroundImage: [
            glowAt("255,106,26", 0.5, 160, 120),
            glowAt("123,92,255", 0.5, 1020, 420),
            glowAt("58,215,255", 0.3, 800, 800),
          ].join(", "),
          color: "#eef1f5",
          fontFamily: "Sora",
          overflow: "hidden",
        }}
      >

        {/* left: who */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 60px 72px", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 54, height: 54, border: "3px solid #ff6a1a", color: "#ff6a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800 }}>
              PH
            </div>
            <div style={{ fontSize: 18, letterSpacing: 5, color: "#8a95a6", textTransform: "uppercase" }}>Portfolio · 2026</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, color: "#8a95a6", marginBottom: 10 }}>Hi, I&apos;m</div>
            <div style={{ fontSize: 104, fontWeight: 800, lineHeight: 0.92, letterSpacing: -3, display: "flex", flexDirection: "column" }}>
              <span>PRABAL</span>
              <span style={{ display: "flex" }}>
                HOLLA<span style={{ color: "#ff6a1a" }}>.</span>
              </span>
            </div>
            <div style={{ fontSize: 30, color: "#c9d2de", marginTop: 26 }}>{profile.role}</div>
            <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
              {STACK.map((s) => (
                <div key={s} style={{ fontSize: 20, padding: "8px 16px", border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.05)", color: "#e8edf3" }}>
                  {s}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, color: "#ff6a1a", letterSpacing: 2 }}>
            <div style={{ width: 40, height: 3, background: "#ff6a1a" }} />
            STEP INSIDE THE 3D WORKSTATION →
          </div>
        </div>

        {/* right: a monitor showing the site */}
        <div style={{ display: "flex", flexDirection: "column", position: "absolute", right: 64, top: 118, width: 440, height: 394, border: "2px solid rgba(255,255,255,0.14)", background: "rgba(8,9,18,0.82)", boxShadow: "0 0 80px rgba(123,92,255,0.35)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", height: 46, borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: 14, letterSpacing: 3, color: "#8a95a6" }}>
            <span style={{ display: "flex", gap: 10 }}>
              <span style={{ color: "#ff6a1a", fontWeight: 800 }}>PH</span>
              <span style={{ color: "#eef1f5" }}>01</span>/ 05 ABOUT
            </span>
            <span style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} style={{ width: i === 0 ? 26 : 10, height: 2, background: i === 0 ? "#ff6a1a" : "rgba(255,255,255,0.3)" }} />
              ))}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", padding: "34px 30px", flex: 1, position: "relative" }}>
            <div style={{ position: "absolute", right: 18, top: 10, fontSize: 170, fontWeight: 800, color: "rgba(255,255,255,0.05)" }}>01</div>
            <div style={{ fontSize: 14, letterSpacing: 4, color: "#ff6a1a" }}>— ABOUT</div>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, marginTop: 14, display: "flex", flexDirection: "column" }}>
              <span>BUILDING FOR</span>
              <span>THE WEB,</span>
              <span>OBSESSIVELY.</span>
            </div>
            <div style={{ display: "flex", gap: 30, marginTop: 34 }}>
              {[
                ["2.5+", "YEARS"],
                ["5+", "APPS"],
                ["30+", "COMPONENTS"],
              ].map(([v, k]) => (
                <div key={k} style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: "#ff6a1a" }}>{v}</span>
                  <span style={{ fontSize: 12, letterSpacing: 3, color: "#6b7687" }}>{k}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* monitor stand */}
        <div style={{ position: "absolute", right: 268, top: 512, width: 32, height: 44, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", right: 214, top: 554, width: 140, height: 8, background: "rgba(255,255,255,0.1)" }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Sora", data: regular, weight: 400, style: "normal" },
        { name: "Sora", data: semibold, weight: 600, style: "normal" },
        { name: "Sora", data: extrabold, weight: 800, style: "normal" },
      ],
    },
  );
}
