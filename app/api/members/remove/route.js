import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'

export async function POST(request) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId obrigatório.' }, { status: 400 })

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}