// ════════════════════════════════════════════════════════════════
// ScrambleHover — split-flap-style hover effect adapted to text-only.
//
// Mark any element with `data-scramble` and on hover/focus of its
// nearest interactive ancestor (<a>, <button>, [role="button"]) each
// character will cycle through random glyphs and land on the original
// one. Adapted from the deleted Tecnologias.astro letrero, distilled to
// plain textContent swaps — no cells, no 3D rotation, just type.
//
// Usage:
//   <a href="...">Hello <span data-scramble>World</span></a>
//   <a href="..." data-scramble>Home</a>
//
// The scramble only affects the marked node's text. Nested elements
// (sr-only spans, <strong>, icons) outside the marked node are left
// alone. Pass-through when prefers-reduced-motion is set.
// ════════════════════════════════════════════════════════════════

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

type Slot = { el: HTMLSpanElement; final: string; isSpace: boolean };

function findTrigger(el: HTMLElement): HTMLElement {
  // Hover/focus is read from the nearest interactive ancestor so the
  // scramble fires from the natural click target — anchors, buttons,
  // [role="button"] elements. Fallback: the marked node itself.
  return (
    el.closest<HTMLElement>('a, button, [role="button"]') ?? el
  );
}

function splitIntoSlots(el: HTMLElement, charClass: string): Slot[] {
  const source = (el.textContent || '');
  el.textContent = '';
  const slots: Slot[] = [];
  for (const ch of source) {
    const span = document.createElement('span');
    span.className = charClass;
    const isSpace = ch === ' ' || ch === ' ';
    span.textContent = isSpace ? ' ' : ch;
    el.appendChild(span);
    slots.push({ el: span, final: isSpace ? ' ' : ch, isSpace });
  }
  return slots;
}

function setupOne(target: HTMLElement) {
  if (target.dataset.scrambleReady === 'true') return;
  target.dataset.scrambleReady = 'true';

  // ── Width lock ──
  // Different glyphs (W vs I) have very different advance widths in a
  // proportional font. If we let the marked node size to its current
  // contents, the cycling random chars would grow/shrink it on every
  // tick — and any sibling laid out next to it would jitter sideways.
  // Lock the node to its NATURAL pre-split width: inline-block so the
  // width applies, nowrap so spaces inside don't wrap into a second
  // line, overflow visible so a momentarily-wider glyph paints past
  // the box edge instead of pushing the box itself.
  const cs = window.getComputedStyle(target);
  if (cs.display === 'inline') {
    target.style.display = 'inline-block';
  }
  target.style.whiteSpace = 'nowrap';
  target.style.overflow = 'visible';
  // +1px buffer absorbs sub-pixel rounding so the locked width never
  // ends up shy of the natural content width.
  const naturalWidth = target.getBoundingClientRect().width + 1;
  target.style.width = `${naturalWidth}px`;

  // Per-char class allows callers to style the slots (e.g. min-width
  // for big display type). Default class is inline-block so reflows
  // stay local to the marked node.
  const charClass = target.dataset.scrambleClass || 'scramble-char';
  const slots = splitIntoSlots(target, charClass);

  // Post-split width can drift a hair (inline-block layout differs
  // from inline text layout by a fraction of a px per glyph). If the
  // post-split content needs more room, bump the lock up to match.
  if (target.scrollWidth > naturalWidth) {
    target.style.width = `${target.scrollWidth + 1}px`;
  }

  // Re-measure on resize. Fluid type (clamp() driven by vw) changes
  // the natural width on viewport changes; if we kept the original
  // px lock the word would clip or float against its siblings at the
  // new size.
  //
  // CRITICAL: do NOT touch target's real DOM (no innerHTML swap, no
  // textContent reset). Doing so destroys and replaces the per-char
  // spans the slots[] array points at, leaving every slot.el pointing
  // at a detached node — every subsequent scramble updates ghosts in
  // memory and the visible text stops changing. Resize events fire
  // for plenty of reasons (mobile address-bar collapse on scroll,
  // orientation change, browser zoom, DevTools toggle) so this bug
  // manifested as "the effect stops working after a while".
  //
  // Instead, measure via an offscreen clone of the target. The real
  // spans never move; slot.el references stay live.
  const remeasure = () => {
    const clone = document.createElement(target.tagName);
    // Copy class so the clone inherits the same typography (font,
    // size, letter-spacing) as the live target.
    clone.className = target.className;
    clone.textContent = slots.map((s) => s.final).join('');
    clone.style.position = 'absolute';
    clone.style.visibility = 'hidden';
    clone.style.pointerEvents = 'none';
    clone.style.whiteSpace = 'nowrap';
    clone.style.width = 'auto';
    clone.style.left = '0';
    clone.style.top = '0';
    // Use the same parent so any inherited styles (color, font, etc.)
    // resolve identically to the live element.
    const parent = target.parentElement;
    if (!parent) return;
    parent.appendChild(clone);
    const w = clone.getBoundingClientRect().width + 1;
    parent.removeChild(clone);
    target.style.width = `${w}px`;
    if (target.scrollWidth > w) {
      target.style.width = `${target.scrollWidth + 1}px`;
    }
  };
  window.addEventListener('resize', remeasure, { passive: true });

  // Honour reduced-motion. The text is still split into chars (cheap),
  // but we never fire the cycle.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const trigger = findTrigger(target);
  let timers: number[] = [];
  let running = false;

  const stopAll = () => {
    timers.forEach((id) => window.clearTimeout(id));
    timers = [];
  };

  const resetToFinal = () => {
    slots.forEach((s) => { if (!s.isSpace) s.el.textContent = s.final; });
  };

  const scramble = () => {
    if (running) return;
    running = true;
    stopAll();

    // Fixed total cycle so every letter starts AND lands together.
    // The visual variation per char comes from how many flips each
    // one does inside that fixed window: a letter with 5 flips cycles
    // slower (longer stepMs), one with 8 cycles faster — but both
    // finish at TOTAL_MS. Result: synchronised entrance + exit, but
    // each glyph has its own rhythm in between.
    const TOTAL_MS = 620;
    let landed = 0;
    slots.forEach((slot) => {
      if (slot.isSpace) { landed++; return; }
      const flips = 5 + Math.floor(Math.random() * 4);     // 5–8 flips
      const stepMs = TOTAL_MS / flips;                     // cadence per char

      let step = 0;
      const tick = () => {
        if (step >= flips) {
          slot.el.textContent = slot.final;
          landed++;
          if (landed === slots.length) running = false;
          return;
        }
        slot.el.textContent =
          step === flips - 1
            ? slot.final
            : CHARSET[(Math.random() * CHARSET.length) | 0];
        step++;
        timers.push(window.setTimeout(tick, stepMs));
      };
      timers.push(window.setTimeout(tick, 0));
    });
  };

  trigger.addEventListener('mouseenter', scramble);
  trigger.addEventListener('focus', scramble, true);

  // Defensive cleanup — if the cursor leaves mid-cycle, kill timers and
  // snap to the final word so the link can't be left mid-scramble.
  const cancel = () => {
    if (!running) return;
    stopAll();
    running = false;
    resetToFinal();
  };
  trigger.addEventListener('mouseleave', cancel);
  trigger.addEventListener('blur', cancel, true);
}

export function initScrambleHover(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-scramble]').forEach(setupOne);
}
