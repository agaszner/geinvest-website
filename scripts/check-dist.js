import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

/** Post-build acceptance check: run after `npm run build`. Exits non-zero with a list of failures. */
const failures = []
const fail = (message) => failures.push(message)
const dist = 'dist'
const pages = (await readdir(dist, { recursive: true })).filter((file) => file.endsWith('index.html'))
const sources = (await readdir('.', { recursive: true })).filter((file) => file.endsWith('index.html') && !/^(node_modules|dist|\.git)/.test(file))
if (pages.length !== sources.length) fail(`expected ${sources.length} pages in dist, found ${pages.length}`)
const html = Object.fromEntries(await Promise.all(pages.map(async (file) => [file.split(path.sep).join('/'), await readFile(path.join(dist, file), 'utf8')])))

for (const [file, content] of Object.entries(html)) {
  if (!/<div id="root"><(header|div)/.test(content)) fail(`${file}: #root is not prerendered`)
  if (!/<h1[\s>]/.test(content)) fail(`${file}: no <h1>`)
  if (content.includes('geinvest-website')) fail(`${file}: still references the /geinvest-website prefix`)
  // Intrinsic sizes prevent layout shift; WebP sources come from scripts/images.js via <Img>.
  for (const tag of content.match(/<img [^>]*>/g) ?? []) if (!/ width="\d+"/.test(tag) || !/ height="\d+"/.test(tag)) fail(`${file}: <img> without width/height: ${tag.slice(0, 80)}`)
  if (content.includes('<img') && !content.includes('type="image/webp"')) fail(`${file}: no WebP <picture> source`)
  if (!content.includes('class="contact-bar"')) fail(`${file}: no mobile contact bar`)
}

// Placeholder pages (unpublishedRoutes in src/content.ts) stay reachable but out of navigation, the sitemap and the index.
const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8')
for (const slug of ['/referenciak/', '/en/references/']) {
  if (sitemap.includes(slug)) fail(`sitemap lists unpublished ${slug}`)
  if (!html[`${slug.slice(1)}index.html`]?.includes('<meta name="robots" content="noindex, follow"')) fail(`${slug} lacks noindex`)
}
for (const [file, content] of Object.entries(html)) if (/href="\/(en\/references|referenciak)\/"/.test(content) && !/^(en\/references|referenciak)\//.test(file)) fail(`${file} links to References`)

for (const slug of ['kapcsolat/', 'metso/', 'metso/alkatresz/', 'en/mj-recycling/service/', 'outotec/szerviz/']) if (!html[`${slug}index.html`]?.includes('id="ajanlatkeres"')) fail(`${slug} has no enquiry form section`)

const assets = await readdir(path.join(dist, '_app')).catch(() => [])
if (!assets.some((file) => file.endsWith('.js'))) fail('no bundled JS in dist/_app')
const css = (await Promise.all(assets.filter((file) => file.endsWith('.css')).map((file) => readFile(path.join(dist, '_app', file), 'utf8')))).join('')
if (css.includes('fonts.googleapis.com')) fail('CSS still loads Google Fonts')
if (!assets.some((file) => file.endsWith('.woff2'))) fail('no self-hosted woff2 fonts in dist/_app')
const headers = await readFile(path.join(dist, '_headers'), 'utf8').catch(() => '')
for (const rule of ['/_app/*', '/assets/img/_opt/*']) if (!headers.includes(rule)) fail(`_headers has no rule for ${rule}`)
// posthog-js is ~75 KB gzipped; it must stay out of the entry chunk and load only after consent.
const entry = Object.values(html)[0].match(/<script type="module" crossorigin src="\/_app\/([^"]+)"/)?.[1]
if (!entry) fail('could not find the entry script in the built HTML')
const entryJs = entry ? await readFile(path.join(dist, '_app', entry), 'utf8') : ''
if (entryJs.includes('$pageview')) fail('posthog-js is bundled into the entry chunk')

if (failures.length) { console.error(`check-dist: ${failures.length} failure(s)\n- ${failures.join('\n- ')}`); process.exit(1) }
console.log(`check-dist: ${pages.length} pages OK`)
