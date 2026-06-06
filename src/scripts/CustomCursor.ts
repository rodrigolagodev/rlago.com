export function initCustomCursor(): void {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const INTERACTIVE_SELECTOR =
    'a, button, [role="button"], label, summary, [data-cursor="active"]';

  window.addEventListener('mousemove', (e) => {
    cursor.style.setProperty('--cx', `${e.clientX}px`);
    cursor.style.setProperty('--cy', `${e.clientY}px`);
    cursor.classList.add('is-ready');

    const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const isInteractive = !!under?.closest(INTERACTIVE_SELECTOR);
    cursor.classList.toggle('is-active', isInteractive);
  });

  window.addEventListener('mouseleave', () => cursor.classList.remove('is-ready'));
  window.addEventListener('mouseenter', () => cursor.classList.add('is-ready'));
}
