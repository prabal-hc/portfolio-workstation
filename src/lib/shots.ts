import * as THREE from "three";
import { CHAIR, FACE, MONITORS, SCREEN_H, SCREEN_W, SCREEN_Y } from "./scene";
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

const deg = THREE.MathUtils.degToRad;

/** Wide shots back off on narrow windows so the whole setup still fits. */
const fitWide = (r: number, halfWidth: number, fov: number, aspect: number) =>
  Math.max(r, halfWidth / (Math.tan(deg(fov / 2)) * aspect));

function shotFor(id: StopId, aspect: number, side: boolean): Shot {
  if (id === "hero") {
    const fov = side ? 30 : 40;
    // front-right three-quarter on the face; the chair is swivelled toward the lens (see Person.tsx)
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
  if (id === "desk") {
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
      lift: side ? 0.1 : 0.35,
    };
  }
  // screen: head-on to the centre monitor, filling most of the window (side) or the top strip (stacked)
  const m = MONITORS.center;
  let fov = side ? 36 : 44;
  let tan = Math.tan(deg(fov / 2));
  let d = side
    ? Math.max(SCREEN_H / 2 / (tan * 0.78), SCREEN_W / 2 / (tan * aspect * 0.86))
    : SCREEN_W / 2 / (tan * aspect * 0.94);
  // The camera has to sit between the person's face and the screen. If this window shape would push it back
  // into the head, widen the lens instead of backing off.
  if (side && d > SCREEN_DIST_MAX) {
    tan *= d / SCREEN_DIST_MAX;
    fov = THREE.MathUtils.radToDeg(2 * Math.atan(tan));
    d = SCREEN_DIST_MAX;
  }
  // stacked (portrait) shots sit far back, so they look over the person's shoulder instead of through their head
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

/** Furthest the screen shot may sit from the monitor: any further and the camera would be inside the face. */
const SCREEN_DIST_MAX = 0.68;

/**
 * On the way into the screen the camera glides past the person's right ear (the person stays seated), so the
 * move follows a smooth curve through this point instead of a straight line through their head.
 */
const PAST_THE_EAR = new THREE.Vector3(0.44, 1.26, 0.74);
const path = new THREE.CatmullRomCurve3([new THREE.Vector3(), PAST_THE_EAR.clone(), new THREE.Vector3()], false, "centripetal");
const _t0 = new THREE.Vector3();
const _t1 = new THREE.Vector3();

/** One gentle ease for every move: slow out, slow in. */
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

/** Linear track coordinate → eased coordinate (only the fractional part is eased). */
export function easeTrack(p: number): number {
  const i = Math.floor(p);
  const u = p - i;
  return u === 0 ? p : i + ease(u);
}

const _a = {} as Shot;
const _b = {} as Shot;
const _v = {} as Shot;

export interface CameraPose {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  shift: number;
  lift: number;
}

const positionOf = (v: Shot, out: THREE.Vector3) => out.set(v.px + Math.sin(v.theta) * v.r, v.h, v.pz + Math.cos(v.theta) * v.r);

/** Camera pose at an (already eased) track coordinate. */
export function poseAt(shown: number, aspect: number, side: boolean, out: CameraPose) {
  const last = STOPS.length - 1;
  const s = THREE.MathUtils.clamp(shown, 0, last);
  const i = Math.min(Math.floor(s), last - 1);
  const u = s - i;
  Object.assign(_a, shotFor(STOPS[i].id, aspect, side));
  Object.assign(_b, shotFor(STOPS[i + 1].id, aspect, side));
  for (const c of CHANNELS) _v[c] = _a[c] + (_b[c] - _a[c]) * u;

  out.target.set(_v.tx, _v.ty, _v.tz);
  if (side && STOPS[i + 1].id === "screen" && u > 0 && u < 1) {
    // desk → screen: along the curve past the ear, at an even speed
    path.points[0].copy(positionOf(_a, _t0));
    path.points[2].copy(positionOf(_b, _t1));
    path.updateArcLengths();
    path.getPointAt(u, out.pos);
  } else {
    positionOf(_v, out.pos);
  }
  out.fov = _v.fov;
  out.shift = _v.shift;
  out.lift = _v.lift;
  return out;
}
