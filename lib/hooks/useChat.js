'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useChat(roomId) {
  const [messages, setMessages] = useState([])
  const [loading,  setLoading]  = useState(true)
  const supabase  = createClient()
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!roomId) { setMessages([]); setLoading(false); return }
    setLoading(true)
    fetchMessages()

    const channel = supabase
      .channel(`chat_room_${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        const { data: profile } = await supabase
          .from('profiles').select('name,color')
          .eq('id', payload.new.sender_id).single()
        setMessages(prev => [...prev, { ...payload.new, profiles: profile }])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [roomId])

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(name,color)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages(data || [])
    setLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView(), 100)
  }

  async function sendMessage(content, senderId) {
    if (!content.trim() || !roomId) return
    await supabase.from('messages').insert({
      room_id: roomId, room: roomId,
      sender_id: senderId, content: content.trim(),
    })
  }

  async function deleteMessage(id) {
    await supabase.from('messages').delete().eq('id', id)
  }

  return { messages, loading, sendMessage, deleteMessage, bottomRef }
}