import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App'
import { currentLocation, legacyHashTarget } from './location'
import '@fontsource-variable/dm-sans/opsz.css'
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/600-italic.css'
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
