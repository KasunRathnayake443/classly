import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import RichTextEditor from '../ui/RichTextEditor'

const TYPES = [
  { value: 'note',       label: 'Note',       desc: 'Reading material', icon: '📝' },
  { value: 'quiz',       label: 'Quiz',       desc: 'Auto-graded',      icon: '🧠' },
  { value: 'assignment', label: 'Assignment', desc: 'File/text upload',  icon: '📎' },
]

// Validate that end is after start
function validateDates(from, until) {
  if (!from || !until) return null
  if (new Date(until) <= new Date(from)) return 'End date must be after start date.'
  return null
}

// Validate start is not in the past (warn only, don't block)
function isInPast(dt) {
  return dt && new Date(dt) < new Date()
}

export default function CreateContentModal({ spaceId, onClose, onCreated, defaultDate, headerNote }) {
  const { user } = useAuth()
  const [type, setType] = useState('note')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [noteContent, setNoteContent] = useState('')

  // Unified date state
  const [availableFrom, setAvailableFrom] = useState(defaultDate ? `${defaultDate}T09:00` : '')   // start / publish time
  const [availableUntil, setAvailableUntil] = useState('') // end time (quiz/assignment only)
  const [dueAt, setDueAt] = useState('')                   // due date (quiz/assignment only)
  const [dateError, setDateError] = useState('')

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: { questions: [{ question: '', options: ['', '', '', ''], correct: '0' }] }
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'questions' })

  function handleFromChange(val) {
    setAvailableFrom(val)
    setDateError(validateDates(val, availableUntil) || '')
  }

  function handleUntilChange(val) {
    setAvailableUntil(val)
    setDateError(validateDates(availableFrom, val) || '')
  }

  async function onSubmit(data) {
    setError('')

    // Quiz validation
    if (type === 'quiz') {
      for (let i = 0; i < data.questions.length; i++) {
        const q = data.questions[i]
        const filled = q.options.filter(o => o.trim() !== '')
        if (!q.question.trim()) { setError(`Question ${i + 1} is empty.`); return }
        if (filled.length < 2) { setError(`Question ${i + 1} needs at least 2 options.`); return }
        const unique = new Set(filled.map(o => o.trim().toLowerCase()))
        if (unique.size !== filled.length) { setError(`Question ${i + 1} has duplicate options.`); return }
        const correct = q.options[parseInt(q.correct)]
        if (!correct?.trim()) { setError(`Question ${i + 1}: correct answer is empty.`); return }
      }
    }

    // Date validation
    const dateErr = validateDates(availableFrom, availableUntil)
    if (dateErr) { setError(dateErr); return }
    if (dueAt && availableUntil && new Date(dueAt) > new Date(availableUntil)) {
      setError('Due date cannot be after the end date.'); return
    }

    setLoading(true)
    try {
      const { data: content, error: contentErr } = await supabase
        .from('content')
        .insert({
          space_id: spaceId,
          type,
          title: data.title,
          body: type === 'note' ? (noteContent || null) : (data.body || null),
          due_at: dueAt || null,
          available_from: availableFrom || null,
          available_until: availableUntil || null,
        })
        .select().single()
      if (contentErr) throw contentErr

      if (type === 'quiz' && data.questions?.length) {
        const qs = data.questions.map((q, i) => ({
          content_id: content.id,
          question: q.question.trim(),
          options: q.options.filter(o => o.trim() !== ''),
          correct_answer: q.options[parseInt(q.correct)].trim(),
          order_index: i,
        }))
        const { error: qErr } = await supabase.from('quiz_questions').insert(qs)
        if (qErr) throw qErr
      }

      // Notify enrolled students immediately if no future start time
      const isImmediate = !availableFrom || new Date(availableFrom) <= new Date()
      if (isImmediate) {
        const { data: enrollments } = await supabase
          .from('enrollments').select('student_id')
          .eq('space_id', spaceId).eq('status', 'active')
        if (enrollments?.length > 0) {
          await supabase.from('content_notifications').insert(
            enrollments.map(e => ({ content_id: content.id, student_id: e.student_id }))
          )
        }
      }

      onCreated()
    } catch (err) {
      setError(err.message || 'Failed to create content.')
    } finally {
      setLoading(false)
    }
  }

  // Derived state for UI hints
  const isScheduledFuture = availableFrom && new Date(availableFrom) > new Date()
  const startInPast = isInPast(availableFrom)

  return (
    <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl my-8">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Add content</h2>
            {headerNote && <p className="text-xs text-gray-400 mt-0.5">{headerNote}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">{error}</div>
          )}

          {/* Type picker */}
          <div>
            <label className="label">Content type</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${type === t.value ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <span className="text-lg">{t.icon}</span>
                  <p className={`text-sm font-medium mt-1 ${type === t.value ? 'text-brand-600' : 'text-gray-700'}`}>{t.label}</p>
                  <p className="text-xs text-gray-400">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="label">Title</label>
            <input className="input" placeholder="e.g. Chapter 4 — Cell Division"
              {...register('title', { required: 'Title is required' })} />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>

          {/* ── NOTE ── */}
          {type === 'note' && (
            <>
              <div>
                <label className="label">Content</label>
                <RichTextEditor value={noteContent} onChange={setNoteContent} placeholder="Start writing..." />
                <p className="mt-1.5 text-xs text-gray-400">Use the toolbar to add headings, bold, lists and more.</p>
              </div>

              {/* Note dates */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50">
                <p className="text-sm font-medium text-gray-700">Publishing</p>
                <div>
                  <label className="label">Publish date & time <span className="text-gray-400 font-normal">(optional — leave blank to publish immediately)</span></label>
                  <input type="datetime-local" className="input bg-white"
                    value={availableFrom} onChange={e => handleFromChange(e.target.value)} />
                  {isScheduledFuture && (
                    <p className="mt-1.5 text-xs text-brand-600">
                      📅 Students will see this note on {new Date(availableFrom).toLocaleString()}
                    </p>
                  )}
                  {startInPast && availableFrom && (
                    <p className="mt-1.5 text-xs text-amber-600">⚠️ This time is in the past — note will publish immediately.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── ASSIGNMENT ── */}
          {type === 'assignment' && (
            <>
              <div>
                <label className="label">Instructions</label>
                <textarea className="input min-h-[100px] resize-y" placeholder="Describe the assignment..."
                  {...register('body')} />
              </div>

              {/* Assignment dates */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-4 bg-gray-50/50">
                <p className="text-sm font-medium text-gray-700">Dates & availability</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">
                      Opens at
                      <span className="text-gray-400 font-normal ml-1">(optional)</span>
                    </label>
                    <input type="datetime-local" className="input bg-white"
                      value={availableFrom} onChange={e => handleFromChange(e.target.value)} />
                    <p className="mt-1 text-xs text-gray-400">When students can start submitting</p>
                    {isScheduledFuture && (
                      <p className="mt-1 text-xs text-brand-600">Locked until this time</p>
                    )}
                  </div>
                  <div>
                    <label className="label">
                      Closes at
                      <span className="text-gray-400 font-normal ml-1">(optional)</span>
                    </label>
                    <input type="datetime-local" className="input bg-white"
                      min={availableFrom || undefined}
                      value={availableUntil} onChange={e => handleUntilChange(e.target.value)} />
                    <p className="mt-1 text-xs text-gray-400">Submissions lock after this</p>
                  </div>
                </div>

                {dateError && <p className="text-xs text-red-600 font-medium">⚠️ {dateError}</p>}

                <div>
                  <label className="label">
                    Due date
                    <span className="text-gray-400 font-normal ml-1">(optional — shown to students as deadline)</span>
                  </label>
                  <input type="datetime-local" className="input bg-white"
                    min={availableFrom || undefined}
                    value={dueAt} onChange={e => setDueAt(e.target.value)} />
                  <p className="mt-1 text-xs text-gray-400">
                    Due date is shown as a reminder. Students can still submit after it unless you set a close time.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ── QUIZ ── */}
          {type === 'quiz' && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="label mb-0">Questions</label>
                  <button type="button"
                    onClick={() => append({ question: '', options: ['', '', '', ''], correct: '0' })}
                    className="text-xs text-brand-500 hover:underline font-medium">
                    + Add question
                  </button>
                </div>
                {fields.map((field, qi) => (
                  <div key={field.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Question {qi + 1}</span>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(qi)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                      )}
                    </div>
                    <input className="input" placeholder="Enter your question..."
                      {...register(`questions.${qi}.question`, { required: true })} />
                    <p className="text-xs text-gray-400">Select the radio button next to the correct answer.</p>
                    <div className="space-y-2">
                      {[0,1,2,3].map(oi => (
                        <div key={oi} className="flex items-center gap-2">
                          <input type="radio" value={String(oi)}
                            {...register(`questions.${qi}.correct`)} className="accent-brand-500 flex-shrink-0" />
                          <input className="input text-sm"
                            placeholder={`Option ${oi + 1}${oi < 2 ? ' (required)' : ' (optional)'}`}
                            {...register(`questions.${qi}.options.${oi}`)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quiz dates */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-4 bg-gray-50/50">
                <p className="text-sm font-medium text-gray-700">Dates & availability</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">
                      Opens at
                      <span className="text-gray-400 font-normal ml-1">(optional)</span>
                    </label>
                    <input type="datetime-local" className="input bg-white"
                      value={availableFrom} onChange={e => handleFromChange(e.target.value)} />
                    <p className="mt-1 text-xs text-gray-400">When students can start</p>
                    {isScheduledFuture && (
                      <p className="mt-1 text-xs text-brand-600">Locked until this time</p>
                    )}
                  </div>
                  <div>
                    <label className="label">
                      Closes at
                      <span className="text-gray-400 font-normal ml-1">(optional)</span>
                    </label>
                    <input type="datetime-local" className="input bg-white"
                      min={availableFrom || undefined}
                      value={availableUntil} onChange={e => handleUntilChange(e.target.value)} />
                    <p className="mt-1 text-xs text-gray-400">Submissions lock after this</p>
                  </div>
                </div>

                {dateError && <p className="text-xs text-red-600 font-medium">⚠️ {dateError}</p>}

                <div>
                  <label className="label">
                    Due date
                    <span className="text-gray-400 font-normal ml-1">(optional — shown as deadline reminder)</span>
                  </label>
                  <input type="datetime-local" className="input bg-white"
                    min={availableFrom || undefined}
                    value={dueAt} onChange={e => setDueAt(e.target.value)} />
                  <p className="mt-1 text-xs text-gray-400">
                    Triggers a reminder notification to students 24 hours before.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Submit */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading || !!dateError} className="btn btn-primary flex-1">
              {loading ? 'Saving...' : isScheduledFuture ? '📅 Schedule' : 'Publish now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}