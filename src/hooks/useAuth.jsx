import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { syncSubscriptionStatus } from '../lib/planEngine'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [subscription, setSubscription] = useState({ transaction: null, plan: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)

    // Sync subscription for teachers
    if (data?.role === 'teacher') {
      try {
        const sub = await syncSubscriptionStatus(userId)
        setSubscription(sub)
        // Re-fetch profile in case plan slug was updated
        const { data: updated } = await supabase.from('profiles').select('*').eq('id', userId).single()
        setProfile(updated)
      } catch (e) { /* non-critical */ }
    }

    setLoading(false)
  }

  // Sign up as a teacher
  async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'teacher' } },
    })
    if (error) throw error
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        email,
        role: 'teacher',
      })
    }
    return data
  }

  // Sign up as a student
  async function signUpStudent(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'student' } },
    })
    if (error) throw error
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        email,
        role: 'student',
      })
    }
    return data
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
    if (data?.role === 'teacher') {
      try {
        const sub = await syncSubscriptionStatus(user.id)
        setSubscription(sub)
      } catch (e) {}
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, subscription, loading, signUp, signUpStudent, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}