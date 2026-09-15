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
