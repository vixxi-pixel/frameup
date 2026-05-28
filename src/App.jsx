import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

import LandingPage   from './pages/LandingPage'
import AuthPage      from './pages/AuthPage'
import Dashboard     from './pages/Dashboard'
import GalleriesPage from './pages/GalleriesPage'
import NewGallery    from './pages/NewGallery'
import GalleryDetail from './pages/GalleryDetail'
import StorePage     from './pages/StorePage'
import SettingsPage  from './pages/SettingsPage'
import PublicGallery from './pages/PublicGallery'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-loading"><div className="spinner" /> Loading…</div>
  if (!user)   return <Navigate to="/login" replace />
  return children
}

function HomeRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-loading"><div className="spinner" /></div>
  if (user)    return <Navigate to="/dashboard" replace />
  return <LandingPage />
}

export default function App() {
  return (
    <Routes>
      {/* Landing */}
      <Route path="/" element={<HomeRoute />} />

      {/* Auth */}
      <Route path="/login"  element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />

      {/* Public gallery */}
      <Route path="/g/:slug" element={<PublicGallery />} />

      {/* Protected — photographer app */}
      <Route path="/dashboard"      element={<Protected><Dashboard /></Protected>} />
      <Route path="/galleries"      element={<Protected><GalleriesPage /></Protected>} />
      <Route path="/galleries/new"  element={<Protected><NewGallery /></Protected>} />
      <Route path="/galleries/:id"  element={<Protected><GalleryDetail /></Protected>} />
      <Route path="/store"          element={<Protected><StorePage /></Protected>} />
      <Route path="/settings"       element={<Protected><SettingsPage /></Protected>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
