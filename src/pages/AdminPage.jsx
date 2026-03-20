import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { daysUntilExpiry } from '../lib/planEngine'
import {
  getAdminSession, setAdminSession, clearAdminSession,
  adminLogin, logActivity, canAccess, refreshAdminActivity
} from '../lib/adminAuth'

// ── UI Helpers ────────────────────────────────────────────────────────────────
function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-gray-100 text-gray-600',
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-700',
    red:    'bg-red-50 text-red-600',
    amber:  'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
    indigo: 'bg-indigo-50 text-indigo-700',
  }
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${colors[color] || colors.gray}`}>{children}</span>
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} my-4 animate-slide-up`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color = 'text-gray-900', sub }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const session = await adminLogin(email, password)
      onLogin(session)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Skooly" className="w-12 h-12 rounded-2xl object-cover mx-auto mb-3 shadow-sm" />
          <h1 className="text-xl font-bold text-gray-900">Skooly Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your admin account</p>
        </div>
        <div className="card p-6">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="admin@skooly.com"
                value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={loading}
              className="btn w-full justify-center text-white"
              style={{ background: '#111827', borderColor: '#111827' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Admin Profile Modal ───────────────────────────────────────────────────────
function AdminProfileModal({ admin, onClose, onUpdated }) {
  const [fullName, setFullName] = useState(admin.full_name)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  async function saveProfile() {
    if (!fullName.trim()) { setMsg({ type: 'error', text: 'Name is required.' }); return }
    setSaving(true)
    const { error } = await supabase.from('admin_accounts').update({ full_name: fullName.trim() }).eq('id', admin.id)
    if (error) { setMsg({ type: 'error', text: error.message }); setSaving(false); return }
    const updated = { ...admin, full_name: fullName.trim() }
    setAdminSession(updated)
    onUpdated(updated)
    setMsg({ type: 'success', text: 'Name updated.' })
    setSaving(false)
  }

  async function savePassword() {
    if (!currentPassword) { setMsg({ type: 'error', text: 'Enter your current password.' }); return }
    if (newPassword.length < 8) { setMsg({ type: 'error', text: 'New password must be at least 8 characters.' }); return }
    if (newPassword !== confirmPassword) { setMsg({ type: 'error', text: 'Passwords do not match.' }); return }
    setSaving(true)
    // Verify current password
    const { data } = await supabase.from('admin_accounts').select('password_hash').eq('id', admin.id).single()
    if (data?.password_hash !== currentPassword) {
      setMsg({ type: 'error', text: 'Current password is incorrect.' }); setSaving(false); return
    }
    const { error } = await supabase.from('admin_accounts').update({ password_hash: newPassword }).eq('id', admin.id)
    if (error) { setMsg({ type: 'error', text: error.message }); setSaving(false); return }
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    setMsg({ type: 'success', text: 'Password updated successfully.' })
    setSaving(false)
  }

  return (
    <Modal title="My profile" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {admin.full_name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{admin.full_name}</p>
            <p className="text-xs text-gray-400">{admin.email} · <Badge color={admin.role === 'super_admin' ? 'purple' : 'blue'}>{admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}</Badge></p>
          </div>
        </div>

        {msg && <div className={`p-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}

        <div>
          <label className="label">Full name</label>
          <div className="flex gap-2">
            <input className="input flex-1" value={fullName} onChange={e => setFullName(e.target.value)} />
            <button onClick={saveProfile} disabled={saving} className="btn btn-primary px-4">Save</button>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Change password</p>
          <div className="space-y-3">
            <div><label className="label">Current password</label>
              <input type="password" className="input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></div>
            <div><label className="label">New password</label>
              <input type="password" className="input" placeholder="Min. 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
            <div><label className="label">Confirm new password</label>
              <input type="password" className="input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
            <button onClick={savePassword} disabled={saving} className="btn btn-primary w-full">
              {saving ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Admin Accounts Tab ────────────────────────────────────────────────────────
function AdminAccountsTab({ currentAdmin, onRefresh }) {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ email: '', password_hash: '', full_name: '', role: 'admin' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchAdmins() }, [])

  async function fetchAdmins() {
    const { data } = await supabase.from('admin_accounts').select('*').order('created_at')
    setAdmins(data || [])
    setLoading(false)
  }

  function openNew() { setForm({ email: '', password_hash: '', full_name: '', role: 'admin' }); setEditing(null); setShowForm(true); setError('') }
  function openEdit(admin) { setForm({ ...admin, password_hash: '' }); setEditing(admin); setShowForm(true); setError('') }

  async function handleSave() {
    if (!form.full_name.trim() || !form.email.trim()) { setError('Name and email are required.'); return }
    if (!editing && !form.password_hash.trim()) { setError('Password is required for new accounts.'); return }
    if (!editing && form.password_hash.length < 8) { setError('Password must be at least 8 characters.'); return }
    setSaving(true); setError('')
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.toLowerCase().trim(),
      role: form.role,
      is_active: true,
    }
    if (form.password_hash.trim()) payload.password_hash = form.password_hash
    if (!editing) payload.created_by = currentAdmin.id

    const { error: err } = editing
      ? await supabase.from('admin_accounts').update(payload).eq('id', editing.id)
      : await supabase.from('admin_accounts').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }

    await logActivity(currentAdmin, editing ? 'edited_admin' : 'created_admin', 'admin', editing?.id, form.full_name)
    setShowForm(false); fetchAdmins()
    setSaving(false)
  }

  async function toggleActive(admin) {
    await supabase.from('admin_accounts').update({ is_active: !admin.is_active }).eq('id', admin.id)
    await logActivity(currentAdmin, admin.is_active ? 'deactivated_admin' : 'activated_admin', 'admin', admin.id, admin.full_name)
    fetchAdmins()
  }

  async function deleteAdmin(admin) {
    if (!confirm(`Delete ${admin.full_name}? This cannot be undone.`)) return
    await supabase.from('admin_accounts').delete().eq('id', admin.id)
    await logActivity(currentAdmin, 'deleted_admin', 'admin', admin.id, admin.full_name)
    fetchAdmins()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openNew} className="btn btn-primary text-sm">+ New admin</button>
      </div>
      <div className="card overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-gray-400">Loading...</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
                <th className="text-left px-4 py-3">Admin</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Last login</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-center px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a, i) => (
                <tr key={a.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {a.full_name?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{a.full_name} {a.id === currentAdmin.id && <span className="text-xs text-gray-400">(you)</span>}</p>
                        <p className="text-xs text-gray-400">{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={a.role === 'super_admin' ? 'purple' : 'blue'}>
                      {a.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {a.last_login_at ? new Date(a.last_login_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge color={a.is_active ? 'green' : 'red'}>{a.is_active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => openEdit(a)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">
                        Edit
                      </button>
                      {a.id !== currentAdmin.id && (
                        <>
                          <button onClick={() => toggleActive(a)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${a.is_active ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                            {a.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => deleteAdmin(a)}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 font-medium">
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <Modal title={editing ? `Edit ${editing.full_name}` : 'New admin account'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}
            <div><label className="label">Full name</label><input className="input" value={form.full_name} onChange={e => setForm(p=>({...p,full_name:e.target.value}))} /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} disabled={!!editing} /></div>
            <div>
              <label className="label">{editing ? 'New password' : 'Password'} <span className="text-gray-400 font-normal">{editing ? '(leave blank to keep current)' : ''}</span></label>
              <input type="password" className="input" placeholder="Min. 8 characters" value={form.password_hash} onChange={e => setForm(p=>({...p,password_hash:e.target.value}))} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm(p=>({...p,role:e.target.value}))}>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Create admin'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Plan Editor ───────────────────────────────────────────────────────────────
function PlanEditor({ plan, onSave, onClose }) {
  const [form, setForm] = useState({
    name: plan?.name || '', slug: plan?.slug || '',
    price_monthly: plan?.price_monthly || 0, price_yearly: plan?.price_yearly || 0,
    max_spaces: plan?.max_spaces ?? 3, max_students: plan?.max_students ?? 20,
    is_free: plan?.is_free || false, is_active: plan?.is_active ?? true,
    features: (plan?.features || []).join('\n'), sort_order: plan?.sort_order || 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.name.trim() || !form.slug.trim()) { setError('Name and slug are required.'); return }
    setSaving(true); setError('')
    const payload = {
      name: form.name.trim(), slug: form.slug.trim(),
      price_monthly: parseFloat(form.price_monthly) || 0,
      price_yearly: parseFloat(form.price_yearly) || 0,
      max_spaces: parseInt(form.max_spaces),
      max_students: parseInt(form.max_students),
      is_free: form.is_free, is_active: form.is_active,
      features: form.features.split('\n').map(f => f.trim()).filter(Boolean),
      sort_order: parseInt(form.sort_order) || 0,
    }
    const { error: err } = plan?.id
      ? await supabase.from('plans').update(payload).eq('id', plan.id)
      : await supabase.from('plans').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  const f = field => ({ value: form[field], onChange: e => setForm(p => ({...p, [field]: e.target.value})) })
  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Plan name</label><input className="input" placeholder="e.g. Pro" {...f('name')} /></div>
        <div><label className="label">Slug</label><input className="input" placeholder="e.g. pro" {...f('slug')} disabled={plan?.is_free} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Monthly price ($)</label><input className="input" type="number" min="0" step="0.01" {...f('price_monthly')} /></div>
        <div><label className="label">Yearly price ($)</label><input className="input" type="number" min="0" step="0.01" {...f('price_yearly')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Max spaces <span className="text-gray-400 font-normal">(-1 = unlimited)</span></label><input className="input" type="number" min="-1" {...f('max_spaces')} /></div>
        <div><label className="label">Max students/space <span className="text-gray-400 font-normal">(-1 = unlimited)</span></label><input className="input" type="number" min="-1" {...f('max_students')} /></div>
      </div>
      <div><label className="label">Features <span className="text-gray-400 font-normal">(one per line)</span></label>
        <textarea className="input min-h-[80px] resize-y font-mono text-sm" {...f('features')} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Sort order</label><input className="input" type="number" {...f('sort_order')} /></div>
        <div className="flex items-center gap-2 pt-6">
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(p=>({...p,is_active:e.target.checked}))} className="accent-brand-500" />
          <span className="text-sm text-gray-700">Active (visible)</span>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
          {saving ? 'Saving...' : plan?.id ? 'Save changes' : 'Create plan'}
        </button>
      </div>
    </div>
  )
}

// ── Manual Upgrade Form ───────────────────────────────────────────────────────
function ManualTransactionForm({ teacher, plans, currentAdmin, onSave, onClose }) {
  const [planId, setPlanId] = useState(plans.find(p=>!p.is_free)?.id || '')
  const [customExpiry, setCustomExpiry] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!planId) { setError('Select a plan.'); return }
    setSaving(true)
    try {
      const selectedPlan = plans.find(p => p.id === planId)
      const expiresAt = customExpiry
        ? new Date(customExpiry).toISOString()
        : new Date(Date.now() + 365*24*60*60*1000).toISOString()

      const { data: txn, error: txnErr } = await supabase.from('transactions').insert({
        teacher_id: teacher.id, plan_id: planId, billing_cycle: 'manual',
        amount_paid: 0, status: 'active',
        starts_at: new Date().toISOString(), expires_at: expiresAt, notes,
      }).select().single()
      if (txnErr) throw txnErr

      await supabase.from('transactions').update({ status: 'cancelled' })
        .eq('teacher_id', teacher.id).eq('status', 'active').neq('id', txn.id)

      const { error: profileErr } = await supabase.from('profiles')
        .update({ plan: selectedPlan?.slug || 'free' }).eq('id', teacher.id)
      if (profileErr) throw new Error('Profile update failed: ' + profileErr.message)

      await logActivity(currentAdmin, 'manual_upgrade', 'teacher', teacher.id, teacher.full_name, { plan: selectedPlan?.name })
      onSave()
    } catch (err) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-500">Upgrading</p>
        <p className="text-sm font-semibold text-gray-900">{teacher.full_name}</p>
        <p className="text-xs text-gray-400">{teacher.email}</p>
      </div>
      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}
      <div><label className="label">Plan</label>
        <select className="input" value={planId} onChange={e => setPlanId(e.target.value)}>
          {plans.filter(p=>!p.is_free).map(p => (
            <option key={p.id} value={p.id}>{p.name} — ${p.price_monthly}/mo · ${p.price_yearly}/yr</option>
          ))}
        </select>
      </div>
      <div><label className="label">Expiry date <span className="text-gray-400 font-normal">(blank = 1 year)</span></label>
        <input type="datetime-local" className="input" value={customExpiry} onChange={e => setCustomExpiry(e.target.value)} /></div>
      <div><label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
        <input className="input" placeholder="e.g. Trial upgrade" value={notes} onChange={e => setNotes(e.target.value)} /></div>
      <div className="flex gap-2">
        <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
          {saving ? 'Applying...' : 'Apply upgrade'}
        </button>
      </div>
    </div>
  )
}

// ── Teacher Detail Modal ──────────────────────────────────────────────────────
function TeacherDetailModal({ teacher, currentAdmin, onClose }) {
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})

  useEffect(() => {
    supabase.from('spaces').select('id,name,subject,created_at,is_locked,lock_reason,enrollments(count)')
      .eq('teacher_id', teacher.id).order('created_at', { ascending: true })
      .then(({ data }) => { setSpaces(data || []); setLoading(false) })
  }, [teacher.id])

  async function toggleLock(space) {
    setSaving(p => ({...p, [space.id]: true}))
    const newLocked = !space.is_locked
    await supabase.from('spaces').update({
      is_locked: newLocked,
      lock_reason: newLocked ? 'Locked by admin' : null
    }).eq('id', space.id)
    await logActivity(currentAdmin, newLocked ? 'locked_space' : 'unlocked_space', 'space', space.id, space.name)
    setSpaces(p => p.map(s => s.id === space.id ? {...s, is_locked: newLocked} : s))
    setSaving(p => ({...p, [space.id]: false}))
  }

  async function deleteSpace(spaceId, spaceName) {
    if (!confirm('Delete this space permanently?')) return
    setSaving(p => ({...p, [spaceId]: true}))
    await supabase.from('spaces').delete().eq('id', spaceId)
    await logActivity(currentAdmin, 'deleted_space', 'space', spaceId, spaceName)
    setSpaces(p => p.filter(s => s.id !== spaceId))
    setSaving(p => ({...p, [spaceId]: false}))
  }

  return (
    <Modal title={`${teacher.full_name}'s spaces`} onClose={onClose}>
      <div className="mb-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 flex items-center gap-2">
        {teacher.email} · <Badge color={teacher.plan === 'free' ? 'gray' : 'blue'}>{teacher.plan}</Badge>
      </div>
      {loading ? <div className="text-center text-sm text-gray-400 py-6">Loading...</div> : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {spaces.length === 0
            ? <p className="text-center text-sm text-gray-400 py-6">No spaces created.</p>
            : spaces.map(space => (
              <div key={space.id} className={`flex items-center gap-3 p-3 rounded-xl border ${space.is_locked ? 'border-red-100 bg-red-50/30' : 'border-gray-100'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{space.name}</p>
                  <p className="text-xs text-gray-400">{space.enrollments?.[0]?.count || 0} students · {space.subject || 'No subject'}</p>
                  {space.is_locked && <p className="text-xs text-red-500 mt-0.5">{space.lock_reason}</p>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleLock(space)} disabled={saving[space.id]}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${space.is_locked ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-amber-200 text-amber-600 hover:bg-amber-50'}`}>
                    {saving[space.id] ? '...' : space.is_locked ? 'Unlock' : 'Lock'}
                  </button>
                  <button onClick={() => deleteSpace(space.id, space.name)} disabled={saving[space.id]}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 font-medium">
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </Modal>
  )
}

// ── Admin Announcement Form ───────────────────────────────────────────────────
function AdminAnnouncementForm({ plans, currentAdmin, onSave, onClose }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState('all')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const targets = [
    { value: 'all', label: 'Everyone' },
    { value: 'teachers', label: 'All teachers' },
    { value: 'students', label: 'All students' },
    ...plans.map(p => ({ value: `plan:${p.slug}`, label: `Teachers on ${p.name} plan` })),
  ]

  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    const { error: err } = await supabase.from('admin_announcements').insert({
      title: title.trim(), body: body.trim() || null, target,
    })
    if (err) { setError(err.message); setSaving(false); return }
    await logActivity(currentAdmin, 'broadcast_announcement', 'announcement', null, title, { target })
    onSave()
  }

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}
      <div><label className="label">Send to</label>
        <select className="input" value={target} onChange={e => setTarget(e.target.value)}>
          {targets.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div><label className="label">Title</label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Platform maintenance" /></div>
      <div><label className="label">Message <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea className="input min-h-[100px] resize-y" value={body} onChange={e => setBody(e.target.value)} /></div>
      <div className="flex gap-2">
        <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
          {saving ? 'Sending...' : 'Broadcast'}
        </button>
      </div>
    </div>
  )
}

// ── Main AdminPage ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [admin, setAdmin] = useState(() => getAdminSession())
  const [tab, setTab] = useState('dashboard')
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [plans, setPlans] = useState([])
  const [transactions, setTransactions] = useState([])
  const [adminAnnouncements, setAdminAnnouncements] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState({})
  const [showProfile, setShowProfile] = useState(false)
  const [editPlan, setEditPlan] = useState(null)
  const [upgradingTeacher, setUpgradingTeacher] = useState(null)
  const [showAnnouncement, setShowAnnouncement] = useState(false)
  const [viewTeacher, setViewTeacher] = useState(null)
  const activityTimer = useRef(null)

  // Inactivity timeout
  useEffect(() => {
    if (!admin) return
    function resetTimer() {
      refreshAdminActivity()
      clearTimeout(activityTimer.current)
      activityTimer.current = setTimeout(() => {
        clearAdminSession()
        setAdmin(null)
      }, 30 * 60 * 1000)
    }
    window.addEventListener('mousemove', resetTimer)
    window.addEventListener('keydown', resetTimer)
    resetTimer()
    return () => {
      window.removeEventListener('mousemove', resetTimer)
      window.removeEventListener('keydown', resetTimer)
      clearTimeout(activityTimer.current)
    }
  }, [admin])

  useEffect(() => { if (admin) { fetchAll() } }, [admin])

  // Auto-refresh every 30s
  useEffect(() => {
    if (!admin) return
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [admin])

  async function fetchAll() {
    setLoading(true)
    const [profilesRes, plansRes, txnsRes, annoRes, logRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('plans').select('*').order('sort_order'),
      supabase.from('transactions').select('*, plans(name,slug), profiles(full_name,email)').order('created_at', { ascending: false }),
      supabase.from('admin_announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(100),
    ])
    const profiles = profilesRes.data || []
    setTeachers(profiles.filter(p => p.role === 'teacher'))
    setStudents(profiles.filter(p => p.role === 'student'))
    setPlans(plansRes.data || [])
    setTransactions(txnsRes.data || [])
    setAdminAnnouncements(annoRes.data || [])
    setActivityLog(logRes.data || [])
    setLoading(false)
  }

  async function setSuspended(id, is_suspended, role) {
    setSaving(p => ({...p, [id]: true}))
    const { error } = await supabase.from('profiles').update({ is_suspended }).eq('id', id)
    if (error) { alert('Failed: ' + error.message); setSaving(p => ({...p, [id]: false})); return }
    const person = [...teachers, ...students].find(p => p.id === id)
    await logActivity(admin, is_suspended ? 'suspended_account' : 'unsuspended_account', role, id, person?.full_name)
    await fetchAll()
    setSaving(p => ({...p, [id]: false}))
  }

  function handleLogout() {
    clearAdminSession()
    setAdmin(null)
  }

  if (!admin) return <LoginScreen onLogin={setAdmin} />

  const isSuperAdmin = admin.role === 'super_admin'
  const premiumCount = teachers.filter(t => t.plan !== 'free').length
  const activeTransactions = transactions.filter(t => t.status === 'active')
  const revenue = activeTransactions.reduce((s, t) => s + (t.amount_paid || 0), 0)
  const expiringSoon = activeTransactions.filter(t => {
    const d = daysUntilExpiry(t.expires_at)
    return d !== null && d <= 7
  }).length

  const filteredTeachers = teachers.filter(t =>
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredStudents = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  )

  const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊', access: true },
    { key: 'teachers',  label: `Teachers (${teachers.length})`, icon: '👩‍🏫', access: true },
    { key: 'students',  label: `Students (${students.length})`, icon: '🎓', access: true },
    { key: 'plans',     label: 'Plans', icon: '📋', access: isSuperAdmin },
    { key: 'transactions', label: 'Transactions', icon: '💳', access: true },
    { key: 'announcements', label: 'Announcements', icon: '📣', access: true },
    { key: 'activity',  label: 'Activity log', icon: '🗒️', access: true },
    { key: 'admins',    label: 'Admins', icon: '🔐', access: isSuperAdmin },
  ].filter(t => t.access)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <div className="bg-gray-900 text-white px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Skooly" className="w-7 h-7 rounded-lg object-cover" />
          <div>
            <span className="font-semibold text-sm">Skooly Admin</span>
            <Badge color={isSuperAdmin ? 'purple' : 'blue'} className="ml-2">
              {isSuperAdmin ? 'Super Admin' : 'Admin'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <button onClick={() => setShowAnnouncement(true)}
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors hidden sm:flex items-center gap-1.5">
              📣 Broadcast
            </button>
          )}
          <button onClick={fetchAll} className="text-xs text-gray-400 hover:text-white transition-colors">↻</button>
          <button onClick={() => setShowProfile(true)}
            className="text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold">
              {admin.full_name?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
            </div>
            <span className="hidden sm:inline">{admin.full_name?.split(' ')[0]}</span>
          </button>
          <button onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Logout
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-0.5 mb-6 border-b border-gray-100 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${tab === t.key ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <span className="mr-1">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD TAB ── */}
        {tab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total teachers" value={teachers.length} />
              <StatCard label="Paid teachers" value={premiumCount} color="text-brand-600" sub={`${Math.round(premiumCount/Math.max(teachers.length,1)*100)}% conversion`} />
              <StatCard label="Total students" value={students.length} />
              <StatCard label="Expiring soon" value={expiringSoon} color={expiringSoon > 0 ? 'text-amber-600' : 'text-gray-900'} sub="within 7 days" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Recent activity */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent activity</h3>
                {activityLog.slice(0,8).length === 0 ? <p className="text-sm text-gray-400">No activity yet.</p> : (
                  <div className="space-y-2">
                    {activityLog.slice(0,8).map(log => (
                      <div key={log.id} className="flex items-start gap-2.5">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs">
                          {log.action.includes('suspend') ? '🚫' : log.action.includes('upgrade') ? '⭐' : log.action.includes('plan') ? '📋' : log.action.includes('announce') ? '📣' : '•'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700"><span className="font-medium">{log.admin_name}</span> {log.action.replace(/_/g,' ')} {log.target_name && <span className="text-gray-500">· {log.target_name}</span>}</p>
                          <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Plan breakdown */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Teachers by plan</h3>
                <div className="space-y-3">
                  {plans.map(plan => {
                    const count = teachers.filter(t => t.plan === plan.slug).length
                    const pct = Math.round(count / Math.max(teachers.length, 1) * 100)
                    return (
                      <div key={plan.id}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700">{plan.name}</span>
                          <span className="text-gray-500">{count} teachers · {pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TEACHERS TAB ── */}
        {tab === 'teachers' && (
          <div className="space-y-3">
            <input className="input w-full sm:w-64 text-sm" placeholder="Search teachers..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <div className="card overflow-hidden">
              {loading ? <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
                : filteredTeachers.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No teachers found.</div>
                : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
                        <th className="text-left px-4 py-3">Teacher</th>
                        <th className="text-left px-4 py-3">Joined</th>
                        <th className="text-center px-4 py-3">Plan</th>
                        <th className="text-center px-4 py-3">Status</th>
                        <th className="text-center px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeachers.map((t, i) => (
                        <tr key={t.id} className={`border-b border-gray-50 ${i%2===0?'':'bg-gray-50/40'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {t.avatar_url
                                ? <img src={t.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                : <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-semibold flex-shrink-0">
                                    {t.full_name?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                                  </div>}
                              <div><p className="font-medium text-gray-900">{t.full_name}</p><p className="text-xs text-gray-400">{t.email}</p></div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge color={t.plan==='free'?'gray':t.plan==='pro'?'blue':'purple'}>{t.plan}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge color={t.is_suspended?'red':'green'}>{t.is_suspended?'Suspended':'Active'}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <button onClick={() => setViewTeacher(t)}
                                className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">Spaces</button>
                              <button onClick={() => setUpgradingTeacher(t)}
                                className="text-xs px-2.5 py-1.5 rounded-lg border border-brand-200 text-brand-600 hover:bg-brand-50 font-medium">Upgrade</button>
                              <button onClick={() => setSuspended(t.id, !t.is_suspended, 'teacher')} disabled={saving[t.id]}
                                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-colors ${t.is_suspended?'border-green-200 text-green-600 hover:bg-green-50':'border-red-200 text-red-500 hover:bg-red-50'}`}>
                                {saving[t.id]?'...':t.is_suspended?'Unsuspend':'Suspend'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STUDENTS TAB ── */}
        {tab === 'students' && (
          <div className="space-y-3">
            <input className="input w-full sm:w-64 text-sm" placeholder="Search students..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <div className="card overflow-hidden">
              {loading ? <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
                : filteredStudents.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No students found.</div>
                : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
                        <th className="text-left px-4 py-3">Student</th>
                        <th className="text-left px-4 py-3">Joined</th>
                        <th className="text-center px-4 py-3">Status</th>
                        <th className="text-center px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s, i) => (
                        <tr key={s.id} className={`border-b border-gray-50 ${i%2===0?'':'bg-gray-50/40'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {s.avatar_url
                                ? <img src={s.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                : <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-xs font-semibold flex-shrink-0">
                                    {s.full_name?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                                  </div>}
                              <div><p className="font-medium text-gray-900">{s.full_name}</p><p className="text-xs text-gray-400">{s.email}</p></div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge color={s.is_suspended?'red':'green'}>{s.is_suspended?'Suspended':'Active'}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => setSuspended(s.id, !s.is_suspended, 'student')} disabled={saving[s.id]}
                              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-colors ${s.is_suspended?'border-green-200 text-green-600 hover:bg-green-50':'border-red-200 text-red-500 hover:bg-red-50'}`}>
                              {saving[s.id]?'...':s.is_suspended?'Unsuspend':'Suspend'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PLANS TAB (super admin only) ── */}
        {tab === 'plans' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setEditPlan('new')} className="btn btn-primary text-sm">+ New plan</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans.map(plan => (
                <div key={plan.id} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div><p className="font-semibold text-gray-900">{plan.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{plan.slug}</p></div>
                    <Badge color={plan.is_free?'gray':'blue'}>{plan.is_free?'Free':'Paid'}</Badge>
                  </div>
                  <div className="space-y-1 mb-4 text-sm text-gray-600">
                    <p>${plan.price_monthly}/mo · ${plan.price_yearly}/yr</p>
                    <p>{plan.max_spaces===-1?'Unlimited':plan.max_spaces} spaces</p>
                    <p>{plan.max_students===-1?'Unlimited':plan.max_students} students/space</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditPlan(plan)} className="btn btn-secondary text-xs flex-1">Edit</button>
                    {!plan.is_free && (
                      <button onClick={async () => {
                        if (!confirm('Deactivate this plan?')) return
                        await supabase.from('plans').update({ is_active: false }).eq('id', plan.id)
                        fetchAll()
                      }} className="btn btn-secondary text-xs text-red-500 hover:border-red-200">Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {tab === 'transactions' && (
          <div className="card overflow-hidden">
            {loading ? <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
              : transactions.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No transactions yet.</div>
              : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
                      <th className="text-left px-4 py-3">Teacher</th>
                      <th className="text-left px-4 py-3">Plan</th>
                      <th className="text-center px-4 py-3">Amount</th>
                      <th className="text-center px-4 py-3">Billing</th>
                      <th className="text-left px-4 py-3">Expires</th>
                      <th className="text-center px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn, i) => {
                      const days = daysUntilExpiry(txn.expires_at)
                      const soon = days !== null && days <= 7 && txn.status === 'active'
                      return (
                        <tr key={txn.id} className={`border-b border-gray-50 ${i%2===0?'':'bg-gray-50/40'}`}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{txn.profiles?.full_name}</p>
                            <p className="text-xs text-gray-400">{txn.profiles?.email}</p>
                            {txn.notes && <p className="text-xs text-gray-400 italic">{txn.notes}</p>}
                          </td>
                          <td className="px-4 py-3"><Badge color="blue">{txn.plans?.name}</Badge></td>
                          <td className="px-4 py-3 text-center font-medium">{txn.amount_paid>0?`$${txn.amount_paid}`:'Manual'}</td>
                          <td className="px-4 py-3 text-center text-xs text-gray-500">{txn.billing_cycle}</td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-gray-700">{new Date(txn.expires_at).toLocaleDateString()}</p>
                            {soon && <p className="text-xs text-amber-600 font-medium">Expires in {days}d</p>}
                            {days !== null && days < 0 && <p className="text-xs text-red-500">Expired</p>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge color={txn.status==='active'?'green':txn.status==='expired'?'red':'gray'}>{txn.status}</Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── ANNOUNCEMENTS TAB ── */}
        {tab === 'announcements' && (
          <div className="space-y-4">
            {isSuperAdmin && (
              <div className="flex justify-end">
                <button onClick={() => setShowAnnouncement(true)} className="btn btn-primary text-sm">+ New broadcast</button>
              </div>
            )}
            {adminAnnouncements.length === 0
              ? <div className="card p-8 text-center text-sm text-gray-400">No announcements sent yet.</div>
              : adminAnnouncements.map(a => (
                <div key={a.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                        <Badge color="purple">{a.target}</Badge>
                      </div>
                      {a.body && <p className="text-sm text-gray-500">{a.body}</p>}
                      <p className="text-xs text-gray-400 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ── ACTIVITY LOG TAB ── */}
        {tab === 'activity' && (
          <div className="card overflow-hidden">
            {loading ? <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
              : activityLog.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No activity yet.</div>
              : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
                      <th className="text-left px-4 py-3">Admin</th>
                      <th className="text-left px-4 py-3">Action</th>
                      <th className="text-left px-4 py-3">Target</th>
                      <th className="text-left px-4 py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLog.map((log, i) => (
                      <tr key={log.id} className={`border-b border-gray-50 ${i%2===0?'':'bg-gray-50/40'}`}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{log.admin_name || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge color={
                            log.action.includes('suspend')?'red':
                            log.action.includes('upgrade')||log.action.includes('creat')?'green':
                            log.action.includes('delet')||log.action.includes('lock')?'amber':'gray'
                          }>{log.action.replace(/_/g,' ')}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {log.target_type && <span className="capitalize">{log.target_type}</span>}
                          {log.target_name && ` · ${log.target_name}`}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── ADMINS TAB (super admin only) ── */}
        {tab === 'admins' && (
          <AdminAccountsTab currentAdmin={admin} onRefresh={fetchAll} />
        )}
      </div>

      {/* Modals */}
      {showProfile && (
        <AdminProfileModal admin={admin} onClose={() => setShowProfile(false)} onUpdated={setAdmin} />
      )}
      {(editPlan === 'new' || editPlan?.id) && (
        <Modal title={editPlan === 'new' ? 'Create plan' : `Edit ${editPlan.name}`} onClose={() => setEditPlan(null)}>
          <PlanEditor plan={editPlan === 'new' ? null : editPlan} onSave={() => { setEditPlan(null); fetchAll() }} onClose={() => setEditPlan(null)} />
        </Modal>
      )}
      {upgradingTeacher && (
        <Modal title="Manual upgrade" onClose={() => setUpgradingTeacher(null)}>
          <ManualTransactionForm teacher={upgradingTeacher} plans={plans} currentAdmin={admin} onSave={() => { setUpgradingTeacher(null); fetchAll() }} onClose={() => setUpgradingTeacher(null)} />
        </Modal>
      )}
      {showAnnouncement && (
        <Modal title="Broadcast announcement" onClose={() => setShowAnnouncement(false)}>
          <AdminAnnouncementForm plans={plans} currentAdmin={admin} onSave={() => { setShowAnnouncement(false); fetchAll() }} onClose={() => setShowAnnouncement(false)} />
        </Modal>
      )}
      {viewTeacher && (
        <TeacherDetailModal teacher={viewTeacher} currentAdmin={admin} onClose={() => setViewTeacher(null)} />
      )}
    </div>
  )
}