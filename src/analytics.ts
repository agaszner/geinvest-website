import type { PostHog } from 'posthog-js'

const consentKey = 'geinvest-analytics-consent'
// posthog-js is large, so it is only downloaded once a visitor has granted consent.
let client: Promise<PostHog> | null = null

export function getAnalyticsConsent() {
  return localStorage.getItem(consentKey)
}

export function startAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key || client) return

  client = import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false,
      persistence: 'localStorage+cookie',
    })
    return posthog
  })
}

export function setAnalyticsConsent(value: 'granted' | 'denied') {
  localStorage.setItem(consentKey, value)
  if (value === 'granted') startAnalytics()
}

/** No-op unless the visitor granted analytics consent, so nothing is sent without it. */
export function track(event: 'call_click' | 'email_click' | 'form_submit', properties: Record<string, string>) {
  client?.then((posthog) => posthog.capture(event, properties))
}
