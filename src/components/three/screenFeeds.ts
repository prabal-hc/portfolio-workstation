import * as THREE from "three";
import type { MonitorId } from "@/lib/scene";
import { isTouchDevice } from "@/lib/layout";

/**
 * The three monitors show ONE artwork: a slow aurora of light ribbons over fine contour lines, drawn on a
 * virtual canvas three screens wide, so it flows continuously across the bezels like an ultra-wide wallpaper.
 * Each monitor paints its own third.
 */
const W = 1280;
const H = 720;
const SCALE = 0.75; // drawn in 1280×720 coordinates, stored at 960×540
const TOUCH = isTouchDevice();
const SLICE: Record<MonitorId, number> = { left: 0, center: 1, right: 2 };

const RIBBONS = [
  { color: "255,106,26", speed: 0.11, phase: 0.0, y: 0.56, amp: 0.2 }, // orange
  { color: "255,42,109", speed: 0.08, phase: 1.9, y: 0.42, amp: 0.16 }, // magenta
  { color: "58,215,255", speed: 0.06, phase: 3.7, y: 0.64, amp: 0.14 }, // cyan
  { color: "123,92,255", speed: 0.09, phase: 5.1, y: 0.34, amp: 0.18 }, // violet
];

let MONO = "monospace";
function readFonts() {
  if (typeof document === "undefined") return;
  MONO = getComputedStyle(document.documentElement).getPropertyValue("--font-mono-face").trim() || "monospace";
}

const CAPTION: Record<MonitorId, string> = {
  left: "design",
  center: "", // the centre screen carries the page itself
  right: "build & ship",
};

function drawArt(ctx: CanvasRenderingContext2D, id: MonitorId, t: number) {
  const ox = SLICE[id] * W; // this monitor's offset in the shared, three-screen-wide canvas

  // night sky base
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#07060f");
  bg.addColorStop(1, "#020306");
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // aurora: each ribbon is a band that drifts along the whole triptych; layered with additive light
  ctx.globalCompositeOperation = "lighter";
  for (const r of RIBBONS) {
    const centre = (x: number) =>
      H * (r.y + r.amp * Math.sin((x + ox) * 0.0011 + t * r.speed + r.phase) + 0.06 * Math.sin((x + ox) * 0.0029 - t * r.speed * 1.7 + r.phase));
    const half = (x: number) => H * (0.1 + 0.07 * Math.sin((x + ox) * 0.0017 + t * r.speed * 1.3 + r.phase * 2));
    // three passes, wide and faint to narrow and brighter, fake a soft glow without blur filters
    for (const [grow, alpha] of [
      [2.2, 0.05],
      [1.3, 0.09],
      [0.55, 0.16],
    ] as const) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 32) ctx.lineTo(x, centre(x) - half(x) * grow);
      for (let x = W; x >= 0; x -= 32) ctx.lineTo(x, centre(x) + half(x) * grow);
      ctx.closePath();
      const my = centre(W / 2);
      const g = ctx.createLinearGradient(0, my - H * 0.4, 0, my + H * 0.4);
      g.addColorStop(0, `rgba(${r.color},0)`);
      g.addColorStop(0.5, `rgba(${r.color},${alpha})`);
      g.addColorStop(1, `rgba(${r.color},0)`);
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  // contour lines, like a topographic map drifting underneath
  ctx.globalCompositeOperation = "source-over";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 22; i++) {
    const y0 = (H * (i + 0.5)) / 22;
    ctx.strokeStyle = `rgba(255,255,255,${0.03 + 0.03 * Math.sin(i * 1.3 + t * 0.4)})`;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 24) {
      const X = x + ox;
      const y = y0 + 26 * Math.sin(X * 0.0035 + i * 0.45 + t * 0.25) + 14 * Math.sin(X * 0.0013 - t * 0.18 + i);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // a few slow, twinkling points of light
  for (let k = 0; k < 18; k++) {
    const seed = k * 97.13 + SLICE[id] * 31.7;
    const x = (Math.sin(seed) * 0.5 + 0.5) * W;
    const y = (Math.sin(seed * 1.7) * 0.5 + 0.5) * H * 0.8;
    const a = 0.25 + 0.35 * Math.max(0, Math.sin(t * 0.8 + seed));
    ctx.fillStyle = `rgba(255,240,230,${a})`;
    ctx.fillRect(x, y, 2.2, 2.2);
  }

  // the display's own falloff, darker at the edges
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  // one quiet caption on each side screen
  if (!CAPTION[id]) return;
  ctx.font = `500 20px ${MONO}`;
  ctx.fillStyle = "rgba(238,241,245,0.42)";
  ctx.fillText(CAPTION[id].toUpperCase(), 48, H - 44);
  ctx.fillStyle = "rgba(255,106,26,0.9)";
  ctx.fillRect(48, H - 78, 28, 3);
}

export class ScreenFeed {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  private last = -1;

  constructor(public id: MonitorId) {
    readFonts();
    this.canvas = document.createElement("canvas");
    this.canvas.width = W * SCALE;
    this.canvas.height = H * SCALE;
    this.ctx = this.canvas.getContext("2d", { alpha: false })!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    // no mipmaps: regenerating them on every upload is the expensive part, and the screens are never tiny
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.anisotropy = 4;
  }

  /** Redraws at most ~15 times a second on desktop, ~8 on phones (and only while the scene is rendering at all). */
  draw(t: number) {
    if (t - this.last < (TOUCH ? 1 / 8 : 1 / 15)) return;
    if (this.last < 0) readFonts();
    this.last = t;
    this.ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    this.ctx.textBaseline = "alphabetic";
    drawArt(this.ctx, this.id, t);
    this.texture.needsUpdate = true;
  }
}
