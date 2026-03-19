import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

const SPACE_COLORS = ['#4F46E5', '#059669', '#D97706', '#DB2777', '#0891B2', '#7C3AED']

function SidebarContent({ profile, user, enrollments, onSignOut, onClose }) {
  const displayName = profile?.full_name || user?.email || 'Student'
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : (user?.email?.[0]?.toUpperCase() || '?')

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1L2 4v4c0 3.3 2.5 6 6 7 3.5-1 6-3.7 6-7V4L8 1z"/>
            </svg>
          </div>
          <span className="font-semibold text-gray-900 tracking-tight">Skooly</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5 bg-violet-50 rounded-xl px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-violet-500">Student</p>
          </div>
        </div>
      </div>

      <nav className="p-2 flex-1 overflow-y-auto">
        <NavLink to="/student" end onClick={onClose} className={({ isActive }) =>
          `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm mb-0.5 transition-all ${isActive ? 'bg-violet-50 text-violet-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`
        }>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          My classes
        </NavLink>

        <NavLink to="/student/join" onClick={onClose} className={({ isActive }) =>
          `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm mb-0.5 transition-all ${isActive ? 'bg-violet-50 text-violet-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`
        }>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Join a class
        </NavLink>

        {enrollments.length > 0 && (
          <div className="mt-4">
            <div className="px-3 mb-1.5">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My spaces</span>
            </div>
            {enrollments.map((e, i) => (
              <NavLink key={e.id} to={`/student/spaces/${e.spaces?.id}`} onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm mb-0.5 transition-all ${isActive ? 'bg-violet-50 text-violet-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`
                }>
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: SPACE_COLORS[i % SPACE_COLORS.length] }} />
                <span className="truncate">{e.spaces?.name}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

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

export default function StudentLayout() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [enrollments, setEnrollments] = useState([])
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { fetchEnrollments() }, [location.pathname])
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  async function fetchEnrollments() {
    const { data } = await supabase
      .from('enrollments')
      .select('id, spaces(id, name, subject)')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: true })
    setEnrollments(data || [])
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-60 bg-white border-r border-gray-100 flex-shrink-0
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <SidebarContent
          profile={profile}
          user={user}
          enrollments={enrollments}
          onSignOut={() => setShowLogoutConfirm(true)}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 1L2 4v4c0 3.3 2.5 6 6 7 3.5-1 6-3.7 6-7V4L8 1z"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-sm">Skooly</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ refreshEnrollments: fetchEnrollments }} />
        </main>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slide-up">
            <h2 className="text-base font-semibold text-gray-900 text-center mb-2">Sign out?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">You will be returned to the home page.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowLogoutConfirm(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={handleSignOut} className="btn btn-primary flex-1" style={{background:'#7c3aed', borderColor:'#7c3aed'}}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}