import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { uploadToR2, getR2SignedUrl, deleteFromR2 } from '../lib/r2'
import { useAuth } from '../hooks/useAuth'
import AppShell from '../components/AppShell'

const DEFAULT_SECTIONS = ['Getting Ready', 'First Look', 'Ceremony', 'Portraits', 'Reception', 'First Dance', 'Details']

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
  const [activeSection, setActiveSection] = useState('all')
  const [assigningSection, setAssigningSection] = useState(null)
  const [newSectionName, setNewSectionName] = useState('')
  const [customSections, setCustomSections] = useState([])
  const [selectedPhotos, setSelectedPhotos] = useState(new Set())
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFiles, setUploadFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })

  useEffect(() => { loadGallery() }, [id])

  async function loadGallery() {
    const [{ data: gal }, { count }] = await Promise.all([
      supabase.from('galleries').select('*').eq('id', id).eq('photographer_id', user.id).single(),
      supabase.from('gallery_views').select('*', { count: 'exact', head: true }).eq('gallery_id', id),
    ])
    setGallery(gal)
    setViews(count ?? 0)

    // Fetch ALL photos in pages of 1000 (Supabase default limit)
    let allPhotos = []
    let page = 0
    const pageSize = 1000
    while (true) {
      const { data: batch } = await supabase
        .from('photos')
        .select('*')
        .eq('gallery_id', id)
        .order('sort_order')
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (!batch || batch.length === 0) break
      allPhotos = [...allPhotos, ...batch]
      if (batch.length < pageSize) break
      page++
    }

    setPhotos(allPhotos)
    setLoading(false)

    // Derive custom sections
    if (allPhotos.length) {
      const secs = [...new Set(allPhotos.map(p => p.section).filter(Boolean))]
      setCustomSections(secs)
      // Load signed URLs in batches of 50 to avoid overwhelming the API
      const urlMap = {}
      const batchSize = 50
      for (let i = 0; i < Math.min(allPhotos.length, 200); i += batchSize) {
        const batch = allPhotos.slice(i, i + batchSize)
        await Promise.all(batch.map(async p => {
          try {
            const url = await getR2SignedUrl(p.storage_path, 3600)
            urlMap[p.id] = url
          } catch (e) { console.error('Signed URL error', e) }
        }))
        setPhotoUrls(prev => ({ ...prev, ...urlMap }))
      }
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/g/${gallery.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function toggleActive() {
    const { data } = await supabase.from('galleries').update({ is_active: !gallery.is_active }).eq('id', id).select().single()
    setGallery(data)
  }

  async function toggleWatermark() {
    const { data } = await supabase.from('galleries').update({ watermark_enabled: !gallery.watermark_enabled }).eq('id', id).select().single()
    setGallery(data)
  }

  async function deleteGallery() {
    if (!window.confirm('Delete this gallery and all its photos? This cannot be undone.')) return
    await supabase.from('galleries').delete().eq('id', id)
    navigate('/galleries')
  }

  async function deletePhoto(photo) {
    try { await deleteFromR2(photo.storage_path) } catch (e) { console.error('R2 delete error', e) }
    await supabase.from('photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
  }

  async function uploadMorePhotos() {
    if (!uploadFiles.length) return
    setUploading(true)
    setUploadProgress({ done: 0, total: uploadFiles.length })
    const newPhotos = []
    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i]
      const path = `${user.id}/${gallery.id}/${Date.now()}-${file.name}`
      try {
        await uploadToR2(file, path)
        const { data: photo } = await supabase.from('photos').insert({
          gallery_id: gallery.id,
          storage_path: path,
          filename: file.name,
          size_bytes: file.size,
          sort_order: photos.length + i,
        }).select().single()
        if (photo) {
          const url = await getR2SignedUrl(path, 3600)
          newPhotos.push({ photo, url })
        }
      } catch (err) {
        console.error('Upload error:', err)
      }
      setUploadProgress({ done: i + 1, total: uploadFiles.length })
    }
    setPhotos(prev => [...prev, ...newPhotos.map(n => n.photo)])
    setPhotoUrls(prev => {
      const m = { ...prev }
      newPhotos.forEach(n => { if (n.url) m[n.photo.id] = n.url })
      return m
    })
    setUploadFiles([])
    setUploading(false)
    setShowUpload(false)
  }

  const lastSelectedIndex = useRef(null)

  function toggleSelectPhoto(photoId, e) {
    const currentIndex = displayPhotos.findIndex(p => p.id === photoId)

    if (e.shiftKey && lastSelectedIndex.current !== null) {
      // Shift-click: select range between last selected and current
      const start = Math.min(lastSelectedIndex.current, currentIndex)
      const end   = Math.max(lastSelectedIndex.current, currentIndex)
      const rangeIds = displayPhotos.slice(start, end + 1).map(p => p.id)
      setSelectedPhotos(prev => {
        const s = new Set(prev)
        rangeIds.forEach(id => s.add(id))
        return s
      })
    } else {
      // Normal click: toggle single photo
      setSelectedPhotos(prev => {
        const s = new Set(prev)
        s.has(photoId) ? s.delete(photoId) : s.add(photoId)
        return s
      })
      lastSelectedIndex.current = currentIndex
    }
  }

  async function assignSectionToSelected(section) {
    if (selectedPhotos.size === 0) return
    const ids = [...selectedPhotos]
    await supabase.from('photos').update({ section }).in('id', ids)
    setPhotos(prev => prev.map(p => ids.includes(p.id) ? { ...p, section } : p))
    // Update custom sections list
    if (section && !customSections.includes(section)) {
      setCustomSections(prev => [...prev, section])
    }
    setSelectedPhotos(new Set())
    setAssigningSection(null)
  }

  async function addCustomSection() {
    const name = newSectionName.trim()
    if (!name || customSections.includes(name)) return
    setCustomSections(prev => [...prev, name])
    setNewSectionName('')
  }

  async function removeSectionFromPhotos(section) {
    if (!window.confirm(`Remove the "${section}" section label from all photos?`)) return
    await supabase.from('photos').update({ section: null }).eq('gallery_id', id).eq('section', section)
    setPhotos(prev => prev.map(p => p.section === section ? { ...p, section: null } : p))
    setCustomSections(prev => prev.filter(s => s !== section))
    if (activeSection === section) setActiveSection('all')
  }

  const allSections = [...new Set([...customSections, ...photos.map(p => p.section).filter(Boolean)])]
  const unsectionedPhotos = photos.filter(p => !p.section)
  const displayPhotos = activeSection === 'all'
    ? photos
    : activeSection === 'unsectioned'
    ? unsectionedPhotos
    : photos.filter(p => p.section === activeSection)

  if (loading) return <AppShell><div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></div></AppShell>
  if (!gallery) return <AppShell><p style={{ color: 'var(--muted)' }}>Gallery not found.</p></AppShell>

  return (
    <AppShell>
      <div style={{ maxWidth: 960 }}>
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
            <button
              className="btn btn-ghost"
              onClick={toggleWatermark}
              style={{ fontSize: '0.8rem', ...(gallery.watermark_enabled ? { color: 'var(--warm)', borderColor: 'var(--warm-dim)' } : {}) }}
            >
              {gallery.watermark_enabled ? '💧 Watermark on' : '💧 Watermark off'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowUpload(v => !v)} style={{ fontSize: '0.8rem' }}>
              ⬆ Add photos
            </button>
            <button className="btn btn-gold" onClick={copyLink}>
              {copied ? '✓ Copied!' : '🔗 Copy client link'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={statsRow}>
          {[
            { label: 'Photos',  value: photos.length },
            { label: 'Views',   value: views },
            { label: 'Sections', value: allSections.length || '—' },
            { label: 'Expires', value: gallery.expires_at ? new Date(gallery.expires_at).toLocaleDateString() : 'Never' },
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

        {/* Upload more photos */}
        {showUpload && (
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '1rem' }}>Add more photos</div>
            <label
              style={{ display: 'block', border: '2px dashed var(--border2)', borderRadius: '10px', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: 'var(--surface2)' }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setUploadFiles(Array.from(e.dataTransfer.files)) }}
            >
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => setUploadFiles(Array.from(e.target.files))} />
              <div style={{ fontSize: '1.5rem', opacity: 0.4, marginBottom: '0.5rem' }}>⬆️</div>
              {uploadFiles.length > 0
                ? <p style={{ color: 'var(--ink)', fontWeight: 500 }}>{uploadFiles.length} photo{uploadFiles.length !== 1 ? 's' : ''} ready to upload</p>
                : <><p style={{ fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.9rem' }}>Drop photos or click to browse</p><p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>JPG, PNG, HEIC · Any size</p></>
              }
            </label>
            {uploading && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.35rem' }}>Uploading {uploadProgress.done} / {uploadProgress.total}…</div>
                <div style={{ height: '4px', background: 'var(--surface2)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--warm)', width: `${(uploadProgress.done / uploadProgress.total) * 100}%`, transition: 'width 0.2s' }} />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => { setShowUpload(false); setUploadFiles([]) }} style={{ fontSize: '0.8rem' }}>Cancel</button>
              <button className="btn btn-gold" onClick={uploadMorePhotos} disabled={!uploadFiles.length || uploading} style={{ fontSize: '0.8rem' }}>
                {uploading ? 'Uploading…' : `Upload ${uploadFiles.length > 0 ? uploadFiles.length + ' ' : ''}photo${uploadFiles.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* Sections manager */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--ink)' }}>Sections</span>
            {selectedPhotos.size > 0 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--warm)' }}>
                {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>

          {/* Section pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {allSections.map(sec => (
              <div key={sec} style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                <button
                  onClick={() => selectedPhotos.size > 0 ? assignSectionToSelected(sec) : setActiveSection(sec)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '100px 0 0 100px',
                    border: '1px solid var(--border2)',
                    borderRight: 'none',
                    background: activeSection === sec ? 'var(--warm-bg)' : 'transparent',
                    color: activeSection === sec ? 'var(--warm)' : 'var(--muted)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {sec}
                  <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', opacity: 0.7 }}>
                    ({photos.filter(p => p.section === sec).length})
                  </span>
                </button>
                <button
                  onClick={() => removeSectionFromPhotos(sec)}
                  style={{
                    padding: '0.35rem 0.5rem',
                    borderRadius: '0 100px 100px 0',
                    border: '1px solid var(--border2)',
                    background: 'transparent',
                    color: 'var(--muted2)',
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  title="Remove section"
                >✕</button>
              </div>
            ))}
          </div>

          {/* Quick-add from defaults */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick add</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {DEFAULT_SECTIONS.filter(s => !allSections.includes(s)).map(s => (
                <button
                  key={s}
                  onClick={() => setCustomSections(prev => [...prev, s])}
                  style={{ padding: '0.25rem 0.65rem', borderRadius: '100px', border: '1px dashed var(--border2)', background: 'transparent', color: 'var(--muted2)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {/* Custom section input */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              placeholder="Custom section name..."
              value={newSectionName}
              onChange={e => setNewSectionName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomSection()}
              style={{ flex: 1, fontSize: '0.825rem' }}
            />
            <button className="btn btn-ghost" onClick={addCustomSection} style={{ fontSize: '0.8rem', flexShrink: 0 }}>Add</button>
          </div>
        </div>

        {/* Photo grid */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={tableHeader}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Filter tabs */}
              {[{ key: 'all', label: `All (${photos.length})` },
                ...allSections.map(s => ({ key: s, label: `${s} (${photos.filter(p => p.section === s).length})` })),
                unsectionedPhotos.length > 0 && { key: 'unsectioned', label: `Unsectioned (${unsectionedPhotos.length})` }
              ].filter(Boolean).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveSection(tab.key)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '100px',
                    border: '1px solid var(--border2)',
                    background: activeSection === tab.key ? 'var(--warm-bg)' : 'transparent',
                    color: activeSection === tab.key ? 'var(--warm)' : 'var(--muted)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {selectedPhotos.size > 0 && (
                <>
                  <select
                    onChange={e => e.target.value && assignSectionToSelected(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '6px', color: 'var(--ink)', fontFamily: 'inherit', cursor: 'pointer' }}
                    defaultValue=""
                  >
                    <option value="" disabled>Assign to section…</option>
                    {allSections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="btn btn-ghost" onClick={() => setSelectedPhotos(new Set())} style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
                    Clear
                  </button>
                </>
              )}
              <button
                className="btn btn-ghost"
                onClick={() => {
                  if (selectedPhotos.size === displayPhotos.length) {
                    setSelectedPhotos(new Set())
                  } else {
                    setSelectedPhotos(new Set(displayPhotos.map(p => p.id)))
                  }
                }}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
              >
                {selectedPhotos.size === displayPhotos.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
          </div>

          {/* Selection hint */}
          {photos.length > 0 && (
            <div style={{ padding: '0.5rem 1.25rem', fontSize: '0.75rem', color: 'var(--muted2)', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
              Click to select · <strong>Shift+click</strong> to select a range · Select all with the button above
            </div>
          )}

          {displayPhotos.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
              No photos in this section yet.
            </div>
          ) : (
            <div style={photoGrid}>
              {displayPhotos.map(p => (
                <div
                  key={p.id}
                  style={{
                    ...photoCell,
                    outline: selectedPhotos.has(p.id) ? '2px solid var(--warm)' : 'none',
                    outlineOffset: '-2px',
                  }}
                  onClick={e => toggleSelectPhoto(p.id, e)}
                >
                  {photoUrls[p.id]
                    ? <img src={photoUrls[p.id]} alt={p.filename} style={photoImg} />
                    : <div style={{ ...photoImg, background: 'var(--surface2)' }} />
                  }
                  {/* Section badge */}
                  {p.section && (
                    <div style={sectionBadge}>{p.section}</div>
                  )}
                  {/* Selected overlay */}
                  {selectedPhotos.has(p.id) && (
                    <div style={selectedOverlay}>✓</div>
                  )}
                  <button
                    style={deletePhotoBtn}
                    onClick={e => { e.stopPropagation(); deletePhoto(p) }}
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
const tableHeader = { padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }
const photoGrid = { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', padding: '3px' }
const photoCell = { position: 'relative', aspectRatio: '1', overflow: 'hidden', background: 'var(--surface2)', cursor: 'pointer' }
const photoImg  = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
const sectionBadge = {
  position: 'absolute', bottom: '4px', left: '4px',
  background: 'rgba(0,0,0,0.65)', color: '#fff',
  fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px',
  fontWeight: 500, letterSpacing: '0.03em',
  pointerEvents: 'none',
}
const selectedOverlay = {
  position: 'absolute', inset: 0,
  background: 'rgba(200,169,126,0.3)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--warm)', fontSize: '1.5rem', fontWeight: 700,
  pointerEvents: 'none',
}
const deletePhotoBtn = {
  position: 'absolute', top: '4px', right: '4px',
  width: '20px', height: '20px',
  background: 'rgba(0,0,0,0.6)',
  color: '#fff', border: 'none', borderRadius: '50%',
  fontSize: '0.6rem', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
