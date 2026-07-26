import { FormEvent, useEffect, useState } from 'react'
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Factory,
  MapPin,
  Menu,
  PackageCheck,
  Send,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react'
import { getAnalyticsConsent, setAnalyticsConsent, startAnalytics } from './analytics'

type Status = 'idle' | 'sending' | 'sent' | 'error'

const offerings = [
  { number: '01', title: 'Wear parts', text: 'Hard-wearing components selected for the demanding conditions of quarry and mining operations.', icon: Settings2 },
  { number: '02', title: 'Machine components', text: 'Dependable replacement parts to keep your crushers, screens and processing equipment moving.', icon: Factory },
  { number: '03', title: 'Sourcing support', text: 'Tell us what you need. We help identify the right part and source it with care and clarity.', icon: PackageCheck },
]

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [consent, setConsent] = useState<string | null>(null)
  const [showPrivacy, setShowPrivacy] = useState(false)

  useEffect(() => {
    const saved = getAnalyticsConsent()
    setConsent(saved)
    if (saved === 'granted') startAnalytics()
  }, [])

  const chooseConsent = (value: 'granted' | 'denied') => {
    setAnalyticsConsent(value)
    setConsent(value)
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Geinvest home">
          <span className="brand-mark">G</span><span>GEINVEST</span>
        </a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open navigation" aria-expanded={menuOpen}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Main navigation">
          <a href="#solutions" onClick={() => setMenuOpen(false)}>Solutions</a>
          <a href="#why-us" onClick={() => setMenuOpen(false)}>Why Geinvest</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
          <a className="nav-cta" href="#contact" onClick={() => setMenuOpen(false)}>Request a quote <ArrowRight size={15} /></a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" />
        <div className="hero-content">
          <p className="eyebrow"><span /> Parts that keep industry moving</p>
          <h1>Built for the<br /><em>hardest</em> work.</h1>
          <p className="hero-copy">Geinvest supplies dependable mining machinery parts and components for operations that cannot afford to stand still.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#contact">Talk to us <ArrowDownRight size={18} /></a>
            <a className="text-link" href="#solutions">Explore our services <ArrowRight size={17} /></a>
          </div>
        </div>
        <div className="hero-facts" aria-label="Geinvest values">
          <div><strong>Precision</strong><span>in every part</span></div>
          <div><strong>Dependability</strong><span>when it matters</span></div>
          <div><strong>Partnership</strong><span>from inquiry to delivery</span></div>
        </div>
        <a href="#solutions" className="scroll-cue">Scroll to explore <ChevronDown size={18} /></a>
      </section>

      <section className="intro section-wrap" id="solutions">
        <div className="section-label">What we do</div>
        <div className="intro-lead">
          <h2>Practical supply support for <em>serious</em> operations.</h2>
          <p>Whether you need a specific replacement component or help sourcing the right solution, we provide direct, considered support without unnecessary complexity.</p>
        </div>
        <div className="offering-grid">
          {offerings.map(({ number, title, text, icon: Icon }) => (
            <article className="offering-card" key={title}>
              <div className="card-top"><span>{number}</span><Icon size={27} strokeWidth={1.4} /></div>
              <h3>{title}</h3><p>{text}</p><a href="#contact" aria-label={`Ask about ${title}`}>Ask about this <ArrowRight size={16} /></a>
            </article>
          ))}
        </div>
      </section>

      <section className="promise" id="why-us">
        <div className="promise-visual"><div className="ring ring-one" /><div className="ring ring-two" /><span>GEI<br />NVEST</span></div>
        <div className="promise-copy">
          <p className="eyebrow"><span /> A straightforward partner</p>
          <h2>Less downtime.<br /><em>More confidence.</em></h2>
          <p>Our focus is simple: understand your requirement, find the right part, and communicate clearly throughout. We are built around the needs of industrial customers, not a one-size-fits-all catalogue.</p>
          <ul>
            <li><Check size={18} /> Clear, responsive communication</li>
            <li><Check size={18} /> Quality-focused component sourcing</li>
            <li><Check size={18} /> A personal, hands-on approach</li>
          </ul>
        </div>
      </section>

      <section className="contact-section section-wrap" id="contact">
        <div className="contact-intro">
          <div className="section-label">Get in touch</div>
          <h2>Let’s find the right<br /><em>part</em> for the job.</h2>
          <p>Describe the part or machine component you are looking for. We will get back to you as soon as possible.</p>
          <div className="contact-details">
            <span><Clock3 size={17} /> Mon–Fri, 08:00–17:00 CET</span>
            <span><MapPin size={17} /> Hungary · Serving industrial clients</span>
          </div>
        </div>
        <ContactForm />
      </section>

      <footer>
        <a className="brand" href="#top"><span className="brand-mark">G</span><span>GEINVEST</span></a>
        <p>Mining machinery parts & industrial component sourcing.</p>
        <button className="privacy-link" onClick={() => setShowPrivacy(true)}>Privacy & cookies</button>
        <span>© {new Date().getFullYear()} Geinvest Kft.</span>
      </footer>

      {showPrivacy && <PrivacyDialog onClose={() => setShowPrivacy(false)} />}
      {consent === null && <CookieBanner onChoose={chooseConsent} />}
    </main>
  )
}

function ContactForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form))
    if (data.website) return
    const endpoint = import.meta.env.VITE_CONTACT_ENDPOINT
    if (!endpoint) {
      setStatus('error')
      setMessage('The contact form is not configured yet. Please email us directly.')
      return
    }

    setStatus('sending')
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!response.ok) throw new Error('Unable to submit form')
      form.reset()
      setStatus('sent')
      setMessage('Thank you — your enquiry has been sent. We will be in touch shortly.')
    } catch {
      setStatus('error')
      setMessage('We could not send your enquiry. Please try again or email us directly.')
    }
  }

  return <form className="contact-form" onSubmit={submit}>
    <div className="form-row"><label>Full name<input name="name" autoComplete="name" required maxLength={100} /></label><label>Company <span>(optional)</span><input name="company" autoComplete="organization" maxLength={120} /></label></div>
    <div className="form-row"><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={160} /></label><label>Phone <span>(optional)</span><input name="phone" type="tel" autoComplete="tel" maxLength={50} /></label></div>
    <label>How can we help?<textarea name="message" required maxLength={3000} placeholder="Tell us about the component or machine part you need." /></label>
    <label className="checkbox"><input name="privacyAccepted" type="checkbox" required /> <span>I agree that Geinvest may use my details to respond to this enquiry.</span></label>
    <input className="trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
    <button className="button button-primary" disabled={status === 'sending'} type="submit"><Send size={17} /> {status === 'sending' ? 'Sending…' : 'Send enquiry'}</button>
    {message && <p className={`form-message ${status}`} role="status">{message}</p>}
  </form>
}

function CookieBanner({ onChoose }: { onChoose: (value: 'granted' | 'denied') => void }) {
  return <aside className="cookie-banner"><ShieldCheck size={23} /><div><strong>Your privacy</strong><p>We use optional analytics to understand what is useful on this site. You can accept or decline.</p></div><button className="cookie-decline" onClick={() => onChoose('denied')}>Decline</button><button className="button button-primary" onClick={() => onChoose('granted')}>Accept analytics</button></aside>
}

function PrivacyDialog({ onClose }: { onClose: () => void }) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="privacy-dialog" role="dialog" aria-modal="true" aria-label="Privacy information" onMouseDown={(event) => event.stopPropagation()}><button className="dialog-close" onClick={onClose} aria-label="Close privacy information"><X /></button><p className="eyebrow"><span /> Privacy</p><h2>Your details, handled with care.</h2><p>When you submit the contact form, we store the information you provide solely to respond to your enquiry. It is processed by Geinvest and our secure cloud service providers.</p><p>Optional, consent-based analytics are provided by PostHog to help us improve this website. We do not sell personal information. To request access, correction, or deletion of your contact details, use the contact form and mention your request.</p><button className="text-link" onClick={onClose}>Close <ArrowRight size={16} /></button></section></div>
}

export default App
