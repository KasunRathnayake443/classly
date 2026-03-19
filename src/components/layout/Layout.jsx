import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import CreateSpaceModal from '../spaces/CreateSpaceModal'

const SPACE_COLORS = ['#4F46E5', '#059669', '#D97706', '#DB2777', '#0891B2', '#7C3AED']

function SidebarContent({ profile, user, spaces, onCreateSpace, onSignOut, onClose }) {
  const displayName = profile?.full_name || user?.email || 'Teacher'
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : (user?.email?.[0]?.toUpperCase() || '?')
  const avatarUrl = profile?.avatar_url

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1L2 4v4c0 3.3 2.5 6 6 7 3.5-1 6-3.7 6-7V4L8 1z"/>
            </svg>
          </div>
          <span className="font-semibold text-gray-900 tracking-tight">Skooly</span>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Teacher chip */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-400">Teacher</p>
          </div>
          {profile?.plan !== 'premium' && (
            <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">Basic</span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="p-2 flex-1 overflow-y-auto">
        <NavLink to="/teacher" end onClick={onClose} className={({ isActive }) =>
          `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm mb-0.5 transition-all ${isActive ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
        }>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </NavLink>

        <NavLink to="/teacher/profile" end onClick={onClose} className={({ isActive }) =>
          `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm mb-0.5 transition-all ${isActive ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
        }>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile
        </NavLink>

        {/* Subscription link */}
        <NavLink to="/teacher/subscription" end onClick={onClose} className={({ isActive }) =>
          `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm mb-0.5 transition-all ${isActive ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
        }>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Subscription
        </NavLink>

        {/* Upgrade link for free plan */}
        {profile?.plan !== 'premium' && (
          <NavLink to="/teacher/upgrade" onClick={onClose} className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm mb-0.5 transition-all ${isActive ? 'bg-amber-50 text-amber-700 font-medium' : 'text-amber-600 hover:bg-amber-50'}`
          }>
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
            Upgrade to Premium
          </NavLink>
        )}

        {/* Spaces */}
        <div className="mt-4 mb-1">
          <div className="flex items-center justify-between px-3 mb-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Spaces</span>
            <button onClick={onCreateSpace}
              className="w-5 h-5 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-500 transition-colors" title="New space">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          {spaces.map((space, i) => (
            <NavLink key={space.id} to={`/teacher/spaces/${space.id}`} onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm mb-0.5 transition-all group ${isActive ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
              }>
              <div className="w-2 h-2 rounded-sm flex-shrink-0 transition-transform group-hover:scale-125"
                style={{ background: SPACE_COLORS[i % SPACE_COLORS.length] }} />
              <span className="truncate">{space.name}</span>
            </NavLink>
          ))}
          {spaces.length === 0 && (
            <button onClick={onCreateSpace}
              className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-brand-500 transition-colors rounded-xl hover:bg-gray-50">
              + Create your first space
            </button>
          )}
        </div>
      </nav>

      {/* Sign out */}
      <div className="p-2 border-t border-gray-100">
        <button onClick={onSignOut}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function Layout() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [spaces, setSpaces] = useState([])
  const [showCreateSpace, setShowCreateSpace] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [spaceRefreshCount, setSpaceRefreshCount] = useState(0) // mobile sidebar

  useEffect(() => { fetchSpaces() }, [location.pathname])
  // Close mobile sidebar on route change
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  async function fetchSpaces() {
    const { data } = await supabase
      .from('spaces')
      .select('id, name, subject')
      .order('created_at', { ascending: true })
    setSpaces(data || [])
    setSpaceRefreshCount(c => c + 1)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — hidden on mobile, slides in when open */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-60 bg-white border-r border-gray-100 flex-shrink-0
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <SidebarContent
          profile={profile}
          user={user}
          spaces={spaces}
          onCreateSpace={() => { setShowCreateSpace(true); setSidebarOpen(false) }}
          onSignOut={() => setShowLogoutConfirm(true)}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-500 rounded-md flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 1L2 4v4c0 3.3 2.5 6 6 7 3.5-1 6-3.7 6-7V4L8 1z"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-sm">Skooly</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ refreshSpaces: fetchSpaces, spaceRefreshCount }} />
        </main>
      </div>

      {/* Create space modal */}
      {showCreateSpace && (
        <CreateSpaceModal
          onClose={() => setShowCreateSpace(false)}
          onCreated={() => { fetchSpaces(); setShowCreateSpace(false) }}
        />
      )}

      {/* Logout confirm */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slide-up">
            <h2 className="text-base font-semibold text-gray-900 text-center mb-2">Sign out?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">You will be returned to the home page.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowLogoutConfirm(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={handleSignOut} className="btn btn-primary flex-1">Sign out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}