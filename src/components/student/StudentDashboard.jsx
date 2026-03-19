import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { SkeletonCards } from '../ui/LoadingSpinner'
import EmptyState from '../ui/EmptyState'

const SPACE_COLORS = ['#4F46E5', '#059669', '#D97706', '#DB2777', '#0891B2', '#7C3AED']

export default function StudentDashboard() {
  const { profile, user } = useAuth()
  const [active, setActive] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchEnrollments() }, [])

  async function fetchEnrollments() {
    const { data } = await supabase
      .from('enrollments')
      .select(`id, joined_at, status, spaces(id, name, subject, content(count))`)
      .eq('student_id', user.id)
      .order('joined_at', { ascending: false })

    const all = data || []
    setActive(all.filter(e => e.status === 'active'))
    setPending(all.filter(e => e.status === 'pending'))
    setLoading(false)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">{greeting}, {firstName} 👋</h1>
        <p className="page-subtitle">Here are your enrolled classes</p>
      </div>

      {loading ? (
        <SkeletonCards count={4} />
      ) : (
        <>
          {/* Pending approvals */}
          {pending.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Waiting for approval</h2>
              <div className="space-y-2">
                {pending.map(e => (
                  <div key={e.id} className="card p-4 flex items-center gap-3 border-amber-100">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-amber-600 bg-amber-100 text-sm font-bold flex-shrink-0">
                      {e.spaces?.name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{e.spaces?.name}</p>
                      <p className="text-xs text-gray-400">{e.spaces?.subject || 'No subject'}</p>
                    </div>
                    <span className="ml-auto badge badge-amber">Pending approval</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active classes */}
          {active.length === 0 && pending.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-7 h-7 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              }
              title="No classes yet"
              description="Ask your teacher for a join code to get started."
              action={
                <Link to="/student/join" className="btn btn-primary" style={{background:'#7c3aed',borderColor:'#7c3aed'}}>
                  Join a class
                </Link>
              }
            />
          ) : (
            <>
              {active.length > 0 && pending.length > 0 && (
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Your classes</h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {active.map((e, i) => (
                  <Link key={e.id} to={`/student/spaces/${e.spaces?.id}`}
                    className="card p-5 hover:border-violet-200 hover:shadow-card-hover transition-all duration-150 group">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
                        style={{ background: SPACE_COLORS[i % SPACE_COLORS.length] }}>
                        {e.spaces?.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate group-hover:text-violet-600 transition-colors">
                          {e.spaces?.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{e.spaces?.subject || 'No subject'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-50 text-xs text-gray-400">
                      <span>{e.spaces?.content?.[0]?.count || 0} items</span>
                      <span className="ml-auto">Joined {new Date(e.joined_at).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}