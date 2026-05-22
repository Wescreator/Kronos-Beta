'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

export default function AppLayout({ children }) {
  const [profile,     setProfile]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          window.location.href = '/login'
          return
        }

        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profErr || !prof) {
          window.location.href = '/login'
          return
        }

        if (prof.must_change_password) {
          window.location.href = '/change-password'
          return
        }

        if (mounted) {
          setProfile(prof)
          setLoading(false)
        }
      } catch (err) {
        console.error('[AppLayout]', err)
        window.location.href = '/login'
      }
    }

    init()

    // Listener para logout em outras abas
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') window.location.href = '/login'
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Fecha sidebar ao navegar no mobile
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 44, height: 44,
          background: 'linear-gradient(135deg,var(--purple),var(--blue))',
          borderRadius: 13, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#fff',
        }}>K</div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
        <div style={{ color: 'var(--text3)', fontSize: 13, animation: 'pulse 1.5s infinite' }}>
          Carregando KRONOS...
        </div>
      </div>
    )
  }

  if (!profile) return null

  const nopad   = pathname === '/chat'
  const taskpad = pathname === '/tasks'

  return (
    <div className="app">
      <div
        className={`sidebar-backdrop${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar
        profile={profile}
        pathname={pathname}
        signOut={signOut}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main">
        <Topbar
          profile={profile}
          pathname={pathname}
          onMenuClick={() => setSidebarOpen(p => !p)}
        />
        <div className={`content${nopad ? ' no-pad' : taskpad ? ' task-pad' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  )
}