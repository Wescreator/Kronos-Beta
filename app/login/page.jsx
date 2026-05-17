'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [err,     setErr]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgot,  setForgot]  = useState(false)
  const [form,    setForm]    = useState({ email: '', password: '' })

  const supabase = createClient()
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // ── Login com e-mail e senha ──────────────────────────
  async function doLogin() {
    setErr(''); setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email:    form.email.trim(),
      password: form.password,
    })
    if (error) {
      setErr('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }
    // Redirecionamento completo para garantir cookies no servidor
    window.location.href = '/dashboard'
  }

  // ── Login com Google ──────────────────────────────────
  async function doGoogle() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    })
    if (error) { setErr(error.message); setLoading(false) }
  }

  // ── Recuperação de senha ──────────────────────────────
  async function doForgot() {
    setErr(''); setLoading(true)
    if (!form.email) { setErr('Digite seu e-mail.'); setLoading(false); return }
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/change-password`,
    })
    if (error) { setErr(error.message); setLoading(false); return }
    setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.')
    setLoading(false)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-mark">K</div>
          <div>
            <div className="auth-logo-name">KRON<em>OS</em></div>
            <div style={{fontSize:10,color:'var(--text3)',fontWeight:600,letterSpacing:'.5px'}}>
              GESTÃO DE EQUIPE
            </div>
          </div>
        </div>

        {/* Recuperação de senha */}
        {forgot ? (
          <>
            <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>🔑 Recuperar Senha</div>
            {err     && <div className="auth-error">{err}</div>}
            {success && <div className="auth-success">{success}</div>}
            <div className="form-group">
              <label className="form-label">Seu e-mail</label>
              <input className="form-input" type="email" placeholder="email@empresa.com"
                value={form.email} onChange={e => f('email', e.target.value)} />
            </div>
            <button className="btn btn-primary"
              style={{width:'100%',justifyContent:'center'}}
              onClick={doForgot} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar e-mail de recuperação'}
            </button>
            <button className="auth-link"
              onClick={() => { setForgot(false); setErr(''); setSuccess('') }}>
              ← Voltar ao login
            </button>
          </>
        ) : (
          <>
            {/* Botão Google */}
            <button className="btn btn-google" onClick={doGoogle} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{marginRight:8}}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
            </button>

            <div className="auth-divider">ou</div>

            {err && <div className="auth-error">{err}</div>}

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" placeholder="email@empresa.com"
                value={form.email} onChange={e => f('email', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doLogin()} />
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={form.password} onChange={e => f('password', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doLogin()} />
            </div>

            <button className="btn btn-primary"
              style={{width:'100%',justifyContent:'center',padding:'10px 0',marginBottom:10}}
              onClick={doLogin} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar no KRONOS'}
            </button>

            <button className="auth-link" onClick={() => { setForgot(true); setErr('') }}>
              Esqueceu a senha?
            </button>

            <div style={{
              marginTop:18,padding:'10px 14px',background:'var(--bg3)',
              border:'1px solid var(--border)',borderRadius:'var(--r)',
              fontSize:12,color:'var(--text3)',textAlign:'center',lineHeight:1.6
            }}>
              🔒 Acesso restrito — apenas usuários cadastrados pelo administrador podem entrar.
            </div>
          </>
        )}
      </div>
    </div>
  )
}