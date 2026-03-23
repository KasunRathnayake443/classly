import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useForm } from 'react-hook-form'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  async function onSubmit(data) {
    setError('')
    setLoading(true)
    try {
      await signIn(data.email, data.password)
      // AuthProvider will update user state, App.jsx redirects automatically
    } catch (err) {
      setError(err.message || 'Login failed. Check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1L2 4v4c0 3.3 2.5 6 6 7 3.5-1 6-3.7 6-7V4L8 1z"/>
            </svg>
          </div>
          <span className="text-xl font-semibold text-gray-900">Classly</span>
        </div>

        <div className="card p-6">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-5">Sign in to your teacher account</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@school.com"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Teacher?{' '}
          <Link to="/signup" className="text-brand-500 hover:underline font-medium">Create teacher account</Link>
        </p>
        <p className="text-center text-sm text-gray-500 mt-2">
          Student?{' '}
          <Link to="/student-signup" className="text-brand-500 hover:underline font-medium">Create student account</Link>
        </p>
      </div>
    </div>
  )
}