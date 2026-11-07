/* main.js: navigation, glass lighting, hero parallax, resume, contact form and GitHub data.
   Edit CONFIG to change links without touching anything else. */
(() => {
  'use strict';

  const CONFIG = {
    githubUser: 'Usama-op',
    email: 'uu2234456@gmail.com',
    resumePath: 'assets/resume/Mohammed_Usama_Resume.pdf',

    /* Contact form delivery.
       endpoint: null  -> the form opens a prefilled Gmail / mail-app draft (nothing is sent by the page).
       endpoint: 'https://formspree.io/f/XXXX' (or any URL that accepts a POST) -> the form really sends,
       and shows success or failure from the server's answer.
       encoding: 'json' for Formspree / Web3Forms, 'urlencoded' for Netlify Forms (endpoint '/').
       extra: fixed fields added to every submission, e.g. { access_key: '...' } for Web3Forms. */
    form: { endpoint: null, encoding: 'json', extra: {} }
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* ---------- scroll: progress bar, hero depth, back-to-top ----------
     Runs inside the shared frame loop (js/scroll.js), and only does work when the scroll position changed.
     The page height is cached, so scrolling never forces a layout. */
  const bar = $('#progress-bar'), heroArt = $('#hero-art'), heroImg = heroArt && $('img', heroArt), heroLight = heroArt && $('.hero__light i', heroArt), totop = $('#totop');
  const PS = window.PS;
  let maxScroll = 1, totopOn = null;
  const measureMax = () => { maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight); };
  measureMax();
  addEventListener('resize', measureMax);
  if ('ResizeObserver' in window) new ResizeObserver(measureMax).observe(document.body);
  addEventListener('load', measureMax);

  /* hero parallax: pointer position, smoothed per frame (no CSS transition to restart on every scroll tick) */
  const hero = { tx: 0, ty: 0, x: 0, y: 0, lx: 0, ly: 0, tlx: 0, tly: 0, sy: -1, on: 0 };
  let lastBar = -1, lastTransform = '', heroIdle = 0;
  const frame = (dt) => {
    const y = scrollY;
    const pr = Math.min(y / maxScroll, 1);
    if (pr !== lastBar) { lastBar = pr; bar.style.transform = `scaleX(${pr})`; }
    const on = y > 700;
    if (on !== totopOn) {
      totopOn = on;
      totop.classList.toggle('is-on', on);
      totop.tabIndex = on ? 0 : -1;
      totop.setAttribute('aria-hidden', String(!on));
    }
    let more = false;
    if (heroImg && !reduced && y < innerHeight * 1.6) {
      const k = 1 - Math.exp(-dt * 9);
      hero.x += (hero.tx - hero.x) * k; hero.y += (hero.ty - hero.y) * k;
      hero.lx += (hero.tlx - hero.lx) * (1 - Math.exp(-dt * 14)); hero.ly += (hero.tly - hero.ly) * (1 - Math.exp(-dt * 14));
      const sy = Math.min(y, 800) * 0.12;
      const tf = `translate3d(${(hero.x * -10).toFixed(2)}px,${(hero.y * -6 + sy).toFixed(2)}px,0) scale(1.04)`;
      if (tf !== lastTransform) { lastTransform = tf; heroImg.style.transform = tf; }
      if (heroLight) heroLight.style.transform = `translate3d(${hero.lx.toFixed(1)}px,${hero.ly.toFixed(1)}px,0)`;
      more = Math.abs(hero.tx - hero.x) > 0.001 || Math.abs(hero.ty - hero.y) > 0.001 || Math.abs(hero.tlx - hero.lx) > 0.3 || Math.abs(hero.tly - hero.ly) > 0.3;
    }
    return more;
  };
  if (PS) { PS.frame(frame); addEventListener('scroll', PS.wake, { passive: true }); }
  else { let tk = false; const run = () => { if (tk) return; tk = true; requestAnimationFrame(() => { frame(0.016); tk = false; }); }; addEventListener('scroll', run, { passive: true }); run(); }
  totop.hidden = false;
  totop.addEventListener('click', () => { if (PS) PS.to(0); else scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); });

  /* ---------- active section + sliding glass indicator ---------- */
  const links = $$('[data-link]'), pill = $('#nav-pill');
  const movePill = (a) => {
    if (!pill) return;
    if (!a || !a.offsetWidth) { pill.style.opacity = 0; return; }
    pill.style.opacity = 1;
    pill.style.width = a.offsetWidth + 'px';
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
  };
  const setActive = (id) => {
    let cur = null;
    links.forEach((l) => {
      const on = l.getAttribute('href') === '#' + id;
      l.classList.toggle('is-active', on);
      if (on) { l.setAttribute('aria-current', 'location'); cur = l; } else l.removeAttribute('aria-current');
    });
    movePill(cur);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }), { rootMargin: '-45% 0px -50% 0px' });
    $$('[data-section]').forEach((s) => io.observe(s));
  }
  addEventListener('resize', () => movePill($('[data-link].is-active')));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => movePill($('[data-link].is-active')));

  /* ---------- mobile menu ---------- */
  const tog = $('#nav-toggle'), menu = $('#menu');
  const setMenu = (open) => {
    tog.setAttribute('aria-expanded', String(open));
    tog.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    document.body.classList.toggle('lock', open);
    if (open) { const f = $('a', menu); if (f) f.focus({ preventScroll: true }); }
  };
  /* Promote the menu sheet and the nav to the browser top layer so they stay above, and clickable over,
     the swarm intro overlay. Menu first, nav second, so the nav (and its close button) sits on top.
     Done in JS so the page still works without it. */
  [menu, $('#nav')].forEach((e) => {
    if (!e || !e.showPopover) return;
    try { e.setAttribute('popover', 'manual'); e.showPopover(); } catch (_) {}
  });
  tog.addEventListener('click', () => setMenu(tog.getAttribute('aria-expanded') !== 'true'));
  $$('[data-mlink]').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => {
    const open = menu.classList.contains('is-open');
    if (!open) return;
    if (e.key === 'Escape') { setMenu(false); tog.focus(); return; }
    if (e.key === 'Tab') {
      const items = [tog, ...$$('a', menu)];
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && (i === items.length - 1 || i === -1)) { e.preventDefault(); items[0].focus(); }
    }
  });
  matchMedia('(min-width: 961px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });

  /* ---------- reveal on scroll ---------- */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) {
        const t = e.target; t.classList.add('in'); io.unobserve(t);
        setTimeout(() => { t.style.transitionDelay = ''; }, 1000); // keep later hover transitions instant
      }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((e, i) => { e.style.transitionDelay = (i % 3) * 60 + 'ms'; io.observe(e); });
  } else {
    revealEls.forEach((e) => e.classList.add('in'));
  }

  /* ---------- pointer effects: glass lighting, heading sheen, hero parallax, magnetic buttons ---------- */
  let raf = 0, last = null;
  document.addEventListener('pointermove', (e) => {
    last = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const ev = last, t = ev.target;
      if (!(t instanceof Element)) return;
      const glass = t.closest('[data-light]');
      if (glass) {
        const r = glass.getBoundingClientRect();
        glass.style.setProperty('--mx', ev.clientX - r.left + 'px');
        glass.style.setProperty('--my', ev.clientY - r.top + 'px');
      }
      if (!reduced) {
        const h = t.closest('[data-sheen]');
        if (h) h.style.setProperty('--hx', ev.clientX - h.getBoundingClientRect().left + 'px');
      }
      const homeEl = $('#home');
      if (heroArt && homeEl && homeEl.contains(t)) {
        const r = heroArt.getBoundingClientRect();
        const nx = ((ev.clientX - r.left) / r.width) * 2 - 1, ny = ((ev.clientY - r.top) / r.height) * 2 - 1;
        if (!hero.on) { hero.lx = hero.tlx = ev.clientX - r.left; hero.ly = hero.tly = ev.clientY - r.top; }
        hero.tlx = ev.clientX - r.left; hero.tly = ev.clientY - r.top;
        hero.on = 1;
        heroArt.style.setProperty('--lo', '1');
        if (!reduced) { hero.tx = Math.max(-1, Math.min(1, nx)); hero.ty = Math.max(-1, Math.min(1, ny)); }
        if (PS) PS.wake();
      }
    });
  }, { passive: true });
  const home = $('#home');
  if (home && heroArt) {
    const rest = () => { heroArt.style.setProperty('--lo', '0'); hero.tx = 0; hero.ty = 0; hero.on = 0; if (PS) PS.wake(); };
    home.addEventListener('pointerleave', rest);
    home.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') setTimeout(rest, 600); });
  }
  $$('[data-sheen]').forEach((h) => h.addEventListener('pointerleave', () => h.style.setProperty('--hx', '-300px')));

  if (finePointer && !reduced) {
    document.addEventListener('pointermove', (e) => {
      const b = e.target instanceof Element && e.target.closest('.magnetic');
      if (!b) return;
      const r = b.getBoundingClientRect();
      const dx = Math.max(-8, Math.min(8, (e.clientX - (r.left + r.width / 2)) * 0.22));
      const dy = Math.max(-6, Math.min(6, (e.clientY - (r.top + r.height / 2)) * 0.22));
      b.style.transform = `translate(${dx}px, ${dy}px)`;
    }, { passive: true });
    document.addEventListener('pointerout', (e) => {
      const b = e.target instanceof Element && e.target.closest('.magnetic');
      if (b && !b.contains(e.relatedTarget)) b.style.transform = '';
    });
  }

  /* ---------- resume: preview + download only when the PDF really exists ---------- */
  (() => {
    const box = $('.resume__box'), actions = $('#resume-actions'), note = $('#resume-note'), prev = $('#resume-preview');
    const dl = $('#resume-download'), open = $('#resume-open');
    if (!box) return;
    dl.href = open.href = CONFIG.resumePath;

    const showMissing = () => {
      actions.textContent = '';
      const a = el('a', 'btn btn--primary magnetic', 'Request my resume');
      a.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Resume request')}`;
      actions.append(a);
      note.textContent = 'My resume is available on request. Email me and I will send it over.';
    };
    const showFound = () => {
      const wide = matchMedia('(min-width: 821px)').matches;
      if (wide && navigator.pdfViewerEnabled !== false) {
        const obj = document.createElement('object');
        obj.data = CONFIG.resumePath + '#view=FitH'; obj.type = 'application/pdf';
        obj.setAttribute('aria-label', 'Resume preview');
        const fb = el('p', 'muted'); fb.style.padding = '24px'; fb.textContent = 'Your browser cannot preview PDFs here. Use Download PDF instead.';
        obj.append(fb);
        prev.append(obj); prev.hidden = false; box.classList.add('has-preview');
      }
    };

    const probe = () => {
      if (!/^https?:$/.test(location.protocol)) { showFound(); return; } // opened from disk: cannot probe, trust the link
      fetch(CONFIG.resumePath, { method: 'HEAD' })
        .then((r) => {
          const type = r.headers.get('content-type') || '';
          if (r.ok && (!type || /pdf|octet-stream/i.test(type))) showFound(); else showMissing();
        })
        .catch(showMissing);
    };
    // Check for the PDF once the page is idle. Doing it early means the section's height is final
    // before anyone scrolls or jumps to a later section, so there is no layout shift.
    // the timeout matters: without it a busy page can postpone an idle callback indefinitely
    const idle = window.requestIdleCallback ? (fn) => window.requestIdleCallback(fn, { timeout: 1200 }) : (fn) => setTimeout(fn, 200);
    const start = () => idle(probe);
    if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
  })();

  /* ---------- contact form ---------- */
  (() => {
    const form = $('#contact-form'); if (!form) return;
    const note = $('#form-note'), btn = $('#form-submit'), label = $('#form-submit-label'), alt = $('#mail-alt');
    const F = CONFIG.form, live = !!F.endpoint;
    label.textContent = live ? 'Send message' : 'Open in Gmail';
    note.textContent = live ? '' : `Opens Gmail with your message prefilled to ${CONFIG.email}. Nothing is sent until you press Send there.`;

    const rules = {
      name: (v) => (v.trim().length >= 2 ? '' : 'Enter your name (at least 2 characters).'),
      email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address, like name@example.com.'),
      message: (v) => (v.trim().length >= 10 ? '' : 'Write at least 10 characters so I know how to help.')
    };
    const check = (f) => {
      const msg = rules[f.name](f.value);
      f.classList.toggle('is-bad', !!msg);
      f.setAttribute('aria-invalid', String(!!msg));
      $(`.err[data-for="${f.name}"]`).textContent = msg;
      return !msg;
    };
    const fields = ['name', 'email', 'message'].map((n) => form.elements[n]);
    fields.forEach((f) => { f.addEventListener('blur', () => { if (f.value) check(f); }); f.addEventListener('input', () => { if (f.classList.contains('is-bad')) check(f); }); });

    const status = (state, text) => { note.dataset.state = state; note.textContent = text; };
    const mailto = (d) => `mailto:${CONFIG.email}?subject=${encodeURIComponent('Portfolio message from ' + d.name)}&body=${encodeURIComponent(d.message + '\n\n' + d.name + ' (' + d.email + ')')}`;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ok = fields.map(check).every(Boolean);
      if (!ok) { fields.find((f) => f.classList.contains('is-bad')).focus(); status('error', 'Fix the highlighted fields and try again.'); return; }
      const d = { name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), message: form.elements.message.value.trim() };
      alt.href = mailto(d);

      if (form.elements.company.value) { status('ok', 'Thanks, your message was sent.'); form.reset(); return; } // honeypot: a bot filled it

      if (!live) {
        const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONFIG.email)}&su=${encodeURIComponent('Portfolio message from ' + d.name)}&body=${encodeURIComponent(d.message + '\n\n' + d.name + ' (' + d.email + ')')}`;
        const w = window.open(gmail, '_blank', 'noopener');
        alt.hidden = false;
        if (!w) { location.href = alt.href; status('', 'Your mail app should open with the message filled in. Press Send there to deliver it.'); }
        else status('ok', 'Gmail opened with your message filled in. Press Send there to deliver it. Not using Gmail? Use the link below.');
        return;
      }

      btn.disabled = true; label.textContent = 'Sending…'; status('', '');
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 12000);
      try {
        const payload = { ...F.extra, ...d, 'form-name': 'contact' };
        const init = { method: 'POST', signal: ctl.signal, headers: { Accept: 'application/json' } };
        if (F.encoding === 'urlencoded') { init.headers['Content-Type'] = 'application/x-www-form-urlencoded'; init.body = new URLSearchParams(payload).toString(); }
        else { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(payload); }
        const r = await fetch(F.endpoint, init);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        status('ok', 'Message sent. Thank you, I will reply to ' + d.email + '.');
        form.reset(); alt.hidden = true;
      } catch (err) {
        status('error', 'The message could not be sent. Check your connection and try again, or use the email link below.');
        alt.hidden = false;
      } finally {
        clearTimeout(timer); btn.disabled = false; label.textContent = 'Send message';
      }
    });
  })();

  /* ---------- GitHub: live public data, cached, never fabricated ---------- */
  (() => {
    const u = CONFIG.githubUser, statsBox = $('#gh-stats'), repoBox = $('#gh-repos');
    if (!statsBox) return;
    const PROJECTS = (window.PORTFOLIO && window.PORTFOLIO.PROJECTS) || [];
    const profile = `https://github.com/${u}`;

    const get = (url) => {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 9000);
      return fetch(url, { signal: c.signal, headers: { Accept: 'application/json' } })
        .then((r) => { clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); });
    };
    const TTL = 60 * 60 * 1000;
    const load = async (key, url) => {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('gh:' + u + ':' + key)); } catch (_) {}
      if (saved && Date.now() - saved.t < TTL) return saved.d;
      try {
        const d = await get(url);
        try { localStorage.setItem('gh:' + u + ':' + key, JSON.stringify({ t: Date.now(), d })); } catch (_) {}
        return d;
      } catch (err) {
        if (saved) return saved.d; // stale data beats an empty section
        throw err;
      }
    };
    const noteLink = (text) => {
      const p = el('p', 'gh-note', text + ' ');
      const a = el('a', null, 'View it on GitHub'); a.href = profile; a.target = '_blank'; a.rel = 'noopener';
      p.append(a); return p;
    };
    const repoCard = (name, href, desc, lang) => {
      const a = el('a', 'repo glass', null); a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.dataset.light = '';
      a.append(el('h3', null, name), el('p', null, desc), el('small', null, lang));
      return a;
    };
    const staticRepos = () => {
      repoBox.textContent = '';
      PROJECTS.forEach((p) => repoBox.append(repoCard(p.github.split('/').pop(), p.github, p.description, p.title)));
    };

    Promise.all([load('user', `https://api.github.com/users/${u}`), load('repos', `https://api.github.com/users/${u}/repos?per_page=100&sort=pushed`)])
      .then(([user, repos]) => {
        const own = repos.filter((r) => !r.fork);
        const featuredNames = PROJECTS.map((p) => p.github.split('/').pop().toLowerCase());
        const featured = featuredNames.map((n) => own.find((r) => r.name.toLowerCase() === n)).filter(Boolean);
        const rest = own.filter((r) => !featured.includes(r));
        const picks = [...featured, ...rest].slice(0, 6);
        repoBox.textContent = '';
        picks.forEach((r) => {
          const proj = PROJECTS.find((p) => p.github.toLowerCase().endsWith('/' + r.name.toLowerCase()));
          repoBox.append(repoCard(r.name, r.html_url, (proj && proj.description) || r.description || 'No description yet.', r.language || 'Repository'));
        });
        if (!picks.length) staticRepos();
        statsBox.textContent = '';
        [[user.public_repos, 'Public repositories'], [user.followers, 'Followers']].forEach(([n, l]) => {
          const st = el('div', 'stat glass'); st.append(el('b', null, String(n)), el('span', null, l)); statsBox.append(st);
        });
      })
      .catch(() => {
        statsBox.textContent = ''; statsBox.append(noteLink('Live GitHub stats could not be loaded right now.'));
        staticRepos();
      });
  })();
})();
