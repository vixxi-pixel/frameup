import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AppShell from '../components/AppShell'

const FILTERS = ['All', 'Live', 'Inactive']

export default function GalleriesPage() {
  const { user } = useAuth()
  const [galleries, setGalleries] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('galleries')
      .select('*, photos(count)')
      .eq('photographer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setGalleries(data ?? [])
        setLoading(false)
      })
  }, [user])

  const filtered = galleries.filter(g => {
    if (filter === 'Live')     return g.is_active
    if (filter === 'Inactive') return !g.is_active
    return true
  })

  return (
    <AppShell>
      <div style={{ maxWidth: 960 }}>
        <div style={pageHeader}>
          <div>
            <h1 style={title}>Galleries</h1>
            <p style={subtitle}>All your client galleries in one place.</p>
          </div>
          <Link to="/galleries/new" className="btn btn-gold">+ New gallery</Link>
        </div>

        {/* Filter tabs */}
        <div style={tabBar}>
          {FILTERS.map(f => (
            <button
              key={f}
              style={{ ...tab, ...(filter === f ? tabActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f}
              {f === 'All'      && ` (${galleries.length})`}
              {f === 'Live'     && ` (${galleries.filter(g => g.is_active).length})`}
              {f === 'Inactive' && ` (${galleries.filter(g => !g.is_active).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={emptyState}>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>No galleries here yet.</p>
            <Link to="/galleries/new" className="btn btn-gold">Create a gallery</Link>
          </div>
        ) : (
          <div style={grid}>
            {filtered.map(g => (
              <Link key={g.id} to={`/galleries/${g.id}`} style={cardLink}>
                <div style={thumb} />
                <div style={cardBody}>
                  <div style={cardName}>{g.name}</div>
                  <div style={cardMeta}>
                    <span>{g.photos?.[0]?.count ?? 0} photos</span>
                    <span className={`badge ${g.is_active ? 'badge-live' : 'badge-expired'}`}>
                      {g.is_active ? 'Live' : 'Inactive'}
                    </span>
                  </div>
                  {g.client_name && <div style={clientName}>{g.client_name}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

const pageHeader = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }
const title    = { fontSize: '1.6rem', color: 'var(--ink)', fontFamily: "'DM Serif Display', serif" }
const subtitle = { fontSize: '0.825rem', color: 'var(--muted)', marginTop: '0.25rem' }
const tabBar = { display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }
const tab = {
  padding: '0.65rem 1.25rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
  color: 'var(--muted)',
  background: 'transparent',
  border: 'none',
  borderBottom: '2px solid transparent',
  marginBottom: '-1px',
  fontFamily: "'DM Sans', sans-serif",
  transition: 'all 0.15s',
}
const tabActive = { color: 'var(--warm)', borderBottomColor: 'var(--warm)', fontWeight: 500 }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }
const cardLink = {
  display: 'block',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  overflow: 'hidden',
  transition: 'transform 0.15s, border-color 0.15s',
  textDecoration: 'none',
}
const thumb    = { aspectRatio: '4/3', background: 'var(--surface2)' }
const cardBody = { padding: '0.875rem' }
const cardName = { fontSize: '0.9rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.35rem' }
const cardMeta = { fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const clientName = { fontSize: '0.75rem', color: 'var(--muted2)', marginTop: '0.25rem' }
const emptyState = { padding: '3rem', textAlign: 'center' }
