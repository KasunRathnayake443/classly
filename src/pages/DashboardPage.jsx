import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const SPACE_COLORS = ['#3B6DD4', '#639922', '#BA7517', '#993556', '#0F6E56', '#533AB7']

export default function DashboardPage() {
  const { profile } = useAuth()
  const [spaces, setSpaces] = useState([])
  const [stats, setStats] = useState({ spaces: 0, students: 0, content: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    // Fetch spaces with enrollment counts
    const { data: spacesData } = await supabase
      .from('spaces')
      .select(`id, name, subject, join_code, created_at, enrollments(count), content(count)`)
      .order('created_at', { ascending: false })

    setSpaces(spacesData || [])

    // Compute summary stats
    const totalStudents = (spacesData || []).reduce((sum, s) => sum + (s.enrollments?.[0]?.count || 0), 0)
    const totalContent = (spacesData || []).reduce((sum, s) => sum + (s.content?.[0]?.count || 0), 0)
    setStats({ spaces: spacesData?.length || 0, students: totalStudents, content: totalContent })
    setLoading(false)
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Teacher'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Good morning, {firstName} 👋</h1>
        <p className="text-sm text-gray-500 mt-1">Here's an overview of your classes</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Active spaces', value: stats.spaces },
          { label: 'Total students', value: stats.students },
          { label: 'Content items', value: stats.content },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Spaces */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Your spaces</h2>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>
      ) : spaces.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No spaces yet</p>
          <p className="text-sm text-gray-400">Click the + next to "My Spaces" in the sidebar to create your first space.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {spaces.map((space, i) => (
            <Link key={space.id} to={`/spaces/${space.id}`} className="card p-5 hover:border-brand-100 hover:shadow-md transition-all group">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                  style={{ background: SPACE_COLORS[i % SPACE_COLORS.length] }}>
                  {space.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate group-hover:text-brand-500 transition-colors">{space.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{space.subject || 'No subject set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                <span>{space.enrollments?.[0]?.count || 0} students</span>
                <span>{space.content?.[0]?.count || 0} items</span>
                <span className="ml-auto font-mono tracking-wider text-gray-300">{space.join_code}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
