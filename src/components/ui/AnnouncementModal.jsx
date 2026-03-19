import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function AnnouncementModal({ spaceId, onClose, onCreated }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    setError(''); setLoading(true)
    try {
      const { error: err } = await supabase.from('announcements').insert({
        space_id: spaceId,
        teacher_id: user.id,
        title: title.trim(),
        body: body.trim() || null,
        is_pinned: isPinned,
        scheduled_for: scheduledFor || null,
      })
      if (err) throw err
      onCreated()
    } catch (err) {
      setError(err.message || 'Failed to send announcement.')
    } finally {
      setLoading(false)
    }
  }

  const isScheduled = !!scheduledFor && new Date(scheduledFor) > new Date()

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">New announcement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}

          <div>
            <label className="label">Title</label>
            <input className="input" placeholder="e.g. Zoom link for tomorrow's class"
              value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>

          <div>
            <label className="label">Message <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea className="input min-h-[100px] resize-y"
              placeholder="Add more details, links, or instructions..."
              value={body} onChange={e => setBody(e.target.value)} />
          </div>

          <div>
            <label className="label">Schedule for later <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="datetime-local" className="input"
              value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} />
            {isScheduled && (
              <p className="mt-1 text-xs text-amber-600">
                Will be visible to students on {new Date(scheduledFor).toLocaleString()}
              </p>
            )}
          </div>

          {/* Pin toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-800">Pin this announcement</p>
              <p className="text-xs text-gray-400">Pinned announcements appear at the top</p>
            </div>
            <button type="button" onClick={() => setIsPinned(p => !p)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPinned ? 'bg-brand-500' : 'bg-gray-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPinned ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'Sending...' : isScheduled ? 'Schedule' : 'Send now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}