import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useForm } from 'react-hook-form'

export default function TeacherSignupPage() {
  const { signUp } = useAuth()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  async function onSubmit(data) {
    setError(''); setLoading(true)
    try { await signUp(data.email, data.password, data.fullName); setSuccess(true) }
    catch (err) { setError(err.message || 'Sign up failed.') }
    finally { setLoading(false) }
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card p-8 max-w-sm w-full text-center">
        <img src="/logo.png" alt="Skooly" className="w-7 h-7 rounded-lg object-cover" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
        <p className="text-sm text-gray-500">Click the confirmation link to activate your account.</p>
        <Link to="/teacher/login" className="btn btn-primary mt-5 w-full" style={{ background: '#4f46e5', borderColor: '#4f46e5' }}>Go to login</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo.png" alt="Skooly" className="w-7 h-7 rounded-lg object-cover" />
          <span className="text-xl font-semibold text-gray-900">Skooly</span>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">Teacher</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 mb-5">Start managing your classes for free</p>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg">{error}</div>}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input type="text" className="input" placeholder="Ms. Sanduni Perera"
                {...register('fullName', { required: 'Full name is required' })} />
              {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@school.com"
                {...register('email', { required: 'Email is required' })} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="Min. 8 characters"
                {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ background: '#4f46e5', borderColor: '#4f46e5' }}>
              {loading ? 'Creating account...' : 'Create teacher account'}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/teacher/login" className="text-indigo-600 hover:underline font-medium">Sign in</Link>
        </p>
        <p className="text-center text-sm text-gray-400 mt-2">
          <Link to="/" className="hover:text-gray-600">← Back to home</Link>
        </p>
      </div>
    </div>
  )
}
