// Smooth-scroll wiring: Lenis instance + anchor-click hijack.
//
// - Honours prefers-reduced-motion: returns null and skips Lenis entirely,
//   letting the browser do native scrolling for vestibular-sensitive users.
// - Exposes the instance on `window.__lenis` so components that need
//   programmatic scroll (Hero scroll button, Footer back-to-top, etc.) can
//   find it.
// - Hijacks same-page anchor clicks so they go through Lenis when present,
//   including a [data-scroll-top] convenience for Home links.

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

    // [data-scroll-top] → smooth scroll to top (Home links).
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
    // No-lenis (reduced motion): let the browser's native anchor jump
    // happen — instant, no smooth scroll, no surprises.
  });
}
