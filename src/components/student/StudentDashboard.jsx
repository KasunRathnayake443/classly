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

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ calendarItems }) {
  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  // Build itemMap keyed by date — stores full items so we can render them on click
  const itemMap = {}
  calendarItems.forEach(item => {
    if (item.due_at) {
      const key = new Date(item.due_at).toISOString().slice(0, 10)
      if (!itemMap[key]) itemMap[key] = []
      if (!itemMap[key].find(x => x.id === item.id && x.kind === 'due'))
        itemMap[key].push({ ...item, kind: 'due' })
    }
    if (item.available_from) {
      const key = new Date(item.available_from).toISOString().slice(0, 10)
      if (!itemMap[key]) itemMap[key] = []
      if (!itemMap[key].find(x => x.id === item.id && x.kind === 'start'))
        itemMap[key].push({ ...item, kind: 'start' })
    }
  })

  const cells = []
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: prevMonthDays - firstDay + i + 1, current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, current: true, dateStr, items: itemMap[dateStr] || [], isToday: dateStr === todayKey })
  }
  for (let i = 1; i <= 42 - cells.length; i++) {
    cells.push({ day: i, current: false })
  }

  function handlePrevMonth() { setViewDate(new Date(year, month - 1, 1)); setSelectedDate(null) }
  function handleNextMonth() { setViewDate(new Date(year, month + 1, 1)); setSelectedDate(null) }
  function handleDayClick(cell) {
    if (!cell.current) return
    setSelectedDate(prev => prev === cell.dateStr ? null : cell.dateStr)
  }

  const selectedItems = selectedDate ? (itemMap[selectedDate] || []) : []
  const selectedLabel = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-900">{monthName}</span>
        <div className="flex gap-1">
          <button onClick={handlePrevMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button onClick={handleNextMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, i) => {
          const isSelected = cell.dateStr && cell.dateStr === selectedDate
          const hasItems = cell.items?.length > 0
          return (
            <div key={i} className="flex flex-col items-center py-0.5">
              <button
                onClick={() => handleDayClick(cell)}
                disabled={!cell.current}
                className={[
                  'w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-colors',
                  !cell.current ? 'text-gray-300 cursor-default' : '',
                  cell.current && !cell.isToday && !isSelected ? 'text-gray-700 hover:bg-violet-50 hover:text-violet-600' : '',
                  cell.isToday && !isSelected ? 'bg-violet-600 text-white' : '',
                  isSelected ? 'bg-violet-700 text-white ring-2 ring-violet-300 ring-offset-1' : '',
                  cell.current && hasItems && !isSelected && !cell.isToday ? 'font-bold' : '',
                ].join(' ')}
              >
                {cell.day}
              </button>
              {hasItems && (
                <div className="flex gap-0.5 mt-0.5">
                  {cell.items.slice(0, 3).map((item, di) => (
                    <div key={di} className={`w-1 h-1 rounded-full ${
                      item.kind === 'start' ? 'bg-green-400' :
                      item.type === 'quiz' ? 'bg-amber-400' : 'bg-pink-400'
                    }`} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"/><span className="text-xs text-gray-400">Quiz</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-pink-400"/><span className="text-xs text-gray-400">Assignment</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400"/><span className="text-xs text-gray-400">Opens</span></div>
      </div>

      {/* Selected date detail panel */}
      {selectedDate && (
        <div className="mt-3 pt-3 border-t border-violet-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">{selectedLabel}</p>
            <button onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          {selectedItems.length === 0 ? (
            <p className="text-xs text-gray-400 py-1 text-center">Nothing scheduled on this day.</p>
          ) : (
            <div className="space-y-1">
              {selectedItems.map((item) => (
                <Link
                  key={`${item.id}-${item.kind}`}
                  to={`/student/spaces/${item.space_id}/content/${item.id}`}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.kind === 'start' ? 'bg-green-400' :
                    item.type === 'quiz' ? 'bg-amber-400' : 'bg-pink-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate group-hover:text-violet-600 transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {item.spaceName} · {item.kind === 'start' ? 'Opens' : item.type === 'quiz' ? 'Quiz due' : 'Due'}
                    </p>
                  </div>
                  <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-violet-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Upcoming item row ─────────────────────────────────────────────────────────
function UpcomingItem({ item }) {
  const overdue = isOverdue(item.due_at)
  return (
    <Link to={`/student/spaces/${item.space_id}/content/${item.id}`}
      className="flex items-center gap-3 py-2.5 group">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        overdue ? 'bg-red-400' : item.type === 'quiz' ? 'bg-amber-400' : 'bg-pink-400'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-violet-600 transition-colors">{item.title}</p>
        <p className="text-xs text-gray-400 truncate">{item.spaceName} · {item.type}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className={`text-xs font-semibold ${overdue ? 'text-red-500' : 'text-gray-600'}`}>{timeUntil(item.due_at)}</p>
        <p className="text-xs text-gray-400">{formatDate(item.due_at)}</p>
      </div>
    </Link>
  )
}

// ── Upcoming list (reused in sidebar + mobile sheet) ──────────────────────────
function UpcomingList({ upcoming }) {
  if (upcoming.length === 0) {
    return (
      <div className="py-5 text-center">
        <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-2">
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <p className="text-xs font-medium text-gray-500">All caught up!</p>
        <p className="text-xs text-gray-400">No items due this week</p>
      </div>
    )
  }
  return (
    <div className="divide-y divide-gray-50">
      {upcoming.map(item => <UpcomingItem key={item.id} item={item} />)}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, colorClass, icon }) {
  return (
    <div className={`rounded-2xl p-3.5 ${colorClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium opacity-75">{label}</span>
        <div className="w-6 h-6 bg-white/25 rounded-lg flex items-center justify-center">{icon}</div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { profile, user } = useAuth()
  const [active, setActive] = useState([])
  const [pending, setPending] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [calendarItems, setCalendarItems] = useState([])
  const [personalCalItems, setPersonalCalItems] = useState([])
  const [recentGrades, setRecentGrades] = useState([])
  const [recentAnnouncements, setRecentAnnouncements] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, submitted: 0 })
  const [loading, setLoading] = useState(true)
  const [calendarOpen, setCalendarOpen] = useState(false)

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

    const [contentRes, allContentRes, submissionsRes, annoRes, allScoredContentRes, personalCalRes] = await Promise.all([
      // Due within 7 days (for upcoming list)
      supabase.from('content').select('id, title, type, due_at, available_from, space_id')
        .in('space_id', spaceIds).in('type', ['quiz', 'assignment'])
        .not('due_at', 'is', null).lte('due_at', in7d)
        .order('due_at', { ascending: true }),
      // All future content (for calendar dots)
      supabase.from('content').select('id, title, type, due_at, available_from, space_id')
        .in('space_id', spaceIds).in('type', ['quiz', 'assignment'])
        .or(`due_at.gte.${now},available_from.gte.${now}`)
        .order('due_at', { ascending: true }),
      supabase.from('submissions').select('content_id, score, status, submitted_at')
        .eq('student_id', user.id).order('submitted_at', { ascending: false }).limit(50),
      supabase.from('announcements').select('id, title, body, created_at, space_id')
        .in('space_id', spaceIds).or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
        .order('created_at', { ascending: false }).limit(4),
      // All scoreable content titles — avoids a serial fetch for recent grades
      supabase.from('content').select('id, title, type, space_id')
        .in('space_id', spaceIds).in('type', ['quiz', 'assignment']),
      // Personal calendar items
      supabase.from('student_calendar_items').select('id, title, type, date, time').eq('student_id', user.id),
    ])

    const allContentMap = Object.fromEntries((allScoredContentRes.data || []).map(c => [c.id, c]))

    const submittedIds = new Set((submissionsRes.data || []).map(s => s.content_id))

    setUpcoming(
      (contentRes.data || []).filter(c => !submittedIds.has(c.id))
        .map(c => ({ ...c, spaceName: spaceMap[c.space_id] }))
    )
    setCalendarItems((allContentRes.data || []).map(c => ({ ...c, spaceName: spaceMap[c.space_id] })))
    setPersonalCalItems((personalCalRes.data || []).map(i => ({ ...i, _personal: true, due_at: i.date + (i.time ? 'T' + i.time : 'T00:00:00') })))

    const totalAssignable = (allContentRes.data || []).length
    const submittedCount = (submissionsRes.data || []).length
    setStats({ total: totalAssignable, submitted: submittedCount, pending: Math.max(0, totalAssignable - submittedCount) })

    const graded = (submissionsRes.data || []).filter(s => s.score != null).slice(0, 4)
    setRecentGrades(graded.map(s => ({
      ...s, content: allContentMap[s.content_id], spaceName: spaceMap[allContentMap[s.content_id]?.space_id],
    })).filter(s => s.content))

    setRecentAnnouncements((annoRes.data || []).map(a => ({ ...a, spaceName: spaceMap[a.space_id] })))
    setLoading(false)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="skeleton h-8 w-48 rounded-xl mb-2" />
        <div className="skeleton h-4 w-32 rounded-xl mb-5" />
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card p-4"><div className="skeleton h-4 rounded w-2/3"/></div>)}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile calendar bottom sheet */}
      {calendarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setCalendarOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <MiniCalendar calendarItems={[...calendarItems, ...personalCalItems]} />
            {upcoming.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Upcoming</h3>
                <UpcomingList upcoming={upcoming} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Two-column layout: main + right sidebar */}
      <div className="flex min-h-full">

        {/* ── Main content column ── */}
        <div className="flex-1 min-w-0 p-4 sm:p-6">

          {/* Header row */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{greeting}, {firstName} 👋</h1>
              <p className="text-sm text-gray-400 mt-0.5">{active.length} class{active.length !== 1 ? 'es' : ''} enrolled</p>
            </div>
            {/* Calendar toggle — mobile only */}
            <button onClick={() => setCalendarOpen(true)}
              className="relative lg:hidden w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              {upcoming.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                  {upcoming.length > 9 ? '9+' : upcoming.length}
                </span>
              )}
            </button>
          </div>

          {/* Pending approval banner */}
          {pending.length > 0 && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">Pending approval</p>
                <p className="text-xs text-amber-700 truncate">{pending.map(e => e.spaces?.name).join(', ')}</p>
              </div>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-5">
            <StatCard label="Total" value={stats.total} colorClass="bg-violet-600 text-white"
              icon={<svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
            />
            <StatCard label="Pending" value={stats.pending} colorClass="bg-amber-400 text-white"
              icon={<svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            />
            <StatCard label="Done" value={stats.submitted} colorClass="bg-emerald-500 text-white"
              icon={<svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            />
          </div>

          {/* Due soon — mobile only (inline card) */}
          {upcoming.length > 0 && (
            <div className="card p-4 mb-4 lg:hidden">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-800">Due soon</h2>
                <span className="badge badge-amber">{upcoming.length}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {upcoming.slice(0, 4).map(item => <UpcomingItem key={item.id} item={item} />)}
              </div>
              {upcoming.length > 4 && (
                <p className="text-xs text-center text-gray-400 pt-2 border-t border-gray-50 mt-1">
                  +{upcoming.length - 4} more
                </p>
              )}
            </div>
          )}

          {/* My classes */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">My classes</h2>
              <Link to="/student/join" className="text-xs text-violet-600 font-medium hover:underline">+ Join class</Link>
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
                <Link to="/student/join" className="btn text-sm" style={{background:'#7c3aed',borderColor:'#7c3aed',color:'#fff'}}>Join a class</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {active.map((e, i) => (
                  <Link key={e.id} to={`/student/spaces/${e.spaces?.id}`}
                    className="card p-3.5 flex items-center gap-3 hover:border-violet-200 hover:shadow-md transition-all active:scale-98 group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                      style={{ background: e.spaces?.cover_color || SPACE_COLORS[i % SPACE_COLORS.length] }}>
                      {e.spaces?.icon || e.spaces?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-violet-600 transition-colors">{e.spaces?.name}</p>
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

          {/* Recent grades */}
          {recentGrades.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">Recent grades</h2>
                <Link to="/student/grades" className="text-xs text-violet-600 font-medium hover:underline">All grades →</Link>
              </div>
              <div className="card divide-y divide-gray-50 overflow-hidden">
                {recentGrades.map(s => (
                  <Link key={s.content_id} to={`/student/spaces/${s.content?.space_id}/content/${s.content_id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm
                      ${s.score >= 70 ? 'bg-green-50 text-green-600' : s.score >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
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

          {/* Announcements */}
          {recentAnnouncements.length > 0 && (
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent announcements</h2>
              <div className="space-y-2">
                {recentAnnouncements.map(a => (
                  <div key={a.id} className="card p-4">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="badge badge-gray text-xs flex-shrink-0">{a.spaceName}</span>
                      <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{a.title}</p>
                    {a.body && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.body}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar: calendar + upcoming (desktop only) ── */}
        <div className="hidden lg:block w-72 xl:w-80 flex-shrink-0 border-l border-gray-100 bg-white">
          <div className="sticky top-0 p-4 space-y-4">
            {/* Calendar */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Calendar</h3>
              <MiniCalendar calendarItems={[...calendarItems, ...personalCalItems]} />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-gray-800">Upcoming</h3>
                {upcoming.length > 0 && <span className="badge badge-amber">{upcoming.length}</span>}
              </div>
              <UpcomingList upcoming={upcoming} />
            </div>
          </div>
        </div>

      </div>
    </>
  )
}