/* swarm-launch.js: plays the swarm-cursors intro on load.
   swarm.js is "Swarm Rebuild" by DhvanilPatel (github.com/DhvanilPatel/swarm-cursors). The only edits are audio robustness: a larger audio buffer and fewer simultaneous voices (see CHANGELOG 2.3).
   It snapshots the page, then a swarm of cursors redraws it. This launcher keeps it from getting in the way:
   - the swarm layer is click-through, so links, buttons and scrolling work underneath it;
   - the nav and menu live in the browser top layer (see main.js), so they stay above it;
   - "Skip intro" (or Escape) ends it and remembers that for this browser session;
   - ?swarm=off and prefers-reduced-motion switch it off; the footer link replays it. */
(() => {
  'use strict';
  const api = () => window.__swarmRebuild;
  const running = () => !!(api() && api().app);
  let loading = false, poll = 0, skipped = false;
  try { skipped = sessionStorage.getItem('swarm-skip') === '1'; } catch (_) {}

  /* Skip button: top layer, so it stays above (and clickable over) the swarm */
  const skip = document.createElement('button');
  skip.id = 'swarm-skip'; skip.type = 'button'; skip.textContent = 'Skip intro ✕';
  skip.setAttribute('aria-label', 'Skip the swarm intro and show the page');
  skip.hidden = true;
  document.body.appendChild(skip);
  const canPopover = typeof skip.showPopover === 'function';
  if (canPopover) skip.setAttribute('popover', 'manual');
  const showSkip = (on) => {
    skip.hidden = !on;
    if (!canPopover) return;
    try {
      const open = skip.matches(':popover-open');
      if (on && !open) skip.showPopover(); else if (!on && open) skip.hidePopover();
    } catch (_) {}
  };

  /* make the swarm host ignore the pointer so the real page stays usable underneath */
  const passThrough = () => {
    for (const e of document.documentElement.querySelectorAll(':scope > *, :scope > body > *')) {
      if (e.shadowRoot && e.style.zIndex === '2147483647' && e.style.pointerEvents !== 'none') e.style.setProperty('pointer-events', 'none', 'important');
    }
  };
  /* one light timer that only runs while the swarm is active, then stops itself */
  const tick = () => {
    const active = running() || loading;
    if (running()) passThrough();
    /* show Skip only after the swarm has captured the page (app.model exists), or the button
       would be copied into the replica; restore normal transitions at the same moment */
    const captured = running() && !!api().app.model;
    if (captured) document.documentElement.classList.remove('swarm-prep');
    showSkip(!skipped && captured);
    if (!active) { document.documentElement.classList.remove('swarm-prep', 'swarm-on'); clearInterval(poll); poll = 0; }
  };
  const watch = () => { if (!poll) { tick(); poll = setInterval(tick, 250); } };

  /* Snap every scroll-reveal and skill bar to its final state so the swarm copies the finished page, not a mid-fade one */
  const prep = () => {
    document.documentElement.classList.add('swarm-prep', 'swarm-on');
    document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('in'));
  };
  const start = () => {
    prep();
    // set the loading state BEFORE the timer starts, or its first tick sees "idle" and ends the prep too early
    if (api()) { if (!api().app) api().start(); }
    else if (!loading) {
      loading = true;
      const s = document.createElement('script'); s.src = 'js/swarm.js';
      s.onload = () => { loading = false; }; s.onerror = () => { loading = false; };
      document.body.appendChild(s);
    }
    watch();
  };
  const doSkip = () => {
    skipped = true;
    try { sessionStorage.setItem('swarm-skip', '1'); } catch (_) {}
    if (running()) api().stop(true);
    showSkip(false);
  };
  skip.addEventListener('click', doSkip);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && running()) doSkip(); });

  const replay = document.getElementById('swarm-btn');
  if (replay) replay.addEventListener('click', () => {
    skipped = false;
    try { sessionStorage.removeItem('swarm-skip'); } catch (_) {}
    scrollTo({ top: 0, behavior: 'instant' }); // instant: the swarm must start from a settled position
    start();
  });

  const off = skipped || /[?&]swarm=off/.test(location.search) || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (off) return;

  /* Wait for fonts and images so the swarm copies the finished page. Lazy images are made eager first,
     otherwise the browser never loads the ones below the fold; a timeout keeps a slow image from blocking the intro. */
  const settle = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
  const imgs = () => Promise.all([...document.images].map((i) => {
    i.loading = 'eager';
    return i.complete ? 0 : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); });
  }));
  const ready = () => settle(Promise.all([(document.fonts && document.fonts.ready) || 0, imgs()]), 4000)
    .then(() => setTimeout(() => { if (!skipped) start(); }, 250));
  document.readyState === 'complete' ? ready() : addEventListener('load', ready, { once: true });
})();
