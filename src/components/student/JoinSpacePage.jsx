import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function JoinSpacePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState(['', '', '', '', '', '', '']) // e.g. ABC-123 = 7 chars
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  const inputRefs = useRef([])

  // Build the actual code string (strip the dash position)
  function getCodeString() {
    return code.join('').toUpperCase()
  }

  function handleInput(i, val) {
    const char = val.replace(/[^a-zA-Z0-9]/g, '').slice(-1).toUpperCase()
    const next = [...code]
    next[i] = char
    setCode(next)
    setError('')
    // Auto-advance — skip index 3 (the dash slot)
    if (char && i < 6) {
      const nextIdx = i === 2 ? 4 : i + 1
      inputRefs.current[nextIdx]?.focus()
    }
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !code[i]) {
      const prevIdx = i === 4 ? 2 : i - 1
      if (prevIdx >= 0) {
        const next = [...code]
        next[prevIdx] = ''
        setCode(next)
        inputRefs.current[prevIdx]?.focus()
      }
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)
    const next = ['', '', '', '', '', '', '']
    pasted.slice(0, 3).split('').forEach((c, i) => next[i] = c)
    pasted.slice(3, 6).split('').forEach((c, i) => next[i + 4] = c)
    setCode(next)
    const lastFilled = pasted.length >= 6 ? 6 : pasted.length >= 3 ? pasted.length + 1 : pasted.length
    inputRefs.current[Math.min(lastFilled, 6)]?.focus()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const codeStr = getCodeString().replace(/(.{3})(.{3})/, '$1-$2').slice(0, 7)
    if (codeStr.replace('-', '').length < 6) {
      setError('Please enter the full 6-character code.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data: space, error: spaceErr } = await supabase
        .rpc('find_space_by_code', { code: codeStr })
        .single()
      if (spaceErr || !space) { setError('Space not found. Check the code and try again.'); setLoading(false); return }

      // Check already enrolled
      const { data: existing } = await supabase
        .from('enrollments').select('id, status').eq('space_id', space.id).eq('student_id', user.id).maybeSingle()
      if (existing) {
        if (existing.status === 'active') { setError('You are already enrolled in this class.'); setLoading(false); return }
        if (existing.status === 'pending') { setError('Your request is already pending approval.'); setLoading(false); return }
      }

      const status = space.join_mode === 'open' ? 'active' : 'pending'
      await supabase.from('enrollments').insert({ space_id: space.id, student_id: user.id, status })

      if (status === 'active') {
        navigate(`/student/spaces/${space.id}`)
      } else {
        setSuccess(space.name)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="p-6 max-w-sm mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Request sent!</h2>
        <p className="text-sm text-gray-500 mb-6">
          Your request to join <span className="font-semibold text-gray-700">{success}</span> is waiting for the teacher to approve it.
        </p>
        <button onClick={() => navigate('/student')} className="btn btn-primary" style={{background:'#7c3aed',borderColor:'#7c3aed'}}>
          Back to my classes
        </button>
      </div>
    )
  }

  const codeComplete = getCodeString().length === 6

  return (
    <div className="p-4 sm:p-6 max-w-sm mx-auto animate-fade-in">
      <div className="mb-8 text-center">
        <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Join a class</h1>
        <p className="text-sm text-gray-500">Enter the code your teacher gave you</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Code input — big boxes for easy mobile tapping */}
        <div>
          <label className="label text-center block mb-4">Class code</label>
          <div className="flex items-center justify-center gap-2">
            {/* First 3 digits */}
            {[0, 1, 2].map(i => (
              <input key={i}
                ref={el => inputRefs.current[i] = el}
                type="text" inputMode="text"
                maxLength={1}
                value={code[i]}
                onChange={e => handleInput(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:border-violet-500 transition-colors uppercase bg-white text-gray-900"
                style={{ borderColor: code[i] ? '#7c3aed' : undefined }}
              />
            ))}
            {/* Dash separator */}
            <span className="text-2xl font-bold text-gray-300 mx-1">—</span>
            {/* Last 3 digits */}
            {[4, 5, 6].map(i => (
              <input key={i}
                ref={el => inputRefs.current[i] = el}
                type="text" inputMode="text"
                maxLength={1}
                value={code[i]}
                onChange={e => handleInput(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:border-violet-500 transition-colors uppercase bg-white text-gray-900"
                style={{ borderColor: code[i] ? '#7c3aed' : undefined }}
              />
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">Format: ABC-123</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        <button type="submit"
          disabled={!codeComplete || loading}
          className="btn w-full py-3.5 text-base font-semibold justify-center"
          style={{ background: codeComplete ? '#7c3aed' : undefined, borderColor: codeComplete ? '#7c3aed' : undefined, color: codeComplete ? '#fff' : undefined }}>
          {loading ? 'Joining...' : 'Join class'}
        </button>
      </form>
    </div>
  )
}