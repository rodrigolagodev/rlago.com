// Hero configuration of the reusable kinetic text effect. The Hero title is
// sticky-positioned, so its stretch progress is driven by raw page scroll.

import {
  KineticTextEffect,
  kineticLine,
  stickyScrollProgress,
} from './KineticTextEffect';

// Stretched glyphs (0-based): "RODRIGO LAGO" → D, O, L, G; "UX ENGINEER" → X, N, N.
const HERO_LINES = [
  kineticLine('RODRIGO LAGO', [2, 6, 8, 10]),
  kineticLine('UX ENGINEER', [1, 4, 7]),
];

export class HeroKineticEffect extends KineticTextEffect {
  constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
    super(container, canvas, {
      lines: HERO_LINES,
      progress: stickyScrollProgress(2),
    });
  }
}
