'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Modal, Avatar, ColorPicker, IconPicker, Toast } from '@/components/ui'
import Icon from '@/components/ui/Icon'
import { CAN } from '@/lib/permissions'
import { fmtDate } from '@/lib/constants'

export default function ProjectsPage() {
  const { profile } = useAuth()
  const supabase    = createClient()

  const [projects,   setProjects]   = useState([])
  const [members,    setMembers]    = useState([])
  const [tasks,      setTasks]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [toast,      setToast]      = useState('')
  const [driveMsg,   setDriveMsg]   = useState('')
  const [form,       setForm]       = useState({
    name: '', description: '', color: '#7c3aed', icon: '🚀', due_date: '',
  })

  useEffect(() => { if (profile) fetchAll() }, [profile])

  async function fetchAll() {
    const [p, m, t] = await Promise.all([
      supabase.from('projects')
        .select('*, project_members(user_id, profiles(name,color))')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('tasks').select('id, project_id, status'),
    ])
    setProjects(p.data || [])
    setMembers(m.data  || [])
    setTasks(t.data    || [])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // ── Criar projeto ──────────────────────────────────────────────────────────
  async function createProject() {
    if (!form.name.trim()) return

    const { data: proj, error } = await supabase
      .from('projects')
      .insert({ ...form, owner_id: profile.id, progress: 0 })
      .select()
      .single()

    if (error) { showToast('❌ Erro ao criar projeto.'); return }

    showToast('✅ Projeto criado! Criando pasta no Drive...')
    setModal(false)
    setForm({ name: '', description: '', color: '#7c3aed', icon: '🚀', due_date: '' })
    fetchAll()

    // Cria pasta no Google Drive
    try {
      const res  = await fetch('/api/drive/create-folder', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ projectId: proj.id, projectName: proj.name }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('✅ Projeto e pasta no Drive criados!')
      } else {
        console.error('[Drive]', data.error)
        showToast('✅ Projeto criado. Pasta no Drive: verifique as configurações.')
      }
    } catch (err) {
      console.error('[Drive] Erro ao criar pasta:', err)
      showToast('✅ Projeto criado. Falha ao conectar com o Drive.')
    }

    fetchAll()
  }

  // ── Deletar projeto ────────────────────────────────────────────────────────
  async function deleteProject(id) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Delete project]', error)
      showToast('❌ Erro ao remover projeto.')
      return
    }

    showToast('🗑️ Projeto removido.')
    setConfirmDel(null)
    fetchAll()
  }

  if (loading || !profile) return (
    <div className="empty-state"><div className="empty-icon">⏳</div>Carregando...</div>
  )

  const role = profile.role

  return (
    <div>
      <div className="section-header">
        <span className="section-title">Todos os Projetos</span>
        {CAN.createProject(role) && (
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
            <Icon name="plus" size={14} /> Novo Projeto
          </button>
        )}
      </div>

      {/* Grade de projetos */}
      <div className="projects-grid">
        {projects.map(p => {
          const ptasks = tasks.filter(t => t.project_id === p.id)
          const done   = ptasks.filter(t => t.status === 'done').length
          const pct    = ptasks.length ? Math.round(done / ptasks.length * 100) : (p.progress || 0)
          const mems   = (p.project_members || []).map(pm => pm.profiles).filter(Boolean)

          return (
            <div key={p.id} className="proj-card">
              <div
                className="proj-accent"
                style={{ background: `linear-gradient(90deg,${p.color},${p.color}88)` }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="proj-icon" style={{ background: p.color + '22', color: p.color }}>
                  {p.icon}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {/* Badge Google Drive */}
                  {p.drive_folder_id && (
                    <div style={{
                      fontSize: 10, color: 'var(--blue3)',
                      background: 'var(--blue-bg)',
                      border: '1px solid rgba(37,99,235,.3)',
                      borderRadius: 5, padding: '2px 6px', fontWeight: 700,
                    }}>
                      Drive ✓
                    </div>
                  )}
                  {CAN.deleteProject(role) && (
                    <button
                      className="btn-icon btn-sm"
                      style={{ color: 'var(--red)' }}
                      onClick={e => { e.stopPropagation(); setConfirmDel(p.id) }}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="proj-name">{p.name}</div>
              {p.description && <div className="proj-desc">{p.description}</div>}

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: pct + '%', background: `linear-gradient(90deg,${p.color},${p.color}aa)` }}
                />
              </div>
              <div className="fs-11 text-dim mb-8">
                {done}/{ptasks.length} tarefas · {pct}% concluído
              </div>

              <div className="proj-footer">
                <div className="avatar-stack">
                  {mems.slice(0, 4).map((m, i) => (
                    <Avatar key={i} name={m.name} color={m.color} size={22} />
                  ))}
                </div>
                <span className="fs-11 text-dim">
                  {p.due_date ? `Entrega: ${fmtDate(p.due_date)}` : ''}
                </span>
              </div>
            </div>
          )
        })}

        {/* Card de adicionar */}
        {CAN.createProject(role) && (
          <div className="add-proj" onClick={() => setModal(true)}>
            <div style={{ fontSize: 32 }}>+</div>
            <span className="fs-12">Novo Projeto</span>
          </div>
        )}
      </div>

      {projects.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          Nenhum projeto criado ainda.
          {CAN.createProject(role) && (
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
                <Icon name="plus" size={13} /> Criar primeiro projeto
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal criar projeto */}
      <Modal open={modal} onClose={() => setModal(false)} title="Novo Projeto" icon="🚀">
        <div className="form-group">
          <label className="form-label">Nome do projeto *</label>
          <input
            className="form-input"
            placeholder="Ex: App Mobile v3"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && createProject()}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Descrição</label>
          <textarea
            className="form-textarea"
            placeholder="Objetivo do projeto..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Ícone</label>
          <IconPicker value={form.icon} onChange={v => setForm({ ...form, icon: v })} />
        </div>
        <div className="form-group">
          <label className="form-label">Cor</label>
          <ColorPicker value={form.color} onChange={v => setForm({ ...form, color: v })} />
        </div>
        <div className="form-group">
          <label className="form-label">Data de entrega</label>
          <input
            type="date"
            className="form-input"
            value={form.due_date}
            onChange={e => setForm({ ...form, due_date: e.target.value })}
          />
        </div>

        <div style={{
          padding: '10px 13px', background: 'var(--bg3)',
          border: '1px solid var(--border)', borderRadius: 'var(--r)',
          fontSize: 12, color: 'var(--text3)', marginBottom: 4,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>📁</span>
          Uma pasta com o nome do projeto será criada automaticamente no Google Drive.
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={createProject}>
            <Icon name="plus" size={13} /> Criar Projeto
          </button>
        </div>
      </Modal>

      {/* Modal confirmar exclusão */}
      <Modal open={confirmDel !== null} onClose={() => setConfirmDel(null)} title="Remover Projeto" icon="🗑️">
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
          Tem certeza? Todas as tarefas e arquivos relacionados também serão removidos do sistema.
          <br /><br />
          <strong style={{ color: 'var(--amber)' }}>
            ⚠️ A pasta do Google Drive não será removida automaticamente.
          </strong>
        </p>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
          <button
            className="btn btn-danger"
            onClick={() => deleteProject(confirmDel)}
          >
            <Icon name="trash" size={13} /> Remover projeto
          </button>
        </div>
      </Modal>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}