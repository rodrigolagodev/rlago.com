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
  // [data-mask-reveal-manual] opts out — those components fire their own
  // reveal at a non-viewport-based moment (e.g. Footer reveal when the
  // sticky cover slides away).
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
