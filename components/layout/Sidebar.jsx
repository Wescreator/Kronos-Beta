'use client'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { Avatar } from '@/components/ui'
import { ROLE_LABELS, CAN } from '@/lib/permissions'

const NAV = [
  { section: 'Principal', items: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/projects',  label: 'Projetos',  icon: 'folder'    },
    { href: '/tasks',     label: 'Tarefas',   icon: 'kanban'    },
    { href: '/meetings',  label: 'Reuniões',  icon: 'video'     },
  ]},
  { section: 'Equipe', items: [
    { href: '/members',   label: 'Membros',   icon: 'users'     },
    { href: '/chat',      label: 'Chat',      icon: 'chat'      },
    { href: '/agenda',    label: 'Agenda',    icon: 'calendar'  },
    { href: '/files',     label: 'Arquivos',  icon: 'file'      },
  ]},
]

export default function Sidebar({ profile, pathname, signOut, isOpen, onClose }) {
  const role = profile?.role || 'viewer'

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">K</div>
        <div>
          <div className="logo-name">KRON<em>OS</em></div>
          <div className="logo-version">v2 · Supabase</div>
        </div>
        {/* Botão fechar no mobile */}
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: 'var(--text3)', cursor: 'pointer', padding: 4,
            display: 'none',
          }}
          className="sidebar-close-btn"
        >
          <Icon name="x" size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(section => (
          <div key={section.section} className="nav-section">
            <div className="nav-label">{section.section}</div>
            {section.items.map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div className={`nav-btn${active ? ' active' : ''}`}>
                    <span className="nav-icon"><Icon name={item.icon} size={16} /></span>
                    {item.label}
                  </div>
                </Link>
              )
            })}
          </div>
        ))}

        {CAN.settings(role) && (
          <div className="nav-section">
            <div className="nav-label">Sistema</div>
            <Link href="/settings" style={{ textDecoration: 'none' }}>
              <div className={`nav-btn${pathname === '/settings' ? ' active' : ''}`}>
                <span className="nav-icon"><Icon name="settings" size={16} /></span>
                Configurações
              </div>
            </Link>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="sidebar-user">
        <Avatar name={profile?.name} color={profile?.color} size={32} />
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{profile?.name?.split(' ')[0]}</div>
          <div className="sidebar-user-role">
            {profile?.position || ROLE_LABELS[role]}
          </div>
        </div>
        <button className="logout-btn" onClick={signOut} title="Sair">
          <Icon name="logout" size={14} />
        </button>
      </div>
    </aside>
  )
}