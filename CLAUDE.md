# Portfolio — Rodrigo Lago

Single-page portfolio for Rodrigo Lago, UX Engineer. Built with Astro 6, pure CSS, vanilla TypeScript, self-hosted fonts. Deployed to Cloudflare Workers (static assets).

## Stack

- **Framework**: Astro 6.3.3 (static site generation, sitemap integration)
- **Language**: TypeScript (strict, `astro/tsconfigs/strict`)
- **Styling**: Pure CSS — no Tailwind, no CSS Modules, no styled-components
- **Fonts**: Self-hosted via Fontsource (Bebas Neue, Barlow, Barlow Condensed, Cormorant Garamond) — bundled by Vite, no third-party CDN at runtime
- **JS**: Vanilla TS only — no React/Vue/Svelte
- **Smooth scroll**: [`lenis`](https://www.npmjs.com/package/lenis)
- **Runtime**: Node.js >= 22.12.0
- **Hosting**: Cloudflare Workers (assets), `wrangler.jsonc` at root, custom domains `rlago.com` + `www.rlago.com`

## Commands

```bash
npm run dev        # Dev server on localhost:4321
npm run build      # Production build → /dist
npm run preview    # Preview production build
npm run typecheck  # astro check
```

CI runs `typecheck` + `build` on every push (`.github/workflows/ci.yml`).

## Project Structure

```
src/
├── components/      Reusable Astro components
├── config/
│   └── site.ts      Site metadata + contact/social + {{token}} interpolation
├── content/         Copy as JSON — one file per component
├── layouts/
│   └── Layout.astro Root template — fonts, meta, JSON-LD, init wiring
├── pages/
│   ├── index.astro  Single content page
│   └── 404.astro    Not-found page (served by Cloudflare)
├── scripts/         Vanilla TS modules — one responsibility each
└── styles/
    ├── tokens.css       CSS custom properties (fonts, type scale, spacers, palette)
    ├── theme.css        Light + dark themes via light-dark()
    ├── global.css       Reset + layout utilities
    └── typography.css   Heading / text styles
```

## Design System

All design tokens live in `src/styles/tokens.css`. Theme colors live in `src/styles/theme.css` and resolve via CSS `light-dark()`.

### Colors

The site uses two themes (light/dark) that share a single token surface. The active theme is picked by `data-theme` on `<html>` (set by an inline script before first paint to avoid FOUC). When `data-theme` is unset, the OS preference wins via `color-scheme: light dark`.

Key tokens (resolve to different values per theme):

```
--c-bg            page background
--c-text          primary text
--c-text-muted    secondary / muted text
--c-line          hairline borders (12% opacity)
--c-line-dash     dashed dividers (18% opacity)
--c-line-strong   stronger borders (20% opacity)
--c-surface-tint(-soft/-strong)  subtle tinted fills
--c-overlay-hover hover scrim on cards
--c-logo          inkable logo fill
--c-white         theme-invariant paper colour (for text over dark imagery)
--c-ink / --c-paper  theme-invariant brand constants
```

### Typography

Three-font system with strict role separation:

| Token | Font | Role |
|---|---|---|
| `--font-display` | Bebas Neue | H1 — large display, uppercase |
| `--font-serif` | Cormorant Garamond | H2, para-lg — elegant, italic |
| `--font-ui` | Barlow | H4, body, CTA labels |
| `--font-condensed` | Barlow Condensed | H3, btn-rg |

Type scale uses `clamp()` for fluid scaling. Never use fixed `px` for typography.

#### Fontsource weight audit

Only the weights below are imported (`src/layouts/Layout.astro`). Re-run the audit before adding more — every extra weight is ~22 KB of woff2 over the wire.

| Family | Weight / style | Where it's used |
|---|---|---|
| Bebas Neue | 400 | `.h1`, hero role, FAQ heading, Footer question, Works heading, About HELLO, Marquee, FAQ `__num`, WorkCard placeholder number |
| Barlow | 400 | Body text, `.h5`, `.overline` |
| Barlow | 500 | `PrimaryCta` / About CTA labels |
| Barlow | 600 | FAQ `__question`, WorkCard `<strong>` |
| Barlow | 700 | `.h4`, `.skip-link`, About `<strong>` |
| Barlow Condensed | 800 | `.h3`, `.btn-rg` |
| Cormorant Garamond | 300 italic | `.h2`, `.para-lg`, hero description, footer intro |

```
--text-h1       clamp(4.37rem, 18vw, 24rem)
--text-h2       clamp(2.5rem, 9vw, 11rem)
--text-h3       clamp(1.25rem, 2.5vw, 3.25rem)
--text-h4       clamp(0.875rem, 0.85vw, 1rem)
--text-para-lg  clamp(1.75rem, 5vw, 6.56rem)
--text-btn-rg   clamp(1.25rem, 2.5vw, 3.25rem)
--text-body     clamp(1rem, 0.95vw, 1.1rem)
```

### Spacing

All spacing tokens are fluid `clamp()` values. Always use `--sp-*` tokens, never hardcoded values:
`--sp-6`, `--sp-12`, `--sp-24`, `--sp-36`, `--sp-48`, `--sp-60`, `--sp-72`, `--sp-84`, `--sp-96`, `--sp-120`, `--sp-144`, `--sp-180`, `--sp-360`.

### Layout

- Max width: `120rem` (1920px), centered with `.container`
- Gutter: `var(--sp-12)`
- Mobile breakpoint: `768px`

## Components

| Component | Purpose |
|---|---|
| `Loader.astro` | Full-screen intro animation. Fires `loader:done` event when complete |
| `Nav.astro` | Fixed navbar — logo, links, theme toggle, scroll progress bar |
| `Hero.astro` | Above-the-fold, sticky-top, kinetic distortion on role text |
| `About.astro` | Intro section with parallax photo + star, CTAs |
| `Marquee.astro` | Velocity-modulated marquee between Hero and About |
| `Works.astro` | Selected works grid (2-col desktop, 1-col mobile) |
| `WorkCard.astro` | Individual project card with hover + tech-stack pills |
| `FAQ.astro` | 3-col Q&A grid with scroll-driven row halo |
| `Footer.astro` | CTA + back-to-top + social bar |
| `PrimaryCta.astro` | Filled CTA button (ink → paper hover flip) |
| `SectionMeta.astro` | Section index strip (eyebrow + spinning star) |
| `StarIcon.astro` | Shared asterisk SVG — used by Marquee, About, Footer, SectionMeta |

## Shared scripts (`src/scripts/`)

| Module | Responsibility |
|---|---|
| `SmoothScroll.ts` | Lenis init + anchor-click hijack |
| `PageScrim.ts` | Scroll-driven dark overlay between hero and overlay content |
| `Reveal.ts` | `[data-reveal]` + mask-reveal + line-draw IO fallbacks |
| `GrainCanvas.ts` | Animated film grain |
| `CustomCursor.ts` | Mix-blend-difference cursor |
| `FitText.ts` | Canvas + DOM helpers to size headings to container width |
| `StarSpin.ts` | RAF-driven star rotation with scroll-velocity boost |
| `PixelDrift.ts` | Pixelated bg drift factory (Hero bg + FAQ row glow) |
| `TextDistortion.ts` | WebGL water-distortion overlay on selected text |
| `KineticTextEffect.ts` | Reusable subclass — progress-driven horizontal glyph stretch; configurable `align` + `fitToWidth`, pluggable progress strategies (`stickyScrollProgress`, `settleAtBottomProgress`) + `kineticLine()` helper. Currently used by Hero |
| `HeroKineticEffect.ts` | Hero config of `KineticTextEffect` (sticky-scroll progress) |
| `ScrambleHover.ts` | Split-flap-style hover effect on links |

## Animations & motion

- **Loader**: Two halves slide off the screen, then fires `loader:done`
- **Scroll reveal**: Modern path uses CSS `animation-timeline: view()`; fallback is `IntersectionObserver` toggling `.is-visible`
- **Hero**: Animates via `body.hero-ready` set after loader completes
- **Mask reveal**: Words split into spans, slide up from below a clip
- **`prefers-reduced-motion`** is respected throughout — Lenis disables, RAF loops skip, transitions collapse

## Content & owner info

- **Name**: Rodrigo Lago (`Rodrigo` / `Lago`)
- **Role**: UX Engineer
- **Location**: Mar del Plata, Buenos Aires, Argentina
- **Language**: English (`<html lang="en">`)
- **Email**: hi@rlago.com
- **LinkedIn**: linkedin.com/in/rnlago (handle displayed: `rodrigolago`)
- **GitHub**: github.com/rodrigolagodev
- **Site URL**: https://rlago.com
- **OG image**: `/public/images/og.png` (1200×630)
- **Avatar**: `/public/images/photo.webp`

Site identity, contact, and social handles are centralised in `src/config/site.ts`. Use `fillTokens()` to expand `{{contactEmail}}`, `{{linkedinUrl}}`, etc. inside JSON content strings.

## Coding conventions

- Component styles live in scoped `<style>` blocks
- Global / shared styles go in `src/styles/`
- New design tokens go in `tokens.css`, not inline
- Copy lives in `src/content/*.json` — components import it via static `import`
- One vanilla-TS module per concern in `src/scripts/`
- Semantic HTML + ARIA required — do not regress accessibility (skip-link, focus-visible, aria-pressed on theme toggle, `aria-labelledby`/`aria-label` on sections)
- Sections use `id` for anchor nav: `#about`, `#works`, `#faq`, `#contact`
- `set:html` is used in About/FAQ for inline `<strong>` and `<a>` — source is the JSON files we own; **do not** wire this to an untrusted CMS without sanitising

## SEO / metadata

- JSON-LD Person + WebSite + FAQPage
- `<link rel="canonical">`, OG, robots, sitemap (`@astrojs/sitemap`)
- `rel="me"` on LinkedIn / GitHub / mailto
- `<link rel="alternate icon">` for legacy + SVG favicon

## What still needs work

- Twitter Card meta tags (`twitter:card`, `twitter:image`) — not yet added
- `cv.pdf` referenced by About — file not yet in `/public`
- Project portfolio has 2 real cards; more to be added over time
