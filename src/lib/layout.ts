/**
 * side    – landscape windows: content is rendered ON the monitor the camera is looking at
 * stacked – portrait / narrow windows: the monitor sits at the top, content slides up as a sheet underneath
 * Keep in sync with the `@media` rules in globals.css.
 */
export function isSideLayout(width: number, height: number): boolean {
  return width / height >= 1.15 && width >= 760;
}

/** Touch-first devices (phones, tablets, LinkedIn's in-app browser): the GPU budget is smaller. */
export const isTouchDevice = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/** In the stacked layout, where the focused screen sits, as a fraction of the viewport height from the top. */
export const STACKED_SCREEN_Y = 0.24;
