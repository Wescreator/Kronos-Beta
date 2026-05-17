'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Modal, Avatar, MemberChecklist, Toast } from '@/components/ui'
import Icon from '@/components/ui/Icon'
import { CAN } from '@/lib/permissions'
import { MONTHS_SHORT } from '@/lib/constants'

export default function MeetingsPage() {
  const { profile } = useAuth()
  const supabase    = createClient()

  const [meetings,  setMeetings]  = useState([])
  const [members,   setMembers]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [toast,     setToast]     = useState('')
  const [parts,     setParts]     = useState([])
  const [form,      setForm]      = useState({ title: '', description: '', meeting_date: '', duration: '1 hora', link: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [mt, m] = await Promise.all([
      supabase.from('meetings').select('*, meeting_participants(user_id, profiles(name,color))').order('meeting_date', { ascending: true }),
      supabase.from('profiles').select('*'),
    ])
    setMeetings(mt.data || [])
    setMembers(m.data   || [])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  async function createMeeting() {
    if (!form.title || !form.meeting_date) return showToast('❌ Preencha título e data.')
    const { data, error } = await supabase.from('meetings').insert({ ...form, created_by: profile.id }).select().single()
    if (error) { showToast('❌ Erro ao agendar.'); return }
    if (parts.length > 0) {
      await supabase.from('meeting_participants').insert(parts.map(uid => ({ meeting_id: data.id, user_id: uid })))
    }
    showToast('📅 Reunião agendada!')
    setModal(false)
    setForm({ title: '', description: '', meeting_date: '', duration: '1 hora', link: '' })
    setParts([])
    fetchAll()
  }

  async function deleteMeeting(id) {
    await supabase.from('meetings').delete().eq('id', id)
    showToast('🗑️ Reunião removida.')
    fetchAll()
  }

  if (loading || !profile) return <div className="empty-state"><div className="empty-icon">⏳</div>Carregando...</div>

  const role = profile.role

  return (
    <div>
      <div className="section-header">
        <span className="section-title">Reuniões</span>
        {CAN.scheduleMeeting(role) && (
          <button className="btn btn-primary btn-sm" onClick={() => { setParts([profile.id]); setModal(true) }}>
            <Icon name="plus" size={14} /> Agendar Reunião
          </button>
        )}
      </div>

      {meetings.length === 0 && <div className="empty-state"><div className="empty-icon">📅</div>Nenhuma reunião agendada.</div>}

      {meetings.map(m => {
        const dt    = new Date(m.meeting_date)
        const pList = (m.meeting_participants || []).map(p => p.profiles).filter(Boolean)
        return (
          <div key={m.id} className="meeting-card">
            <div className="meeting-datebox">
              <div className="meeting-day">{dt.getDate()}</div>
              <div className="meeting-month">{MONTHS_SHORT[dt.getMonth()]}</div>
            </div>
            <div className="meeting-main">
              <div className="meeting-title">{m.title}</div>
              <div className="meeting-meta">
                <span>
                  <Icon name="clock" size={12} style={{ marginRight: 4, color: 'var(--text3)' }} />
                  {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {m.duration}
                </span>
                {m.link && (
                  <a href={m.link} target="_blank" rel="noreferrer"
                    style={{ color: 'var(--blue3)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                    <Icon name="link" size={12} /> Entrar na reunião
                  </a>
                )}
              </div>
              {m.description && <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>{m.description}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="avatar-stack">{pList.map((p, i) => <Avatar key={i} name={p.name} color={p.color} size={22} />)}</div>
                <span className="fs-11 text-dim">{pList.map(p => p.name.split(' ')[0]).join(', ')}</span>
              </div>
            </div>
            {CAN.scheduleMeeting(role) && (
              <button className="btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteMeeting(m.id)}>
                <Icon name="trash" size={14} />
              </button>
            )}
          </div>
        )
      })}

      <Modal open={modal} onClose={() => setModal(false)} title="Agendar Reunião" icon="🎥" lg>
        <div className="form-group">
          <label className="form-label">Título</label>
          <input className="form-input" placeholder="Ex: Sprint Planning"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data e horário</label>
            <input type="datetime-local" className="form-input"
              value={form.meeting_date} onChange={e => setForm({ ...form, meeting_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Duração</label>
            <select className="form-select" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}>
              <option>15 minutos</option><option>30 minutos</option>
              <option>1 hora</option><option>1h30</option><option>2 horas</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Link da reunião</label>
          <input className="form-input" placeholder="https://meet.google.com/..."
            value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Participantes</label>
          <MemberChecklist members={members} selected={parts} onChange={setParts} />
        </div>
        <div className="form-group">
          <label className="form-label">Descrição</label>
          <textarea className="form-textarea" placeholder="Pauta da reunião..."
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={createMeeting}>Agendar</button>
        </div>
      </Modal>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}