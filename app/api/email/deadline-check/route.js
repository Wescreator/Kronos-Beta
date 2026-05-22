import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sendDeadlineReminderEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function GET(request) {
  // Proteção: só roda via cron
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // Inicializa Supabase APENAS dentro da função
    // Isso evita erro no build da Vercel
    const supabaseAdmin = getSupabaseAdmin()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    const todayStr = new Date().toISOString().split('T')[0]

    // Busca tarefas que vencem amanhã
    const { data: tasks, error } = await supabaseAdmin
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        profiles!tasks_assignee_id_fkey(
          id,
          name,
          email
        ),
        projects(name)
      `)
      .gte('due_date', todayStr)
      .lte('due_date', tomorrowStr)
      .neq('status', 'done')
      .not('assignee_id', 'is', null)

    if (error) {
      console.error('[Supabase Error]', error)

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        message: 'Nenhuma tarefa com prazo próximo.',
        sent: 0,
      })
    }

    // Agrupa tarefas por usuário
    const byUser = {}

    tasks.forEach((task) => {
      const user = task.profiles

      if (!user?.email) return

      if (!byUser[user.id]) {
        byUser[user.id] = {
          name: user.name,
          email: user.email,
          tasks: [],
        }
      }

      byUser[user.id].tasks.push({
        title: task.title,
        due_date: task.due_date,
        project_name: task.projects?.name || 'Projeto',
      })
    })

    // Envia emails
    let sent = 0

    for (const userData of Object.values(byUser)) {
      await sendDeadlineReminderEmail({
        toEmail: userData.email,
        toName: userData.name,
        tasks: userData.tasks,
      })

      sent++
    }

    return NextResponse.json({
      message: `${sent} e-mail(s) enviado(s).`,
      sent,
    })
  } catch (err) {
    console.error('[Cron Error]', err)

    return NextResponse.json(
      { error: err.message || 'Erro interno.' },
      { status: 500 }
    )
  }
}