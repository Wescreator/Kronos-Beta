'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordPage() {
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [err,       setErr]       = useState('')
  const [success,   setSuccess]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [userEmail, setUserEmail] = useState('')

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email)
    })
  }, [])

  async function handleChange() {
    setErr('')
    if (!password || !confirm) { setErr('Preencha os dois campos.'); return }
    if (password.length < 6)   { setErr('Senha mínima: 6 caracteres.'); return }
    if (password !== confirm)  { setErr('As senhas não coincidem.'); return }

    setLoading(true)

    // Atualiza a senha no Supabase Auth
    const { error: authError } = await supabase.auth.updateUser({ password })
    if (authError) { setErr(authError.message); setLoading(false); return }

    // Marca must_change_password como false no perfil
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', user.id)
    }

    setSuccess('Senha alterada com sucesso! Redirecionando...')
    setTimeout(() => { window.location.href = '/dashboard' }, 2000)
    setLoading(false)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">K</div>
          <div>
            <div className="auth-logo-name">KRON<em>OS</em></div>
            <div style={{fontSize:10,color:'var(--text3)',fontWeight:600,letterSpacing:'.5px'}}>
              GESTÃO DE EQUIPE
            </div>
          </div>
        </div>

        <div style={{
          padding:'12px 14px',background:'var(--amber-bg)',
          border:'1px solid rgba(245,158,11,.3)',borderRadius:'var(--r)',
          fontSize:13,color:'var(--amber)',marginBottom:20,textAlign:'center'
        }}>
          🔐 Por segurança, defina sua senha pessoal antes de continuar.
        </div>

        {userEmail && (
          <div style={{fontSize:12,color:'var(--text3)',marginBottom:16,textAlign:'center'}}>
            Conta: <strong style={{color:'var(--text2)'}}>{userEmail}</strong>
          </div>
        )}

        {err     && <div className="auth-error">{err}</div>}
        {success && <div className="auth-success">{success}</div>}

        <div className="form-group">
          <label className="form-label">Nova senha</label>
          <input className="form-input" type="password" placeholder="Mínimo 6 caracteres"
            value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Confirmar nova senha</label>
          <input className="form-input" type="password" placeholder="Repita a senha"
            value={confirm} onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleChange()} />
        </div>

        <button className="btn btn-primary"
          style={{width:'100%',justifyContent:'center',padding:'10px 0'}}
          onClick={handleChange} disabled={loading}>
          {loading ? 'Salvando...' : 'Definir minha senha'}
        </button>
      </div>
    </div>
  )
}