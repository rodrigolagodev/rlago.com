// Film grain.
//
// The grain used to be repainted into a viewport-sized canvas 20 times a
// second. Every repaint re-uploaded a full-screen texture to the compositor:
// ~8 MB at 1080p, ~15 MB at 1440p, ~33 MB at 4K — 20 times a second. That is
// why the cost grew with the monitor rather than with the page.
//
// Now a single noise tile is baked once and tiled by CSS. The flicker comes
// from stepping a transform on an oversized layer, which the compositor
// handles on its own: the layer is rasterised once and never repainted, so
// the per-frame cost is zero at any resolution.

/** Tile edge in px. Large enough that the repeat never reads as a pattern at
    4% opacity, small enough that baking it costs a few milliseconds, once. */
const TILE_SIZE = 512;

export function initGrain(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const layer = document.getElementById('grain-layer');
  if (!layer) return;

  const tile = document.createElement('canvas');
  tile.width = TILE_SIZE;
  tile.height = TILE_SIZE;
  const ctx = tile.getContext('2d');
  if (!ctx) return;

  const image = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  const buf = image.data;
  for (let i = 0; i < buf.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    buf[i] = v;
    buf[i + 1] = v;
    buf[i + 2] = v;
    buf[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);

  // toBlob rather than toDataURL: no base64 inflation, and the browser
  // decodes the tile once into a texture it keeps.
  tile.toBlob((blob) => {
    if (!blob) return;
    layer.style.backgroundImage = `url(${URL.createObjectURL(blob)})`;
    layer.classList.add('is-grain-ready');
  }, 'image/png');
}
