import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CreateContentModal from '../components/content/CreateContentModal'
import AnnouncementModal from '../components/ui/AnnouncementModal'
import { UpgradeBanner, UpgradeModal } from '../components/ui/UpgradePrompt'
import { useAuth } from '../hooks/useAuth'
import { getPlanLimits } from '../lib/planEngine'
import { getContentState, getContentStateLabel } from '../lib/contentState'

const TYPE_STYLES = {
  note:       { label: 'Note',       bg: 'bg-green-50',  text: 'text-green-700' },
  quiz:       { label: 'Quiz',       bg: 'bg-amber-50',  text: 'text-amber-700' },
  assignment: { label: 'Assignment', bg: 'bg-pink-50',   text: 'text-pink-700'  },
}

function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Delete', loading }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-700 text-center mb-6">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="btn btn-danger flex-1">
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// Progress tab — matrix of students vs scoreable content
function ProgressTab({ students, content, spaceId }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  // Only quizzes and assignments count for progress
  const scoreable = content.filter(c => c.type === 'quiz' || c.type === 'assignment')

  useEffect(() => {
    async function fetchSubmissions() {
      if (students.length === 0 || scoreable.length === 0) {
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('submissions')
        .select('student_id, content_id, score, status, submitted_at')
        .in('content_id', scoreable.map(c => c.id))
      setSubmissions(data || [])
      setLoading(false)
    }
    fetchSubmissions()
  }, [students, content])

  // Build lookup: submissionMap[student_id][content_id] = submission
  const submissionMap = {}
  submissions.forEach(s => {
    if (!submissionMap[s.student_id]) submissionMap[s.student_id] = {}
    submissionMap[s.student_id][s.content_id] = s
  })

  // Calculate overall completion % per student
  function studentCompletion(studentId) {
    if (scoreable.length === 0) return null
    const done = scoreable.filter(c => submissionMap[studentId]?.[c.id]).length
    return Math.round((done / scoreable.length) * 100)
  }

  // Calculate average score per student (quizzes + graded assignments)
  function studentAvgScore(studentId) {
    const graded = scoreable.filter(c => submissionMap[studentId]?.[c.id]?.score != null)
    if (graded.length === 0) return null
    const total = graded.reduce((sum, c) => sum + submissionMap[studentId][c.id].score, 0)
    return Math.round(total / graded.length)
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading progress...</div>

  if (students.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-gray-400">
        No students enrolled yet — progress will appear here once students join.
      </div>
    )
  }

  if (scoreable.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-gray-400">
        No quizzes or assignments yet — add some content to track progress.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Students</p>
          <p className="text-2xl font-semibold text-gray-900">{students.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Avg. completion</p>
          <p className="text-2xl font-semibold text-gray-900">
            {Math.round(students.reduce((sum, s) => sum + (studentCompletion(s.profiles.id) || 0), 0) / students.length)}%
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Avg. score</p>
          {(() => {
            const scores = students.map(s => studentAvgScore(s.profiles.id)).filter(s => s != null)
            return <p className="text-2xl font-semibold text-gray-900">
              {scores.length > 0 ? `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%` : '—'}
            </p>
          })()}
        </div>
      </div>

      {/* Progress table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 min-w-[180px]">Student</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 min-w-[80px]">Overall</th>
                {scoreable.map(c => (
                  <th key={c.id} className="text-center px-3 py-3 min-w-[100px]">
                    <div className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded ${TYPE_STYLES[c.type]?.bg} ${TYPE_STYLES[c.type]?.text}`}>
                      {TYPE_STYLES[c.type]?.label}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-normal truncate max-w-[90px] mx-auto" title={c.title}>
                      {c.title.length > 14 ? c.title.slice(0, 14) + '…' : c.title}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((enrollment, i) => {
                const studentId = enrollment.profiles.id
                const completion = studentCompletion(studentId)
                const avgScore = studentAvgScore(studentId)
                return (
                  <tr key={enrollment.id}
                    className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    {/* Student name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 text-xs font-medium flex-shrink-0">
                          {enrollment.profiles.full_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[130px]">
                          {enrollment.profiles.full_name}
                        </span>
                      </div>
                    </td>

                    {/* Overall completion + avg score */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {/* Completion bar */}
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${completion || 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{completion ?? 0}%</span>
                        {avgScore != null && (
                          <span className={`text-xs font-medium ${avgScore >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                            {avgScore}% avg
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Per-content cells */}
                    {scoreable.map(c => {
                      const sub = submissionMap[studentId]?.[c.id]
                      return (
                        <td key={c.id} className="px-3 py-3 text-center">
                          {sub ? (
                            <div className="flex flex-col items-center gap-0.5">
                              {sub.score != null ? (
                                <span className={`text-xs font-semibold ${sub.score >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                                  {sub.score}%
                                </span>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  <svg className="w-4 h-4 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  {c.type === 'assignment' && (
                                    <span className="text-xs text-gray-400">No grade</span>
                                  )}
                                </div>
                              )}
                              {sub.submitted_at && (
                                <span className="text-xs text-gray-400">
                                  {new Date(sub.submitted_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-200 text-lg">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400 px-1">
        <span className="flex items-center gap-1">
          <span className="text-green-600 font-medium">70%+</span> passing
        </span>
        <span className="flex items-center gap-1">
          <span className="text-red-500 font-medium">below 70%</span> needs attention
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          submitted
        </span>
        <span>— not submitted</span>
      </div>
    </div>
  )
}


function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return new Date(date).toLocaleDateString()
}

function AnnouncementsTab({ announcements, onRefresh }) {
  const [actionLoading, setActionLoading] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const now = new Date()

  async function togglePin(a) {
    await supabase.from('announcements').update({ is_pinned: !a.is_pinned }).eq('id', a.id)
    onRefresh()
  }

  async function deleteAnnouncement(a) {
    setConfirm({
      message: `Delete "${a.title}"? Students will no longer see this announcement.`,
      onConfirm: async () => {
        setActionLoading(true)
        await supabase.from('announcements').delete().eq('id', a.id)
        setConfirm(null)
        setActionLoading(false)
        onRefresh()
      }
    })
  }

  // Split into published and scheduled
  const published = announcements.filter(a => !a.scheduled_for || new Date(a.scheduled_for) <= now)
  const scheduled = announcements.filter(a => a.scheduled_for && new Date(a.scheduled_for) > now)

  return (
    <div className="space-y-4">
      {announcements.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-400">
          No announcements yet. Click "Announce" to send one to your students.
        </div>
      ) : (
        <>
          {/* Scheduled */}
          {scheduled.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Scheduled</h3>
              <div className="space-y-2">
                {scheduled.map(a => (
                  <AnnouncementCard key={a.id} a={a} onPin={togglePin} onDelete={deleteAnnouncement} isScheduled />
                ))}
              </div>
            </div>
          )}
          {/* Published */}
          {published.length > 0 && (
            <div>
              {scheduled.length > 0 && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Published</h3>
              )}
              <div className="space-y-2">
                {published.map(a => (
                  <AnnouncementCard key={a.id} a={a} onPin={togglePin} onDelete={deleteAnnouncement} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          loading={actionLoading}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

function AnnouncementCard({ a, onPin, onDelete, isScheduled }) {
  return (
    <div className={`card p-4 ${a.is_pinned ? 'border-amber-200 bg-amber-50/30' : ''} ${isScheduled ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {a.is_pinned && (
              <span className="badge badge-amber gap-1 text-xs">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 4v6l2 2v2h-6v6l-1 1-1-1v-6H4v-2l2-2V4h10z"/>
                </svg>
                Pinned
              </span>
            )}
            {isScheduled && (
              <span className="badge badge-gray text-xs">
                Scheduled: {new Date(a.scheduled_for).toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900">{a.title}</p>
          {a.body && <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{a.body}</p>}
          <p className="text-xs text-gray-400 mt-2">{timeAgo(a.created_at)}</p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onPin(a)} title={a.is_pinned ? 'Unpin' : 'Pin'}
            className={`p-1.5 rounded-lg transition-colors ${a.is_pinned ? 'text-amber-500 hover:bg-amber-50' : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50'}`}>
            <svg className="w-4 h-4" fill={a.is_pinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>
            </svg>
          </button>
          <button onClick={() => onDelete(a)} title="Delete"
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}


// ── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ space, joinMode, onJoinModeChange, onUpdated, onDeleted }) {
  const [name, setName] = useState(space.name)
  const [subject, setSubject] = useState(space.subject || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [joinCode, setJoinCode] = useState(space.join_code)

  async function saveSettings() {
    if (!name.trim()) { setMsg({ type: 'error', text: 'Space name is required.' }); return }
    setSaving(true); setMsg(null)
    const { error } = await supabase
      .from('spaces')
      .update({ name: name.trim(), subject: subject.trim() || null, join_mode: joinMode })
      .eq('id', space.id)
    if (error) { setMsg({ type: 'error', text: error.message }); setSaving(false); return }
    const updated = { ...space, name: name.trim(), subject: subject.trim() || null, join_mode: joinMode }
    onUpdated(updated)
    onJoinModeChange(joinMode)
    setMsg({ type: 'success', text: 'Settings saved.' })
    setSaving(false)
  }

  async function regenerateCode() {
    setRegenerating(true)
    const prefix = (subject || name).slice(0, 3).toUpperCase()
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const newCode = `${prefix}-${rand}`
    const { error } = await supabase.from('spaces').update({ join_code: newCode }).eq('id', space.id)
    if (!error) {
      setJoinCode(newCode)
      onUpdated({ ...space, join_code: newCode })
      setMsg({ type: 'success', text: 'Join code regenerated.' })
    }
    setRegenerating(false)
  }

  async function deleteSpace() {
    setDeleting(true)
    await supabase.from('spaces').delete().eq('id', space.id)
    onDeleted()
  }

  return (
    <div className="max-w-lg space-y-5 animate-fade-in">
      {msg && (
        <div className={`p-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* General settings */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">General</h3>
        <div>
          <label className="label">Space name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Year 10 Biology" />
        </div>
        <div>
          <label className="label">Subject <span className="text-gray-400 font-normal">(optional)</span></label>
          <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Biology, Maths, History" />
        </div>
        <button onClick={saveSettings} disabled={saving} className="btn btn-primary text-sm">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {/* Join settings */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Joining</h3>

        {/* Join mode */}
        <div>
          <label className="label">Join mode</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'open', label: 'Open', desc: 'Anyone with the code joins instantly' },
              { value: 'approval', label: 'Approval required', desc: 'You approve each student manually' },
            ].map(opt => (
              <button key={opt.value} type="button"
                onClick={() => onJoinModeChange(opt.value)}
                className={`text-left p-3.5 rounded-xl border-2 transition-all ${joinMode === opt.value ? 'border-brand-500 bg-brand-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <p className={`text-sm font-semibold mb-1 ${joinMode === opt.value ? 'text-brand-600' : 'text-gray-800'}`}>{opt.label}</p>
                <p className="text-xs text-gray-400 leading-snug">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Join code */}
        <div>
          <label className="label">Join code</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl font-mono text-sm font-semibold text-gray-800 tracking-widest">
              {joinCode}
            </div>
            <button onClick={regenerateCode} disabled={regenerating}
              className="btn btn-secondary text-sm gap-1.5 flex-shrink-0">
              <svg className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {regenerating ? 'Generating...' : 'Regenerate'}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">Regenerating invalidates the old code — students with the old code won't be able to join.</p>
        </div>

        <button onClick={saveSettings} disabled={saving} className="btn btn-primary text-sm">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {/* Danger zone */}
      <div className="card p-5 border-red-100">
        <h3 className="text-sm font-semibold text-red-600 mb-3">Danger zone</h3>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Delete this space</p>
            <p className="text-xs text-gray-400 mt-0.5">Permanently removes all content, quizzes, submissions and enrollments. Cannot be undone.</p>
          </div>
          <button onClick={() => setConfirmDelete(true)}
            className="btn btn-danger text-sm flex-shrink-0">
            Delete space
          </button>
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slide-up">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 text-center mb-1">Delete "{space.name}"?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">This will permanently remove all content, quizzes, and student data. This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={deleteSpace} disabled={deleting} className="btn btn-danger flex-1">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SpacePage() {
  const { spaceId } = useParams()
  const navigate = useNavigate()
  const { refreshSpaces } = useOutletContext() || {}
  const { profile, user } = useAuth()

  const [space, setSpace] = useState(null)
  const [content, setContent] = useState([])
  const [students, setStudents] = useState([])
  const [pending, setPending] = useState([])
  const [tab, setTab] = useState('content')
  const [showCreate, setShowCreate] = useState(false)
  const [showAnnouncement, setShowAnnouncement] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(null) // { title, description }
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => { fetchAll() }, [spaceId])

  async function fetchAll() {
    setLoading(true)
    const now = new Date().toISOString()
    const [spaceRes, contentRes, enrollRes, announcementsRes] = await Promise.all([
      supabase.from('spaces').select('*').eq('id', spaceId).single(),
      supabase.from('content').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }),
      supabase.from('enrollments')
        .select('id, joined_at, status, profiles(id, full_name, email)')
        .eq('space_id', spaceId)
        .order('joined_at', { ascending: true }),
      supabase.from('announcements')
        .select('*')
        .eq('space_id', spaceId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false }),
    ])
    setSpace(spaceRes.data)
    setContent(contentRes.data || [])
    const enrollments = enrollRes.data || []
    setStudents(enrollments.filter(e => e.status === 'active'))
    setPending(enrollments.filter(e => e.status === 'pending'))
    setAnnouncements(announcementsRes.data || [])
    setLoading(false)
  }

  async function copyJoinCode() {
    await navigator.clipboard.writeText(space.join_code)
    alert(`Copied! Share code "${space.join_code}" with students.`)
  }

  async function toggleJoinMode() {
    const newMode = space.join_mode === 'open' ? 'approval' : 'open'
    await supabase.from('spaces').update({ join_mode: newMode }).eq('id', spaceId)
    setSpace(prev => ({ ...prev, join_mode: newMode }))
  }

  async function approveStudent(enrollment) {
    const { data: p } = await supabase.from('profiles').select('plan').eq('id', user?.id).single()
    const { data: planData } = await supabase.from('plans').select('*').eq('slug', p?.plan || 'free').single()
    const limits = getPlanLimits(planData)
    if (students.length >= limits.max_students) {
      setShowUpgrade({ title: 'Student limit reached', description: `Your ${planData?.name || 'current'} plan allows ${planData?.max_students} students per space. Upgrade to add more.` })
      return
    }
    setActionLoading(true)
    await supabase.from('enrollments').update({ status: 'active' }).eq('id', enrollment.id)
    setPending(prev => prev.filter(e => e.id !== enrollment.id))
    setStudents(prev => [...prev, { ...enrollment, status: 'active' }])
    setActionLoading(false)
  }

  async function denyStudent(enrollment) {
    setActionLoading(true)
    await supabase.from('enrollments').delete().eq('id', enrollment.id)
    setPending(prev => prev.filter(e => e.id !== enrollment.id))
    setActionLoading(false)
  }

  async function handleRemoveStudent(enrollment) {
    setConfirm({
      message: `Remove ${enrollment.profiles?.full_name} from this space? They will lose access to all content and their submissions will be deleted.`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        setActionLoading(true)
        const contentIds = content.map(c => c.id)
        if (contentIds.length > 0) {
          await supabase.from('submissions')
            .delete()
            .eq('student_id', enrollment.profiles.id)
            .in('content_id', contentIds)
        }
        await supabase.from('enrollments').delete().eq('id', enrollment.id)
        setStudents(prev => prev.filter(s => s.id !== enrollment.id))
        setConfirm(null)
        setActionLoading(false)
      }
    })
  }

  async function handleDeleteContent(item) {
    setConfirm({
      message: `Delete "${item.title}"? This cannot be undone.`,
      onConfirm: async () => {
        setActionLoading(true)
        await supabase.from('content').delete().eq('id', item.id)
        setContent(prev => prev.filter(c => c.id !== item.id))
        setConfirm(null)
        setActionLoading(false)
      }
    })
  }

  async function handleDeleteSpace() {
    setConfirm({
      message: `Delete "${space?.name}"? This will permanently remove all content, quizzes, and student enrollments.`,
      confirmLabel: 'Delete space',
      onConfirm: async () => {
        setActionLoading(true)
        await supabase.from('spaces').delete().eq('id', spaceId)
        refreshSpaces?.()
        navigate('/teacher')
      }
    })
  }

  // Determine if this space is locked (free plan, not in first 3 spaces)
  const [spaceIsLocked, setSpaceIsLocked] = useState(false)

  useEffect(() => {
    async function checkLock() {
      const { data: p } = await supabase.from('profiles').select('plan').eq('id', user?.id).single()
      if (p?.plan === 'premium') { setSpaceIsLocked(false); return }
      // Get all spaces ordered by created_at to find position
      const { data: allSpaces } = await supabase
        .from('spaces')
        .select('id')
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: true })
      const idx = (allSpaces || []).findIndex(s => s.id === spaceId)
      setSpaceIsLocked(idx >= 3)
    }
    if (user && spaceId) checkLock()
  }, [spaceId, user])

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading...</div>
  if (!space) return <div className="p-6 text-sm text-red-500">Space not found.</div>

  // Check admin lock first — blocks everything
  if (space?.is_locked) {
    return (
      <div className="p-6 max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">This space has been locked</h2>
        <p className="text-sm text-gray-500 mb-2">
          {space.lock_reason || 'This space has been locked by an administrator.'}
        </p>
        <p className="text-sm text-gray-400 mb-6">Please contact the Skooly admin team to resolve this.</p>
        <Link to="/teacher" className="btn btn-secondary">Back to dashboard</Link>
      </div>
    )
  }

  // Check plan lock (free plan, beyond space limit)
  if (spaceIsLocked) {
    return (
      <div className="p-6 max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">This space is locked</h2>
        <p className="text-sm text-gray-500 mb-6">You've exceeded your plan's space limit. Upgrade to unlock all your spaces.</p>
        <div className="flex gap-3">
          <Link to="/teacher/upgrade" className="btn btn-primary">Upgrade plan</Link>
          <Link to="/teacher/subscription" className="btn btn-secondary">Manage subscription</Link>
        </div>
      </div>
    )
  }

  const TABS = [
    { key: 'content',       label: `Content (${content.length})` },
    { key: 'progress',      label: 'Progress' },
    { key: 'announcements', label: `Announcements (${announcements.length})` },
    { key: 'students',      label: `Students (${students.length})` },
    { key: 'pending',       label: pending.length > 0 ? `Pending (${pending.length})` : 'Pending' },
    { key: 'settings',      label: 'Settings' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-8">

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">{space.name}</h1>
            {space.subject && <p className="text-sm text-gray-400 mt-0.5">{space.subject}</p>}
          </div>
          {/* Delete — icon only, always visible */}
          <button onClick={handleDeleteSpace}
            className="btn btn-secondary text-sm text-red-400 hover:text-red-600 hover:border-red-200 flex-shrink-0 p-2" title="Delete space">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        {/* Action row — scrollable on small screens */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={copyJoinCode} className="btn btn-secondary text-xs gap-1.5 flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {space.join_code}
          </button>
          <button onClick={() => setShowAnnouncement(true)} className="btn btn-secondary text-sm gap-1.5 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <span className="hidden sm:inline">Announce</span>
          </button>
          <button onClick={async () => {
            const { data: p } = await supabase.from('profiles').select('plan').eq('id', user?.id).single()
            const { data: planData } = await supabase.from('plans').select('*').eq('slug', p?.plan || 'free').single()
            setShowCreate(true)
          }} className="btn btn-primary text-sm flex-shrink-0">
            + Add content
          </button>
        </div>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="flex gap-0 border-b border-gray-100 mb-5 overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px relative flex-shrink-0 ${tab === t.key ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
            {t.key === 'pending' && pending.length > 0 && (
              <span className="ml-1 w-2 h-2 bg-amber-400 rounded-full inline-block align-middle" />
            )}
          </button>
        ))}
      </div>

      {/* Content tab */}
      {tab === 'content' && (
        <div className="space-y-2">
          {content.length === 0 ? (
            <div className="card p-8 text-center text-sm text-gray-400">
              No content yet. Click "Add content" to create notes, quizzes, or assignments.
            </div>
          ) : content.map(item => {
            const style = TYPE_STYLES[item.type] || TYPE_STYLES.note
            const state = getContentState(item)
            const stateLabel = getContentStateLabel(item)
            return (
              <div key={item.id} className="card p-4 flex items-center gap-3 group">
                <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
                <Link to={`/teacher/spaces/${spaceId}/content/${item.id}`}
                  className="text-sm font-medium text-gray-800 hover:text-brand-500 transition-colors flex-1 truncate">
                  {item.title}
                </Link>
                {item.due_at && (
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    Due {new Date(item.due_at).toLocaleDateString()}
                  </span>
                )}
                <button onClick={() => handleDeleteContent(item)}
                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 p-1 rounded">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Progress tab */}
      {tab === 'progress' && (
        <ProgressTab students={students} content={content} spaceId={spaceId} />
      )}

      {/* Announcements tab */}
      {tab === 'announcements' && (
        <AnnouncementsTab
          announcements={announcements}
          onRefresh={fetchAll}
        />
      )}

      {/* Students tab */}
      {tab === 'students' && (
        <div className="space-y-3">
          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Join mode</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {space.join_mode === 'open' ? 'Anyone with the code can join instantly' : 'Students must wait for your approval'}
              </p>
            </div>
            <button onClick={toggleJoinMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${space.join_mode === 'open' ? 'bg-brand-500' : 'bg-gray-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${space.join_mode === 'open' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {students.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-gray-500 mb-1">No active students yet.</p>
              <p className="text-xs text-gray-400">Share code <span className="font-mono font-medium text-gray-600">{space.join_code}</span></p>
            </div>
          ) : students.map(enrollment => (
            <div key={enrollment.id} className="card p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 text-xs font-medium flex-shrink-0">
                {enrollment.profiles?.full_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{enrollment.profiles?.full_name}</p>
                <p className="text-xs text-gray-400">{enrollment.profiles?.email}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                Joined {new Date(enrollment.joined_at).toLocaleDateString()}
              </span>
              <button onClick={() => handleRemoveStudent(enrollment)}
                className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6h12a6 6 0 00-6-6zM21 12h-6" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending tab */}
      {tab === 'pending' && (
        <div className="space-y-3">
          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Join mode</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {space.join_mode === 'open' ? 'Anyone with the code can join instantly' : 'Students must wait for your approval'}
              </p>
            </div>
            <button onClick={toggleJoinMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${space.join_mode === 'open' ? 'bg-brand-500' : 'bg-gray-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${space.join_mode === 'open' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {pending.length === 0 ? (
            <div className="card p-8 text-center text-sm text-gray-400">No pending requests.</div>
          ) : pending.map(enrollment => (
            <div key={enrollment.id} className="card p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 text-xs font-medium flex-shrink-0">
                {enrollment.profiles?.full_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{enrollment.profiles?.full_name}</p>
                <p className="text-xs text-gray-400">{enrollment.profiles?.email}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                Requested {new Date(enrollment.joined_at).toLocaleDateString()}
              </span>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => denyStudent(enrollment)} disabled={actionLoading}
                  className="btn btn-secondary text-xs text-red-500 hover:border-red-200 px-3 py-1.5">Deny</button>
                <button onClick={() => approveStudent(enrollment)} disabled={actionLoading}
                  className="btn btn-primary text-xs px-3 py-1.5">Approve</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings tab */}
      {tab === 'settings' && (
        <SettingsTab
          space={space}
          joinMode={space.join_mode || 'open'}
          onJoinModeChange={(mode) => setSpace(prev => ({ ...prev, join_mode: mode }))}
          onUpdated={(updated) => { setSpace(updated); refreshSpaces?.() }}
          onDeleted={() => { refreshSpaces?.(); navigate('/teacher') }}
        />
      )}

      {showUpgrade && (
        <UpgradeModal
          title={showUpgrade.title}
          description={showUpgrade.description}
          onClose={() => setShowUpgrade(null)}
        />
      )}

      {showAnnouncement && (
        <AnnouncementModal
          spaceId={spaceId}
          onClose={() => setShowAnnouncement(false)}
          onCreated={() => { fetchAll(); setShowAnnouncement(false) }}
        />
      )}

      {showCreate && (
        <CreateContentModal
          spaceId={spaceId}
          onClose={() => setShowCreate(false)}
          onCreated={() => { fetchAll(); setShowCreate(false) }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          confirmLabel={confirm.confirmLabel || 'Delete'}
          loading={actionLoading}
          onConfirm={confirm.onConfirm}
          onCancel={() => { setConfirm(null); setActionLoading(false) }}
        />
      )}
    </div>
  )
}