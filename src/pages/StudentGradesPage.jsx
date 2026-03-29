import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

function ScoreRing({ score, size = 56 }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const fill = score != null ? (score / 100) * circ : 0
  const color = score == null ? '#e5e7eb' : score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={size*0.1} />
      {score != null && (
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.1}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
      )}
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.22} fontWeight="700" fill={score != null ? color : '#9ca3af'}>
        {score != null ? `${score}%` : '—'}
      </text>
    </svg>
  )
}

export default function StudentGradesPage() {
  const { user } = useAuth()
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedSpace, setExpandedSpace] = useState(null)

  useEffect(() => { fetchGrades() }, [])

  async function fetchGrades() {
    // Get enrollments first (need space IDs for parallel content+submissions fetch)
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('space_id, spaces(id, name, subject)')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: true })

    if (!enrollments?.length) { setLoading(false); return }

    const spaceIds = enrollments.map(e => e.space_id)

    // Fetch content and submissions in parallel
    const [contentRes, submissionsRes] = await Promise.all([
      supabase
        .from('content')
        .select('id, title, type, due_at, space_id')
        .in('space_id', spaceIds)
        .in('type', ['quiz', 'assignment'])
        .order('created_at', { ascending: true }),
      supabase
        .from('submissions')
        .select('content_id, score, status, submitted_at')
        .eq('student_id', user.id)
    ])

    const contentItems = contentRes.data
    const submissions = submissionsRes.data

    const subMap = Object.fromEntries((submissions || []).map(s => [s.content_id, s]))

    // Group content by space
    const spaceData = enrollments.map(e => {
      const spaceContent = (contentItems || []).filter(c => c.space_id === e.space_id)
      const submitted = spaceContent.filter(c => subMap[c.id])
      const graded = spaceContent.filter(c => subMap[c.id]?.score != null)
      const scores = graded.map(c => subMap[c.id].score)
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

      return {
        id: e.space_id,
        name: e.spaces?.name,
        subject: e.spaces?.subject,
        content: spaceContent.map(c => ({ ...c, submission: subMap[c.id] || null })),
        submitted: submitted.length,
        total: spaceContent.length,
        avg,
      }
    })

    setSpaces(spaceData)
    setLoading(false)
  }

  // Overall stats
  const allContent = spaces.flatMap(s => s.content)
  const allGraded = allContent.filter(c => c.submission?.score != null)
  const overallAvg = allGraded.length > 0
    ? Math.round(allGraded.reduce((a, c) => a + c.submission.score, 0) / allGraded.length)
    : null
  const totalSubmitted = allContent.filter(c => c.submission).length
  const totalPending = allContent.filter(c => !c.submission).length

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading grades...</div>

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">My grades</h1>
        <p className="page-subtitle">Your scores across all classes</p>
      </div>

      {/* Overall stats */}
      {allContent.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-2">Overall average</p>
            <ScoreRing score={overallAvg} size={52} />
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1.5">Submitted</p>
            <p className="text-3xl font-bold text-brand-600">{totalSubmitted}</p>
            <p className="text-xs text-gray-400">of {allContent.length}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1.5">Pending</p>
            <p className={`text-3xl font-bold ${totalPending > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{totalPending}</p>
            <p className="text-xs text-gray-400">to do</p>
          </div>
        </div>
      )}

      {spaces.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No grades yet</p>
          <p className="text-sm text-gray-400">Complete quizzes and assignments to see your scores here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {spaces.map(space => (
            <div key={space.id} className="card overflow-hidden">
              {/* Space header — clickable to expand */}
              <button
                onClick={() => setExpandedSpace(expandedSpace === space.id ? null : space.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left">
                <ScoreRing score={space.avg} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{space.name}</p>
                  <p className="text-xs text-gray-400">{space.subject || 'No subject'}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {/* Progress bar */}
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                      <div className="h-full bg-brand-400 rounded-full transition-all"
                        style={{ width: `${space.total ? (space.submitted / space.total) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{space.submitted}/{space.total} done</span>
                  </div>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expandedSpace === space.id ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded content list */}
              {expandedSpace === space.id && space.content.length > 0 && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {space.content.map(item => {
                    const sub = item.submission
                    const isGraded = sub?.score != null
                    const isSubmitted = !!sub
                    const isOverdue = item.due_at && !isSubmitted && new Date(item.due_at) < new Date()

                    return (
                      <Link key={item.id}
                        to={`/student/spaces/${space.id}/content/${item.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
                        {/* Score or status indicator */}
                        <div className="flex-shrink-0">
                          {isGraded ? (
                            <ScoreRing score={sub.score} size={36} />
                          ) : (
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                              isSubmitted ? 'bg-green-50' : isOverdue ? 'bg-red-50' : 'bg-gray-100'
                            }`}>
                              {isSubmitted ? (
                                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                                </svg>
                              ) : (
                                <svg className={`w-4 h-4 ${isOverdue ? 'text-red-400' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate group-hover:text-brand-600 transition-colors">{item.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              item.type === 'quiz' ? 'bg-amber-50 text-amber-700' : 'bg-pink-50 text-pink-700'
                            }`}>{item.type}</span>
                            {item.due_at && (
                              <span className={`text-xs ${isOverdue && !isSubmitted ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                {isOverdue && !isSubmitted ? 'Overdue · ' : 'Due · '}
                                {new Date(item.due_at).toLocaleDateString()}
                              </span>
                            )}
                            {isSubmitted && !isGraded && (
                              <span className="text-xs text-gray-400">Submitted · awaiting grade</span>
                            )}
                            {isGraded && (
                              <span className={`text-xs font-medium ${sub.score >= 70 ? 'text-green-600' : sub.score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                {sub.score >= 70 ? 'Passed' : sub.score >= 50 ? 'Needs work' : 'Below passing'}
                              </span>
                            )}
                          </div>
                        </div>

                        <svg className="w-4 h-4 text-gray-300 group-hover:text-brand-400 flex-shrink-0 transition-colors"
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                        </svg>
                      </Link>
                    )
                  })}
                </div>
              )}

              {expandedSpace === space.id && space.content.length === 0 && (
                <div className="border-t border-gray-100 px-4 py-6 text-center text-sm text-gray-400">
                  No quizzes or assignments in this space yet.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}