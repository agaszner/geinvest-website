import { renderToString } from 'react-dom/server'
import App from './App'
import type { Locale, Route } from './content'

export { paths } from './content'

export function render(route: Route, locale: Locale) { return renderToString(<App route={route} locale={locale} />) }
