import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

const SPACE_COLORS = ['#4F46E5', '#059669', '#D97706', '#DB2777', '#0891B2', '#7C3AED']

function timeUntil(date) {
  const diff = new Date(date) - new Date()
  if (diff < 0) return 'Overdue'
  const h = Math.floor(diff / 3600000)
  if (h < 24) return `${h}h left`
  return `${Math.floor(h / 24)}d left`
}

function isOverdue(date) {
  return date && new Date(date) < new Date()
}

export default function StudentDashboard() {
  const { profile, user } = useAuth()
  const [active, setActive] = useState([])
  const [pending, setPending] = useState([])
  const [upcoming, setUpcoming] = useState([])   // due in next 7 days
  const [recentGrades, setRecentGrades] = useState([])
  const [recentAnnouncements, setRecentAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const { data: enrollData } = await supabase
      .from('enrollments')
      .select('id, joined_at, status, space_id, spaces(id, name, subject, cover_color, icon)')
      .eq('student_id', user.id)
      .order('joined_at', { ascending: false })

    const all = enrollData || []
    const activeEnroll = all.filter(e => e.status === 'active')
    const pendingEnroll = all.filter(e => e.status === 'pending')
    setActive(activeEnroll)
    setPending(pendingEnroll)

    if (activeEnroll.length === 0) { setLoading(false); return }

    const spaceIds = activeEnroll.map(e => e.space_id)
    const spaceMap = Object.fromEntries(activeEnroll.map(e => [e.space_id, e.spaces?.name]))
    const in7d = new Date(Date.now() + 7 * 24 * 3600000).toISOString()
    const now = new Date().toISOString()

    const [contentRes, submissionsRes, annoRes] = await Promise.all([
      supabase.from('content').select('id, title, type, due_at, space_id')
        .in('space_id', spaceIds)
        .in('type', ['quiz', 'assignment'])
        .not('due_at', 'is', null)
        .lte('due_at', in7d)
        .order('due_at', { ascending: true }),
      supabase.from('submissions').select('content_id, score, status, submitted_at')
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(50),
      supabase.from('announcements').select('id, title, body, created_at, space_id')
        .in('space_id', spaceIds)
        .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const submittedIds = new Set((submissionsRes.data || []).map(s => s.content_id))
    const subMap = Object.fromEntries((submissionsRes.data || []).map(s => [s.content_id, s]))

    // Due items not yet submitted
    const upcomingItems = (contentRes.data || [])
      .filter(c => !submittedIds.has(c.id))
      .map(c => ({ ...c, spaceName: spaceMap[c.space_id] }))
    setUpcoming(upcomingItems)

    // Recent graded submissions
    const graded = (submissionsRes.data || [])
      .filter(s => s.score != null)
      .slice(0, 5)
    // Fetch content titles for graded items
    if (graded.length > 0) {
      const { data: gradedContent } = await supabase
        .from('content').select('id, title, type, space_id')
        .in('id', graded.map(s => s.content_id))
      const contentMap = Object.fromEntries((gradedContent || []).map(c => [c.id, c]))
      setRecentGrades(graded.map(s => ({
        ...s,
        content: contentMap[s.content_id],
        spaceName: spaceMap[contentMap[s.content_id]?.space_id],
      })).filter(s => s.content))
    }

    setRecentAnnouncements((annoRes.data || []).map(a => ({
      ...a, spaceName: spaceMap[a.space_id]
    })))

    setLoading(false)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="skeleton h-8 w-48 rounded-xl mb-2" />
        <div className="skeleton h-4 w-32 rounded-xl mb-6" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card p-4 space-y-2"><div className="skeleton h-4 rounded w-2/3"/><div className="skeleton h-3 rounded w-1/3"/></div>)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto animate-fade-in space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {firstName} 👋</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {active.length} class{active.length !== 1 ? 'es' : ''} enrolled
        </p>
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">Pending approval</p>
            <p className="text-xs text-amber-700 truncate">
              {pending.map(e => e.spaces?.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Upcoming due dates */}
      {upcoming.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-semibold text-gray-700">Due soon</h2>
            <Link to="/student/grades" className="text-xs text-brand-500 hover:underline">See all grades →</Link>
          </div>
          <div className="space-y-2">
            {upcoming.map(item => {
              const overdue = isOverdue(item.due_at)
              return (
                <Link key={item.id}
                  to={`/student/spaces/${item.space_id}/content/${item.id}`}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all active:scale-98 ${overdue ? 'border-red-100 bg-red-50/40' : 'border-amber-100 bg-amber-50/30'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${overdue ? 'bg-red-100' : 'bg-amber-100'}`}>
                    <svg className={`w-4.5 h-4.5 ${overdue ? 'text-red-500' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 truncate">{item.spaceName} · {item.type}</p>
                  </div>
                  <span className={`text-xs font-semibold flex-shrink-0 ${overdue ? 'text-red-500' : 'text-amber-600'}`}>
                    {timeUntil(item.due_at)}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent grades */}
      {recentGrades.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-semibold text-gray-700">Recent grades</h2>
            <Link to="/student/grades" className="text-xs text-brand-500 hover:underline">All grades →</Link>
          </div>
          <div className="card divide-y divide-gray-50 overflow-hidden">
            {recentGrades.map(s => (
              <Link key={s.content_id}
                to={`/student/spaces/${s.content?.space_id}/content/${s.content_id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${s.score >= 70 ? 'bg-green-50 text-green-600' : s.score >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
                  {s.score}%
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.content?.title}</p>
                  <p className="text-xs text-gray-400 truncate">{s.spaceName}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* My classes */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-gray-700">My classes</h2>
          <Link to="/student/join" className="text-xs text-brand-500 hover:underline">+ Join class</Link>
        </div>

        {active.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No classes yet</p>
            <p className="text-xs text-gray-400 mb-4">Ask your teacher for a join code to get started</p>
            <Link to="/student/join" className="btn text-sm" style={{background:'#7c3aed',borderColor:'#7c3aed',color:'#fff'}}>
              Join a class
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {active.map((e, i) => (
              <Link key={e.id} to={`/student/spaces/${e.spaces?.id}`}
                className="card p-4 flex items-center gap-3 hover:border-violet-200 hover:shadow-card-hover transition-all active:scale-98 group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: e.spaces?.cover_color || SPACE_COLORS[i % SPACE_COLORS.length] }}>
                  <span className="text-xl">{e.spaces?.icon || e.spaces?.name?.[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-violet-600 transition-colors">
                    {e.spaces?.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{e.spaces?.subject || 'No subject'}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent announcements */}
      {recentAnnouncements.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2.5">Recent announcements</h2>
          <div className="space-y-2">
            {recentAnnouncements.map(a => (
              <div key={a.id} className="card p-4">
                <div className="flex items-start gap-2 mb-1">
                  <span className="badge badge-gray text-xs flex-shrink-0">{a.spaceName}</span>
                  <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800">{a.title}</p>
                {a.body && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.body}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}