// Reveal helpers — three related effects:
//
// 1. setupMaskReveals: splits text into per-word spans wrapped in masks so
//    they can slide up from behind a clip. Runs *before* loader:done so
//    words are hidden the moment the loader clears.
// 2. observeMaskReveals: IntersectionObserver that adds .is-mask-revealed
//    when the element enters the viewport.
// 3. initReveal: orchestrates the above plus the generic [data-reveal] and
//    [data-line-draw] fallbacks for browsers without scroll-driven CSS.

export function setupMaskReveals(): void {
  document.querySelectorAll<HTMLElement>('[data-mask-reveal]').forEach((el) => {
    if (el.dataset.maskReady === 'true') return;
    const text = (el.textContent || '').trim();
    if (!text) return;
    const words = text.split(/\s+/);
    el.innerHTML = words
      .map((w, i) => {
        const safe = w
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<span class="mask-reveal__word"><span class="mask-reveal__inner" style="--i:${i}">${safe}</span></span>`;
      })
      .join(' ');
    el.dataset.maskReady = 'true';
  });
}

function observeMaskReveals(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-mask-revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 },
  );
  // Elements marked with data-mask-reveal-manual opt out of this default
  // viewport-based trigger — they're driven from their own component
  // (e.g. the Footer triggers its reveals when the sticky cover slides
  // away to expose it, not when the element first intersects).
  document.querySelectorAll('[data-mask-reveal]:not([data-mask-reveal-manual])')
    .forEach((el) => observer.observe(el));
}

export function initReveal(): void {
  document.body.classList.add('reveals-ready');
  observeMaskReveals();

  const supportsScrollTimeline =
    typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()');
  if (supportsScrollTimeline) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
  );
  document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));

  // Line-draw fallback: when scroll-timeline is unsupported, a dedicated
  // IO toggles .is-drawn on every [data-line-draw] as it enters. Modern
  // browsers use the CSS @supports path in global.css and skip this.
  const lineObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-drawn');
          lineObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05, rootMargin: '0px 0px -20px 0px' },
  );
  document.querySelectorAll('[data-line-draw]').forEach((el) => lineObserver.observe(el));
}
