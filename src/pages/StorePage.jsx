import AppShell from '../components/AppShell'

export default function StorePage() {
  return (
    <AppShell>
      <div style={{ maxWidth: 700 }}>
        <h1 style={title}>Store</h1>
        <p style={subtitle}>Sell prints and digital downloads. 0% commission.</p>

        <div style={comingSoon}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🛒</div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.4rem', marginBottom: '0.5rem' }}>
            Coming soon
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', maxWidth: 360 }}>
            Stripe-powered print sales and digital download packages. You keep 100% — just a flat monthly fee.
          </p>
        </div>
      </div>
    </AppShell>
  )
}

const title    = { fontSize: '1.6rem', color: 'var(--ink)', fontFamily: "'DM Serif Display', serif", marginBottom: '0.25rem' }
const subtitle = { fontSize: '0.825rem', color: 'var(--muted)', marginBottom: '2rem' }
const comingSoon = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '4rem 2rem',
  textAlign: 'center',
}
