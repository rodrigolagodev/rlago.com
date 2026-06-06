// Pixelated drifting background effect.
//
// Renders a source image into a tiny canvas (PIXEL_W × PIXEL_H). CSS stretches
// the canvas to fit its parent with `image-rendering: pixelated`, so each
// internal pixel becomes a visible block. JS animates the source offset so
// the blocks drift slowly. Two-axis spring chase with random retargeting +
// small jitter.
//
// Used by the Hero background and the FAQ row glow.

export interface PixelDriftOpts {
  /** Source-canvas width in CSS pixels (default 12). */
  pixelW?: number;
  /** Target aspect of each block on screen (default 1.78 — wider than tall). */
  targetPixelAspect?: number;
  /** How much larger the draw rect is than the source (default 3). */
  srcOverscan?: number;
  /** Horizontal bias for the target — negative pulls left (default -0.55). */
  xBias?: number;
  /** Random horizontal range around the bias (default 0.4). */
  xRange?: number;
}

export interface PixelDrift {
  /** Start the RAF loop. */
  start(): void;
  /** Stop the RAF loop. Existing frame remains. */
  stop(): void;
  /** Recompute internal dimensions after a container resize. */
  resize(): void;
  /** Recompute + paint a single static frame (use for reduced-motion). */
  renderOnce(): void;
}

export function makePixelDrift(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  img: HTMLImageElement,
  opts: PixelDriftOpts = {},
): PixelDrift {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { start() {}, stop() {}, resize() {}, renderOnce() {} };
  }

  const PIXEL_W = opts.pixelW ?? 12;
  const TARGET_PIXEL_ASPECT = opts.targetPixelAspect ?? 1.78;
  const SRC_OVERSCAN = opts.srcOverscan ?? 3;
  const X_BIAS = opts.xBias ?? -0.55;
  const X_RANGE = opts.xRange ?? 0.4;

  let PIXEL_H = PIXEL_W;
  let drawW = PIXEL_W * SRC_OVERSCAN;
  let drawH = PIXEL_H * SRC_OVERSCAN;
  let MAX_DX = (PIXEL_W * (SRC_OVERSCAN - 1)) / 2;
  let MAX_DY = (PIXEL_H * (SRC_OVERSCAN - 1)) / 2;

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

  let rafId = 0;
  let running = false;

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

  const step = (t: number) => {
    if (!running) return;
    if (t >= nextRetargetAt) {
      pickTarget();
      nextRetargetAt =
        t + TARGET_INTERVAL_MIN +
        Math.random() * (TARGET_INTERVAL_MAX - TARGET_INTERVAL_MIN);
    }
    vx += (targetX - dx) * CHASE;
    vy += (targetY - dy) * CHASE;
    const angle = Math.random() * Math.PI * 2;
    vx += Math.cos(angle) * JITTER;
    vy += Math.sin(angle) * JITTER;
    vx *= DAMPING;
    vy *= DAMPING;
    dx += vx;
    dy += vy;
    if (dx > MAX_DX) { dx = MAX_DX; vx = -Math.abs(vx) * 0.3; }
    else if (dx < -MAX_DX) { dx = -MAX_DX; vx = Math.abs(vx) * 0.3; }
    if (dy > MAX_DY) { dy = MAX_DY; vy = -Math.abs(vy) * 0.3; }
    else if (dy < -MAX_DY) { dy = -MAX_DY; vy = Math.abs(vy) * 0.3; }
    paint();
    rafId = requestAnimationFrame(step);
  };

  return {
    start() {
      if (running) return;
      running = true;
      recomputeDims();
      rafId = requestAnimationFrame(step);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
    resize: recomputeDims,
    renderOnce() {
      recomputeDims();
      paint();
    },
  };
}
