/* background.js: a scroll-driven teardown of a computer, drawn on one canvas.
   Scrolling takes the page through the machine: it starts assembled (Home), the layers drift apart as you
   read (display, keyboard deck, motherboard with CPU, RAM, SSD and fan, battery, base), the camera orbits and
   focuses a different part in each section, and by Contact it is back together and powered on.
   Interaction: the mouse tilts the camera and lights the scene; a click or tap sends a shockwave that
   blows the parts apart and springs them back; fast scrolling spins the fan and stretches the embers;
   on touch screens a horizontal swipe spins the machine. Data pulses run along the circuit traces with scroll.
   Everything is additive "glass hologram" line work (no sorting, no shadows, no filters), one canvas, one layer.
   It draws only while something is happening and sleeps when the page has been idle for a few seconds.
   Reduced-motion visitors get a single still frame. */
(() => {
  'use strict';
  const bg = document.getElementById('bg');
  const cv = document.getElementById('bg-canvas');
  if (!bg || !cv) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;

  const html = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const PS = window.PS;
  const registerFrame = PS ? PS.frame : (fn) => { const l = (t) => { fn(1 / 60, t); requestAnimationFrame(l); }; requestAnimationFrame(l); };
  const wake = PS ? PS.wake : () => {};

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  /* ---------- adaptive quality ----------
     0 = everything.  1 = no glow pass, no key outlines, half the embers, lower resolution, lighter glass blur.
     2 = outlines only, no embers, glass blur off.  Steps down by itself if scrolling drops below ~38fps and
     remembers that for the session.  ?bg=full turns this off (for testing). */
  const forceFull = /[?&]bg=full/.test(location.search);
  let level = 0;
  try { if (!forceFull) level = Number(sessionStorage.getItem('bg-lvl')) || 0; } catch (_) {}
  const conn = navigator.connection;
  if (!forceFull && ((conn && conn.saveData) || (navigator.deviceMemory && navigator.deviceMemory <= 2))) level = Math.max(level, 1);
  const setLevel = (n) => {
    level = n;
    html.classList.toggle('fx1', n >= 1);
    html.classList.toggle('fx2', n >= 2);
    try { sessionStorage.setItem('bg-lvl', String(n)); } catch (_) {}
    resize(true); buildEmbers();
  };

  /* ---------- sprites (pre-rendered glows, drawn with drawImage) ---------- */
  const sprite = (size, stops) => {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return c;
  };
  const emberSpr = sprite(48, [[0, 'rgba(255,205,210,1)'], [0.3, 'rgba(255,71,87,.8)'], [1, 'rgba(225,29,46,0)']]);
  const pulseSpr = sprite(48, [[0, 'rgba(255,255,255,1)'], [0.22, 'rgba(255,150,160,.9)'], [1, 'rgba(255,71,87,0)']]);

  /* ---------- canvas size ---------- */
  let W = 0, H = 0, dpr = 1;
  function resize(force) {
    const iw = innerWidth, ih = innerHeight;
    // phones: when the URL bar slides in, innerHeight shrinks a little. Keep the taller canvas, don't re-allocate.
    if (!force && !finePointer && iw === W && ih < H && ih > H * 0.7) return;
    W = iw; H = ih;
    dpr = Math.min(window.devicePixelRatio || 1, level >= 1 ? 1 : finePointer ? 1.5 : 1.25);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- camera ---------- */
  const D = 10;
  const cam = { yaw: 0, pitch: 0.5, roll: 0, fy: 0, f: 1000, cx: 0, cy: 0 };
  let cY = 1, sY = 0, cP = 1, sP = 0, cR = 1, sR = 0;
  let PX = 0, PY = 0, PZ = 0;
  const setCam = () => {
    cY = Math.cos(cam.yaw); sY = Math.sin(cam.yaw);
    cP = Math.cos(cam.pitch); sP = Math.sin(cam.pitch);
    cR = Math.cos(cam.roll); sR = Math.sin(cam.roll);
  };
  const proj = (x, y, z) => {
    y -= cam.fy;
    const X = x * cY - z * sY, Z0 = x * sY + z * cY;
    const Y = y * cP + Z0 * sP, Z = -y * sP + Z0 * cP + D;
    PZ = Z;
    if (Z < 1.4) return false;
    const s = cam.f / Z;
    PX = cam.cx + (X * cR - Y * sR) * s;
    PY = cam.cy - (X * sR + Y * cR) * s;
    return true;
  };
  const fade = (z) => clamp((z - 1.6) / 2.2, 0, 1) * clamp(1.15 - (z - 9) / 14, 0.25, 1);

  /* ---------- the machine ---------- */
  const EDGE = 'rgb(255,86,104)', HOT = 'rgb(255,196,202)', FILL = 'rgb(255,96,112)';
  const BX = new Float32Array(8), BY = new Float32Array(8);
  const EDGES = [0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 1, 3, 4, 6, 5, 7, 0, 4, 1, 5, 2, 6, 3, 7];

  /* a glass slab / chip: tinted top and bottom faces, glowing edges */
  function box(cx, cy, cz, w, h, d, a, fillA, hot) {
    if (!proj(cx, cy, cz)) return;
    const af = a * fade(PZ);
    if (af < 0.01) return;
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    for (let i = 0; i < 8; i++) {
      if (!proj(i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0)) return;
      BX[i] = PX; BY[i] = PY;
    }
    if (fillA) {
      ctx.globalAlpha = af * fillA; ctx.fillStyle = FILL; ctx.beginPath();
      ctx.moveTo(BX[2], BY[2]); ctx.lineTo(BX[3], BY[3]); ctx.lineTo(BX[7], BY[7]); ctx.lineTo(BX[6], BY[6]); ctx.closePath();
      ctx.moveTo(BX[0], BY[0]); ctx.lineTo(BX[1], BY[1]); ctx.lineTo(BX[5], BY[5]); ctx.lineTo(BX[4], BY[4]); ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    for (let i = 0; i < 24; i += 2) { ctx.moveTo(BX[EDGES[i]], BY[EDGES[i]]); ctx.lineTo(BX[EDGES[i + 1]], BY[EDGES[i + 1]]); }
    ctx.strokeStyle = hot ? HOT : EDGE;
    if (hot && level < 1) { ctx.globalAlpha = af * 0.18; ctx.lineWidth = 4; ctx.stroke(); }
    ctx.globalAlpha = af; ctx.lineWidth = 1; ctx.stroke();
  }
  /* line on a horizontal plane, in (x,z) */
  let penOn = false;
  const seg = (x1, z1, x2, z2, y) => {
    if (!proj(x1, y, z1)) return;
    const ax = PX, ay = PY;
    if (!proj(x2, y, z2)) return;
    ctx.moveTo(ax, ay); ctx.lineTo(PX, PY);
  };
  const strokeBatch = (a, lw, color) => { ctx.strokeStyle = color || EDGE; ctx.globalAlpha = a; ctx.lineWidth = lw || 1; ctx.stroke(); };
  const ring = (cx, y, cz, r, n, rot) => {
    for (let i = 0; i < n; i++) {
      const a1 = rot + (i / n) * 6.2832, a2 = rot + ((i + 1) / n) * 6.2832;
      seg(cx + Math.cos(a1) * r, cz + Math.sin(a1) * r, cx + Math.cos(a2) * r, cz + Math.sin(a2) * r, y);
    }
  };

  const TRACES = [
    [[-0.3, 0.1], [0.2, 0.1], [0.2, -0.4], [0.95, -0.4]],
    [[-0.55, 0.4], [-0.55, 0.85], [0.25, 0.85]],
    [[-0.85, 0.1], [-1.2, 0.1], [-1.2, -0.3]],
    [[1.55, -0.2], [1.55, 0.4], [1.85, 0.4], [1.85, 0.95]],
    [[-1.8, 1.05], [-0.6, 1.05], [-0.6, 1.17], [1.7, 1.17]],
    [[-1.7, -1.1], [0.4, -1.1], [0.4, -0.8], [1.7, -0.8]],
    [[0.1, 0.4], [0.1, 0.62], [1.6, 0.62]],
    [[-1.0, -0.45], [-0.1, -0.45], [-0.1, -0.92]]
  ].map((pts) => {
    const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, len, total: len[len.length - 1], phase: rnd() };
  });
  const tracePoint = (tr, u) => {
    const d = (u - Math.floor(u)) * tr.total;
    let i = 1; while (i < tr.len.length - 1 && tr.len[i] < d) i++;
    const k = (d - tr.len[i - 1]) / Math.max(1e-6, tr.len[i] - tr.len[i - 1]);
    return [tr.pts[i - 1][0] + (tr.pts[i][0] - tr.pts[i - 1][0]) * k, tr.pts[i - 1][1] + (tr.pts[i][1] - tr.pts[i - 1][1]) * k];
  };

  /* scene state that changes every frame */
  const st = { E: 0, power: 0.4, fan: 0, a: 0.5, travel: 0, energy: 0, glow: 0 };

  function drawMachine() {
    const E = Math.max(0, st.E), pitch = 0.26 + 1.04 * E, A = st.a, pw = st.power;
    const yL = (i) => (2 - i) * pitch;
    const yDisp = yL(0), yKeys = yL(1), yBoard = yL(2), yBat = yL(3), yBase = yL(4);

    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    /* floor grid: streams toward you as you scroll */
    {
      const fy = yBase - 0.75 - E * 0.1, step = 1, shift = (PS ? PS.y : scrollY) * 0.004 % step;
      for (let b = 0; b < 3; b++) {
        ctx.beginPath();
        for (let i = -6; i <= 6; i++) {
          const ab = Math.abs(i), bucket = ab <= 2 ? 0 : ab <= 4 ? 1 : 2;
          if (bucket !== b) continue;
          seg(i * step, -6, i * step, 6, fy);
          const zz = i * step + shift;
          if (zz <= 6) seg(-6, zz, 6, zz, fy);
        }
        strokeBatch((0.2 - b * 0.06 + st.energy * 0.16) * A * 1.6, 1, EDGE);
      }
    }

    /* base + battery */
    box(0, yBase, 0, 4.0, 0.1, 2.7, A * 0.8, 0.05);
    if (proj(0, yBase, 0)) {
      ctx.beginPath();
      for (const [sx, sz] of [[-1.8, -1.2], [1.8, -1.2], [-1.8, 1.2], [1.8, 1.2]]) ring(sx, yBase + 0.055, sz, 0.1, 8, 0);
      for (let i = -3; i <= 3; i++) seg(i * 0.35 - 0.0, 1.05, i * 0.35, 1.2, yBase + 0.055);
      strokeBatch(A * fade(PZ) * 0.7, 1);
    }
    box(0, yBat, 0, 3.0, 0.16, 1.9, A * 0.85, 0.07);
    if (proj(0, yBat, 0)) {
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) seg(i * 1.0 + 0.5, -0.95, i * 1.0 + 0.5, 0.95, yBat + 0.085);
      seg(-1.5, 0, 1.5, 0, yBat + 0.085);
      strokeBatch(A * fade(PZ) * 0.5, 1, HOT);
    }

    /* motherboard */
    const bTop = yBoard + 0.035;
    box(0, yBoard, 0, 3.8, 0.07, 2.5, A * 0.95, 0.07);
    if (proj(0, yBoard, 0)) {
      const bf = fade(PZ);
      if (level < 2) {
        ctx.beginPath();
        for (const tr of TRACES) for (let i = 1; i < tr.pts.length; i++) seg(tr.pts[i - 1][0], tr.pts[i - 1][1], tr.pts[i][0], tr.pts[i][1], bTop + 0.003);
        strokeBatch(A * bf * 0.55, 1);
        // data pulses ride the traces; scrolling pushes them along
        const sz = 0.1;
        ctx.globalAlpha = Math.min(1, A * bf * (0.9 + st.energy * 0.6 + st.glow * 0.5));
        for (const tr of TRACES) {
          for (let k = 0; k < 2; k++) {
            const p = tracePoint(tr, tr.phase + k * 0.5 + st.travel);
            if (proj(p[0], bTop + 0.01, p[1])) { const s = cam.f / PZ * sz; ctx.drawImage(pulseSpr, PX - s / 2, PY - s / 2, s, s); }
          }
        }
      }
    }
    const lift = 0.03 + E * 0.5;
    // CPU with heat-spreader and die
    box(-0.55, bTop + 0.045 + lift, 0.1, 0.62, 0.09, 0.62, A, 0.1, true);
    if (level < 2 && proj(-0.55, bTop + 0.09 + lift, 0.1)) {
      ctx.beginPath();
      const t = bTop + 0.092 + lift;
      seg(-0.74, -0.09, -0.36, -0.09, t); seg(-0.36, -0.09, -0.36, 0.29, t); seg(-0.36, 0.29, -0.74, 0.29, t); seg(-0.74, 0.29, -0.74, -0.09, t);
      for (let i = 0; i < 6; i++) { const u = -0.82 + i * 0.054; seg(-0.84, -0.18 + i * 0.12, -0.9, -0.18 + i * 0.12, bTop + lift * 0.5 + 0.02); }
      strokeBatch(A * fade(PZ) * (0.7 + 0.3 * pw), 1, HOT);
    }
    // RAM sticks
    box(1.05, bTop + 0.03 + lift * 1.25, -0.2, 0.2, 0.05, 1.25, A, 0.08);
    box(1.4, bTop + 0.03 + lift * 1.45, -0.2, 0.2, 0.05, 1.25, A, 0.08);
    // SSD
    box(0.55, bTop + 0.025 + lift * 1.7, 0.88, 0.85, 0.035, 0.42, A, 0.08);
    // small chips
    if (level < 2) {
      box(-1.45, bTop + 0.03 + lift * 0.7, 0.8, 0.22, 0.04, 0.22, A * 0.8, 0.05);
      box(-1.05, bTop + 0.03 + lift * 0.85, 0.92, 0.22, 0.04, 0.22, A * 0.8, 0.05);
      box(0.1, bTop + 0.03 + lift * 0.6, -0.9, 0.22, 0.04, 0.22, A * 0.8, 0.05);
      box(-0.15, bTop + 0.03 + lift * 0.95, 0.98, 0.22, 0.04, 0.22, A * 0.8, 0.05);
    }
    // fan: housing ring + spinning blades
    {
      const fyc = bTop + 0.06 + lift * 2.0;
      if (proj(-1.35, fyc, -0.7)) {
        const ff = fade(PZ);
        ctx.beginPath(); ring(-1.35, fyc, -0.7, 0.44, 22, 0); ring(-1.35, fyc, -0.7, 0.4, 22, 0);
        strokeBatch(A * ff * 0.9, 1);
        ctx.beginPath();
        for (let b = 0; b < 7; b++) {
          const a0 = st.fan + (b / 7) * 6.2832;
          seg(-1.35 + Math.cos(a0) * 0.07, -0.7 + Math.sin(a0) * 0.07, -1.35 + Math.cos(a0 + 0.55) * 0.38, -0.7 + Math.sin(a0 + 0.55) * 0.38, fyc);
          seg(-1.35 + Math.cos(a0 + 0.55) * 0.38, -0.7 + Math.sin(a0 + 0.55) * 0.38, -1.35 + Math.cos(a0 + 0.2) * 0.38, -0.7 + Math.sin(a0 + 0.2) * 0.38, fyc);
        }
        strokeBatch(A * ff * (0.6 + st.energy * 0.4), 1, HOT);
      }
    }

    /* keyboard deck */
    box(0, yKeys, 0, 4.0, 0.14, 2.7, A * 0.9, 0.06);
    if (proj(0, yKeys, 0)) {
      const kt = yKeys + 0.075, kf = fade(PZ);
      ctx.beginPath();
      if (level < 1) {
        for (let r = 0; r < 5; r++) {
          const n = r === 4 ? 0 : 12, z0 = -1.05 + r * 0.26;
          for (let c = 0; c < n; c++) {
            const x0 = -1.7 + c * 0.3 + (r % 2) * 0.05;
            seg(x0, z0, x0 + 0.24, z0, kt); seg(x0 + 0.24, z0, x0 + 0.24, z0 + 0.2, kt); seg(x0 + 0.24, z0 + 0.2, x0, z0 + 0.2, kt); seg(x0, z0 + 0.2, x0, z0, kt);
          }
        }
        seg(-1.0, 0.0 + 0.04 + 0.0, 1.0, 0.04, kt); seg(-1.0, 0.24, 1.0, 0.24, kt); seg(-1.0, 0.04, -1.0, 0.24, kt); seg(1.0, 0.04, 1.0, 0.24, kt);
      } else {
        for (let r = 0; r < 4; r++) { const z0 = -1.05 + r * 0.26; seg(-1.7, z0, 1.9, z0, kt); seg(-1.7, z0 + 0.2, 1.9, z0 + 0.2, kt); }
      }
      // trackpad
      seg(-0.5, 0.55, 0.5, 0.55, kt); seg(0.5, 0.55, 0.5, 1.15, kt); seg(0.5, 1.15, -0.5, 1.15, kt); seg(-0.5, 1.15, -0.5, 0.55, kt);
      strokeBatch(A * kf * (0.45 + 0.4 * pw), 1);
    }

    /* display with a lit screen */
    box(0, yDisp, 0, 4.0, 0.1, 2.7, A, 0.04, true);
    if (proj(0, yDisp, 0)) {
      const ds = yDisp + 0.055, df = fade(PZ);
      const x0 = -1.86, x1 = 1.86, z0 = -1.22, z1 = 1.22;
      if (proj(x0, ds, z0)) {
        const ax = PX, ay = PY;
        ctx.globalAlpha = A * df * (0.04 + pw * 0.2); ctx.fillStyle = FILL; ctx.beginPath(); ctx.moveTo(ax, ay);
        if (proj(x1, ds, z0)) ctx.lineTo(PX, PY);
        if (proj(x1, ds, z1)) ctx.lineTo(PX, PY);
        if (proj(x0, ds, z1)) ctx.lineTo(PX, PY);
        ctx.closePath(); ctx.fill();
      }
      ctx.beginPath();
      seg(x0, z0, x1, z0, ds); seg(x1, z0, x1, z1, ds); seg(x1, z1, x0, z1, ds); seg(x0, z1, x0, z0, ds);
      strokeBatch(A * df * 0.9, 1, HOT);
      if (level < 2) {
        // interface: title bar, code lines, cards, a ring
        ctx.beginPath();
        seg(x0, -1.02, x1, -1.02, ds);
        for (let i = 0; i < 7; i++) { const len = 0.9 + ((i * 37) % 11) * 0.12; seg(-1.65, -0.78 + i * 0.17, -1.65 + len, -0.78 + i * 0.17, ds); }
        seg(0.1, -0.78, 1.65, -0.78, ds); seg(1.65, -0.78, 1.65, 0.1, ds); seg(1.65, 0.1, 0.1, 0.1, ds); seg(0.1, 0.1, 0.1, -0.78, ds);
        seg(0.1, 0.3, 0.8, 0.3, ds); seg(0.8, 0.3, 0.8, 0.95, ds); seg(0.8, 0.95, 0.1, 0.95, ds); seg(0.1, 0.95, 0.1, 0.3, ds);
        ring(1.25, ds, 0.62, 0.32, 18, 0);
        strokeBatch(A * df * (0.3 + pw * 0.6), 1);
      }
    }
  }

  /* ---------- embers ---------- */
  let embers = [];
  function buildEmbers() {
    seed = 21;
    const base = finePointer ? 54 : 26;
    const n = level >= 2 ? 0 : Math.round(base * (level >= 1 ? 0.5 : 1));
    embers = [];
    for (let i = 0; i < n; i++) {
      const d = 0.15 + 0.85 * Math.pow(rnd(), 1.4);
      embers.push({ x: rnd(), y: rnd(), d, s: 2 + d * 7, o: 0.25 + d * 0.65, ph: rnd() * 6.28 });
    }
  }
  function drawEmbers(t, y, mx, my, hasPtr) {
    const e = st.energy;
    for (let i = 0; i < embers.length; i++) {
      const m = embers[i];
      let x = m.x * W + Math.sin(t * 0.0004 + m.ph) * 8 * m.d;
      let yy = (((m.y * H - y * m.d * 0.85) % H) + H) % H;
      if (hasPtr) {
        const dx = x - mx, dy = yy - my, d2 = dx * dx + dy * dy;
        if (d2 < 32000 && d2 > 1) { const dd = Math.sqrt(d2), f = Math.pow(1 - dd / 179, 2) * 70 * m.d; x += (dx / dd) * f; yy += (dy / dd) * f; }
      }
      const h = m.s * (1 + e * 9 * m.d), w = m.s * (1 - e * 0.25);
      ctx.globalAlpha = m.o;
      ctx.drawImage(emberSpr, x - w, yy - h, w * 2, h * 2);
    }
  }

  /* ---------- timeline: one keyframe per section ---------- */
  //            explode  yaw    pitch  focus  zoom  shiftX power
  const KF = [
    [0.00, -0.55, 0.50, 0.0, 0.95, 0.00, 0.40],   // Home       assembled, behind the hero
    [0.40, -0.15, 0.46, 1.1, 1.05, 0.23, 0.50],   // About      look at the display
    [0.80, 0.55, 0.40, 0.0, 1.30, -0.21, 0.55],   // Skills     the board and its parts
    [0.95, 1.25, 0.52, 0.8, 1.10, 0.00, 0.60],    // Projects   keyboard and screen
    [1.15, 2.05, 0.32, -1.2, 1.05, 0.21, 0.50],   // Education  battery layer
    [0.90, 2.85, 0.60, 0.0, 1.15, -0.21, 0.55],   // GitHub     board again
    [0.55, 3.65, 0.42, 0.4, 1.00, 0.19, 0.65],    // Resume
    [0.00, 4.45, 0.40, 0.0, 0.95, 0.00, 1.00]     // Contact    together and powered on
  ];
  const NK = 7;
  const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  const sample = (u, out) => {
    const i = Math.min(KF.length - 2, Math.max(0, Math.floor(u))), t = clamp(u - i, 0, 1);
    const k0 = KF[Math.max(0, i - 1)], k1 = KF[i], k2 = KF[i + 1], k3 = KF[Math.min(KF.length - 1, i + 2)];
    for (let j = 0; j < NK; j++) out[j] = cr(k0[j], k1[j], k2[j], k3[j], t);
  };

  let secs = [0], maxScroll = 1;
  const measure = () => {
    const list = [...document.querySelectorAll('[data-section]')];
    maxScroll = Math.max(1, html.scrollHeight - innerHeight);
    secs = list.map((el, i) => (i === 0 ? 0 : clamp(el.offsetTop + el.offsetHeight / 2 - innerHeight / 2, 0, maxScroll)));
    for (let i = 1; i < secs.length; i++) secs[i] = Math.max(secs[i], secs[i - 1] + 1);
    if (secs.length > 1) secs[secs.length - 1] = Math.max(maxScroll, secs[secs.length - 2] + 1);
  };
  const sectionPos = (y) => {
    const n = secs.length;
    if (n < 2 || y <= secs[0]) return 0;
    for (let i = 1; i < n; i++) if (y < secs[i]) return i - 1 + (y - secs[i - 1]) / (secs[i] - secs[i - 1]);
    return n - 1;
  };

  /* ---------- live state ---------- */
  const T = new Array(NK).fill(0), S = new Array(NK).fill(0);   // target and smoothed timeline values
  let first = true;
  let lastY = scrollY, vel = 0, yawOff = 0, yawV = 0, fanW = 1.2, fanA = 0;
  let burst = 0, burstV = 0, lastSec = 0, flash = 0, drawTick = 0;
  let mx = innerWidth / 2, my = innerHeight / 2, tmx = mx, tmy = my, ptrX = 0, ptrY = 0, tpX = 0, tpY = 0, hasPtr = 0, hasPtrT = 0;
  let lastInput = 0, awake = 0, slow = 0, slowN = 0, born = 0;
  const waves = [];
  const orbA = bg.querySelector('.bg__orb--a'), orbB = bg.querySelector('.bg__orb--b'), spot = bg.querySelector('.bg__spot');
  let spotX = -1, spotY = -1, spotO = -1;
  let orbSize = 800;

  const kick = (a) => { burstV += a; flash = Math.min(1, flash + 0.6); };

  /* one frame: advance the state, then draw */
  function step(dt, t, snap) {
    const y = PS ? PS.y : scrollY;
    // scroll velocity (px/s), smoothed
    const v = dt > 0 ? (y - lastY) / dt : 0; lastY = y;
    vel += (v - vel) * (snap ? 1 : 1 - Math.exp(-dt * 9));
    st.energy = clamp(Math.abs(vel) / 2600, 0, 1);

    // timeline target from scroll position
    const n = secs.length, idx = sectionPos(y);
    sample(n > 1 ? (idx / (n - 1)) * (KF.length - 1) : 0, T);
    const wide = W >= 900;
    const k = snap ? 1 : 1 - Math.exp(-dt * 7);
    for (let j = 0; j < NK; j++) S[j] += (T[j] - S[j]) * k;
    if (first) { for (let j = 0; j < NK; j++) S[j] = T[j]; first = false; }
    const sec = Math.round(idx);
    if (sec !== lastSec && !snap) { lastSec = sec; if (t > 1500) kick(3.2); }

    // spring for the shockwave burst, free-spin for touch swipes, pointer smoothing
    burstV += (-burst * 70 - burstV * 7) * dt; burst += burstV * dt;
    yawV *= Math.exp(-dt * 2.4); yawOff += yawV * dt; yawOff *= Math.exp(-dt * 0.55);
    flash *= Math.exp(-dt * 2.2);
    ptrX += (tpX - ptrX) * (1 - Math.exp(-dt * 5)); ptrY += (tpY - ptrY) * (1 - Math.exp(-dt * 5));
    mx += (tmx - mx) * (1 - Math.exp(-dt * 14)); my += (tmy - my) * (1 - Math.exp(-dt * 14));
    hasPtr += (hasPtrT - hasPtr) * (1 - Math.exp(-dt * 6));

    // fan and pulses run faster the faster you scroll
    fanW += ((1.2 + st.energy * 16 + Math.max(0, burst) * 9) - fanW) * (1 - Math.exp(-dt * 3));
    fanA += fanW * dt;
    st.fan = fanA;
    st.travel = y * 0.0012 + t * 0.00005;
    st.E = S[0] + burst * 0.55 + st.energy * 0.12;
    st.power = clamp(S[6] + flash * 0.3 + st.energy * 0.2, 0, 1.2);
    st.glow = flash;
    st.a = (finePointer || wide ? 0.62 : 0.5) * (0.86 + 0.14 * st.power);

    // camera
    const dim = Math.min(W, H);
    const portrait = H > W * 1.1;
    const base = portrait ? W * 1.72 : Math.min(W * 0.95, H * 1.7);
    cam.f = base * clamp(S[4], 0.7, 1.5);
    cam.yaw = S[1] + yawOff + ptrX * 0.32 + Math.sin(t * 0.00021) * 0.045 * (1 - st.energy);
    cam.pitch = clamp(S[2] - ptrY * 0.16, 0.15, 0.95);
    cam.roll = clamp(vel * 0.00006, -0.1, 0.1);
    cam.fy = S[3] * (0.26 + 1.04 * Math.max(0, st.E));
    const vh = Math.min(H, innerHeight);
    cam.cx = W * (0.5 + (wide ? S[5] : 0) + ptrX * 0.012);
    cam.cy = vh * 0.5 + (portrait ? vh * 0.02 : 0);
    setCam();

    // CSS orbs: transform only
    const p = clamp(y / maxScroll, 0, 1);
    if (orbA) orbA.style.transform = `translate3d(${(-0.1 + p * 0.75) * W - orbSize / 2 + ptrX * 30}px,${(-0.1 + p * 0.85) * vh - orbSize / 2 + ptrY * 22}px,0)`;
    if (orbB) orbB.style.transform = `translate3d(${(0.95 - p * 0.8) * W - orbSize / 2 - ptrX * 24}px,${(0.8 - p * 0.55) * vh - orbSize / 2 - ptrY * 18}px,0)`;

    if (spot && finePointer) {
      const sx = Math.round(mx - 360), sy = Math.round(my - 360), so = Math.round(clamp(hasPtr, 0, 1) * 100) / 100;
      if (sx !== spotX || sy !== spotY) { spotX = sx; spotY = sy; spot.style.transform = `translate3d(${sx}px,${sy}px,0)`; }
      if (so !== spotO) { spotO = so; spot.style.opacity = so; }
    }

    // ---- draw (every other frame on the first adaptive tier: state still advances at full rate) ----
    drawTick ^= 1;
    if (level >= 1 && !snap && drawTick) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    drawMachine();
    if (embers.length) drawEmbers(t, y, mx, my, hasPtr > 0.3 && finePointer);

    // shockwave rings from clicks and taps
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i]; w.t += dt;
      const u = w.t / 0.9;
      if (u >= 1) { waves.splice(i, 1); continue; }
      ctx.globalAlpha = (1 - u) * 0.55; ctx.strokeStyle = HOT; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(w.x, w.y, 12 + u * Math.min(W, H) * 0.55, 0, 6.2832); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- the loop: sleeps when the page is idle ---------- */
  let swarmWasOn = false;
  const tick = (dt, t) => {
    if (html.classList.contains('swarm-on')) { swarmWasOn = true; return false; }   // hidden under the swarm intro: do nothing
    if (swarmWasOn) { swarmWasOn = false; lastInput = t; born = t; }
    if (document.hidden) return false;
    if (!born) born = t;
    // adaptive quality: only judge real, busy frames
    const raw = PS ? dt * 1000 : 16;
    if (!forceFull && level < 2 && t - born > 2500 && t - lastInput < 800 && raw > 0 && raw < 200) {
      slow = slowN ? slow * 0.88 + raw * 0.12 : raw; slowN++;
      if (slowN >= 45 && slow > 26) { slowN = 0; slow = 0; setLevel(level + 1); }
    }
    step(dt, t, false);
    // keep going while anything is still moving, or for a few seconds after the last input
    const moving = Math.abs(vel) > 3 || Math.abs(burst) > 0.002 || Math.abs(burstV) > 0.01 || Math.abs(yawV) > 0.01 || Math.abs(yawOff) > 0.005 || waves.length || flash > 0.01 || hasPtr > 0.02 !== hasPtrT > 0.5;
    const settling = ['0', '1', '2', '3', '4', '5', '6'].some((j) => Math.abs(S[j] - T[j]) > 0.002);
    const recent = t - lastInput < (finePointer ? 9000 : 5000);
    return !!(moving || settling || recent);
  };

  const touchInput = () => { lastInput = performance.now(); wake(); };

  /* ---------- init ---------- */
  const rebuild = () => { measure(); resize(true); orbSize = orbA ? orbA.offsetWidth : 800; };
  setLevel(level);
  rebuild();
  buildEmbers();

  if (reduced) {
    // one still frame (and a fresh one after the page size or scroll position settles)
    const still = () => { measure(); first = true; step(0.016, 0, true); };
    still();
    let to = 0;
    addEventListener('resize', () => { clearTimeout(to); to = setTimeout(() => { resize(true); still(); }, 200); });
    addEventListener('scroll', () => { clearTimeout(to); to = setTimeout(still, 160); }, { passive: true });
    return;
  }

  registerFrame(tick);

  addEventListener('scroll', touchInput, { passive: true });
  if (finePointer) {
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      tmx = e.clientX; tmy = e.clientY;
      tpX = (e.clientX / innerWidth) * 2 - 1; tpY = (e.clientY / innerHeight) * 2 - 1;
      if (!hasPtrT) { mx = tmx; my = tmy; }
      hasPtrT = 1; touchInput();
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { hasPtrT = 0; tpX = 0; tpY = 0; touchInput(); });
  }
  // click or tap on empty space: shockwave that blows the machine apart and springs it back
  addEventListener('pointerdown', (e) => {
    if (e.button > 0 || document.body.classList.contains('lock')) return;
    if (e.target instanceof Element && e.target.closest('a,button,input,textarea,select,label,[data-light],.nav,.menu')) return;
    kick(7);
    if (waves.length < 3) waves.push({ x: e.clientX, y: e.clientY, t: 0 });
    touchInput();
  }, { passive: true });
  // touch: a horizontal swipe spins the machine
  if (!finePointer) {
    let tx = 0, ty = 0, on = false;
    addEventListener('touchstart', (e) => { const p = e.touches[0]; tx = p.clientX; ty = p.clientY; on = true; }, { passive: true });
    addEventListener('touchmove', (e) => {
      if (!on) return;
      const p = e.touches[0], dx = p.clientX - tx; tx = p.clientX; ty = p.clientY;
      yawV = clamp(yawV + dx * 0.05, -6, 6);
      touchInput();
    }, { passive: true });
    addEventListener('touchend', () => { on = false; }, { passive: true });
  }

  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { rebuild(); buildEmbers(); touchInput(); }, 160); });
  if ('ResizeObserver' in window) {
    let ro = 0;
    new ResizeObserver(() => { clearTimeout(ro); ro = setTimeout(() => { measure(); touchInput(); }, 120); }).observe(document.body);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); touchInput(); });
  addEventListener('load', () => { measure(); touchInput(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) touchInput(); });
  new MutationObserver(() => { if (!html.classList.contains('swarm-on')) touchInput(); }).observe(html, { attributes: true, attributeFilter: ['class'] });
})();
