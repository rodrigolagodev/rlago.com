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

    onScrollFrame<number>({
      read({ viewportH }) {
        const top = marqueeEl.getBoundingClientRect().top;
        const start = viewportH * 0.5;
        if (top >= start || top <= 0) return 0;
        return 1 - top / start;
      },
      write(p) {
        heroScrim.style.opacity = String(p * MAX_SCRIM);
      },
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
