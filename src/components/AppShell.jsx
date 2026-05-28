import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './AppShell.module.css'

const navItems = [
  { to: '/',           label: 'Dashboard', icon: '⬜' },
  { to: '/galleries',  label: 'Galleries',  icon: '🖼' },
  { to: '/store',      label: 'Store',      icon: '🛒' },
]

export default function AppShell({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          frame<span>.</span>up
        </div>

        <nav className={styles.nav}>
          <div className={styles.navLabel}>Menu</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.newBtn}>
          <NavLink to="/galleries/new" className={styles.createBtn}>
            + New gallery
          </NavLink>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.userRow}>
            <div className={styles.avatar}>
              {profile?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{profile?.name ?? 'Photographer'}</div>
              <div className={styles.userPlan}>{profile?.plan ?? 'starter'} plan</div>
            </div>
          </div>
          <button className={styles.signOutBtn} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
