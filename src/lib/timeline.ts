/**
 * The page is one long scroll track with three camera stops:
 *   hero   – on the person's face
 *   desk   – orbited round behind the chair, the whole setup in view
 *   screen – moved in on the centre monitor, where the sections slide past as tabs
 *
 *   trans – scroll length (viewport heights) of the camera move INTO the stop
 *   dwell – scroll length spent parked on the stop (the screen's dwell is where the tabs slide)
 *
 * Everything is scrubbed straight from the scroll position (no auto-scrolling), so it always
 * moves exactly as fast as the visitor does.
 */
export type StopId = "hero" | "desk" | "screen";

export const TABS = [
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "work", label: "Work" },
  { id: "journey", label: "Journey" },
  { id: "contact", label: "Contact" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export interface Stop {
  id: StopId;
  trans: number;
  dwell: number;
}

/** Scroll length of each section on the screen, in viewport heights. */
export const TAB_LENGTH = 1.2;

export const STOPS: Stop[] = [
  { id: "hero", trans: 0, dwell: 0.15 },
  { id: "desk", trans: 1.4, dwell: 0.35 },
  // the last tab needs no scroll after it, hence (tabs - 1)
  { id: "screen", trans: 1.1, dwell: (TABS.length - 1) * TAB_LENGTH },
];

export const SCREEN = STOPS.length - 1;

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
  /** linear stop coordinate: 1.4 = 40% of the way from stop 1 to stop 2 */
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

/**
 * Section position on the screen (0 .. sections-1) for a scroll offset: plain and linear, so the page inside
 * the monitor scrolls just like a normal one (Lenis already smooths it).
 */
export function tabAt(y: number): number {
  const s = SEGMENTS[SCREEN];
  return Math.max(0, Math.min((y - s.dwellStart) / TAB_LENGTH, TABS.length - 1));
}

/** Scroll offset (viewport heights) where a stop is reached, or where a tab is centred. */
export const stopStart = (i: number) => SEGMENTS[i]?.dwellStart ?? 0;
export const tabStart = (i: number) => SEGMENTS[SCREEN].dwellStart + i * TAB_LENGTH;
