import * as THREE from "three";

/**
 * The 3D shapes inside the screen gather into one formation per section.
 * side: where that section's text goes; the formation takes the other half of the screen.
 */
export type Formation = "cluster" | "orbit" | "grid" | "helix" | "core";

export const SECTION_FORMATIONS: { formation: Formation; side: "left" | "right" }[] = [
  { formation: "cluster", side: "left" }, // about
  { formation: "orbit", side: "left" }, // skills
  { formation: "grid", side: "right" }, // work
  { formation: "helix", side: "left" }, // journey
  { formation: "core", side: "left" }, // contact
];

/** Which side each section's text goes on. */
export const TEXT_SIDE = SECTION_FORMATIONS.map((f) => f.side);

/** How many shapes there are. */
export const COUNT = 14;

/** A stable pseudo-random number for shape i (no Math.random, so every visit looks the same). */
export const rand = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

/** Where shape i sits in a formation (units: roughly ±1.3 around the formation's centre). */
export function place(f: Formation, i: number, out: THREE.Vector3) {
  const a = (i / COUNT) * Math.PI * 2;
  switch (f) {
    case "cluster": {
      // a loose cloud, fuller in the middle
      const r = 0.45 + rand(i, 1) * 0.85;
      const th = rand(i, 2) * Math.PI * 2;
      const ph = Math.acos(rand(i, 3) * 2 - 1);
      return out.set(Math.sin(ph) * Math.cos(th) * r * 1.2, Math.cos(ph) * r * 0.9, Math.sin(ph) * Math.sin(th) * r);
    }
    case "orbit": {
      // two tilted rings, like electrons around a nucleus
      const ring = i % 2;
      const r = ring ? 1.25 : 0.8;
      return out
        .set(Math.cos(a * 2) * r, 0, Math.sin(a * 2) * r)
        .applyAxisAngle(X_AXIS, ring ? 1.1 : 0.35)
        .applyAxisAngle(Z_AXIS, ring ? 0.5 : -0.4);
    }
    case "grid": {
      // a tidy tilted wall, 4 across
      const col = i % 4;
      const row = Math.floor(i / 4);
      return out.set((col - 1.5) * 0.62, (1.5 - row) * 0.58 - 0.05, 0);
    }
    case "helix": {
      const t = i / (COUNT - 1);
      const ang = t * Math.PI * 3.2;
      return out.set(Math.cos(ang) * 0.75, (t - 0.5) * 2.5, Math.sin(ang) * 0.75);
    }
    case "core": {
      // packed onto a small sphere (golden-angle spiral)
      const y = 1 - (i / (COUNT - 1)) * 2;
      const rr = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      return out.set(Math.cos(th) * rr * 0.62, y * 0.62, Math.sin(th) * rr * 0.62);
    }
  }
}

/** How the whole formation is turned, per formation (the grid faces you, the rest are angled). */
export const TILT: Record<Formation, [number, number, number]> = {
  cluster: [0.2, 0.4, 0],
  orbit: [0.25, 0, 0.1],
  grid: [-0.12, 0.42, 0.06],
  helix: [0.1, 0, 0.12],
  core: [0.2, 0.3, 0],
};
