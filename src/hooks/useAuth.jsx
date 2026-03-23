import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { syncSubscriptionStatus } from '../lib/planEngine'

const AuthContext = createContext({})
export const useAuth = () => useContext(AuthContext)

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

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
        else { setProfile(null); setSubscription({ transaction: null, plan: null }); setLoading(false) }
      }
    )
    return () => authSub.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    // Single query — get profile
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)

    // Sync subscription for teachers (expire old txns, get current plan)
    // Only fires once per login session
    if (data?.role === 'teacher') {
      try {
        const sub = await syncSubscriptionStatus(userId)
        setSubscription(sub)
        // Re-fetch profile in case plan slug changed
        if (sub.plan?.slug !== data?.plan) {
          const { data: updated } = await supabase.from('profiles').select('*').eq('id', userId).single()
          setProfile(updated)
        }
      } catch (e) { /* non-critical */ }
    }

    setLoading(false)
  }

  async function signUp({ email, password, fullName }) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, email, full_name: fullName, role: 'teacher', plan: 'free'
      })
    }
    return data
  }

  async function signUpStudent({ email, password, fullName }) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, email, full_name: fullName, role: 'student'
      })
    }
    return data
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // Refresh profile + subscription — call after profile edits or plan changes
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
    <AuthContext.Provider value={{
      user, profile, subscription, loading,
      signUp, signUpStudent, signIn, signOut, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}