// Batched scroll work.
//
// Five components used to attach their own scroll listener, each measuring the
// document and then writing styles. Because the writes landed between the
// reads, every scroll frame forced several layout passes — the classic
// read/write thrash, and the reason scrolling got heavier as the page grew.
//
// Here every subscriber's `read` runs before any subscriber's `write`. Only
// the first read of a frame can force layout; the rest hit a clean tree, and
// the write phase touches nothing that invalidates it.

export interface ScrollMetrics {
  scrollY: number;
  viewportH: number;
  /** Scrollable distance in px; 0 when the page fits the viewport. */
  maxScroll: number;
}

export interface ScrollSubscriber<T> {
  /** Measure only. Must not write to the DOM. */
  read(metrics: ScrollMetrics): T;
  /** Apply only. Must not measure the DOM. */
  write(measured: T, metrics: ScrollMetrics): void;
}

type AnySubscriber = ScrollSubscriber<unknown>;

const subscribers = new Set<AnySubscriber>();
const measured = new Map<AnySubscriber, unknown>();
let rafId = 0;

const run = () => {
  rafId = 0;
  if (subscribers.size === 0) return;

  const doc = document.documentElement;
  const viewportH = window.innerHeight;
  const metrics: ScrollMetrics = {
    scrollY: window.scrollY,
    viewportH,
    maxScroll: Math.max(0, doc.scrollHeight - viewportH),
  };

  const list = Array.from(subscribers);
  for (const sub of list) measured.set(sub, sub.read(metrics));
  for (const sub of list) sub.write(measured.get(sub), metrics);
  measured.clear();
};

const schedule = () => {
  if (rafId === 0) rafId = requestAnimationFrame(run);
};

let listening = false;
const startListening = () => {
  if (listening) return;
  listening = true;
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  // Layout settles after fonts and images land, which moves every section.
  window.addEventListener('load', schedule);
  if (document.fonts?.ready) document.fonts.ready.then(schedule).catch(() => {});
};

/** Register batched scroll work. Returns an unsubscribe function. */
export function onScrollFrame<T>(sub: ScrollSubscriber<T>): () => void {
  subscribers.add(sub as AnySubscriber);
  startListening();
  schedule();
  return () => {
    subscribers.delete(sub as AnySubscriber);
    measured.delete(sub as AnySubscriber);
  };
}

/** Force a pass — for callers that changed layout themselves. */
export function requestScrollUpdate(): void {
  schedule();
}
