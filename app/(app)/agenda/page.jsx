'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Modal, ColorPicker, MemberChecklist, Toast } from '@/components/ui'
import Icon from '@/components/ui/Icon'
import { CAN } from '@/lib/permissions'
import { MONTHS, MONTHS_SHORT } from '@/lib/constants'

export default function AgendaPage() {
  const { profile } = useAuth()
  const supabase    = createClient()

  const [events,   setEvents]   = useState([])
  const [members,  setMembers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [toast,    setToast]    = useState('')
  const [parts,    setParts]    = useState([])
  const [selDay,   setSelDay]   = useState(null)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear,  setCalYear]  = useState(new Date().getFullYear())
  const [form,     setForm]     = useState({ title: '', description: '', event_date: '', event_time: '10:00', color: '#7c3aed' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [ev, m] = await Promise.all([
      supabase.from('events').select('*, event_participants(user_id, profiles(name,color))').order('event_date', { ascending: true }),
      supabase.from('profiles').select('*'),
    ])
    setEvents(ev.data || [])
    setMembers(m.data  || [])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  function changeMonth(dir) {
    let m = calMonth + dir, y = calYear
    if (m > 11) { m = 0; y++ }
    if (m < 0)  { m = 11; y-- }
    setCalMonth(m); setCalYear(y); setSelDay(null)
  }

  async function createEvent() {
    if (!form.title || !form.event_date) return showToast('❌ Preencha título e data.')
    const { data, error } = await supabase.from('events').insert({ ...form, created_by: profile.id }).select().single()
    if (error) { showToast('❌ Erro ao criar evento.'); return }
    if (parts.length > 0) {
      await supabase.from('event_participants').insert(parts.map(uid => ({ event_id: data.id, user_id: uid })))
    }
    showToast('📅 Evento criado!')
    setModal(false)
    setForm({ title: '', description: '', event_date: '', event_time: '10:00', color: '#7c3aed' })
    setParts([])
    fetchAll()
  }

  async function deleteEvent(id) {
    await supabase.from('events').delete().eq('id', id)
    showToast('🗑️ Evento removido.')
    fetchAll()
  }

  if (loading || !profile) return <div className="empty-state"><div className="empty-icon">⏳</div>Carregando...</div>

  const role      = profile.role
  const today     = new Date()
  const firstDay  = new Date(calYear, calMonth, 1).getDay()
  const daysInMo  = new Date(calYear, calMonth + 1, 0).getDate()
  const eventDays = new Set(events.map(e => e.event_date))

  const visibleEvents = selDay
    ? events.filter(e => e.event_date === selDay)
    : events.sort((a, b) => a.event_date.localeCompare(b.event_date))

  const DAY_LABELS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

  return (
    <div>
      <div className="section-header">
        <span className="section-title">Agenda</span>
        {CAN.createEvent(role) && (
          <button className="btn btn-primary btn-sm" onClick={() => { setParts([profile.id]); setModal(true) }}>
            <Icon name="plus" size={14} /> Novo Evento
          </button>
        )}
      </div>

      <div className="agenda-layout">
        {/* Calendário */}
        <div className="cal-card">
          <div className="cal-nav">
            <button className="btn-icon btn-sm" onClick={() => changeMonth(-1)}><Icon name="chevLeft" size={14} /></button>
            <span className="cal-month-name">{MONTHS[calMonth]} {calYear}</span>
            <button className="btn-icon btn-sm" onClick={() => changeMonth(1)}><Icon name="chevRight" size={14} /></button>
          </div>
          <div className="cal-day-labels">
            {DAY_LABELS.map(d => <div key={d} className="cal-day-label">{d}</div>)}
          </div>
          <div className="cal-dates">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className="cal-date empty" />)}
            {Array.from({ length: daysInMo }).map((_, i) => {
              const d       = i + 1
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
              const isToday = today.getDate() === d && today.getMonth() === calMonth && today.getFullYear() === calYear
              const isSel   = selDay === dateStr
              const hasEv   = eventDays.has(dateStr)
              return (
                <button key={d}
                  className={`cal-date${isToday ? ' today' : ''}${isSel ? ' selected' : ''}${hasEv ? ' has-event' : ''}`}
                  onClick={() => setSelDay(isSel ? null : dateStr)}>
                  {d}
                </button>
              )
            })}
          </div>
        </div>

        {/* Lista de eventos */}
        <div style={{ flex: 1 }}>
          <div className="section-header" style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {selDay
                ? `Eventos — ${new Date(selDay + 'T12:00:00').toLocaleDateString('pt-BR')}`
                : 'Todos os eventos'}
            </span>
            {selDay && <button className="btn btn-ghost btn-sm" onClick={() => setSelDay(null)}>Ver todos</button>}
          </div>

          {visibleEvents.length === 0 && <div className="empty-state"><div className="empty-icon">📅</div>Nenhum evento.</div>}

          {visibleEvents.map(ev => {
            const pList = (ev.event_participants || []).map(p => p.profiles).filter(Boolean)
            const [h]   = (ev.event_time || '00:00').split(':')
            return (
              <div key={ev.id} className="event-card">
                <div className="event-timebox">
                  <div className="event-time-val">{ev.event_time?.slice(0, 5) || '--:--'}</div>
                  <div className="event-time-ampm">{parseInt(h) >= 12 ? 'PM' : 'AM'}</div>
                </div>
                <div className="event-main">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
                    <div className="event-name">{ev.title}</div>
                  </div>
                  {ev.description && <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>{ev.description}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar-stack">
                      {pList.slice(0, 4).map((p, i) => (
                        <div key={i} className="avatar" style={{ width: 20, height: 20, background: p.color + '22', color: p.color, fontSize: 8, border: `1.5px solid ${p.color}55` }}>
                          {p.name?.slice(0, 2).toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <span className="fs-11 text-dim">{pList.map(p => p.name?.split(' ')[0]).join(', ')}</span>
                  </div>
                </div>
                {CAN.createEvent(role) && (
                  <button className="btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteEvent(ev.id)}>
                    <Icon name="trash" size={13} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Novo Evento" icon="📅" lg>
        <div className="form-group">
          <label className="form-label">Título</label>
          <input className="form-input" placeholder="Ex: Entrega do protótipo"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data</label>
            <input type="date" className="form-input" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Horário</label>
            <input type="time" className="form-input" value={form.event_time} onChange={e => setForm({ ...form, event_time: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Cor</label>
          <ColorPicker value={form.color} onChange={v => setForm({ ...form, color: v })} />
        </div>
        <div className="form-group">
          <label className="form-label">Participantes</label>
          <MemberChecklist members={members} selected={parts} onChange={setParts} />
        </div>
        <div className="form-group">
          <label className="form-label">Descrição</label>
          <textarea className="form-textarea" placeholder="Detalhes do evento..."
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={createEvent}>Criar Evento</button>
        </div>
      </Modal>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}