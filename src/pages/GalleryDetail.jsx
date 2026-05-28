import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AppShell from '../components/AppShell'

export default function GalleryDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [gallery, setGallery] = useState(null)
  const [photos, setPhotos] = useState([])
  const [views, setViews] = useState(0)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [photoUrls, setPhotoUrls] = useState({})

  useEffect(() => {
    loadGallery()
  }, [id])

  async function loadGallery() {
    const [{ data: gal }, { data: phs }, { count }] = await Promise.all([
      supabase.from('galleries').select('*').eq('id', id).eq('photographer_id', user.id).single(),
      supabase.from('photos').select('*').eq('gallery_id', id).order('sort_order'),
      supabase.from('gallery_views').select('*', { count: 'exact', head: true }).eq('gallery_id', id),
    ])

    setGallery(gal)
    setPhotos(phs ?? [])
    setViews(count ?? 0)
    setLoading(false)

    // Generate signed URLs for thumbnails
    if (phs?.length) {
      const urlMap = {}
      await Promise.all(phs.slice(0, 20).map(async p => {
        const { data } = await supabase.storage
          .from('gallery-photos')
          .createSignedUrl(p.storage_path, 3600)
        if (data) urlMap[p.id] = data.signedUrl
      }))
      setPhotoUrls(urlMap)
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/g/${gallery.slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function toggleActive() {
    const { data } = await supabase
      .from('galleries')
      .update({ is_active: !gallery.is_active })
      .eq('id', id)
      .select()
      .single()
    setGallery(data)
  }

  async function deleteGallery() {
    if (!window.confirm('Delete this gallery and all its photos? This cannot be undone.')) return
    await supabase.from('galleries').delete().eq('id', id)
    navigate('/galleries')
  }

  async function deletePhoto(photo) {
    await supabase.storage.from('gallery-photos').remove([photo.storage_path])
    await supabase.from('photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
  }

  if (loading) return <AppShell><div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></div></AppShell>
  if (!gallery) return <AppShell><p style={{ color: 'var(--muted)' }}>Gallery not found.</p></AppShell>

  return (
    <AppShell>
      <div style={{ maxWidth: 920 }}>
        <Link to="/galleries" style={{ fontSize: '0.825rem', color: 'var(--muted)' }}>← All galleries</Link>

        <div style={pageHeader}>
          <div>
            <h1 style={title}>{gallery.name}</h1>
            {gallery.client_name && <p style={subtitle}>{gallery.client_name}</p>}
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={toggleActive} style={{ fontSize: '0.8rem' }}>
              {gallery.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button className="btn btn-gold" onClick={copyLink}>
              {copied ? '✓ Copied!' : '🔗 Copy client link'}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={statsRow}>
          {[
            { label: 'Photos',    value: photos.length },
            { label: 'Views',     value: views },
            { label: 'Status',    value: gallery.is_active ? 'Live' : 'Inactive' },
            { label: 'Expires',   value: gallery.expires_at ? new Date(gallery.expires_at).toLocaleDateString() : 'Never' },
          ].map(s => (
            <div key={s.label} style={statCard}>
              <div style={statLabel}>{s.label}</div>
              <div style={statValue}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Client link */}
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', flexShrink: 0 }}>Client link</span>
          <code style={{ flex: 1, fontSize: '0.825rem', color: 'var(--warm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {window.location.origin}/g/{gallery.slug}
          </code>
          <button className="btn btn-ghost" onClick={copyLink} style={{ fontSize: '0.78rem', flexShrink: 0, padding: '0.3rem 0.75rem' }}>
            {copied ? '✓' : 'Copy'}
          </button>
        </div>

        {/* Photo grid */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={tableHeader}>
            <span style={tableTitle}>Photos ({photos.length})</span>
          </div>
          {photos.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
              No photos yet. <Link to="/galleries/new" style={{ color: 'var(--warm)' }}>Upload some.</Link>
            </div>
          ) : (
            <div style={photoGrid}>
              {photos.map(p => (
                <div key={p.id} style={photoCell}>
                  {photoUrls[p.id]
                    ? <img src={photoUrls[p.id]} alt={p.filename} style={photoImg} />
                    : <div style={{ ...photoImg, background: 'var(--surface2)' }} />
                  }
                  <button
                    style={deletePhotoBtn}
                    onClick={() => deletePhoto(p)}
                    title="Delete photo"
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-danger" onClick={deleteGallery} style={{ fontSize: '0.8rem' }}>
            Delete gallery
          </button>
        </div>
      </div>
    </AppShell>
  )
}

const pageHeader  = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', margin: '0.75rem 0 1.5rem' }
const title    = { fontSize: '1.6rem', color: 'var(--ink)', fontFamily: "'DM Serif Display', serif" }
const subtitle = { fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.2rem' }
const statsRow = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }
const statCard  = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem' }
const statLabel = { fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }
const statValue = { fontSize: '1.1rem', fontWeight: 500, color: 'var(--ink)' }
const tableHeader = { padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const tableTitle = { fontSize: '0.9rem', fontWeight: 500, color: 'var(--ink)' }
const photoGrid = { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', padding: '3px' }
const photoCell = { position: 'relative', aspectRatio: '1', overflow: 'hidden', background: 'var(--surface2)' }
const photoImg  = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
const deletePhotoBtn = {
  position: 'absolute', top: '4px', right: '4px',
  width: '20px', height: '20px',
  background: 'rgba(0,0,0,0.6)',
  color: '#fff', border: 'none', borderRadius: '50%',
  fontSize: '0.6rem', cursor: 'pointer', display: 'none',
  alignItems: 'center', justifyContent: 'center',
}
