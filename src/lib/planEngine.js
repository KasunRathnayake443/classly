import { supabase } from './supabase'

// ── Fetch all active plans from DB ────────────────────────────────────────────
export async function fetchPlans() {
  const { data } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  return data || []
}

// ── Get a teacher's current active transaction + plan ─────────────────────────
export async function fetchTeacherSubscription(teacherId) {
  const now = new Date().toISOString()

  // Get active transaction (not expired, not cancelled)
  const { data: txn } = await supabase
    .from('transactions')
    .select('*, plans(*)')
    .eq('teacher_id', teacherId)
    .eq('status', 'active')
    .gt('expires_at', now)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (txn) return { transaction: txn, plan: txn.plans }

  // No active transaction — get the free plan
  const { data: freePlan } = await supabase
    .from('plans')
    .select('*')
    .eq('is_free', true)
    .single()

  return { transaction: null, plan: freePlan }
}

// ── Check + sync expired transactions ─────────────────────────────────────────
// Call this on login / page load
export async function syncSubscriptionStatus(teacherId) {
  const now = new Date().toISOString()

  // Expire any transactions that have passed their expiry date
  await supabase
    .from('transactions')
    .update({ status: 'expired' })
    .eq('teacher_id', teacherId)
    .eq('status', 'active')
    .lt('expires_at', now)

  // Get the current effective plan
  const { transaction, plan } = await fetchTeacherSubscription(teacherId)

  // Sync the plan slug on the profile for quick access
  const planSlug = plan?.slug || 'free'
  await supabase
    .from('profiles')
    .update({ plan: planSlug })
    .eq('id', teacherId)

  return { transaction, plan }
}

// ── Get limits for a plan ──────────────────────────────────────────────────────
export function getPlanLimits(plan) {
  if (!plan) return { max_spaces: Infinity, max_students: Infinity } // no plan loaded yet — don't lock anything
  return {
    max_spaces: plan.max_spaces === -1 ? Infinity : plan.max_spaces,
    max_students: plan.max_students === -1 ? Infinity : plan.max_students,
  }
}

// ── Check if at limit ──────────────────────────────────────────────────────────
export function isOverLimit(plan, type, current) {
  const limits = getPlanLimits(plan)
  if (type === 'spaces') return current >= limits.max_spaces
  if (type === 'students') return current >= limits.max_students
  return false
}

// ── Days until expiry ──────────────────────────────────────────────────────────
export function daysUntilExpiry(expiresAt) {
  if (!expiresAt) return null
  const diff = new Date(expiresAt) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ── Create a transaction (purchase or manual) ──────────────────────────────────
export async function createTransaction({ teacherId, planId, billingCycle, amountPaid, notes }) {
  const now = new Date()
  let expiresAt

  if (billingCycle === 'monthly') {
    expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
  } else if (billingCycle === 'yearly') {
    expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
  } else if (billingCycle === 'manual') {
    // Admin sets custom expiry — default 1 year
    expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
  }

  // Cancel any existing active transactions
  await supabase
    .from('transactions')
    .update({ status: 'cancelled' })
    .eq('teacher_id', teacherId)
    .eq('status', 'active')

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      teacher_id: teacherId,
      plan_id: planId,
      billing_cycle: billingCycle,
      amount_paid: amountPaid || 0,
      status: 'active',
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      notes: notes || null,
    })
    .select()
    .single()

  if (error) throw error

  // Sync profile plan
  const { data: plan } = await supabase.from('plans').select('slug').eq('id', planId).single()
  await supabase.from('profiles').update({ plan: plan?.slug || 'free' }).eq('id', teacherId)

  return data
}

// ── Get locked spaces for a teacher (beyond their plan limit) ─────────────────
export async function getLockedSpaces(teacherId, plan) {
  const { data: spaces } = await supabase
    .from('spaces')
    .select('id, name, subject, created_at, is_locked, lock_reason')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: true })

  const limits = getPlanLimits(plan)
  return (spaces || []).map((space, i) => ({
    ...space,
    isPlanLocked: i >= limits.max_spaces, // locked due to plan limit
  }))
}