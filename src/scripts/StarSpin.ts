// Continuous rotation accelerated by scroll velocity. Writes the angle into a
// CSS custom property so callers can compose it with other transforms.
//
// Every star shares one frame callback and one scroll read. Previously each
// star ran its own RAF loop and read `window.scrollY` independently, which
// multiplied both the callback overhead and the chance of forcing a layout
// flush mid-frame.

import { onFrame } from './FrameLoop';

export interface StarSpinOpts {
  baseDegPerSec?: number;
  boostFactor?: number;
  maxBoost?: number;
  decay?: number;
  cssVar?: string;
}

interface Star {
  el: HTMLElement;
  /** Off-screen stars are skipped: nobody can see them turn, and each one
      costs a custom-property write and a style recalculation per frame. */
  visible: boolean;
  base: number;
  boostFactor: number;
  maxBoost: number;
  decay: number;
  cssVar: string;
  angle: number;
  boost: number;
}

const stars: Star[] = [];
let stopLoop: (() => void) | null = null;
let prevScrollY = 0;

const syncLoop = () => {
  const anyVisible = stars.some((s) => s.visible);
  if (anyVisible && !stopLoop) {
    prevScrollY = window.scrollY;
    stopLoop = onFrame(tick);
  } else if (!anyVisible && stopLoop) {
    stopLoop();
    stopLoop = null;
  }
};

const observer =
  typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const star = stars.find((s) => s.el === entry.target);
            if (star) star.visible = entry.isIntersecting;
          }
          syncLoop();
        },
        { rootMargin: '200px' },
      )
    : null;

const tick = (_now: number, dtScale: number) => {
  const dt = dtScale / 60;
  // One scroll read per frame, shared by every star.
  const scrollY = window.scrollY;
  const dy = scrollY - prevScrollY;
  prevScrollY = scrollY;
  const speed = dt > 0 ? Math.abs(dy / dt) : 0;

  for (const s of stars) {
    if (!s.visible) continue;
    const instBoost = Math.min(s.maxBoost, speed * s.boostFactor);
    if (instBoost > s.boost) s.boost = instBoost;
    else s.boost *= Math.pow(s.decay, dtScale);

    s.angle = (s.angle + (s.base + s.boost) * dt) % 360;
    s.el.style.setProperty(s.cssVar, `${s.angle}deg`);
  }
};

export function startStarSpin(el: HTMLElement, opts: StarSpinOpts = {}): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const star: Star = {
    el,
    base: opts.baseDegPerSec ?? 6,
    boostFactor: opts.boostFactor ?? 0.08,
    maxBoost: opts.maxBoost ?? 90,
    decay: opts.decay ?? 0.9,
    cssVar: opts.cssVar ?? '--star-spin',
    angle: 0,
    boost: 0,
    // Assume visible until the observer reports otherwise, so a star already
    // on screen at load starts turning on the first frame.
    visible: true,
  };
  stars.push(star);

  if (observer) observer.observe(el);
  syncLoop();
}
