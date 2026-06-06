// Continuous rotation of a star/asterisk element, accelerated by scroll
// velocity. Writes the current angle into a CSS custom property so the
// element's `transform` can compose it with other transforms.
//
// Used by About and Footer for their oversized decorative asterisks.
// No-op when the user prefers reduced motion.

export interface StarSpinOpts {
  /** Continuous idle rotation in deg/s (default 6). */
  baseDegPerSec?: number;
  /** Multiplier from scroll-velocity (px/s) to boost (deg/s). */
  boostFactor?: number;
  /** Cap on the boost contribution (deg/s). */
  maxBoost?: number;
  /** Per-60fps-frame exponential decay of boost when input stops. */
  decay?: number;
  /** CSS custom property to write the angle into (default `--star-spin`). */
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
