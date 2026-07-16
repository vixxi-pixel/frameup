import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState(null) // null | 'sending' | 'sent' | 'error'

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: form.message,
        }),
      })
      if (res.ok) {
        setStatus('sent')
        setForm({ name: '', email: '', message: '' })
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={page}>
      <div style={card}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={logoStyle}>
            frame<span style={{ color: 'var(--warm)' }}>.</span>up
            <span style={{ fontSize: '0.7em', opacity: 0.55, fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}> by justaglimpse</span>
          </div>
        </Link>

        {status === 'sent' ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✓</div>
            <h2 style={heading}>Message sent!</h2>
            <p style={sub}>Thanks for reaching out. We'll be in touch shortly.</p>
            <button style={{ ...submitBtn, marginTop: '1.5rem' }} onClick={() => setStatus(null)}>
              Send another
            </button>
          </div>
        ) : (
          <>
            <h2 style={heading}>Get in touch</h2>
            <p style={sub}>Interested in joining frameup by justaglimpse? Drop us a message and we'll get back to you.</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={label}>Your name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  required
                  placeholder="Jane Smith"
                  style={input}
                />
              </div>
              <div>
                <label style={label}>Email address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  required
                  placeholder="jane@yourstudio.com"
                  style={input}
                />
              </div>
              <div>
                <label style={label}>Message</label>
                <textarea
                  value={form.message}
                  onChange={set('message')}
                  required
                  rows={4}
                  placeholder="Tell us a bit about your photography and what you're looking for..."
                  style={{ ...input, resize: 'vertical', minHeight: '100px' }}
                />
              </div>

              {status === 'error' && (
                <p style={{ color: 'var(--red)', fontSize: '0.85rem' }}>
                  Something went wrong. Please try again or email us at info@justaglimpse.com
                </p>
              )}

              <button type="submit" style={submitBtn} disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </form>

            <p style={{ marginTop: '1.5rem', fontSize: '0.82rem', color: 'var(--muted)', textAlign: 'center' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--warm)' }}>Log in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const page = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg)',
  padding: '2rem 1rem',
}
const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '2.5rem',
  width: '100%',
  maxWidth: '440px',
}
const logoStyle = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: '1.2rem',
  marginBottom: '1.5rem',
  color: 'var(--ink)',
  display: 'block',
}
const heading = {
  fontSize: '1.4rem',
  fontFamily: "'DM Serif Display', serif",
  color: 'var(--ink)',
  marginBottom: '0.4rem',
  fontWeight: 400,
}
const sub = {
  fontSize: '0.875rem',
  color: 'var(--muted)',
  marginBottom: '1.75rem',
  lineHeight: 1.6,
}
const label = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: 'var(--ink2)',
  marginBottom: '0.4rem',
}
const input = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--ink)',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}
const submitBtn = {
  width: '100%',
  padding: '0.8rem',
  background: 'var(--warm)',
  border: 'none',
  borderRadius: '100px',
  color: '#0E0D0B',
  fontSize: '0.875rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  letterSpacing: '0.03em',
}
