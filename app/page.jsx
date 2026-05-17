'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router   = useRouter()
  const [msg, setMsg] = useState('Iniciando...')

  useEffect(() => {
    const supabase = createClient()
    setMsg('Verificando sessão...')
    supabase.auth.getSession().then(({ data: { session }, error }) => {
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
    })
  }, [])

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#07070d',
      color: '#c4b5fd',
      fontFamily: 'system-ui',
      gap: 16,
    }}>
      <div style={{
        width: 48, height: 48,
        background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
        borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, fontWeight: 900, color: '#fff',
      }}>K</div>
      <div style={{ fontSize: 14, color: '#a0a0c8' }}>{msg}</div>
    </div>
  )
}