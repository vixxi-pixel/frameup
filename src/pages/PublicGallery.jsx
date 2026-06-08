import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getR2SignedUrl } from '../lib/r2'

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
  const [zipping, setZipping] = useState(false)
  const [zipProgress, setZipProgress] = useState(0)
  const [slideshow, setSlideshow] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [slidePlaying, setSlidePlaying] = useState(true)
  const [watermarkSrc, setWatermarkSrc] = useState(null)
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.35)
  const [watermarkPosition, setWatermarkPosition] = useState('bottom-right')
  const sessionToken = getSessionToken()

  useEffect(() => { loadGallery() }, [slug])

  async function loadGallery() {
    const { data: gal } = await supabase
      .from('galleries').select('*').eq('slug', slug).eq('is_active', true).single()
    if (!gal) { setLoading(false); return }
    setGallery(gal)
    await supabase.from('gallery_views').insert({ gallery_id: gal.id })
    if (!gal.password_hash) await loadPhotos(gal)

    // Load watermark if enabled
    if (gal.watermark_enabled) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('logo_url, watermark_opacity, watermark_position')
        .eq('id', gal.photographer_id)
        .single()
      if (prof?.logo_url) {
        try {
          const signedUrl = await getR2SignedUrl(prof.logo_url, 3600)
          setWatermarkSrc(signedUrl)
          setWatermarkOpacity(prof.watermark_opacity ?? 0.35)
          setWatermarkPosition(prof.watermark_position ?? 'bottom-right')
        } catch (e) { console.error('Watermark URL error', e) }
      }
    }

    setLoading(false)
  }

  async function loadPhotos(gal) {
    // Fetch ALL photos in pages of 1000
    let allPhotos = []
    let page = 0
    const pageSize = 1000
    while (true) {
      const { data: batch } = await supabase
        .from('photos')
        .select('*')
        .eq('gallery_id', gal.id)
        .order('sort_order')
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (!batch || batch.length === 0) break
      allPhotos = [...allPhotos, ...batch]
      if (batch.length < pageSize) break
      page++
    }
    setPhotos(allPhotos)

    // Load signed URLs in batches of 50, progressively
    const batchSize = 50
    for (let i = 0; i < allPhotos.length; i += batchSize) {
      const batch = allPhotos.slice(i, i + batchSize)
      const urlMap = {}
      await Promise.all(batch.map(async p => {
        try {
          const url = await getR2SignedUrl(p.storage_path, 3600)
          urlMap[p.id] = url
        } catch (e) { console.error('Signed URL error', e) }
      }))
      setPhotoUrls(prev => ({ ...prev, ...urlMap }))
    }

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

  // Keyboard shortcuts
  useEffect(() => {
    // Compute displayPhotos inline to avoid circular reference
    let dp = photos
    if (showFavsOnly) dp = dp.filter(p => favourites.has(p.id))
    if (activeSection !== 'all') dp = dp.filter(p => p.section === activeSection)

    function onKey(e) {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return

      if (slideshow) {
        if (e.key === 'Escape')      { setSlideshow(false); return }
        if (e.key === 'ArrowRight')  { setSlideIndex(i => Math.min(i + 1, dp.length - 1)); setSlidePlaying(false); return }
        if (e.key === 'ArrowLeft')   { setSlideIndex(i => Math.max(i - 1, 0)); setSlidePlaying(false); return }
        if (e.key === ' ')           { e.preventDefault(); setSlidePlaying(v => !v); return }
        return
      }

      if (lightbox) {
        if (e.key === 'Escape')     { setLightbox(null); return }
        if (e.key === 'ArrowRight') {
          const next = lightboxIndex + 1
          if (next < dp.length) { setLightbox(dp[next]); setLightboxIndex(next) }
          return
        }
        if (e.key === 'ArrowLeft') {
          const next = lightboxIndex - 1
          if (next >= 0) { setLightbox(dp[next]); setLightboxIndex(next) }
          return
        }
        if (e.key === 'f' || e.key === 'F') {
          if (gallery?.allow_favourites) toggleFavourite({ stopPropagation: () => {} }, lightbox.id)
          return
        }
        if (e.key === 'd' || e.key === 'D') {
          if (gallery?.allow_downloads && photoUrls[lightbox.id]) {
            const a = document.createElement('a')
            a.href = photoUrls[lightbox.id]
            a.download = lightbox.filename || 'photo.jpg'
            a.click()
          }
          return
        }
        return
      }

      if (e.key === 's' || e.key === 'S') { openSlideshow(); return }
      if (e.key === 'f' || e.key === 'F') { setShowFavsOnly(v => !v); return }
      if (e.key === 'Escape')             { setShowFavsOnly(false); setActiveSection('all'); return }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slideshow, lightbox, lightboxIndex, photos, showFavsOnly, activeSection, gallery, photoUrls, favourites, slidePlaying])

  // Slideshow auto-advance
  useEffect(() => {
    if (!slideshow || !slidePlaying) return
    const timer = setInterval(() => {
      setSlideIndex(i => {
        const total = photos.filter(p =>
          (!showFavsOnly || favourites.has(p.id)) &&
          (activeSection === 'all' || p.section === activeSection)
        ).length
        if (i >= total - 1) { setSlidePlaying(false); return i }
        return i + 1
      })
    }, 4000)
    return () => clearInterval(timer)
  }, [slideshow, slidePlaying, photos, showFavsOnly, activeSection, favourites])

  function openSlideshow() {
    setSlideIndex(0)
    setSlidePlaying(true)
    setSlideshow(true)
  }

  async function downloadAll() {
    if (zipping) return
    setZipping(true)
    setZipProgress(0)

    try {
      // Dynamically import JSZip
      const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default
      const zip = new JSZip()
      const folder = zip.folder(gallery.name || 'gallery')

      const photos = displayPhotos.filter(p => photoUrls[p.id])
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i]
        try {
          const res = await fetch(photoUrls[p.id])
          const blob = await res.blob()
          folder.file(p.filename || `photo-${i + 1}.jpg`, blob)
        } catch (e) {
          console.error('Failed to fetch photo', p.filename, e)
        }
        setZipProgress(Math.round(((i + 1) / photos.length) * 100))
      }

      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `${gallery.name || 'gallery'}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Zip failed:', err)
      alert('Download failed. Please try again.')
    }

    setZipping(false)
    setZipProgress(0)
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
          {displayPhotos.length > 0 && (
            <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }} onClick={openSlideshow}>
              ▶ Slideshow
            </button>
          )}
          {gallery.allow_favourites && (
            <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
              onClick={() => { setShowFavsOnly(v => !v); setActiveSection('all') }}>
              {showFavsOnly ? 'Show all' : `♥ Favourites (${favourites.size})`}
            </button>
          )}
          {gallery.allow_downloads && (
            <button className="btn btn-gold" style={{ fontSize: '0.8rem', minWidth: '120px' }} onClick={downloadAll} disabled={zipping}>
              {zipping ? `Zipping… ${zipProgress}%` : '↓ Download all'}
            </button>
          )}
        </div>
      </header>

      {/* Keyboard shortcuts hint */}
      <div style={{
        padding: '0.5rem 2rem',
        background: 'var(--surface2)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
      }}>
        {[
          { key: '← →', label: 'Navigate' },
          { key: 'F', label: 'Favourite' },
          { key: 'S', label: 'Slideshow' },
          { key: 'D', label: 'Download' },
          { key: 'Esc', label: 'Close' },
        ].map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <kbd style={{
              background: 'var(--surface3)', border: '1px solid var(--border2)',
              borderRadius: '4px', padding: '1px 6px',
              fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'inherit',
              letterSpacing: '0.02em',
            }}>{s.key}</kbd>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted2)' }}>{s.label}</span>
          </div>
        ))}
      </div>

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
              {photoUrls[p.id] ? (
                gallery.watermark_enabled && watermarkSrc ? (
                  <WatermarkedPhoto
                    src={photoUrls[p.id]}
                    logoSrc={watermarkSrc}
                    opacity={watermarkOpacity}
                    position={watermarkPosition}
                  />
                ) : (
                  <img src={photoUrls[p.id]} alt={p.filename} style={img} />
                )
              ) : (
                <div style={{ ...img, background: 'var(--surface2)' }} />
              )}
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

          {gallery.watermark_enabled && watermarkSrc ? (
            <div style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
              <img src={photoUrls[lightbox.id]} alt={lightbox.filename} style={lightboxImg} />
              <img
                src={watermarkSrc}
                alt="watermark"
                style={{
                  position: 'absolute',
                  ...getPositionStyle(watermarkPosition),
                  width: '20%',
                  maxWidth: '120px',
                  opacity: watermarkOpacity,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))',
                }}
              />
            </div>
          ) : (
            <img src={photoUrls[lightbox.id]} alt={lightbox.filename} style={lightboxImg} onClick={e => e.stopPropagation()} />
          )}

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

      {/* Slideshow */}
      {slideshow && (
        <div style={slideshowOverlay}>
          {/* Top bar */}
          <div style={slideshowTop}>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: '#fff' }}>{gallery.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                {slideIndex + 1} / {displayPhotos.length}
                {displayPhotos[slideIndex]?.section && ` · ${displayPhotos[slideIndex].section}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <button style={slideBtn} onClick={() => setSlideIndex(i => Math.max(0, i - 1))}>‹</button>
              <button style={slideBtn} onClick={() => setSlidePlaying(v => !v)}>
                {slidePlaying ? '⏸' : '▶'}
              </button>
              <button style={slideBtn} onClick={() => setSlideIndex(i => Math.min(displayPhotos.length - 1, i + 1))}>›</button>
              <button style={{ ...slideBtn, marginLeft: '0.5rem', fontSize: '1rem' }} onClick={() => setSlideshow(false)}>✕</button>
            </div>
          </div>

          {/* Progress bar */}
          <div style={slideProgressBar}>
            <div style={{ ...slideProgressFill, width: `${((slideIndex + 1) / displayPhotos.length) * 100}%`, transition: slidePlaying ? 'width 4s linear' : 'none' }} />
          </div>

          {/* Photo */}
          {displayPhotos[slideIndex] && photoUrls[displayPhotos[slideIndex].id] ? (
            <img
              key={slideIndex}
              src={photoUrls[displayPhotos[slideIndex].id]}
              alt=""
              style={slideshowImg}
            />
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>Loading…</div>
          )}

          {/* Thumbnail strip */}
          <div style={thumbStrip}>
            {displayPhotos.map((p, i) => (
              <div
                key={p.id}
                onClick={() => { setSlideIndex(i); setSlidePlaying(false) }}
                style={{
                  ...thumbCell,
                  outline: i === slideIndex ? '2px solid var(--warm)' : 'none',
                  opacity: i === slideIndex ? 1 : 0.5,
                }}
              >
                {photoUrls[p.id] && <img src={photoUrls[p.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <footer style={footerStyle}>
        <span style={{ fontFamily: "'DM Serif Display', serif" }}>frame<span style={{ color: 'var(--warm)' }}>.</span>up</span>
      </footer>
    </div>
  )
}

// CSS overlay watermark — no canvas, no CORS issues
function WatermarkedPhoto({ src, logoSrc, opacity, position }) {
  const posStyle = getPositionStyle(position)
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <img src={src} alt="" style={img} />
      <img
        src={logoSrc}
        alt="watermark"
        style={{
          position: 'absolute',
          ...posStyle,
          width: '25%',
          maxWidth: '120px',
          opacity,
          pointerEvents: 'none',
          userSelect: 'none',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
        }}
      />
    </div>
  )
}

function getPositionStyle(position) {
  const pad = '8px'
  switch (position) {
    case 'bottom-right':  return { bottom: pad, right: pad }
    case 'bottom-left':   return { bottom: pad, left: pad }
    case 'bottom-center': return { bottom: pad, left: '50%', transform: 'translateX(-50%)' }
    case 'top-right':     return { top: pad, right: pad }
    case 'top-left':      return { top: pad, left: pad }
    case 'center':        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    default:              return { bottom: pad, right: pad }
  }
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
const slideshowOverlay = { position: 'fixed', inset: 0, background: '#000', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }
const slideshowTop = { position: 'absolute', top: 0, left: 0, right: 0, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)', zIndex: 10 }
const slideBtn = { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }
const slideProgressBar = { position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'rgba(255,255,255,0.15)', zIndex: 11 }
const slideProgressFill = { height: '100%', background: 'var(--warm)' }
const slideshowImg = { maxWidth: '100vw', maxHeight: 'calc(100vh - 120px)', objectFit: 'contain', animation: 'fadeIn 0.6s ease' }
const thumbStrip = { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.75rem 1rem', display: 'flex', gap: '4px', overflowX: 'auto', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', justifyContent: 'center' }
const thumbCell = { width: '48px', height: '48px', flexShrink: 0, background: 'rgba(255,255,255,0.1)', cursor: 'pointer', borderRadius: '3px', overflow: 'hidden', transition: 'opacity 0.2s, outline 0.2s' }
