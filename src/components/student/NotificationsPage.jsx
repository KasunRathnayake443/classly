import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString()
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [reads, setReads] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'unread'

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const now = new Date().toISOString()
    // Get all announcements from enrolled spaces
    const { data: announcementsData } = await supabase
      .from('announcements')
      .select('*, spaces(name, subject)')
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    // Get read announcement IDs
    const { data: readsData } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('student_id', user.id)

    setAnnouncements(announcementsData || [])
    setReads(new Set((readsData || []).map(r => r.announcement_id)))
    setLoading(false)
  }

  async function markRead(announcementId) {
    if (reads.has(announcementId)) return
    await supabase.from('announcement_reads').insert({
      announcement_id: announcementId,
      student_id: user.id,
    })
    setReads(prev => new Set([...prev, announcementId]))
  }

  async function markUnread(announcementId) {
    await supabase.from('announcement_reads')
      .delete()
      .eq('announcement_id', announcementId)
      .eq('student_id', user.id)
    setReads(prev => { const s = new Set(prev); s.delete(announcementId); return s })
  }

  async function markAllRead() {
    const unread = announcements.filter(a => !reads.has(a.id))
    if (unread.length === 0) return
    await supabase.from('announcement_reads').insert(
      unread.map(a => ({ announcement_id: a.id, student_id: user.id }))
    )
    setReads(new Set(announcements.map(a => a.id)))
  }

  const displayed = filter === 'unread'
    ? announcements.filter(a => !reads.has(a.id))
    : announcements

  const unreadCount = announcements.filter(a => !reads.has(a.id)).length

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Announcements from all your classes</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn btn-secondary text-sm">
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-100 mb-4">
        {[
          { key: 'all', label: `All (${announcements.length})` },
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
            {filter === 'unread' ? 'All caught up!' : 'No announcements yet'}
          </p>
          <p className="text-sm text-gray-400">
            {filter === 'unread' ? 'No unread notifications.' : 'Your teachers will post updates here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(a => {
            const isRead = reads.has(a.id)
            return (
              <div key={a.id}
                className={`card p-4 transition-all ${!isRead ? 'border-brand-200 bg-brand-50/30' : ''}`}
                onClick={() => markRead(a.id)}>
                <div className="flex items-start gap-3">
                  {/* Unread dot */}
                  <div className="flex-shrink-0 mt-1">
                    {!isRead
                      ? <div className="w-2 h-2 rounded-full bg-brand-500" />
                      : <div className="w-2 h-2 rounded-full bg-transparent" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      {a.is_pinned && (
                        <span className="badge badge-amber gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 4v6l2 2v2h-6v6l-1 1-1-1v-6H4v-2l2-2V4h10z"/>
                          </svg>
                          Pinned
                        </span>
                      )}
                      <span className="badge badge-gray">{a.spaces?.name}</span>
                    </div>
                    <p className={`text-sm font-semibold ${!isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                      {a.title}
                    </p>
                    {a.body && (
                      <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{a.body}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">{timeAgo(a.created_at)}</span>
                      <button
                        onClick={e => { e.stopPropagation(); isRead ? markUnread(a.id) : markRead(a.id) }}
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
