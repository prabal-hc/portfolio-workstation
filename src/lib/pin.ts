import * as THREE from "three";
import { MONITORS, SCREEN_H, SCREEN_W, SCREEN_Y } from "./scene";
import type { CameraPose } from "./shots";

/**
 * Pinning the HTML screen panel onto the 3D monitor: where the monitor's corners land on the page, and the
 * CSS perspective transform that puts a flat box's corners there.
 */
const _p = new THREE.Vector3();
const _v = new THREE.Vector3();

/** Point a camera along a pose, with the same lens shift the real camera uses. */
export function aim(c: THREE.PerspectiveCamera, pose: CameraPose, width: number, height: number) {
  c.position.copy(pose.pos);
  c.lookAt(pose.target);
  c.fov = pose.fov;
  c.aspect = width / height;
  c.near = 0.03;
  c.far = 40;
  c.setViewOffset(width, height, (-pose.shift * width) / 2, (pose.lift * height) / 2, width, height);
  c.updateProjectionMatrix();
  c.updateMatrixWorld();
}

/** The centre screen's corners on the page (top-left, top-right, bottom-left, bottom-right), or null if any is behind the camera. */
export function screenCorners(c: THREE.PerspectiveCamera, width: number, height: number): [number, number][] | null {
  const m = MONITORS.center;
  const out: [number, number][] = [];
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    _p.set(m.x + sx * (SCREEN_W / 2), SCREEN_Y + sy * (SCREEN_H / 2), m.z + 0.0116);
    _v.copy(_p).applyMatrix4(c.matrixWorldInverse);
    if (_v.z > -0.02) return null;
    _p.project(c);
    out.push([((_p.x + 1) / 2) * width, ((1 - _p.y) / 2) * height]);
  }
  return out;
}

/**
 * CSS matrix3d that maps a w×h box (origin top-left) onto four points: a projective "corner pin".
 * Solves the 8-unknown homography directly.
 */
export function cornerPin(w: number, h: number, dst: number[][]): number[] | null {
  const src = [[0, 0], [w, 0], [0, h], [w, h]];
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [X, Y] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X, X]);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y, Y]);
  }
  // Gaussian elimination with partial pivoting
  for (let c = 0; c < 8; c++) {
    let piv = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (Math.abs(A[piv][c]) < 1e-9) return null;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  const [a, b, c, d, e, f, g, hh] = A.map((row, i) => row[8] / row[i]);
  // column-major for CSS
  return [a, d, 0, g, b, e, 0, hh, 0, 0, 1, 0, c, f, 0, 1];
}
