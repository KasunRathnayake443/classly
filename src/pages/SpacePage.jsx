import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CreateContentModal from '../components/content/CreateContentModal'

const TYPE_STYLES = {
  note:       { label: 'Note',       bg: 'bg-green-50',  text: 'text-green-700' },
  quiz:       { label: 'Quiz',       bg: 'bg-amber-50',  text: 'text-amber-700' },
  assignment: { label: 'Assignment', bg: 'bg-pink-50',   text: 'text-pink-700'  },
}

export default function SpacePage() {
  const { spaceId } = useParams()
  const [space, setSpace] = useState(null)
  const [content, setContent] = useState([])
  const [students, setStudents] = useState([])
  const [tab, setTab] = useState('content') // 'content' | 'students'
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [spaceId])

  async function fetchAll() {
    setLoading(true)
    const [spaceRes, contentRes, studentsRes] = await Promise.all([
      supabase.from('spaces').select('*').eq('id', spaceId).single(),
      supabase.from('content').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }),
      supabase.from('enrollments')
        .select('id, joined_at, profiles(id, full_name, email)')
        .eq('space_id', spaceId),
    ])
    setSpace(spaceRes.data)
    setContent(contentRes.data || [])
    setStudents(studentsRes.data || [])
    setLoading(false)
  }

  async function copyJoinCode() {
    await navigator.clipboard.writeText(space.join_code)
    alert(`Copied! Share code "${space.join_code}" with students.`)
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading...</div>
  if (!space) return <div className="p-6 text-sm text-red-500">Space not found.</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{space.name}</h1>
          {space.subject && <p className="text-sm text-gray-400 mt-0.5">{space.subject}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyJoinCode}
            className="btn btn-secondary text-xs gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {space.join_code}
          </button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary text-sm">
            + Add content
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Students</p><p className="text-2xl font-semibold">{students.length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Content items</p><p className="text-2xl font-semibold">{content.length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Quizzes</p><p className="text-2xl font-semibold">{content.filter(c => c.type === 'quiz').length}</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100 mb-4">
        {['content', 'students'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
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
            return (
              <Link key={item.id} to={`/spaces/${spaceId}/content/${item.id}`}
                className="card p-4 flex items-center gap-3 hover:border-brand-100 hover:shadow-sm transition-all group">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
                <span className="text-sm font-medium text-gray-800 group-hover:text-brand-500 transition-colors flex-1">
                  {item.title}
                </span>
                {item.due_at && (
                  <span className="text-xs text-gray-400">
                    Due {new Date(item.due_at).toLocaleDateString()}
                  </span>
                )}
                <svg className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )
          })}
        </div>
      )}

      {/* Students tab */}
      {tab === 'students' && (
        <div className="space-y-2">
          {students.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-gray-500 mb-2">No students enrolled yet.</p>
              <p className="text-xs text-gray-400">
                Share the join code <span className="font-mono font-medium text-gray-600">{space.join_code}</span> with your students.
              </p>
            </div>
          ) : students.map(enrollment => (
            <div key={enrollment.id} className="card p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 text-xs font-medium flex-shrink-0">
                {enrollment.profiles?.full_name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{enrollment.profiles?.full_name}</p>
                <p className="text-xs text-gray-400">{enrollment.profiles?.email}</p>
              </div>
              <span className="ml-auto text-xs text-gray-400">
                Joined {new Date(enrollment.joined_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateContentModal
          spaceId={spaceId}
          onClose={() => setShowCreate(false)}
          onCreated={() => { fetchAll(); setShowCreate(false) }}
        />
      )}
    </div>
  )
}
