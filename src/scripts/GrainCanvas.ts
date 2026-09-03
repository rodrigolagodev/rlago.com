export function initGrain(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('grain-canvas') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d') ?? null;
  if (!canvas || !ctx) return;

  // Native-resolution grain, but the expensive per-pixel Math.random loop
  // only runs when we bake tiles at startup — not every frame. Per frame
  // we tile a random offset of a pre-baked noise pattern, which is a
  // single fillRect at compositor speed regardless of viewport size.
  const TILE_SIZE = 512;
  const TILE_COUNT = 4;

  const tiles: CanvasPattern[] = [];
  for (let t = 0; t < TILE_COUNT; t++) {
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = TILE_SIZE;
    tileCanvas.height = TILE_SIZE;
    const tCtx = tileCanvas.getContext('2d')!;
    const tData = tCtx.createImageData(TILE_SIZE, TILE_SIZE);
    const buf = tData.data;
    for (let i = 0; i < buf.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      buf[i] = v;
      buf[i + 1] = v;
      buf[i + 2] = v;
      buf[i + 3] = 255;
    }
    tCtx.putImageData(tData, 0, 0);
    tiles.push(ctx.createPattern(tileCanvas, 'repeat')!);
  }

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();

  const REPAINT_INTERVAL_MS = 1000 / 20;
  let lastPaint = 0;
  const draw = (now: number) => {
    if (now - lastPaint >= REPAINT_INTERVAL_MS) {
      lastPaint = now;
      const pattern = tiles[(Math.random() * TILE_COUNT) | 0];
      const ox = (Math.random() * TILE_SIZE) | 0;
      const oy = (Math.random() * TILE_SIZE) | 0;
      // Shift the pattern origin so each tick reads a different sub-region.
      pattern.setTransform(new DOMMatrix().translate(ox, oy));
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);
  window.addEventListener('resize', resize);
}
