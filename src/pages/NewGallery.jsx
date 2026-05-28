import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AppShell from '../components/AppShell'

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + Math.random().toString(36).slice(2, 7)
}

export default function NewGallery() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    client_name: '',
    password: '',
    expires_at: '',
    allow_downloads: true,
    allow_favourites: true,
  })
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState('')

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function toggle(field) {
    setForm(f => ({ ...f, [field]: !f[field] }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Gallery name is required.')
    setError('')
    setUploading(true)

    const slug = slugify(form.name)

    // 1. Create gallery row
    const { data: gallery, error: galErr } = await supabase
      .from('galleries')
      .insert({
        photographer_id: user.id,
        slug,
        name: form.name,
        client_name: form.client_name || null,
        password_hash: form.password || null,
        expires_at: form.expires_at || null,
        allow_downloads: form.allow_downloads,
        allow_favourites: form.allow_favourites,
      })
      .select()
      .single()

    if (galErr) {
      setError(galErr.message)
      setUploading(false)
      return
    }

    // 2. Upload photos
    if (files.length > 0) {
      setProgress({ done: 0, total: files.length })
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const path = `${user.id}/${gallery.id}/${Date.now()}-${file.name}`

        const { error: upErr } = await supabase.storage
          .from('gallery-photos')
          .upload(path, file)

        if (!upErr) {
          await supabase.from('photos').insert({
            gallery_id: gallery.id,
            storage_path: path,
            filename: file.name,
            size_bytes: file.size,
            sort_order: i,
          })
        }

        setProgress({ done: i + 1, total: files.length })
      }
    }

    navigate(`/galleries/${gallery.id}`)
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/galleries" style={{ fontSize: '0.825rem', color: 'var(--muted)' }}>← Back to galleries</Link>
          <h1 style={title}>New Gallery</h1>
          <p style={subtitle}>Upload photos and share a link with your client instantly.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Details */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <h3 style={sectionTitle}>Gallery details</h3>
            <div style={formGrid}>
              <div>
                <label className="field-label">Gallery name *</label>
                <input className="input" type="text" placeholder="e.g. Wedding Day" value={form.name} onChange={set('name')} required />
              </div>
              <div>
                <label className="field-label">Client name</label>
                <input className="input" type="text" placeholder="e.g. Sarah & James" value={form.client_name} onChange={set('client_name')} />
              </div>
              <div>
                <label className="field-label">Password (optional)</label>
                <input className="input" type="text" placeholder="Leave blank for open access" value={form.password} onChange={set('password')} />
              </div>
              <div>
                <label className="field-label">Expiry date (optional)</label>
                <input className="input" type="date" value={form.expires_at} onChange={set('expires_at')} />
              </div>
            </div>

            <div style={toggleRow}>
              <label style={toggleLabel}>
                <input type="checkbox" checked={form.allow_downloads} onChange={() => toggle('allow_downloads')} style={{ accentColor: 'var(--warm)' }} />
                Allow client downloads
              </label>
              <label style={toggleLabel}>
                <input type="checkbox" checked={form.allow_favourites} onChange={() => toggle('allow_favourites')} style={{ accentColor: 'var(--warm)' }} />
                Allow client favouriting
              </label>
            </div>
          </div>

          {/* Upload */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={sectionTitle}>Photos</h3>
            <label
              style={dropzone}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setFiles(Array.from(e.dataTransfer.files)) }}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => setFiles(Array.from(e.target.files))}
              />
              <div style={{ fontSize: '2rem', opacity: 0.4, marginBottom: '0.75rem' }}>⬆️</div>
              {files.length > 0 ? (
                <p style={{ color: 'var(--ink)', fontWeight: 500 }}>{files.length} photo{files.length !== 1 ? 's' : ''} selected</p>
              ) : (
                <>
                  <p style={{ fontWeight: 500, marginBottom: '0.35rem' }}>Drop photos here or click to browse</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>JPG, PNG, HEIC · Any size · Multiple files</p>
                </>
              )}
            </label>

            {uploading && progress.total > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>
                  Uploading {progress.done} / {progress.total}…
                </div>
                <div style={progressBar}>
                  <div style={{ ...progressFill, width: `${(progress.done / progress.total) * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          {error && <p style={{ color: 'var(--red)', fontSize: '0.825rem', marginBottom: '1rem' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Link to="/galleries" className="btn btn-ghost">Cancel</Link>
            <button className="btn btn-gold" type="submit" disabled={uploading}>
              {uploading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Uploading…</> : 'Create gallery & copy link →'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}

const title    = { fontSize: '1.6rem', color: 'var(--ink)', fontFamily: "'DM Serif Display', serif", marginTop: '0.5rem' }
const subtitle = { fontSize: '0.825rem', color: 'var(--muted)', marginTop: '0.25rem' }
const sectionTitle = { fontSize: '0.875rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '1rem' }
const formGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }
const toggleRow = { display: 'flex', gap: '1.5rem', marginTop: '1rem' }
const toggleLabel = { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--muted)', cursor: 'pointer' }
const dropzone = {
  display: 'block',
  border: '2px dashed var(--border2)',
  borderRadius: '10px',
  padding: '2.5rem',
  textAlign: 'center',
  cursor: 'pointer',
  background: 'var(--surface2)',
  transition: 'border-color 0.2s',
}
const progressBar  = { height: '4px', background: 'var(--surface2)', borderRadius: '2px', overflow: 'hidden' }
const progressFill = { height: '100%', background: 'var(--warm)', transition: 'width 0.2s' }
