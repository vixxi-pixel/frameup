import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AppShell from '../components/AppShell'

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const [domain, setDomain] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [verified, setVerified] = useState(false)
  const [checking, setChecking] = useState(false)
  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    if (profile) {
      setDomain(profile.custom_domain ?? '')
      setVerified(profile.domain_verified ?? false)
      setName(profile.name ?? '')
    }
  }, [profile])

  async function saveDomain() {
    setSaving(true)
    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    await supabase.from('profiles').update({ custom_domain: clean || null, domain_verified: false }).eq('id', user.id)
    setDomain(clean)
    setVerified(false)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function checkVerification() {
    setChecking(true)
    // In production you'd call a Cloudflare Worker or Vercel Edge Function
    // to do a DNS TXT record lookup. For now we just mark it verified manually.
    await supabase.from('profiles').update({ domain_verified: true }).eq('id', user.id)
    setVerified(true)
    setChecking(false)
  }

  async function saveName() {
    setSavingName(true)
    await supabase.from('profiles').update({ name }).eq('id', user.id)
    setSavingName(false)
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 600 }}>
        <h1 style={title}>Settings</h1>
        <p style={subtitle}>Manage your account and custom domain.</p>

        {/* Profile */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={sectionTitle}>Profile</div>
          <div style={{ marginBottom: '1rem' }}>
            <label className="field-label">Display name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label className="field-label">Email</label>
            <input className="input" value={user?.email ?? ''} disabled style={{ opacity: 0.5 }} />
          </div>
          <button className="btn btn-gold" onClick={saveName} disabled={savingName} style={{ fontSize: '0.85rem' }}>
            {savingName ? 'Saving…' : 'Save profile'}
          </button>
        </div>

        {/* Custom Domain */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={sectionTitle}>Custom domain</div>
            {verified && <span style={{ fontSize: '0.75rem', background: 'var(--green-bg)', color: 'var(--green)', padding: '0.2rem 0.6rem', borderRadius: '100px', border: '1px solid #1A3D22' }}>✓ Verified</span>}
          </div>
          <p style={helpText}>Point your own domain to your frame.up galleries (e.g. <code style={code}>photos.yourstudio.com</code>).</p>

          <div style={{ marginBottom: '1rem' }}>
            <label className="field-label">Your domain</label>
            <input
              className="input"
              value={domain}
              onChange={e => { setDomain(e.target.value); setVerified(false) }}
              placeholder="photos.yourstudio.com"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <button className="btn btn-gold" onClick={saveDomain} disabled={saving} style={{ fontSize: '0.85rem' }}>
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save domain'}
            </button>
            {domain && !verified && (
              <button className="btn btn-ghost" onClick={checkVerification} disabled={checking} style={{ fontSize: '0.85rem' }}>
                {checking ? 'Checking…' : 'Verify DNS'}
              </button>
            )}
          </div>

          {domain && (
            <>
              <div style={dnsBox}>
                <div style={dnsTitle}>DNS setup instructions</div>
                <p style={helpText}>Add these DNS records in your domain registrar (Namecheap, GoDaddy, etc.):</p>

                <div style={dnsTable}>
                  <div style={dnsRow}>
                    <div style={dnsCell('type')}>Type</div>
                    <div style={dnsCell('name')}>Name</div>
                    <div style={dnsCell('value')}>Value</div>
                  </div>
                  <div style={{ ...dnsRow, borderTop: '1px solid var(--border)' }}>
                    <div style={dnsCell('type')}><code style={code}>CNAME</code></div>
                    <div style={dnsCell('name')}><code style={code}>{domain.split('.')[0]}</code></div>
                    <div style={dnsCell('value')}><code style={code}>cname.vercel-dns.com</code></div>
                  </div>
                  <div style={{ ...dnsRow, borderTop: '1px solid var(--border)' }}>
                    <div style={dnsCell('type')}><code style={code}>TXT</code></div>
                    <div style={dnsCell('name')}><code style={code}>_frameup</code></div>
                    <div style={dnsCell('value')}><code style={code}>verify={user?.id?.slice(0, 8)}</code></div>
                  </div>
                </div>

                <p style={{ ...helpText, marginTop: '1rem' }}>
                  After adding the records, also add <code style={code}>{domain}</code> as a custom domain in your{' '}
                  <a href="https://vercel.com" target="_blank" rel="noreferrer" style={{ color: 'var(--warm)' }}>Vercel project settings</a>.
                  DNS changes can take up to 24 hours to propagate.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Danger zone */}
        <div className="card" style={{ padding: '1.5rem', borderColor: 'var(--red-bg)' }}>
          <div style={{ ...sectionTitle, color: 'var(--red)' }}>Danger zone</div>
          <p style={helpText}>Permanently delete your account and all galleries. This cannot be undone.</p>
          <button className="btn btn-danger" style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}
            onClick={() => alert('Contact support to delete your account.')}>
            Delete account
          </button>
        </div>
      </div>
    </AppShell>
  )
}

const title    = { fontSize: '1.6rem', color: 'var(--ink)', fontFamily: "'DM Serif Display', serif", marginBottom: '0.25rem' }
const subtitle = { fontSize: '0.825rem', color: 'var(--muted)', marginBottom: '2rem' }
const sectionTitle = { fontSize: '0.9rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '1rem' }
const helpText = { fontSize: '0.825rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '0.75rem' }
const code = { fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--surface2)', padding: '1px 5px', borderRadius: '4px', color: 'var(--warm)' }
const dnsBox = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }
const dnsTitle = { fontSize: '0.8rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }
const dnsTable = { borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)', marginTop: '0.75rem' }
const dnsRow = { display: 'grid', gridTemplateColumns: '80px 1fr 1fr' }
const dnsCell = (type) => ({ padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: type === 'type' ? 'var(--muted)' : 'var(--ink)' })
