import { useEffect, useState, useRef } from 'react'
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
const CLASS_COLORS = ['#4F46E5','#059669','#D97706','#DB2777','#0891B2','#7C3AED','#DC2626','#EA580C','#0D9488','#4338CA','#9333EA','#0284C7']
const CLASS_ICONS = ['📚','🔬','🧮','🎨','🌍','⚗️','📖','🎭','🏛️','💻','🎵','🏃','🌿','🔭','✏️','🧬']

function SettingsTab({ space, joinMode, onJoinModeChange, onUpdated, onDeleted }) {
  const [name, setName] = useState(space.name)
  const [subject, setSubject] = useState(space.subject || '')
  const [description, setDescription] = useState(space.description || '')
  const [teacherDisplayName, setTeacherDisplayName] = useState(space.teacher_display_name || '')
  const [coverColor, setCoverColor] = useState(space.cover_color || '#4F46E5')
  const [icon, setIcon] = useState(space.icon || '📚')
  const [coverImageUrl, setCoverImageUrl] = useState(space.cover_image_url || '')
  const [coverMode, setCoverMode] = useState(space.cover_image_url ? 'image' : 'color')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [joinCode, setJoinCode] = useState(space.join_code)
  const imageInputRef = useRef(null)

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setMsg({ type: 'error', text: 'Image must be under 5MB.' }); return }
    if (!file.type.startsWith('image/')) { setMsg({ type: 'error', text: 'Please select an image file.' }); return }
    setUploadingImage(true)
    setMsg(null)
    try {
      const ext = file.name.split('.').pop()
      const path = `space-covers/${space.id}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${urlData.publicUrl}?t=${Date.now()}`
      setCoverImageUrl(url)
      setCoverMode('image')
      setMsg({ type: 'success', text: 'Image uploaded — click Save appearance to apply.' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Upload failed.' })
    } finally {
      setUploadingImage(false)
    }
  }

  async function saveSettings() {
    if (!name.trim()) { setMsg({ type: 'error', text: 'Class name is required.' }); return }
    setSaving(true); setMsg(null)
    const { error } = await supabase.from('spaces').update({
      name: name.trim(),
      subject: subject.trim() || null,
      description: description.trim() || null,
      teacher_display_name: teacherDisplayName.trim() || null,
      cover_color: coverColor,
      icon,
      cover_image_url: coverMode === 'image' ? coverImageUrl || null : null,
      join_mode: joinMode,
    }).eq('id', space.id)
    if (error) { setMsg({ type: 'error', text: error.message }); setSaving(false); return }
    const updated = {
      ...space,
      name: name.trim(),
      subject: subject.trim() || null,
      description: description.trim() || null,
      teacher_display_name: teacherDisplayName.trim() || null,
      cover_color: coverColor,
      icon,
      cover_image_url: coverMode === 'image' ? coverImageUrl || null : null,
      join_mode: joinMode,
    }
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
    if (!error) { setJoinCode(newCode); onUpdated({ ...space, join_code: newCode }); setMsg({ type: 'success', text: 'Join code regenerated.' }) }
    setRegenerating(false)
  }

  async function deleteSpace() {
    setDeleting(true)
    await supabase.from('spaces').delete().eq('id', space.id)
    onDeleted()
  }

  // Live banner preview
  const bannerBg = coverMode === 'image' && coverImageUrl
    ? { backgroundImage: `url(${coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: coverColor }

  return (
    <div className="max-w-lg space-y-5 animate-fade-in">
      {msg && (
        <div className={`p-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* Live preview banner */}
      <div className="h-24 rounded-2xl flex items-end px-5 pb-4 transition-all relative overflow-hidden" style={bannerBg}>
        {coverMode === 'image' && coverImageUrl && (
          <div className="absolute inset-0 bg-black/30" />
        )}
        <div className="flex items-end gap-3 w-full relative z-10">
          <span className="text-4xl drop-shadow">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-xl leading-tight truncate drop-shadow">{name || 'Class name'}</p>
            <p className="text-white/75 text-sm drop-shadow">{subject || 'Subject'}</p>
          </div>
        </div>
      </div>

      {/* General */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">General</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Class name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Year 10 Biology" />
          </div>
          <div>
            <label className="label">Subject <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Biology" />
          </div>
        </div>
        <div>
          <label className="label">Description <span className="text-gray-400 font-normal">(students see this)</span></label>
          <textarea className="input resize-none" rows={2} value={description}
            onChange={e => setDescription(e.target.value)} placeholder="Welcome message or class overview..." />
        </div>
        <div>
          <label className="label">Your display name <span className="text-gray-400 font-normal">(e.g. Mr. Silva)</span></label>
          <input className="input" value={teacherDisplayName}
            onChange={e => setTeacherDisplayName(e.target.value)} placeholder="How students see your name in this class" />
        </div>
        <button onClick={saveSettings} disabled={saving} className="btn btn-primary text-sm">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {/* Appearance */}
      <div className="card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-gray-700">Appearance</h3>

        {/* Icon */}
        <div>
          <label className="label">Icon</label>
          <div className="flex flex-wrap gap-2">
            {CLASS_ICONS.map(ic => (
              <button key={ic} type="button" onClick={() => setIcon(ic)}
                className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${icon === ic ? 'ring-2 ring-brand-500 ring-offset-1 scale-110' : 'hover:bg-gray-100'}`}>
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Cover mode toggle */}
        <div>
          <label className="label">Cover style</label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { key: 'color', label: '🎨 Color', desc: 'Pick a solid color' },
              { key: 'image', label: '🖼️ Image', desc: 'Upload a photo' },
            ].map(opt => (
              <button key={opt.key} type="button" onClick={() => setCoverMode(opt.key)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${coverMode === opt.key ? 'border-brand-500 bg-brand-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <p className={`text-sm font-semibold ${coverMode === opt.key ? 'text-brand-600' : 'text-gray-700'}`}>{opt.label}</p>
                <p className="text-xs text-gray-400">{opt.desc}</p>
              </button>
            ))}
          </div>

          {/* Color picker */}
          {coverMode === 'color' && (
            <div className="flex flex-wrap gap-2">
              {CLASS_COLORS.map(color => (
                <button key={color} type="button" onClick={() => setCoverColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${coverColor === color ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                  style={{ background: color, outlineColor: color }} />
              ))}
            </div>
          )}

          {/* Image upload */}
          {coverMode === 'image' && (
            <div className="space-y-3">
              <div
                onClick={() => imageInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${coverImageUrl ? 'border-brand-200 bg-brand-50/30' : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/20'}`}>
                {coverImageUrl ? (
                  <div className="space-y-2">
                    <img src={coverImageUrl} alt="Cover preview" className="h-20 w-full object-cover rounded-lg" />
                    <p className="text-xs text-brand-600 font-medium">Click to change image</p>
                  </div>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <p className="text-sm text-gray-500">{uploadingImage ? 'Uploading...' : 'Click to upload cover image'}</p>
                  </>
                )}
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

              {/* Resolution guide */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 space-y-1">
                <p className="font-semibold">📐 Best image size</p>
                <p>Recommended: <span className="font-medium">1200 × 300px</span> (4:1 ratio)</p>
                <p>Minimum: 600 × 150px · Max file size: 5MB</p>
                <p className="text-blue-500">JPG or PNG works best. The image will be center-cropped to fit the banner.</p>
              </div>

              {coverImageUrl && (
                <button type="button" onClick={() => { setCoverImageUrl(''); setCoverMode('color') }}
                  className="text-xs text-red-400 hover:text-red-600 font-medium">
                  Remove image — use color instead
                </button>
              )}
            </div>
          )}
        </div>

        <button onClick={saveSettings} disabled={saving || uploadingImage} className="btn btn-primary text-sm">
          {saving ? 'Saving...' : 'Save appearance'}
        </button>
      </div>

      {/* Joining */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Joining</h3>
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
        <div>
          <label className="label">Join code</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl font-mono text-sm font-semibold text-gray-800 tracking-widest">
              {joinCode}
            </div>
            <button onClick={regenerateCode} disabled={regenerating} className="btn btn-secondary text-sm gap-1.5 flex-shrink-0">
              <svg className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {regenerating ? 'Generating...' : 'Regenerate'}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">Regenerating invalidates the old code.</p>
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
            <p className="text-sm font-medium text-gray-800">Delete this class</p>
            <p className="text-xs text-gray-400 mt-0.5">Permanently removes all content, quizzes, submissions and enrollments. Cannot be undone.</p>
          </div>
          <button onClick={() => setConfirmDelete(true)} className="btn btn-danger text-sm flex-shrink-0">Delete class</button>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slide-up">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 text-center mb-1">Delete "{space.name}"?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">This will permanently remove all content, quizzes, and student data.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={deleteSpace} disabled={deleting} className="btn btn-danger flex-1">{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ── Copy Content Modal ────────────────────────────────────────────────────────
function CopyContentModal({ item, currentSpaceId, teacherId, onCopy, onClose }) {
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(null) // space name it was copied to
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchSpaces() {
      const { data } = await supabase
        .from('spaces')
        .select('id, name, subject, icon, cover_color')
        .neq('id', currentSpaceId)
        .order('created_at', { ascending: true })
      setSpaces(data || [])
      setLoading(false)
    }
    fetchSpaces()
  }, [])

  async function handleCopy(targetSpace) {
    setCopying(targetSpace.id)
    setError('')
    const result = await onCopy(item, targetSpace.id)
    if (result.success) {
      setCopied(targetSpace.name)
      setCopying(false)
    } else {
      setError(result.error || 'Failed to copy.')
      setCopying(false)
    }
  }

  const typeStyle = TYPE_STYLES[item.type] || TYPE_STYLES.note

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Copy to another class</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeStyle.bg} ${typeStyle.text}`}>
                {typeStyle.label}
              </span>
              <span className="text-xs text-gray-500 truncate max-w-[200px]">{item.title}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-4">
          {copied ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Copied successfully!</p>
              <p className="text-xs text-gray-500 mb-4">"{item.title} (copy)" added to <span className="font-medium">{copied}</span></p>
              <button onClick={onClose} className="btn btn-primary text-sm">Done</button>
            </div>
          ) : loading ? (
            <div className="space-y-2 py-2">
              {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl"/>)}
            </div>
          ) : spaces.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-1">No other classes found.</p>
              <p className="text-xs text-gray-400">Create another class first to copy content into it.</p>
            </div>
          ) : (
            <>
              {error && <p className="text-xs text-red-600 mb-3 p-2 bg-red-50 rounded-lg">{error}</p>}
              <p className="text-xs text-gray-500 mb-3">Select a class to copy this {item.type} into:</p>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {spaces.map(space => (
                  <button key={space.id}
                    onClick={() => handleCopy(space)}
                    disabled={!!copying}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all text-left disabled:opacity-50">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
                      style={{ background: space.cover_color || '#4F46E5' }}>
                      {space.icon || '📚'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{space.name}</p>
                      <p className="text-xs text-gray-400">{space.subject || 'No subject'}</p>
                    </div>
                    {copying === space.id ? (
                      <svg className="w-4 h-4 text-brand-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SpacePage() {
  const { spaceId } = useParams()
  const navigate = useNavigate()
  const { refreshSpaces } = useOutletContext() || {}
  const { profile, user, subscription } = useAuth()

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
  const [search, setSearch] = useState('')
  const [copyItem, setCopyItem] = useState(null) // item being copied

  useEffect(() => { fetchAll() }, [spaceId])

  async function fetchAll() {
    setLoading(true)
    // Single RPC replaces 4 parallel queries — one round trip
    const { data, error } = await supabase.rpc('get_space_data', { p_space_id: spaceId })
    if (error || !data) { setLoading(false); return }
    setSpace(data.space)
    setContent(data.content || [])
    const enrollments = data.enrollments || []
    setStudents(enrollments.filter(e => e.status === 'active'))
    setPending(enrollments.filter(e => e.status === 'pending'))
    setAnnouncements(data.announcements || [])
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
    const limits = getPlanLimits(subscription?.plan)
    if (limits.max_students !== Infinity && students.length >= limits.max_students) {
      setShowUpgrade({ title: 'Student limit reached', description: `Your ${subscription?.plan?.name || 'current'} plan allows ${subscription?.plan?.max_students} students per class. Upgrade to add more.` })
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

  async function handleCopyContent(item) {
    setCopyItem(item)
  }

  async function doCopyContent(item, targetSpaceId) {
    try {
      // Insert content into target space
      const { data: newContent, error: contentErr } = await supabase
        .from('content')
        .insert({
          space_id: targetSpaceId,
          type: item.type,
          title: item.title + ' (copy)',
          body: item.body,
          due_at: null, // don't copy dates
          available_from: null,
          available_until: null,
        })
        .select().single()
      if (contentErr) throw contentErr

      // Copy quiz questions if applicable
      if (item.type === 'quiz') {
        const { data: questions } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('content_id', item.id)
          .order('order_index', { ascending: true })
        if (questions?.length > 0) {
          await supabase.from('quiz_questions').insert(
            questions.map(q => ({
              content_id: newContent.id,
              question: q.question,
              options: q.options,
              correct_answer: q.correct_answer,
              order_index: q.order_index,
            }))
          )
        }
      }
      setCopyItem(null)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async function handleDeleteSpace() {
    setConfirm({
      message: `Delete "${space?.name}"? This will permanently remove all content, quizzes, and student enrollments.`,
      confirmLabel: 'Delete class',
      onConfirm: async () => {
        setActionLoading(true)
        await supabase.from('spaces').delete().eq('id', spaceId)
        refreshSpaces?.()
        navigate('/teacher')
      }
    })
  }

  // Determine if this space is plan-locked
  // Uses subscription already cached in useAuth — zero extra queries
  const [spaceIsLocked, setSpaceIsLocked] = useState(false)

  useEffect(() => {
    async function checkLock() {
      if (!user || !spaceId) return
      const limits = getPlanLimits(subscription?.plan)
      if (limits.max_spaces === Infinity) { setSpaceIsLocked(false); return }

      const { data: allSpaces } = await supabase
        .from('spaces')
        .select('id')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: true })

      const idx = (allSpaces || []).findIndex(s => s.id === spaceId)
      setSpaceIsLocked(idx >= limits.max_spaces)
    }
    checkLock()
  }, [spaceId, user, subscription])

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
        <h2 className="text-lg font-semibold text-gray-800 mb-2">This class has been locked</h2>
        <p className="text-sm text-gray-500 mb-2">
          {space.lock_reason || 'This class has been locked by an administrator.'}
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
        <h2 className="text-lg font-semibold text-gray-800 mb-2">This class is locked</h2>
        <p className="text-sm text-gray-500 mb-6">You've exceeded your plan's space limit. Upgrade to unlock all your spaces.</p>
        <div className="flex gap-3">
          <Link to="/teacher/upgrade" className="btn btn-primary">Upgrade plan</Link>
          <Link to="/teacher/subscription" className="btn btn-secondary">Manage subscription</Link>
        </div>
      </div>
    )
  }

  const filteredContent = search.trim()
    ? content.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : content

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
            className="btn btn-secondary text-sm text-red-400 hover:text-red-600 hover:border-red-200 flex-shrink-0 p-2" title="Delete class">
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
          <button onClick={() => setShowCreate(true)} className="btn btn-primary text-sm flex-shrink-0">
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
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              placeholder="Search content..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 pr-9 py-2 text-sm w-full"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
          <div className="space-y-2">
          {content.length === 0 ? (
            <div className="card p-8 text-center text-sm text-gray-400">
              No content yet. Click "Add content" to create notes, quizzes, or assignments.
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="card p-8 text-center text-sm text-gray-400">
              No content matches "{search}"
            </div>
          ) : filteredContent.map(item => {
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
                <button onClick={() => handleCopyContent(item)} title="Copy to another class"
                  className="text-gray-300 hover:text-brand-500 transition-colors flex-shrink-0 p-1 rounded">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                </button>
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

      {copyItem && (
        <CopyContentModal
          item={copyItem}
          currentSpaceId={spaceId}
          teacherId={user?.id}
          onCopy={doCopyContent}
          onClose={() => setCopyItem(null)}
        />
      )}
    </div>
  )
}