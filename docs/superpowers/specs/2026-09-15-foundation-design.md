# Foundation: prerendering, performance, contact UX

Date: 2026-09-15
Goal: rank better for brand/parts searches ("Metso alkatrész") and service searches ("kőtörő javítás"), and improve the site, without new material from the owner. New service-topic pages are a separate, later project.

Hosting: Cloudflare Pages, built from GitHub on push with `npm run build`. The GitHub Pages deployment and the `/geinvest-website` project-page prefix are no longer used.

## 1. Build-time prerendering

- `App` receives `route` and `locale` as props instead of reading `window.location` during render. The browser entry (`main.tsx`) derives them from the URL. Browser-only code (localStorage, `document.head` updates, listeners, legacy `#/route` handling) stays in effects.
- Remove `getPrefix()` and the `/geinvest-website` handling. `href()` returns `paths[locale][route]` and `asset()` returns `/${path}`.
- New `src/entry-server.tsx` exports `render(route, locale): string` using `renderToString`.
- `npm run build` becomes: `tsc -b` → client `vite build` → `vite build --ssr src/entry-server.tsx --outDir dist-ssr` → `node scripts/prerender.js`. The prerender script iterates over the same route list (`paths`) and replaces the `<div id="root">…</div>` contents in every `dist/**/index.html`. `dist-ssr` is gitignored and removed after prerendering.
- The Vite plugin keeps injecting `lang`, `headTags()` and the sitemap. `staticBody()` and its injection are removed.
- `main.tsx` uses `hydrateRoot` when `#root` has children (production) and `createRoot` otherwise (dev).
- The cookie banner renders only after mount (a `mounted` state), so the server HTML never contains it.
- Add `.node-version` containing `22`.

Acceptance: every built HTML contains the page's `<h1>` and body text; there are no hydration warnings in the console; the language switch and legacy `#/route` links still work.

## 2. Images, fonts, caching

- `scripts/images.js` (dev dependency `sharp`) reads `public/assets/img/**/*.{jpg,jpeg,png}` and writes WebP variants at widths 640/1280/1920 (capped at the original width) with content-hashed names to `public/assets/img/_opt/`. It also writes `src/generated/images.json`, which maps each source path to `{ width, height, variants: [{ width, src }] }`. Both outputs are gitignored. The script runs via the `predev` and `prebuild` hooks and skips unchanged files.
- `<Img src alt priority? sizes?>` renders `<picture>` with a WebP `srcset`, the original image as the `<img>` fallback, and intrinsic `width`/`height`. The default is `loading="lazy"`. `priority` sets `loading="eager"` and `fetchpriority="high"` and is used for the hero/page-head image. All `<img>` elements in `App.tsx` use it. The OG image and logo keep using the originals.
- Fonts: replace the Google Fonts `@import` with `@fontsource` packages (DM Sans, DM Mono, Playfair Display), importing only the weights in use, including latin-ext for Hungarian.
- Vite `build.assetsDir: '_app'`. `public/_headers` sets `Cache-Control: public, max-age=31536000, immutable` for `/_app/*` and `/assets/img/_opt/*`. HTML and original images keep the Cloudflare default (revalidate).
- Image sourcing: more suitable images may be taken only from sources with an explicit licence that allows commercial use (Wikimedia Commons, Unsplash, Pexels, manufacturer media libraries). Record each image's source and licence in `public/assets/img/CREDITS.md`, and show a visible credit where the licence requires one. Flag "partner use" manufacturer images for owner confirmation instead of assuming permission.

Acceptance: Lighthouse (mobile) on Home and `/metso/` before and after, reporting the Performance, SEO and Accessibility scores plus LCP and CLS. `curl -I` shows the new cache headers after deploy.

## 3. References page and contact UX

- `content.ts`: `unpublishedRoutes: Route[] = ['references']`. These routes are excluded from the header nav, the footer and the static link lists, and from the sitemap. `headTags()` adds `<meta name="robots" content="noindex, follow">` for them. The page itself stays reachable.
- Mobile sticky bar (below 850px) with **Hívás/Call** (`tel:`) and **Ajánlatkérés/Request a quote** (link to the form). The body gets bottom padding, and the cookie banner sits above the bar.
- `ContactForm` also renders on the 4 brand hub pages and the 8 service/parts pages, replacing the CTA section there. It gets a hidden `page` field that is included in the Web3Forms payload and subject.
- Analytics: `track(event, props)` in `analytics.ts` is a no-op unless analytics was started (consent granted). The events are `call_click`, `email_click` and `form_submit`, each with `{ route, locale }`.

Acceptance: at phone width the bar, the cookie banner and the footer don't overlap; References is absent from the nav and the sitemap and has `noindex`; the form payload includes `page`. A real test submission is sent only after the user agrees.

## 4. Cleanup and handoff

- Delete `.github/workflows/deploy.yml` and `public/CNAME`. Rewrite the deployment sections of `README.md` for Cloudflare Pages (env vars set in the Cloudflare dashboard), fix the sitemap note, and update `CLAUDE.md`.
- `TODO-apa.md` (gitignored) lists what to collect from the owner: work photos with shooting guidance, 3–5 reference projects in a template, the machine models and faults he typically handles, image permissions from manufacturers, and the Google Business Profile photos and reviews.

## Out of scope

New service-topic landing pages, a visual redesign, and a test framework.

## Order

1. Prefix removal and prerendering
2. Fonts, image pipeline, caching
3. Image sourcing
4. References, contact bar, forms, tracking
5. Cleanup, docs, TODO-apa.md
6. Lighthouse before/after (the baseline is captured before step 1)
