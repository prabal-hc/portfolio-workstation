/**
 * World layout, in metres. y-up, floor at y = 0. The desk runs along X; the person sits at +Z facing −Z,
 * so "behind the person" is +Z and the monitors face +Z.
 */
export const DESK = { width: 2.8, depth: 0.82, top: 0.75, z: -0.02 };

export const SCREEN_W = 0.6; // 27" 16:9 panel
export const SCREEN_H = 0.3375;
export const SCREEN_Y = 1.14; // centre height of every screen

export type MonitorId = "left" | "center" | "right";

export interface Monitor {
  id: MonitorId;
  x: number;
  z: number;
  /** rotation about Y; the screen's normal is (sin rotY, 0, cos rotY) */
  rotY: number;
}

export const MONITORS: Record<MonitorId, Monitor> = {
  left: { id: "left", x: -0.605, z: -0.13, rotY: 0.5 },
  center: { id: "center", x: 0, z: -0.24, rotY: 0 },
  right: { id: "right", x: 0.605, z: -0.13, rotY: -0.5 },
};

/** The chair's pivot on the floor; the person is built around it. */
export const CHAIR = { x: 0, z: 0.74 };

/** Where the person's face is (world, when facing the desk), for the hero shot. */
export const FACE = { y: 1.27, z: CHAIR.z - 0.1 };

/** Peripherals on the desk (world). */
export const KEYBOARD = { x: -0.06, z: 0.2 };
export const MOUSE = { x: 0.34, z: 0.22 };
