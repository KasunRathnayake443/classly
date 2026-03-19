// Full page loading screen
export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}

// Inline skeleton rows
export function SkeletonList({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-3">
          <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 rounded w-2/5" />
            <div className="skeleton h-3 rounded w-1/4" />
          </div>
          <div className="skeleton h-3 rounded w-12" />
        </div>
      ))}
    </div>
  )
}

// Skeleton for stat cards
export function SkeletonStats({ count = 3 }) {
  return (
    <div className={`grid grid-cols-${count} gap-4 mb-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 space-y-2">
          <div className="skeleton h-3 rounded w-1/2" />
          <div className="skeleton h-8 rounded w-1/3" />
        </div>
      ))}
    </div>
  )
}

// Skeleton for space cards grid
export function SkeletonCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="skeleton w-9 h-9 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 rounded w-3/4" />
              <div className="skeleton h-3 rounded w-1/2" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <div className="skeleton h-3 rounded w-16" />
            <div className="skeleton h-3 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}
