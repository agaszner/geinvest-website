import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { defineSecret } from 'firebase-functions/params'
import { logger } from 'firebase-functions'
import { onRequest } from 'firebase-functions/v2/https'

initializeApp()

const contactEmail = defineSecret('CONTACT_EMAIL')
const allowedOrigins = new Set([
  'https://geinvestkft.com',
  'https://www.geinvestkft.com',
])

type ContactPayload = {
  name?: unknown
  company?: unknown
  email?: unknown
  phone?: unknown
  message?: unknown
  privacyAccepted?: unknown
  website?: unknown
}

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export const contact = onRequest(
  { region: 'europe-west1', secrets: [contactEmail], invoker: 'public' },
  async (request, response) => {
    const origin = request.get('origin')
    if (origin && allowedOrigins.has(origin)) {
      response.set('Access-Control-Allow-Origin', origin)
      response.set('Vary', 'Origin')
      response.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
      response.set('Access-Control-Allow-Headers', 'Content-Type')
    }

    if (request.method === 'OPTIONS') {
      response.status(origin && allowedOrigins.has(origin) ? 204 : 403).send()
      return
    }
    if (request.method !== 'POST' || (origin && !allowedOrigins.has(origin))) {
      response.status(403).json({ error: 'Forbidden' })
      return
    }

    const payload = (request.body ?? {}) as ContactPayload
    // Honeypot field: bots commonly fill every input, real visitors never see it.
    if (clean(payload.website, 200)) {
      response.status(204).send()
      return
    }

    const name = clean(payload.name, 100)
    const company = clean(payload.company, 120)
    const email = clean(payload.email, 160).toLowerCase()
    const phone = clean(payload.phone, 50)
    const message = clean(payload.message, 3000)
    if (!name || !isValidEmail(email) || !message || payload.privacyAccepted !== 'on') {
      response.status(400).json({ error: 'Please provide a name, valid email, message, and privacy consent.' })
      return
    }

    const contact = { name, company, email, phone, message, createdAt: FieldValue.serverTimestamp(), source: 'website' }
    try {
      const database = getFirestore()
      const stored = await database.collection('contacts').add(contact)
      await database.collection('mail').add({
        to: [contactEmail.value()],
        replyTo: email,
        message: {
          subject: `New Geinvest enquiry from ${name}`,
          text: `Name: ${name}\nCompany: ${company || '—'}\nEmail: ${email}\nPhone: ${phone || '—'}\n\nMessage:\n${message}`,
        },
        contactId: stored.id,
      })
      response.status(201).json({ ok: true })
    } catch (error) {
      logger.error('Unable to store contact enquiry', error)
      response.status(500).json({ error: 'Unable to send your enquiry.' })
    }
  },
)
