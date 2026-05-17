'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Modal, Avatar, PriorityTag, MemberChecklist, Toast } from '@/components/ui'
import Icon from '@/components/ui/Icon'
import { CAN } from '@/lib/permissions'
import { COLS, fmtDate } from '@/lib/constants'

export default function TasksPage() {
  const { profile } = useAuth()
  const supabase    = createClient()

  const [tasks,     setTasks]     = useState([])
  const [projects,  setProjects]  = useState([])
  const [members,   setMembers]   = useState([])
  const [filter,    setFilter]    = useState('')
  const [modal,     setModal]     = useState(false)
  const [taskModal, setTaskModal] = useState(null)
  const [comment,   setComment]   = useState('')
  const [comments,  setComments]  = useState([])
  const [toast,     setToast]     = useState('')
  const [loading,   setLoading]   = useState(true)
  const [form,      setForm]      = useState({
    title: '', description: '', project_id: '', priority: 'media',
    assignee_id: '', due_date: '', status: 'todo',
  })

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { if (taskModal) fetchComments(taskModal.id) }, [taskModal])

  async function fetchAll() {
    const [t, p, m] = await Promise.all([
      supabase.from('tasks').select('*, projects(name,color,icon), profiles!tasks_assignee_id_fkey(name,color)').order('created_at', { ascending: false }),
      supabase.from('projects').select('id,name,color,icon'),
      supabase.from('profiles').select('id,name,color,role'),
    ])
    setTasks(t.data    || [])
    setProjects(p.data || [])
    setMembers(m.data  || [])
    setLoading(false)
  }

  async function fetchComments(taskId) {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(name,color)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    setComments(data || [])
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  async function createTask() {
    if (!form.title.trim()) return
    const { error } = await supabase.from('tasks').insert({
      ...form,
      project_id:  form.project_id  || projects[0]?.id,
      assignee_id: form.assignee_id || profile.id,
      created_by:  profile.id,
    })
    if (error) { showToast('❌ Erro ao criar tarefa.'); return }
    showToast('✅ Tarefa criada!')
    setModal(false)
    setForm({ title: '', description: '', project_id: '', priority: 'media', assignee_id: '', due_date: '', status: 'todo' })
    fetchAll()
  }

  async function moveTask(id, status) {
    await supabase.from('tasks').update({ status }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    showToast('🗑️ Tarefa removida.')
    setTaskModal(null)
    fetchAll()
  }

  async function sendComment() {
    if (!comment.trim() || !taskModal) return
    await supabase.from('comments').insert({
      task_id: taskModal.id, author_id: profile.id, content: comment.trim(),
    })
    setComment('')
    fetchComments(taskModal.id)
  }

  if (loading || !profile) return <div className="empty-state"><div className="empty-icon">⏳</div>Carregando...</div>

  const role     = profile.role
  const filtered = filter ? tasks.filter(t => t.project_id === filter) : tasks

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="section-header" style={{ marginBottom: 14 }}>
        <span className="section-title">Quadro de Tarefas</span>
        <div className="flex-center gap-8">
          <select className="form-select" style={{ width: 200, padding: '6px 10px', fontSize: 12 }}
            value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">Todos os projetos</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
          </select>
          {CAN.createTask(role) && (
            <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
              <Icon name="plus" size={14} /> Nova Tarefa
            </button>
          )}
        </div>
      </div>

      {/* Kanban */}
      <div className="kanban-wrap">
        {COLS.map(col => {
          const colTasks = filtered.filter(t => t.status === col.key)
          return (
            <div key={col.key} className="kanban-col">
              <div className="kanban-head">
                <div className="kanban-head-title" style={{ color: col.color }}>{col.label}</div>
                <span className="kanban-count">{colTasks.length}</span>
              </div>
              <div className="kanban-cards">
                {colTasks.map(t => {
                  const proj     = t.projects || {}
                  const assignee = t.profiles || {}
                  return (
                    <div key={t.id} className="task-card" onClick={() => setTaskModal(t)}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                        {proj.name && (
                          <span className="tag" style={{ background: proj.color + '22', color: proj.color, fontSize: 10 }}>
                            {proj.icon} {proj.name}
                          </span>
                        )}
                        <PriorityTag p={t.priority} />
                      </div>
                      <div className="task-title">{t.title}</div>
                      <div className="task-foot">
                        <div className="task-date">
                          {t.due_date && <><Icon name="clock" size={11} style={{ color: 'var(--text3)', marginRight: 3 }} />{fmtDate(t.due_date)}</>}
                        </div>
                        {assignee.name && <Avatar name={assignee.name} color={assignee.color} size={22} />}
                      </div>
                    </div>
                  )
                })}
              </div>
              {CAN.createTask(role) && (
                <button className="add-task" onClick={() => { setForm(p => ({ ...p, status: col.key })); setModal(true) }}>
                  <Icon name="plus" size={13} /> Adicionar tarefa
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal criar tarefa */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nova Tarefa" icon="✅">
        <div className="form-group">
          <label className="form-label">Título</label>
          <input className="form-input" placeholder="Descreva a tarefa..."
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Projeto</label>
            <select className="form-select" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Prioridade</label>
            <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Responsável</label>
            <select className="form-select" value={form.assignee_id} onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
              <option value="">Selecionar...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Prazo</label>
            <input type="date" className="form-input" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Descrição</label>
          <textarea className="form-textarea" placeholder="Detalhes da tarefa..."
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={createTask}>Criar Tarefa</button>
        </div>
      </Modal>

      {/* Modal detalhe da tarefa */}
      {taskModal && (
        <Modal open={true} onClose={() => { setTaskModal(null); setComments([]) }} title={taskModal.title} icon="📋" lg>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {taskModal.projects?.name && (
              <span className="tag" style={{ background: taskModal.projects.color + '22', color: taskModal.projects.color }}>
                {taskModal.projects.icon} {taskModal.projects.name}
              </span>
            )}
            <PriorityTag p={taskModal.priority} />
          </div>

          {taskModal.description && (
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6, padding: '10px 14px', background: 'var(--bg3)', borderRadius: 9 }}>
              {taskModal.description}
            </div>
          )}

          <div className="form-row" style={{ marginBottom: 14 }}>
            <div>
              <div className="form-label">Responsável</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {taskModal.profiles?.name && <Avatar name={taskModal.profiles.name} color={taskModal.profiles.color} size={24} />}
                <span style={{ fontSize: 13, fontWeight: 700 }}>{taskModal.profiles?.name || '—'}</span>
              </div>
            </div>
            <div>
              <div className="form-label">Prazo</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{fmtDate(taskModal.due_date)}</div>
            </div>
          </div>

          {CAN.moveTask(role) && (
            <div className="form-group">
              <label className="form-label">Mover para</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLS.filter(c => c.key !== taskModal.status).map(c => (
                  <button key={c.key} className="btn btn-ghost btn-sm"
                    style={{ borderColor: c.color, color: c.color }}
                    onClick={() => { moveTask(taskModal.id, c.key); setTaskModal({ ...taskModal, status: c.key }) }}>
                    → {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="divider" />

          {/* Comentários */}
          <div className="form-label" style={{ marginBottom: 10 }}>
            💬 Comentários ({comments.length})
          </div>
          {comments.map(c => (
            <div key={c.id} className="comment-item">
              <Avatar name={c.profiles?.name} color={c.profiles?.color} size={28} />
              <div className="comment-body">
                <div className="comment-meta">
                  {c.profiles?.name} · {new Date(c.created_at).toLocaleString('pt-BR')}
                </div>
                <div className="comment-text">{c.content}</div>
              </div>
            </div>
          ))}
          <div className="comment-input-row">
            <input className="form-input" placeholder="Adicionar comentário..."
              value={comment} onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendComment()} />
            <button className="btn btn-primary btn-sm" onClick={sendComment}>
              <Icon name="send" size={14} />
            </button>
          </div>

          <div className="modal-foot">
            {CAN.deleteTask(role) && (
              <button className="btn btn-danger btn-sm" onClick={() => deleteTask(taskModal.id)}>
                <Icon name="trash" size={13} /> Remover
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => { setTaskModal(null); setComments([]) }}>Fechar</button>
          </div>
        </Modal>
      )}

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}