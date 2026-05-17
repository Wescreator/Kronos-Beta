'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Avatar, Toast } from '@/components/ui'
import { RoleBadge } from '@/components/ui'
import { CAN, ROLE_LABELS } from '@/lib/permissions'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { profile, signOut } = useAuth()
  const supabase = createClient()
  const router   = useRouter()

  const [toast,   setToast]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [name,    setName]    = useState(profile?.name || '')
  const [position,setPosition]= useState(profile?.position || '')
  const [toggles, setToggles] = useState({
    notifyTask:    true,
    notifyChat:    true,
    meetingRemind: true,
    dailyEmail:    false,
  })

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  async function saveProfile() {
    if (!name.trim()) return showToast('❌ Nome não pode ser vazio.')
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ name, position }).eq('id', profile.id)
    setSaving(false)
    if (error) { showToast('❌ Erro ao salvar.'); return }
    showToast('✅ Perfil atualizado!')
  }

  async function changePassword() {
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { showToast('❌ Erro ao enviar e-mail.'); return }
    showToast('📧 E-mail de redefinição enviado!')
  }

  if (!profile || !CAN.settings(profile.role)) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔒</div>
        Acesso restrito a administradores.
      </div>
    )
  }

  const nextSteps = [
    { step: 'Etapa 2', label: 'Supabase — PostgreSQL + Auth + Realtime', done: true  },
    { step: 'Etapa 3', label: 'Login com Google (OAuth)',                 done: true  },
    { step: 'Etapa 4', label: 'Upload real de arquivos (Storage)',        done: true  },
    { step: 'Etapa 5', label: 'Notificações em tempo real',               done: true  },
    { step: 'Etapa 6', label: 'E-mails automáticos (Resend)',             done: false },
    { step: 'Etapa 7', label: 'Integração Google Drive',                  done: false },
  ]

  return (
    <div>
      {/* Perfil */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="section-title" style={{ marginBottom: 16 }}>👤 Meu Perfil</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <Avatar name={profile.name} color={profile.color} size={52} style={{ fontSize: 20 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{profile.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{profile.email}</div>
            <RoleBadge r={profile.role} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Cargo</label>
            <input className="form-input" value={position} onChange={e => setPosition(e.target.value)} placeholder="Ex: CTO" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar perfil'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={changePassword}>
            🔑 Redefinir senha por e-mail
          </button>
        </div>
      </div>

      {/* Notificações */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="section-title" style={{ marginBottom: 14 }}>🔔 Notificações</div>
        {[
          ['notifyTask',    'Notificar ao ser atribuído a uma tarefa'],
          ['notifyChat',    'Notificar novas mensagens no chat'],
          ['meetingRemind', 'Lembrete de reunião (15 min antes)'],
          ['dailyEmail',    'Resumo diário por e-mail'],
        ].map(([k, label]) => (
          <div key={k} className="settings-row">
            <span>{label}</span>
            <button className={`toggle${toggles[k] ? ' on' : ''}`}
              onClick={() => setToggles(p => ({ ...p, [k]: !p[k] }))} />
          </div>
        ))}
      </div>

      {/* Roadmap */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 14 }}>🗺️ Roadmap de Desenvolvimento</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {nextSteps.map(s => (
            <div key={s.step} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px',
              background: 'var(--bg3)', borderRadius: 8,
              border: `1px solid ${s.done ? 'rgba(16,185,129,.3)' : 'var(--border)'}`,
            }}>
              <span style={{ fontSize: 15 }}>{s.done ? '✅' : '🔲'}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: s.done ? 'var(--green)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  {s.step}
                </span>
                <span style={{ fontSize: 12, color: s.done ? 'var(--text)' : 'var(--text2)', marginLeft: 8 }}>{s.label}</span>
              </div>
              <span style={{ fontSize: 10, background: s.done ? 'var(--green-bg)' : 'var(--bg5)', color: s.done ? 'var(--green)' : 'var(--text3)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                {s.done ? 'ATIVO' : 'PRÓXIMO'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}