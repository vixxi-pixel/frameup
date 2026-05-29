import { useState, useEffect, useRef } from 'react'

const PHOTOS = [
  { id: 1,  section: 'Getting Ready', color: '#2A2218', accent: '#3A3020' },
  { id: 2,  section: 'Getting Ready', color: '#221E15', accent: '#322A1C' },
  { id: 3,  section: 'Getting Ready', color: '#2E2819', accent: '#3E3422' },
  { id: 4,  section: 'First Look',    color: '#252015', accent: '#35301E' },
  { id: 5,  section: 'First Look',    color: '#201D12', accent: '#302818' },
  { id: 6,  section: 'First Look',    color: '#241A11', accent: '#342419' },
  { id: 7,  section: 'Ceremony',      color: '#1C1810', accent: '#2C2418' },
  { id: 8,  section: 'Ceremony',      color: '#2C2418', accent: '#3C3020' },
  { id: 9,  section: 'Ceremony',      color: '#221B12', accent: '#322418' },
  { id: 10, section: 'Ceremony',      color: '#1E1B10', accent: '#2E2818' },
  { id: 11, section: 'Portraits',     color: '#271E13', accent: '#372818' },
  { id: 12, section: 'Portraits',     color: '#231C11', accent: '#332618' },
  { id: 13, section: 'Portraits',     color: '#2A2016', accent: '#3A2C1E' },
  { id: 14, section: 'Portraits',     color: '#1F1C12', accent: '#2F2818' },
  { id: 15, section: 'Reception',     color: '#282018', accent: '#382C20' },
  { id: 16, section: 'Reception',     color: '#201C14', accent: '#30281C' },
  { id: 17, section: 'First Dance',   color: '#2C2219', accent: '#3C2E22' },
  { id: 18, section: 'First Dance',   color: '#241C14', accent: '#34281C' },
  { id: 19, section: 'First Dance',   color: '#221A12', accent: '#32261A' },
  { id: 20, section: 'Details',       color: '#201E14', accent: '#302A1C' },
  { id: 21, section: 'Details',       color: '#262018', accent: '#362C20' },
  { id: 22, section: 'Details',       color: '#1E1C13', accent: '#2E281B' },
]

const SECTIONS = ['All', ...new Set(PHOTOS.map(p => p.section))]

// Fake photo placeholder using canvas-style gradients
function PhotoCell({ photo, onClick, isFav, onFav }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', aspectRatio: '1', cursor: 'pointer', overflow: 'hidden',
        background: `linear-gradient(135deg, ${photo.color} 0%, ${photo.accent} 100%)`,
      }}
    >
      {/* Simulated photo content */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 40% 35%, rgba(255,255,255,0.04) 0%, transparent 60%)`,
      }} />
      <div style={{
        position: 'absolute', bottom: '18%', left: '15%', right: '15%', height: '35%',
        background: `rgba(255,255,255,0.025)`, borderRadius: '2px',
      }} />
      <button
        onClick={e => { e.stopPropagation(); onFav(photo.id) }}
        style={{
          position: 'absolute', top: 8, right: 8,
          width: 28, height: 28,
          background: isFav ? 'var(--warm)' : 'rgba(0,0,0,0.5)',
          border: 'none', borderRadius: '50%',
          color: isFav ? '#0E0D0B' : '#fff',
          fontSize: '0.85rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: isFav ? 1 : 0,
          transition: 'opacity 0.15s, background 0.15s',
        }}
        className="fav-btn"
      >
        {isFav ? '♥' : '♡'}
      </button>
      <style>{`.fav-btn-wrap:hover .fav-btn { opacity: 1 !important; }`}</style>
    </div>
  )
}

export default function SampleGallery() {
  const [activeSection, setActiveSection] = useState('All')
  const [favs, setFavs]                   = useState(new Set())
  const [showFavsOnly, setShowFavsOnly]   = useState(false)
  const [lightbox, setLightbox]           = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [slideshow, setSlideshow]         = useState(false)
  const [slideIndex, setSlideIndex]       = useState(0)
  const [slidePlaying, setSlidePlaying]   = useState(true)
  const [hoveredCell, setHoveredCell]     = useState(null)

  let display = PHOTOS
  if (showFavsOnly)         display = display.filter(p => favs.has(p.id))
  if (activeSection !== 'All') display = display.filter(p => p.section === activeSection)

  function toggleFav(id) {
    setFavs(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function openLightbox(photo, index) {
    setLightbox(photo)
    setLightboxIndex(index)
  }

  function lightboxNav(dir) {
    const next = lightboxIndex + dir
    if (next < 0 || next >= display.length) return
    setLightbox(display[next])
    setLightboxIndex(next)
  }

  useEffect(() => {
    if (!slideshow || !slidePlaying) return
    const t = setInterval(() => {
      setSlideIndex(i => {
        if (i >= display.length - 1) { setSlidePlaying(false); return i }
        return i + 1
      })
    }, 3000)
    return () => clearInterval(t)
  }, [slideshow, slidePlaying, display.length])

  useEffect(() => {
    function onKey(e) {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return

      if (slideshow) {
        if (e.key === 'Escape')     { setSlideshow(false); return }
        if (e.key === 'ArrowRight') { setSlideIndex(i => Math.min(i + 1, display.length - 1)); setSlidePlaying(false); return }
        if (e.key === 'ArrowLeft')  { setSlideIndex(i => Math.max(i - 1, 0)); setSlidePlaying(false); return }
        if (e.key === ' ')          { e.preventDefault(); setSlidePlaying(v => !v); return }
        return
      }

      if (lightbox) {
        if (e.key === 'Escape')     { setLightbox(null); return }
        if (e.key === 'ArrowRight') { lightboxNav(1); return }
        if (e.key === 'ArrowLeft')  { lightboxNav(-1); return }
        if (e.key === 'f' || e.key === 'F') { toggleFav(lightbox.id); return }
        return
      }

      if (e.key === 's' || e.key === 'S') { setSlideIndex(0); setSlidePlaying(true); setSlideshow(true); return }
      if (e.key === 'f' || e.key === 'F') { setShowFavsOnly(v => !v); return }
      if (e.key === 'Escape')             { setShowFavsOnly(false); setActiveSection('All'); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slideshow, lightbox, lightboxIndex, display, favs, slidePlaying])

  return (
    <div style={{ minHeight: '100vh', background: '#0E0D0B', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{
        padding: '1.25rem 2rem', borderBottom: '1px solid #2A2722',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#161512', flexWrap: 'wrap', gap: '1rem',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: '#F0EDE6', letterSpacing: '-0.02em' }}>
            Sarah & James
          </div>
          <div style={{ fontSize: '0.8rem', color: '#7A756B', marginTop: '1px' }}>
            Wedding Day · October 2024 · {display.length} photos
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setSlideIndex(0); setSlidePlaying(true); setSlideshow(true) }}
            style={ghostBtn}
          >
            ▶ Slideshow
          </button>
          <button
            onClick={() => { setShowFavsOnly(v => !v); setActiveSection('All') }}
            style={ghostBtn}
          >
            {showFavsOnly ? 'Show all' : `♥ Favourites (${favs.size})`}
          </button>
          <button style={goldBtn}>↓ Download all</button>
        </div>
      </header>

      {/* Keyboard hints */}
      <div style={{ padding: '0.5rem 1.5rem', background: '#1E1C18', borderBottom: '1px solid #2A2722', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {[['← →','Navigate'],['F','Favourite'],['S','Slideshow'],['Esc','Close']].map(([k,l]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <kbd style={{ background: '#252320', border: '1px solid #333028', borderRadius: '4px', padding: '1px 6px', fontSize: '0.65rem', color: '#7A756B', fontFamily: 'inherit' }}>{k}</kbd>
            <span style={{ fontSize: '0.7rem', color: '#5A554C' }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div style={{
        display: 'flex', overflowX: 'auto', borderBottom: '1px solid #2A2722',
        background: '#161512', padding: '0 1.5rem',
      }}>
        {SECTIONS.map(sec => (
          <button
            key={sec}
            onClick={() => { setActiveSection(sec); setShowFavsOnly(false) }}
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '0.875rem',
              color: activeSection === sec ? '#C8A97E' : '#7A756B',
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${activeSection === sec ? '#C8A97E' : 'transparent'}`,
              marginBottom: '-1px', cursor: 'pointer',
              fontFamily: "'DM Sans', system-ui", whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {sec}
            {sec !== 'All' && (
              <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', opacity: 0.6 }}>
                ({PHOTOS.filter(p => p.section === sec).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Photo grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '3px', padding: '3px',
      }}>
        {display.map((p, i) => (
          <div
            key={p.id}
            onMouseEnter={() => setHoveredCell(p.id)}
            onMouseLeave={() => setHoveredCell(null)}
            style={{ position: 'relative' }}
          >
            <div
              onClick={() => openLightbox(p, i)}
              style={{
                position: 'relative', aspectRatio: '1', cursor: 'pointer', overflow: 'hidden',
                background: `linear-gradient(135deg, ${p.color} 0%, ${p.accent} 100%)`,
              }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: `radial-gradient(ellipse at 40% 35%, rgba(255,255,255,0.04) 0%, transparent 60%)`,
              }} />
              <div style={{
                position: 'absolute', bottom: '18%', left: '15%', right: '15%', height: '35%',
                background: `rgba(255,255,255,0.025)`, borderRadius: '2px',
              }} />
              {/* Section badge */}
              <div style={{
                position: 'absolute', bottom: 6, left: 6,
                background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.7)',
                fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px',
                fontWeight: 500, letterSpacing: '0.03em',
              }}>
                {p.section}
              </div>
            </div>
            {/* Fav button */}
            <button
              onClick={() => toggleFav(p.id)}
              style={{
                position: 'absolute', top: 8, right: 8,
                width: 28, height: 28,
                background: favs.has(p.id) ? '#C8A97E' : 'rgba(0,0,0,0.55)',
                border: 'none', borderRadius: '50%',
                color: favs.has(p.id) ? '#0E0D0B' : '#fff',
                fontSize: '0.85rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: favs.has(p.id) || hoveredCell === p.id ? 1 : 0,
                transition: 'opacity 0.15s, background 0.15s',
              }}
            >
              {favs.has(p.id) ? '♥' : '♡'}
            </button>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, flexDirection: 'column', gap: '1rem',
          }}
        >
          <button onClick={() => setLightbox(null)} style={closeBtn}>✕</button>
          {lightboxIndex > 0 && (
            <button style={{ ...navBtn, left: '1rem' }} onClick={e => { e.stopPropagation(); lightboxNav(-1) }}>‹</button>
          )}
          {lightboxIndex < display.length - 1 && (
            <button style={{ ...navBtn, right: '1rem' }} onClick={e => { e.stopPropagation(); lightboxNav(1) }}>›</button>
          )}

          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(600px, 85vw)', aspectRatio: '4/3',
              background: `linear-gradient(135deg, ${lightbox.color} 0%, ${lightbox.accent} 100%)`,
              borderRadius: '4px', position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 40% 35%, rgba(255,255,255,0.05) 0%, transparent 60%)' }} />
            <div style={{ position: 'absolute', bottom: '18%', left: '15%', right: '15%', height: '35%', background: 'rgba(255,255,255,0.03)', borderRadius: '2px' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} onClick={e => e.stopPropagation()}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
              {lightbox.section} · {lightboxIndex + 1} / {display.length}
            </span>
            <button onClick={() => toggleFav(lightbox.id)} style={{
              ...ghostBtn,
              color: favs.has(lightbox.id) ? '#C8A97E' : 'rgba(255,255,255,0.6)',
              borderColor: favs.has(lightbox.id) ? '#8B6E4A' : 'rgba(255,255,255,0.2)',
            }}>
              {favs.has(lightbox.id) ? '♥ Favourited' : '♡ Favourite'}
            </button>
            <button style={goldBtn}>↓ Download</button>
          </div>
        </div>
      )}

      {/* Slideshow */}
      {slideshow && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            padding: '1rem 1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
          }}>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: '#fff' }}>Sarah & James</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                {slideIndex + 1} / {display.length} · {display[slideIndex]?.section}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={slideCtrl} onClick={() => setSlideIndex(i => Math.max(0, i - 1))}>‹</button>
              <button style={slideCtrl} onClick={() => setSlidePlaying(v => !v)}>{slidePlaying ? '⏸' : '▶'}</button>
              <button style={slideCtrl} onClick={() => setSlideIndex(i => Math.min(display.length - 1, i + 1))}>›</button>
              <button style={{ ...slideCtrl, marginLeft: '0.5rem' }} onClick={() => setSlideshow(false)}>✕</button>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'rgba(255,255,255,0.15)' }}>
            <div style={{ height: '100%', background: '#C8A97E', width: `${((slideIndex + 1) / display.length) * 100}%`, transition: slidePlaying ? 'width 3s linear' : 'none' }} />
          </div>

          {display[slideIndex] && (
            <div style={{
              width: 'min(700px, 90vw)', aspectRatio: '4/3',
              background: `linear-gradient(135deg, ${display[slideIndex].color} 0%, ${display[slideIndex].accent} 100%)`,
              borderRadius: '4px', position: 'relative', overflow: 'hidden',
              animation: 'fadeIn 0.5s ease',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 40% 35%, rgba(255,255,255,0.05) 0%, transparent 60%)' }} />
              <div style={{ position: 'absolute', bottom: '18%', left: '15%', right: '15%', height: '35%', background: 'rgba(255,255,255,0.03)', borderRadius: '2px' }} />
            </div>
          )}

          {/* Thumbnail strip */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '0.75rem 1rem', display: 'flex', gap: '4px',
            overflowX: 'auto', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
            justifyContent: 'center',
          }}>
            {display.map((p, i) => (
              <div
                key={p.id}
                onClick={() => { setSlideIndex(i); setSlidePlaying(false) }}
                style={{
                  width: 44, height: 44, flexShrink: 0, borderRadius: '3px',
                  background: `linear-gradient(135deg, ${p.color} 0%, ${p.accent} 100%)`,
                  cursor: 'pointer', overflow: 'hidden',
                  outline: i === slideIndex ? '2px solid #C8A97E' : 'none',
                  opacity: i === slideIndex ? 1 : 0.45,
                  transition: 'opacity 0.2s',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid #2A2722', marginTop: '2rem' }}>
        <a href="/" style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: '#7A756B', textDecoration: 'none' }}>
          frame<span style={{ color: '#C8A97E' }}>.</span>up
        </a>
        <div style={{ fontSize: '0.75rem', color: '#5A554C', marginTop: '0.4rem' }}>
          Gallery delivery for photographers
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98) } to { opacity: 1; transform: scale(1) } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0E0D0B; }
        ::-webkit-scrollbar-thumb { background: #333028; border-radius: 3px; }
      `}</style>
    </div>
  )
}

const ghostBtn = {
  background: 'transparent', color: '#F0EDE6',
  border: '1px solid #333028', padding: '0.45rem 1rem',
  borderRadius: '100px', fontSize: '0.8rem', cursor: 'pointer',
  fontFamily: "'DM Sans', system-ui", transition: 'all 0.15s',
}
const goldBtn = {
  background: '#C8A97E', color: '#0E0D0B',
  border: 'none', padding: '0.45rem 1rem',
  borderRadius: '100px', fontSize: '0.8rem',
  fontWeight: 500, cursor: 'pointer',
  fontFamily: "'DM Sans', system-ui",
}
const closeBtn = {
  position: 'fixed', top: '1.5rem', right: '1.5rem',
  background: 'rgba(255,255,255,0.1)', border: 'none',
  color: '#fff', width: '36px', height: '36px',
  borderRadius: '50%', fontSize: '0.9rem', cursor: 'pointer',
}
const navBtn = {
  position: 'fixed', top: '50%', transform: 'translateY(-50%)',
  background: 'rgba(255,255,255,0.1)', border: 'none',
  color: '#fff', width: '44px', height: '44px',
  borderRadius: '50%', fontSize: '1.5rem', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const slideCtrl = {
  background: 'rgba(255,255,255,0.1)', border: 'none',
  color: '#fff', width: '34px', height: '34px',
  borderRadius: '50%', fontSize: '1rem', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'inherit',
}
