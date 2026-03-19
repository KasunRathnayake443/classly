import { Link } from 'react-router-dom'

// Inline banner shown when a limit is hit
export function UpgradeBanner({ message }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 flex items-start gap-3">
      <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900 mb-0.5">Free plan limit reached</p>
        <p className="text-xs text-amber-700 mb-3">{message}</p>
        <Link to="/teacher/upgrade" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg transition-colors">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
          Upgrade to Premium
        </Link>
      </div>
    </div>
  )
}

// Full page upgrade prompt (modal style)
export function UpgradeModal({ onClose, title, description }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up overflow-hidden">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-brand-500 to-purple-600 p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-1">{title || 'Upgrade to Premium'}</h2>
          <p className="text-sm text-white/80">{description || 'Unlock all features with a premium plan'}</p>
        </div>

        <div className="p-6">
          {/* Features */}
          <div className="space-y-3 mb-6">
            {[
              'Unlimited spaces',
              'Unlimited students per space',
              'Unlimited content items',
              'Priority support',
            ].map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">{f}</span>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="border-2 border-brand-500 rounded-xl p-3 text-center relative">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-semibold bg-brand-500 text-white px-2 py-0.5 rounded-full">Popular</span>
              <p className="text-xs text-gray-500 mb-1">Monthly</p>
              <p className="text-2xl font-bold text-gray-900">$9</p>
              <p className="text-xs text-gray-400">per month</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Yearly</p>
              <p className="text-2xl font-bold text-gray-900">$79</p>
              <p className="text-xs text-green-600 font-medium">Save $29/yr</p>
            </div>
          </div>

          <Link to="/teacher/upgrade"
            onClick={onClose}
            className="btn btn-primary w-full mb-2 justify-center">
            Get Premium
          </Link>
          <button onClick={onClose}
            className="btn btn-ghost w-full text-gray-500 justify-center text-sm">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
