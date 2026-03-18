import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ContentPage() {
  const { spaceId, contentId } = useParams()
  const [content, setContent] = useState(null)
  const [questions, setQuestions] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContent()
  }, [contentId])

  async function fetchContent() {
    const [contentRes, questionsRes, submissionsRes] = await Promise.all([
      supabase.from('content').select('*').eq('id', contentId).single(),
      supabase.from('quiz_questions').select('*').eq('content_id', contentId).order('order_index'),
      supabase.from('submissions')
        .select('*, profiles(full_name)')
        .eq('content_id', contentId),
    ])
    setContent(contentRes.data)
    setQuestions(questionsRes.data || [])
    setSubmissions(submissionsRes.data || [])
    setLoading(false)
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading...</div>
  if (!content) return <div className="p-6 text-sm text-red-500">Content not found.</div>

  const avgScore = submissions.length
    ? Math.round(submissions.reduce((s, sub) => s + (sub.score || 0), 0) / submissions.length)
    : null

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to={`/spaces/${spaceId}`} className="text-sm text-gray-400 hover:text-brand-500 flex items-center gap-1 mb-4">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to space
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{content.type}</span>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">{content.title}</h1>
          {content.due_at && (
            <p className="text-sm text-gray-400 mt-1">Due {new Date(content.due_at).toLocaleString()}</p>
          )}
        </div>
      </div>

      {/* Note view */}
      {content.type === 'note' && (
        <div className="card p-6">
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {content.body || <span className="text-gray-400 italic">No content yet.</span>}
          </div>
        </div>
      )}

      {/* Quiz view */}
      {content.type === 'quiz' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Questions</p><p className="text-2xl font-semibold">{questions.length}</p></div>
            <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Submissions</p><p className="text-2xl font-semibold">{submissions.length}</p></div>
            <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Avg. score</p><p className="text-2xl font-semibold">{avgScore !== null ? `${avgScore}%` : '—'}</p></div>
          </div>

          {/* Questions */}
          {questions.map((q, i) => (
            <div key={q.id} className="card p-4">
              <p className="text-sm font-medium text-gray-800 mb-3">Q{i + 1}. {q.question}</p>
              <div className="space-y-1.5">
                {(q.options || []).map((opt, oi) => (
                  <div key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${opt === q.correct_answer ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600'}`}>
                    {opt === q.correct_answer ? '✓' : '○'} {opt}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Submissions */}
          {submissions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Student submissions</h3>
              <div className="card divide-y divide-gray-50">
                {submissions.map(sub => (
                  <div key={sub.id} className="flex items-center gap-3 p-3">
                    <p className="text-sm text-gray-800 flex-1">{sub.profiles?.full_name || 'Student'}</p>
                    <span className={`text-sm font-medium ${(sub.score || 0) >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                      {sub.score ?? '—'}%
                    </span>
                    <span className="text-xs text-gray-400">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assignment view */}
      {content.type === 'assignment' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Instructions</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{content.body || 'No instructions provided.'}</p>
          </div>

          {submissions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Submissions ({submissions.length})</h3>
              <div className="card divide-y divide-gray-50">
                {submissions.map(sub => (
                  <div key={sub.id} className="flex items-center gap-3 p-3">
                    <p className="text-sm text-gray-800 flex-1">{sub.profiles?.full_name || 'Student'}</p>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${sub.status === 'graded' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {sub.status || 'submitted'}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
