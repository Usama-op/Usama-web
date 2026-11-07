/* scroll.js: one shared frame loop plus buttery scrolling.
   - window.PS.frame(fn): run fn(dt, now) every animation frame while it returns true (or while anything is awake).
     The background, hero parallax and scroll smoothing all share this single loop, so there is one
     requestAnimationFrame per frame and a fixed order: scroll first, visuals second.
   - Mouse wheels (not trackpads, which are already smooth) glide to their target with frame-rate independent easing.
   - Menu and button links (#section) glide with an eased tween instead of the browser's jumpy smooth-scroll.
   - Touch scrolling is left completely native, because the browser's own momentum is the smoothest there is.
   Reduced-motion visitors get instant jumps. */
(() => {
  'use strict';
  const html = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  /* ---------- shared frame loop ---------- */
  const fns = [];
  let raf = 0, last = 0;
  const loop = (t) => {
    raf = 0;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60;
    last = t;
    let more = false;
    for (let i = 0; i < fns.length; i++) if (fns[i](dt, t)) more = true;
    if (more) raf = requestAnimationFrame(loop); else last = 0;
  };
  const wake = () => { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } };
  const frame = (fn) => { fns.push(fn); wake(); };

  /* ---------- smooth scrolling ---------- */
  let cur = scrollY, tgt = scrollY, own = scrollY, moving = false, tween = null;
  const maxY = () => Math.max(0, html.scrollHeight - innerHeight);
  const put = (y) => { own = y; scrollTo(0, y); };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic

  const to = (y, instant) => {
    y = clamp(y, 0, maxY());
    const d = Math.abs(y - scrollY);
    moving = false;
    if (reduced || instant || d < 2) { tween = null; put(y); cur = tgt = y; wake(); return; }
    tween = { from: scrollY, to: y, t: 0, dur: clamp(0.5 + Math.sqrt(d) / 90, 0.6, 1.5) };
    wake();
  };

  frame((dt) => {
    if (tween) {
      tween.t += dt / tween.dur;
      const k = tween.t >= 1 ? 1 : ease(tween.t);
      cur = tgt = tween.from + (tween.to - tween.from) * k;
      put(cur);
      if (tween.t >= 1) tween = null;
      return !!tween;
    }
    if (moving) {
      cur += (tgt - cur) * (1 - Math.exp(-dt * 11));        // ~90 ms time constant, independent of frame rate
      if (Math.abs(tgt - cur) < 0.4) { cur = tgt; moving = false; }
      put(cur);
      return moving;
    }
    return false;
  });

  /* something else moved the page (scrollbar drag, keyboard, find in page): follow it, don't fight it */
  addEventListener('scroll', () => {
    if (Math.abs(scrollY - own) > 3) { cur = tgt = scrollY; moving = false; tween = null; }
    wake();
  }, { passive: true });

  /* ---------- mouse wheel glide (desktop mice only) ---------- */
  const innerScroller = (el, dy) => {
    for (let n = 0; el && el !== document.body && el !== html && n < 12; el = el.parentElement, n++) {
      if (el.tagName === 'TEXTAREA' || el.tagName === 'OBJECT' || el.tagName === 'IFRAME') return true;
      const cs = getComputedStyle(el);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
        if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
      }
    }
    return false;
  };
  if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('wheel', (e) => {
      tween = null;
      if (e.ctrlKey || e.defaultPrevented || document.body.classList.contains('lock')) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 36;
      else if (e.deltaMode === 2) dy *= innerHeight;
      else {
        // a physical wheel reports whole notches (multiples of 120); trackpads report small, smooth values
        const wd = e.wheelDeltaY;
        if (!(wd && wd % 120 === 0 && Math.abs(dy) >= 40)) return;
      }
      if (innerScroller(e.target, dy)) return;
      e.preventDefault();
      if (!moving) cur = tgt = scrollY;
      tgt = clamp(tgt + dy, 0, maxY());
      moving = true;
      wake();
    }, { passive: false });
  }
  ['touchstart', 'keydown'].forEach((ev) => addEventListener(ev, () => { tween = null; }, { passive: true }));

  /* ---------- in-page links glide to their section ---------- */
  const navOffset = () => parseFloat(getComputedStyle(html).scrollPaddingTop) || 84;
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target instanceof Element && e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const el = id ? document.getElementById(id) : null;
    if (id && !el) return;
    e.preventDefault();
    const y = !el || id === 'home' ? 0 : el.getBoundingClientRect().top + scrollY - navOffset();
    // next frame, so a closing mobile menu has released its scroll lock first
    requestAnimationFrame(() => to(y));
    try { history.pushState(null, '', id ? '#' + id : location.pathname + location.search); } catch (_) {}
    if (el) { if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
  });

  window.PS = { frame, wake, to, get y() { return scrollY; } };
})();
