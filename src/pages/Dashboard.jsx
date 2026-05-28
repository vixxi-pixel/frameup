import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AppShell from '../components/AppShell'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [galleries, setGalleries] = useState([])
  const [stats, setStats] = useState({ active: 0, views: 0, photos: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    const { data: gals } = await supabase
      .from('galleries')
      .select('*, photos(count), gallery_views(count)')
      .eq('photographer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (gals) {
      setGalleries(gals)
      setStats({
        active: gals.filter(g => g.is_active).length,
        views: gals.reduce((s, g) => s + (g.gallery_views?.[0]?.count ?? 0), 0),
        photos: gals.reduce((s, g) => s + (g.photos?.[0]?.count ?? 0), 0),
      })
    }
    setLoading(false)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.name?.split(' ')[0] ?? 'there'

  return (
    <AppShell>
      <div style={{ maxWidth: 900 }}>
        <div style={pageHeader}>
          <div>
            <h1 style={title}>{greeting}, {firstName} ✦</h1>
            <p style={subtitle}>Here's what's happening with your galleries.</p>
          </div>
          <Link to="/galleries/new" className="btn btn-gold">+ New gallery</Link>
        </div>

        {/* Stats */}
        <div style={statsGrid}>
          {[
            { label: 'Active galleries', value: stats.active },
            { label: 'Total views',      value: stats.views.toLocaleString() },
            { label: 'Photos uploaded',  value: stats.photos.toLocaleString() },
            { label: 'Commission taken', value: '0%' },
          ].map(s => (
            <div key={s.label} style={statCard}>
              <div style={statLabel}>{s.label}</div>
              <div style={statValue}>{loading ? '—' : s.value}</div>
            </div>
          ))}
        </div>

        {/* Recent galleries */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={tableHeader}>
            <span style={tableTitle}>Recent Galleries</span>
            <Link to="/galleries" className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}>
              View all →
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="spinner" />
            </div>
          ) : galleries.length === 0 ? (
            <div style={emptyState}>
              <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>No galleries yet.</p>
              <Link to="/galleries/new" className="btn btn-gold">Create your first gallery</Link>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Gallery', 'Client', 'Photos', 'Views', 'Status', ''].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {galleries.map(g => (
                  <tr key={g.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={td}><strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{g.name}</strong></td>
                    <td style={{ ...td, color: 'var(--muted)' }}>{g.client_name ?? '—'}</td>
                    <td style={td}>{g.photos?.[0]?.count ?? 0}</td>
                    <td style={td}>{g.gallery_views?.[0]?.count ?? 0}</td>
                    <td style={td}>
                      <span className={`badge ${g.is_active ? 'badge-live' : 'badge-expired'}`}>
                        {g.is_active ? 'Live' : 'Inactive'}
                      </span>
                    </td>
                    <td style={td}>
                      <Link to={`/galleries/${g.id}`} style={{ color: 'var(--warm)', fontSize: '0.8rem' }}>
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  )
}

const pageHeader = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }
const title    = { fontSize: '1.6rem', color: 'var(--ink)', fontFamily: "'DM Serif Display', serif" }
const subtitle = { fontSize: '0.825rem', color: 'var(--muted)', marginTop: '0.25rem' }
const statsGrid = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }
const statCard  = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }
const statLabel = { fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }
const statValue = { fontFamily: "'DM Serif Display', serif", fontSize: '1.8rem', color: 'var(--ink)' }
const tableHeader = { padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
const tableTitle  = { fontSize: '0.9rem', fontWeight: 500, color: 'var(--ink)' }
const th = { padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted2)', fontWeight: 500 }
const td = { padding: '0.9rem 1.25rem', fontSize: '0.85rem', color: 'var(--ink)', transition: 'background 0.1s' }
const emptyState = { padding: '3rem', textAlign: 'center' }
