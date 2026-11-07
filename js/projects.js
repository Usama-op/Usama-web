/* projects.js: project data and card rendering.
   To edit a project, change its entry in PROJECTS.
   - status: 'live' shows a Live badge and needs a verified `live` URL.
             'source' shows "Open source" and hides the Live demo button.
   - live: URL of the deployed demo, or null to hide the Live demo button. */
(() => {
  'use strict';

  const PROJECTS = [
    {
      id: 'toolshub',
      title: 'ToolsHub Premium',
      subtitle: 'All-in-one utility PWA',
      description: 'A collection of useful everyday tools combined into one installable, offline-ready web application.',
      status: 'live',
      tech: ['HTML', 'CSS', 'JavaScript', 'PWA'],
      features: ['Calculator', 'World clock', 'Unit converter', 'PDF toolkit', 'Notepad'],
      live: 'https://usama-op.github.io/tools-hub/',
      github: 'https://github.com/Usama-op/tools-hub',
      layout: 'desktop',
      images: [
        { src: 'assets/projects/toolshub-desktop.webp', w: 1280, h: 720, alt: 'ToolsHub Premium home screen with tool cards for Calculator, Calendar, World Clock, Converter, Timer and Notepad' },
        { src: 'assets/projects/toolshub-mobile.webp', w: 600, h: 1298, alt: 'ToolsHub Premium on a phone' }
      ]
    },
    {
      id: 'lioshare',
      title: 'LioShare',
      subtitle: 'Peer-to-peer file sharing',
      description: 'A browser-based file-sharing app built on WebRTC, with QR pairing and encrypted in-browser communication.',
      status: 'live',
      tech: ['WebRTC', 'PWA', 'QR pairing'],
      features: ['Room ID pairing', 'QR scan to connect', 'Multi-file sending', 'Built-in chat'],
      live: 'https://usama-op.github.io/Leoshare/',
      github: 'https://github.com/Usama-op/Leoshare',
      layout: 'phones',
      images: [
        { src: 'assets/projects/lioshare-connect.webp', w: 600, h: 1156, alt: 'LioShare connect screen showing a Room ID, Join a Room and Scan QR' },
        { src: 'assets/projects/lioshare-share.webp', w: 600, h: 1162, alt: 'LioShare share screen' }
      ]
    },
    {
      id: 'cipher',
      title: 'Cipher',
      subtitle: 'Text encryption and decryption',
      description: 'A browser-based encryption tool that processes text locally using the Web Crypto API.',
      status: 'live',
      tech: ['AES-256-GCM', 'PBKDF2', 'Web Crypto API'],
      features: ['Runs fully in the browser', 'Passphrase-derived keys', 'Authenticated encryption'],
      live: 'https://usama-op.github.io/Textdicript/',
      github: 'https://github.com/Usama-op/Textdicript',
      layout: 'desktop',
      images: [
        { src: 'assets/projects/cipher-desktop.webp', w: 1280, h: 720, alt: 'Cipher home screen with the headline "Turn a readable message into an unreadable one"' },
        { src: 'assets/projects/cipher-mobile.webp', w: 600, h: 1298, alt: 'Cipher on a phone' }
      ]
    }
  ];

  const STATUS_LABEL = { live: 'Live', source: 'Open source' };
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const link = (href, label, primary) => {
    const a = el('a', 'btn btn--sm magnetic' + (primary ? ' btn--primary' : ''), label);
    a.href = href; a.target = '_blank'; a.rel = 'noopener';
    a.append(el('span', 'sr-only', ' (opens in a new tab)'));
    return a;
  };
  const img = (i, eager) => {
    const m = el('img');
    m.loading = eager ? 'eager' : 'lazy'; m.decoding = 'async'; // set before src, or the browser fetches immediately
    m.alt = i.alt; m.width = i.w; m.height = i.h; m.src = i.src;
    return m;
  };

  window.PORTFOLIO = window.PORTFOLIO || {};
  window.PORTFOLIO.PROJECTS = PROJECTS;

  const list = document.getElementById('project-list');
  if (!list) return;

  PROJECTS.forEach((p) => {
    const card = el('article', 'project glass glass--glow');
    card.id = 'project-' + p.id;
    card.dataset.reveal = ''; card.dataset.light = '';
    card.setAttribute('aria-labelledby', 'title-' + p.id);

    const media = el('div', 'project__media project__media--' + p.layout);
    if (p.layout === 'phones') {
      p.images.forEach((i) => { const ph = el('div', 'phone'); ph.append(img(i)); media.append(ph); });
    } else {
      const fr = el('div', 'frame'); fr.append(img(p.images[0]));
      media.append(fr);
      if (p.images[1]) { const ph = el('div', 'phone'); ph.append(img(p.images[1])); media.append(ph); }
    }

    const body = el('div', 'project__body');
    const st = el('span', 'status', STATUS_LABEL[p.status]); st.dataset.status = p.status;
    const h = el('h3', null, p.title); h.id = 'title-' + p.id;
    const feat = el('ul', 'feat'); p.features.forEach((f) => feat.append(el('li', null, f)));
    const tech = el('ul', 'tech'); p.tech.forEach((t) => tech.append(el('li', null, t)));
    const btns = el('div', 'project__btns');
    if (p.live) btns.append(link(p.live, 'Live demo', true));
    btns.append(link(p.github, 'View on GitHub', !p.live));

    body.append(st, h, el('p', 'project__sub', p.subtitle), el('p', null, p.description), feat, tech, btns);
    card.append(media, body);
    list.append(card);
  });
})();
