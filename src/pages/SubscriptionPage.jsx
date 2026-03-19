import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, loading, danger }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slide-up">
        <h2 className="text-base font-semibold text-gray-900 text-center mb-2">{title}</h2>
        <p className="text-sm text-gray-500 text-center mb-6">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className={`btn flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}>
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const FREE_SPACE_LIMIT = 3
  const isPremium = profile?.plan === 'premium'

  useEffect(() => { fetchSpaces() }, [])

  async function fetchSpaces() {
    const { data } = await supabase
      .from('spaces')
      .select('id, name, subject, created_at')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: true }) // oldest first — free keeps first 3
    setSpaces(data || [])
    setLoading(false)
  }

  // Spaces that would be locked on downgrade
  const freeSpaces = spaces.slice(0, FREE_SPACE_LIMIT)
  const lockedSpaces = spaces.slice(FREE_SPACE_LIMIT)

  async function handleDowngrade() {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ plan: 'free' })
      .eq('id', user.id)
    if (error) {
      alert('Failed to downgrade: ' + error.message)
      setSaving(false)
      return
    }
    await refreshProfile()
    setConfirm(null)
    setSaving(false)
    setSuccessMsg('Your plan has been downgraded to Skooly Basic.')
  }

  async function deleteSpace(spaceId) {
    setSaving(true)
    await supabase.from('spaces').delete().eq('id', spaceId)
    setSpaces(prev => prev.filter(s => s.id !== spaceId))
    setConfirm(null)
    setSaving(false)
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading...</div>

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto animate-fade-in">
      <Link to="/teacher" className="text-sm text-gray-400 hover:text-brand-500 flex items-center gap-1 mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to dashboard
      </Link>

      <div className="mb-6">
        <h1 className="page-title">Subscription</h1>
        <p className="page-subtitle">Manage your Skooly plan</p>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl">
          {successMsg}
        </div>
      )}

      {/* Current plan card */}
      <div className={`card p-5 mb-4 ${isPremium ? 'border-brand-200' : 'border-gray-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-gray-900">
                {isPremium ? 'Skooly Premium' : 'Skooly Basic'}
              </h2>
              {isPremium ? (
                <span className="badge badge-blue">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                  </svg>
                  Active
                </span>
              ) : (
                <span className="badge badge-gray">Free</span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {isPremium ? 'Unlimited spaces, students, and content.' : '3 spaces · 20 students · 10 content items per space'}
            </p>
          </div>
          {isPremium && (
            <p className="text-2xl font-bold text-brand-600">Premium</p>
          )}
        </div>

        {/* Feature list */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {(isPremium ? [
            '✓ Unlimited spaces',
            '✓ Unlimited students',
            '✓ Unlimited content',
            '✓ File uploads',
            '✓ Announcements',
            '✓ Progress tracking',
          ] : [
            '✓ 3 spaces',
            '✓ 20 students per space',
            '✓ 10 content items per space',
            '✓ Notes, quizzes, assignments',
            '✓ Basic progress tracking',
            '— File uploads (Premium)',
          ]).map(f => (
            <p key={f} className={`text-xs ${f.startsWith('—') ? 'text-gray-300' : 'text-gray-600'}`}>{f}</p>
          ))}
        </div>

        {/* Actions */}
        {isPremium ? (
          <button
            onClick={() => setConfirm('downgrade')}
            className="btn btn-secondary text-sm text-red-500 hover:border-red-200 hover:text-red-600">
            Downgrade to Basic
          </button>
        ) : (
          <Link to="/teacher/upgrade" className="btn btn-primary text-sm">
            Upgrade to Premium
          </Link>
        )}
      </div>

      {/* Space status — shown when premium with >3 spaces, or after downgrade */}
      {spaces.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Your spaces</h3>
          <p className="text-xs text-gray-400 mb-4">
            {isPremium
              ? `You have ${spaces.length} space${spaces.length !== 1 ? 's' : ''}. All are active.`
              : spaces.length > FREE_SPACE_LIMIT
                ? `You have ${spaces.length} spaces but the free plan allows ${FREE_SPACE_LIMIT}. The oldest ${FREE_SPACE_LIMIT} are kept active — the rest are locked.`
                : `You have ${spaces.length} of ${FREE_SPACE_LIMIT} free spaces used.`
            }
          </p>

          <div className="space-y-2">
            {spaces.map((space, i) => {
              const isLocked = !isPremium && i >= FREE_SPACE_LIMIT
              return (
                <div key={space.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${isLocked ? 'border-red-100 bg-red-50/30 opacity-75' : 'border-gray-100'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${isLocked ? 'bg-gray-300' : 'bg-brand-500'}`}>
                    {isLocked ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ) : space.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isLocked ? 'text-gray-400' : 'text-gray-800'}`}>
                      {space.name}
                      {isLocked && <span className="ml-2 badge badge-red text-xs">Locked</span>}
                    </p>
                    <p className="text-xs text-gray-400">{space.subject || 'No subject'}</p>
                  </div>
                  {isLocked ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link to="/teacher/upgrade"
                        className="text-xs text-brand-500 hover:underline font-medium">
                        Upgrade
                      </Link>
                      <span className="text-gray-300">·</span>
                      <button
                        onClick={() => setConfirm({ type: 'delete', space })}
                        className="text-xs text-red-400 hover:text-red-600 font-medium">
                        Delete
                      </button>
                    </div>
                  ) : (
                    <span className="badge badge-green text-xs flex-shrink-0">Active</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Locked explanation */}
          {!isPremium && lockedSpaces.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
              Locked spaces are hidden from students but your data is safe. Upgrade to Premium to unlock them, or delete them to free up your account.
            </div>
          )}
        </div>
      )}

      {/* Confirm downgrade */}
      {confirm === 'downgrade' && (
        <ConfirmDialog
          title="Downgrade to Basic?"
          message={
            lockedSpaces.length > 0
              ? `You have ${spaces.length} spaces. Only the first ${FREE_SPACE_LIMIT} will remain active — ${lockedSpaces.length} space${lockedSpaces.length > 1 ? 's' : ''} will be locked. You can delete them or upgrade again to restore access.`
              : `You'll be moved to the free plan with limits of ${FREE_SPACE_LIMIT} spaces, 20 students, and 10 content items per space.`
          }
          confirmLabel="Yes, downgrade"
          onConfirm={handleDowngrade}
          onCancel={() => setConfirm(null)}
          loading={saving}
          danger
        />
      )}

      {/* Confirm delete locked space */}
      {confirm?.type === 'delete' && (
        <ConfirmDialog
          title={`Delete "${confirm.space.name}"?`}
          message="This will permanently delete the space and all its content, quizzes, and student data. This cannot be undone."
          confirmLabel="Delete space"
          onConfirm={() => deleteSpace(confirm.space.id)}
          onCancel={() => setConfirm(null)}
          loading={saving}
          danger
        />
      )}
    </div>
  )
}
