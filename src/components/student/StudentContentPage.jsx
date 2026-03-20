import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import RichTextRenderer from '../ui/RichTextRenderer'
import { getContentState, getContentStateLabel, formatDateTime } from '../../lib/contentState'

const ACCEPTED_FILES = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function FileIcon({ type }) {
  if (type?.includes('pdf')) return (
    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-red-600">PDF</span>
    </div>
  )
  if (type?.includes('word') || type?.includes('doc')) return (
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

export default function StudentContentPage() {
  const { spaceId, contentId } = useParams()
  const { user } = useAuth()
  const fileInputRef = useRef()

  const [content, setContent] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [savedAnswers, setSavedAnswers] = useState({})
  const [submission, setSubmission] = useState(null)
  const [assignmentText, setAssignmentText] = useState('')
  const [files, setFiles] = useState([])           // files chosen but not uploaded yet
  const [uploadedFiles, setUploadedFiles] = useState([]) // files already uploaded (from DB)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [fileError, setFileError] = useState('')

  useEffect(() => { fetchAll() }, [contentId])

  async function fetchAll() {
    setLoading(true)
    setAnswers({})
    setSavedAnswers({})
    setResult(null)
    setSubmission(null)
    setFiles([])
    setUploadedFiles([])

    const [contentRes, questionsRes, submissionRes] = await Promise.all([
      supabase.from('content').select('*').eq('id', contentId).single(),
      supabase.from('quiz_questions').select('*').eq('content_id', contentId).order('order_index'),
      supabase.from('submissions').select('*').eq('content_id', contentId).eq('student_id', user.id).maybeSingle(),
    ])

    setContent(contentRes.data)

    const qs = (questionsRes.data || []).map(q => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'),
      correct_answer: String(q.correct_answer).trim(),
    }))
    setQuestions(qs)

    const sub = submissionRes.data
    if (sub) {
      setSubmission(sub)
      if (sub.score != null) {
        const { data: answerRows } = await supabase
          .from('quiz_answers')
          .select('question_id, answer, is_correct')
          .eq('submission_id', sub.id)
        const savedMap = {}
        ;(answerRows || []).forEach(a => { savedMap[a.question_id] = a.answer })
        setSavedAnswers(savedMap)
        setResult({ score: sub.score })
      }
      // Load uploaded files if any
      if (sub.file_paths && sub.file_paths.length > 0) {
        const fileDetails = await Promise.all(
          sub.file_paths.map(async path => {
            const { data } = await supabase.storage.from('submissions').createSignedUrl(path, 3600)
            return { path, url: data?.signedUrl, name: path.split('/').pop() }
          })
        )
        setUploadedFiles(fileDetails)
      }
    }

    setLoading(false)
  }

  // Handle file selection
  function handleFileSelect(e) {
    setFileError('')
    const selected = Array.from(e.target.files)
    const oversized = selected.filter(f => f.size > MAX_FILE_SIZE)
    if (oversized.length > 0) {
      setFileError(`Files must be under 10MB. Remove: ${oversized.map(f => f.name).join(', ')}`)
      return
    }
    setFiles(prev => [...prev, ...selected])
    e.target.value = '' // reset input
  }

  function removeFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Upload files to Supabase Storage and return their paths
  async function uploadFiles() {
    if (files.length === 0) return []
    setUploading(true)
    const paths = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${contentId}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('submissions').upload(path, file)
      if (error) throw new Error(`Failed to upload ${file.name}: ${error.message}`)
      paths.push(path)
    }
    setUploading(false)
    return paths
  }

  async function submitQuiz() {
    setSubmitting(true)
    try {
      let correct = 0
      questions.forEach(q => {
        const chosenIndex = answers[q.id]
        const chosenValue = String(q.options[chosenIndex] || '').trim()
        if (chosenValue === String(q.correct_answer || '').trim()) correct++
      })
      const score = Math.round((correct / questions.length) * 100)

      const { data: sub, error: subErr } = await supabase
        .from('submissions')
        .insert({ content_id: contentId, student_id: user.id, status: 'graded', score })
        .select().single()
      if (subErr) throw subErr

      const answerRows = questions.map(q => ({
        submission_id: sub.id,
        question_id: q.id,
        answer: String(q.options[answers[q.id]] || '').trim(),
        is_correct: String(q.options[answers[q.id]] || '').trim() === String(q.correct_answer || '').trim(),
      }))
      await supabase.from('quiz_answers').insert(answerRows)

      const savedMap = {}
      questions.forEach(q => { savedMap[q.id] = String(q.options[answers[q.id]] || '').trim() })
      setSavedAnswers(savedMap)
      setSubmission(sub)
      setResult({ score, correct, total: questions.length })
    } catch (err) {
      alert(err.message || 'Failed to submit quiz.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitAssignment() {
    if (!assignmentText.trim() && files.length === 0) return
    setSubmitting(true)
    try {
      const filePaths = await uploadFiles()
      const { data: sub, error: subErr } = await supabase
        .from('submissions')
        .insert({
          content_id: contentId,
          student_id: user.id,
          status: 'submitted',
          body: assignmentText || null,
          file_paths: filePaths.length > 0 ? filePaths : null,
        })
        .select().single()
      if (subErr) throw subErr
      setSubmission(sub)
      // Show uploaded files
      if (filePaths.length > 0) {
        const fileDetails = await Promise.all(
          filePaths.map(async path => {
            const { data } = await supabase.storage.from('submissions').createSignedUrl(path, 3600)
            return { path, url: data?.signedUrl, name: path.split('/').pop() }
          })
        )
        setUploadedFiles(fileDetails)
      }
    } catch (err) {
      alert(err.message || 'Failed to submit.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading...</div>
  if (!content) return <div className="p-6 text-sm text-red-500">Content not found.</div>

  const contentState = getContentState(content)

  // Scheduled — not open yet
  if (contentState === 'scheduled') {
    return (
      <div className="p-6 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Not available yet</h2>
        <p className="text-sm text-gray-500 mb-1">This {content.type} opens</p>
        <p className="text-sm font-semibold text-brand-600 mb-6">{formatDateTime(content.available_from)}</p>
        <Link to={`/student/spaces/${spaceId}`} className="btn btn-secondary text-sm">Back to space</Link>
      </div>
    )
  }

  // Closed — past end time, show content but block new submissions
  const isClosed = contentState === 'closed'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link to={`/student/spaces/${spaceId}`}
        className="text-sm text-gray-400 hover:text-brand-500 flex items-center gap-1 mb-4">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to class
      </Link>

      <div className="mb-5">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{content.type}</span>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">{content.title}</h1>
        {content.due_at && (
          <p className="text-sm text-gray-400 mt-1">Due {new Date(content.due_at).toLocaleString()}</p>
        )}
      </div>

      {/* NOTE */}
      {content.type === 'note' && (
        <div className="card p-6">
          <RichTextRenderer html={content.body} />
        </div>
      )}

      {/* Closed banner */}
      {isClosed && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-sm text-red-700">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Submissions closed — this {content.type} ended {formatDateTime(content.available_until)}
        </div>
      )}

      {/* QUIZ */}
      {content.type === 'quiz' && (
        <div className="space-y-4">
          {result ? (
            <div className={`card p-6 ${result.score >= 70 ? 'border-green-200' : 'border-amber-200'}`}>
              <div className="text-center mb-6">
                <div className={`text-5xl font-semibold mb-2 ${result.score >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                  {result.score}%
                </div>
                {result.correct != null && (
                  <p className="text-sm text-gray-500 mb-1">{result.correct} out of {result.total} correct</p>
                )}
                <p className="text-sm font-medium text-gray-700">
                  {result.score >= 70 ? 'Great work! 🎉' : 'Keep practising — you can do it!'}
                </p>
              </div>
              <div className="space-y-4">
                {questions.map((q, i) => {
                  const chosen = String(savedAnswers[q.id] || '').trim()
                  const correct = String(q.correct_answer || '').trim()
                  return (
                    <div key={q.id} className="border border-gray-100 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-800 mb-3">Q{i + 1}. {q.question}</p>
                      <div className="space-y-1.5">
                        {q.options.map((opt, oi) => {
                          const optStr = String(opt).trim()
                          const isCorrect = optStr === correct
                          const isChosen = optStr === chosen
                          let cls = 'text-gray-400'
                          let icon = '○'
                          if (isCorrect) { cls = 'bg-green-50 text-green-700 font-medium'; icon = '✓' }
                          else if (isChosen) { cls = 'bg-red-50 text-red-600'; icon = '✗' }
                          return (
                            <div key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${cls}`}>
                              <span className="flex-shrink-0">{icon}</span><span>{opt}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">{questions.length} questions — select one answer per question</p>
              {questions.map((q, i) => (
                <div key={q.id} className="card p-4">
                  <p className="text-sm font-medium text-gray-800 mb-3">Q{i + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const isSelected = answers[q.id] === oi
                      return (
                        <div key={oi} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: oi }))}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors select-none
                            ${isSelected ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'border-brand-500' : 'border-gray-300'}`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-brand-500" />}
                          </div>
                          <span className="text-sm">{opt}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              <button onClick={submitQuiz}
                disabled={submitting || Object.keys(answers).length < questions.length}
                className="btn btn-primary w-full">
                {submitting ? 'Submitting...' : `Submit quiz (${Object.keys(answers).length}/${questions.length} answered)`}
              </button>
              {Object.keys(answers).length < questions.length && (
                <p className="text-xs text-center text-gray-400">Answer all questions to submit</p>
              )}
            </>
          )}
        </div>
      )}

      {/* ASSIGNMENT */}
      {content.type === 'assignment' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Instructions</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {content.body || 'No instructions provided.'}
            </p>
          </div>

          {submission ? (
            <div className="card p-5 border-green-200">
              <div className="flex items-center gap-2 text-green-600 mb-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">Submitted</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(submission.submitted_at).toLocaleString()}
                </span>
              </div>
              {submission.body && (
                <p className="text-sm text-gray-600 whitespace-pre-wrap mb-3 pb-3 border-b border-gray-100">
                  {submission.body}
                </p>
              )}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 mb-2">Attached files</p>
                  {uploadedFiles.map((f, i) => (
                    <a key={i} href={f.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors">
                      <FileIcon type={f.name?.split('.').pop()} />
                      <span className="text-sm text-gray-700 flex-1 truncate">{f.name}</span>
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  ))}
                </div>
              )}
              {submission.status === 'graded' && submission.score != null ? (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${submission.score >= 70 ? 'bg-green-50' : submission.score >= 50 ? 'bg-amber-50' : 'bg-red-50'}`}>
                      <span className={`text-xl font-bold ${submission.score >= 70 ? 'text-green-600' : submission.score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {submission.score}%
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {submission.score >= 70 ? 'Great work! 🎉' : submission.score >= 50 ? 'Good effort 👍' : 'Keep practising 💪'}
                      </p>
                      <p className={`text-xs mt-0.5 ${submission.score >= 70 ? 'text-green-600' : submission.score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {submission.score >= 70 ? 'Passed' : submission.score >= 50 ? 'Needs improvement' : 'Below passing (70%)'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : submission.status === 'submitted' ? (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Awaiting grade from your teacher
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div>
                <label className="label">Your answer <span className="text-gray-400 font-normal">(optional if uploading files)</span></label>
                <textarea className="input min-h-[120px] resize-y" placeholder="Write your answer here..."
                  value={assignmentText} onChange={e => setAssignmentText(e.target.value)} />
              </div>

              {/* File upload area */}
              <div>
                <label className="label">Attach files <span className="text-gray-400 font-normal">(PDF, Word, images — max 10MB each)</span></label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 active:bg-brand-50 transition-colors">
                  <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">Click to select files</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, PNG, JPG, GIF, WEBP</p>
                </div>
                <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_FILES}
                  onChange={handleFileSelect} className="hidden" />

                {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}

                {/* Selected files list */}
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 bg-gray-50">
                        <FileIcon type={f.type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{f.name}</p>
                          <p className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button onClick={() => removeFile(i)}
                          className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={submitAssignment}
                disabled={submitting || uploading || (!assignmentText.trim() && files.length === 0)}
                className="btn btn-primary w-full">
                {uploading ? 'Uploading files...' : submitting ? 'Submitting...' : 'Submit assignment'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}