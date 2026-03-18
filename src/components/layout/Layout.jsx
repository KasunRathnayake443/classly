import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import CreateSpaceModal from '../spaces/CreateSpaceModal'

const SPACE_COLORS = ['#3B6DD4', '#639922', '#BA7517', '#993556', '#0F6E56', '#533AB7']

export default function Layout() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [spaces, setSpaces] = useState([])
  const [showCreateSpace, setShowCreateSpace] = useState(false)

  useEffect(() => {
    fetchSpaces()
  }, [])

  async function fetchSpaces() {
    const { data } = await supabase
      .from('spaces')
      .select('id, name, subject')
      .order('created_at', { ascending: true })
    setSpaces(data || [])
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // Use profile name if available, fall back to email, then '?'
  const displayName = profile?.full_name || user?.email || 'Teacher'
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : (user?.email?.[0]?.toUpperCase() || '?')

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 1L2 4v4c0 3.3 2.5 6 6 7 3.5-1 6-3.7 6-7V4L8 1z"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Classly</span>
          </div>
        </div>

        {/* Teacher profile chip */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-400">Teacher</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="p-2 flex-1 overflow-y-auto">
          <NavLink to="/" end className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${isActive ? 'bg-brand-50 text-brand-500 font-medium' : 'text-gray-600 hover:bg-gray-50'}`
          }>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </NavLink>

          {/* Spaces section */}
          <div className="mt-3 mb-1">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">My Spaces</span>
              <button
                onClick={() => setShowCreateSpace(true)}
                className="text-gray-400 hover:text-brand-500 transition-colors"
                title="Create new space"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            {spaces.map((space, i) => (
              <NavLink key={space.id} to={`/spaces/${space.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${isActive ? 'bg-brand-50 text-brand-500 font-medium' : 'text-gray-600 hover:bg-gray-50'}`
                }>
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: SPACE_COLORS[i % SPACE_COLORS.length] }} />
                <span className="truncate">{space.name}</span>
              </NavLink>
            ))}
            {spaces.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">No spaces yet — create one!</p>
            )}
          </div>
        </nav>

        {/* Sign out */}
        <div className="p-2 border-t border-gray-100">
          <button onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        <Outlet context={{ refreshSpaces: fetchSpaces }} />
      </main>

      {showCreateSpace && (
        <CreateSpaceModal
          onClose={() => setShowCreateSpace(false)}
          onCreated={() => { fetchSpaces(); setShowCreateSpace(false) }}
        />
      )}
    </div>
  )
}