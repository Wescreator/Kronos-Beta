'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return
    fetchNotifications()

    // Escuta novas notificações em tempo real (Supabase Realtime)
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    setNotifications(data || [])
    setUnreadCount((data || []).filter(n => !n.read).length)
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function markOneRead(id) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  return { notifications, unreadCount, markAllRead, markOneRead }
}