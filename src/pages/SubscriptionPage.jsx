import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fetchPlans, daysUntilExpiry, createTransaction, getPlanLimits, fetchTeacherSubscription } from '../lib/planEngine'

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
  const { user, subscription, refreshProfile } = useAuth()
  const [spaces, setSpaces] = useState([])
  const [plans, setPlans] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)
  const [saving, setSaving] = useState(false)

  const currentPlan = subscription?.plan
  const currentTxn = subscription?.transaction
  const freePlan = plans.find(p => p.is_free)
  // getPlanLimits works with the plan object from subscription engine
  const limits = getPlanLimits(currentPlan)
  const days = daysUntilExpiry(currentTxn?.expires_at)
  const isExpiringSoon = days !== null && days <= 7

  useEffect(() => {
    Promise.all([
      fetchSpaces(),
      fetchPlans().then(setPlans),
      fetchTransactions(),
    ]).then(() => setLoading(false))
  }, [])

  async function fetchSpaces() {
    const { data } = await supabase
      .from('spaces')
      .select('id, name, subject, created_at, is_locked, lock_reason')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: true })
    setSpaces(data || [])
  }

  async function fetchTransactions() {
    const { data } = await supabase
      .from('transactions')
      .select('*, plans(name,slug)')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setTransactions(data || [])
  }

  async function handleDowngrade() {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ plan: 'free' }).eq('id', user.id)
    // Cancel active transactions
    await supabase.from('transactions').update({ status: 'cancelled' }).eq('teacher_id', user.id).eq('status', 'active')
    if (!error) await refreshProfile()
    setConfirm(null)
    setSaving(false)
  }

  async function deleteSpace(spaceId) {
    setSaving(true)
    await supabase.from('spaces').delete().eq('id', spaceId)
    setSpaces(prev => prev.filter(s => s.id !== spaceId))
    setConfirm(null)
    setSaving(false)
  }

  // Determine which spaces are locked based on current plan
  const maxSpaces = limits.max_spaces
  const spacesWithLock = spaces.map((space, i) => ({
    ...space,
    isPlanLocked: i >= maxSpaces || space.is_locked,
    isAdminLocked: space.is_locked,
  }))
  const lockedSpaces = spacesWithLock.filter(s => s.isPlanLocked)

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

      {/* Expiry warning */}
      {isExpiringSoon && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-900">Your plan expires in {days} day{days !== 1 ? 's' : ''}</p>
            <p className="text-xs text-amber-700 mt-0.5">Renew now to keep access to all your spaces.</p>
            <Link to="/teacher/upgrade" className="text-xs font-semibold text-amber-800 underline mt-1 inline-block">Renew now →</Link>
          </div>
        </div>
      )}

      {/* Current plan */}
      <div className={`card p-5 mb-4 ${currentPlan && !currentPlan.is_free ? 'border-brand-200' : ''}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-gray-900">
                {currentPlan?.name || 'Skooly Basic'}
              </h2>
              {currentPlan && !currentPlan.is_free ? (
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
              {limits.max_spaces === Infinity ? 'Unlimited spaces' : `${limits.max_spaces} spaces`}
              {' · '}
              {limits.max_students === Infinity ? 'Unlimited students/space' : `${limits.max_students} students/space`}
            </p>
            {currentTxn && (
              <p className="text-xs text-gray-400 mt-1">
                {currentTxn.billing_cycle === 'manual' ? 'Manual upgrade' : `${currentTxn.billing_cycle} billing`}
                {' · '}Expires {new Date(currentTxn.expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-1.5 mb-5">
          {(currentPlan?.features || freePlan?.features || []).map(f => (
            <div key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
              <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {f}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Link to="/teacher/upgrade" className="btn btn-primary text-sm">
            {currentPlan?.is_free ? 'Upgrade plan' : 'Change plan'}
          </Link>
          {currentPlan && !currentPlan.is_free && (
            <button onClick={() => setConfirm('downgrade')}
              className="btn btn-secondary text-sm text-red-500 hover:border-red-200">
              Downgrade to Basic
            </button>
          )}
        </div>
      </div>

      {/* Spaces */}
      {spaces.length > 0 && (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Your spaces</h3>
          <p className="text-xs text-gray-400 mb-4">
            {lockedSpaces.length > 0
              ? `${lockedSpaces.length} space${lockedSpaces.length > 1 ? 's are' : ' is'} locked under your current plan.`
              : `All ${spaces.length} spaces are active.`}
          </p>
          <div className="space-y-2">
            {spacesWithLock.map((space, i) => (
              <div key={space.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${space.isPlanLocked ? 'border-red-100 bg-red-50/30' : 'border-gray-100'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${space.isPlanLocked ? 'bg-gray-300' : 'bg-brand-500'}`}>
                  {space.isPlanLocked ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : space.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${space.isPlanLocked ? 'text-gray-400' : 'text-gray-800'}`}>
                    {space.name}
                    {space.isAdminLocked && <span className="ml-2 badge badge-red text-xs">Admin locked</span>}
                    {space.isPlanLocked && !space.isAdminLocked && <span className="ml-2 badge badge-red text-xs">Plan locked</span>}
                  </p>
                  <p className="text-xs text-gray-400">{space.subject || 'No subject'}</p>
                </div>
                {space.isPlanLocked && !space.isAdminLocked ? (
                  <div className="flex gap-2 flex-shrink-0">
                    <Link to="/teacher/upgrade" className="text-xs text-brand-500 hover:underline font-medium">Upgrade</Link>
                    <span className="text-gray-300">·</span>
                    <button onClick={() => setConfirm({ type: 'delete', space })}
                      className="text-xs text-red-400 hover:text-red-600 font-medium">Delete</button>
                  </div>
                ) : space.isAdminLocked ? (
                  <span className="text-xs text-gray-400 flex-shrink-0">Contact support</span>
                ) : (
                  <span className="badge badge-green text-xs flex-shrink-0">Active</span>
                )}
              </div>
            ))}
          </div>
          {lockedSpaces.filter(s => !s.isAdminLocked).length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
              Locked spaces are hidden from students but your data is safe. Upgrade to unlock them, or delete them to free up your account.
            </div>
          )}
        </div>
      )}

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Transaction history</h3>
          <div className="space-y-2">
            {transactions.map(txn => (
              <div key={txn.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{txn.plans?.name}</p>
                  <p className="text-xs text-gray-400">
                    {txn.billing_cycle} · Expires {new Date(txn.expires_at).toLocaleDateString()}
                    {txn.notes && ` · ${txn.notes}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {txn.amount_paid > 0 ? `$${txn.amount_paid}` : 'Free'}
                  </p>
                  <span className={`badge text-xs ${txn.status === 'active' ? 'badge-green' : txn.status === 'expired' ? 'badge-red' : 'badge-gray'}`}>
                    {txn.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Downgrade confirm */}
      {confirm === 'downgrade' && (
        <ConfirmDialog
          title="Downgrade to Basic?"
          message={lockedSpaces.length > 0
            ? `${lockedSpaces.length} of your spaces will be locked. Students in those spaces will still have access but you won't be able to manage them until you upgrade again.`
            : "You'll be moved to the free plan limits. You can upgrade again anytime."}
          confirmLabel="Yes, downgrade"
          onConfirm={handleDowngrade}
          onCancel={() => setConfirm(null)}
          loading={saving}
          danger
        />
      )}

      {/* Delete space confirm */}
      {confirm?.type === 'delete' && (
        <ConfirmDialog
          title={`Delete "${confirm.space.name}"?`}
          message="This will permanently delete the space and all its content. This cannot be undone."
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