'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { fmtDate } from '@/lib/constants'

export default function DashboardPage() {
  const { profile } = useAuth()
  const supabase    = createClient()
  const router      = useRouter()

  const [projects,  setProjects]  = useState([])
  const [tasks,     setTasks]     = useState([])
  const [members,   setMembers]   = useState([])
  const [meetings,  setMeetings]  = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [p, t, m, mt] = await Promise.all([
      supabase.from('projects').select('*, project_members(user_id)').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*, projects(name,color,icon)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('meetings').select('*, meeting_participants(user_id)').order('meeting_date', { ascending: true }),
    ])
    setProjects(p.data || [])
    setTasks(t.data    || [])
    setMembers(m.data  || [])
    setMeetings(mt.data || [])
    setLoading(false)
  }

  if (loading || !profile) return <LoadingCard />

  const openTasks   = tasks.filter(t => t.status !== 'done').length
  const lateTasks   = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length
  const onlineCount = members.filter(m => m.online).length
  const today       = new Date().toDateString()
  const todayMtgs   = meetings.filter(m => new Date(m.meeting_date).toDateString() === today).length
  const myTasks     = tasks.filter(t => t.assignee_id === profile.id && t.status !== 'done').slice(0, 5)

  const STATUS = { todo: 'A Fazer', doing: 'Em Progresso', review: 'Em Revisão', done: 'Concluído' }
  const PRIO   = { alta: '🔴', media: '🟡', baixa: '🟢' }

  return (
    <div>
      {/* Saudação */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
          Olá, {profile.name?.split(' ')[0]} 👋
        </h2>
        <p style={{ color: 'var(--text3)', fontSize: 13, margin: 0 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Projetos Ativos',  value: projects.length, color: 'var(--purple3)', sub: 'no total'          },
          { label: 'Tarefas Abertas',  value: openTasks,       color: 'var(--amber)',   sub: `${lateTasks} atrasadas` },
          { label: 'Membros Online',   value: onlineCount,     color: 'var(--green)',   sub: `de ${members.length} na equipe` },
          { label: 'Reuniões Hoje',    value: todayMtgs,       color: 'var(--blue2)',   sub: 'agendadas'          },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        {/* Projetos em destaque */}
        <div>
          <div className="section-header">
            <span className="section-title">Projetos em Destaque</span>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/projects')}>Ver todos →</button>
          </div>
          {projects.slice(0, 4).map(p => (
            <div key={p.id} className="proj-mini-row" onClick={() => router.push('/projects')}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: p.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {p.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div className="fw-700 fs-12">{p.name}</div>
                <div style={{ height: 4, background: 'var(--bg5)', borderRadius: 2, marginTop: 5, width: 140 }}>
                  <div style={{ height: '100%', width: (p.progress || 0) + '%', background: p.color, borderRadius: 2 }} />
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: p.color }}>{p.progress || 0}%</span>
            </div>
          ))}
          {projects.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 13 }}>Nenhum projeto ainda.</p>}
        </div>

        {/* Reuniões próximas */}
        <div>
          <div className="section-header">
            <span className="section-title">Próximas Reuniões</span>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/meetings')}>Ver todas →</button>
          </div>
          {meetings.slice(0, 4).map(m => {
            const dt = new Date(m.meeting_date)
            return (
              <div key={m.id} className="activity-item">
                <div className="activity-icon" style={{ background: 'var(--purple-bg)', color: 'var(--purple3)' }}>📅</div>
                <div style={{ flex: 1 }}>
                  <div className="fw-700 fs-12">{m.title}</div>
                  <div className="fs-11 text-dim">
                    {dt.toLocaleDateString('pt-BR')} às {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
          {meetings.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 13 }}>Nenhuma reunião agendada.</p>}
        </div>
      </div>

      {/* Minhas tarefas */}
      <div className="section-header" style={{ marginTop: 8 }}>
        <span className="section-title">Minhas Tarefas</span>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/tasks')}>Ver quadro →</button>
      </div>
      {myTasks.length === 0
        ? <div className="empty-state"><div className="empty-icon">🎉</div>Nenhuma tarefa atribuída a você!</div>
        : myTasks.map(t => (
          <div key={t.id} className="proj-mini-row" onClick={() => router.push('/tasks')}>
            <span>{PRIO[t.priority]}</span>
            <div style={{ flex: 1 }}>
              <div className="fw-700 fs-12">{t.title}</div>
              <div className="fs-11 text-dim">{t.projects?.name} · {STATUS[t.status]}</div>
            </div>
            {t.due_date && <div className="fs-11 text-dim">{fmtDate(t.due_date)}</div>}
          </div>
        ))
      }
    </div>
  )
}

function LoadingCard() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
      {[1,2,3,4].map(i => (
        <div key={i} className="stat-card" style={{ opacity: .4, animation: 'pulse 1.5s infinite' }}>
          <div style={{ height: 12, background: 'var(--bg5)', borderRadius: 6, marginBottom: 12 }} />
          <div style={{ height: 32, background: 'var(--bg5)', borderRadius: 6, width: '60%' }} />
        </div>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </div>
  )
}