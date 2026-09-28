import type Lenis from "lenis";
import type { TrackPos } from "./timeline";

/** Shared, mutable app state. Read from render loops, never from React state. */
export const state: {
  lenis: Lenis | null;
  track: TrackPos;
  /** the camera's eased + damped stop coordinate (what is actually on screen) */
  shown: number;
  /** camera speed in m/s, drives the zoom blur and whoosh */
  speed: number;
  /** the user has pressed "Initialize" (the page is interactive) */
  started: boolean;
} = {
  lenis: null,
  track: { p: 0, dwell: 0 },
  shown: 0,
  speed: 0,
  started: false,
};

// handy for poking at the camera from the console while developing
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __state: typeof state }).__state = state;
}
