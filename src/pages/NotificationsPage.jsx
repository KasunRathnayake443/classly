import { useEffect, useState } from 'react'
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

export default function NotificationsPage() {
  const { user, profile } = useAuth()
  const [items, setItems] = useState([])        // merged space + admin announcements
  const [reads, setReads] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const now = new Date().toISOString()
    const isTeacher = profile?.role === 'teacher'

    // ── Space announcements (only for students) ─────────────────────────────
    let spaceItems = []
    if (!isTeacher) {
      const { data: spaceAnnouncements } = await supabase
        .from('announcements')
        .select('*, spaces(name, subject)')
        .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
      spaceItems = (spaceAnnouncements || []).map(a => ({
        ...a,
        _type: 'space',
        _source: a.spaces?.name || 'Class',
      }))
    }

    // ── Admin announcements (for everyone, filtered by target) ───────────────
    const { data: adminAnnouncements } = await supabase
      .from('admin_announcements')
      .select('*')
      .order('created_at', { ascending: false })

    const planSlug = profile?.plan || 'free'
    const role = profile?.role || 'student'

    const relevantAdmin = (adminAnnouncements || []).filter(a => {
      if (a.target === 'all') return true
      if (a.target === 'teachers' && role === 'teacher') return true
      if (a.target === 'students' && role === 'student') return true
      if (a.target === `plan:${planSlug}` && role === 'teacher') return true
      return false
    }).map(a => ({
      ...a,
      _type: 'admin',
      _source: '📣 Skooly',
      is_pinned: false,
    }))

    const merged = [...spaceItems, ...relevantAdmin]
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1
        if (!a.is_pinned && b.is_pinned) return 1
        return new Date(b.created_at) - new Date(a.created_at)
      })

    setItems(merged)

    // ── Read status ──────────────────────────────────────────────────────────
    const spaceIds = spaceItems.map(a => a.id)
    const adminIds = relevantAdmin.map(a => a.id)
    const readSet = new Set()

    if (spaceIds.length > 0) {
      const { data: spaceReads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('student_id', user.id)
        .in('announcement_id', spaceIds)
      ;(spaceReads || []).forEach(r => readSet.add(r.announcement_id))
    }

    if (adminIds.length > 0) {
      const { data: adminReads } = await supabase
        .from('admin_announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id)
        .in('announcement_id', adminIds)
      ;(adminReads || []).forEach(r => readSet.add(r.announcement_id))
    }

    setReads(readSet)
    setLoading(false)
  }

  async function markRead(item) {
    if (reads.has(item.id)) return
    if (item._type === 'space') {
      await supabase.from('announcement_reads').insert({ announcement_id: item.id, student_id: user.id })
    } else {
      await supabase.from('admin_announcement_reads').insert({ announcement_id: item.id, user_id: user.id })
    }
    setReads(prev => new Set([...prev, item.id]))
  }

  async function markUnread(item) {
    if (item._type === 'space') {
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

  const displayed = filter === 'unread' ? items.filter(a => !reads.has(a.id)) : items
  const unreadCount = items.filter(a => !reads.has(a.id)).length

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {profile?.role === 'teacher' ? 'Updates from Skooly' : 'Announcements from your classes and Skooly'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn btn-secondary text-sm">Mark all read</button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-100 mb-4">
        {[
          { key: 'all', label: `All (${items.length})` },
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
            {filter === 'unread' ? 'No unread notifications.' : 'Announcements from your teachers and Skooly will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(item => {
            const isRead = reads.has(item.id)
            const isAdmin = item._type === 'admin'
            return (
              <div key={item.id}
                className={`card p-4 cursor-pointer transition-all ${!isRead ? 'border-brand-200 bg-brand-50/30' : ''}`}
                onClick={() => markRead(item)}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1.5">
                    {!isRead
                      ? <div className="w-2 h-2 rounded-full bg-brand-500" />
                      : <div className="w-2 h-2" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      {item.is_pinned && (
                        <span className="badge badge-amber gap-1 text-xs">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 4v6l2 2v2h-6v6l-1 1-1-1v-6H4v-2l2-2V4h10z"/>
                          </svg>
                          Pinned
                        </span>
                      )}
                      <span className={`badge text-xs ${isAdmin ? 'badge-purple' : 'badge-gray'}`}>
                        {item._source}
                      </span>
                    </div>
                    <p className={`text-sm font-semibold ${!isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                      {item.title}
                    </p>
                    {item.body && (
                      <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{item.body}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">{timeAgo(item.created_at)}</span>
                      <button
                        onClick={e => { e.stopPropagation(); isRead ? markUnread(item) : markRead(item) }}
                        className="text-xs text-brand-500 hover:underline ml-auto">
                        {isRead ? 'Mark unread' : 'Mark read'}
                      </button>
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
