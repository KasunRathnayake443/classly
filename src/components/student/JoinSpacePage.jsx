import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

export default function JoinSpacePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const context = useOutletContext()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null) // space name if waiting for approval

  async function handleJoin(e) {
    e.preventDefault()
    setError('')
    setPending(null)
    setLoading(true)

    try {
      const cleanCode = code.trim().toUpperCase()

      // Find the space using a security definer function (bypasses RLS for join code lookup)
      const { data: spaces, error: spaceErr } = await supabase
        .rpc('find_space_by_code', { code: cleanCode })

      const space = spaces?.[0]

      if (spaceErr || !space) {
        setError('Invalid join code. Please check and try again.')
        setLoading(false)
        return
      }

      // Check if already enrolled or pending
      const { data: existing } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('space_id', space.id)
        .eq('student_id', user.id)
        .single()

      if (existing) {
        if (existing.status === 'pending') {
          setPending(space.name)
          setLoading(false)
          return
        }
        setError(`You are already enrolled in "${space.name}".`)
        setLoading(false)
        return
      }

      // Enroll — status depends on join_mode
      const status = space.join_mode === 'approval' ? 'pending' : 'active'
      const { error: enrollErr } = await supabase
        .from('enrollments')
        .insert({ space_id: space.id, student_id: user.id, status })

      if (enrollErr) throw enrollErr

      if (status === 'pending') {
        setPending(space.name)
      } else {
        context?.refreshEnrollments?.()
        navigate(`/student/spaces/${space.id}`)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Pending approval screen
  if (pending) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="card p-8 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Waiting for approval</h2>
          <p className="text-sm text-gray-500 mb-1">
            Your request to join <span className="font-medium text-gray-700">"{pending}"</span> has been sent.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Your teacher will approve your request shortly.
          </p>
          <button onClick={() => { setPending(null); setCode('') }} className="btn btn-secondary w-full">
            Join another class
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Join a class</h1>
        <p className="text-sm text-gray-500 mt-1">Enter the code your teacher gave you</p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleJoin} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg">{error}</div>
          )}
          <div>
            <label className="label">Class code</label>
            <input
              className="input text-center text-lg font-mono tracking-widest uppercase"
              placeholder="e.g. SCI-4X7Q"
              value={code}
              onChange={e => setCode(e.target.value)}
              maxLength={8}
              autoFocus
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Ask your teacher if you don't have a code.
            </p>
          </div>
          <button type="submit" disabled={loading || code.trim().length < 4} className="btn btn-primary w-full">
            {loading ? 'Joining...' : 'Join class'}
          </button>
        </form>
      </div>
    </div>
  )
}