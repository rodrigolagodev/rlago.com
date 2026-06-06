// Helpers to size text to a container's width.
//
// Two strategies:
//  - measureCanvas / fitByCanvas: measure with a 2D canvas context. Used for
//    elements that are visually obscured (e.g. a WebGL canvas overlay sits on
//    top) or where we need a reference width before the element is rendered.
//  - fitByDom: set the element to a base font-size, measure its rendered
//    width, return the size that scales it to the container.

export interface CanvasFontOpts {
  weight: number | string;
  family: string;
  /** Letter-spacing in em — multiplied by the font-size at measurement time. */
  letterSpacingEm?: number;
}

export function measureCanvas(text: string, fs: number, opts: CanvasFontOpts): number {
  const tmp = document.createElement('canvas').getContext('2d');
  if (!tmp) return 0;
  tmp.font = `${opts.weight} ${fs}px ${opts.family}`;
  if (opts.letterSpacingEm !== undefined && 'letterSpacing' in tmp) {
    (tmp as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${opts.letterSpacingEm * fs}px`;
  }
  return tmp.measureText(text).width;
}

/**
 * Returns the font-size at which the longest of `lines` exactly fills
 * `containerWidth`, given the supplied font options.
 * Returns 0 if measurement fails (caller should skip applying).
 */
export function fitByCanvas(
  lines: string[],
  containerWidth: number,
  opts: CanvasFontOpts & { baseFs?: number },
): number {
  const baseFs = opts.baseFs ?? 100;
  let longest = 0;
  for (const line of lines) {
    longest = Math.max(longest, measureCanvas(line, baseFs, opts));
  }
  if (longest <= 0 || containerWidth <= 0) return 0;
  return (baseFs * containerWidth) / longest;
}

/**
 * DOM-based fit: temporarily sets `el` to `baseFs`, measures its rendered
 * width, returns the size that scales it to `containerWidth`. The caller
 * is expected to apply the returned value back as `el.style.fontSize`.
 *
 * Trade-off vs `fitByCanvas`: this triggers a synchronous reflow on every
 * call (cheap, but real). Use it when font rendering matters — e.g.
 * Cormorant italic with letter-spacing, where canvas measurement drifts
 * from the live render. Otherwise prefer `fitByCanvas`.
 */
export function fitByDom(
  el: HTMLElement,
  containerWidth: number,
  baseFs = 100,
): number {
  el.style.fontSize = `${baseFs}px`;
  const w = el.getBoundingClientRect().width;
  if (w <= 0 || containerWidth <= 0) return 0;
  return (baseFs * containerWidth) / w;
}
