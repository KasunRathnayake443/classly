import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fetchTeacherSubscription, getPlanLimits } from '../lib/planEngine'
import { SkeletonCards } from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

const SPACE_COLORS = ['#4F46E5', '#059669', '#D97706', '#DB2777', '#0891B2', '#7C3AED']

export default function DashboardPage() {
  const { profile, user, subscription } = useAuth()
  const { refreshSpaces, spaceRefreshCount } = useOutletContext() || {}
  const [spaces, setSpaces] = useState([])
  const [plan, setPlan] = useState('free')
  const [stats, setStats] = useState({ spaces: 0, students: 0, content: 0 })
  const [loading, setLoading] = useState(true)

  // Re-fetch whenever sidebar signals a space was created/deleted
  useEffect(() => { fetchDashboardData() }, [spaceRefreshCount])

  useEffect(() => {
    function handleFocus() { fetchDashboardData() }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  async function fetchDashboardData() {
    // Fetch plan fresh + spaces ordered oldest first (so index matches lock logic)
    const [profileRes, spacesRes] = await Promise.all([
      supabase.from('profiles').select('plan').eq('id', user?.id).single(),
      supabase.from('spaces').select('id, name, subject, join_code, created_at, cover_color, icon, is_locked').order('created_at', { ascending: true }),
    ])
    setPlan(profileRes.data?.plan || 'free')
    const spacesData = spacesRes.data
    const error = spacesRes.error
    if (error) { setLoading(false); return }

    const spaceList = spacesData || []

    // Use subscription engine — reads actual active transaction + plan limits
    // This correctly handles all plan types (free, pro, enterprise, custom)
    const { plan: activePlan } = await fetchTeacherSubscription(user?.id)
    const limits = getPlanLimits(activePlan)
    const maxSpaces = limits.max_spaces
    const enriched = await Promise.all(spaceList.map(async (space, i) => {
      const [{ count: studentCount }, { count: contentCount }] = await Promise.all([
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('space_id', space.id).eq('status', 'active'),
        supabase.from('content').select('*', { count: 'exact', head: true }).eq('space_id', space.id),
      ])
      return { ...space, studentCount: studentCount || 0, contentCount: contentCount || 0, isLocked: space.is_locked || i >= maxSpaces }
    }))

    setSpaces(enriched)
    setStats({
      spaces: enriched.length,
      students: enriched.reduce((s, sp) => s + sp.studentCount, 0),
      content: enriched.reduce((s, sp) => s + sp.contentCount, 0),
    })
    setLoading(false)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-fade-in pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">{greeting}, {firstName} 👋</h1>
        <p className="page-subtitle">Here's an overview of your classes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {loading ? (
          [0,1,2].map(i => (
            <div key={i} className="card p-4 space-y-2">
              <div className="skeleton h-3 rounded w-1/2" />
              <div className="skeleton h-8 rounded w-1/3" />
            </div>
          ))
        ) : [
          { label: 'Active classes', value: stats.spaces, color: 'text-brand-500' },
          { label: 'Total students', value: stats.students, color: 'text-emerald-600' },
          { label: 'Content items', value: stats.content, color: 'text-amber-600' },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <p className="text-xs text-gray-500 mb-1.5">{stat.label}</p>
            <p className={`text-2xl sm:text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Spaces */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Your classes</h2>
      </div>

      {loading ? (
        <SkeletonCards count={4} />
      ) : spaces.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-7 h-7 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
          title="No spaces yet"
          description='Click the + next to "Classes" in the sidebar to create your first class.'
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {spaces.map((space, i) => (
            <Link key={space.id} to={`/teacher/spaces/${space.id}`}
              className={`card p-4 sm:p-5 transition-all duration-150 group relative overflow-hidden active:scale-98 ${space.isLocked ? 'opacity-75' : 'hover:border-brand-200 hover:shadow-card-hover'}`}>

              {/* Locked banner */}
              {space.isLocked && (
                <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Locked — subscribe to Premium to unlock
                </div>
              )}

              <div className={`flex items-start gap-3 ${space.isLocked ? 'mt-7' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${space.isLocked ? 'bg-gray-200' : ''}`}
                  style={!space.isLocked ? { background: space.cover_color || SPACE_COLORS[i % SPACE_COLORS.length] } : {}}>
                  {space.isLocked ? (
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : <span className="text-xl">{space.icon || space.name[0].toUpperCase()}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold truncate transition-colors ${space.isLocked ? 'text-gray-400' : 'text-gray-900 group-hover:text-brand-600'}`}>
                    {space.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{space.subject || 'No subject'}</p>
                </div>
              </div>

              {!space.isLocked && (
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-50 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {space.studentCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {space.contentCount}
                  </span>
                  <span className="ml-auto font-mono tracking-widest text-gray-300 text-xs">
                    {space.join_code}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}