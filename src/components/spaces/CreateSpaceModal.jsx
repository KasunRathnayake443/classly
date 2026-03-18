import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { nanoid } from 'nanoid'

export default function CreateSpaceModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const { register, handleSubmit, formState: { errors } } = useForm()

async function onSubmit(data) {
  setError('')
  setLoading(true)
  console.log('user object:', user)  // ADD THIS LINE
  try {
      const prefix = data.subject?.slice(0, 3).toUpperCase() || 'CLS'
      const joinCode = `${prefix}-${nanoid(4).toUpperCase()}`

      const { error: err } = await supabase.from('spaces').insert({
        name: data.name,
        subject: data.subject,
        join_code: joinCode,
        teacher_id: user.id,   // explicitly set — no longer relying on trigger
      })
      if (err) throw err
      onCreated()
    } catch (err) {
      setError(err.message || 'Failed to create space.')
    } finally {
      setLoading(false)
    }
  }
  

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Create a new space</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg">{error}</div>
          )}

          <div>
            <label className="label">Space name</label>
            <input
              className="input"
              placeholder="e.g. Grade 10 Science"
              {...register('name', { required: 'Space name is required' })}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Subject <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              className="input"
              placeholder="e.g. Biology"
              {...register('subject')}
            />
          </div>

          <p className="text-xs text-gray-400">
            A unique join code will be generated automatically. Share it with your students so they can join.
          </p>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'Creating...' : 'Create space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
  
}

