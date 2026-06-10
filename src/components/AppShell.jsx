import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './AppShell.module.css'

const navItems = [
  { to: '/dashboard',  label: 'Dashboard', icon: '⬜' },
  { to: '/galleries',  label: 'Galleries',  icon: '🖼' },
  { to: '/store',      label: 'Store',      icon: '🛒' },
  { to: '/settings',   label: 'Settings',   icon: '⚙️' },
]

export default function AppShell({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className={`${styles.layout} ${collapsed ? styles.layoutCollapsed : ''}`}>
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>

        {/* Logo / collapse toggle */}
        <div className={styles.logoRow}>
          {!collapsed && (
            <div className={styles.logo}>frame<span>.</span>up</div>
          )}
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className={styles.nav}>
          {!collapsed && <div className={styles.navLabel}>Menu</div>}
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''} ${collapsed ? styles.navItemCollapsed : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}
          {profile?.is_admin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''} ${collapsed ? styles.navItemCollapsed : ''}`
              }
              title={collapsed ? 'Admin' : undefined}
            >
              <span className={styles.navIcon}>🛡</span>
              {!collapsed && 'Admin'}
            </NavLink>
          )}
        </nav>

        {!collapsed && (
          <div className={styles.newBtn}>
            <NavLink to="/galleries/new" className={styles.createBtn}>
              + New gallery
            </NavLink>
          </div>
        )}

        {collapsed && (
          <div className={styles.newBtn}>
            <NavLink to="/galleries/new" className={styles.createBtnIcon} title="New gallery">
              +
            </NavLink>
          </div>
        )}

        <div className={`${styles.sidebarFooter} ${collapsed ? styles.sidebarFooterCollapsed : ''}`}>
          {!collapsed ? (
            <>
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
            </>
          ) : (
            <div className={styles.avatar} title={profile?.name ?? 'Photographer'} style={{ cursor: 'pointer' }}
              onClick={handleSignOut}>
              {profile?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
