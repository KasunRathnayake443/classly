import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { getContentState, getContentStateLabel, formatDateTime } from '../../lib/contentState'

const TYPE_STYLES = {
  note:       { label: 'Note',       bg: 'bg-green-50',  text: 'text-green-700' },
  quiz:       { label: 'Quiz',       bg: 'bg-amber-50',  text: 'text-amber-700' },
  assignment: { label: 'Assignment', bg: 'bg-pink-50',   text: 'text-pink-700'  },
}

export default function StudentSpacePage() {
  const { spaceId } = useParams()
  const { user } = useAuth()
  const [space, setSpace] = useState(null)
  const [content, setContent] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchAll()
  }, [spaceId])

  async function fetchAll() {
    setLoading(true)
    // Single RPC replaces 4 queries — checks enrollment, fetches space+content+submissions
    const { data, error } = await supabase.rpc('get_student_space_data', {
      p_space_id: spaceId,
      p_student_id: user.id,
    })
    if (error || !data) { setLoading(false); return }
    if (!data.enrollment_status || data.enrollment_status !== 'active') {
      setLoading(false)
      return
    }
    setSpace(data.space)
    setContent(data.content || [])
    setSubmissions(data.submissions || [])
    setLoading(false)
  }

  const filteredContent = search.trim()
    ? content.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : content

  // Build a quick lookup: content_id -> submission
  const submissionMap = submissions.reduce((acc, s) => {
    acc[s.content_id] = s
    return acc
  }, {})

  // Progress only counts quizzes and assignments (not notes — notes don't need submission)
  const scoreable = content.filter(c => c.type === 'quiz' || c.type === 'assignment')
  const completedScoreable = scoreable.filter(c => submissionMap[c.id]).length

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading...</div>
  if (!space) return <div className="p-6 text-sm text-red-500">Space not found.</div>

  // Admin-locked space — student cannot access
  if (space.is_locked) {
    return (
      <div className="p-6 max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">This space is temporarily unavailable</h2>
        <p className="text-sm text-gray-500 mb-6">This class has been locked. Please contact your teacher for more information.</p>
        <a href="/student" className="btn btn-secondary">Back to my classes</a>
      </div>
    )
  }

  const completed = content.filter(c => submissionMap[c.id]).length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{space.name}</h1>
        {space.subject && <p className="text-sm text-gray-400 mt-0.5">{space.subject}</p>}
      </div>

      {/* Class banner */}
      <div className="rounded-2xl overflow-hidden mb-5 shadow-sm">
        <div className="h-24 flex items-end px-5 pb-4 relative overflow-hidden"
          style={space.cover_image_url
            ? { backgroundImage: `url(${space.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: space.cover_color || '#4F46E5' }}>
          {space.cover_image_url && <div className="absolute inset-0 bg-black/30" />}
          <div className="flex items-end gap-3 w-full relative z-10">
            <span className="text-4xl drop-shadow">{space.icon || '📚'}</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-xl leading-tight truncate">{space.name}</h1>
              {space.subject && <p className="text-white/75 text-sm">{space.subject}</p>}
            </div>
          </div>
        </div>
        {/* Teacher info + description */}
        <div className="bg-white border border-t-0 border-gray-100 rounded-b-2xl px-5 py-3">
          <div className="flex items-center gap-2.5">
            {space.profiles?.avatar_url ? (
              <img src={space.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                style={{ background: space.cover_color || '#4F46E5' }}>
                {(space.teacher_display_name || space.profiles?.full_name || 'T')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-800">
                {space.teacher_display_name || space.profiles?.full_name || 'Your teacher'}
              </p>
              <p className="text-xs text-gray-400">Teacher</p>
            </div>
          </div>
          {space.description && (
            <p className="text-sm text-gray-600 mt-2.5 leading-relaxed">{space.description}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {scoreable.length > 0 && (
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Your progress</span>
            <span className="text-sm text-gray-500">{completedScoreable} / {scoreable.length} completed</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${scoreable.length ? (completedScoreable / scoreable.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          type="text"
          placeholder="Search content..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9 pr-9 py-2 text-sm w-full"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Content list */}
      <div className="space-y-2">
        {content.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-400">
            No content yet — your teacher will add notes, quizzes and assignments here.
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-400">
            No content matches "{search}"
          </div>
        ) : filteredContent.map(item => {
          const style = TYPE_STYLES[item.type] || TYPE_STYLES.note
          const sub = submissionMap[item.id]
          const state = getContentState(item)
          const stateLabel = getContentStateLabel(item)
          const isLocked = state === 'scheduled' || state === 'closed'

          return (
            <Link
              key={item.id}
              to={`/student/spaces/${spaceId}/content/${item.id}`}
              className={`card p-4 flex items-center gap-3 transition-all group ${isLocked ? 'opacity-75 hover:border-gray-200' : 'hover:border-brand-100 hover:shadow-sm'}`}
            >
              {/* Lock icon for scheduled/closed */}
              {isLocked ? (
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${state === 'scheduled' ? 'bg-brand-50' : 'bg-gray-100'}`}>
                  <svg className={`w-4 h-4 ${state === 'scheduled' ? 'text-brand-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              ) : (
                <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              )}

              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium transition-colors ${isLocked ? 'text-gray-400' : 'text-gray-800 group-hover:text-brand-500'}`}>
                  {item.title}
                </span>
                {stateLabel && (
                  <p className={`text-xs mt-0.5 ${state === 'scheduled' ? 'text-brand-500' : state === 'closed' ? 'text-red-500' : 'text-amber-600'}`}>
                    {stateLabel}
                  </p>
                )}
              </div>

              {item.due_at && !isLocked && (
                <span className="text-xs text-gray-400 flex-shrink-0">
                  Due {new Date(item.due_at).toLocaleDateString()}
                </span>
              )}

              {!isLocked && (sub ? (
                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded flex-shrink-0">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {sub.score != null ? `${sub.score}%` : 'Done'}
                </span>
              ) : (
                <span className="text-xs text-gray-300 flex-shrink-0">Not done</span>
              ))}

              <svg className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )
        })}
      </div>
    </div>
  )
}