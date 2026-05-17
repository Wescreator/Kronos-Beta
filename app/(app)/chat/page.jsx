'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { useChat } from '@/lib/hooks/useChat'
import { Avatar, Modal, MemberChecklist, Toast } from '@/components/ui'
import Icon from '@/components/ui/Icon'
import { CAN } from '@/lib/permissions'
 
export default function ChatPage() {
  const { profile } = useAuth()
  const supabase = createClient()
 
  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [allMembers, setAllMembers] = useState([])
  const [search, setSearch] = useState('')
  const [input, setInput] = useState('')
  const [toast, setToast] = useState('')
  const [showNewDM, setShowNewDM] = useState(false)
  const [showNewChan, setShowNewChan] = useState(false)
  const [chanName, setChanName] = useState('')
  const [chanMembers, setChanMembers] = useState([])
  const [loading, setLoading] = useState(true)
 
  const { messages, loading: msgLoading, sendMessage, deleteMessage, bottomRef } =
    useChat(activeRoom?.id)
 
  useEffect(() => {
    if (profile) {
      fetchRooms()
      fetchMembers()
    }
  }, [profile])
 
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel('rooms_list')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_room_members',
        filter: `user_id=eq.${profile.id}`,
      }, () => fetchRooms())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile])
 
  async function fetchRooms() {
    const { data } = await supabase
      .from('chat_room_members')
      .select('room_id, chat_rooms(id, name, type, created_by, created_at)')
      .eq('user_id', profile.id)
 
    if (!data) { setLoading(false); return }
 
    const enriched = await Promise.all(
      data.map(async (r) => {
        const room = r.chat_rooms
        if (!room) return null
 
        if (room.type === 'dm') {
          const { data: members } = await supabase
            .from('chat_room_members')
            .select('profiles(id, name, color)')
            .eq('room_id', room.id)
            .neq('user_id', profile.id)
            .limit(1)
          const other = members?.[0]?.profiles
          return { ...room, displayName: other?.name || 'Chat', otherUser: other }
        }
 
        return { ...room, displayName: room.name }
      })
    )
 
    setRooms(enriched.filter(Boolean))
    setLoading(false)
  }
 
  async function fetchMembers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, color, role, position')
    setAllMembers((data || []).filter(m => m.id !== profile.id))
  }
 
  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }
 
  async function createDM(otherUserId) {
    // Busca todas as salas do usuário atual
    const { data: myRooms } = await supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('user_id', profile.id)
 
    if (myRooms && myRooms.length > 0) {
      const myRoomIds = myRooms.map(r => r.room_id)
 
      // Verifica se o outro usuário está em alguma dessas salas
      const { data: shared } = await supabase
        .from('chat_room_members')
        .select('room_id')
        .eq('user_id', otherUserId)
        .in('room_id', myRoomIds)
 
      if (shared && shared.length > 0) {
        // Verifica se alguma sala compartilhada é DM
        const { data: dmRoom } = await supabase
          .from('chat_rooms')
          .select('*')
          .in('id', shared.map(s => s.room_id))
          .eq('type', 'dm')
          .single()
 
        if (dmRoom) {
          const other = allMembers.find(m => m.id === otherUserId)
          setActiveRoom({ ...dmRoom, displayName: other?.name || 'Chat', otherUser: other })
          setShowNewDM(false)
          return
        }
      }
    }
 
    // Cria nova sala DM
    const { data: room, error } = await supabase
      .from('chat_rooms')
      .insert({ type: 'dm', created_by: profile.id })
      .select()
      .single()
 
    if (error) {
      showToast('Erro ao criar conversa: ' + error.message)
      return
    }
 
    // Adiciona os dois membros
    const { error: memberError } = await supabase
      .from('chat_room_members')
      .insert([
        { room_id: room.id, user_id: profile.id },
        { room_id: room.id, user_id: otherUserId },
      ])
 
    if (memberError) {
      showToast('Erro ao adicionar membros: ' + memberError.message)
      return
    }
 
    const other = allMembers.find(m => m.id === otherUserId)
    await fetchRooms()
    setActiveRoom({ ...room, displayName: other?.name || 'Chat', otherUser: other })
    setShowNewDM(false)
    showToast('Conversa iniciada!')
  }
 
  async function createChannel() {
    if (!chanName.trim()) { showToast('Nome do canal obrigatório.'); return }
 
    const { data: room, error } = await supabase
      .from('chat_rooms')
      .insert({ name: chanName.trim(), type: 'channel', created_by: profile.id })
      .select()
      .single()
 
    if (error) { showToast('Erro ao criar canal.'); return }
 
    const membersToAdd = [...new Set([...chanMembers, profile.id])]
    await supabase.from('chat_room_members').insert(
      membersToAdd.map(uid => ({ room_id: room.id, user_id: uid }))
    )
 
    await fetchRooms()
    setActiveRoom({ ...room, displayName: chanName.trim() })
    setChanName('')
    setChanMembers([])
    setShowNewChan(false)
    showToast('Canal criado!')
  }
 
  async function deleteRoom(room) {
    const isChannel = room.type === 'channel'
    if (isChannel && !CAN.deleteProject(profile.role)) {
      showToast('Apenas admin ou gerente podem excluir canais.')
      return
    }
 
    const { error } = await supabase
      .from('chat_rooms')
      .delete()
      .eq('id', room.id)
 
    if (error) { showToast('Erro ao excluir.'); return }
 
    if (activeRoom?.id === room.id) setActiveRoom(null)
    await fetchRooms()
    showToast((isChannel ? 'Canal' : 'Conversa') + ' excluído.')
  }
 
  async function send() {
    if (!input.trim() || !activeRoom || !profile) return
    await sendMessage(input.trim(), profile.id)
    setInput('')
  }
 
  const filteredRooms = rooms.filter(r =>
    r.displayName?.toLowerCase().includes(search.toLowerCase())
  )
  const channels = filteredRooms.filter(r => r.type === 'channel')
  const dms = filteredRooms.filter(r => r.type === 'dm')
 
  if (!profile) return null
 
  return (
    <div className="chat-layout">
 
      {/* Painel esquerdo */}
      <div className="chat-rooms">
 
        {/* Busca */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg3)', border: '1px solid var(--border2)',
            borderRadius: 8, padding: '7px 10px',
          }}>
            <Icon name="search" size={13} style={{ color: 'var(--text3)' }} />
            <input
              placeholder="Buscar conversas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 12, fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
 
        {/* Botões de ação */}
        <div style={{
          display: 'flex', gap: 6, padding: '10px 12px',
          borderBottom: '1px solid var(--border)',
        }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
            onClick={() => setShowNewDM(true)}
          >
            <Icon name="plus" size={12} /> Mensagem
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
            onClick={() => { setChanMembers([profile.id]); setShowNewChan(true) }}
          >
            <Icon name="users" size={12} /> Canal
          </button>
        </div>
 
        {/* Lista de salas */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '20px 16px', color: 'var(--text3)', fontSize: 12, textAlign: 'center' }}>
              Carregando...
            </div>
          )}
 
          {!loading && rooms.length === 0 && (
            <div style={{ padding: '24px 16px', color: 'var(--text3)', fontSize: 12, textAlign: 'center', lineHeight: 1.7 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
              Nenhuma conversa ainda.<br />
              Inicie um chat ou crie um canal.
            </div>
          )}
 
          {channels.length > 0 && (
            <div>
              <div style={{
                padding: '10px 14px 4px', fontSize: 10, fontWeight: 700,
                color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.8px',
              }}>
                Canais
              </div>
              {channels.map(r => (
                <RoomItem
                  key={r.id}
                  room={r}
                  active={activeRoom?.id === r.id}
                  profile={profile}
                  onClick={() => setActiveRoom(r)}
                  onDelete={() => deleteRoom(r)}
                />
              ))}
            </div>
          )}
 
          {dms.length > 0 && (
            <div>
              <div style={{
                padding: '10px 14px 4px', fontSize: 10, fontWeight: 700,
                color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.8px',
              }}>
                Mensagens Diretas
              </div>
              {dms.map(r => (
                <RoomItem
                  key={r.id}
                  room={r}
                  active={activeRoom?.id === r.id}
                  profile={profile}
                  onClick={() => setActiveRoom(r)}
                  onDelete={() => deleteRoom(r)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
 
      {/* Painel direito */}
      <div className="chat-main">
        {!activeRoom ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 14, color: 'var(--text3)', height: '100%',
          }}>
            <div style={{ fontSize: 48 }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Selecione uma conversa</div>
            <div style={{ fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
              Escolha um chat na lista ao lado<br />ou inicie uma nova conversa
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNewDM(true)}>
                <Icon name="plus" size={13} /> Nova mensagem
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setChanMembers([profile.id]); setShowNewChan(true) }}
              >
                <Icon name="users" size={13} /> Criar canal
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
 
            {/* Header da sala */}
            <div className="chat-head">
              <div style={{
                width: 34, height: 34,
                borderRadius: activeRoom.type === 'dm' ? '50%' : 9,
                background: 'var(--purple-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, color: 'var(--purple3)',
              }}>
                {activeRoom.type === 'dm'
                  ? (activeRoom.displayName?.[0] || '?').toUpperCase()
                  : '#'
                }
              </div>
              <div style={{ flex: 1 }}>
                <div className="chat-head-name">{activeRoom.displayName}</div>
                <div className="chat-head-members">
                  {activeRoom.type === 'channel' ? 'Canal' : 'Mensagem direta'}
                </div>
              </div>
              <button
                className="btn-icon btn-sm"
                style={{ color: 'var(--red)' }}
                title="Excluir"
                onClick={() => deleteRoom(activeRoom)}
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
 
            {/* Mensagens */}
            <div className="chat-msgs" style={{ flex: 1 }}>
              {msgLoading && (
                <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, padding: 20 }}>
                  Carregando mensagens...
                </div>
              )}
 
              {!msgLoading && messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '40px 20px' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>👋</div>
                  Nenhuma mensagem ainda. Seja o primeiro!
                </div>
              )}
 
              {messages.map(m => {
                const isMine = m.sender_id === profile.id
                const name = m.profiles?.name || 'Usuário'
                const color = m.profiles?.color || 'var(--purple)'
                return (
                  <div key={m.id} className={`msg-wrap${isMine ? ' mine' : ''}`}>
                    {!isMine && (
                      <Avatar name={name} color={color} size={30} />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 380 }}>
                      <div className="msg-bubble">
                        {!isMine && (
                          <div className="msg-sender">{name}</div>
                        )}
                        <div className="msg-text">{m.content}</div>
                        <div style={{
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', marginTop: 4,
                        }}>
                          <div className="msg-time">
                            {new Date(m.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </div>
                          {isMine && (
                            <button
                              onClick={() => deleteMessage(m.id)}
                              style={{
                                background: 'none', border: 'none',
                                color: 'rgba(239,68,68,.4)', cursor: 'pointer',
                                fontSize: 11, padding: '0 2px', lineHeight: 1,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)' }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(239,68,68,.4)' }}
                            >
                              ✕ apagar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
 
              <div ref={bottomRef} />
            </div>
 
            {/* Input */}
            <div className="chat-input-wrap">
              <input
                className="chat-input"
                placeholder={`Mensagem para ${activeRoom.displayName}...`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
              />
              <button className="chat-send" onClick={send}>
                <Icon name="send" size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
 
      {/* Modal: Nova mensagem direta */}
      <Modal open={showNewDM} onClose={() => setShowNewDM(false)} title="Nova Mensagem" icon="💬">
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
          Selecione um membro para conversar:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
          {allMembers.length === 0 && (
            <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              Nenhum outro membro cadastrado.
            </div>
          )}
          {allMembers.map(m => (
            <div
              key={m.id}
              onClick={() => createDM(m.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'var(--bg3)',
                transition: 'border-color .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <Avatar name={m.name} color={m.color} size={32} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {m.position || 'Membro'}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setShowNewDM(false)}>Fechar</button>
        </div>
      </Modal>
 
      {/* Modal: Novo canal */}
      <Modal open={showNewChan} onClose={() => setShowNewChan(false)} title="Novo Canal" icon="📢">
        <div className="form-group">
          <label className="form-label">Nome do canal</label>
          <input
            className="form-input"
            placeholder="Ex: projetos-2025, clientes, geral..."
            value={chanName}
            onChange={e => setChanName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Adicionar membros</label>
          <MemberChecklist
            members={allMembers}
            selected={chanMembers}
            onChange={setChanMembers}
          />
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setShowNewChan(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={createChannel}>Criar Canal</button>
        </div>
      </Modal>
 
      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}
 
// Componente de item de sala na lista
function RoomItem({ room, active, profile, onClick, onDelete }) {
  const [hover, setHover] = useState(false)
 
  return (
    <div
      className={`chat-room-item${active ? ' active' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative' }}
    >
      <div style={{
        width: 32, height: 32,
        borderRadius: room.type === 'dm' ? '50%' : 8,
        background: 'var(--purple-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: 'var(--purple3)', flexShrink: 0,
      }}>
        {room.type === 'dm'
          ? (room.displayName?.[0] || '?').toUpperCase()
          : '#'
        }
      </div>
 
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {room.displayName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
          {room.type === 'channel' ? 'Canal' : 'Direto'}
        </div>
      </div>
 
      {hover && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{
            background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,.3)',
            borderRadius: 6, color: 'var(--red)', cursor: 'pointer',
            padding: '3px 6px', fontSize: 11, flexShrink: 0, display: 'flex',
            alignItems: 'center',
          }}
        >
          <Icon name="trash" size={12} />
        </button>
      )}
    </div>
  )
}
 