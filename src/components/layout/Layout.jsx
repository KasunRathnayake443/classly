import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import CreateSpaceModal from '../spaces/CreateSpaceModal'

const SPACE_COLORS = ['#4F46E5', '#059669', '#D97706', '#DB2777', '#0891B2', '#7C3AED']

function SidebarContent({ profile, user, subscription, unreadCount, spaces, onCreateSpace, onSignOut, onClose }) {
  const displayName = profile?.full_name || user?.email || 'Teacher'
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : (user?.email?.[0]?.toUpperCase() || '?')
  const avatarUrl = profile?.avatar_url

  const navItem = (isActive) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-all ${
      isActive ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
    }`

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Skooly" className="w-7 h-7 rounded-lg object-cover" />
          <span className="font-bold text-stone-900 tracking-tight">Skooly</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-stone-100 text-stone-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Teacher chip */}
      <div className="px-3 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5 bg-stone-50 rounded-lg px-3 py-2.5">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 text-xs font-bold flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-stone-800 truncate">{displayName}</p>
            <p className="text-xs text-stone-400">Teacher</p>
          </div>
          {subscription?.plan && (
            <span className={`ml-auto text-xs px-2 py-0.5 rounded font-semibold flex-shrink-0 ${subscription.plan.is_free ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-700'}`}>
              {subscription.plan.name}
            </span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="p-2 flex-1 overflow-y-auto">
        <NavLink to="/teacher" end onClick={onClose} className={({ isActive }) => navItem(isActive)}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </NavLink>

        <NavLink to="/teacher/profile" end onClick={onClose} className={({ isActive }) => navItem(isActive)}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile
        </NavLink>

        <NavLink to="/teacher/notifications" onClick={onClose} className={({ isActive }) => navItem(isActive)}>
          <div className="relative flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="ml-auto text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold">{unreadCount}</span>
          )}
        </NavLink>

        <NavLink to="/teacher/calendar" onClick={onClose} className={({ isActive }) => navItem(isActive)}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Calendar
        </NavLink>

        <NavLink to="/teacher/subscription" end onClick={onClose} className={({ isActive }) => navItem(isActive)}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Subscription
        </NavLink>

        {/* Classes */}
        <div className="mt-5 mb-1">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Classes</span>
            <button onClick={onCreateSpace}
              className="w-5 h-5 rounded flex items-center justify-center text-stone-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="New class">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          {spaces.map((space) => (
            <NavLink key={space.id} to={`/teacher/spaces/${space.id}`} onClick={onClose}
              className={({ isActive }) => navItem(isActive)}>
              <span className="text-base leading-none flex-shrink-0">{space.icon || '📚'}</span>
              <span className="truncate">{space.name}</span>
            </NavLink>
          ))}
          {spaces.length === 0 && (
            <button onClick={onCreateSpace}
              className="w-full text-left px-3 py-2 text-xs text-stone-400 hover:text-brand-600 transition-colors rounded-lg hover:bg-brand-50">
              + Create your first class
            </button>
          )}
        </div>
      </nav>

      {/* Sign out */}
      <div className="p-2 border-t border-stone-100">
        <button onClick={onSignOut}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
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
  const { profile, user, signOut, subscription } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [spaces, setSpaces] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showCreateSpace, setShowCreateSpace] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [spaceRefreshCount, setSpaceRefreshCount] = useState(0) // mobile sidebar

  // Fetch spaces once on mount only — refetch triggered by spaceRefreshCount
  useEffect(() => { fetchSpaces() }, [])
  // Close mobile sidebar on route change
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  async function fetchUnreadCount() {
    // Lightweight — only counts admin announcements for teachers
    if (!user) return
    try {
      const { data: all } = await supabase.from('admin_announcements').select('id, target')
      const planSlug = profile?.plan || 'free'
      const relevant = (all || []).filter(a => a.target === 'all' || a.target === 'teachers' || a.target === `plan:${planSlug}`)
      if (!relevant.length) { setUnreadCount(0); return }
      const { data: reads } = await supabase.from('admin_announcement_reads').select('announcement_id').eq('user_id', user.id).in('announcement_id', relevant.map(a => a.id))
      setUnreadCount(relevant.length - (reads?.length || 0))
    } catch (e) {}
  }

  async function fetchSpaces() {
    const { data } = await supabase
      .from('spaces')
      .select('id, name, subject, icon, cover_color')
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
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-60 bg-white border-r border-stone-200 flex-shrink-0 transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <SidebarContent
          profile={profile}
          user={user}
          subscription={subscription}
          unreadCount={unreadCount}
          spaces={spaces}
          onCreateSpace={() => { setShowCreateSpace(true); setSidebarOpen(false) }}
          onSignOut={() => setShowLogoutConfirm(true)}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-stone-200 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src="/logo.png" alt="Skooly" className="w-6 h-6 rounded-md object-cover flex-shrink-0" />
            <span className="font-bold text-stone-900 text-sm truncate">Skooly</span>
          </div>
          {/* Quick actions on mobile topbar */}
          <NavLink to="/teacher/notifications"
            className={({ isActive }) => `relative p-2 rounded-lg transition-colors flex-shrink-0 ${isActive ? 'text-brand-600' : 'text-stone-500 hover:bg-stone-100'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
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