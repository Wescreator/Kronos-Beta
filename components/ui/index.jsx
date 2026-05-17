'use client'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/permissions'
import { COLORS_LIST, ICONS_LIST, makeInitials } from '@/lib/constants'

// ── Avatar ─────────────────────────────────────────────────
export function Avatar({ name, color = '#7c3aed', size = 28, style = {} }) {
  const initials = makeInitials(name || '?')
  const fontSize = size < 26 ? 9 : size < 32 ? 11 : 13
  return (
    <div className="avatar" style={{
      width: size, height: size, background: color + '22',
      color, fontSize, border: `1.5px solid ${color}55`, ...style
    }}>
      {initials}
    </div>
  )
}

// ── Tags ───────────────────────────────────────────────────
export function PriorityTag({ p }) {
  return <span className={`tag priority-${p}`}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
}

export function RoleBadge({ r }) {
  return <span className={`tag role-${r}`}>{ROLE_LABELS[r] || r}</span>
}

// ── Modal ──────────────────────────────────────────────────
export function Modal({ open, onClose, title, icon = '📋', children, lg }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal${lg ? ' modal-lg' : ''}`}>
        <div className="modal-title">
          <div className="modal-title-icon">{icon}</div>
          {title}
          <button onClick={onClose} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: 'var(--text3)', cursor: 'pointer', fontSize: 18, lineHeight: 1
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── ColorPicker ────────────────────────────────────────────
export function ColorPicker({ value, onChange }) {
  return (
    <div className="color-picker">
      {COLORS_LIST.map(c => (
        <div key={c} className={`color-dot${value === c ? ' selected' : ''}`}
          style={{ background: c }} onClick={() => onChange(c)} />
      ))}
    </div>
  )
}

// ── IconPicker ─────────────────────────────────────────────
export function IconPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {ICONS_LIST.map(ic => (
        <div key={ic} onClick={() => onChange(ic)} style={{
          width: 36, height: 36, borderRadius: 9, fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: value === ic ? 'var(--purple-bg)' : 'var(--bg3)',
          border: `2px solid ${value === ic ? 'var(--purple)' : 'transparent'}`,
          cursor: 'pointer', transition: '.15s',
        }}>{ic}</div>
      ))}
    </div>
  )
}

// ── MemberChecklist ────────────────────────────────────────
export function MemberChecklist({ members, selected, onChange }) {
  const toggle = id => onChange(
    selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]
  )
  return (
    <div className="member-check">
      {members.map(m => (
        <label key={m.id} className="member-check-item">
          <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <Avatar name={m.name} color={m.color} size={22} />
            <span style={{ fontSize: 13 }}>{m.name}</span>
            <RoleBadge r={m.role} />
          </div>
        </label>
      ))}
    </div>
  )
}

// ── Toast ──────────────────────────────────────────────────
export function Toast({ message, onClose }) {
  if (!message) return null
  return (
    <div className="toast">
      <span>{message}</span>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', color: 'var(--text3)',
        cursor: 'pointer', fontSize: 16, marginLeft: 8
      }}>✕</button>
    </div>
  )
}