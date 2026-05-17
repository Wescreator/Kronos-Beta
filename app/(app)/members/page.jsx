'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Modal, Avatar, RoleBadge, Toast } from '@/components/ui'
import Icon from '@/components/ui/Icon'
import { CAN, ROLE_LABELS, PERMISSION_TABLE } from '@/lib/permissions'

export default function MembersPage() {
  const { profile } = useAuth()
  const supabase    = createClient()

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [toast,   setToast]   = useState('')
  const [form,    setForm]    = useState({
    name: '', email: '', password: '',
    role: 'dev', position: '', department: ''
  })

  useEffect(() => { fetchMembers() }, [])

  async function fetchMembers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
    setMembers(data || [])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  async function addMember() {
    if (!form.name || !form.email || !form.password) {
      return showToast('❌ Nome, e-mail e senha são obrigatórios.')
    }
    if (form.password.length < 6) {
      return showToast('❌ Senha mínima: 6 caracteres.')
    }

    const res = await fetch('/api/members/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { showToast('❌ ' + (data.error || 'Erro ao adicionar.')); return }

    showToast('✅ Membro adicionado! Ele deverá trocar a senha no primeiro acesso.')
    setModal(false)
    setForm({ name: '', email: '', password: '', role: 'dev', position: '', department: '' })
    fetchMembers()
  }

  async function changeRole(id, role) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m))
    showToast('✅ Nível de acesso atualizado.')
  }

  async function removeMember(id) {
    if (id === profile?.id) return showToast('❌ Você não pode remover a si mesmo.')
    const res = await fetch('/api/members/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    })
    if (!res.ok) { showToast('❌ Erro ao remover membro.'); return }
    showToast('🗑️ Membro removido.')
    fetchMembers()
  }

  if (loading || !profile) return (
    <div className="empty-state"><div className="empty-icon">⏳</div>Carregando...</div>
  )

  const role = profile.role

  return (
    <div>
      <div className="section-header">
        <span className="section-title">Membros da Equipe ({members.length})</span>
        {CAN.manageMembers(role) && (
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
            <Icon name="userPlus" size={14} /> Adicionar Membro
          </button>
        )}
      </div>

      {/* Lista de membros */}
      {members.map(m => (
        <div key={m.id} className="member-row">
          <div style={{ position: 'relative' }}>
            <Avatar name={m.name} color={m.color} size={40} style={{ fontSize: 14 }} />
            {m.online && (
              <div className="online-dot" style={{ position: 'absolute', bottom: 1, right: 1 }} />
            )}
          </div>

          <div className="member-info">
            <div className="member-name">
              {m.name}
              {m.id === profile.id && (
                <span style={{ fontSize: 10, color: 'var(--purple3)', fontWeight: 700, marginLeft: 6 }}>
                  (você)
                </span>
              )}
            </div>
            <div className="member-sub">
              {m.email}
              {m.position    && <span> · {m.position}</span>}
              {m.department  && <span> · {m.department}</span>}
            </div>
          </div>

          {/* Nível de acesso */}
          {CAN.changeRoles(role) && m.id !== profile.id ? (
            <select
              className="form-select"
              style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}
              value={m.role}
              onChange={e => changeRole(m.id, e.target.value)}
            >
              <option value="admin">Administrador</option>
              <option value="manager">Gerente</option>
              <option value="dev">Colaborador</option>
              <option value="viewer">Visualizador</option>
            </select>
          ) : (
            <RoleBadge r={m.role} />
          )}

          {/* Remover */}
          {CAN.manageMembers(role) && m.id !== profile.id && (
            <button
              className="btn-icon btn-sm"
              style={{ color: 'var(--red)' }}
              onClick={() => removeMember(m.id)}
            >
              <Icon name="trash" size={14} />
            </button>
          )}
        </div>
      ))}

      {members.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          Nenhum membro cadastrado ainda.
        </div>
      )}

      {/* Tabela de permissões */}
      <div style={{ marginTop: 28 }}>
        <div className="section-title" style={{ marginBottom: 14 }}>
          🔒 Permissões por Nível de Acesso
        </div>
        <div className="card">
          <table className="perm-table">
            <thead>
              <tr>
                <th>Permissão</th>
                <th>Administrador</th>
                <th>Gerente</th>
                <th>Colaborador</th>
                <th>Visualizador</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSION_TABLE.map(([label, ...perms]) => (
                <tr key={label}>
                  <td style={{ color: 'var(--text2)' }}>{label}</td>
                  {perms.map((ok, i) => (
                    <td key={i}>
                      {ok
                        ? <span className="perm-yes"><Icon name="check" size={15} /></span>
                        : <span className="perm-no"><Icon name="x" size={15} /></span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal adicionar membro */}
      <Modal open={modal} onClose={() => setModal(false)} title="Adicionar Membro" icon="👤">

        <div className="form-group">
          <label className="form-label">Nome completo *</label>
          <input className="form-input" placeholder="Ex: Ana Paula Souza"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label">E-mail *</label>
          <input type="email" className="form-input" placeholder="ana@empresa.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label">Senha inicial *</label>
          <input className="form-input" placeholder="Mínimo 6 caracteres"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            O usuário será obrigado a criar uma nova senha no primeiro acesso.
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Cargo</label>
            <input className="form-input" placeholder="Ex: Arquiteto Sênior"
              value={form.position}
              onChange={e => setForm({ ...form, position: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Função / Área</label>
            <input className="form-input" placeholder="Ex: Projetos Residenciais"
              value={form.department}
              onChange={e => setForm({ ...form, department: e.target.value })} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Nível de acesso</label>
          <select className="form-select" value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="manager">Gerente</option>
            <option value="dev">Colaborador</option>
            <option value="viewer">Visualizador</option>
          </select>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            Define o que este membro pode fazer no sistema.
          </div>
        </div>

        <div style={{
          padding: '10px 14px', background: 'var(--bg3)',
          border: '1px solid var(--border)', borderRadius: 'var(--r)',
          fontSize: 12, color: 'var(--text3)', marginTop: 4,
        }}>
          <strong style={{ color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
            Níveis de acesso:
          </strong>
          🟣 <strong>Gerente</strong> — cria projetos, agenda reuniões, gerencia tarefas<br />
          🟢 <strong>Colaborador</strong> — cria e move tarefas, envia arquivos, comenta<br />
          ⚫ <strong>Visualizador</strong> — apenas visualiza, sem edições
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={addMember}>Adicionar Membro</button>
        </div>
      </Modal>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}