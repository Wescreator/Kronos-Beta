'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()

  const [msg, setMsg] = useState('Iniciando...')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const supabase = createClient()

    async function checkSession() {
      setMsg('Verificando sessão...')

      const { data: { session }, error } =
        await supabase.auth.getSession()

      if (error) {
        setMsg('Erro: ' + error.message)
        return
      }

      if (session) {
        setMsg('Redirecionando para dashboard...')
        router.replace('/dashboard')
      } else {
        setMsg('Redirecionando para login...')
        router.replace('/login')
      }
    }

    checkSession()
  }, [router])

  if (!mounted) return null

  return (
    <div className="boot-screen">
      <div className="boot-glow" />

      <div className="boot-card">
        <div className="boot-logo">
          <div className="boot-logo-mark">K</div>

          <div>
            <div className="boot-logo-title">
              KRONOS
            </div>

            <div className="boot-logo-sub">
              Gestão inteligente de equipes
            </div>
          </div>
        </div>

        <div className="boot-loader">
          <div className="boot-loader-bar" />
        </div>

        <div className="boot-msg">
          {msg}
        </div>
      </div>
    </div>
  )
}