// Scroll-driven dark overlay between the sticky Hero and overlay-stack
// content. Driven by the Marquee's top edge: enters as the Marquee crosses
// into the viewport, clears once it scrolls past the top (otherwise the
// fixed scrim would tint every section that follows).

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
    requestAnimationFrame(update);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
}
