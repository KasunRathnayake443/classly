// Compute the current state of a content item based on scheduling
export function getContentState(content) {
  const now = new Date()
  const from = content.available_from ? new Date(content.available_from) : null
  const until = content.available_until ? new Date(content.available_until) : null

  if (from && now < from) return 'scheduled'   // not open yet
  if (until && now > until) return 'closed'     // submissions closed
  return 'active'                               // fully open
}

// Human-readable label for state
export function getContentStateLabel(content) {
  const state = getContentState(content)
  if (state === 'scheduled') return `Opens ${formatDateTime(content.available_from)}`
  if (state === 'closed') return `Closed ${formatDateTime(content.available_until)}`
  if (content.available_until) return `Closes ${formatDateTime(content.available_until)}`
  return null
}

// Format a datetime string concisely
export function formatDateTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `today at ${time}`
  if (isTomorrow) return `tomorrow at ${time}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` at ${time}`
}
