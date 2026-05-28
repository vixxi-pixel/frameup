import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function getSessionToken() {
  let token = localStorage.getItem('frameup_session')
  if (!token) {
    token = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('frameup_session', token)
  }
  return token
}

export default function PublicGallery() {
  const { slug } = useParams()
  const [gallery, setGallery] = useState(null)
  const [photos, setPhotos] = useState([])
  const [photoUrls, setPhotoUrls] = useState({})
  const [favourites, setFavourites] = useState(new Set())
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [wrongPw, setWrongPw] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showFavsOnly, setShowFavsOnly] = useState(false)
  const [activeSection, setActiveSection] = useState('all')
  const sessionToken = getSessionToken()

  useEffect(() => { loadGallery() }, [slug])

  async function loadGallery() {
    const { data: gal } = await supabase
      .from('galleries').select('*').eq('slug', slug).eq('is_active', true).single()
    if (!gal) { setLoading(false); return }
    setGallery(gal)
    await supabase.from('gallery_views').insert({ gallery_id: gal.id })
    if (!gal.password_hash) await loadPhotos(gal)
    setLoading(false)
  }

  async function loadPhotos(gal) {
    const { data: phs } = await supabase
      .from('photos').select('*').eq('gallery_id', gal.id).order('sort_order')
    setPhotos(phs ?? [])

    const urlMap = {}
    await Promise.all((phs ?? []).map(async p => {
      const { data } = await supabase.storage.from('gallery-photos').createSignedUrl(p.storage_path, 3600)
      if (data) urlMap[p.id] = data.signedUrl
    }))
    setPhotoUrls(urlMap)

    const { data: favs } = await supabase
      .from('favourites').select('photo_id').eq('gallery_id', gal.id).eq('session_token', sessionToken)
    setFavourites(new Set(favs?.map(f => f.photo_id) ?? []))
    setUnlocked(true)
  }

  async function tryPassword() {
    if (password === gallery.password_hash) {
      await loadPhotos(gallery)
      setWrongPw(false)
    } else {
      setWrongPw(true)
    }
  }

  async function toggleFavourite(e, photoId) {
    e.stopPropagation()
    if (favourites.has(photoId)) {
      await supabase.from('favourites').delete().eq('photo_id', photoId).eq('session_token', sessionToken)
      setFavourites(prev => { const s = new Set(prev); s.delete(photoId); return s })
    } else {
      await supabase.from('favourites').insert({ gallery_id: gallery.id, photo_id: photoId, session_token: sessionToken })
      setFavourites(prev => new Set([...prev, photoId]))
    }
  }

  function openLightbox(photo, index) {
    setLightbox(photo)
    setLightboxIndex(index)
  }

  function lightboxNav(dir) {
    const next = lightboxIndex + dir
    if (next < 0 || next >= displayPhotos.length) return
    setLightbox(displayPhotos[next])
    setLightboxIndex(next)
  }

  function downloadAll() {
    displayPhotos.forEach(p => {
      if (photoUrls[p.id]) {
        const a = document.createElement('a')
        a.href = photoUrls[p.id]
        a.download = p.filename ?? 'photo.jpg'
        a.click()
      }
    })
  }

  // Sections
  const sections = [...new Set(photos.map(p => p.section).filter(Boolean))]
  const hasSections = sections.length > 0

  let displayPhotos = photos
  if (showFavsOnly) displayPhotos = displayPhotos.filter(p => favourites.has(p.id))
  if (activeSection !== 'all') displayPhotos = displayPhotos.filter(p => p.section === activeSection)

  if (loading) return <div style={loadingPage}><div className="spinner" /></div>
  if (!gallery) return <div style={loadingPage}><p style={{ color: 'var(--muted)' }}>Gallery not found or has expired.</p></div>

  if (gallery.password_hash && !unlocked) {
    return (
      <div style={loadingPage}>
        <div style={pwCard}>
          <div style={logoStyle}>frame<span style={{ color: 'var(--warm)' }}>.</span>up</div>
          <h2 style={pwTitle}>{gallery.name}</h2>
          {gallery.client_name && <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{gallery.client_name}</p>}
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem' }}>This gallery is password protected.</p>
          <input className="input" type="password" placeholder="Enter password" value={password}
            onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && tryPassword()} />
          {wrongPw && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Incorrect password.</p>}
          <button className="btn btn-gold" onClick={tryPassword} style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}>
            View gallery →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={header}>
        <div>
          <h1 style={galleryTitle}>{gallery.name}</h1>
          {gallery.client_name && <p style={galleryClient}>{gallery.client_name}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{displayPhotos.length} photos</span>
          {gallery.allow_favourites && (
            <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
              onClick={() => { setShowFavsOnly(v => !v); setActiveSection('all') }}>
              {showFavsOnly ? 'Show all' : `♥ Favourites (${favourites.size})`}
            </button>
          )}
          {gallery.allow_downloads && (
            <button className="btn btn-gold" style={{ fontSize: '0.8rem' }} onClick={downloadAll}>
              ↓ Download all
            </button>
          )}
        </div>
      </header>

      {/* Section tabs */}
      {hasSections && !showFavsOnly && (
        <div style={sectionBar}>
          <button
            onClick={() => setActiveSection('all')}
            style={{ ...sectionTab, ...(activeSection === 'all' ? sectionTabActive : {}) }}
          >
            All ({photos.length})
          </button>
          {sections.map(sec => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              style={{ ...sectionTab, ...(activeSection === sec ? sectionTabActive : {}) }}
            >
              {sec} ({photos.filter(p => p.section === sec).length})
            </button>
          ))}
        </div>
      )}

      {/* Photo grid */}
      {displayPhotos.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>
          No photos here yet.
        </div>
      ) : (
        <div style={grid}>
          {displayPhotos.map((p, i) => (
            <div key={p.id} style={cell} onClick={() => openLightbox(p, i)}>
              {photoUrls[p.id]
                ? <img src={photoUrls[p.id]} alt={p.filename} style={img} />
                : <div style={{ ...img, background: 'var(--surface2)' }} />
              }
              {gallery.allow_favourites && (
                <button
                  style={{ ...favBtn, ...(favourites.has(p.id) ? favActive : {}) }}
                  onClick={e => toggleFavourite(e, p.id)}
                >
                  {favourites.has(p.id) ? '♥' : '♡'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div style={lightboxOverlay} onClick={() => setLightbox(null)}>
          <button style={lightboxClose} onClick={() => setLightbox(null)}>✕</button>

          {/* Prev/Next */}
          {lightboxIndex > 0 && (
            <button style={{ ...lightboxNav2, left: '1rem' }} onClick={e => { e.stopPropagation(); lightboxNav(-1) }}>‹</button>
          )}
          {lightboxIndex < displayPhotos.length - 1 && (
            <button style={{ ...lightboxNav2, right: '1rem' }} onClick={e => { e.stopPropagation(); lightboxNav(1) }}>›</button>
          )}

          <img src={photoUrls[lightbox.id]} alt={lightbox.filename} style={lightboxImg} onClick={e => e.stopPropagation()} />

          <div style={lightboxFooter} onClick={e => e.stopPropagation()}>
            {lightbox.section && <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{lightbox.section}</span>}
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{lightboxIndex + 1} / {displayPhotos.length}</span>
            {gallery.allow_downloads && (
              <a href={photoUrls[lightbox.id]} download={lightbox.filename}
                className="btn btn-gold" style={{ fontSize: '0.8rem' }}
                onClick={e => e.stopPropagation()}>
                ↓ Download
              </a>
            )}
          </div>
        </div>
      )}

      <footer style={footerStyle}>
        <span style={{ fontFamily: "'DM Serif Display', serif" }}>frame<span style={{ color: 'var(--warm)' }}>.</span>up</span>
      </footer>
    </div>
  )
}

const loadingPage = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: 'var(--bg)' }
const header = { padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', flexWrap: 'wrap', gap: '1rem' }
const galleryTitle = { fontFamily: "'DM Serif Display', serif", fontSize: '1.4rem', color: 'var(--ink)' }
const galleryClient = { fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.2rem' }
const sectionBar = { display: 'flex', gap: '0', overflowX: 'auto', borderBottom: '1px solid var(--border)', background: 'var(--surface)', padding: '0 1.5rem' }
const sectionTab = { padding: '0.75rem 1.25rem', fontSize: '0.875rem', color: 'var(--muted)', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', marginBottom: '-1px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s' }
const sectionTabActive = { color: 'var(--warm)', borderBottomColor: 'var(--warm)', fontWeight: 500 }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '3px', padding: '3px' }
const cell = { position: 'relative', aspectRatio: '1', overflow: 'hidden', background: 'var(--surface2)', cursor: 'pointer' }
const img  = { width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.2s' }
const favBtn = { position: 'absolute', top: '8px', right: '8px', width: '30px', height: '30px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', color: '#fff', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }
const favActive = { background: 'var(--warm)', color: '#0E0D0B' }
const lightboxOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem', flexDirection: 'column', gap: '1rem' }
const lightboxClose = { position: 'fixed', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', fontSize: '0.9rem', cursor: 'pointer' }
const lightboxNav2 = { position: 'fixed', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '44px', height: '44px', borderRadius: '50%', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const lightboxImg = { maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: '4px' }
const lightboxFooter = { display: 'flex', alignItems: 'center', gap: '1rem' }
const pwCard = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '380px' }
const logoStyle = { fontFamily: "'DM Serif Display', serif", fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--ink)' }
const pwTitle = { fontSize: '1.3rem', fontFamily: "'DM Serif Display', serif", color: 'var(--ink)', marginBottom: '0.35rem' }
const footerStyle = { padding: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--muted)', borderTop: '1px solid var(--border)', marginTop: '2rem' }
