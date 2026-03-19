// Freemium plan limits
export const LIMITS = {
  free: {
    spaces: 3,
    studentsPerSpace: 20,
    contentPerSpace: 10,
  },
  premium: {
    spaces: Infinity,
    studentsPerSpace: Infinity,
    contentPerSpace: Infinity,
  },
}

export function getPlanLimits(plan) {
  return LIMITS[plan] || LIMITS.free
}

export function isAtLimit(plan, type, current) {
  const limits = getPlanLimits(plan)
  return current >= limits[type]
}
