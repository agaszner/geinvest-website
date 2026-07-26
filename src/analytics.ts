import posthog from 'posthog-js'

const consentKey = 'geinvest-analytics-consent'
let started = false

export function getAnalyticsConsent() {
  return localStorage.getItem(consentKey)
}

export function startAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key || started) return

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
    persistence: 'localStorage+cookie',
  })
  started = true
}

export function setAnalyticsConsent(value: 'granted' | 'denied') {
  localStorage.setItem(consentKey, value)
  if (value === 'granted') startAnalytics()
}
