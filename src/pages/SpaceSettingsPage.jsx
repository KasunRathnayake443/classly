import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabase'

export default function SpaceSettingsPage() {
  const { spaceId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    async function fetchSpace() {
      const { data } = await supabase.from('spaces').select('*').eq('id', spaceId).single()
      if (data) reset({ name: data.name, subject: data.subject || '' })
      setLoading(false)
    }
    fetchSpace()
  }, [spaceId])

  async function onSubmit(data) {
    setError(''); setSuccess('')
    setSaving(true)
    const { error: err } = await supabase.from('spaces').update({ name: data.name, subject: data.subject }).eq('id', spaceId)
    if (err) setError(err.message)
    else setSuccess('Space updated successfully.')
    setSaving(false)
  }

  async function handleDelete() {
    if (!window.confirm('Delete this space? This will remove all content and enrollments. This cannot be undone.')) return
    setDeleting(true)
    await supabase.from('spaces').delete().eq('id', spaceId)
    navigate('/teacher')
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading...</div>

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Link to={`/teacher/spaces/${spaceId}`} className="text-sm text-gray-400 hover:text-brand-500 flex items-center gap-1 mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to space
      </Link>

      <h1 className="text-xl font-semibold text-gray-900 mb-6">Space settings</h1>

      <div className="card p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">General</h2>
        {error && <div className="mb-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
        {success && <div className="mb-3 p-3 bg-green-50 text-green-700 text-sm rounded-lg">{success}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Space name</label>
            <input className="input" {...register('name', { required: 'Name is required' })} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Subject</label>
            <input className="input" placeholder="e.g. Biology" {...register('subject')} />
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>

      <div className="card p-5 border-red-100">
        <h2 className="text-sm font-semibold text-red-600 mb-2">Danger zone</h2>
        <p className="text-xs text-gray-500 mb-3">Deleting a space removes all its content, quizzes, and student enrollments permanently.</p>
        <button onClick={handleDelete} disabled={deleting} className="btn btn-danger text-sm">
          {deleting ? 'Deleting...' : 'Delete this space'}
        </button>
      </div>
    </div>
  )
}