// Pixelated drifting background.
//
// Renders an image into a tiny (PIXEL_W × PIXEL_H) canvas; CSS stretches it
// to fit its parent with `image-rendering: pixelated`, so each internal
// pixel becomes a visible block. JS animates the source offset via a
// two-axis spring chase with random retargeting + jitter.
//
// Drives off the shared frame loop rather than its own RAF: several drifts can
// be live at once (the hero plus the active FAQ rows) and they should cost one
// frame callback between them, not one each.

import { onFrame } from './FrameLoop';

export interface PixelDriftOpts {
  pixelW?: number;
  /** Target on-screen aspect of each block — wider than tall by default. */
  targetPixelAspect?: number;
  /** Source-rect overscan factor: how much wider than PIXEL_W to draw. */
  srcOverscan?: number;
  /** Horizontal bias for retargeting — negative pulls left. */
  xBias?: number;
  /** Random horizontal range around the bias. */
  xRange?: number;
  /** Per-pixel CSS filter string, applied while drawing into the tiny canvas
      rather than by CSS over the upscaled result. These are all per-pixel
      functions and the upscale is nearest-neighbour, so filtering before or
      after it is mathematically identical — but here it touches a few hundred
      pixels instead of the whole viewport, every frame. */
  filter?: string;
}

export interface PixelDrift {
  start(): void;
  stop(): void;
  resize(): void;
  /** Paint a single static frame — use for reduced-motion. */
  renderOnce(): void;
  /** True when the browser applied the canvas filter, so the caller can drop
      its CSS fallback. Canvas filters need Safari 17+. */
  isFilterApplied(): boolean;
}

export function makePixelDrift(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  img: HTMLImageElement,
  opts: PixelDriftOpts = {},
): PixelDrift {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      start() {}, stop() {}, resize() {}, renderOnce() {},
      isFilterApplied: () => false,
    };
  }

  const PIXEL_W = opts.pixelW ?? 12;
  const TARGET_PIXEL_ASPECT = opts.targetPixelAspect ?? 1.78;
  const SRC_OVERSCAN = opts.srcOverscan ?? 3;
  const X_BIAS = opts.xBias ?? -0.55;
  const X_RANGE = opts.xRange ?? 0.4;
  const FILTER = opts.filter ?? '';

  let filterApplied = false;
  // Assigning canvas.width resets every context property, this one included,
  // so it has to be re-applied after each resize.
  const applyFilter = () => {
    if (!FILTER || !('filter' in ctx)) return;
    ctx.filter = FILTER;
    filterApplied = ctx.filter !== 'none' && ctx.filter !== '';
  };

  let PIXEL_H = PIXEL_W;
  let drawW = PIXEL_W * SRC_OVERSCAN;
  let drawH = PIXEL_H * SRC_OVERSCAN;
  let MAX_DX = (PIXEL_W * (SRC_OVERSCAN - 1)) / 2;
  let MAX_DY = (PIXEL_H * (SRC_OVERSCAN - 1)) / 2;

  // The container box only changes on resize, so cache it instead of
  // measuring during a frame callback.
  function recomputeDims() {
    const { width: vw, height: vh } = container.getBoundingClientRect();
    if (vw <= 0 || vh <= 0) return;
    PIXEL_H = Math.max(3, Math.round(PIXEL_W * (vh / vw) * TARGET_PIXEL_ASPECT));
    canvas.width = PIXEL_W;
    canvas.height = PIXEL_H;
    drawW = PIXEL_W * SRC_OVERSCAN;
    drawH = PIXEL_H * SRC_OVERSCAN;
    MAX_DX = (PIXEL_W * (SRC_OVERSCAN - 1)) / 2;
    MAX_DY = (PIXEL_H * (SRC_OVERSCAN - 1)) / 2;
    ctx!.imageSmoothingEnabled = false;
    applyFilter();
  }
  recomputeDims();

  let dx = 0;
  let dy = 0;
  let vx = 0;
  let vy = 0;
  let targetX = 0;
  let targetY = 0;
  let nextRetargetAt = 0;

  const pickTarget = () => {
    targetX = (X_BIAS + (Math.random() * 2 - 1) * X_RANGE) * MAX_DX;
    targetY = (Math.random() * 2 - 1) * MAX_DY;
  };
  pickTarget();

  const TARGET_INTERVAL_MIN = 3600;
  const TARGET_INTERVAL_MAX = 7200;
  const CHASE = 0.0017;
  const DAMPING = 0.93;
  const JITTER = 0.006;

  let unsubscribe: (() => void) | null = null;

  const paint = () => {
    ctx!.clearRect(0, 0, PIXEL_W, PIXEL_H);
    ctx!.drawImage(
      img,
      -PIXEL_W * (SRC_OVERSCAN - 1) / 2 + dx,
      -PIXEL_H * (SRC_OVERSCAN - 1) / 2 + dy,
      drawW,
      drawH,
    );
  };

  // Physics constants are calibrated for 60 Hz; `scale` is the frame delta
  // normalised to that, so motion is identical on 120 Hz+ displays.
  const step = (t: number, scale: number) => {
    if (t >= nextRetargetAt) {
      pickTarget();
      nextRetargetAt =
        t + TARGET_INTERVAL_MIN +
        Math.random() * (TARGET_INTERVAL_MAX - TARGET_INTERVAL_MIN);
    }
    vx += (targetX - dx) * CHASE * scale;
    vy += (targetY - dy) * CHASE * scale;
    const angle = Math.random() * Math.PI * 2;
    vx += Math.cos(angle) * JITTER * scale;
    vy += Math.sin(angle) * JITTER * scale;
    const damp = Math.pow(DAMPING, scale);
    vx *= damp;
    vy *= damp;
    dx += vx * scale;
    dy += vy * scale;
    if (dx > MAX_DX) { dx = MAX_DX; vx = -Math.abs(vx) * 0.3; }
    else if (dx < -MAX_DX) { dx = -MAX_DX; vx = Math.abs(vx) * 0.3; }
    if (dy > MAX_DY) { dy = MAX_DY; vy = -Math.abs(vy) * 0.3; }
    else if (dy < -MAX_DY) { dy = -MAX_DY; vy = Math.abs(vy) * 0.3; }
    paint();
  };

  return {
    start() {
      if (unsubscribe) return;
      recomputeDims();
      unsubscribe = onFrame(step);
    },
    stop() {
      unsubscribe?.();
      unsubscribe = null;
    },
    resize: recomputeDims,
    renderOnce() {
      recomputeDims();
      paint();
    },
    isFilterApplied: () => filterApplied,
  };
}
