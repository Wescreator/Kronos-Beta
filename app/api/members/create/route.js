import { supabaseAdmin }      from '@/lib/supabase/admin'
import { createClient }       from '@/lib/supabase/server'
import { sendWelcomeEmail }   from '@/lib/email'
import { NextResponse }       from 'next/server'

const COLORS = ['#7c3aed','#2563eb','#10b981','#ec4899','#f59e0b','#14b8a6','#ef4444','#8b5cf6']

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const { data: requestProfile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()

    if (!requestProfile || requestProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem criar usuários.' }, { status: 403 })
    }

    const { name, email, password, role, position, department } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 })
    }

    const color = COLORS[Math.floor(Math.random() * COLORS.length)]

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name, role: role || 'dev',
        position: position || '',
        department: department || '',
        color,
        must_change_password: true,
      },
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Atualiza perfil com campos extras
    if (data.user) {
      await supabaseAdmin.from('profiles').update({
        position:             position   || '',
        department:           department || '',
        must_change_password: true,
      }).eq('id', data.user.id)
    }

    // Envia e-mail de boas-vindas (não bloqueia se falhar)
    sendWelcomeEmail({ name, email, password, role: role || 'dev', position }).catch(err =>
      console.error('[Email] Falha no e-mail de boas-vindas:', err)
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Create member error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}