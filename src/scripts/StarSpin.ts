// Continuous rotation accelerated by scroll velocity. Writes the angle into
// a CSS custom property so callers can compose it with other transforms.

export interface StarSpinOpts {
  baseDegPerSec?: number;
  boostFactor?: number;
  maxBoost?: number;
  decay?: number;
  cssVar?: string;
}

export function startStarSpin(el: HTMLElement, opts: StarSpinOpts = {}): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const BASE = opts.baseDegPerSec ?? 6;
  const BOOST_FACTOR = opts.boostFactor ?? 0.08;
  const MAX_BOOST = opts.maxBoost ?? 90;
  const DECAY = opts.decay ?? 0.9;
  const cssVar = opts.cssVar ?? '--star-spin';

  let angle = 0;
  let boost = 0;
  let prevScrollY = window.scrollY;
  let prevT = performance.now();

  const spin = (now: number) => {
    const dt = Math.min(0.1, (now - prevT) / 1000);
    prevT = now;

    const dy = window.scrollY - prevScrollY;
    prevScrollY = window.scrollY;
    const instBoost = dt > 0
      ? Math.min(MAX_BOOST, Math.abs(dy / dt) * BOOST_FACTOR)
      : 0;
    if (instBoost > boost) {
      boost = instBoost;
    } else {
      boost *= Math.pow(DECAY, dt * 60);
    }

    angle = (angle + (BASE + boost) * dt) % 360;
    el.style.setProperty(cssVar, `${angle}deg`);
    requestAnimationFrame(spin);
  };
  requestAnimationFrame(spin);
}
