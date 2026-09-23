// Scroll-driven dark overlay between the sticky Hero and overlay-stack
// content. Driven by the Marquee's top edge: enters as the Marquee crosses
// into the viewport, clears once it scrolls past the top (otherwise the
// fixed scrim would tint every section that follows).

import { onScrollFrame } from './ScrollScheduler';

const MAX_SCRIM = 0.65;

export function initPageScrim(): void {
  const init = () => {
    const heroScrim = document.querySelector<HTMLElement>('#page-scrim');
    const marqueeEl = document.querySelector<HTMLElement>('.marquee');
    if (!heroScrim || !marqueeEl) return;

    // `will-change: opacity` on a fixed, full-viewport element keeps a
    // composited layer alive for the whole page — 14 MB at 1440p — even though
    // the scrim is only ever visible across the Hero hand-off. Take it out of
    // the layer tree entirely the rest of the time.
    let shown = true;
    onScrollFrame<number>({
      read({ viewportH }) {
        const top = marqueeEl.getBoundingClientRect().top;
        const start = viewportH * 0.5;
        if (top >= start || top <= 0) return 0;
        return 1 - top / start;
      },
      write(p) {
        const visible = p > 0.001;
        if (visible !== shown) {
          shown = visible;
          heroScrim.style.display = visible ? '' : 'none';
        }
        if (visible) heroScrim.style.opacity = String(p * MAX_SCRIM);
      },
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
