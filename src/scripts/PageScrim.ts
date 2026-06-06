// Scroll-driven dark overlay between the sticky hero and the overlay-stack
// content below it. Tied to the Marquee's top edge — as the Marquee enters
// the viewport, the overlay fades in; once the Marquee scrolls past the
// top, the overlay clears (otherwise it would tint everything below).
//
// Listens to native `scroll` events — Lenis emits these on every step too,
// so a single subscription covers both paths.

const MAX_SCRIM = 0.65;

export function initPageScrim(): void {
  let heroScrim: HTMLElement | null = null;
  let marqueeEl: HTMLElement | null = null;
  let raf = 0;

  const update = () => {
    raf = 0;
    if (!heroScrim || !marqueeEl) return;
    const vh = window.innerHeight;
    const top = marqueeEl.getBoundingClientRect().top;
    let p: number;
    const start = vh * 0.5;
    if (top >= start || top <= 0) p = 0;
    else p = 1 - top / start;
    heroScrim.style.opacity = String(p * MAX_SCRIM);
  };

  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(update);
  };

  const init = () => {
    heroScrim = document.querySelector<HTMLElement>('#page-scrim');
    marqueeEl = document.querySelector<HTMLElement>('.marquee');
    update();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
}
