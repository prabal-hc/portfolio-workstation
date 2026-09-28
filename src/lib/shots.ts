import * as THREE from "three";
import { CHAIR, FACE, MONITORS, SCREEN_H, SCREEN_W, SCREEN_Y, type Monitor, type MonitorId } from "./scene";
import { STOPS, type StopId } from "./timeline";
import { STACKED_SCREEN_Y } from "./layout";

/**
 * A camera shot, in cylindrical coordinates around a pivot on the floor:
 *   position = (px + sin(theta)·r, h, pz + cos(theta)·r), looking at (tx, ty, tz).
 * theta = 0 is straight behind the person (+Z). Interpolating theta sweeps the camera AROUND the scene
 * instead of cutting through it.
 *   shift / lift – lens shift (fraction of the half-viewport). + shift moves the subject right, + lift moves it up.
 */
export interface Shot {
  px: number;
  pz: number;
  theta: number;
  r: number;
  h: number;
  tx: number;
  ty: number;
  tz: number;
  fov: number;
  shift: number;
  lift: number;
}

const CHANNELS = ["px", "pz", "theta", "r", "h", "tx", "ty", "tz", "fov", "shift", "lift"] as const;

/** Which monitor each stop focuses on (null = a wide shot). */
export const FOCUS: Record<StopId, MonitorId | null> = {
  hero: null,
  welcome: null,
  about: "center",
  skills: "left",
  work: "right",
  journey: "center",
  contact: null,
};

const deg = THREE.MathUtils.degToRad;

/** Fits a monitor to the viewport: head-on, filling most of it (side layout) or the top strip (stacked). */
function screenShot(m: Monitor, aspect: number, side: boolean): Shot {
  const fov = side ? 30 : 44;
  const tan = Math.tan(deg(fov / 2));
  const d = side
    ? Math.max(SCREEN_H / 2 / (tan * 0.72), SCREEN_W / 2 / (tan * aspect * 0.8))
    : SCREEN_W / 2 / (tan * aspect * 0.94);
  // Stacked (portrait) shots are far back, so they look over the person's shoulder instead of through their head.
  const rise = side ? 0 : Math.max(0, d - 0.55) * 0.62;
  return {
    px: m.x,
    pz: m.z,
    theta: m.rotY,
    r: Math.sqrt(Math.max(d * d - rise * rise, 0.01)),
    h: SCREEN_Y + rise,
    tx: m.x,
    ty: SCREEN_Y,
    tz: m.z,
    fov,
    shift: 0,
    lift: side ? 0 : 1 - 2 * STACKED_SCREEN_Y,
  };
}

/** Wide shots back off on narrow windows so the whole setup still fits. */
const fitWide = (r: number, halfWidth: number, fov: number, aspect: number) =>
  Math.max(r, halfWidth / (Math.tan(deg(fov / 2)) * aspect));

function shotFor(id: StopId, aspect: number, side: boolean): Shot {
  const focus = FOCUS[id];
  if (focus) return screenShot(MONITORS[focus], aspect, side);

  if (id === "hero") {
    const fov = side ? 30 : 40;
    // front-left three-quarter on the face; the chair is swivelled toward the lens (see Person.tsx)
    return {
      px: CHAIR.x,
      pz: FACE.z,
      theta: deg(122),
      r: side ? 2.3 : fitWide(1.9, 0.45, fov, aspect),
      h: 1.45,
      tx: 0,
      ty: FACE.y - (side ? 0.2 : 0.12),
      tz: FACE.z,
      fov,
      shift: side ? 0.36 : 0,
      lift: side ? 0 : 0.5,
    };
  }
  if (id === "welcome") {
    const fov = side ? 38 : 48;
    // over the right shoulder, high: the whole desk, all three screens past the person
    return {
      px: 0,
      pz: 0.3,
      theta: deg(20),
      r: fitWide(2.3, 1.0, fov, aspect),
      h: 1.98,
      tx: 0,
      ty: 0.96,
      tz: -0.2,
      fov,
      shift: 0,
      lift: side ? 0.24 : 0.35,
    };
  }
  // contact: pulled back and high, swung past the gaming PC; the triptych reads across the top, the CTA sits below
  const fov = side ? 34 : 46;
  return {
    px: 0,
    pz: 0.15,
    theta: deg(-22),
    r: fitWide(3.4, 1.25, fov, aspect),
    h: 2.55,
    tx: 0,
    ty: 0.92,
    tz: -0.1,
    fov,
    shift: 0,
    lift: side ? 0.36 : 0.42,
  };
}

/** Extra arc on the way INTO a stop, so the camera swings past the person instead of through them. */
const BUMP: Partial<Record<StopId, { r?: number; h?: number }>> = {
  about: { h: 0.55 },
  skills: { r: 0.16, h: 0.04 },
  work: { r: 0.34, h: 0.1 },
  journey: { r: 0.2, h: 0.04 },
  contact: { h: 0.35 },
};

/** Easing of each move: the first one is a slow, smooth orbit; the rest are fast cinematic whips. */
const easeOrbit = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const easeWhip = (u: number) => (u < 0.5 ? 16 * Math.pow(u, 5) : 1 - Math.pow(-2 * u + 2, 5) / 2);

/** Linear track coordinate → eased coordinate (only the fractional part is eased). */
export function easeTrack(p: number): number {
  const i = Math.floor(p);
  const u = p - i;
  if (u === 0) return p;
  return i + (i === 0 ? easeOrbit(u) : easeWhip(u));
}

const _a = {} as Shot;
const _b = {} as Shot;
const _fwd = new THREE.Vector3();
const _world = new THREE.Vector3(0, 1, 0);

export interface CameraPose {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  shift: number;
  lift: number;
}

/** Camera pose at an (already eased) track coordinate. */
export function poseAt(shown: number, aspect: number, side: boolean, out: CameraPose) {
  const last = STOPS.length - 1;
  const s = THREE.MathUtils.clamp(shown, 0, last);
  const i = Math.min(Math.floor(s), last - 1);
  const u = s - i;
  Object.assign(_a, shotFor(STOPS[i].id, aspect, side));
  Object.assign(_b, shotFor(STOPS[i + 1].id, aspect, side));
  const v = {} as Shot;
  for (const c of CHANNELS) v[c] = _a[c] + (_b[c] - _a[c]) * u;

  const bump = BUMP[STOPS[i + 1].id];
  const arc = Math.sin(Math.PI * u);
  if (bump) {
    v.r += (bump.r ?? 0) * arc;
    v.h += (bump.h ?? 0) * arc;
  }
  // a quick FOV punch on every whip (the "zoom" in the cinematic zoom)
  if (i > 0) v.fov += 9 * arc;

  out.pos.set(v.px + Math.sin(v.theta) * v.r, v.h, v.pz + Math.cos(v.theta) * v.r);
  out.target.set(v.tx, v.ty, v.tz);
  out.fov = v.fov;
  out.shift = v.shift;
  out.lift = v.lift;
  return out;
}

/** The camera's right vector for a pose (for small parallax nudges). */
export function rightOf(pose: CameraPose, out: THREE.Vector3) {
  _fwd.copy(pose.target).sub(pose.pos).normalize();
  return out.crossVectors(_fwd, _world).normalize();
}
