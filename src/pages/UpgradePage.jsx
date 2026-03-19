import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function UpgradePage() {
  const { profile } = useAuth()
  const [billing, setBilling] = useState('monthly')
  const isPremium = profile?.plan === 'premium'

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto animate-fade-in">
      <Link to="/teacher" className="text-sm text-gray-400 hover:text-brand-500 flex items-center gap-1 mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to dashboard
      </Link>

      {isPremium ? (
        <div className="card p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">You're on Premium!</h1>
          <p className="text-sm text-gray-500">You have access to all features. Thank you for supporting Skooly.</p>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 badge badge-amber mb-4 px-3 py-1.5 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
              </svg>
              Upgrade to Premium
            </div>
            <h1 className="page-title mb-2">Unlock the full Skooly experience</h1>
            <p className="text-gray-500">Everything you need to run a great classroom, without limits.</p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
            <button onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${billing === 'yearly' ? 'bg-brand-500' : 'bg-gray-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${billing === 'yearly' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm font-medium ${billing === 'yearly' ? 'text-gray-900' : 'text-gray-400'}`}>
              Yearly <span className="badge badge-green ml-1">Save $29</span>
            </span>
          </div>

          {/* Plan comparison */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Free */}
            <div className="card p-5">
              <div className="mb-4">
                <span className="badge badge-gray mb-2">Current plan</span>
                <p className="text-lg font-bold text-gray-900">Skooly Basic</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">$0</p>
                <p className="text-xs text-gray-400">free forever</p>
              </div>
              <div className="space-y-2.5 text-sm text-gray-600">
                {[
                  '3 spaces',
                  '20 students per space',
                  '10 content items per space',
                  'Notes, quizzes, assignments',
                  'Basic progress tracking',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Premium */}
            <div className="card p-5 border-2 border-brand-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="badge bg-brand-500 text-white px-3 py-1 text-xs font-semibold">Recommended</span>
              </div>
              <div className="mb-4">
                <span className="badge badge-blue mb-2">Premium</span>
                <p className="text-lg font-bold text-gray-900">Skooly Premium</p>
                <p className="text-3xl font-bold text-brand-600 mt-1">
                  {billing === 'monthly' ? '$9' : '$79'}
                </p>
                <p className="text-xs text-gray-400">
                  {billing === 'monthly' ? 'per month' : 'per year · $6.58/mo'}
                </p>
              </div>
              <div className="space-y-2.5 text-sm text-gray-600">
                {[
                  'Unlimited spaces',
                  'Unlimited students',
                  'Unlimited content',
                  'File uploads for assignments',
                  'Advanced progress tracking',
                  'Announcement system',
                  'Priority support',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>
              <button className="btn btn-primary w-full mt-5 justify-center">
                Get Premium — {billing === 'monthly' ? '$9/mo' : '$79/yr'}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">Stripe integration coming soon</p>
            </div>
          </div>

          {/* FAQ */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Common questions</h3>
            <div className="space-y-4">
              {[
                { q: 'Can I upgrade at any time?', a: 'Yes — upgrade whenever you hit a limit and your account upgrades instantly.' },
                { q: 'What happens to my data if I downgrade?', a: 'Your content stays safe. You just won\'t be able to create new spaces or add more students until you\'re within free limits.' },
                { q: 'Do students need to pay?', a: 'No — Skooly is always free for students.' },
              ].map(({ q, a }) => (
                <div key={q}>
                  <p className="text-sm font-medium text-gray-800 mb-1">{q}</p>
                  <p className="text-sm text-gray-500">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
