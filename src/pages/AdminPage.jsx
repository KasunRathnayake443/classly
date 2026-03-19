import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const SECRET_KEY = 'skooly-admin-2024'

function StatCard({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('teachers')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState({})

  function handleLogin(e) {
    e.preventDefault()
    if (password === SECRET_KEY) { setAuthed(true); fetchAll() }
    else setError('Incorrect password.')
  }

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setTeachers((data || []).filter(p => p.role === 'teacher'))
    setStudents((data || []).filter(p => p.role === 'student'))
    setLoading(false)
  }

  async function setPlan(id, plan) {
    setSaving(prev => ({ ...prev, [id]: true }))
    await supabase.from('profiles').update({ plan }).eq('id', id)
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, plan } : t))
    setSaving(prev => ({ ...prev, [id]: false }))
  }

  async function setSuspended(id, is_suspended, role) {
    setSaving(prev => ({ ...prev, [id]: true }))
    await supabase.from('profiles').update({ is_suspended }).eq('id', id)
    if (role === 'teacher') setTeachers(prev => prev.map(t => t.id === id ? { ...t, is_suspended } : t))
    else setStudents(prev => prev.map(s => s.id === id ? { ...s, is_suspended } : s))
    setSaving(prev => ({ ...prev, [id]: false }))
  }

  const filteredTeachers = teachers.filter(t =>
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredStudents = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Skooly Admin</h1>
            <p className="text-sm text-gray-500 mt-1">Enter your admin password</p>
          </div>
          <div className="card p-6">
            {error && <div className="mb-3 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Password</label>
                <input type="password" className="input" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} autoFocus />
              </div>
              <button type="submit" className="btn btn-primary w-full" style={{ background: '#111827', borderColor: '#111827' }}>
                Enter admin panel
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const premiumCount = teachers.filter(t => t.plan === 'premium').length
  const suspendedCount = [...teachers, ...students].filter(p => p.is_suspended).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin topbar */}
      <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <span className="font-semibold text-sm">Skooly Admin</span>
        </div>
        <button onClick={fetchAll} className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total teachers" value={teachers.length} />
          <StatCard label="Premium teachers" value={premiumCount} color="text-brand-600" />
          <StatCard label="Total students" value={students.length} />
          <StatCard label="Suspended accounts" value={suspendedCount} color={suspendedCount > 0 ? 'text-red-600' : 'text-gray-900'} />
        </div>

        {/* Search + tabs */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex gap-1 border-b border-gray-100">
            {[
              { key: 'teachers', label: `Teachers (${teachers.length})` },
              { key: 'students', label: `Students (${students.length})` },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.key ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <input className="input ml-auto w-56 text-sm py-2" placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Teachers table */}
        {tab === 'teachers' && (
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
            ) : filteredTeachers.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No teachers found.</div>
            ) : (
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
                      <tr key={t.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {t.avatar_url ? (
                              <img src={t.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-semibold flex-shrink-0">
                                {t.full_name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{t.full_name}</p>
                              <p className="text-xs text-gray-400">{t.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(t.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`badge ${t.plan === 'premium' ? 'badge-blue' : 'badge-gray'}`}>
                            {t.plan === 'premium' ? '⭐ Premium' : 'Basic'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`badge ${t.is_suspended ? 'badge-red' : 'badge-green'}`}>
                            {t.is_suspended ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {/* Toggle plan */}
                            <button
                              onClick={() => setPlan(t.id, t.plan === 'premium' ? 'free' : 'premium')}
                              disabled={saving[t.id]}
                              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
                                t.plan === 'premium'
                                  ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                  : 'border-brand-200 text-brand-600 hover:bg-brand-50'
                              }`}>
                              {saving[t.id] ? '...' : t.plan === 'premium' ? 'Set free' : 'Set premium'}
                            </button>
                            {/* Toggle suspend */}
                            <button
                              onClick={() => setSuspended(t.id, !t.is_suspended, 'teacher')}
                              disabled={saving[t.id]}
                              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
                                t.is_suspended
                                  ? 'border-green-200 text-green-600 hover:bg-green-50'
                                  : 'border-red-200 text-red-500 hover:bg-red-50'
                              }`}>
                              {saving[t.id] ? '...' : t.is_suspended ? 'Unsuspend' : 'Suspend'}
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
        )}

        {/* Students table */}
        {tab === 'students' && (
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No students found.</div>
            ) : (
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
                      <tr key={s.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {s.avatar_url ? (
                              <img src={s.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-xs font-semibold flex-shrink-0">
                                {s.full_name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{s.full_name}</p>
                              <p className="text-xs text-gray-400">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(s.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`badge ${s.is_suspended ? 'badge-red' : 'badge-green'}`}>
                            {s.is_suspended ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSuspended(s.id, !s.is_suspended, 'student')}
                            disabled={saving[s.id]}
                            className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
                              s.is_suspended
                                ? 'border-green-200 text-green-600 hover:bg-green-50'
                                : 'border-red-200 text-red-500 hover:bg-red-50'
                            }`}>
                            {saving[s.id] ? '...' : s.is_suspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
