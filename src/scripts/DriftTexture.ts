// The Hero background and the FAQ row glow drift the same texture. Sharing one
// Image means one fetch and one decode instead of two.
//
// The source is deliberately small: PixelDrift squeezes the whole texture into
// a box at most `PIXEL_W * SRC_OVERSCAN` (36 px) wide before CSS blows it back
// up with `image-rendering: pixelated`, so resolution beyond a few hundred
// pixels is thrown away before anything reaches the screen.

const TEXTURE_SRC = '/images/drift-texture.webp';

let pending: Promise<HTMLImageElement> | null = null;

export function loadDriftTexture(): Promise<HTMLImageElement> {
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = TEXTURE_SRC;
    });
  }
  return pending;
}
