// Hero-only kinetic variant of the water-distortion text. Overlays
// scroll-driven horizontal stretching on selected glyphs by overriding
// the 2D text renderer with a segment-aware version.

import { TextDistortion, readTextColor } from './TextDistortion';

type Segment = { text: string; scaleX?: number };
type Line = string | Segment[];

const LETTER_SCALE_MAX = 6;

function getHeroLines(progress: number): Line[] {
  const letterScale = 1 + progress * LETTER_SCALE_MAX;
  return [
     [
      { text: 'RO' },
      { text: 'D', scaleX: letterScale },
      { text: 'RIG' },
      { text: 'O', scaleX: letterScale },
      { text: ' ' },
      { text: 'L', scaleX: letterScale},
      { text: 'A'},
      { text: 'G', scaleX: letterScale },
      { text: 'O'},
    ],
    [
      { text: 'U' },
      { text: 'X', scaleX: letterScale },
      { text: ' ' },
      { text: 'E' },
      { text: 'N', scaleX: letterScale },
      { text: 'GI' },
      { text: 'N', scaleX: letterScale },
      { text: 'EER' },
    ]
  ];
}

export class HeroKineticEffect extends TextDistortion {
  private scrollSource: HTMLElement;
  private scrollProgress = 0;
  private lastRenderedProgress = -1;
  // AbortController so the scroll listener can be torn down in one call —
  // a missed removeEventListener leaks the instance across HMR reloads.
  private abortController: AbortController | null = null;

  constructor(
    container: HTMLElement,
    canvas: HTMLCanvasElement,
    scrollSource: HTMLElement
  ) {
    // Empty lines — the base renderText path is never used.
    super(container, canvas, ['', '', '']);
    this.scrollSource = scrollSource;
  }

  async start() {
    await super.start();
    this.updateScrollProgress();
    this.abortController = new AbortController();
    window.addEventListener('scroll', () => this.updateScrollProgress(), {
      passive: true,
      signal: this.abortController.signal,
    });
  }

  stop() {
    super.stop();
    this.abortController?.abort();
    this.abortController = null;
  }

  private static readonly KINETIC_RANGE = 2;

  private updateScrollProgress() {
    // window.scrollY (not rect.top) because the hero is sticky-positioned —
    // rect.top stays at 0 throughout the sticky phase and would freeze progress.
    const heroHeight = window.innerHeight || 1;
    const scrollY =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0;
    const range = heroHeight * HeroKineticEffect.KINETIC_RANGE;
    this.scrollProgress = Math.max(0, Math.min(1, scrollY / range));
  }

  // Recompute progress here too — defensive against scenarios where the
  // scroll event doesn't fire (sticky edge cases, smooth-scroll interactions).
  protected beforeRender() {
    this.updateScrollProgress();
    if (Math.abs(this.scrollProgress - this.lastRenderedProgress) > 0.001) {
      this.renderText();
      this.lastRenderedProgress = this.scrollProgress;
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

    const linesData = getHeroLines(this.scrollProgress);
    const segLines: Segment[][] = linesData.map((l) =>
      typeof l === 'string' ? [{ text: l }] : l
    );

    // Read the h1's actual fontSize — deriving it from container height
    // (`height / N / 0.85`) drifts when line-height < intrinsic ascent+descent,
    // making canvas text wider than the canvas and clipping the extremes.
    const h1El = this.container.querySelector<HTMLElement>(
      '[data-text-distortion-text]',
    );
    const fontSize = h1El
      ? parseFloat(window.getComputedStyle(h1El).fontSize)
      : (height / segLines.length) / 0.85;
    applyFont(ctx, fontSize);

    ctx.fillStyle = readTextColor();
    ctx.textBaseline = 'alphabetic';

    const sample = ctx.measureText('MgO');
    const ascent = sample.actualBoundingBoxAscent || fontSize * 0.78;
    const descent = sample.actualBoundingBoxDescent || fontSize * 0.05;

    const lineSpacing = fontSize * 0.85;
    const stackHeight = ascent + (segLines.length - 1) * lineSpacing + descent;
    const stackTop = (height - stackHeight) / 2;

    segLines.forEach((segments, i) => {
      const baselineY = stackTop + i * lineSpacing + ascent;
      drawSegmentLine(ctx, segments, width / 2, baselineY);
    });

    this.textTexture.needsUpdate = true;
  }
}

function applyFont(ctx: CanvasRenderingContext2D, size: number) {
  ctx.font = `400 ${size}px "Bebas Neue", Impact, sans-serif`;
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${-0.02 * size}px`;
  }
}

function drawSegmentLine(
  ctx: CanvasRenderingContext2D,
  segments: Segment[],
  centerX: number,
  baselineY: number
) {
  ctx.textAlign = 'left';
  const widths = segments.map((seg) => {
    const w = ctx.measureText(seg.text).width;
    return w * (seg.scaleX ?? 1);
  });
  const total = widths.reduce((a, b) => a + b, 0);

  // Centre by VISIBLE ink bounds, not advance-width sum. Negative
  // letter-spacing makes each glyph's advance narrower than its visible
  // width — advance-based centring leaves the visible text shifted right.
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];
  const firstM = ctx.measureText(firstSeg.text);
  const lastM = ctx.measureText(lastSeg.text);
  const firstScale = firstSeg.scaleX ?? 1;
  const lastScale = lastSeg.scaleX ?? 1;
  const abbLeftFirst = (firstM.actualBoundingBoxLeft || 0) * firstScale;
  const abbRightLast = (lastM.actualBoundingBoxRight || lastM.width) * lastScale;
  const lastAdv = lastM.width * lastScale;
  const visualShift = (abbLeftFirst + lastAdv - abbRightLast) / 2;
  let cursorX = centerX - total / 2 + visualShift;

  segments.forEach((seg, i) => {
    const segW = widths[i];
    const scale = seg.scaleX ?? 1;
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
