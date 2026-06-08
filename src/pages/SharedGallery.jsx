import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getR2SignedUrl } from '../lib/r2'

export default function SharedGallery() {
  const { slug } = useParams()
  const [gallery, setGallery] = useState(null)
  const [photos, setPhotos] = useState([])
  const [photoUrls, setPhotoUrls] = useState({})
  const [photographer, setPhotographer] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadShare() }, [slug])

  useEffect(() => {
    function onKey(e) {
      if (!lightbox) return
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight') {
        const next = lightboxIndex + 1
        if (next < photos.length) { setLightbox(photos[next]); setLightboxIndex(next) }
      }
      if (e.key === 'ArrowLeft') {
        const prev = lightboxIndex - 1
        if (prev >= 0) { setLightbox(photos[prev]); setLightboxIndex(prev) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, lightboxIndex, photos])

  async function loadShare() {
    // Look up share link
    const { data: share } = await supabase
      .from('share_links')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!share) { setError('This share link is invalid or has expired.'); setLoading(false); return }

    // Load gallery
    const { data: gal } = await supabase
      .from('galleries')
      .select('*')
      .eq('id', share.gallery_id)
      .single()

    if (!gal || !gal.is_active) { setError('This gallery is no longer available.'); setLoading(false); return }
    setGallery(gal)

    // Load photographer profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('name, logo_url')
      .eq('id', gal.photographer_id)
      .single()
    setPhotographer(prof)

    // Load favourited photos for this session
    const { data: favs } = await supabase
      .from('favourites')
      .select('photo_id')
      .eq('gallery_id', share.gallery_id)
      .eq('session_token', share.session_token)

    if (!favs?.length) { setError('No favourites found for this share link.'); setLoading(false); return }

    const favIds = favs.map(f => f.photo_id)

    // Load photo records
    const { data: phs } = await supabase
      .from('photos')
      .select('*')
      .in('id', favIds)
      .order('sort_order')

    setPhotos(phs ?? [])
    setLoading(false)

    // Load signed URLs in batches
    const batchSize = 50
    for (let i = 0; i < (phs ?? []).length; i += batchSize) {
      const batch = (phs ?? []).slice(i, i + batchSize)
      const urlMap = {}
      await Promise.all(batch.map(async p => {
        try { urlMap[p.id] = await getR2SignedUrl(p.storage_path, 3600) }
        catch (e) { console.error('URL error', e) }
      }))
      setPhotoUrls(prev => ({ ...prev, ...urlMap }))
    }
  }

  function openLightbox(p, i) { setLightbox(p); setLightboxIndex(i) }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--muted)' }}>
      Loading…
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--muted)', gap: '1rem' }}>
      <div style={{ fontSize: '2rem' }}>🔗</div>
      <div>{error}</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 2rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--surface)',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontStyle: 'italic', color: 'var(--ink)' }}>
            {gallery.name}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
            {photos.length} favourite photo{photos.length !== 1 ? 's' : ''} · shared by your photographer
          </div>
        </div>
        {photographer?.name && (
          <div style={{ fontSize: '0.78rem', color: 'var(--muted2)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ opacity: 0.5 }}>Photographed by</span>
            <span style={{ color: 'var(--ink2)', fontWeight: 500 }}>{photographer.name}</span>
          </div>
        )}
      </div>

      {/* Keyboard hint */}
      <div style={{ display: 'flex', gap: '1.5rem', padding: '0.5rem 2rem', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {[['← →', 'Navigate'], ['Esc', 'Close']].map(([key, label]) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--muted)' }}>
            <kbd style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: '3px', padding: '1px 5px', fontSize: '0.65rem', color: 'var(--ink2)', fontFamily: 'inherit' }}>{key}</kbd>
            {label}
          </span>
        ))}
      </div>

      {/* Photo grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '3px',
        padding: '3px',
      }}>
        {photos.map((p, i) => (
          <div
            key={p.id}
            onClick={() => openLightbox(p, i)}
            style={{ aspectRatio: '1', position: 'relative', cursor: 'pointer', overflow: 'hidden', background: 'var(--surface2)' }}
          >
            {photoUrls[p.id]
              ? <img src={photoUrls[p.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                  onMouseEnter={e => e.target.style.transform = 'scale(1.03)'}
                  onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                />
              : <div style={{ width: '100%', height: '100%', background: 'var(--surface2)' }} />
            }
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid var(--border)', marginTop: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontStyle: 'italic', color: 'var(--muted2)' }}>
          frame<span style={{ color: 'var(--warm)' }}>.</span>up
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted2)', marginTop: '0.3rem' }}>Gallery delivery for photographers</div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <button onClick={e => { e.stopPropagation(); const p = lightboxIndex - 1; if (p >= 0) { setLightbox(photos[p]); setLightboxIndex(p) } }}
            style={{ position: 'absolute', left: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.5rem', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer', opacity: lightboxIndex === 0 ? 0.2 : 1 }}>
            ‹
          </button>
          <img
            src={photoUrls[lightbox.id]}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', maxWidth: '90vw', objectFit: 'contain', borderRadius: '4px' }}
          />
          <button onClick={e => { e.stopPropagation(); const p = lightboxIndex + 1; if (p < photos.length) { setLightbox(photos[p]); setLightboxIndex(p) } }}
            style={{ position: 'absolute', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.5rem', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer', opacity: lightboxIndex === photos.length - 1 ? 0.2 : 1 }}>
            ›
          </button>
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1rem', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer' }}>
            ✕
          </button>
          <div style={{ position: 'absolute', bottom: '1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
            {lightboxIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  )
}
