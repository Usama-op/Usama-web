# Changelog

## 2.3: Smooth scrolling and a scroll-driven computer background

**Smoothness**
- **One shared frame loop** (`js/scroll.js`) now drives the background, hero parallax, progress bar and scroll smoothing, so there is one animation frame per screen refresh and a fixed order: scroll first, visuals second.
- **Mouse-wheel glide:** a physical wheel eases to its target with frame-rate-independent damping. Trackpads and touch screens stay fully native (they are already smooth). Nested scrollers, text areas, zoom and reduced motion are left alone.
- **Section links glide** with an eased tween (nav, mobile menu, hero buttons, back-to-top), replacing the browser's `scroll-behavior: smooth`, which stuttered on a busy page. The hash and keyboard focus still update.
- **Removed per-frame layout work:** the old background read element sizes and rewrote CSS variables on hundreds of nodes every scroll frame, and the hero image restarted a CSS transition on every scroll tick. Both are gone; page height is cached and everything moves with `transform` only.
- Skill bars animate with `transform` instead of `width`; the big blurred hero glow became a plain gradient; glass blur is 12px (was 18px).
- **Adaptive quality, 3 tiers:** if scrolling drops below about 38fps the page steps down by itself (tier 1: 30fps background, lower resolution, lighter glass blur; tier 2: outline-only scene and no glass blur), and remembers it for the session. `?bg=full` forces full quality for testing.
- **Sound:** the swarm intro's audio now uses a larger audio buffer (`latencyHint: "playback"`) and caps simultaneous voices (18 desktop, 9 on phones or 4-core-or-fewer CPUs, was 28), so it no longer starves on a busy phone. These are the only edits to `js/swarm.js`; everything else in it is unchanged.

**New background (`js/background.js`)**
- A computer comes apart as you scroll: display, keyboard deck, motherboard (CPU, RAM, SSD, fan, chips), battery and base separate layer by layer, the camera orbits and focuses a different part per section, and at Contact it is back together and powered on. Data pulses travel along the circuit traces as you scroll; the fan spins up with scroll speed.
- **Interactive:** the mouse tilts the camera and lights the scene; click or tap empty space for a shockwave that blows the parts apart and springs them back; on touch screens, swipe sideways to spin the machine.
- One canvas, drawn only while something is happening; it sleeps a few seconds after the last input. Reduced-motion visitors get one still frame. It pauses under the swarm intro and resumes after.

**Measured** (headless Chromium, 4x CPU throttle, no GPU, scrolling the whole page; frames over 50ms out of 365): desktop 128 before, 42 after, median frame 50ms before, 16.7ms after. Phone profile matched the old speed with fewer slow frames. Real devices with a GPU should do better than this worst case.

## 2.2: Scroll-reactive background, Cipher demo live

- **New background** that reacts to scrolling: crimson light orbs that travel down the page, a perspective grid floor that streams toward you and brightens with scroll speed, glass shards that drift, rotate and swing on fast scrolls, and ember layers that stretch into streaks at speed. On desktop a soft spotlight and light shard parallax follow the pointer. It replaces the old static glows and the two decorative shards.
- **Zero idle cost:** the animation loop runs only while something is moving and stops completely otherwise. Reduced-motion visitors get one static frame.
- **Adaptive quality:** if a device cannot hold roughly 25fps while scrolling, the background steps down to lite (no grid, spotlight or streaks) and then minimal (orbs only), and remembers it for the session. `?bg=full` forces full quality.
- **Cipher is live:** status set to Live and the demo button added, pointing to `https://usama-op.github.io/Textdicript/`.
- The background hides while the swarm intro plays, so the swarm doesn't copy it as layers. Fixed a bug in the swarm launcher where its first timer tick ended the "prep" state too early.
- Resume check now has a 1.2 s deadline on its idle callback, so a busy page can no longer postpone it (found while verifying: it intermittently left the PDF preview missing).
- Hero artwork edges now fade proportionally (5% of the width, up to 84 px) so they blend into the new background.

## 2.1: Swarm cursors back, About image and contribution graph removed

- **Swarm cursors restored** from your original project: `js/swarm.js` is byte-identical to your file, with a launcher adapted to the new design. The nav and mobile menu now live in the browser top layer so they stay clickable above the swarm; the swarm layer is click-through; Skip, Escape, `?swarm=off`, reduced-motion handling and a footer Replay link are included. The launcher stops its timer when the swarm is idle, snaps scroll-reveal animations to their final state before the swarm copies the page, and shows Skip only after the capture so the button is not copied into the replica.
- **Removed the About portrait image** (and its four image files). About is now text plus the facts card, side by side.
- **Removed the contribution graph**, its styles and the third-party graph request. GitHub now shows two live stats (public repositories, followers) and featured repositories.
- Footer links now have 44 px tap targets.

## 2.0: Black, crimson and liquid glass

**Design**
- New black, crimson and liquid-glass theme: frosted surfaces, pointer-lit glowing edges, floating glass nav with a sliding active indicator, glass cards for skills, projects and forms.
- Typography: Big Shoulders Display for headings (echoes the artwork's lettering) and Instrument Sans for body text, self-hosted.
- Hero rebuilt around your two generated images: landscape (16:9) and portrait (3:4) with automatic switching, whole artwork always visible, name behind the portrait, face never covered. Parallax, a pointer-following light and a one-time light sweep.
- Corner sparkle mark removed from both images' backgrounds (portrait and name untouched).

**Content and accuracy**
- Name corrected to **Mohammed Usama** everywhere (title, README, footer, alt text, metadata). Nothing named otherwise remains.
- **Cipher**: repo corrected to `Usama-op/Textdicript`; the inaccurate "Live" status and demo button removed; now "Open source". Added a real screenshot of the tool.
- Skills: replaced unexplained badges with categorised lists and animated bars that mean "used in my projects" or "currently learning" (no invented percentages). Added JavaScript, WebRTC and Web Crypto API, which your repos use. Remove them in `index.html` if you prefer.
- Added Resume to the navigation and a Resume section with PDF preview, download and an honest empty state.
- Education shows only what the original site stated; college name and years left for you to add.

**Functionality**
- Contact form: real validation (inline messages, focus handling), honeypot, and a true send path through Formspree, Web3Forms or Netlify Forms. Without an endpoint it opens a prefilled Gmail draft and never claims it was sent.
- GitHub section: featured repos first, forks excluded, hourly cache, stale-data fallback, and a static fallback if the API is rate-limited.
- Mobile menu with focus trap, Escape to close and scroll lock; back-to-top button; scroll progress bar; magnetic desktop buttons.

**Cleanup and optimisation**
- Removed the "swarm rebuild" script and its launcher (restored in 2.1 at your request).
- Replaced three CSS files (59 KB combined) with one stylesheet; replaced the old JavaScript files and removed unused assets and icons.
- Images re-exported as AVIF and WebP in multiple widths; lazy-loading for non-critical images; fixed hero preload by viewport shape.
- SEO: title, description, canonical, Open Graph and Twitter tags, JSON-LD, robots.txt, sitemap.xml, favicon set and a 1200x630 social preview.
- Fixed mobile horizontal overflow, console errors and dead links; accessibility audit with 0 violations.
- Added `scripts/set-site-url.mjs` and `scripts/check-links.mjs`.
