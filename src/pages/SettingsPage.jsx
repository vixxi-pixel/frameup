import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AppShell from '../components/AppShell'

const POSITIONS = [
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'bottom-left',  label: 'Bottom left' },
  { value: 'bottom-center',label: 'Bottom center' },
  { value: 'center',       label: 'Center' },
  { value: 'top-right',    label: 'Top right' },
  { value: 'top-left',     label: 'Top left' },
]

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const [domain, setDomain]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [verified, setVerified]   = useState(false)
  const [checking, setChecking]   = useState(false)
  const [name, setName]           = useState('')
  const [savingName, setSavingName] = useState(false)

  // Logo + watermark
  const [logoUrl, setLogoUrl]           = useState(null)
  const [logoFile, setLogoFile]         = useState(null)
  const [logoPreview, setLogoPreview]   = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoSaved, setLogoSaved]       = useState(false)
  const [opacity, setOpacity]           = useState(0.35)
  const [position, setPosition]         = useState('bottom-right')
  const [savingWatermark, setSavingWatermark] = useState(false)
  const [watermarkSaved, setWatermarkSaved]   = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (profile) {
      setDomain(profile.custom_domain ?? '')
      setVerified(profile.domain_verified ?? false)
      setName(profile.name ?? '')
      setLogoUrl(profile.logo_url ?? null)
      setOpacity(profile.watermark_opacity ?? 0.35)
      setPosition(profile.watermark_position ?? 'bottom-right')
    }
  }, [profile])

  async function saveName() {
    setSavingName(true)
    await supabase.from('profiles').update({ name }).eq('id', user.id)
    setSavingName(false)
  }

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
    await supabase.from('profiles').update({ domain_verified: true }).eq('id', user.id)
    setVerified(true)
    setChecking(false)
  }

  function onLogoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function uploadLogo() {
    if (!logoFile) return
    setUploadingLogo(true)
    const ext = logoFile.name.split('.').pop()
    const path = `logos/${user.id}/logo.${ext}`
    const { error } = await supabase.storage
      .from('gallery-photos')
      .upload(path, logoFile, { upsert: true })

    if (!error) {
      const { data } = await supabase.storage
        .from('gallery-photos')
        .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 year
      const url = data?.signedUrl ?? null
      await supabase.from('profiles').update({ logo_url: path }).eq('id', user.id)
      setLogoUrl(path)
      setLogoSaved(true)
      setTimeout(() => setLogoSaved(false), 2000)
    }
    setUploadingLogo(false)
  }

  async function removeLogo() {
    if (!logoUrl) return
    await supabase.storage.from('gallery-photos').remove([logoUrl])
    await supabase.from('profiles').update({ logo_url: null }).eq('id', user.id)
    setLogoUrl(null)
    setLogoPreview(null)
    setLogoFile(null)
  }

  async function saveWatermark() {
    setSavingWatermark(true)
    await supabase.from('profiles').update({
      watermark_opacity: opacity,
      watermark_position: position,
    }).eq('id', user.id)
    setSavingWatermark(false)
    setWatermarkSaved(true)
    setTimeout(() => setWatermarkSaved(false), 2000)
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 600 }}>
        <h1 style={title}>Settings</h1>
        <p style={subtitle}>Manage your account, branding, and domain.</p>

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

        {/* Logo + Watermark */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={sectionTitle}>Studio logo & watermark</div>
          <p style={helpText}>
            Upload your studio logo. When watermark is enabled on a gallery, it's composited onto each photo
            at the position and opacity you choose — clients see the watermarked version, but the original is
            always preserved in storage.
          </p>

          {/* Logo upload */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="field-label">Studio logo</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              {/* Preview */}
              <div
                style={{
                  width: 80, height: 80, borderRadius: 8,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0, cursor: 'pointer',
                }}
                onClick={() => fileRef.current?.click()}
              >
                {logoPreview || logoUrl ? (
                  <LogoImg path={logoPreview || logoUrl} preview={!!logoPreview} />
                ) : (
                  <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>🖼</span>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={onLogoChange}
                />
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => fileRef.current?.click()}
                    style={{ fontSize: '0.82rem' }}
                  >
                    {logoUrl || logoPreview ? 'Replace logo' : 'Upload logo'}
                  </button>
                  {logoFile && (
                    <button
                      className="btn btn-gold"
                      onClick={uploadLogo}
                      disabled={uploadingLogo}
                      style={{ fontSize: '0.82rem' }}
                    >
                      {uploadingLogo ? 'Uploading…' : logoSaved ? '✓ Saved' : 'Save logo'}
                    </button>
                  )}
                  {logoUrl && !logoFile && (
                    <button
                      className="btn btn-danger"
                      onClick={removeLogo}
                      style={{ fontSize: '0.82rem' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p style={{ ...helpText, marginTop: '0.5rem', marginBottom: 0 }}>
                  PNG or SVG with transparent background works best.
                </p>
              </div>
            </div>
          </div>

          {/* Watermark settings */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <label className="field-label">Watermark position</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {POSITIONS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPosition(p.value)}
                  style={{
                    padding: '0.45rem 0.5rem',
                    borderRadius: '8px',
                    border: `1px solid ${position === p.value ? 'var(--warm-dim)' : 'var(--border2)'}`,
                    background: position === p.value ? 'var(--warm-bg)' : 'transparent',
                    color: position === p.value ? 'var(--warm)' : 'var(--muted)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label className="field-label">Opacity — {Math.round(opacity * 100)}%</label>
            <input
              type="range" min="0.05" max="0.8" step="0.05"
              value={opacity}
              onChange={e => setOpacity(parseFloat(e.target.value))}
              style={{ width: '100%', marginBottom: '1.25rem', accentColor: 'var(--warm)' }}
            />

            {/* Live preview */}
            {(logoPreview || logoUrl) && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="field-label">Preview</label>
                <WatermarkPreview logoSrc={logoPreview || logoUrl} isPath={!logoPreview} opacity={opacity} position={position} />
              </div>
            )}

            <button
              className="btn btn-gold"
              onClick={saveWatermark}
              disabled={savingWatermark}
              style={{ fontSize: '0.85rem' }}
            >
              {watermarkSaved ? '✓ Saved' : savingWatermark ? 'Saving…' : 'Save watermark settings'}
            </button>
          </div>
        </div>

        {/* Custom Domain */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={sectionTitle}>Custom domain</div>
            {verified && <span style={{ fontSize: '0.75rem', background: 'var(--green-bg)', color: 'var(--green)', padding: '0.2rem 0.6rem', borderRadius: '100px', border: '1px solid #1A3D22' }}>✓ Verified</span>}
          </div>
          <p style={helpText}>Point your own domain to your galleries (e.g. <code style={code}>photos.yourstudio.com</code>).</p>
          <div style={{ marginBottom: '1rem' }}>
            <label className="field-label">Your domain</label>
            <input className="input" value={domain} onChange={e => { setDomain(e.target.value); setVerified(false) }} placeholder="photos.yourstudio.com" />
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: domain ? '1.5rem' : 0 }}>
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
            <div style={dnsBox}>
              <div style={dnsTitle}>DNS setup instructions</div>
              <div style={dnsTable}>
                <div style={dnsRow}><div style={dnsCell('type')}>Type</div><div style={dnsCell('name')}>Name</div><div style={dnsCell('value')}>Value</div></div>
                <div style={{ ...dnsRow, borderTop: '1px solid var(--border)' }}>
                  <div style={dnsCell('type')}><code style={code}>CNAME</code></div>
                  <div style={dnsCell('name')}><code style={code}>{domain.split('.')[0]}</code></div>
                  <div style={dnsCell('value')}><code style={code}>cname.vercel-dns.com</code></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="card" style={{ padding: '1.5rem', borderColor: 'var(--red-bg)' }}>
          <div style={{ ...sectionTitle, color: 'var(--red)' }}>Danger zone</div>
          <p style={helpText}>Permanently delete your account and all galleries.</p>
          <button className="btn btn-danger" style={{ fontSize: '0.85rem', marginTop: '0.75rem' }} onClick={() => alert('Contact support to delete your account.')}>
            Delete account
          </button>
        </div>
      </div>
    </AppShell>
  )
}

// Loads a logo from a storage path (signed URL) or a local blob preview URL
function LogoImg({ path, preview }) {
  const [src, setSrc] = useState(preview ? path : null)
  useEffect(() => {
    if (preview) { setSrc(path); return }
    supabase.storage.from('gallery-photos').createSignedUrl(path, 3600)
      .then(({ data }) => { if (data) setSrc(data.signedUrl) })
  }, [path, preview])
  if (!src) return <span style={{ fontSize: '1rem', opacity: 0.4 }}>…</span>
  return <img src={src} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} />
}

// Canvas watermark preview
function WatermarkPreview({ logoSrc, isPath, opacity, position }) {
  const canvasRef = useRef()
  const [resolvedSrc, setResolvedSrc] = useState(isPath ? null : logoSrc)

  useEffect(() => {
    if (!isPath) { setResolvedSrc(logoSrc); return }
    supabase.storage.from('gallery-photos').createSignedUrl(logoSrc, 3600)
      .then(({ data }) => { if (data) setResolvedSrc(data.signedUrl) })
  }, [logoSrc, isPath])

  useEffect(() => {
    if (!resolvedSrc || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height

    // Draw placeholder photo background
    ctx.fillStyle = '#2A2318'
    ctx.fillRect(0, 0, W, H)

    const logo = new Image()
    logo.crossOrigin = 'anonymous'
    logo.onload = () => {
      const maxW = W * 0.28
      const scale = Math.min(maxW / logo.width, (H * 0.2) / logo.height)
      const lw = logo.width * scale
      const lh = logo.height * scale
      const pad = 14

      let x, y
      switch (position) {
        case 'bottom-right':  x = W - lw - pad; y = H - lh - pad; break
        case 'bottom-left':   x = pad;           y = H - lh - pad; break
        case 'bottom-center': x = (W - lw) / 2;  y = H - lh - pad; break
        case 'top-right':     x = W - lw - pad; y = pad;           break
        case 'top-left':      x = pad;           y = pad;           break
        case 'center':        x = (W - lw) / 2;  y = (H - lh) / 2; break
        default:              x = W - lw - pad; y = H - lh - pad
      }

      ctx.globalAlpha = opacity
      ctx.drawImage(logo, x, y, lw, lh)
      ctx.globalAlpha = 1
    }
    logo.src = resolvedSrc
  }, [resolvedSrc, opacity, position])

  return (
    <canvas
      ref={canvasRef}
      width={400} height={260}
      style={{ width: '100%', borderRadius: '8px', display: 'block', border: '1px solid var(--border)' }}
    />
  )
}

const title       = { fontSize: '1.6rem', color: 'var(--ink)', fontFamily: "'DM Serif Display', serif", marginBottom: '0.25rem' }
const subtitle    = { fontSize: '0.825rem', color: 'var(--muted)', marginBottom: '2rem' }
const sectionTitle = { fontSize: '0.9rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '1rem' }
const helpText    = { fontSize: '0.825rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '0.75rem' }
const code        = { fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--surface2)', padding: '1px 5px', borderRadius: '4px', color: 'var(--warm)' }
const dnsBox      = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }
const dnsTitle    = { fontSize: '0.8rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }
const dnsTable    = { borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)', marginTop: '0.75rem' }
const dnsRow      = { display: 'grid', gridTemplateColumns: '80px 1fr 1fr' }
const dnsCell     = (type) => ({ padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: type === 'type' ? 'var(--muted)' : 'var(--ink)' })
