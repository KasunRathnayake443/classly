import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useForm } from 'react-hook-form'

export default function TeacherLoginPage() {
  const { signIn } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  async function onSubmit(data) {
    setError(''); setLoading(true)
    try { await signIn(data.email, data.password) }
    catch (err) { setError(err.message || 'Login failed.') }
    finally { setLoading(false) }
  }

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
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-5">Sign in to your teacher account</p>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg">{error}</div>}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@school.com"
                {...register('email', { required: 'Email is required' })} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="••••••••"
                {...register('password', { required: 'Password is required' })} />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ background: '#4f46e5', borderColor: '#4f46e5' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-gray-500 mt-4">
          No account?{' '}
          <Link to="/teacher/signup" className="text-indigo-600 hover:underline font-medium">Sign up as teacher</Link>
        </p>
        <p className="text-center text-sm text-gray-400 mt-2">
          <Link to="/" className="hover:text-gray-600">← Back to home</Link>
        </p>
      </div>
    </div>
  )
}
