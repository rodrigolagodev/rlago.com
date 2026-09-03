export function initCustomCursor(): void {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const INTERACTIVE_SELECTOR =
    'a, button, [role="button"], label, summary, [data-cursor="active"]';

  // High-polling-rate mice can fire mousemove hundreds of times per second.
  // Coalesce into one RAF tick: cheap CSS var writes still happen every
  // event, but the expensive `elementFromPoint` (forces layout) runs at
  // most once per frame.
  let x = 0;
  let y = 0;
  let hitTestPending = false;

  const runHitTest = () => {
    hitTestPending = false;
    const under = document.elementFromPoint(x, y) as HTMLElement | null;
    const isInteractive = !!under?.closest(INTERACTIVE_SELECTOR);
    cursor.classList.toggle('is-active', isInteractive);
  };

  window.addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;
    cursor.style.setProperty('--cx', `${x}px`);
    cursor.style.setProperty('--cy', `${y}px`);
    cursor.classList.add('is-ready');

    if (!hitTestPending) {
      hitTestPending = true;
      requestAnimationFrame(runHitTest);
    }
  });

  window.addEventListener('mouseleave', () => cursor.classList.remove('is-ready'));
  window.addEventListener('mouseenter', () => cursor.classList.add('is-ready'));
}
