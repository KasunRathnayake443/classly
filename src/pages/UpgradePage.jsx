import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { fetchPlans, createTransaction, daysUntilExpiry } from '../lib/planEngine'

export default function UpgradePage() {
  const { user, subscription, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [billing, setBilling] = useState('monthly')
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(null) // planId being purchased
  const [error, setError] = useState('')

  const currentPlan = subscription?.plan
  const currentTxn = subscription?.transaction

  useEffect(() => {
    fetchPlans().then(p => { setPlans(p); setLoading(false) })
  }, [])

  async function handlePurchase(plan) {
    if (plan.is_free) return
    setPurchasing(plan.id)
    setError('')
    try {
      // Dummy transaction — charges $0 but applies the plan
      // Replace this with real Stripe when ready
      await createTransaction({
        teacherId: user.id,
        planId: plan.id,
        billingCycle: billing,
        amountPaid: billing === 'monthly' ? plan.price_monthly : plan.price_yearly,
      })
      await refreshProfile()
      navigate('/teacher/subscription')
    } catch (err) {
      setError(err.message || 'Purchase failed. Please try again.')
    } finally {
      setPurchasing(null)
    }
  }

  const paidPlans = plans.filter(p => !p.is_free)

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading plans...</div>

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-fade-in">
      <Link to="/teacher/subscription" className="text-sm text-gray-400 hover:text-brand-500 flex items-center gap-1 mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to subscription
      </Link>

      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 badge badge-amber mb-4 px-3 py-1.5 text-sm">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
          Upgrade your plan
        </div>
        <h1 className="page-title mb-2">Choose a plan that works for you</h1>
        <p className="text-gray-500">All plans include the full feature set — only limits on spaces and students differ.</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl text-center">{error}</div>}

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
        <button onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${billing === 'yearly' ? 'bg-brand-500' : 'bg-gray-200'}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${billing === 'yearly' ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className={`text-sm font-medium ${billing === 'yearly' ? 'text-gray-900' : 'text-gray-400'}`}>
          Yearly <span className="badge badge-green ml-1 text-xs">Save more</span>
        </span>
      </div>

      {/* Plans grid */}
      <div className={`grid gap-4 ${paidPlans.length === 1 ? 'max-w-sm mx-auto' : paidPlans.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {paidPlans.map((plan, i) => {
          const isCurrent = currentPlan?.id === plan.id
          const price = billing === 'monthly' ? plan.price_monthly : plan.price_yearly
          const perMonth = billing === 'yearly' ? (plan.price_yearly / 12).toFixed(2) : null
          return (
            <div key={plan.id} className={`card p-6 relative ${i === 1 ? 'border-2 border-brand-500' : ''}`}>
              {i === 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="badge bg-brand-500 text-white px-3 py-1 text-xs font-semibold">Most popular</span>
                </div>
              )}
              <div className="mb-5">
                <p className="text-lg font-bold text-gray-900 mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-brand-600">${price}</span>
                  <span className="text-sm text-gray-400">/{billing === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                {perMonth && <p className="text-xs text-green-600 font-medium mt-0.5">${perMonth}/mo billed yearly</p>}
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {plan.max_spaces === -1 ? 'Unlimited spaces' : `${plan.max_spaces} spaces`}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {plan.max_students === -1 ? 'Unlimited students/space' : `${plan.max_students} students/space`}
                </div>
                {(plan.features || []).map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <div className="btn w-full justify-center bg-green-50 text-green-700 border-green-200 cursor-default">
                  ✓ Current plan
                </div>
              ) : (
                <button
                  onClick={() => handlePurchase(plan)}
                  disabled={!!purchasing}
                  className={`btn btn-primary w-full justify-center ${i === 1 ? '' : 'bg-gray-800 border-gray-800 hover:bg-gray-700'}`}>
                  {purchasing === plan.id ? 'Processing...' : `Get ${plan.name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        💳 Payments are processed securely. Cancel anytime from your subscription page.
      </p>
    </div>
  )
}