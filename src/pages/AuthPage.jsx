import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage({ mode }) {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const isLogin = mode === 'login'

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = isLogin
      ? await signIn(form.email, form.password)
      : await signUp(form.email, form.password, form.name)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={logoStyle}>frame<span style={{ color: 'var(--warm)' }}>.</span>up</div>
        <h2 style={heading}>{isLogin ? 'Welcome back' : 'Create your account'}</h2>
        <p style={sub}>{isLogin ? 'Sign in to your photographer account.' : 'Start sharing galleries in minutes.'}</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isLogin && (
            <div>
              <label className="field-label">Your name</label>
              <input className="input" type="text" placeholder="Jane Smith" value={form.name} onChange={set('name')} required />
            </div>
          )}
          <div>
            <label className="field-label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
          </div>
          <div>
            <label className="field-label">Password</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required minLength={6} />
          </div>

          {error && <p style={{ color: 'var(--red)', fontSize: '0.825rem' }}>{error}</p>}

          <button className="btn btn-gold" type="submit" disabled={loading} style={{ marginTop: '0.5rem', justifyContent: 'center' }}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
            {isLogin ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p style={switchLine}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <Link to={isLogin ? '/signup' : '/login'} style={{ color: 'var(--warm)' }}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </Link>
        </p>
      </div>
    </div>
  )
}

const page = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  background: 'var(--bg)',
}
const card = {
  width: '100%',
  maxWidth: '420px',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '2.5rem',
}
const logoStyle = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: '1.3rem',
  marginBottom: '1.75rem',
  color: 'var(--ink)',
}
const heading = {
  fontSize: '1.5rem',
  marginBottom: '0.4rem',
  color: 'var(--ink)',
}
const sub = {
  fontSize: '0.875rem',
  color: 'var(--muted)',
  marginBottom: '1.75rem',
}
const switchLine = {
  fontSize: '0.825rem',
  color: 'var(--muted)',
  textAlign: 'center',
  marginTop: '1.25rem',
}
