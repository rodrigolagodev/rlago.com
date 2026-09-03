export function initGrain(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('grain-canvas') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d') ?? null;
  if (!canvas || !ctx) return;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  // Time-based repaint — ~20 Hz regardless of monitor refresh rate.
  // Reads as flicker without burning CPU on 120 Hz+ displays.
  const REPAINT_INTERVAL_MS = 1000 / 20;
  let lastPaint = 0;
  const draw = (now: number) => {
    if (now - lastPaint >= REPAINT_INTERVAL_MS) {
      lastPaint = now;
      const { width, height } = canvas;
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
    }
    requestAnimationFrame(draw);
  };

  resize();
  requestAnimationFrame(draw);
  window.addEventListener('resize', resize);
}
