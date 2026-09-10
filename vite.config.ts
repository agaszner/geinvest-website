import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { headTags, origin, paths, staticBody, type Locale, type Route } from './src/content'

const locales: Locale[] = ['hu', 'en']

/** Every route is a real pre-built HTML file, so derive the page list from the single source of truth. */
const pages = locales.flatMap((locale) => (Object.entries(paths[locale]) as [Route, string][]).map(([route, urlPath]) => {
  const file = `${urlPath.replace(/^\//, '')}index.html`
  return { route, locale, file, name: `${locale}-${route}`, depth: file.split('/').length - 1 }
}))
// Longest path first so `/metso/index.html` never matches the shorter `index.html` entry.
const pagesByDepth = [...pages].sort((a, b) => b.file.length - a.file.length)

/**
 * Injects per-page SEO head tags, JSON-LD and crawlable static content into each HTML entry, and
 * emits the sitemap. Driven by src/content.ts so the markup cannot drift from the rendered page.
 */
/** Replaces a required template marker, failing loudly rather than silently skipping SEO injection. */
function injectAt(html: string, marker: string, replacement: string, file: string) {
  if (!html.includes(marker)) throw new Error(`[geinvest-seo] Required marker ${JSON.stringify(marker)} not found in ${file}. SEO tags would be silently omitted — restore the marker in the HTML entry template.`)
  return html.replace(marker, replacement)
}

function geinvestSeo(): Plugin {
  let isBuild = false
  let injectionFailed = false
  const injected = new Set<string>()
  return {
    name: 'geinvest-seo',
    configResolved(config) { isBuild = config.command === 'build' },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const file = ctx.filename.replace(/\\/g, '/')
        try {
          const page = pagesByDepth.find((item) => file.endsWith(`/${item.file}`) || file === item.file)
          // Every HTML entry in this multi-page build maps to a route, so an unknown file is a real misconfiguration.
          if (!page) throw new Error(`[geinvest-seo] ${file} is not a known route in src/content.ts paths, so it would receive no SEO tags or crawlable content.`)
          injected.add(page.file)
          let result = injectAt(html, '<html>', `<html lang="${page.locale}">`, page.file)
          result = injectAt(result, '</head>', `  ${headTags(page.route, page.locale, page.depth)}\n  </head>`, page.file)
          return injectAt(result, '<div id="root"></div>', `<div id="root">\n      ${staticBody(page.route, page.locale)}\n    </div>`, page.file)
        } catch (error) {
          // Vite closes the bundle even after a failure; this stops the completeness check masking the real cause.
          injectionFailed = true
          throw error
        }
      },
    },
    generateBundle() {
      const urls = pages.map((page) => `  <url><loc>${origin}${paths[page.locale][page.route]}</loc></url>`).join('\n')
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` })
    },
    closeBundle() {
      if (!isBuild || injectionFailed) return
      const missed = pages.filter((page) => !injected.has(page.file)).map((page) => page.file)
      if (missed.length) throw new Error(`[geinvest-seo] ${missed.length} route(s) built without SEO injection: ${missed.join(', ')}. Check rollupOptions.input and the HTML entry templates.`)
    },
  }
}

export default defineConfig({
  plugins: [react(), geinvestSeo()],
  // Relative assets work on both a GitHub project page and geinvestkft.com.
  base: './',
  build: {
    sourcemap: true,
    rollupOptions: {
      input: Object.fromEntries(pages.map((page) => [page.name, page.file])),
    },
  },
})
