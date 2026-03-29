import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString()
}

function timeUntil(date) {
  const diff = new Date(date) - new Date()
  if (diff <= 0) return 'overdue'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'less than 1 hour'
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export default function NotificationsPage() {
  const { user, profile } = useAuth()
  const [items, setItems] = useState([])
  const [reminders, setReminders] = useState([])  // due date reminders (students only)
  const [reads, setReads] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchAll() }, [])

  // Auto-dismiss reminders when page is visited — clear the badge
  useEffect(() => {
    if (!user) return
    const key = `skooly_reminder_dismissed_${user.id}`
    const dismissed = JSON.parse(localStorage.getItem(key) || '[]')
    // We'll save current reminder IDs after fetch completes
  }, [user])

  async function fetchAll() {
    const now = new Date().toISOString()
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const isTeacher = profile?.role === 'teacher'
    const planSlug = profile?.plan || 'free'
    const role = profile?.role || 'student'

    // Fetch everything possible in parallel on first pass
    const [enrollmentsRes, contentNotifsRes, spaceAnnouncementsRes, adminAnnouncementsRes] = await Promise.all([
      isTeacher ? Promise.resolve({ data: [] }) :
        supabase.from('enrollments').select('space_id, spaces(name)')
          .eq('student_id', user.id).eq('status', 'active'),
      isTeacher ? Promise.resolve({ data: [] }) :
        supabase.from('content_notifications')
          .select('*, content(id, title, type, space_id, available_from, spaces(name))')
          .eq('student_id', user.id)
          .order('notified_at', { ascending: false }).limit(20),
      isTeacher ? Promise.resolve({ data: [] }) :
        supabase.from('announcements').select('*, spaces(name, subject)')
          .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false }),
      supabase.from('admin_announcements').select('*')
        .order('created_at', { ascending: false }),
    ])

    const enrollments = enrollmentsRes.data || []
    const spaceIds = enrollments.map(e => e.space_id)
    const spaceMap = Object.fromEntries(enrollments.map(e => [e.space_id, e.spaces?.name]))

    const spaceItems = (spaceAnnouncementsRes.data || []).map(a => ({
      ...a, _type: 'space', _source: a.spaces?.name || 'Class',
    }))
    const relevantAdmin = (adminAnnouncementsRes.data || []).filter(a => {
      if (a.target === 'all') return true
      if (a.target === 'teachers' && role === 'teacher') return true
      if (a.target === 'students' && role === 'student') return true
      if (a.target === `plan:${planSlug}` && role === 'teacher') return true
      return false
    }).map(a => ({ ...a, _type: 'admin', _source: '📣 Skooly', is_pinned: false }))

    const spaceAnnoIds = spaceItems.map(a => a.id)
    const adminIds = relevantAdmin.map(a => a.id)

    // Second parallel pass — queries that depend on first pass results
    const [dueContentRes, submissionsRes, spaceReadsRes, adminReadsRes] = await Promise.all([
      spaceIds.length > 0 && !isTeacher
        ? supabase.from('content').select('id, title, type, due_at, space_id')
            .in('space_id', spaceIds).in('type', ['assignment', 'quiz'])
            .gte('due_at', now).lte('due_at', in24h).order('due_at', { ascending: true })
        : Promise.resolve({ data: [] }),
      !isTeacher
        ? supabase.from('submissions').select('content_id').eq('student_id', user.id)
        : Promise.resolve({ data: [] }),
      spaceAnnoIds.length > 0
        ? supabase.from('announcement_reads').select('announcement_id')
            .eq('student_id', user.id).in('announcement_id', spaceAnnoIds)
        : Promise.resolve({ data: [] }),
      adminIds.length > 0
        ? supabase.from('admin_announcement_reads').select('announcement_id')
            .eq('user_id', user.id).in('announcement_id', adminIds)
        : Promise.resolve({ data: [] }),
    ])

    // Build due reminders
    const submittedIds = new Set((submissionsRes.data || []).map(s => s.content_id))
    const dueReminders = (dueContentRes.data || [])
      .filter(c => !submittedIds.has(c.id))
      .map(c => ({
        id: `reminder-${c.id}`, _type: 'reminder', _contentId: c.id, _spaceId: c.space_id,
        title: `${c.type === 'quiz' ? 'Quiz' : 'Assignment'} due soon: ${c.title}`,
        body: null, due_at: c.due_at, created_at: c.due_at,
        _source: spaceMap[c.space_id] || 'Class', is_pinned: false,
      }))
    setReminders(dueReminders)

    if (dueReminders.length > 0) {
      const key = `skooly_reminder_dismissed_${user.id}`
      const dismissed = JSON.parse(localStorage.getItem(key) || '[]')
      const newIds = dueReminders.map(r => r.id).filter(id => !dismissed.includes(id))
      if (newIds.length > 0) localStorage.setItem(key, JSON.stringify([...dismissed, ...newIds]))
    }

    // Build content notification items
    const contentNotifItems = (contentNotifsRes.data || [])
      .filter(n => n.content)
      .map(n => ({
        id: `content-notif-${n.id}`, _notifId: n.id,
        _type: 'content_notif', _contentId: n.content.id, _spaceId: n.content.space_id,
        title: `New ${n.content.type}: ${n.content.title}`,
        body: null, created_at: n.notified_at,
        _source: n.content.spaces?.name || 'Class', is_pinned: false,
      }))

    // Merge and sort
    const merged = [...contentNotifItems, ...spaceItems, ...relevantAdmin].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      return new Date(b.created_at) - new Date(a.created_at)
    })
    setItems(merged)

    // Build read set
    const readSet = new Set()
    ;(spaceReadsRes.data || []).forEach(r => readSet.add(r.announcement_id))
    ;(adminReadsRes.data || []).forEach(r => readSet.add(r.announcement_id))
    const contentNotifReadKey = `skooly_content_notif_reads_${user.id}`
    JSON.parse(localStorage.getItem(contentNotifReadKey) || '[]').forEach(id => readSet.add(id))
    setReads(readSet)
    setLoading(false)
  }

    async function markRead(item) {
    if (item._type === 'reminder') return
    if (reads.has(item.id)) return
    if (item._type === 'content_notif') {
      const key = `skooly_content_notif_reads_${user.id}`
      const saved = JSON.parse(localStorage.getItem(key) || '[]')
      localStorage.setItem(key, JSON.stringify([...saved, item.id]))
    } else if (item._type === 'space') {
      await supabase.from('announcement_reads').insert({ announcement_id: item.id, student_id: user.id })
    } else {
      await supabase.from('admin_announcement_reads').insert({ announcement_id: item.id, user_id: user.id })
    }
    setReads(prev => new Set([...prev, item.id]))
  }

  async function markUnread(item) {
    if (item._type === 'reminder') return
    if (item._type === 'content_notif') {
      const key = `skooly_content_notif_reads_${user.id}`
      const saved = JSON.parse(localStorage.getItem(key) || '[]')
      localStorage.setItem(key, JSON.stringify(saved.filter(id => id !== item.id)))
    } else if (item._type === 'space') {
      await supabase.from('announcement_reads').delete().eq('announcement_id', item.id).eq('student_id', user.id)
    } else {
      await supabase.from('admin_announcement_reads').delete().eq('announcement_id', item.id).eq('user_id', user.id)
    }
    setReads(prev => { const s = new Set(prev); s.delete(item.id); return s })
  }

  async function markAllRead() {
    const unread = items.filter(a => !reads.has(a.id))
    const spaceUnread = unread.filter(a => a._type === 'space')
    const adminUnread = unread.filter(a => a._type === 'admin')
    await Promise.all([
      spaceUnread.length > 0 && supabase.from('announcement_reads').insert(
        spaceUnread.map(a => ({ announcement_id: a.id, student_id: user.id }))
      ),
      adminUnread.length > 0 && supabase.from('admin_announcement_reads').insert(
        adminUnread.map(a => ({ announcement_id: a.id, user_id: user.id }))
      ),
    ])
    setReads(new Set(items.map(a => a.id)))
  }

  // Combine reminders + items for display
  const allItems = [...reminders, ...items]
  const unreadCount = items.filter(a => !reads.has(a.id)).length + reminders.length
  const displayed = filter === 'unread'
    ? [...reminders, ...items.filter(a => !reads.has(a.id))]
    : allItems

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {profile?.role === 'teacher' ? 'Updates from Skooly' : 'Reminders and announcements from your classes'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn btn-secondary text-sm">Mark all read</button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-100 mb-4">
        {[
          { key: 'all', label: `All (${allItems.length})` },
          { key: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
        ].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${filter === t.key ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="card p-4 space-y-2">
              <div className="skeleton h-3.5 rounded w-1/3" />
              <div className="skeleton h-3 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">
            {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
          </p>
          <p className="text-sm text-gray-400">
            {filter === 'unread' ? 'No unread notifications.' : 'Announcements and reminders will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(item => {
            const isRead = item._type === 'reminder' ? false : reads.has(item.id)
            const isReminder = item._type === 'reminder'
            const isAdmin = item._type === 'admin'
            const isOverdue = isReminder && new Date(item.due_at) < new Date()

            return (
              <div key={item.id}
                className={`card p-4 transition-all ${
                  isReminder
                    ? isOverdue ? 'border-red-200 bg-red-50/30' : 'border-amber-200 bg-amber-50/30'
                    : !isRead ? 'border-brand-200 bg-brand-50/30' : ''
                } ${!isReminder ? 'cursor-pointer' : ''}`}
                onClick={() => !isReminder && markRead(item)}>
                <div className="flex items-start gap-3">
                  {/* Left indicator */}
                  <div className="flex-shrink-0 mt-1.5">
                    {isReminder ? (
                      <div className={`w-2 h-2 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-amber-500'}`} />
                    ) : !isRead ? (
                      <div className="w-2 h-2 rounded-full bg-brand-500" />
                    ) : (
                      <div className="w-2 h-2" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Source badge */}
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      {item.is_pinned && (
                        <span className="badge badge-amber gap-1 text-xs">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 4v6l2 2v2h-6v6l-1 1-1-1v-6H4v-2l2-2V4h10z"/>
                          </svg>
                          Pinned
                        </span>
                      )}
                      {isReminder && (
                        <span className={`badge text-xs gap-1 ${isOverdue ? 'badge-red' : 'badge-amber'}`}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          {isOverdue ? 'Overdue' : 'Due soon'}
                        </span>
                      )}
                      <span className={`badge text-xs ${isAdmin ? 'badge-purple' : isReminder ? 'badge-gray' : item._type === 'content_notif' ? 'badge-green' : 'badge-gray'}`}>
                        {item._source}
                      </span>
                    </div>

                    {/* Title */}
                    <p className={`text-sm font-semibold ${!isRead || isReminder ? 'text-gray-900' : 'text-gray-700'}`}>
                      {item.title}
                    </p>

                    {/* Body */}
                    {item.body && (
                      <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{item.body}</p>
                    )}

                    {/* Footer row */}
                    <div className="flex items-center gap-3 mt-2">
                      {item._type === 'content_notif' ? (
                        <>
                          <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          <Link
                            to={`/student/spaces/${item._spaceId}/content/${item._contentId}`}
                            className="ml-auto text-xs font-semibold text-brand-500 hover:underline"
                            onClick={e => { e.stopPropagation(); markRead(item) }}>
                            Open →
                          </Link>
                        </>
                    ) : isReminder ? (
                        <>
                          <span className="text-xs text-gray-400">
                            Due {new Date(item.due_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                          <Link
                            to={`/student/spaces/${item._spaceId}/content/${item._contentId}`}
                            className="ml-auto text-xs font-semibold text-brand-500 hover:underline"
                            onClick={e => e.stopPropagation()}>
                            Go to {item.title.includes('Quiz') ? 'quiz' : 'assignment'} →
                          </Link>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-gray-400">{timeAgo(item.created_at)}</span>
                          <button
                            onClick={e => { e.stopPropagation(); isRead ? markUnread(item) : markRead(item) }}
                            className="text-xs text-brand-500 hover:underline ml-auto">
                            {isRead ? 'Mark unread' : 'Mark read'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}