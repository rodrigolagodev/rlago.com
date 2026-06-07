// Reusable kinetic variant of the water-distortion text. Overlays
// progress-driven horizontal stretching on selected glyphs by overriding
// the 2D text renderer with a segment-aware version. The two things that
// vary per instance — which glyphs stretch, and what drives the progress —
// are passed in as config, so the same effect powers both the Hero title
// and the Footer question.

import { TextDistortion, readTextColor } from './TextDistortion';

export type KineticSegment = { text: string; kinetic?: boolean };
export type KineticLine = KineticSegment[];

/** Returns 0..1. Receives the container so viewport-relative strategies can
    measure it; sticky/scroll strategies may ignore it. */
export type ProgressFn = (container: HTMLElement) => number;

export interface KineticTextConfig {
  /** Lines of segments. Segments flagged `kinetic` stretch with progress. */
  lines: KineticLine[];
  /** Maps scroll/viewport state to a 0..1 stretch progress. */
  progress: ProgressFn;
  /** Max horizontal scale a kinetic glyph reaches at progress = 1. */
  letterScaleMax?: number;
  /** Horizontal alignment of each line within the canvas. Default 'center'. */
  align?: 'left' | 'center';
  /** Shrink the font so the widest stretched line always fits the canvas
      width — prevents glyphs clipping past the edge as they elongate.
      Default false (the Hero deliberately lets stretched glyphs overflow). */
  fitToWidth?: boolean;
}

const DEFAULT_LETTER_SCALE_MAX = 6;

// ── Progress strategies ─────────────────────────────────────────────────

/** Sticky-element progress: keyed off raw page scroll, not the element's
    rect. The Hero is sticky-positioned, so its rect.top stays at 0 through
    the sticky phase and would freeze progress. `range` is in viewport
    heights — progress hits 1 after scrolling `range` screens. */
export function stickyScrollProgress(range = 2): ProgressFn {
  return () => {
    const vh = window.innerHeight || 1;
    const scrollY =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0;
    return Math.max(0, Math.min(1, scrollY / (vh * range)));
  };
}

/** Settle-at-bottom progress, keyed off the element's BOTTOM edge vs. the
    viewport bottom. 1 (fully stretched) while the element is still `range`
    px or more below its resting spot, easing to 0 (normal) as its bottom
    edge meets the viewport bottom — i.e. when the page is scrolled to the
    end. For a page's last element (the Footer) this guarantees the stretch
    fully relaxes at max scroll, where a centre-based mapping can't, since
    the element never reaches the viewport centre. `range` defaults to one
    viewport height. `target` overrides which element's bottom edge is
    tracked — pass the outermost section when the text wrapper itself isn't
    the page's last element. */
export function settleAtBottomProgress(
  { range, target }: { range?: number; target?: HTMLElement } = {},
): ProgressFn {
  return (container) => {
    const rect = (target ?? container).getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const r = range ?? vh;
    return Math.max(0, Math.min(1, (rect.bottom - vh) / r));
  };
}

// ── Segment helper ──────────────────────────────────────────────────────

/** Build a kinetic line from a string plus the 0-based char indices whose
    glyphs should stretch. Adjacent non-stretched chars collapse into one
    segment so canvas measurement/kerning stays natural. */
export function kineticLine(text: string, stretchIndices: number[]): KineticLine {
  const stretch = new Set(stretchIndices);
  const segments: KineticLine = [];
  let run = '';
  const flushRun = () => {
    if (run) {
      segments.push({ text: run });
      run = '';
    }
  };
  for (let i = 0; i < text.length; i++) {
    if (stretch.has(i)) {
      flushRun();
      segments.push({ text: text[i], kinetic: true });
    } else {
      run += text[i];
    }
  }
  flushRun();
  return segments;
}

// ── Effect ──────────────────────────────────────────────────────────────

export class KineticTextEffect extends TextDistortion {
  private readonly kineticLines: KineticLine[];
  private readonly progressFn: ProgressFn;
  private readonly letterScaleMax: number;
  private readonly align: 'left' | 'center';
  private readonly fitToWidth: boolean;

  private progress = 0;
  private lastRenderedProgress = -1;
  // AbortController so the scroll listener can be torn down in one call —
  // a missed removeEventListener leaks the instance across HMR reloads.
  private abortController: AbortController | null = null;

  constructor(
    container: HTMLElement,
    canvas: HTMLCanvasElement,
    config: KineticTextConfig,
  ) {
    // Empty lines — the base renderText path is never used (overridden below).
    super(container, canvas, config.lines.map(() => ''));
    this.kineticLines = config.lines;
    this.progressFn = config.progress;
    this.letterScaleMax = config.letterScaleMax ?? DEFAULT_LETTER_SCALE_MAX;
    this.align = config.align ?? 'center';
    this.fitToWidth = config.fitToWidth ?? false;
  }

  async start() {
    await super.start();
    this.updateProgress();
    this.abortController = new AbortController();
    window.addEventListener('scroll', () => this.updateProgress(), {
      passive: true,
      signal: this.abortController.signal,
    });
  }

  stop() {
    super.stop();
    this.abortController?.abort();
    this.abortController = null;
  }

  private updateProgress() {
    this.progress = this.progressFn(this.container);
  }

  // Recompute here too — defensive against scenarios where the scroll event
  // doesn't fire (sticky edge cases, smooth-scroll interactions).
  protected beforeRender() {
    this.updateProgress();
    if (Math.abs(this.progress - this.lastRenderedProgress) > 0.001) {
      this.renderText();
      this.lastRenderedProgress = this.progress;
    }
  }

  protected renderText() {
    const { width, height } = this.container.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    const dpr = this.dpr;
    this.textCanvas.width = Math.round(width * dpr);
    this.textCanvas.height = Math.round(height * dpr);
    const ctx = this.textCanvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Read the text element's actual computed style so the effect matches
    // whatever font/size/spacing the component renders — deriving size from
    // container height drifts when line-height < intrinsic ascent+descent.
    const textEl = this.container.querySelector<HTMLElement>(
      '[data-text-distortion-text]',
    );
    let font = readFontStyle(textEl, height, this.kineticLines.length);
    applyFont(ctx, font);

    ctx.fillStyle = readTextColor();
    ctx.textBaseline = 'alphabetic';

    const letterScale = 1 + this.progress * this.letterScaleMax;

    // Shrink the font so the widest stretched line fits the canvas, so
    // elongating glyphs never clip past the edge. Spacing scales with size.
    if (this.fitToWidth) {
      const widest = Math.max(
        ...this.kineticLines.map((s) => segmentLineWidth(ctx, s, letterScale)),
      );
      if (widest > width) {
        const s = width / widest;
        font = { ...font, size: font.size * s, spacingPx: font.spacingPx * s };
        applyFont(ctx, font);
      }
    }

    const sample = ctx.measureText('MgO');
    const ascent = sample.actualBoundingBoxAscent || font.size * 0.78;
    const descent = sample.actualBoundingBoxDescent || font.size * 0.05;

    const lineSpacing = font.size * 0.85;
    const lineCount = this.kineticLines.length;
    const stackHeight = ascent + (lineCount - 1) * lineSpacing + descent;
    const stackTop = (height - stackHeight) / 2;

    this.kineticLines.forEach((segments, i) => {
      const baselineY = stackTop + i * lineSpacing + ascent;
      drawSegmentLine(ctx, segments, letterScale, this.align, width, baselineY);
    });

    this.textTexture.needsUpdate = true;
  }
}

type FontStyle = { weight: string; family: string; size: number; spacingPx: number };

function readFontStyle(
  textEl: HTMLElement | null,
  containerHeight: number,
  lineCount: number,
): FontStyle {
  if (textEl) {
    const cs = window.getComputedStyle(textEl);
    const size = parseFloat(cs.fontSize);
    const ls = parseFloat(cs.letterSpacing);
    return {
      weight: cs.fontWeight || '400',
      family: cs.fontFamily || '"Bebas Neue", Impact, sans-serif',
      size,
      spacingPx: isNaN(ls) ? -0.02 * size : ls,
    };
  }
  const size = containerHeight / lineCount / 0.85;
  return {
    weight: '400',
    family: '"Bebas Neue", Impact, sans-serif',
    size,
    spacingPx: -0.02 * size,
  };
}

function applyFont(ctx: CanvasRenderingContext2D, font: FontStyle) {
  ctx.font = `${font.weight} ${font.size}px ${font.family}`;
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${font.spacingPx}px`;
  }
}

const scaleOf = (seg: KineticSegment, letterScale: number) =>
  seg.kinetic ? letterScale : 1;

/** Total advance width of a line at the given stretch. */
function segmentLineWidth(
  ctx: CanvasRenderingContext2D,
  segments: KineticLine,
  letterScale: number,
): number {
  return segments.reduce(
    (sum, seg) => sum + ctx.measureText(seg.text).width * scaleOf(seg, letterScale),
    0,
  );
}

function drawSegmentLine(
  ctx: CanvasRenderingContext2D,
  segments: KineticLine,
  letterScale: number,
  align: 'left' | 'center',
  canvasWidth: number,
  baselineY: number,
) {
  ctx.textAlign = 'left';

  const widths = segments.map(
    (seg) => ctx.measureText(seg.text).width * scaleOf(seg, letterScale),
  );
  const total = widths.reduce((a, b) => a + b, 0);

  let cursorX: number;
  if (align === 'left') {
    // Pen at x = 0, matching the DOM <h1>'s content-box origin (which keeps
    // its natural left side-bearing). Pulling by ink bounds would push the
    // start negative for glyphs with a positive LSB and clip the first
    // letter against the canvas edge.
    cursorX = 0;
  } else {
    // Centre by VISIBLE ink bounds, not advance-width sum. Negative
    // letter-spacing makes each glyph's advance narrower than its visible
    // width — advance-based centring leaves the visible text shifted right.
    const firstSeg = segments[0];
    const lastSeg = segments[segments.length - 1];
    const firstM = ctx.measureText(firstSeg.text);
    const lastM = ctx.measureText(lastSeg.text);
    const abbLeftFirst = (firstM.actualBoundingBoxLeft || 0) * scaleOf(firstSeg, letterScale);
    const lastScale = scaleOf(lastSeg, letterScale);
    const abbRightLast = (lastM.actualBoundingBoxRight || lastM.width) * lastScale;
    const lastAdv = lastM.width * lastScale;
    const visualShift = (abbLeftFirst + lastAdv - abbRightLast) / 2;
    cursorX = canvasWidth / 2 - total / 2 + visualShift;
  }

  segments.forEach((seg, i) => {
    const segW = widths[i];
    const scale = scaleOf(seg, letterScale);
    if (scale === 1) {
      ctx.textAlign = 'left';
      ctx.fillText(seg.text, cursorX, baselineY);
    } else {
      const segCenter = cursorX + segW / 2;
      ctx.save();
      ctx.translate(segCenter, baselineY);
      ctx.scale(scale, 1);
      ctx.textAlign = 'center';
      ctx.fillText(seg.text, 0, 0);
      ctx.restore();
    }
    cursorX += segW;
  });
}
