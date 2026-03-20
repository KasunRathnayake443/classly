import { supabase } from './supabase'

const SESSION_KEY = 'skooly_admin_session'
const TIMEOUT_MS = 30 * 60 * 1000 // 30 min inactivity timeout

// ── Session management ────────────────────────────────────────────────────────
export function getAdminSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    // Check inactivity timeout
    if (Date.now() - session.lastActivity > TIMEOUT_MS) {
      clearAdminSession()
      return null
    }
    return session
  } catch { return null }
}

export function setAdminSession(admin) {
  const session = { ...admin, lastActivity: Date.now() }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function refreshAdminActivity() {
  const session = getAdminSession()
  if (session) setAdminSession(session)
}

export function clearAdminSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function adminLogin(email, password) {
  const { data, error } = await supabase
    .from('admin_accounts')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('password_hash', password) // plain for now — replace with bcrypt in prod
    .eq('is_active', true)
    .single()

  if (error || !data) throw new Error('Invalid email or password.')

  // Update last_login_at
  await supabase.from('admin_accounts')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.id)

  const session = { ...data, lastActivity: Date.now() }
  setAdminSession(session)
  return session
}

// ── Activity logging ──────────────────────────────────────────────────────────
export async function logActivity(admin, action, targetType, targetId, targetName, details = {}) {
  await supabase.from('admin_activity_log').insert({
    admin_id: admin.id,
    admin_name: admin.full_name,
    action,
    target_type: targetType,
    target_id: targetId ? String(targetId) : null,
    target_name: targetName,
    details,
  })
}

// ── Permission checks ─────────────────────────────────────────────────────────
export function canAccess(admin, feature) {
  if (!admin) return false
  if (admin.role === 'super_admin') return true
  // Regular admins cannot access these
  const superOnly = ['plans', 'admins', 'broadcast']
  return !superOnly.includes(feature)
}
