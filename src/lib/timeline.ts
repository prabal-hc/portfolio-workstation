/**
 * The page is one long scroll track split into "stops". Each stop is a camera shot.
 *
 *   trans – scroll length (in viewport heights) of the move INTO this stop
 *   dwell – scroll length spent parked on this stop (long dwells page through tabs on the screen)
 *
 * The camera never follows the scroll linearly: during a transition it runs on an eased curve (a fast,
 * cinematic whip), and while dwelling it holds still, so each section "lands" on its screen.
 */
export type StopId = "hero" | "welcome" | "about" | "skills" | "work" | "journey" | "contact";

export interface Stop {
  id: StopId;
  label: string;
  trans: number;
  dwell: number;
  /** how many tabs the dwell pages through (1 = no paging) */
  pages: number;
}

export const STOPS: Stop[] = [
  { id: "hero", label: "Intro", trans: 0, dwell: 0.2, pages: 1 },
  { id: "welcome", label: "Workspace", trans: 1.7, dwell: 0.7, pages: 1 },
  { id: "about", label: "About", trans: 0.9, dwell: 0.9, pages: 1 },
  { id: "skills", label: "Skills", trans: 0.9, dwell: 0.9, pages: 1 },
  { id: "work", label: "Work", trans: 0.9, dwell: 2.4, pages: 4 },
  { id: "journey", label: "Journey", trans: 0.9, dwell: 2.4, pages: 4 },
  { id: "contact", label: "Contact", trans: 1.2, dwell: 0.3, pages: 1 },
];

export const STOP_INDEX = Object.fromEntries(STOPS.map((s, i) => [s.id, i])) as Record<StopId, number>;

interface Segment {
  transStart: number;
  dwellStart: number;
  dwellEnd: number;
}

export const SEGMENTS: Segment[] = (() => {
  let at = 0;
  return STOPS.map((s) => {
    const transStart = at;
    at += s.trans;
    const dwellStart = at;
    at += s.dwell;
    return { transStart, dwellStart, dwellEnd: at };
  });
})();

/** Total scroll length, in viewport heights. */
export const TRACK = SEGMENTS[SEGMENTS.length - 1].dwellEnd;

export interface TrackPos {
  /** linear stop coordinate: 2.4 = 40% of the way from stop 2 to stop 3 */
  p: number;
  /** 0..1 within the current dwell, or -1 while moving between stops */
  dwell: number;
}

/** Where on the track a scroll offset (in viewport heights) falls. */
export function trackAt(y: number): TrackPos {
  for (let i = SEGMENTS.length - 1; i >= 0; i--) {
    const s = SEGMENTS[i];
    if (y >= s.dwellStart) {
      const len = s.dwellEnd - s.dwellStart;
      return { p: i, dwell: len > 0 ? Math.min((y - s.dwellStart) / len, 1) : 1 };
    }
    if (y >= s.transStart && i > 0) {
      return { p: i - 1 + (y - s.transStart) / (s.dwellStart - s.transStart), dwell: -1 };
    }
  }
  return { p: 0, dwell: 0 };
}

/** Scroll offset (in viewport heights) where stop `i` is reached. */
export const stopStart = (i: number) => SEGMENTS[i]?.dwellStart ?? 0;
