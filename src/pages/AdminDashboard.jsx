import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AppShell from '../components/AppShell'

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 MB'
  const gb = bytes / (1024 ** 3)
  if (gb >= 1) return `${gb.toFixed(2)} GB`
  const mb = bytes / (1024 ** 2)
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

const PLAN_COLORS = {
  pro:     { bg: '#1A2E1A', color: '#6DB97F', border: '#1A3D22' },
  studio:  { bg: '#1F1A12', color: '#C8A97E', border: '#8B6E4A' },
  starter: { bg: '#1E1C18', color: '#7A756B', border: '#333028' },
}

export default function AdminDashboard() {
  const { profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [sort, setSort]         = useState({ col: 'created_at', dir: 'desc' })
  const [totals, setTotals]     = useState({ users: 0, storage: 0, galleries: 0, photos: 0 })
  const [editingPlan, setEditingPlan] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (profile && !profile.is_admin) { navigate('/dashboard'); return }
    if (profile?.is_admin) loadData()
  }, [profile, authLoading])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('photographer_stats')
      .select('*')
      .order(sort.col, { ascending: sort.dir === 'asc' })

    if (error) {
      // Fallback: query profiles directly if view not set up
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*, galleries(count), photos:galleries(photos(count))')
        .order('created_at', { ascending: false })
      setUsers(profiles ?? [])
    } else {
      setUsers(data ?? [])
      setTotals({
        users:    data?.length ?? 0,
        storage:  data?.reduce((s, u) => s + (u.storage_bytes || 0), 0) ?? 0,
        galleries:data?.reduce((s, u) => s + (u.gallery_count || 0), 0) ?? 0,
        photos:   data?.reduce((s, u) => s + (u.photo_count || 0), 0) ?? 0,
      })
    }
    setLoading(false)
  }

  async function updatePlan(userId, plan) {
    await supabase.from('profiles').update({ plan }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan } : u))
    setEditingPlan(null)
  }

  function toggleSort(col) {
    setSort(s => s.col === col
      ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: 'desc' }
    )
  }

  const filtered = users
    .filter(u => {
      const q = search.toLowerCase()
      return (!q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
        && (planFilter === 'all' || u.plan === planFilter)
    })
    .sort((a, b) => {
      const mul = sort.dir === 'asc' ? 1 : -1
      const va = a[sort.col] ?? 0
      const vb = b[sort.col] ?? 0
      return va < vb ? -mul : va > vb ? mul : 0
    })

  if (authLoading || (loading && !users.length)) {
    return <AppShell><div style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner" /></div></AppShell>
  }

  if (profile && !profile.is_admin) return null

  return (
    <AppShell>
      <div style={{ maxWidth: 1100 }}>
        <div style={pageHeader}>
          <div>
            <h1 style={title}>Admin Dashboard</h1>
            <p style={subtitle}>All photographers, storage usage, and plan management.</p>
          </div>
          <button className="btn btn-ghost" onClick={loadData} style={{ fontSize: '0.82rem' }}>
            ↻ Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div style={statsGrid}>
          {[
            { label: 'Total users',     value: totals.users.toLocaleString() },
            { label: 'Total storage',   value: formatBytes(totals.storage) },
            { label: 'Total galleries', value: totals.galleries.toLocaleString() },
            { label: 'Total photos',    value: totals.photos.toLocaleString() },
          ].map(s => (
            <div key={s.label} style={statCard}>
              <div style={statLabel}>{s.label}</div>
              <div style={statValue}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Storage breakdown bar */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--ink)' }}>Storage used</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{formatBytes(totals.storage)} of ∞</span>
          </div>
          <div style={{ height: '6px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.75rem' }}>
            <div style={{ height: '100%', width: `${Math.min((totals.storage / (1024**3)) * 10, 100)}%`, background: 'var(--warm)', borderRadius: '3px', transition: 'width 0.5s' }} />
          </div>
          {/* Per-user storage bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[...users]
              .sort((a, b) => (b.storage_bytes || 0) - (a.storage_bytes || 0))
              .slice(0, 5)
              .map(u => {
                const pct = totals.storage > 0 ? ((u.storage_bytes || 0) / totals.storage) * 100 : 0
                return (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 130, fontSize: '0.75rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {u.name || u.email?.split('@')[0]}
                    </div>
                    <div style={{ flex: 1, height: '4px', background: 'var(--surface2)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--warm-dim)', borderRadius: '2px' }} />
                    </div>
                    <div style={{ width: 70, fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>
                      {formatBytes(u.storage_bytes || 0)}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, fontSize: '0.85rem' }}
          />
          <div style={{ display: 'flex', gap: '0' }}>
            {['all', 'starter', 'pro', 'studio'].map(p => (
              <button
                key={p}
                onClick={() => setPlanFilter(p)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--border2)',
                  borderRight: p === 'studio' ? '1px solid var(--border2)' : 'none',
                  borderRadius: p === 'all' ? '8px 0 0 8px' : p === 'studio' ? '0 8px 8px 0' : '0',
                  background: planFilter === p ? 'var(--warm-bg)' : 'transparent',
                  color: planFilter === p ? 'var(--warm)' : 'var(--muted)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textTransform: 'capitalize',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Users table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={tableHeader}>
            <span style={tableTitle}>Users ({filtered.length})</span>
          </div>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>No users found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {[
                      { col: 'name',          label: 'User' },
                      { col: 'plan',          label: 'Plan' },
                      { col: 'gallery_count', label: 'Galleries' },
                      { col: 'photo_count',   label: 'Photos' },
                      { col: 'storage_bytes', label: 'Storage' },
                      { col: 'created_at',    label: 'Joined' },
                    ].map(h => (
                      <th
                        key={h.col}
                        onClick={() => toggleSort(h.col)}
                        style={{
                          ...th,
                          cursor: 'pointer',
                          color: sort.col === h.col ? 'var(--warm)' : 'var(--muted2)',
                          userSelect: 'none',
                        }}
                      >
                        {h.label}
                        {sort.col === h.col && (
                          <span style={{ marginLeft: '4px', opacity: 0.7 }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                    ))}
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => {
                    const planStyle = PLAN_COLORS[u.plan] || PLAN_COLORS.starter
                    const storageGB = (u.storage_bytes || 0) / (1024 ** 3)
                    const storageWarning = storageGB > 0.9 // warn if over 900MB on free tier
                    return (
                      <tr
                        key={u.id}
                        style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: 'var(--warm-bg)', border: '1px solid var(--border2)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.7rem', fontWeight: 500, color: 'var(--warm)', flexShrink: 0,
                            }}>
                              {(u.name || u.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '0.85rem' }}>
                                {u.name || '—'}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={td}>
                          {editingPlan === u.id ? (
                            <select
                              defaultValue={u.plan}
                              onChange={e => updatePlan(u.id, e.target.value)}
                              onBlur={() => setEditingPlan(null)}
                              autoFocus
                              style={{
                                background: 'var(--surface2)', border: '1px solid var(--border2)',
                                borderRadius: '6px', color: 'var(--ink)', fontSize: '0.78rem',
                                padding: '0.2rem 0.5rem', fontFamily: 'inherit', cursor: 'pointer',
                              }}
                            >
                              <option value="starter">Starter</option>
                              <option value="pro">Pro</option>
                              <option value="studio">Studio</option>
                            </select>
                          ) : (
                            <span
                              onClick={() => setEditingPlan(u.id)}
                              style={{
                                display: 'inline-block', padding: '0.2rem 0.65rem',
                                borderRadius: '100px', fontSize: '0.72rem', fontWeight: 500,
                                background: planStyle.bg, color: planStyle.color,
                                border: `1px solid ${planStyle.border}`,
                                cursor: 'pointer', textTransform: 'capitalize',
                              }}
                              title="Click to change plan"
                            >
                              {u.plan || 'starter'}
                            </span>
                          )}
                        </td>
                        <td style={{ ...td, color: 'var(--muted)' }}>{u.gallery_count || 0}</td>
                        <td style={{ ...td, color: 'var(--muted)' }}>{(u.photo_count || 0).toLocaleString()}</td>
                        <td style={td}>
                          <span style={{ color: storageWarning ? '#E8C98A' : 'var(--muted)', fontSize: '0.85rem' }}>
                            {formatBytes(u.storage_bytes || 0)}
                            {storageWarning && ' ⚠'}
                          </span>
                        </td>
                        <td style={{ ...td, color: 'var(--muted)', fontSize: '0.8rem' }}>{formatDate(u.created_at)}</td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
                              onClick={() => navigator.clipboard.writeText(u.email)}
                              title="Copy email"
                            >
                              Copy email
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p style={{ fontSize: '0.75rem', color: 'var(--muted2)', marginTop: '1rem', textAlign: 'center' }}>
          Storage figures based on uploaded file sizes. Click a plan badge to change it.
        </p>
      </div>
    </AppShell>
  )
}

const pageHeader  = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }
const title       = { fontSize: '1.6rem', color: 'var(--ink)', fontFamily: "'DM Serif Display', serif" }
const subtitle    = { fontSize: '0.825rem', color: 'var(--muted)', marginTop: '0.25rem' }
const statsGrid   = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }
const statCard    = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }
const statLabel   = { fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }
const statValue   = { fontFamily: "'DM Serif Display', serif", fontSize: '1.8rem', color: 'var(--ink)' }
const tableHeader = { padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const tableTitle  = { fontSize: '0.9rem', fontWeight: 500, color: 'var(--ink)' }
const th = { padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 500 }
const td = { padding: '0.9rem 1.25rem', fontSize: '0.85rem', color: 'var(--ink)', transition: 'background 0.1s' }
