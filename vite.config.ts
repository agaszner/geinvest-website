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
function geinvestSeo(): Plugin {
  return {
    name: 'geinvest-seo',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const file = ctx.filename.replace(/\\/g, '/')
        const page = pagesByDepth.find((item) => file.endsWith(`/${item.file}`) || file === item.file)
        if (!page) return html
        return html
          .replace('<html>', `<html lang="${page.locale}">`)
          .replace('</head>', `  ${headTags(page.route, page.locale, page.depth)}\n  </head>`)
          .replace('<div id="root"></div>', `<div id="root">\n      ${staticBody(page.route, page.locale)}\n    </div>`)
      },
    },
    generateBundle() {
      const urls = pages.map((page) => `  <url><loc>${origin}${paths[page.locale][page.route]}</loc></url>`).join('\n')
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` })
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
