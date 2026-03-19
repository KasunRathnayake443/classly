import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { SkeletonCards } from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

const SPACE_COLORS = ['#4F46E5', '#059669', '#D97706', '#DB2777', '#0891B2', '#7C3AED']

export default function DashboardPage() {
  const { profile } = useAuth()
  const { refreshSpaces } = useOutletContext() || {}
  const [spaces, setSpaces] = useState([])
  const [stats, setStats] = useState({ spaces: 0, students: 0, content: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDashboardData() }, [])

  useEffect(() => {
    function handleFocus() { fetchDashboardData() }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  async function fetchDashboardData() {
    const { data: spacesData, error } = await supabase
      .from('spaces')
      .select('id, name, subject, join_code, created_at')
      .order('created_at', { ascending: false })

    if (error) { setLoading(false); return }

    const spaceList = spacesData || []
    const enriched = await Promise.all(spaceList.map(async (space) => {
      const [{ count: studentCount }, { count: contentCount }] = await Promise.all([
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('space_id', space.id).eq('status', 'active'),
        supabase.from('content').select('*', { count: 'exact', head: true }).eq('space_id', space.id),
      ])
      return { ...space, studentCount: studentCount || 0, contentCount: contentCount || 0 }
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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">{greeting}, {firstName} 👋</h1>
        <p className="page-subtitle">Here's an overview of your classes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        {loading ? (
          [0,1,2].map(i => (
            <div key={i} className="card p-4 space-y-2">
              <div className="skeleton h-3 rounded w-1/2" />
              <div className="skeleton h-8 rounded w-1/3" />
            </div>
          ))
        ) : [
          { label: 'Active spaces', value: stats.spaces, color: 'text-brand-500' },
          { label: 'Total students', value: stats.students, color: 'text-emerald-600' },
          { label: 'Content items', value: stats.content, color: 'text-amber-600' },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <p className="text-xs text-gray-500 mb-1.5">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Spaces */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Your spaces</h2>
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
          description='Click the + next to "Spaces" in the sidebar to create your first classroom.'
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {spaces.map((space, i) => (
            <Link key={space.id} to={`/teacher/spaces/${space.id}`}
              className="card p-5 hover:border-brand-200 hover:shadow-card-hover transition-all duration-150 group">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
                  style={{ background: SPACE_COLORS[i % SPACE_COLORS.length] }}>
                  {space.name[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors">
                    {space.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{space.subject || 'No subject'}</p>
                </div>
              </div>
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
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}