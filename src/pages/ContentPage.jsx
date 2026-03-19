import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import RichTextRenderer from '../components/ui/RichTextRenderer'
import RichTextEditor from '../components/ui/RichTextEditor'

function FileIcon({ ext }) {
  if (ext === 'pdf') return (
    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-red-600">PDF</span>
    </div>
  )
  if (['doc','docx'].includes(ext)) return (
    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-blue-600">DOC</span>
    </div>
  )
  return (
    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  )
}

// ── Edit form for notes ───────────────────────────────────────────────────────
function EditNote({ content, onSave, onCancel }) {
  const [title, setTitle] = useState(content.title)
  const [body, setBody] = useState(content.body || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    const { error: err } = await supabase
      .from('content')
      .update({ title: title.trim(), body })
      .eq('id', content.id)
    if (err) { setError(err.message); setSaving(false); return }
    onSave({ ...content, title: title.trim(), body })
  }

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}
      <div>
        <label className="label">Title</label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label">Content</label>
        <RichTextEditor value={body} onChange={setBody} />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn btn-secondary flex-1">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

// ── Edit form for assignments ─────────────────────────────────────────────────
function EditAssignment({ content, onSave, onCancel }) {
  const [title, setTitle] = useState(content.title)
  const [body, setBody] = useState(content.body || '')
  const [dueAt, setDueAt] = useState(
    content.due_at ? new Date(content.due_at).toISOString().slice(0, 16) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    const { error: err } = await supabase
      .from('content')
      .update({ title: title.trim(), body: body || null, due_at: dueAt || null })
      .eq('id', content.id)
    if (err) { setError(err.message); setSaving(false); return }
    onSave({ ...content, title: title.trim(), body: body || null, due_at: dueAt || null })
  }

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}
      <div>
        <label className="label">Title</label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label">Instructions</label>
        <textarea className="input min-h-[120px] resize-y" value={body}
          onChange={e => setBody(e.target.value)} placeholder="Describe the assignment..." />
      </div>
      <div>
        <label className="label">Due date <span className="text-gray-400 font-normal">(optional)</span></label>
        <input type="datetime-local" className="input" value={dueAt}
          onChange={e => setDueAt(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn btn-secondary flex-1">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

// ── Edit form for quizzes ─────────────────────────────────────────────────────
function EditQuiz({ content, questions, onSave, onCancel }) {
  const [title, setTitle] = useState(content.title)
  const [dueAt, setDueAt] = useState(
    content.due_at ? new Date(content.due_at).toISOString().slice(0, 16) : ''
  )
  const [qs, setQs] = useState(
    questions.map(q => ({
      id: q.id,
      question: q.question,
      options: [...q.options, '', '', '', ''].slice(0, 4), // always 4 slots
      correct: q.options.findIndex(o => o === q.correct_answer),
      isNew: false,
    }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateQ(i, field, value) {
    setQs(prev => prev.map((q, qi) => qi === i ? { ...q, [field]: value } : q))
  }

  function updateOption(qi, oi, value) {
    setQs(prev => prev.map((q, i) => {
      if (i !== qi) return q
      const opts = [...q.options]
      opts[oi] = value
      return { ...q, options: opts }
    }))
  }

  function addQuestion() {
    setQs(prev => [...prev, { id: null, question: '', options: ['', '', '', ''], correct: 0, isNew: true }])
  }

  function removeQuestion(i) {
    setQs(prev => prev.filter((_, qi) => qi !== i))
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return }
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i]
      if (!q.question.trim()) { setError(`Question ${i + 1} is empty.`); return }
      const filled = q.options.filter(o => o.trim())
      if (filled.length < 2) { setError(`Question ${i + 1} needs at least 2 options.`); return }
      const unique = new Set(filled.map(o => o.trim().toLowerCase()))
      if (unique.size !== filled.length) { setError(`Question ${i + 1} has duplicate options.`); return }
      if (!q.options[q.correct]?.trim()) { setError(`Question ${i + 1}: correct answer is empty.`); return }
    }

    setSaving(true)
    try {
      // Update content title and due date
      const { error: contentErr } = await supabase
        .from('content')
        .update({ title: title.trim(), due_at: dueAt || null })
        .eq('id', content.id)
      if (contentErr) throw contentErr

      // Delete all existing questions and re-insert
      // This is simpler than tracking individual changes
      await supabase.from('quiz_questions').delete().eq('content_id', content.id)

      const toInsert = qs.map((q, i) => ({
        content_id: content.id,
        question: q.question.trim(),
        options: q.options.filter(o => o.trim()),
        correct_answer: q.options[q.correct].trim(),
        order_index: i,
      }))
      const { error: qErr } = await supabase.from('quiz_questions').insert(toInsert)
      if (qErr) throw qErr

      onSave({ ...content, title: title.trim(), due_at: dueAt || null }, toInsert)
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}

      <div>
        <label className="label">Title</label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div>
        <label className="label">Due date <span className="text-gray-400 font-normal">(optional)</span></label>
        <input type="datetime-local" className="input" value={dueAt}
          onChange={e => setDueAt(e.target.value)} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="label mb-0">Questions</label>
          <button type="button" onClick={addQuestion}
            className="text-xs text-brand-500 hover:underline font-medium">+ Add question</button>
        </div>

        {qs.map((q, qi) => (
          <div key={qi} className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Question {qi + 1}</span>
              {qs.length > 1 && (
                <button type="button" onClick={() => removeQuestion(qi)}
                  className="text-xs text-red-400 hover:text-red-600">Remove</button>
              )}
            </div>
            <input className="input" placeholder="Enter question..."
              value={q.question} onChange={e => updateQ(qi, 'question', e.target.value)} />
            <p className="text-xs text-gray-400">Select the radio button next to the correct answer. All options must be unique.</p>
            <div className="space-y-2">
              {[0, 1, 2, 3].map(oi => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`q-${qi}-correct`}
                    checked={q.correct === oi}
                    onChange={() => updateQ(qi, 'correct', oi)}
                    className="accent-brand-500 flex-shrink-0" />
                  <input className="input text-sm"
                    placeholder={`Option ${oi + 1}${oi < 2 ? ' (required)' : ' (optional)'}`}
                    value={q.options[oi] || ''}
                    onChange={e => updateOption(qi, oi, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
        Editing a quiz will delete and recreate all questions. Existing student submissions and scores will not be affected.
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="btn btn-secondary flex-1">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

// ── Main ContentPage ──────────────────────────────────────────────────────────
export default function ContentPage() {
  const { spaceId, contentId } = useParams()
  const [content, setContent] = useState(null)
  const [questions, setQuestions] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [expandedSub, setExpandedSub] = useState(null)
  const [fileUrls, setFileUrls] = useState({})
  const [scoreInputs, setScoreInputs] = useState({})
  const [savingScore, setSavingScore] = useState({})

  useEffect(() => { fetchContent() }, [contentId])

  async function fetchContent() {
    const [contentRes, questionsRes, submissionsRes] = await Promise.all([
      supabase.from('content').select('*').eq('id', contentId).single(),
      supabase.from('quiz_questions').select('*').eq('content_id', contentId).order('order_index'),
      supabase.from('submissions')
        .select('*, profiles(full_name, email)')
        .eq('content_id', contentId)
        .order('submitted_at', { ascending: false }),
    ])
    setContent(contentRes.data)
    const qs = (questionsRes.data || []).map(q => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'),
    }))
    setQuestions(qs)
    const subs = submissionsRes.data || []
    setSubmissions(subs)
    const inputs = {}
    subs.forEach(s => { if (s.score != null) inputs[s.id] = String(s.score) })
    setScoreInputs(inputs)
    setLoading(false)
  }

  async function loadFileUrls(sub) {
    if (!sub.file_paths?.length || fileUrls[sub.id]) return
    const urls = await Promise.all(
      sub.file_paths.map(async path => {
        const { data } = await supabase.storage.from('submissions').createSignedUrl(path, 3600)
        return { name: path.split('/').pop(), url: data?.signedUrl, ext: path.split('.').pop()?.toLowerCase() }
      })
    )
    setFileUrls(prev => ({ ...prev, [sub.id]: urls }))
  }

  function toggleExpand(sub) {
    if (expandedSub === sub.id) { setExpandedSub(null); return }
    setExpandedSub(sub.id)
    loadFileUrls(sub)
  }

  async function saveScore(sub) {
    const score = parseInt(scoreInputs[sub.id])
    if (isNaN(score) || score < 0 || score > 100) { alert('Score must be 0–100.'); return }
    setSavingScore(prev => ({ ...prev, [sub.id]: true }))
    const { error } = await supabase
      .from('submissions').update({ score, status: 'graded' }).eq('id', sub.id)
    if (!error) setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, score, status: 'graded' } : s))
    else alert('Failed to save score: ' + error.message)
    setSavingScore(prev => ({ ...prev, [sub.id]: false }))
  }

  function scoreColor(score) {
    if (score == null) return 'text-gray-400'
    return score >= 70 ? 'text-green-600' : 'text-amber-600'
  }

  const gradedSubs = submissions.filter(s => s.score != null)
  const avgScore = gradedSubs.length > 0
    ? Math.round(gradedSubs.reduce((a, b) => a + b.score, 0) / gradedSubs.length) : null

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading...</div>
  if (!content) return <div className="p-6 text-sm text-red-500">Content not found.</div>

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto animate-fade-in">
      <Link to={`/teacher/spaces/${spaceId}`}
        className="text-sm text-gray-400 hover:text-brand-500 flex items-center gap-1 mb-4">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to space
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <span className="badge badge-gray mb-1">{content.type}</span>
          {!editing && <h1 className="text-xl font-semibold text-gray-900 mt-1">{content.title}</h1>}
          {!editing && content.due_at && (
            <p className="text-sm text-gray-400 mt-1">Due {new Date(content.due_at).toLocaleString()}</p>
          )}
        </div>
        {/* Edit toggle button */}
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn btn-secondary text-sm gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        )}
      </div>

      {/* ── EDIT MODE ── */}
      {editing && (
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Edit {content.type}</h2>
          {content.type === 'note' && (
            <EditNote
              content={content}
              onSave={updated => { setContent(updated); setEditing(false) }}
              onCancel={() => setEditing(false)}
            />
          )}
          {content.type === 'assignment' && (
            <EditAssignment
              content={content}
              onSave={updated => { setContent(updated); setEditing(false) }}
              onCancel={() => setEditing(false)}
            />
          )}
          {content.type === 'quiz' && (
            <EditQuiz
              content={content}
              questions={questions}
              onSave={(updatedContent, updatedQuestions) => {
                setContent(updatedContent)
                setQuestions(updatedQuestions.map(q => ({
                  ...q,
                  options: Array.isArray(q.options) ? q.options : [],
                })))
                setEditing(false)
              }}
              onCancel={() => setEditing(false)}
            />
          )}
        </div>
      )}

      {/* ── VIEW MODE ── */}
      {!editing && (
        <>
          {/* NOTE */}
          {content.type === 'note' && (
            <div className="card p-6">
              <RichTextRenderer html={content.body} />
            </div>
          )}

          {/* QUIZ */}
          {content.type === 'quiz' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Questions</p><p className="text-2xl font-semibold">{questions.length}</p></div>
                <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Submissions</p><p className="text-2xl font-semibold">{submissions.length}</p></div>
                <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Avg. score</p><p className="text-2xl font-semibold">{avgScore != null ? `${avgScore}%` : '—'}</p></div>
              </div>

              {questions.map((q, i) => (
                <div key={q.id} className="card p-4">
                  <p className="text-sm font-medium text-gray-800 mb-3">Q{i + 1}. {q.question}</p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                        ${String(opt).trim() === String(q.correct_answer).trim()
                          ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-500'}`}>
                        {String(opt).trim() === String(q.correct_answer).trim() ? '✓' : '○'} {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {submissions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Student results</h3>
                  <div className="card divide-y divide-gray-50">
                    {submissions.map(sub => (
                      <div key={sub.id} className="flex items-center gap-3 p-3">
                        <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 text-xs font-medium flex-shrink-0">
                          {sub.profiles?.full_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{sub.profiles?.full_name}</p>
                          <p className="text-xs text-gray-400">{sub.profiles?.email}</p>
                        </div>
                        <span className={`text-sm font-semibold ${scoreColor(sub.score)}`}>
                          {sub.score != null ? `${sub.score}%` : '—'}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ASSIGNMENT */}
          {content.type === 'assignment' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Instructions</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{content.body || 'No instructions provided.'}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Submissions</p><p className="text-2xl font-semibold">{submissions.length}</p></div>
                <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Graded</p><p className="text-2xl font-semibold">{gradedSubs.length}</p></div>
                <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Avg. score</p><p className="text-2xl font-semibold">{avgScore != null ? `${avgScore}%` : '—'}</p></div>
              </div>

              {submissions.length === 0 ? (
                <div className="card p-8 text-center text-sm text-gray-400">No submissions yet.</div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Submissions ({submissions.length})</h3>
                  {submissions.map(sub => (
                    <div key={sub.id} className="card overflow-hidden">
                      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleExpand(sub)}>
                        <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 text-xs font-medium flex-shrink-0">
                          {sub.profiles?.full_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{sub.profiles?.full_name}</p>
                          <p className="text-xs text-gray-400">{sub.profiles?.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {sub.file_paths?.length > 0 && (
                            <span className="badge badge-gray">{sub.file_paths.length} file{sub.file_paths.length > 1 ? 's' : ''}</span>
                          )}
                          {sub.score != null ? (
                            <span className={`badge ${sub.score >= 70 ? 'badge-green' : 'badge-amber'} font-semibold`}>{sub.score}%</span>
                          ) : (
                            <span className="badge badge-gray">Not graded</span>
                          )}
                          <span className="text-xs text-gray-400">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                          <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedSub === sub.id ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {expandedSub === sub.id && (
                        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
                          {sub.body && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-2">Written answer</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded-lg p-3 border border-gray-100">{sub.body}</p>
                            </div>
                          )}
                          {sub.file_paths?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-2">Attached files</p>
                              {fileUrls[sub.id] ? (
                                <div className="space-y-2">
                                  {fileUrls[sub.id].map((f, i) => (
                                    <a key={i} href={f.url} target="_blank" rel="noreferrer"
                                      className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50 transition-colors">
                                      <FileIcon ext={f.ext} />
                                      <span className="text-sm text-gray-700 flex-1 truncate">{f.name}</span>
                                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                    </a>
                                  ))}
                                </div>
                              ) : <p className="text-xs text-gray-400">Loading files...</p>}
                            </div>
                          )}
                          {!sub.body && (!sub.file_paths?.length) && (
                            <p className="text-sm text-gray-400 italic">No content in this submission.</p>
                          )}
                          {/* Score input */}
                          <div className="border-t border-gray-100 pt-4">
                            <p className="text-xs font-medium text-gray-500 mb-2">
                              {sub.score != null ? 'Update score' : 'Add score'}
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <input type="number" min="0" max="100" placeholder="0–100"
                                  value={scoreInputs[sub.id] ?? ''}
                                  onChange={e => setScoreInputs(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                  onClick={e => e.stopPropagation()}
                                  className="input w-24 pr-7 text-sm" />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                              </div>
                              <button
                                onClick={e => { e.stopPropagation(); saveScore(sub) }}
                                disabled={savingScore[sub.id] || !scoreInputs[sub.id]}
                                className="btn btn-primary text-sm px-4">
                                {savingScore[sub.id] ? 'Saving...' : sub.score != null ? 'Update' : 'Save score'}
                              </button>
                              {sub.score != null && (
                                <span className={`text-sm font-semibold ${scoreColor(sub.score)}`}>
                                  Current: {sub.score}%
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5">The student will see this score on their submission.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}