import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { supabase } from '../../lib/supabase'

const TYPES = [
  { value: 'note', label: 'Note', desc: 'Rich text reading material' },
  { value: 'quiz', label: 'Quiz', desc: 'Multiple choice questions' },
  { value: 'assignment', label: 'Assignment', desc: 'Task with written submission' },
]

export default function CreateContentModal({ spaceId, onClose, onCreated }) {
  const [type, setType] = useState('note')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: { questions: [{ question: '', options: ['', '', '', ''], correct: '0' }] }
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'questions' })

  async function onSubmit(data) {
    setError('')

    // Validate quiz questions before saving
    if (type === 'quiz') {
      for (let i = 0; i < data.questions.length; i++) {
        const q = data.questions[i]
        const filledOptions = q.options.filter(o => o.trim() !== '')

        if (!q.question.trim()) {
          setError(`Question ${i + 1} is empty.`)
          return
        }
        if (filledOptions.length < 2) {
          setError(`Question ${i + 1} needs at least 2 options.`)
          return
        }
        // Check for duplicate options
        const unique = new Set(filledOptions.map(o => o.trim().toLowerCase()))
        if (unique.size !== filledOptions.length) {
          setError(`Question ${i + 1} has duplicate options — each option must be unique.`)
          return
        }
        // Make sure correct answer option isn't empty
        const correctOption = q.options[parseInt(q.correct)]
        if (!correctOption || !correctOption.trim()) {
          setError(`Question ${i + 1}: the selected correct answer is empty. Please fill it in.`)
          return
        }
      }
    }

    setLoading(true)
    try {
      const { data: content, error: contentErr } = await supabase
        .from('content')
        .insert({
          space_id: spaceId,
          type,
          title: data.title,
          body: data.body || null,
          due_at: data.due_at || null,
        })
        .select()
        .single()
      if (contentErr) throw contentErr

      if (type === 'quiz' && data.questions?.length) {
        const questionsToInsert = data.questions.map((q, i) => {
          const filledOptions = q.options.filter(o => o.trim() !== '')
          const correctAnswer = q.options[parseInt(q.correct)].trim()
          return {
            content_id: content.id,
            question: q.question.trim(),
            options: filledOptions,
            correct_answer: correctAnswer,
            order_index: i,
          }
        })
        const { error: qErr } = await supabase.from('quiz_questions').insert(questionsToInsert)
        if (qErr) throw qErr
      }

      onCreated()
    } catch (err) {
      setError(err.message || 'Failed to create content.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl my-8">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Add content</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg">{error}</div>}

          {/* Type picker */}
          <div>
            <label className="label">Content type</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${type === t.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${type === t.value ? 'text-brand-600' : 'text-gray-700'}`}>{t.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
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

          {/* Note body */}
          {type === 'note' && (
            <div>
              <label className="label">Content</label>
              <textarea className="input min-h-[140px] resize-y" placeholder="Write your note here..."
                {...register('body')} />
            </div>
          )}

          {/* Assignment */}
          {type === 'assignment' && (
            <>
              <div>
                <label className="label">Instructions</label>
                <textarea className="input min-h-[100px] resize-y" placeholder="Describe the assignment..."
                  {...register('body')} />
              </div>
              <div>
                <label className="label">Due date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="datetime-local" className="input" {...register('due_at')} />
              </div>
            </>
          )}

          {/* Quiz questions */}
          {type === 'quiz' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="label mb-0">Questions</label>
                <button type="button"
                  onClick={() => append({ question: '', options: ['', '', '', ''], correct: '0' })}
                  className="text-xs text-brand-500 hover:underline">
                  + Add question
                </button>
              </div>

              {fields.map((field, qi) => (
                <div key={field.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Question {qi + 1}</span>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(qi)}
                        className="text-xs text-red-400 hover:text-red-600">Remove</button>
                    )}
                  </div>

                  <input className="input" placeholder="Enter your question here..."
                    {...register(`questions.${qi}.question`, { required: true })} />

                  <p className="text-xs text-gray-400">
                    Fill in each option and select the radio button next to the correct answer. All options must be unique.
                  </p>

                  <div className="space-y-2">
                    {[0, 1, 2, 3].map(oi => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          value={String(oi)}
                          {...register(`questions.${qi}.correct`)}
                          className="accent-brand-500 flex-shrink-0"
                        />
                        <input
                          className="input text-sm"
                          placeholder={`Option ${oi + 1}${oi < 2 ? ' (required)' : ' (optional)'}`}
                          {...register(`questions.${qi}.options.${oi}`)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <label className="label">Due date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="datetime-local" className="input" {...register('due_at')} />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'Saving...' : 'Save content'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}