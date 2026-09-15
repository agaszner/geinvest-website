# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prerender every page to full HTML, speed up images/fonts/caching, hide the placeholder References page, and make contacting Geinvest easier, all without new owner content.

**Architecture:** `App` becomes a pure function of `{ route, locale }` props, so it can be rendered by `renderToString` in a Vite SSR build. A post-build Node script injects that HTML into every `dist/**/index.html`, and the client hydrates it. A `sharp` pre-step generates WebP variants plus a manifest that an `<Img>` component consumes. `scripts/check-dist.js` is the automated acceptance check, extended by each task (there is no test framework, and adding one is out of scope).

**Tech Stack:** React 18.3, TypeScript 5.7, Vite 6, Node 22, sharp, @fontsource, Cloudflare Pages, Web3Forms, PostHog.

**Spec:** `docs/superpowers/specs/2026-09-15-foundation-design.md`

## Global Constraints

- Hosting is Cloudflare Pages, which runs `npm run build` and serves `dist`. Everything the build needs must run inside `npm run build`.
- Node 22 (`.node-version`).
- The `/geinvest-website` prefix support is removed. Links are root-absolute (`/metso/`), assets are `/assets/...`.
- All user-visible text is bilingual via `tx(locale, hu, en)` or `Pair`.
- Match the existing dense one-line component style in `src/App.tsx`.
- `npm run lint` must pass with zero warnings.
- `CLAUDE.md` and `TODO-apa.md` are gitignored.
- Never push. Commit only on the `seo-foundation` branch and only if the user approved commits.
- Never send a real Web3Forms submission without asking the user.

---

### Task 0: Branch and Lighthouse baseline

**Files:** none in the repo. Reports go to the scratchpad (`$S` = session scratchpad dir).

- [ ] **Step 1:** `git checkout -b seo-foundation`
- [ ] **Step 2:** `npm run build && npx vite preview --port 4173 --strictPort` (background)
- [ ] **Step 3:** For `/` and `/metso/`, run:
  `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx -y lighthouse http://localhost:4173<path> --form-factor=mobile --screenEmulation.mobile --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=$S/lh-before-<name>.json --chrome-flags="--headless=new" --quiet`
- [ ] **Step 4:** Extract the scores plus LCP, CLS and TBT:
  `node -e "const r=require(process.argv[1]);console.log(Object.fromEntries(Object.entries(r.categories).map(([k,v])=>[k,Math.round(v.score*100)])),r.audits['largest-contentful-paint'].displayValue,r.audits['cumulative-layout-shift'].displayValue,r.audits['total-blocking-time'].displayValue)" $S/lh-before-home.json`
  Record the output. Stop the preview server.

---

### Task 1: Prerender pages, remove prefix

**Files:**
- Create: `src/location.ts`, `src/entry-server.tsx`, `scripts/prerender.js`, `scripts/check-dist.js`, `.node-version`
- Modify: `src/App.tsx` (lines 7, 20-40, 86), `src/main.tsx`, `src/content.ts` (remove `staticBody` and `navRoutes`, lines 256 and 312-338), `vite.config.ts`, `package.json`, `.gitignore`

**Interfaces:**
- Produces:
  - `currentLocation(pathname?: string): { route: Route; locale: Locale }`
  - `legacyHashTarget(hash?: string): string | null`
  - `App` props `{ route: Route; locale: Locale }`
  - `render(route: Route, locale: Locale): string`
  - `npm run check`

- [ ] **Step 1: Write the failing check** in `scripts/check-dist.js`:

```js
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const failures = []
const fail = (message) => failures.push(message)
const dist = 'dist'
const pages = (await readdir(dist, { recursive: true })).filter((file) => file.endsWith('index.html'))
const sources = (await readdir('.', { recursive: true })).filter((file) => file.endsWith('index.html') && !/^(node_modules|dist)/.test(file))
if (pages.length !== sources.length) fail(`expected ${sources.length} pages in dist, found ${pages.length}`)
const html = Object.fromEntries(await Promise.all(pages.map(async (file) => [file.split(path.sep).join('/'), await readFile(path.join(dist, file), 'utf8')])))

for (const [file, content] of Object.entries(html)) {
  if (!/<div id="root"><(header|div)/.test(content)) fail(`${file}: #root is not prerendered`)
  if (!/<h1[\s>]/.test(content)) fail(`${file}: no <h1>`)
  if (content.includes('geinvest-website')) fail(`${file}: still references the /geinvest-website prefix`)
}

if (failures.length) { console.error(`check-dist: ${failures.length} failure(s)\n- ${failures.join('\n- ')}`); process.exit(1) }
console.log(`check-dist: ${pages.length} pages OK`)
```

Add `"check": "node scripts/check-dist.js"` to `package.json` scripts.

- [ ] **Step 2: Run it to confirm it fails.** Run `npm run build && npm run check`. Expected: FAIL with `#root is not prerendered` for all 34 pages, because the current static body starts with `<div class="page-head">` after whitespace.

- [ ] **Step 3: Create `src/location.ts`**

```ts
import { paths, type Locale, type Route } from './content'

const trim = (value: string) => value.replace(/index\.html$/, '').replace(/^\/+|\/+$/g, '')

/** Maps a URL path to its route; unknown paths fall back to home in the detected language. */
export function currentLocation(pathname = window.location.pathname): { route: Route; locale: Locale } {
  const current = trim(pathname)
  const locale: Locale = current === 'en' || current.startsWith('en/') ? 'en' : 'hu'
  const route = (Object.entries(paths[locale]) as [Route, string][]).find(([, value]) => trim(value) === current)?.[0] ?? 'home'
  return { route, locale }
}

/** Old single-page links used `#/metso`; returns the real URL they should now redirect to. */
export function legacyHashTarget(hash = window.location.hash): string | null {
  const legacy = hash.replace(/^#\//, '')
  return hash.startsWith('#/') && legacy in paths.hu ? paths.hu[legacy as Route] : null
}
```

- [ ] **Step 4: Update `src/App.tsx`**
  - Delete `const prefix` (line 7) and `getPrefix`, `localeFromLocation`, `routeFromLocation`, `currentLocation`, `setMeta`, `setLink`, `updateSeo` and `updateStructuredData` (lines 20-30). The build-time head tags already cover what they did, and every page is now a separate HTML file.
  - Replace them with:

```tsx
function href(route: Route, locale: Locale) { return paths[locale][route] }
function asset(path: string) { return `/${path}` }
```

  - Remove the now-unused imports `origin`, `structuredData`, `structuredDataId` and `meta` from the `./content` import. Keep `meta` if a later task uses it; lint will flag it if it is unused.
  - Replace the `App` body (lines 32-41) with:

```tsx
export default function App({ route, locale }: { route: Route; locale: Locale }) {
  const [menuOpen, setMenuOpen] = useState(false)
  // undefined until mounted: the prerendered HTML cannot know the stored choice, so the banner only appears client-side.
  const [consent, setConsent] = useState<string | null | undefined>(undefined)
  const [showPrivacy, setShowPrivacy] = useState(false)
  useEffect(() => { const saved = getAnalyticsConsent(); setConsent(saved); if (saved === 'granted') startAnalytics() }, [])
  return <><Header locale={locale} route={route} open={menuOpen} setOpen={setMenuOpen} /><main>{route === 'home' && <Home locale={locale} />}{route === 'brands' && <Brands locale={locale} />}{route === 'service' && <Service locale={locale} />}{route === 'references' && <References locale={locale} />}{route === 'contact' && <Contact locale={locale} />}{route === 'metso' && <Metso locale={locale} />}{route === 'mj' && <MJ locale={locale} />}{route === 'mfl' && <MFL locale={locale} />}{route === 'outotec' && <Outotec locale={locale} />}<BrandIntentPage locale={locale} route={route} />{brandHubRoutes.includes(route) && <FAQ locale={locale} route={route} />}<BrandPageExpansion locale={locale} route={route} /></main><Footer locale={locale} route={route} privacy={() => setShowPrivacy(true)} />{showPrivacy && <Privacy locale={locale} close={() => setShowPrivacy(false)} />}{consent === null && <Cookie locale={locale} choose={(value) => { setAnalyticsConsent(value); setConsent(value) }} />}</>
}
```

  - In `Footer` (line 86), change `© {new Date().getFullYear()} Geinvest Kft.` to `<span suppressHydrationWarning>© {new Date().getFullYear()}</span> Geinvest Kft.` The year is frozen at build time, and this avoids a mismatch after New Year.

- [ ] **Step 5: Replace `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App'
import { currentLocation, legacyHashTarget } from './location'
import './styles.css'

const redirectLegacyHash = () => { const target = legacyHashTarget(); if (target) window.location.replace(target); return Boolean(target) }
window.addEventListener('hashchange', redirectLegacyHash)

if (!redirectLegacyHash()) {
  const root = document.getElementById('root')!
  const app = <StrictMode><App {...currentLocation()} /></StrictMode>
  // Production HTML is prerendered, so hydrate it; the dev server serves an empty #root.
  if (root.hasChildNodes()) hydrateRoot(root, app)
  else createRoot(root).render(app)
}
```

- [ ] **Step 6: Create `src/entry-server.tsx`**

```tsx
import { renderToString } from 'react-dom/server'
import App from './App'
import type { Locale, Route } from './content'

export { paths } from './content'

export function render(route: Route, locale: Locale) { return renderToString(<App route={route} locale={locale} />) }
```

- [ ] **Step 7: Create `scripts/prerender.js`**

```js
import { readFile, rm, writeFile } from 'node:fs/promises'
import { paths, render } from '../dist-ssr/entry-server.js'

/** Fills each built page's empty #root with the server-rendered App so crawlers and first paint get the real content. */
const marker = '<div id="root"></div>'
let count = 0
for (const [locale, routes] of Object.entries(paths)) {
  for (const [route, urlPath] of Object.entries(routes)) {
    const file = new URL(`../dist${urlPath}index.html`, import.meta.url)
    const html = await readFile(file, 'utf8')
    if (!html.includes(marker)) throw new Error(`[prerender] ${marker} not found in dist${urlPath}index.html`)
    await writeFile(file, html.replace(marker, () => `<div id="root">${render(route, locale)}</div>`))
    count++
  }
}
await rm(new URL('../dist-ssr', import.meta.url), { recursive: true, force: true })
console.log(`[prerender] ${count} pages`)
```

- [ ] **Step 8: Update `vite.config.ts`**
  - Import: `import { headTags, origin, paths, type Locale, type Route } from './src/content'`
  - Change `configResolved` to `configResolved(config) { isBuild = config.command === 'build' && !config.build.ssr }`
  - Change the `transformIndexHtml` return (the line 43 `injectAt` for `#root`) to `return result`, and delete the root injection.
  - At the start of `generateBundle`, add `if (!isBuild) return`, so the SSR build emits no sitemap.
  - Update the plugin doc comment: "Injects per-page SEO head tags and JSON-LD into each HTML entry, and emits the sitemap."
  - Replace `base: './'` and its comment with `base: '/',`

- [ ] **Step 9: Update `src/content.ts`**
  - Delete the `staticBody` function and its doc comment, and delete `const navRoutes`.
  - If lint then reports that `intentsOf` or other helpers are unused, check with `grep -n intentsOf src/*.tsx src/*.ts` and remove only those that are truly unused.

- [ ] **Step 10: Update config files**
  - `package.json` scripts: `"build": "tsc -b && vite build && vite build --ssr src/entry-server.tsx --outDir dist-ssr && node scripts/prerender.js"`
  - `.gitignore`: add `dist-ssr`
  - `.node-version`: `22`

- [ ] **Step 11: Verify**
  - Run `npm run lint && npm run build && npm run check`. Expected: `check-dist: 34 pages OK`.
  - Run `grep -c '<h1' dist/metso/alkatresz/index.html` and expect ≥1.

- [ ] **Step 12: Verify hydration in a real browser**
  - `npx vite preview --port 4173` (background)
  - `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --enable-logging=stderr --v=0 --virtual-time-budget=5000 --dump-dom http://localhost:4173/en/metso/ 2>$S/console.txt | grep -c '<h1'`
  - `grep -i -E "hydrat|did not match|error" $S/console.txt`: expected no hydration errors.
  - Repeat for `/`, `/kapcsolat/`, and `/#/metso` (the last must end at `/metso/`: check with `--dump-dom` for the Metso `<h1>`).
  - Stop the preview server.

- [ ] **Step 13: Commit** (if approved): `git add -A && git commit -m "Prerender pages at build time and drop GitHub Pages prefix"`

---

### Task 2: Self-hosted fonts and cache headers

**Files:**
- Create: `public/_headers`
- Modify: `src/styles.css:1`, `src/main.tsx`, `vite.config.ts` (the `build` block), `package.json`, `scripts/check-dist.js`

- [ ] **Step 1: Extend the check.** Add before the failure report in `scripts/check-dist.js`:

```js
const assets = await readdir(path.join(dist, '_app')).catch(() => [])
if (!assets.some((file) => file.endsWith('.js'))) fail('no bundled JS in dist/_app')
const css = (await Promise.all(assets.filter((file) => file.endsWith('.css')).map((file) => readFile(path.join(dist, '_app', file), 'utf8')))).join('')
if (css.includes('fonts.googleapis.com')) fail('CSS still loads Google Fonts')
if (!assets.some((file) => file.endsWith('.woff2'))) fail('no self-hosted woff2 fonts in dist/_app')
const headers = await readFile(path.join(dist, '_headers'), 'utf8').catch(() => '')
for (const rule of ['/_app/*', '/assets/img/_opt/*']) if (!headers.includes(rule)) fail(`_headers has no rule for ${rule}`)
```

- [ ] **Step 2: Run it to confirm it fails.** Run `npm run build && npm run check`. Expected: FAIL with 4 new failures.

- [ ] **Step 3: Install the fonts.** Run `npm install @fontsource-variable/dm-sans @fontsource/dm-mono @fontsource/playfair-display`. Then run `ls node_modules/@fontsource-variable/dm-sans/*.css` and pick the file that covers both the `opsz` and `wght` axes (`full.css` if present, otherwise `opsz.css`). Open it and note the `font-family` name it declares (expected: `DM Sans Variable`).

- [ ] **Step 4: Wire up the fonts.**
  - In `src/styles.css`, delete the `@import url('https://fonts.googleapis.com/...')` line.
  - Replace every `'DM Sans'` with the variable family name from Step 3, keeping `'DM Sans'` next as a fallback, e.g. `'DM Sans Variable','DM Sans',Arial,sans-serif`.
  - Add these to the top of `src/main.tsx`, above `./styles.css`:

```tsx
import '@fontsource-variable/dm-sans/full.css' // use the file chosen in Step 3
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/playfair-display/600-italic.css'
import '@fontsource/playfair-display/700-italic.css'
```

  Before importing, confirm with `grep -o "font-weight:[0-9]*" src/styles.css | sort | uniq -c` that DM Mono uses only 400 and 500, and that Playfair uses only 600 and 700. Drop any import for a weight that is not used.

- [ ] **Step 5: Add cache headers.**
  - In `vite.config.ts`, inside `build`, add `assetsDir: '_app',` with the comment `// Hashed bundles live apart from unhashed public images so _headers can cache them forever.`
  - Create `public/_headers`:

```
/_app/*
  Cache-Control: public, max-age=31536000, immutable

/assets/img/_opt/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 6: Verify.** Run `npm run lint && npm run build && npm run check`: all pass. Take a headless screenshot of `/` at 1440x900 (`--screenshot=$S/fonts.png --window-size=1440,900`), open it, and compare heading typography with the pre-change look (serif italic in the hero, DM Sans elsewhere).

- [ ] **Step 7: Commit** (if approved): `git commit -am "Self-host fonts and add long-lived cache headers"` (also `git add public/_headers`).

---

### Task 3: Image pipeline and `<Img>`

**Files:**
- Create: `scripts/images.js`, `src/Img.tsx`
- Modify: `src/App.tsx` (every `<img>`: lines 46, 47, 50, 81, 82, 83, 84), `src/styles.css`, `package.json`, `.gitignore`, `scripts/check-dist.js`

**Interfaces:**
- Produces:
  - `src/generated/images.json`: `Record<string, { width: number; height: number; variants: { width: number; src: string }[] }>`, keyed by `assets/img/...`
  - `<Img src alt className? priority? sizes? />`, where `src` is a manifest key without a leading slash

- [ ] **Step 1: Extend the check.**

```js
for (const [file, content] of Object.entries(html)) {
  for (const tag of content.match(/<img [^>]*>/g) ?? []) if (!/ width="\d+"/.test(tag) || !/ height="\d+"/.test(tag)) fail(`${file}: <img> without width/height: ${tag.slice(0, 80)}`)
  if (!content.includes('type="image/webp"')) fail(`${file}: no WebP <picture> source`)
}
```

  Pages without any image (e.g. intent pages) would fail the WebP rule. So after the first run, restrict the WebP rule to pages that contain `<img`: `if (content.includes('<img') && !content.includes('type="image/webp"'))`.

- [ ] **Step 2: Run it to confirm it fails.** Run `npm run build && npm run check`. Expected: FAIL with `<img> without width/height`.

- [ ] **Step 3: Create the image script.** Run `npm install -D sharp`, then create `scripts/images.js`:

```js
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'

/** Generates hashed, resized WebP variants of every public image plus a size manifest for <Img>. Runs before dev and build. */
const root = 'public/assets/img'
const outDir = path.join(root, '_opt')
const manifestFile = 'src/generated/images.json'
const widths = [640, 1280, 1920]

const files = (await readdir(root, { recursive: true })).filter((file) => /\.(jpe?g|png)$/i.test(file) && !file.startsWith('_opt')).sort()
await mkdir(outDir, { recursive: true })
await mkdir(path.dirname(manifestFile), { recursive: true })
const manifest = {}
const keep = new Set()
for (const file of files) {
  const source = await readFile(path.join(root, file))
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 10)
  const meta = await sharp(source).metadata()
  // Phone photos store rotation in EXIF; orientations 5-8 swap the visible width and height.
  const [width, height] = (meta.orientation ?? 1) >= 5 ? [meta.height, meta.width] : [meta.width, meta.height]
  const base = file.replace(/\.[^.]+$/, '').split(path.sep).join('-')
  const variants = []
  for (const target of [...new Set(widths.map((value) => Math.min(value, width)))]) {
    const name = `${base}-${target}-${hash}.webp`
    keep.add(name)
    const out = path.join(outDir, name)
    if (!(await stat(out).catch(() => null))) await sharp(source).rotate().resize({ width: target }).webp({ quality: 78 }).toFile(out)
    variants.push({ width: target, src: `/assets/img/_opt/${name}` })
  }
  manifest[`assets/img/${file.split(path.sep).join('/')}`] = { width, height, variants }
}
for (const name of await readdir(outDir)) if (!keep.has(name)) await rm(path.join(outDir, name))
await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`[images] ${files.length} images, ${keep.size} variants`)
```

- [ ] **Step 4: Wire up the scripts.**
  - `package.json` scripts: `"images": "node scripts/images.js"`, `"predev": "npm run images"`, `"prebuild": "npm run images"`
  - `.gitignore`: add `public/assets/img/_opt` and `src/generated`
  - Run `npm run images`. Expected: `[images] 8 images, N variants`.

- [ ] **Step 5: Create `src/Img.tsx`**

```tsx
import images from './generated/images.json'

type Manifest = Record<string, { width: number; height: number; variants: { width: number; src: string }[] }>
const manifest: Manifest = images

/** Responsive WebP <picture> with intrinsic size; `priority` is for the above-the-fold image that drives LCP. */
export function Img({ src, alt, className, priority = false, sizes = '100vw' }: { src: string; alt: string; className?: string; priority?: boolean; sizes?: string }) {
  const image = manifest[src]
  if (!image) throw new Error(`[Img] ${src} is not in src/generated/images.json; run npm run images`)
  // React 18 has no typed fetchPriority prop, so pass the lowercase DOM attribute through.
  const fetchPriority = priority ? { fetchpriority: 'high' } : {}
  return <picture><source type="image/webp" srcSet={image.variants.map((variant) => `${variant.src} ${variant.width}w`).join(', ')} sizes={sizes} /><img className={className} src={`/${src}`} alt={alt} width={image.width} height={image.height} loading={priority ? 'eager' : 'lazy'} decoding={priority ? 'auto' : 'async'} {...fetchPriority} /></picture>
}
```

- [ ] **Step 6: Replace every `<img>` in `src/App.tsx`**
  - Import `{ Img } from './Img'`. Remove `asset()` once nothing uses it.
  - Replace each tag as follows (keep the existing `alt` expressions):
    - Home hero: `<Img className="hero-bg" src="assets/img/home/metso-quarry.jpg" alt={…} priority />`
    - Home M&J feature: `<Img src="assets/img/mj/mj-p4000e.png" alt={…} sizes="(max-width: 850px) 100vw, 50vw" />`
    - Home and Service ifm feature: `<Img src="assets/img/service/ifm-ecomatmobile.jpg" alt={…} sizes="(max-width: 850px) 100vw, 50vw" />`
    - BrandCard: `<Img src={image} alt="" sizes="(max-width: 850px) 100vw, 25vw" />`
    - Metso page hero: `<Img className="page-hero-img" src="assets/img/metso/metso-mobile.jpg" alt={…} priority />`
    - Metso VSI: `<Img src="assets/img/metso/metso-vsi.jpg" alt={…} sizes="(max-width: 850px) 100vw, 50vw" />`
    - MJ feature: `<Img src="assets/img/mj/mj-p4000e.png" alt="M&J P4000e eDrive pre-shredder" sizes="(max-width: 850px) 100vw, 50vw" />`
    - MJ cards: `<Img className="card-img" src={image} alt="" sizes="(max-width: 850px) 100vw, 50vw" />`
    - MFL feature: `<Img src="assets/img/brands/mfl-rock-crusher.jpg" alt={…} sizes="(max-width: 850px) 100vw, 50vw" />`
    - Outotec feature: `<Img src="assets/img/brands/outotec-ore-sorting.jpg" alt={…} sizes="(max-width: 850px) 100vw, 50vw" />`

- [ ] **Step 7: Update CSS.** In `src/styles.css`, add after the `*{box-sizing:border-box}` rule: `picture{display:contents} img{max-width:100%;height:auto}`. Class-specific heights (`.brand-card img`, `.page-hero-img`, `.hero-bg`) still win on specificity.

- [ ] **Step 8: Verify.**
  - Run `npm run lint && npm run build && npm run check`: all pass.
  - Take headless screenshots of `/`, `/metso/` and `/mj-recycling/` at 1440x900 and at 390x844 into `$S`, and open them. Images must look as they did before (no stretching or collapse).

- [ ] **Step 9: Commit** (if approved): `git add -A && git commit -m "Add responsive WebP image pipeline"`

---

### Task 4: Source more suitable licensed images

**Files:**
- Create: `public/assets/img/CREDITS.md`
- Possibly add images under `public/assets/img/` and swap `src` in `src/App.tsx`

- [ ] **Step 1: Write down the current image inventory** and their sources, from the README section "Materials ported" and the file names: metso ×2, mj ×2, home ×1 (Metso quarry), service ifm ×1, brands/outotec (Metso site), brands/mfl (Wikimedia "Mine rock crusher"). Put them in `CREDITS.md` with source URL and licence status (`permission to confirm` for manufacturer images).

- [ ] **Step 2: Search for better candidates** with WebSearch/WebFetch, **only** on Wikimedia Commons, Unsplash and Pexels (plus manufacturer media libraries, flagged). Targets:
  - (a) industrial shredder/crusher maintenance or repair
  - (b) hardfacing or build-up welding on wear parts
  - (c) PLC/control cabinet wiring
  - (d) a better MFL-era crusher image

  Accept an image only if its licence allows commercial use: CC0, CC BY or CC BY-SA on Commons (record the attribution), or the Unsplash/Pexels licence. Download with `curl -L -o`.

- [ ] **Step 3: Place accepted images.** Put them where they clearly improve a section (e.g. the Service page feature, the Home retrofit feature, the MFL feature). Keep the existing ones otherwise. For CC BY/BY-SA, add the credit to `CREDITS.md` **and** a visible credit via the existing `Sources` or `sourcebox` pattern on that page.

- [ ] **Step 4: Verify.** Run `npm run build && npm run check`, then take screenshots of the changed pages. List every added image and its licence in the task report for the user.

- [ ] **Step 5: Commit** (if approved).

---

### Task 5: Unpublish References

**Files:**
- Modify: `src/content.ts` (new export, `headTags`), `vite.config.ts` (`generateBundle`), `src/App.tsx` (`Header` nav, `Footer` links), `scripts/check-dist.js`

**Interfaces:**
- Produces: `export const unpublishedRoutes: Route[]` in `src/content.ts`

- [ ] **Step 1: Extend the check.**

```js
const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8')
for (const slug of ['/referenciak/', '/en/references/']) {
  if (sitemap.includes(slug)) fail(`sitemap lists unpublished ${slug}`)
  const page = html[`${slug.slice(1)}index.html`]
  if (!page?.includes('<meta name="robots" content="noindex, follow"')) fail(`${slug} lacks noindex`)
}
for (const [file, content] of Object.entries(html)) if (/href="\/(en\/references|referenciak)\/"/.test(content) && !/^(en\/references|referenciak)\//.test(file)) fail(`${file} links to References`)
```

- [ ] **Step 2: Run it to confirm it fails.** Run `npm run build && npm run check`: FAIL.

- [ ] **Step 3: Implement.**
  - `src/content.ts`, after `brandHubRoutes`:

```ts
/** Routes that still hold placeholder content: reachable, but kept out of navigation, the sitemap and Google's index. Remove a route once it has real content. */
export const unpublishedRoutes: Route[] = ['references']
```

  - In `headTags()`, add as the first array element: `...(unpublishedRoutes.includes(route) ? ['<meta name="robots" content="noindex, follow" />'] : []),`
  - In `vite.config.ts` `generateBundle`, change `pages.map` to `pages.filter((page) => !unpublishedRoutes.includes(page.route)).map`, and import `unpublishedRoutes`.
  - In `App.tsx` `Header`, filter the nav: `nav.filter(([item]) => !unpublishedRoutes.includes(item)).map(...)`
  - In `Footer`, delete the `<a href={href('references', locale)}>…</a>` element. Import `unpublishedRoutes`.

- [ ] **Step 4: Verify.** Run `npm run lint && npm run build && npm run check`: all pass.

- [ ] **Step 5: Commit** (if approved): `git commit -am "Hide placeholder References page from nav, sitemap and index"`

---

### Task 6: Enquiry form on brand pages, with page tracking

**Files:**
- Modify: `src/App.tsx` (`Contact`, `ContactForm`, `BrandServiceGuide`, `BrandIntentPage`), `src/analytics.ts`, `scripts/check-dist.js`

**Interfaces:**
- Produces:
  - `track(event: 'call_click' | 'email_click' | 'form_submit', properties: Record<string, string>): void`
  - `EnquirySection({ locale, route })` with anchor id `ajanlatkeres`
  - `ContactForm` props `{ locale, route }`

- [ ] **Step 1: Extend the check.**

```js
for (const slug of ['kapcsolat/', 'metso/', 'metso/alkatresz/', 'en/mj-recycling/service/', 'outotec/szerviz/']) if (!html[`${slug}index.html`]?.includes('id="ajanlatkeres"')) fail(`${slug} has no enquiry form section`)
```

- [ ] **Step 2: Run it to confirm it fails.** Run `npm run build && npm run check`: FAIL.

- [ ] **Step 3: Add `track` to `src/analytics.ts`**

```ts
/** No-op unless the visitor granted analytics consent, so nothing is sent without it. */
export function track(event: 'call_click' | 'email_click' | 'form_submit', properties: Record<string, string>) {
  if (started) posthog.capture(event, properties)
}
```

- [ ] **Step 4: Add `EnquirySection` to `src/App.tsx`** and use it in `Contact`, replacing the final `<section className="section section-dark">…<ContactForm locale={locale} /></div></section>`:

```tsx
function EnquirySection({ locale, route }: { locale: Locale; route: Route }) { const t = (hu: string, en: string) => tx(locale, hu, en); return <section className="section section-dark" id="ajanlatkeres"><div className="container form-layout"><div><div className="kicker">{t('Írjon nekünk', 'Send us a message')}</div><h2>{t('Javítás, alkatrész vagy új berendezés?', 'Repairs, parts or new equipment?')}</h2><p>{t('Beszéljük át a feladatot és a rendelkezésre álló lehetőségeket.', 'Let us discuss the task and the options available.')}</p></div><ContactForm locale={locale} route={route} /></div></section> }
```

  In `Contact`, render `<EnquirySection locale={locale} route="contact" />`.

- [ ] **Step 5: Place the form on brand pages.**
  - `BrandServiceGuide`: delete `<CTA locale={locale} />` inside its container. In `BrandPageExpansion`, return `item ? <><BrandServiceGuide … /><EnquirySection locale={locale} route={route} /></> : null`.
  - `BrandIntentPage`: replace the trailing `<CTA locale={locale} />` with `<EnquirySection locale={locale} route={route} />`.
  - `Home` keeps `CTA`.

- [ ] **Step 6: Update `ContactForm`.**
  - Signature: `function ContactForm({ locale, route }: { locale: Locale; route: Route })`
  - Before `setStatus('sending')`, add `const page = meta[locale][route][0].split(' | ')[0]`
  - In the JSON body:
    - add `page, page_url: \`${origin}${paths[locale][route]}\`,`
    - change `subject` to `` `Geinvest — ${t('új megkeresés', 'new enquiry')}: ${data.name} (${page})` ``
  - After `setStatus('sent')`, add `track('form_submit', { route, locale })`
  - Re-add `meta` and `origin` to the content import if they were removed in Task 1.

- [ ] **Step 7: Track call and email clicks.** Add to `App`:

```tsx
useEffect(() => { const onClick = (event: MouseEvent) => { const link = (event.target as Element | null)?.closest('a[href^="tel:"], a[href^="mailto:"]'); if (link) track(link.getAttribute('href')!.startsWith('tel:') ? 'call_click' : 'email_click', { route, locale }) }; document.addEventListener('click', onClick); return () => document.removeEventListener('click', onClick) }, [route, locale])
```

- [ ] **Step 8: Verify.**
  - Run `npm run lint && npm run build && npm run check`: all pass.
  - Take a screenshot of `/metso/` and `/metso/alkatresz/` at 1440x900 and check that the form section fits the layout. Two adjacent dark sections on hub pages are acceptable if they are visually separated. If not, add `.section-dark + .section-dark{border-top:1px solid rgba(255,255,255,.08)}`.
  - Without sending, confirm the payload in the dev server: temporarily `console.log` the body with an empty key. Remove the log afterwards. Then **ask the user** before a real submission.

- [ ] **Step 9: Commit** (if approved): `git commit -am "Add enquiry form to brand pages with page attribution and consented tracking"`

---

### Task 7: Mobile sticky contact bar

**Files:**
- Modify: `src/App.tsx` (new `ContactBar`, rendered in `App`), `src/styles.css`, `scripts/check-dist.js`

- [ ] **Step 1: Extend the check.**

```js
for (const [file, content] of Object.entries(html)) if (!content.includes('class="contact-bar"')) fail(`${file}: no mobile contact bar`)
```

- [ ] **Step 2: Run it to confirm it fails.** Run `npm run build && npm run check`: FAIL.

- [ ] **Step 3: Implement.** Import `brandOf` from `./content`, add the component, and render `<ContactBar locale={locale} route={route} />` right after `<Footer … />` in `App`:

```tsx
function ContactBar({ locale, route }: { locale: Locale; route: Route }) { const t = (hu: string, en: string) => tx(locale, hu, en); const hasForm = route === 'contact' || Boolean(brandOf[route]); return <nav className="contact-bar" aria-label={t('Gyors kapcsolat', 'Quick contact')}><a className="btn btn-primary" href={phoneHref}><Phone size={16} /> {t('Hívás', 'Call')}</a><a className="btn btn-light" href={hasForm ? '#ajanlatkeres' : `${href('contact', locale)}#ajanlatkeres`}><Send size={16} /> {t('Ajánlatkérés', 'Request a quote')}</a></nav> }
```

  CSS (append; the `.contact-bar{display:none}` rule goes outside the media query, the rest inside the existing `@media(max-width:850px)` block or a new one):

```css
.contact-bar{display:none}
@media(max-width:850px){.contact-bar{display:grid;grid-template-columns:1fr 1fr;gap:8px;position:fixed;left:0;right:0;bottom:0;z-index:9;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:var(--ink);box-shadow:0 -8px 24px rgba(0,0,0,.18)}.contact-bar .btn{justify-content:center;margin:0}body{padding-bottom:calc(64px + env(safe-area-inset-bottom))}.cookie-banner{bottom:76px}}
```

- [ ] **Step 4: Verify.**
  - Run `npm run lint && npm run build && npm run check`: all pass.
  - Take headless 390x844 screenshots of `/` (cookie banner visible on first load) and `/metso/`, plus a full-page capture of the footer area (`--window-size=390,6000`). The bar must not cover the cookie banner buttons or the footer text.
  - At 1440x900, the bar must be absent.

- [ ] **Step 5: Commit** (if approved): `git commit -am "Add sticky mobile call and quote bar"`

---

### Task 8: Cleanup, docs, TODO-apa.md

**Files:**
- Delete: `.github/workflows/deploy.yml`, `public/CNAME`
- Modify: `README.md`, `CLAUDE.md`
- Create: `TODO-apa.md`

- [ ] **Step 1: Delete the GitHub Pages files.** Run `git rm .github/workflows/deploy.yml public/CNAME`.

- [ ] **Step 2: Update `README.md`.**
  - Stack line: "Cloudflare Pages: builds from GitHub on every push".
  - Replace "## 2. Configure PostHog" step 2-3 and "## 3. Publish with GitHub Pages" and "### If the page is blank" with a "## 3. Cloudflare Pages" section:
    - build command `npm run build`
    - output directory `dist`
    - Node version from `.node-version`
    - the env vars `VITE_WEB3FORMS_KEY`, `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST=https://eu.i.posthog.com` set in the Cloudflare Pages project → Settings → Variables and Secrets (as plain variables, not secrets)
    - `public/_headers` controls caching
  - Fix the SEO bullet: the sitemap is generated at build time into `dist/sitemap.xml`.
  - Mention the prerendering, the image pipeline (drop JPG/PNG into `public/assets/img/`, and variants are generated automatically) and `unpublishedRoutes`.
  - Commands: add `npm run check` and `npm run images`.
  - Remove the "Restrict who can edit GitHub Actions variables" checklist item.

- [ ] **Step 3: Update `CLAUDE.md`.**
  - Architecture: prerender pipeline (client build → SSR build → `scripts/prerender.js`), hydration, `App` props, `location.ts`.
  - Remove the prefix paragraph and `staticBody`.
  - Add `Img` and the manifest, `unpublishedRoutes`, `EnquirySection`, `track`.
  - Commands: `npm run check` (post-build acceptance check), `npm run images`.
  - Deployment: Cloudflare Pages.

- [ ] **Step 4: Create `TODO-apa.md`** in Hungarian, with checkboxes:
  - **Fotók:** 15–30 photos of his own work: machines before and after repair, hardfacing welding, the workshop, the team on site. Guidance: daylight, landscape orientation, at least 2000 px, no customer logos without permission, send the originals (not via WhatsApp, which compresses them).
  - **Referenciák:** 3–5 projects using this template: gép típusa, ügyfél iparága (név csak engedéllyel), probléma, elvégzett munka, eredmény (pl. állásidő, élettartam), év, 2–4 fotó.
  - **Géptípusok és hibák:** the machine models he services most often (e.g. M&J P250, Metso C-sorozat), the 5–10 most common faults and their fixes, and parts that can be sourced or manufactured. This is input for the future service landing pages.
  - **Engedélyek:** written confirmation from the Metso, M&J and Outotec contacts that their product images may be used, and the exact scope of the M&J/Outotec representation (listed in the README pre-launch checklist).
  - **Google Cégprofil:** 10+ photos, opening hours, service areas, the services list, and a routine of asking satisfied customers for a review.
  - **Hivatkozások:** ask M&J/Outotec to list Geinvest as a Hungarian partner on their sites, and add the company to Hungarian industry directories.

- [ ] **Step 5: Verify.** Run `npm run lint && npm run build && npm run check`: all pass. Also run `git status` and confirm that `CLAUDE.md` and `TODO-apa.md` are untracked and ignored.

- [ ] **Step 6: Commit** (if approved): `git add -A && git commit -m "Move docs to Cloudflare Pages and remove GitHub Pages deployment"`

---

### Task 9: Lighthouse after, report

- [ ] **Step 1:** Run `npm run build && npx vite preview --port 4173 --strictPort` (background). Run the Task 0 Lighthouse commands with output `lh-after-<name>.json`.
- [ ] **Step 2:** Print the before and after side by side (the scores plus LCP, CLS and TBT) for `/` and `/metso/`. Stop the preview server.
- [ ] **Step 3:** Report to the user:
  - the score table
  - the images added (with licences)
  - anything flagged for the owner
  - the manual steps after merging: confirm the Cloudflare env vars and Node version, push to trigger a deploy, run `curl -I https://geinvestkft.com/_app/<file>` to check the cache header, and resubmit the sitemap in Search Console
