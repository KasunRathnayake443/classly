import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getPlanLimits } from '../lib/planEngine'

const SPACE_COLORS = ['#4F46E5', '#059669', '#D97706', '#DB2777', '#0891B2', '#7C3AED']
const TODAY = new Date()
const todayKey = TODAY.toISOString().slice(0, 10)

function toKey(date) { return new Date(date).toISOString().slice(0, 10) }

// ── Mini Calendar (same pattern as student dashboard) ─────────────────────────
function MiniCalendar({ calendarItems, onDateClick }) {
  const [viewDate, setViewDate] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  const itemMap = {}
  calendarItems.forEach(item => {
    const key = item._date
    if (!itemMap[key]) itemMap[key] = []
    itemMap[key].push(item)
  })

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: prevMonthDays - firstDay + i + 1, current: false })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, current: true, dateStr, items: itemMap[dateStr] || [], isToday: dateStr === todayKey })
  }
  for (let i = 1; i <= 42 - cells.length; i++) cells.push({ day: i, current: false })

  function handleDayClick(cell) {
    if (!cell.current) return
    const newDate = selectedDate === cell.dateStr ? null : cell.dateStr
    setSelectedDate(newDate)
    onDateClick?.(newDate, cell.items || [])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-900">{monthName}</span>
        <div className="flex gap-1">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, i) => {
          const isSelected = cell.dateStr && cell.dateStr === selectedDate
          const hasItems = cell.items?.length > 0
          const hasDue = cell.items?.some(x => x.kind === 'due')
          const hasOpen = cell.items?.some(x => x.kind === 'open')
          return (
            <div key={i} className="flex flex-col items-center py-0.5">
              <button onClick={() => handleDayClick(cell)} disabled={!cell.current}
                className={['w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-colors',
                  !cell.current ? 'text-gray-300 cursor-default' : '',
                  cell.current && !cell.isToday && !isSelected ? 'text-gray-700 hover:bg-brand-50 hover:text-brand-600' : '',
                  cell.isToday && !isSelected ? 'bg-brand-600 text-white' : '',
                  isSelected ? 'bg-brand-700 text-white ring-2 ring-brand-300 ring-offset-1' : '',
                ].join(' ')}>
                {cell.day}
              </button>
              {hasItems && (
                <div className="flex gap-0.5 mt-0.5">
                  {hasDue && <div className="w-1 h-1 rounded-full bg-amber-400" />}
                  {hasOpen && <div className="w-1 h-1 rounded-full bg-green-400" />}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"/><span className="text-xs text-gray-400">Due</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400"/><span className="text-xs text-gray-400">Opens</span></div>
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">{icon}</div>
      </div>
      <p className={`text-2xl sm:text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { profile, user, subscription } = useAuth()
  const { refreshSpaces, spaceRefreshCount } = useOutletContext() || {}
  const [spaces, setSpaces] = useState([])
  const [stats, setStats] = useState({ spaces: 0, students: 0, content: 0 })
  const [calendarItems, setCalendarItems] = useState([])
  const [upcoming, setUpcoming] = useState([])        // content due in next 7 days
  const [selectedDayItems, setSelectedDayItems] = useState(null) // { date, items }
  const [calendarOpen, setCalendarOpen] = useState(false) // mobile calendar sheet
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDashboardData() }, [spaceRefreshCount, subscription])
  useEffect(() => {
    function handleFocus() { fetchDashboardData() }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  async function fetchDashboardData() {
    if (!user?.id) return

    const { data, error } = await supabase.rpc('get_teacher_dashboard', { teacher_id: user.id })
    if (error) { setLoading(false); return }

    const limits = getPlanLimits(subscription?.plan)
    const maxSpaces = limits.max_spaces

    const enriched = (data || []).map((space, i) => ({
      ...space,
      studentCount: Number(space.student_count) || 0,
      contentCount: Number(space.content_count) || 0,
      isLocked: space.is_locked || i >= maxSpaces,
    }))
    setSpaces(enriched)
    setStats({
      spaces: enriched.length,
      students: enriched.reduce((s, sp) => s + sp.studentCount, 0),
      content: enriched.reduce((s, sp) => s + sp.contentCount, 0),
    })

    // Fetch upcoming content deadlines for calendar + upcoming list
    if (enriched.length > 0) {
      const spaceIds = enriched.map(s => s.space_id)
      const in7d = new Date(Date.now() + 7 * 24 * 3600000).toISOString()
      const now = new Date().toISOString()
      const spaceNameMap = Object.fromEntries(enriched.map(s => [s.space_id, s.space_name]))

      const { data: contentData } = await supabase
        .from('content')
        .select('id, title, type, due_at, available_from, space_id')
        .in('space_id', spaceIds)
        .or('due_at.not.is.null,available_from.not.is.null')

      const calItems = (contentData || []).flatMap(c => {
        const out = []
        if (c.due_at) out.push({ id: c.id + '-due', content_id: c.id, space_id: c.space_id, title: c.title, type: c.type, _date: toKey(c.due_at), kind: 'due', spaceName: spaceNameMap[c.space_id], due_at: c.due_at })
        if (c.available_from) out.push({ id: c.id + '-open', content_id: c.id, space_id: c.space_id, title: c.title, type: c.type, _date: toKey(c.available_from), kind: 'open', spaceName: spaceNameMap[c.space_id] })
        return out
      })
      setCalendarItems(calItems)

      // Upcoming = due within 7 days
      const upcomingItems = calItems
        .filter(c => c.kind === 'due' && c.due_at >= now && c.due_at <= in7d)
        .sort((a, b) => a.due_at.localeCompare(b.due_at))
        .slice(0, 6)
      setUpcoming(upcomingItems)
    }

    setLoading(false)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  function handleCalendarDateClick(date, items) {
    setSelectedDayItems(date ? { date, items } : null)
  }

  if (loading) return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="skeleton h-8 w-48 rounded-xl mb-2" />
      <div className="skeleton h-4 w-32 rounded-xl mb-5" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile calendar bottom sheet */}
      {calendarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setCalendarOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <MiniCalendar calendarItems={calendarItems} onDateClick={handleCalendarDateClick} />
            {selectedDayItems && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  {new Date(selectedDayItems.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                {selectedDayItems.items.length === 0 ? (
                  <p className="text-xs text-gray-400">Nothing scheduled.</p>
                ) : selectedDayItems.items.map(item => (
                  <Link key={item.id} to={`/teacher/spaces/${item.space_id}/content/${item.content_id}`}
                    className="flex items-center gap-2 py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.kind === 'due' ? 'bg-amber-400' : 'bg-green-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                      <p className="text-xs text-gray-400">{item.spaceName} · {item.kind === 'due' ? 'Due' : 'Opens'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {upcoming.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Due this week</h3>
                {upcoming.map(item => (
                  <Link key={item.id} to={`/teacher/spaces/${item.space_id}/content/${item.content_id}`}
                    className="flex items-center gap-2 py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                      <p className="text-xs text-gray-400">{item.spaceName}</p>
                    </div>
                    <p className="text-xs text-gray-500 flex-shrink-0">{new Date(item.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex min-h-full">

        {/* ── Main column ── */}
        <div className="flex-1 min-w-0 p-4 sm:p-6 pb-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{greeting}, {firstName} 👋</h1>
              <p className="text-sm text-gray-500 mt-0.5">Here's an overview of your classes</p>
            </div>
            {/* Calendar toggle — mobile */}
            <button onClick={() => setCalendarOpen(true)}
              className="relative lg:hidden w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              {upcoming.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                  {upcoming.length}
                </span>
              )}
            </button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatCard label="Active classes" value={stats.spaces} color="text-brand-600"
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>}
            />
            <StatCard label="Total students" value={stats.students} color="text-emerald-600"
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>}
            />
            <StatCard label="Content items" value={stats.content} color="text-amber-600"
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
            />
          </div>

          {/* Due this week — mobile only */}
          {upcoming.length > 0 && (
            <div className="card p-4 mb-4 lg:hidden">
              <h2 className="text-sm font-semibold text-gray-800 mb-2">Due this week</h2>
              <div className="divide-y divide-gray-50">
                {upcoming.slice(0, 4).map(item => (
                  <Link key={item.id} to={`/teacher/spaces/${item.space_id}/content/${item.content_id}`}
                    className="flex items-center gap-3 py-2.5 group">
                    <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-brand-600 transition-colors">{item.title}</p>
                      <p className="text-xs text-gray-400">{item.spaceName}</p>
                    </div>
                    <p className="text-xs text-gray-500 flex-shrink-0">{new Date(item.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Classes */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Your classes</h2>
          </div>

          {spaces.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-800 mb-1">No classes yet</p>
              <p className="text-xs text-gray-400">Click the + next to "Classes" in the sidebar to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {spaces.map((space, i) => (
                <Link key={space.space_id} to={`/teacher/spaces/${space.space_id}`}
                  className={`card p-4 transition-all duration-150 group relative overflow-hidden active:scale-98 ${space.isLocked ? 'opacity-75' : 'hover:border-brand-200 hover:shadow-card-hover'}`}>

                  {space.isLocked && (
                    <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Locked — upgrade to unlock
                    </div>
                  )}

                  <div className={`flex items-start gap-3 ${space.isLocked ? 'mt-7' : ''}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${space.isLocked ? 'bg-gray-200' : ''}`}
                      style={!space.isLocked ? { background: space.cover_color || SPACE_COLORS[i % SPACE_COLORS.length] } : {}}>
                      {space.isLocked
                        ? <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        : <span className="text-xl">{space.icon || space.space_name?.[0]?.toUpperCase()}</span>
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold truncate transition-colors ${space.isLocked ? 'text-gray-400' : 'text-gray-900 group-hover:text-brand-600'}`}>
                        {space.space_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{space.subject || 'No subject'}</p>
                    </div>
                  </div>

                  {!space.isLocked && (
                    <div className="flex items-center gap-3 mt-3.5 pt-3 border-t border-gray-50 text-xs text-gray-400">
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
                      <span className="ml-auto font-mono tracking-widest text-gray-300 text-xs">{space.join_code}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Right sidebar: calendar + upcoming (desktop only) ── */}
        <div className="hidden lg:block w-72 xl:w-80 flex-shrink-0 border-l border-gray-100 bg-white">
          <div className="sticky top-0 p-4 space-y-4 overflow-y-auto max-h-screen">

            {/* Mini calendar */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Calendar</h3>
                <Link to="/teacher/calendar" className="text-xs text-brand-600 font-medium hover:underline">Full calendar →</Link>
              </div>
              <MiniCalendar calendarItems={calendarItems} onDateClick={handleCalendarDateClick} />
            </div>

            {/* Selected day detail */}
            {selectedDayItems && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  {new Date(selectedDayItems.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                {selectedDayItems.items.length === 0 ? (
                  <p className="text-xs text-gray-400">Nothing scheduled.</p>
                ) : (
                  <div className="space-y-1">
                    {selectedDayItems.items.map(item => (
                      <Link key={item.id} to={`/teacher/spaces/${item.space_id}/content/${item.content_id}`}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.kind === 'due' ? 'bg-amber-400' : 'bg-green-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate group-hover:text-brand-600 transition-colors">{item.title}</p>
                          <p className="text-xs text-gray-400 truncate">{item.spaceName} · {item.kind === 'due' ? 'Due' : 'Opens'}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Upcoming due dates */}
            {upcoming.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">Due this week</h3>
                  <span className="badge badge-amber text-xs">{upcoming.length}</span>
                </div>
                <div className="space-y-1">
                  {upcoming.map(item => (
                    <Link key={item.id} to={`/teacher/spaces/${item.space_id}/content/${item.content_id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                      <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate group-hover:text-brand-600 transition-colors">{item.title}</p>
                        <p className="text-xs text-gray-400 truncate">{item.spaceName}</p>
                      </div>
                      <p className="text-xs text-gray-500 flex-shrink-0">{new Date(item.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {upcoming.length === 0 && !selectedDayItems && (
              <div className="border-t border-gray-100 pt-4 text-center py-4">
                <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-500">All clear!</p>
                <p className="text-xs text-gray-400">No deadlines this week</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  )
}