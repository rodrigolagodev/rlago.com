// Split-flap-style hover effect. Marked nodes ([data-scramble]) cycle each
// character through random glyphs and land on the original on hover/focus
// of the nearest interactive ancestor. Pass-through on prefers-reduced-motion.
//
//   <a href="...">Hello <span data-scramble>World</span></a>
//   <a href="..." data-scramble>Home</a>

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

type Slot = { el: HTMLSpanElement; final: string; isSpace: boolean };

function findTrigger(el: HTMLElement): HTMLElement {
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
    const isSpace = ch === ' ' || ch === ' ';
    span.textContent = isSpace ? ' ' : ch;
    el.appendChild(span);
    slots.push({ el: span, final: isSpace ? ' ' : ch, isSpace });
  }
  return slots;
}

function setupOne(target: HTMLElement) {
  if (target.dataset.scrambleReady === 'true') return;
  target.dataset.scrambleReady = 'true';

  // Lock the node to its natural pre-split width so cycling glyphs (W vs I
  // have very different advances) don't grow/shrink the box and push
  // siblings sideways. inline-block + nowrap + overflow visible so a wider
  // glyph paints past the box edge instead of expanding it.
  const cs = window.getComputedStyle(target);
  if (cs.display === 'inline') {
    target.style.display = 'inline-block';
  }
  target.style.whiteSpace = 'nowrap';
  target.style.overflow = 'visible';
  // +1px absorbs sub-pixel rounding.
  const naturalWidth = target.getBoundingClientRect().width + 1;
  target.style.width = `${naturalWidth}px`;

  const charClass = target.dataset.scrambleClass || 'scramble-char';
  const slots = splitIntoSlots(target, charClass);

  // Post-split layout can drift a fraction per glyph; bump the lock up if so.
  if (target.scrollWidth > naturalWidth) {
    target.style.width = `${target.scrollWidth + 1}px`;
  }

  // CRITICAL: do NOT touch target's real DOM here (no innerHTML / textContent
  // reset). Doing so destroys the per-char spans the slots[] array references,
  // leaving every slot.el pointing at a detached node — the effect silently
  // stops working. Measure via an offscreen clone instead.
  const remeasure = () => {
    const clone = document.createElement(target.tagName);
    clone.className = target.className;
    clone.textContent = slots.map((s) => s.final).join('');
    clone.style.position = 'absolute';
    clone.style.visibility = 'hidden';
    clone.style.pointerEvents = 'none';
    clone.style.whiteSpace = 'nowrap';
    clone.style.width = 'auto';
    clone.style.left = '0';
    clone.style.top = '0';
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

    // Fixed total window so every letter starts AND lands together; per-char
    // flip count varies the cadence in between.
    const TOTAL_MS = 620;
    let landed = 0;
    slots.forEach((slot) => {
      if (slot.isSpace) { landed++; return; }
      const flips = 5 + Math.floor(Math.random() * 4);
      const stepMs = TOTAL_MS / flips;

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
