# rlago.com

Personal portfolio of **Rodrigo Lago** — UX Engineer based in Mar del Plata, Argentina.

Live at [rlago.com](https://rlago.com).

## Stack

- **Framework** — [Astro 6](https://astro.build) (static site generation)
- **Language** — TypeScript (strict)
- **Styling** — Pure CSS with design tokens (no Tailwind, no CSS-in-JS)
- **Type** — Bebas Neue · Cormorant Garamond · Barlow / Barlow Condensed
- **Runtime** — Node.js ≥ 22.12.0
- **Dependencies** — [`astro`](https://www.npmjs.com/package/astro), [`@astrojs/sitemap`](https://www.npmjs.com/package/@astrojs/sitemap), [`lenis`](https://www.npmjs.com/package/lenis)

No React, no Vue, no UI framework. Vanilla TypeScript for interactions.

## Getting started

```bash
npm install
npm run dev      # http://localhost:4321
```

| Command | Action |
| :--- | :--- |
| `npm run dev` | Start dev server on `localhost:4321` |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview the production build locally |

## Project structure

```
src/
├── components/      Astro components (Hero, Works, About, FAQ, Footer, …)
├── layouts/
│   └── Layout.astro Root template — fonts, meta, scroll reveal observer
├── pages/
│   └── index.astro  Single page — all sections composed here
├── scripts/         Vanilla TS interaction modules
└── styles/
    ├── tokens.css       Design tokens (color, type scale, spacing)
    ├── global.css       Reset + layout utilities
    └── typography.css   Heading and text styles
```

## Design system

All design tokens live in [`src/styles/tokens.css`](src/styles/tokens.css) as CSS custom properties.

- **Color** — warm off-white background (`#F0F0EB`) over near-black text (`#1F1C1D`)
- **Type scale** — fluid `clamp()` from `0.875rem` body up to `24rem` display
- **Spacing** — `--sp-12` through `--sp-360`, all fluid
- **Max width** — `120rem` (1920px), centered via `.container`
- **Breakpoint** — `768px`

## Accessibility

- Semantic landmarks and ARIA on all interactive elements
- Full-screen nav overlay with focus trap and ESC handling
- All animations respect `prefers-reduced-motion`

## Deployment

Static build to `./dist/`, deployed via Cloudflare Pages on push to `main`.

## License

© Rodrigo Lago. All rights reserved.
