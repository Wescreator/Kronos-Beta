'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useAuth() {
  const [user,    setUser]    = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data?.must_change_password) {
        window.location.href = '/change-password'
        return
      }

      setProfile(data)
    } catch (err) {
      console.error('[useAuth] Erro ao buscar perfil:', err)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    // Sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
    })

    // Listener de mudanças
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } finally {
      window.location.href = '/login'
    }
  }

  const loading = user === undefined

  return { user, profile, loading, signOut }
}