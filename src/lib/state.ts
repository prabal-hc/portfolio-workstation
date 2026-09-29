import type Lenis from "lenis";
import type { TrackPos } from "./timeline";

/** Shared, mutable app state. Read from render loops, never from React state. */
export const state: {
  lenis: Lenis | null;
  track: TrackPos;
  /** tab position on the screen, 0 .. tabs-1 (fractional while sliding) */
  tab: number;
  /** the camera's eased + damped stop coordinate (what is actually on screen) */
  shown: number;
} = {
  lenis: null,
  track: { p: 0, dwell: 0 },
  tab: 0,
  shown: 0,
};

// handy for poking at the camera from the console while developing
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __state: typeof state }).__state = state;
}
