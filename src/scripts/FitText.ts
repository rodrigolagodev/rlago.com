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
 * DOM-based fit. Triggers a sync reflow — prefer `fitByCanvas` unless the
 * font rendering matters (e.g. Cormorant italic with letter-spacing, where
 * canvas measurement drifts from the live render).
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
