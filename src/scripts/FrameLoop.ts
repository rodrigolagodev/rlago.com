// One requestAnimationFrame loop for every continuous animation on the page.
//
// Each independent RAF loop pays its own callback overhead and writes to the
// DOM at an arbitrary point in the frame, so several of them interleave reads
// and writes and force extra style/layout passes. Sharing a single loop keeps
// all per-frame work inside one frame slot, and lets the loop stop completely
// when nothing is animating.

/** `dtScale` is the frame delta normalised to 60 Hz, so physics tuned for
    60 Hz behaves identically on a 120 Hz or 165 Hz display. */
export type FrameCallback = (now: number, dtScale: number) => void;

const callbacks = new Set<FrameCallback>();
let rafId = 0;
let prevT = 0;

const tick = (now: number) => {
  rafId = 0;
  if (prevT === 0) prevT = now;
  // Clamped so a backgrounded tab or a paused debugger cannot resume with a
  // single enormous step.
  const dtScale = Math.min(4, ((now - prevT) / 1000) * 60);
  prevT = now;

  // Copy before iterating: a callback may unsubscribe itself mid-tick.
  for (const cb of Array.from(callbacks)) cb(now, dtScale);

  if (callbacks.size > 0) rafId = requestAnimationFrame(tick);
  else prevT = 0;
};

/** Subscribe to the shared loop. Returns an unsubscribe function. */
export function onFrame(cb: FrameCallback): () => void {
  callbacks.add(cb);
  if (rafId === 0) {
    prevT = 0;
    rafId = requestAnimationFrame(tick);
  }
  return () => {
    callbacks.delete(cb);
    if (callbacks.size === 0 && rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      prevT = 0;
    }
  };
}
