# Mohammed Usama: Portfolio

A responsive, accessible developer portfolio in a black, crimson and liquid-glass style.
Plain HTML, CSS and JavaScript. No framework, no build step, no tracking.

## Run it locally

```bash
python3 -m http.server 8000      # or: npx serve
# open http://localhost:8000
```

Serve it over HTTP rather than opening `index.html` directly, so the resume check and GitHub data work.

## Before you deploy: 3 things only you can do

| # | What | Where |
|---|------|-------|
| 1 | **Add your resume PDF** named exactly `Mohammed_Usama_Resume.pdf` | `assets/resume/` |
| 2 | **Set your live URL** (needed for social-preview images and canonical link): `node scripts/set-site-url.mjs https://your-site.example/` | run once |
| 3 | **Choose how the contact form delivers** (see below) | `js/main.js`, `CONFIG.form` |

Optional but recommended: add your college name and years under Education (see the commented block in `index.html`), and run `node scripts/check-links.mjs` from a normal internet connection to confirm every demo link opens.

### Resume
Drop the PDF into `assets/resume/`. The Resume section detects it automatically: desktop browsers show an inline preview plus Download and Open buttons; phones show the buttons only. Until the file exists, visitors see a "Request my resume" email button instead of a broken link.

### Contact form
Out of the box the form validates input and opens a prefilled Gmail draft addressed to you. It never claims a message was sent, because a static site cannot send email by itself. To make it send directly, set `CONFIG.form` in `js/main.js`:

- **Formspree:** create a form at formspree.io, then `form: { endpoint: 'https://formspree.io/f/YOUR_ID', encoding: 'json', extra: {} }`
- **Web3Forms:** `form: { endpoint: 'https://api.web3forms.com/submit', encoding: 'json', extra: { access_key: 'YOUR_KEY' } }`
- **Netlify Forms** (when hosted on Netlify): `form: { endpoint: '/', encoding: 'urlencoded', extra: {} }`

With an endpoint set, the form shows real success or failure based on the server's response, keeps the visitor's text on failure, and offers a mail-app fallback. A hidden honeypot field filters basic spam bots.

## Deploy

All three are static hosting; publish the folder as it is.

- **GitHub Pages:** push to a repo, then Settings, Pages, deploy from branch `main` and `/ (root)`.
- **Netlify:** drag the folder onto app.netlify.com/drop, or connect the repo (no build command, publish directory `.`).
- **Vercel:** import the repo, framework preset "Other", no build command, output directory `.`.

## Editing content

| To change | Edit |
|-----------|------|
| Projects (text, links, status, tech) | `js/projects.js`, the `PROJECTS` array |
| Hero text, About, Skills, Education, Contact details | `index.html` |
| Colors, fonts, glass strength, spacing | CSS variables at the top of `css/style.css` |
| Email, GitHub username, resume path, form delivery | `CONFIG` at the top of `js/main.js` |

Project status: `'live'` shows a Live badge and needs a working `live` URL. `'source'` shows "Open source" and hides the Live demo button. All three projects are currently `'live'`; Cipher's demo is `https://usama-op.github.io/Textdicript/` (the URL you provided; run `node scripts/check-links.mjs` to confirm it opens from your connection).

Skill bars show status, not proficiency: a full bar means "used in my projects", a half bar means "currently learning". They are driven by `data-state="used|learning"` in `index.html`; there are no invented percentages.

## Background and scrolling

`js/background.js` draws the scroll-driven computer on one canvas; `js/scroll.js` holds the shared frame loop, wheel glide and section-link easing. To tune the story, edit the `KF` keyframe table in `background.js` (one row per section: explode amount, yaw, pitch, focus layer, zoom, sideways shift, screen power). Add `?bg=full` to the URL to force full quality, `?swarm=off` to skip the intro.

## Hero artwork

`assets/images/hero-desktop-*` (16:9) and `hero-mobile-*` (3:4) come from your two generated images, exported as AVIF and WebP at several widths. The small corner sparkle mark in both originals was removed from the background; the portrait, face and name are untouched. The browser picks the landscape or portrait version by viewport shape (landscape from 23:20 upward), so the name is never cropped on tablets, phones or ultrawide screens. The name, portrait and background are one flattened image, so the parallax moves the whole artwork with the pointer, plus a following light. Moving the name separately from the portrait would need a transparent cut-out of you as a separate file.

## Scroll-reactive background

A fixed layer behind the whole page reacts to scrolling and to the pointer (`js/background.js`, styles in `css/style.css` under "scroll-reactive background"):

- **Crimson light orbs** travel across the screen as you move down the page.
- **A perspective grid floor** streams toward you as you scroll and brightens with scroll speed.
- **Glass shards** (echoing your hero artwork) drift and rotate with page position and swing harder on fast scrolls.
- **Embers** rise in three depth layers and stretch into streaks when you scroll quickly.
- **A soft spotlight and light shard parallax** follow the mouse on desktop.

How it stays light: everything is transform or opacity only (GPU-composited), and the animation loop runs **only while something is moving**; when you stop scrolling and the pointer rests, it requests zero frames. Visitors who prefer reduced motion get one static composition. It is hidden while the swarm intro plays.

Adaptive quality: if a device cannot hold roughly 25fps while scrolling, the background steps down by itself to a lighter version (no grid floor, spotlight or ember streaks, fewer shards), then to a minimal one (orbs only), and remembers that for the browser session. Add `?bg=full` to the URL to force full quality, for example when testing. To change the look, edit the `SHARDS` and `DEPTHS` lists at the top of `js/background.js` and the `.bg__*` rules in the CSS.

## Swarm cursors intro

On first load, a swarm of cursors redraws the page like a design tool. It rebuilds the page as the visitor scrolls, so it keeps going until they finish or skip it.

- **Skip:** the "Skip intro" button (top right, below the nav on phones) or the Escape key. The choice is remembered for the browser session, so reloads don't replay it.
- **Replay:** the "Replay swarm intro" link in the footer.
- **Off for everyone:** delete the `<script src="js/swarm-launch.js" defer></script>` line at the bottom of `index.html` (you can also delete `js/swarm.js`, `js/swarm-launch.js` and the footer replay button).
- **Off for one visit:** add `?swarm=off` to the URL. It is also off automatically when the visitor prefers reduced motion.
- The swarm layer is click-through and the nav, mobile menu and Skip button sit above it, so the site stays usable while it plays.
- `swarm.js` (146 KB, about 40 KB gzipped) downloads only after the page has finished loading, so it does not affect first paint. While it plays, the lazy-loaded images are fetched early so the swarm copies the finished page.
- The swarm's own control bar (inside the unmodified script) is wider than a small phone screen, so its sound button can be clipped there. Skip and Escape still work.

## Performance and accessibility

- About 310 KB on first load before the swarm intro (the background adds about 10 KB of JavaScript (4 KB gzipped) and no images); hero is AVIF (about 45 to 60 KB), with WebP fallback. Fonts are self-hosted, subset variable WOFF2.
- Project images are lazy-loaded (the swarm intro loads them early, see below). Apart from the swarm intro, nothing animates on its own: the background and other effects run only on pointer or scroll, and the background's frame loop stops completely when the page is idle.
- Honors `prefers-reduced-motion`, `prefers-reduced-transparency` and forced-colors. Keyboard navigation, skip link, visible focus, and a focus-trapped mobile menu.
- Audited with axe-core (WCAG 2.1 A/AA and best practices) with the swarm off: 0 violations on desktop and phone.
- Phones use fewer live blur layers to keep scrolling smooth.

## Project structure

```
index.html            page, SEO and social tags
css/style.css         all styling and design tokens
js/main.js            navigation, effects, resume, form, GitHub data
js/background.js      scroll- and pointer-reactive background
js/projects.js        project data and card rendering
js/swarm.js           Swarm Rebuild, third-party, unmodified
js/swarm-launch.js    starts, skips and replays the swarm intro
assets/images/        hero artwork, social preview
assets/projects/      project screenshots
assets/resume/        put your resume PDF here
fonts/                self-hosted fonts (SIL Open Font License 1.1)
scripts/              set-site-url.mjs, check-links.mjs
```

## Credits

Fonts: Big Shoulders Display and Instrument Sans (both SIL Open Font License 1.1), via Fontsource.
Swarm cursors: `js/swarm.js` is Swarm Rebuild by DhvanilPatel (github.com/DhvanilPatel/swarm-cursors), included unmodified from your original project. I could not find a licence file in that repository, so check its terms before relying on it commercially.
