import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { nanoid } from 'nanoid'
import { getPlanLimits } from '../../lib/planEngine'

const COLORS = [
  '#4F46E5','#059669','#D97706','#DB2777',
  '#0891B2','#7C3AED','#DC2626','#EA580C',
  '#0D9488','#4338CA','#9333EA','#0284C7',
]
const ICONS = ['📚','🔬','🧮','🎨','🌍','⚗️','📖','🎭','🏛️','💻','🎵','🏃','🌿','🔭','✏️','🧬']

export default function CreateSpaceModal({ onClose, onCreated }) {
  const { user, subscription } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0])
  const [coverMode, setCoverMode] = useState('color') // 'color' | 'image'
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [joinMode, setJoinMode] = useState('open')
  const imageInputRef = useRef(null)
  const { register, handleSubmit, watch, formState: { errors } } = useForm()

  const watchedName = watch('name', '')
  const watchedSubject = watch('subject', '')

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return }
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return }
    setUploadingImage(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const tempId = nanoid(8)
      const path = `space-covers/new-${tempId}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      setCoverImageUrl(`${urlData.publicUrl}?t=${Date.now()}`)
      setCoverMode('image')
    } catch (err) {
      setError(err.message || 'Upload failed.')
    } finally {
      setUploadingImage(false)
    }
  }

  async function onSubmit(data) {
    setError('')
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
        subject: data.subject || null,
        description: data.description || null,
        teacher_display_name: data.teacher_display_name || null,
        cover_color: selectedColor,
        cover_image_url: coverMode === 'image' ? coverImageUrl || null : null,
        icon: selectedIcon,
        join_code: joinCode,
        join_mode: joinMode,
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

  // Live banner preview
  const bannerStyle = coverMode === 'image' && coverImageUrl
    ? { backgroundImage: `url(${coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: selectedColor }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">

        {/* Live preview banner */}
        <div className="h-20 rounded-t-2xl flex items-end px-5 pb-3 gap-3 relative overflow-hidden transition-all" style={bannerStyle}>
          {coverMode === 'image' && coverImageUrl && <div className="absolute inset-0 bg-black/30" />}
          <span className="text-3xl relative z-10 drop-shadow">{selectedIcon}</span>
          <div className="relative z-10">
            <p className="text-white font-bold text-lg leading-tight drop-shadow">{watchedName || 'New class'}</p>
            <p className="text-white/70 text-sm">{watchedSubject || 'Preview'}</p>
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
              <input className="input" placeholder="e.g. Biology" {...register('subject')} />
            </div>
          </div>

          <div>
            <label className="label">Description <span className="text-gray-400 font-normal">(students see this)</span></label>
            <textarea className="input resize-none" rows={2} placeholder="Welcome message or class overview..." {...register('description')} />
          </div>

          <div>
            <label className="label">Your display name <span className="text-gray-400 font-normal">(e.g. Mr. Silva)</span></label>
            <input className="input" placeholder="How students see your name in this class" {...register('teacher_display_name')} />
          </div>

          {/* Icon picker */}
          <div>
            <label className="label">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(icon => (
                <button key={icon} type="button" onClick={() => setSelectedIcon(icon)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${selectedIcon === icon ? 'ring-2 ring-offset-1 scale-110' : 'hover:bg-gray-100'}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Cover: color vs image */}
          <div>
            <label className="label">Cover</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[{ key: 'color', label: '🎨 Color' }, { key: 'image', label: '🖼️ Image' }].map(opt => (
                <button key={opt.key} type="button" onClick={() => setCoverMode(opt.key)}
                  className={`p-2.5 rounded-xl border-2 text-sm font-medium transition-all ${coverMode === opt.key ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {coverMode === 'color' && (
              <div className="flex flex-wrap gap-2">
                {COLORS.map(color => (
                  <button key={color} type="button" onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                    style={{ background: color }} />
                ))}
              </div>
            )}

            {coverMode === 'image' && (
              <div className="space-y-2">
                <div onClick={() => imageInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${coverImageUrl ? 'border-brand-200 bg-brand-50/30' : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/20'}`}>
                  {coverImageUrl ? (
                    <div className="space-y-1">
                      <img src={coverImageUrl} alt="Cover" className="h-16 w-full object-cover rounded-lg" />
                      <p className="text-xs text-brand-600 font-medium">Click to change</p>
                    </div>
                  ) : (
                    <>
                      <svg className="w-7 h-7 text-gray-300 mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      <p className="text-sm text-gray-500">{uploadingImage ? 'Uploading...' : 'Click to upload cover image'}</p>
                      <p className="text-xs text-gray-400">Best: 1200×300px · Max 5MB</p>
                    </>
                  )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>
            )}
          </div>

          {/* Join mode — controlled state, not react-hook-form */}
          <div>
            <label className="label">Join mode</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'open', label: 'Open', desc: 'Anyone with the code joins instantly' },
                { value: 'approval', label: 'Approval', desc: 'You approve each student' },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setJoinMode(opt.value)}
                  className={`flex items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${joinMode === opt.value ? 'border-brand-500 bg-brand-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${joinMode === opt.value ? 'border-brand-500 bg-brand-500' : 'border-gray-300'}`}>
                    {joinMode === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${joinMode === opt.value ? 'text-brand-700' : 'text-gray-800'}`}>{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading || uploadingImage} className="btn btn-primary flex-1">
              {loading ? 'Creating...' : 'Create class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}