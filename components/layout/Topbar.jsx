'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import { Avatar } from '@/components/ui'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { CAN } from '@/lib/permissions'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard', '/projects': 'Projetos',
  '/tasks': 'Tarefas',       '/members': 'Membros',
  '/chat': 'Chat',           '/meetings': 'Reuniões',
  '/agenda': 'Agenda',       '/files': 'Arquivos',
  '/settings': 'Configurações',
}

function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

export default function Topbar({ profile, pathname, onMenuClick }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const router   = useRouter()
  const role     = profile?.role || 'viewer'

  const { notifications, unreadCount, markAllRead, markOneRead } =
    useNotifications(profile?.id)

  useEffect(() => {
    function handle(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const notifIcons = {
    message: '💬', task_assigned: '✅',
    task_updated: '🔄', deadline: '⏰', project_created: '🚀',
  }

  return (
    <header className="topbar">
      {/* Hambúrguer — só aparece no mobile via CSS */}
      <button
        className="hamburger-btn btn-icon"
        onClick={onMenuClick}
        style={{ marginRight: 4 }}
        title="Menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6"  x2="21" y2="6"  />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <h1 className="topbar-title">{PAGE_TITLES[pathname] || 'KRONOS'}</h1>

      <div className="topbar-actions">
        {/* Badge Supabase */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 8, fontSize: 11,
        }} className="hide-mobile">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
          <span style={{ color: 'var(--text3)' }}>Supabase</span>
        </div>

        {/* Notificações */}
        {CAN.seeNotifications(role) && (
          <div style={{ position: 'relative' }} ref={panelRef}>
            <button
              className="btn-icon"
              style={{ position: 'relative' }}
              onClick={() => { setOpen(p => !p); if (!open && unreadCount > 0) markAllRead() }}
            >
              <Icon name="bell" size={16} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: 'var(--red)', color: '#fff', fontSize: 9, fontWeight: 800,
                  width: 16, height: 16, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {open && (
              <div className="notif-panel">
                <div className="notif-head">
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Notificações</span>
                  {notifications.length > 0 && (
                    <button onClick={markAllRead} style={{
                      background: 'none', border: 'none', color: 'var(--purple3)',
                      fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                    }}>Marcar tudo lido</button>
                  )}
                </div>
                {notifications.length === 0
                  ? <div className="empty-state" style={{ padding: '24px 20px' }}><div className="empty-icon">🔔</div>Sem notificações</div>
                  : (
                    <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                      {notifications.map(n => (
                        <div
                          key={n.id}
                          className={`notif-item${!n.read ? ' unread' : ''}`}
                          onClick={() => { markOneRead(n.id); if (n.link) { router.push(n.link); setOpen(false) } }}
                        >
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{notifIcons[n.type] || '📌'}</span>
                          <div style={{ flex: 1 }}>
                            <div className="notif-title">{n.title}</div>
                            {n.body && <div className="notif-body">{n.body}</div>}
                            <div className="notif-time">{timeAgo(n.created_at)}</div>
                          </div>
                          {!n.read && <div className="notif-dot" />}
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            )}
          </div>
        )}

        <Avatar name={profile?.name} color={profile?.color} size={30} />
      </div>
    </header>
  )
}