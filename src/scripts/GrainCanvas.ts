export function initGrain(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('grain-canvas') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d') ?? null;
  if (!canvas || !ctx) return;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  // Repaint every 3rd RAF frame — enough to read as flicker without
  // burning the CPU at full 60Hz.
  let frame = 0;
  const draw = () => {
    frame++;
    if (frame % 3 === 0) {
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
  draw();
  window.addEventListener('resize', resize);
}
