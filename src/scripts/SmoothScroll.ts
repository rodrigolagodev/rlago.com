import Lenis from 'lenis';

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export function initSmoothScroll(): Lenis | null {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    attachAnchorHijack(null);
    return null;
  }

  const lenis = new Lenis({
    duration: 2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  window.__lenis = lenis;

  const raf = (time: number) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  attachAnchorHijack(lenis);
  return lenis;
}

function attachAnchorHijack(lenis: Lenis | null) {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>('a');
    if (!link) return;

    if (link.hasAttribute('data-scroll-top')) {
      e.preventDefault();
      if (lenis) lenis.scrollTo(0);
      else window.scrollTo({ top: 0 });
      return;
    }

    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#') || href === '#') return;
    const el = document.querySelector(href);
    if (!el) return;
    if (lenis) {
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement);
    }
  });
}
