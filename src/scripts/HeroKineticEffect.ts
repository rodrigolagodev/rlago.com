// Hero-only kinetic variant of the water-distortion text.
// Extends TextDistortion to overlay scroll-driven horizontal stretching
// on certain glyphs ("—" between FRONT and END, the "O" in DEVELOPER).
//
// The base class handles the WebGL water effect; this subclass takes over
// the 2D text rendering on the underlying canvas, switching to a
// segment-based renderer that supports per-segment scaleX.

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
  // AbortController so window listeners get torn down in one call —
  // a missed removeEventListener leaks the instance across hot reloads.
  private abortController: AbortController | null = null;

  constructor(
    container: HTMLElement,
    canvas: HTMLCanvasElement,
    scrollSource: HTMLElement
  ) {
    // Pass empty lines — we never use the base renderText flow.
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

  // How many viewport heights of scroll the kinetic takes to reach full stretch.
  // 1.0 = stretches fully over the first viewport of scroll (faster, more dramatic)
  // 1.5 = stretches over 1.5 viewports (current; slower, more gradual)
  // 2.0 = stretches over 2 viewports (much slower)
  private static readonly KINETIC_RANGE = 2;

  private updateScrollProgress() {
    // Use window.scrollY and innerHeight directly — sticky positioning on the
    // hero would make rect.top stay at 0 throughout the sticky phase, which
    // freezes progress. window.scrollY changes regardless of how the hero is
    // positioned, so the kinetic stays in sync with actual page scroll.
    const heroHeight = window.innerHeight || 1;
    const scrollY =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0;
    const range = heroHeight * HeroKineticEffect.KINETIC_RANGE;
    this.scrollProgress = Math.max(0, Math.min(1, scrollY / range));
  }

  // Called every frame by the base class before WebGL renders.
  // Recompute progress here too — defensive against any scenario where the
  // scroll event listener doesn't fire (sticky edge cases, smooth-scroll
  // interactions, etc). Only re-rasterise when progress meaningfully changed.
  protected beforeRender() {
    this.updateScrollProgress();
    if (Math.abs(this.scrollProgress - this.lastRenderedProgress) > 0.001) {
      this.renderText();
      this.lastRenderedProgress = this.scrollProgress;
    }
  }

  // Override base renderText with segment-aware kinetic rendering.
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

    // Read the h1's actual font-size instead of deriving it from container
    // height. The previous formula `height / N / 0.85` assumed the wrapper
    // height equals N × fontSize × 0.85, but inline-block elements with
    // line-height < the font's intrinsic ascent+descent can render taller
    // than that, making the derived fontSize larger than the h1's real
    // fontSize and rendering text wider than canvasWidth → letters at the
    // extremes get clipped. Reading getComputedStyle.fontSize guarantees
    // the canvas uses exactly what the DOM uses.
    const h1El = this.container.querySelector<HTMLElement>(
      '[data-text-distortion-text]',
    );
    const fontSize = h1El
      ? parseFloat(window.getComputedStyle(h1El).fontSize)
      : (height / segLines.length) / 0.85;
    applyFont(ctx, fontSize);

    ctx.fillStyle = readTextColor();
    ctx.textBaseline = 'alphabetic';

    // Use a representative sample for ascent/descent (caps)
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

// Render a centered line composed of segments. Each segment can opt-in
// to a horizontal scale via scaleX; the line's total width is the sum
// of scaled segment widths.
function drawSegmentLine(
  ctx: CanvasRenderingContext2D,
  segments: Segment[],
  centerX: number,
  baselineY: number
) {
  // Measure each segment with textAlign 'left' so the actualBoundingBox
  // values use the advance-box left edge as their reference (the same
  // anchor as the unscaled drawing path below).
  ctx.textAlign = 'left';
  const widths = segments.map((seg) => {
    const w = ctx.measureText(seg.text).width;
    return w * (seg.scaleX ?? 1);
  });
  const total = widths.reduce((a, b) => a + b, 0);

  // Centre by VISIBLE ink bounds, not advance-width sum. Negative
  // letter-spacing makes each glyph's advance narrower than its visible
  // width, so the last glyph's ink protrudes past the advance end by
  // ~|letter-spacing|. Advance-based centring leaves the visible text
  // shifted right inside the canvas (more empty space on the left of
  // the first glyph than on the right of the last). We recover symmetry
  // by shifting the cursor by (abbLeft_first + last_advance - abbRight_last) / 2.
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
