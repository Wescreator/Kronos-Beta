'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Modal, Avatar, ColorPicker, IconPicker, Toast } from '@/components/ui'
import Icon from '@/components/ui/Icon'
import { CAN } from '@/lib/permissions'
import { fmtDate } from '@/lib/constants'

export default function ProjectsPage() {
  const { profile }  = useAuth()
  const supabase     = createClient()

  const [projects,   setProjects]   = useState([])
  const [members,    setMembers]    = useState([])
  const [tasks,      setTasks]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [toast,      setToast]      = useState('')
  const [form,       setForm]       = useState({ name: '', description: '', color: '#7c3aed', icon: '🚀', due_date: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [p, m, t] = await Promise.all([
      supabase.from('projects').select('*, project_members(user_id, profiles(name,color))').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('tasks').select('id, project_id, status'),
    ])
    setProjects(p.data || [])
    setMembers(m.data  || [])
    setTasks(t.data    || [])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  async function createProject() {
  if (!form.name.trim()) return
  const { data: proj, error } = await supabase
    .from('projects')
    .insert({ ...form, owner_id: profile.id, progress: 0 })
    .select()
    .single()

  if (error) { showToast('❌ Erro ao criar projeto.'); return }

  // Cria pasta no Drive em segundo plano (não bloqueia)
  if (process.env.NEXT_PUBLIC_DRIVE_ENABLED === 'true') {
    fetch('/api/drive/create-folder', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ projectId: proj.id, projectName: proj.name }),
    }).catch(err => console.error('[Drive] Falha ao criar pasta:', err))
  }

  showToast('✅ Projeto criado!')
  setModal(false)
  setForm({ name: '', description: '', color: '#7c3aed', icon: '🚀', due_date: '' })
  fetchAll()
}

  if (loading || !profile) return <div className="empty-state"><div className="empty-icon">⏳</div>Carregando...</div>

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

      <div className="projects-grid">
        {projects.map(p => {
          const ptasks = tasks.filter(t => t.project_id === p.id)
          const done   = ptasks.filter(t => t.status === 'done').length
          const pct    = ptasks.length ? Math.round(done / ptasks.length * 100) : (p.progress || 0)
          const mems   = (p.project_members || []).map(pm => pm.profiles).filter(Boolean)

          return (
            <div key={p.id} className="proj-card">
              <div className="proj-accent" style={{ background: `linear-gradient(90deg,${p.color},${p.color}88)` }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="proj-icon" style={{ background: p.color + '22', color: p.color }}>{p.icon}</div>
                {CAN.deleteProject(role) && (
                  <button className="btn-icon btn-sm" style={{ color: 'var(--red)' }}
                    onClick={e => { e.stopPropagation(); setConfirmDel(p.id) }}>
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
              <div className="proj-name">{p.name}</div>
              {p.description && <div className="proj-desc">{p.description}</div>}
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: pct + '%', background: `linear-gradient(90deg,${p.color},${p.color}aa)` }} />
              </div>
              <div className="fs-11 text-dim mb-8">{done}/{ptasks.length} tarefas · {pct}% concluído</div>
              <div className="proj-footer">
                <div className="avatar-stack">
                  {mems.slice(0, 4).map((m, i) => <Avatar key={i} name={m.name} color={m.color} size={22} />)}
                </div>
                <span className="fs-11 text-dim">{p.due_date ? `Entrega: ${fmtDate(p.due_date)}` : ''}</span>
              </div>
            </div>
          )
        })}

        {CAN.createProject(role) && (
          <div className="add-proj" onClick={() => setModal(true)}>
            <div style={{ fontSize: 32 }}>+</div>
            <span className="fs-12">Novo Projeto</span>
          </div>
        )}
      </div>

      {projects.length === 0 && (
        <div className="empty-state" style={{ gridColumn: '1/-1' }}>
          <div className="empty-icon">📁</div>
          Nenhum projeto ainda.{CAN.createProject(role) && ' Crie o primeiro!'}
        </div>
      )}

      {/* Modal criar */}
      <Modal open={modal} onClose={() => setModal(false)} title="Novo Projeto" icon="🚀">
        <div className="form-group">
          <label className="form-label">Nome do projeto</label>
          <input className="form-input" placeholder="Ex: App Mobile v3"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Descrição</label>
          <textarea className="form-textarea" placeholder="Objetivo do projeto..."
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
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
          <input type="date" className="form-input"
            value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={createProject}>Criar Projeto</button>
        </div>
      </Modal>

      {/* Modal confirmar exclusão */}
      <Modal open={confirmDel !== null} onClose={() => setConfirmDel(null)} title="Remover Projeto" icon="🗑️">
        <p style={{ fontSize: 13, color: 'var(--text2)' }}>
          Tem certeza? Todas as tarefas relacionadas também serão removidas.
        </p>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
          <button className="btn btn-danger" onClick={() => deleteProject(confirmDel)}>Remover</button>
        </div>
      </Modal>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}