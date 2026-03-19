import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

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

  useEffect(() => {
    fetchAll()
  }, [spaceId])

  async function fetchAll() {
    setLoading(true)

    // Check enrollment is active
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('status')
      .eq('space_id', spaceId)
      .eq('student_id', user.id)
      .single()

    if (!enrollment || enrollment.status !== 'active') {
      setLoading(false)
      return
    }

    const [spaceRes, contentRes, submissionsRes] = await Promise.all([
      supabase.from('spaces').select('*').eq('id', spaceId).single(),
      supabase.from('content').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }),
      supabase.from('submissions').select('content_id, score, status').eq('student_id', user.id),
    ])
    setSpace(spaceRes.data)
    setContent(contentRes.data || [])
    setSubmissions(submissionsRes.data || [])
    setLoading(false)
  }

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

  const completed = content.filter(c => submissionMap[c.id]).length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{space.name}</h1>
        {space.subject && <p className="text-sm text-gray-400 mt-0.5">{space.subject}</p>}
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

      {/* Content list */}
      <div className="space-y-2">
        {content.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-400">
            No content yet — check back later.
          </div>
        ) : content.map(item => {
          const style = TYPE_STYLES[item.type] || TYPE_STYLES.note
          const sub = submissionMap[item.id]

          return (
            <Link
              key={item.id}
              to={`/student/spaces/${spaceId}/content/${item.id}`}
              className="card p-4 flex items-center gap-3 hover:border-brand-100 hover:shadow-sm transition-all group"
            >
              <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${style.bg} ${style.text}`}>
                {style.label}
              </span>

              <span className="text-sm font-medium text-gray-800 group-hover:text-brand-500 transition-colors flex-1">
                {item.title}
              </span>

              {item.due_at && (
                <span className="text-xs text-gray-400 flex-shrink-0">
                  Due {new Date(item.due_at).toLocaleDateString()}
                </span>
              )}

              {/* Completion badge */}
              {sub ? (
                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded flex-shrink-0">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {sub.score != null ? `${sub.score}%` : 'Done'}
                </span>
              ) : (
                <span className="text-xs text-gray-300 flex-shrink-0">Not done</span>
              )}

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