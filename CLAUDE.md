# Portfolio — Rodrigo Lago

Single-page portfolio website for Rodrigo Lago, UI/UX Developer & Front End Engineer. Built with Astro 6, pure CSS, zero external dependencies.

## Stack

- **Framework**: Astro 6.3.3 (static site generation)
- **Language**: TypeScript (strict mode)
- **Styling**: Pure CSS — no Tailwind, no CSS Modules, no styled-components
- **Fonts**: Google Fonts CDN (Bebas Neue, Barlow, Barlow Condensed, Cormorant Garamond)
- **JS**: Vanilla only — no React, Vue, Svelte, or any UI framework
- **Runtime**: Node.js >= 22.12.0

## Commands

```bash
npm run dev      # Start dev server (localhost:4321)
npm run build    # Production build → /dist
npm run preview  # Preview production build
```

## Project Structure

```
src/
├── components/      # Reusable Astro components
├── layouts/
│   └── Layout.astro # Root HTML template (fonts, meta, global animations)
├── pages/
│   └── index.astro  # Only page — all sections composed here
└── styles/
    ├── tokens.css       # CSS custom properties (colors, type scale, spacers)
    ├── global.css       # CSS reset + layout utilities
    └── typography.css   # Heading and text styles
```

## Design System

All design tokens live in `src/styles/tokens.css` as CSS custom properties.

### Colors

```css
--c-bg:         #F0F0EB  /* warm off-white, main background */
--c-bg-dark:    #1F1C1D  /* dark, used for overlays and loader */
--c-text:       #1F1C1D  /* primary text */
--c-text-muted: #6B6866  /* secondary / muted text */
--c-white:      #F0F0EB  /* used as "white" in dark contexts */
--c-line:       rgba(31, 28, 29, 0.12)   /* subtle borders */
--c-line-dash:  rgba(31, 28, 29, 0.18)   /* dashed borders */
```

### Typography

Three-font system with strict role separation:

| Token | Font | Role |
|---|---|---|
| `font-display` | Bebas Neue | H1 — large display, uppercase |
| `font-serif` | Cormorant Garamond | H2, para-lg — elegant, italic |
| `font-ui` | Barlow / Barlow Condensed | H3, H4, body, buttons |

Type scale uses `clamp()` for fluid scaling — do not use fixed `px` for typography.

```css
--text-h1:      clamp(4.37rem, 18vw, 24rem)
--text-h2:      clamp(2.5rem, 9vw, 11rem)
--text-h3:      clamp(1.25rem, 2.5vw, 3.25rem)
--text-h4:      clamp(0.75rem, 0.85vw, 1rem)
--text-para-lg: clamp(1.75rem, 5vw, 6.56rem)
--text-btn-rg:  clamp(1.25rem, 2.5vw, 3.25rem)
--text-body:    clamp(0.875rem, 0.95vw, 1rem)
```

### Spacing

All spacing tokens use `clamp()`. Always use `--sp-*` tokens, never hardcoded values:
`--sp-12` through `--sp-360`.

### Layout

- Max width: `120rem` (1920px), centered with `.container` utility
- Gutter: `var(--sp-12)`
- Mobile breakpoint: `768px`

## Components

| Component | Purpose |
|---|---|
| `Loader.astro` | Full-screen intro animation. Fires `loader:done` custom event when complete |
| `Nav.astro` | Fixed navbar + full-screen overlay menu with ARIA support |
| `Hero.astro` | Above-the-fold section, animates in after loader |
| `Works.astro` | Featured projects grid (2-col desktop, 1-col mobile) |
| `WorkCard.astro` | Individual project card with hover effects |
| `FAQ.astro` | 3-column table layout FAQ (collapses to 2-col on mobile) |
| `Footer.astro` | CTA + nav + social links |
| `About.astro` | About section (built but not currently in page flow) |
| `Message.astro` | Centered message section (built but currently unused) |

## Animations

- **Loader**: Two-halves (`top` / `bottom`) slide off screen, then fires `loader:done`
- **Scroll reveal**: `Intersection Observer` in `Layout.astro` — adds `.is-visible` class; elements use `[data-reveal]` attribute
- **Hero**: Animates via `body.hero-ready` class set after loader completes
- **Hover**: WorkCard scales to `1.04`, overlay fades in
- **Reduced motion**: All animations respect `prefers-reduced-motion`

## Content & Owner Info

- **Owner**: Rodrigo Lago
- **Role**: UI/UX Developer & Front End Engineer (4+ years)
- **Email**: rodrigo.n.lago@gmail.com
- **LinkedIn**: linkedin.com/in/rodrigolago
- **GitHub**: github.com/rodrigolago
- **Language**: Spanish (HTML `lang="es"`, FAQ content in Spanish)
- **Projects**: 4 placeholder cards with `href="#"` — need real data
- **OG image**: Referenced as `/images/og.png` — file does not exist yet

## Coding Conventions

- Component styles go in scoped `<style>` blocks within `.astro` files
- Global / shared styles go in `src/styles/`
- New design tokens go in `tokens.css`, not inline
- Hard-coded data (projects, FAQs) lives inside the component as a TypeScript array
- No comments unless the WHY is non-obvious
- Semantic HTML and ARIA attributes are required — do not regress accessibility
- Sections use `id` attributes for anchor navigation: `#works`, `#faq`, `#about`

## What Needs Work

- Project cards have placeholder data and `href="#"` links — need real images and URLs
- `About.astro` is complete but not rendered in `index.astro`
- `Message.astro` is unused
- OG image (`/public/images/og.png`) is missing
- No contact form — email link only
- `README.md` is the default Astro boilerplate, not project-specific
