import * as THREE from "three";
import { experience, jarvis as jarvisCopy, projects, skills } from "@/data/content";
import type { MonitorId } from "@/lib/scene";

/**
 * What each monitor shows, drawn into a 2D canvas that is used as the screen's (glowing) texture.
 * When the camera lands on a screen, the real, crisp, clickable content (Sections.tsx) is laid exactly over it,
 * styled like the same app, so the hand-off is invisible.
 */
export type Mode = "standby" | "jarvis" | "code" | "terminal" | "browser" | "git" | "contact";

const W = 1280;
const H = 720;
const SCALE = 0.75;

const C = {
  bg: "#070a10",
  panel: "#0c1119",
  line: "#18202c",
  text: "#c9d4e3",
  dim: "#566174",
  cyan: "#3ad7ff",
  orange: "#ff6a1a",
  green: "#5ff59a",
  purple: "#b48cff",
  yellow: "#ffd479",
  pink: "#ff5fa8",
};

let MONO = "monospace";
let DISPLAY = "sans-serif";
function readFonts() {
  if (typeof document === "undefined") return;
  const cs = getComputedStyle(document.documentElement);
  MONO = cs.getPropertyValue("--font-mono-face").trim() || "monospace";
  DISPLAY = cs.getPropertyValue("--font-display").trim() || "sans-serif";
}

const CODE = [
  `import { Developer } from "@/people";`,
  ``,
  `export default function About() {`,
  `  return (`,
  `    <Developer`,
  `      name="Prabal Holla"`,
  `      role="Frontend Developer"`,
  `      stack={["React", "Next.js", "TypeScript", "Three.js"]}`,
  `      experience="2.5+ years"`,
  `      basedIn="Bangalore, India"`,
  `      ships={["components", "dashboards", "3D"]}`,
  `      coffee={Infinity}`,
  `    />`,
  `  );`,
  `}`,
];


function drawCodeLine(ctx: CanvasRenderingContext2D, line: string, x: number, y: number) {
  // tiny tokenizer: strings, keywords, JSX tags, braces
  const parts: { s: string; c: string }[] = [];
  const re = /("[^"]*"?)|(\b(?:import|from|export|default|function|return|const)\b)|(<\/?[A-Z]\w*|\/>)|([{}()[\]=,;.])|(\w+)|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m[1]) parts.push({ s: m[1], c: C.green });
    else if (m[2]) parts.push({ s: m[2], c: C.purple });
    else if (m[3]) parts.push({ s: m[3], c: C.cyan });
    else if (m[4]) parts.push({ s: m[4], c: C.dim });
    else if (m[5]) parts.push({ s: m[5], c: /^[A-Z]/.test(m[5]) ? C.yellow : /^(Infinity)$/.test(m[5]) ? C.orange : C.text });
    else parts.push({ s: m[0], c: C.text });
  }
  let cx = x;
  for (const p of parts) {
    ctx.fillStyle = p.c;
    ctx.fillText(p.s, cx, y);
    cx += ctx.measureText(p.s).width;
  }
  return cx;
}

function windowChrome(ctx: CanvasRenderingContext2D, title: string, tabs: string[], active: number, accent: string) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 0, W, 52);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(28 + i * 24, 26, 7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.font = `500 20px ${MONO}`;
  let x = 120;
  tabs.forEach((t, i) => {
    const w = ctx.measureText(t).width + 44;
    if (i === active) {
      ctx.fillStyle = C.bg;
      ctx.fillRect(x, 8, w, 44);
      ctx.fillStyle = accent;
      ctx.fillRect(x, 8, w, 3);
    }
    ctx.fillStyle = i === active ? C.text : C.dim;
    ctx.fillText(t, x + 22, 38);
    x += w + 4;
  });
  ctx.fillStyle = C.dim;
  ctx.textAlign = "right";
  ctx.fillText(title, W - 24, 38);
  ctx.textAlign = "left";
}

function scanlines(ctx: CanvasRenderingContext2D, alpha = 0.06) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
}

function drawStandby(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = "#020305";
  ctx.fillRect(0, 0, W, H);
  const a = 0.25 + 0.2 * Math.sin(t * 1.6);
  ctx.fillStyle = `rgba(58,215,255,${a})`;
  ctx.font = `700 64px ${DISPLAY}`;
  ctx.textAlign = "center";
  ctx.fillText("PH", W / 2, H / 2 + 20);
  ctx.font = `400 20px ${MONO}`;
  ctx.fillStyle = `rgba(86,97,116,${0.6 + 0.3 * Math.sin(t)})`;
  ctx.fillText("standby — scroll to wake", W / 2, H / 2 + 70);
  ctx.textAlign = "left";
}

function arc(ctx: CanvasRenderingContext2D, r: number, a0: number, len: number, w: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2 - 30, r, a0, a0 + len);
  ctx.stroke();
}

function drawJarvis(ctx: CanvasRenderingContext2D, id: MonitorId, t: number, since: number) {
  const k = Math.min((t - since) / 1.6, 1); // boot 0..1
  ctx.fillStyle = "#01060b";
  ctx.fillRect(0, 0, W, H);
  // faint grid
  ctx.strokeStyle = "rgba(58,215,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  if (id === "center") {
    const cy = H / 2 - 30;
    const g = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, 220 * k);
    g.addColorStop(0, "rgba(160,240,255,0.95)");
    g.addColorStop(0.18, "rgba(58,215,255,0.55)");
    g.addColorStop(1, "rgba(58,215,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const rings: [number, number, number, number, number][] = [
      // radius, speed, arc length, segments, width
      [70, 1.2, 1.1, 3, 6],
      [110, -0.7, 0.5, 6, 3],
      [150, 0.4, 1.8, 2, 10],
      [190, -0.25, 0.2, 18, 4],
      [230, 0.15, 2.6, 1, 2],
    ];
    rings.forEach(([r, sp, len, n, w], i) => {
      const rr = r * (0.6 + 0.4 * k);
      for (let s = 0; s < n; s++) {
        const a0 = t * sp + (s * Math.PI * 2) / n + i;
        arc(ctx, rr, a0, len * Math.min(k * 1.4, 1), w, i % 2 ? "rgba(58,215,255,0.9)" : "rgba(170,240,255,0.95)");
      }
    });
    ctx.textAlign = "center";
    ctx.fillStyle = C.cyan;
    ctx.font = `600 22px ${MONO}`;
    ctx.fillText("J . A . R . V . I . S", W / 2, cy + 280);
    const line = jarvisCopy.line.toUpperCase();
    const shown = line.slice(0, Math.max(0, Math.floor((t - since - 1.4) * 22)));
    ctx.fillStyle = "#e9fbff";
    ctx.font = `700 40px ${DISPLAY}`;
    ctx.fillText(shown, W / 2, cy + 330);
    ctx.textAlign = "left";
  } else {
    const left = id === "left";
    ctx.font = `600 22px ${MONO}`;
    ctx.fillStyle = C.cyan;
    ctx.fillText(left ? "// SYSTEM DIAGNOSTICS" : "// SUBSYSTEMS", 60, 90);
    const rows = left
      ? ["POWER CORE", "RENDER PIPELINE", "WEBGL CONTEXT", "SHADER CACHE", "SCROLL ENGINE", "AUDIO BUS"]
      : [...jarvisCopy.status, "Camera rig armed", "Screens handed off", "Visitor detected"];
    rows.forEach((r, i) => {
      const y = 150 + i * 80;
      const p = Math.min(Math.max((t - since) * 1.1 - i * 0.18, 0), 1);
      ctx.fillStyle = C.text;
      ctx.font = `500 22px ${MONO}`;
      ctx.fillText(left ? r : (p >= 1 ? "✓ " : "· ") + r, 60, y);
      if (left) {
        ctx.fillStyle = "rgba(58,215,255,0.15)";
        ctx.fillRect(60, y + 16, W - 260, 12);
        ctx.fillStyle = C.cyan;
        ctx.fillRect(60, y + 16, (W - 260) * p, 12);
        ctx.fillStyle = C.dim;
        ctx.fillText(`${Math.round(p * 100)}%`, W - 180, y + 28);
      } else {
        ctx.fillStyle = p >= 1 ? C.green : C.dim;
        ctx.fillText(p >= 1 ? "ONLINE" : "…", W - 220, y);
      }
    });
    // waveform
    ctx.strokeStyle = C.cyan;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x < W; x += 6) {
      const y = H - 70 + Math.sin(x * 0.03 + t * 6) * 18 * Math.sin(x * 0.004 + t) * k;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  scanlines(ctx, 0.08);
}

function drawCode(ctx: CanvasRenderingContext2D, t: number) {
  windowChrome(ctx, "portfolio — VS Code", ["about.tsx", "journey.log", "globals.css"], 0, C.cyan);
  // sidebar
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 52, 230, H - 52);
  ctx.font = `500 19px ${MONO}`;
  ["▾ src", "  ▾ app", "    page.tsx", "  ▾ about", "    about.tsx", "  ▾ work", "    projects.ts", "  journey.log", "▸ public", "  package.json"].forEach((f, i) => {
    ctx.fillStyle = f.includes("about.tsx") ? C.cyan : C.dim;
    ctx.fillText(f, 18, 96 + i * 34);
  });
  ctx.font = `500 25px ${MONO}`;
  const total = CODE.join("\n").length;
  const typed = Math.floor(((t * 26) % (total + 90)));
  let used = 0;
  CODE.forEach((line, i) => {
    const y = 104 + i * 38;
    ctx.fillStyle = C.dim;
    ctx.textAlign = "right";
    ctx.fillText(String(i + 1), 290, y);
    ctx.textAlign = "left";
    const visible = line.slice(0, Math.max(0, Math.min(line.length, typed - used)));
    const end = drawCodeLine(ctx, visible, 320, y);
    if (typed >= used && typed <= used + line.length && Math.sin(t * 8) > 0) {
      ctx.fillStyle = C.cyan;
      ctx.fillRect(end + 2, y - 22, 3, 28);
    }
    used += line.length + 1;
  });
  // status bar
  ctx.fillStyle = "#0a2a3a";
  ctx.fillRect(0, H - 34, W, 34);
  ctx.fillStyle = C.cyan;
  ctx.font = `500 18px ${MONO}`;
  ctx.fillText("⎇ main   ✓ 0 problems   TypeScript React   UTF-8", 16, H - 11);
}

function drawTerminal(ctx: CanvasRenderingContext2D, t: number) {
  windowChrome(ctx, "zsh — 120×40", ["~/portfolio", "htop"], 0, C.green);
  const lines: [string, string][] = [
    [C.green, "prabal@workstation ~/portfolio $ npm run dev"],
    [C.text, "▲ Next.js 16.3 · ready in 812ms"],
    [C.dim, "○ compiling /  (1,241 modules)"],
    [C.green, "✓ compiled successfully"],
    [C.green, "prabal@workstation ~/portfolio $ npx skills --list"],
    ...skills.groups.flatMap((g) => [[C.cyan, `▸ ${g.name.toUpperCase()}`] as [string, string], [C.text, `   ${g.items.join(" · ")}`] as [string, string]]),
    [C.green, "prabal@workstation ~/portfolio $ git push origin main"],
    [C.dim, "Enumerating objects: 42, done."],
    [C.text, "To github.com:prabal-hc/portfolio.git"],
    [C.green, "   a3f9c10..e81d2b7  main -> main"],
  ];
  ctx.font = `500 22px ${MONO}`;
  const lineH = 34;
  const rows = 12;
  const offset = Math.floor(t * 1.2) % lines.length;
  for (let i = 0; i < rows; i++) {
    const [c, s] = lines[(offset + i) % lines.length];
    ctx.fillStyle = c;
    ctx.fillText(s.length > 78 ? s.slice(0, 76) + "…" : s, 28, 96 + i * lineH);
  }
  // perf graphs (it is a gaming rig, after all)
  const gy = H - 190;
  ctx.fillStyle = C.panel;
  ctx.fillRect(20, gy, W - 40, 170);
  ([["GPU", C.pink, 1.3], ["CPU", C.cyan, 0.8]] as const).forEach(([name, col, sp], k) => {
    const x0 = 40 + k * ((W - 60) / 2);
    const w = (W - 120) / 2;
    ctx.fillStyle = C.dim;
    ctx.font = `600 18px ${MONO}`;
    ctx.fillText(`${name} ${Math.round(55 + 30 * Math.sin(t * sp))}%`, x0, gy + 30);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const v = 0.5 + 0.3 * Math.sin(i * 0.35 + t * sp * 3) + 0.15 * Math.sin(i * 1.3 - t * 5 * sp);
      const px = x0 + (i / 60) * w;
      const py = gy + 150 - v * 100;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  });
}

function drawBrowser(ctx: CanvasRenderingContext2D, t: number, page: number) {
  const items = projects.items;
  const i = page >= 0 ? page % items.length : Math.floor(t / 3.5) % items.length;
  const p = items[i];
  windowChrome(ctx, "", items.map((x) => x.name.split(" ")[0]), i, C.orange);
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 52, W, 50);
  ctx.fillStyle = "#141b26";
  ctx.fillRect(110, 60, W - 220, 34);
  ctx.fillStyle = C.dim;
  ctx.font = `500 19px ${MONO}`;
  ctx.fillText(`🔒 ${(p.href ?? "localhost:3000/meditrack").replace(/^https?:\/\//, "")}`, 130, 84);
  // hero art: a slow gradient field, unique hue per project
  const hue = [200, 28, 150, 280][i % 4];
  const g = ctx.createLinearGradient(0, 110, W, H);
  g.addColorStop(0, `hsl(${hue},70%,${14 + 4 * Math.sin(t)}%)`);
  g.addColorStop(1, `hsl(${(hue + 60) % 360},80%,6%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 102, W, H - 102);
  for (let k = 0; k < 5; k++) {
    ctx.fillStyle = `hsla(${hue + k * 12},90%,60%,0.08)`;
    ctx.beginPath();
    ctx.arc(W * (0.6 + 0.3 * Math.sin(t * 0.4 + k)), 300 + 120 * Math.cos(t * 0.3 + k * 2), 120 + k * 30, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = `hsl(${hue},90%,65%)`;
  ctx.font = `600 20px ${MONO}`;
  ctx.fillText(p.tag.toUpperCase(), 70, 230);
  ctx.fillStyle = "#fff";
  ctx.font = `800 64px ${DISPLAY}`;
  ctx.fillText(p.name.toUpperCase(), 70, 310, W - 140);
  ctx.fillStyle = C.text;
  ctx.font = `400 26px ${MONO}`;
  const words = p.blurb.split(" ");
  let line = "";
  let y = 370;
  for (const w of words) {
    if (ctx.measureText(line + w).width > W - 400) {
      ctx.fillText(line, 70, y);
      line = "";
      y += 38;
    }
    line += w + " ";
  }
  ctx.fillText(line, 70, y);
  ctx.strokeStyle = C.orange;
  ctx.lineWidth = 2;
  ctx.strokeRect(70, y + 40, 260, 56);
  ctx.fillStyle = C.orange;
  ctx.font = `700 20px ${MONO}`;
  ctx.fillText("VISIT THE SITE →", 96, y + 76);
}

function drawGit(ctx: CanvasRenderingContext2D, t: number, page: number) {
  windowChrome(ctx, "portfolio — VS Code", ["about.tsx", "journey.log", "globals.css"], 1, C.orange);
  const items = experience.items;
  const active = page >= 0 ? page : Math.floor(t / 2.5) % items.length;
  ctx.font = `500 22px ${MONO}`;
  ctx.fillStyle = C.dim;
  ctx.fillText("$ git log --graph --oneline career", 40, 100);
  items.forEach((it, i) => {
    const y = 170 + i * 118;
    const on = i === active;
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(70, y);
    ctx.lineTo(70, y + 118);
    ctx.stroke();
    ctx.fillStyle = on ? C.orange : C.cyan;
    ctx.beginPath();
    ctx.arc(70, y, on ? 13 : 9, 0, Math.PI * 2);
    ctx.fill();
    const hash = ((i + 7) * 2654435761).toString(16).slice(0, 7);
    ctx.fillStyle = C.yellow;
    ctx.font = `500 22px ${MONO}`;
    ctx.fillText(hash, 110, y + 8);
    ctx.fillStyle = on ? "#fff" : C.text;
    ctx.font = `${on ? 700 : 500} 26px ${MONO}`;
    ctx.fillText(it.what, 220, y + 8);
    ctx.fillStyle = C.dim;
    ctx.font = `400 20px ${MONO}`;
    ctx.fillText(`${it.where} · ${it.when}`, 220, y + 42);
  });
}

function drawContact(ctx: CanvasRenderingContext2D, id: MonitorId, t: number) {
  ctx.fillStyle = "#050608";
  ctx.fillRect(0, 0, W, H);
  const word = id === "left" ? "LET'S" : id === "center" ? "BUILD" : "SOMETHING";
  ctx.textAlign = "center";
  ctx.fillStyle = "#f4f6f8";
  ctx.font = `800 ${id === "right" ? 150 : 210}px ${DISPLAY}`;
  ctx.fillText(word, W / 2, H / 2 + 60, W - 60);
  if (id === "right") {
    ctx.fillStyle = C.orange;
    ctx.fillRect(W - 90, H / 2 + 20, 38, 38);
  }
  ctx.font = `600 22px ${MONO}`;
  ctx.fillStyle = `rgba(255,106,26,${0.6 + 0.4 * Math.sin(t * 3)})`;
  if (id === "center") ctx.fillText("prabalholla20@gmail.com", W / 2, H / 2 + 150);
  ctx.textAlign = "left";
  scanlines(ctx, 0.1);
}

export class ScreenFeed {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  mode: Mode = "standby";
  since = 0;
  private last = -1;

  constructor(public id: MonitorId) {
    readFonts();
    this.canvas = document.createElement("canvas");
    // drawn in 1280×720 coordinates, stored at 960×540: sharp enough, and a quarter less to upload
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

  setMode(mode: Mode, t: number) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.since = t;
    if (typeof document !== "undefined") readFonts();
  }

  /** Redraws at ~20 fps. `page` is the active tab while the camera dwells (-1 = auto-cycle). */
  draw(t: number, page: number) {
    if (t - this.last < 1 / 20) return;
    this.last = t;
    const ctx = this.ctx;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.textBaseline = "alphabetic";
    switch (this.mode) {
      case "standby":
        drawStandby(ctx, t);
        break;
      case "jarvis":
        drawJarvis(ctx, this.id, t, this.since);
        break;
      case "code":
        drawCode(ctx, t);
        break;
      case "terminal":
        drawTerminal(ctx, t);
        break;
      case "browser":
        drawBrowser(ctx, t, page);
        break;
      case "git":
        drawGit(ctx, t, page);
        break;
      case "contact":
        drawContact(ctx, this.id, t);
        break;
    }
    // CRT power-on: a bright line that opens into the picture
    const k = (t - this.since) / 0.35;
    if (k < 1) {
      const open = Math.pow(k, 2);
      ctx.fillStyle = "#000";
      const h = (H * (1 - open)) / 2;
      ctx.fillRect(0, 0, W, h);
      ctx.fillRect(0, H - h, W, h);
      ctx.fillStyle = `rgba(220,250,255,${1 - k})`;
      ctx.fillRect(0, H / 2 - 3 - (H / 2) * open, W, 6 + H * open);
    }
    this.texture.needsUpdate = true;
  }
}
