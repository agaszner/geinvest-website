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
