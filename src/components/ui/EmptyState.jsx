export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="card p-10 text-center animate-fade-in">
      {icon && (
        <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-gray-800 mb-1">{title}</p>
      {description && <p className="text-sm text-gray-400 mb-5 max-w-xs mx-auto">{description}</p>}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  )
}
