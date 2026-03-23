import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { nanoid } from 'nanoid'
import { getPlanLimits } from '../../lib/planEngine'

const COLORS = [
  '#4F46E5', '#059669', '#D97706', '#DB2777',
  '#0891B2', '#7C3AED', '#DC2626', '#EA580C',
  '#0D9488', '#4338CA', '#9333EA', '#0284C7',
]

const ICONS = ['📚', '🔬', '🧮', '🎨', '🌍', '⚗️', '📖', '🎭', '🏛️', '💻', '🎵', '🏃', '🌿', '🔭', '✏️', '🧬']

export default function CreateSpaceModal({ onClose, onCreated }) {
  const { user, subscription } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0])
  const { register, handleSubmit, formState: { errors } } = useForm()

  async function onSubmit(data) {
    setError('')
    // Use cached subscription from context — no extra query needed
    const limits = getPlanLimits(subscription?.plan)
    if (limits.max_spaces !== Infinity) {
      const { count } = await supabase.from('spaces').select('*', { count: 'exact', head: true }).eq('teacher_id', user.id)
      if ((count || 0) >= limits.max_spaces) {
        setError(`You've reached the ${subscription?.plan?.name || 'current plan'} limit of ${subscription?.plan?.max_spaces} classes. Upgrade to add more.`)
        return
      }
    }
    setLoading(true)
    try {
      const prefix = data.subject?.slice(0, 3).toUpperCase() || 'CLS'
      const joinCode = `${prefix}-${nanoid(4).toUpperCase()}`
      const { error: err } = await supabase.from('spaces').insert({
        name: data.name,
        subject: data.subject,
        description: data.description || null,
        teacher_display_name: data.teacher_display_name || null,
        cover_color: selectedColor,
        icon: selectedIcon,
        join_code: joinCode,
        teacher_id: user.id,
      })
      if (err) throw err
      onCreated()
    } catch (err) {
      setError(err.message || 'Failed to create class.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
        {/* Preview banner */}
        <div className="h-20 rounded-t-2xl flex items-center px-5 gap-3 transition-colors" style={{ background: selectedColor }}>
          <span className="text-3xl">{selectedIcon}</span>
          <div>
            <p className="text-white font-bold text-lg leading-tight">New class</p>
            <p className="text-white/70 text-sm">Preview</p>
          </div>
        </div>

        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Create a class</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Class name</label>
              <input className="input" placeholder="e.g. Year 10 Biology"
                {...register('name', { required: 'Name is required' })} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Subject <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="input" placeholder="e.g. Biology"
                {...register('subject')} />
            </div>
          </div>

          <div>
            <label className="label">Description <span className="text-gray-400 font-normal">(optional — students see this)</span></label>
            <textarea className="input resize-none" rows={2}
              placeholder="Welcome message or class overview..."
              {...register('description')} />
          </div>

          <div>
            <label className="label">Your display name <span className="text-gray-400 font-normal">(optional — e.g. Mr. Silva)</span></label>
            <input className="input" placeholder="How students will see your name in this class"
              {...register('teacher_display_name')} />
          </div>

          {/* Icon picker */}
          <div>
            <label className="label">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(icon => (
                <button key={icon} type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${selectedIcon === icon ? 'ring-2 ring-offset-1 scale-110' : 'hover:bg-gray-100'}`}
                  style={{ ringColor: selectedColor }}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="label">Cover color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(color => (
                <button key={color} type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                  style={{ background: color, ringColor: color }} />
              ))}
            </div>
          </div>

          <div>
            <label className="label">Join mode</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'open', label: 'Open', desc: 'Anyone with the code joins instantly' },
                { value: 'approval', label: 'Approval', desc: 'You approve each student' },
              ].map(opt => (
                <label key={opt.value}
                  className="flex items-start gap-2 p-3 rounded-xl border cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                  <input type="radio" value={opt.value} defaultChecked={opt.value === 'open'}
                    {...register('join_mode')} className="mt-0.5 accent-brand-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'Creating...' : 'Create class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}