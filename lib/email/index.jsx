import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.RESEND_FROM_EMAIL || 'KRONOS <onboarding@resend.dev>'

/**
 * Envia um e-mail de boas-vindas ao novo membro
 */
export async function sendWelcomeEmail({ name, email, password, role, position }) {
  const roleLabels = {
    admin: 'Administrador', manager: 'Gerente',
    dev: 'Colaborador', viewer: 'Visualizador',
  }

  try {
    await resend.emails.send({
      from:    FROM,
      to:      email,
      subject: '🚀 Bem-vindo ao KRONOS',
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"/></head>
        <body style="margin:0;padding:0;background:#07070d;font-family:'Segoe UI',sans-serif">
          <div style="max-width:560px;margin:0 auto;padding:40px 20px">

            <!-- Logo -->
            <div style="text-align:center;margin-bottom:32px">
              <div style="display:inline-block;width:52px;height:52px;background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:14px;line-height:52px;font-size:26px;font-weight:900;color:#fff">K</div>
              <div style="color:#c4b5fd;font-size:22px;font-weight:900;margin-top:10px;letter-spacing:-0.5px">KRONOS</div>
              <div style="color:#60607a;font-size:12px;margin-top:4px">Gestão de Equipe</div>
            </div>

            <!-- Card -->
            <div style="background:#0f0f1a;border:1px solid #2a2a4a;border-radius:16px;padding:32px">
              <h2 style="color:#f0f0ff;margin:0 0 8px;font-size:20px">Olá, ${name}! 👋</h2>
              <p style="color:#a0a0c8;margin:0 0 24px;font-size:14px;line-height:1.6">
                Você foi adicionado ao KRONOS. Abaixo estão suas credenciais de acesso.
              </p>

              <!-- Credenciais -->
              <div style="background:#161625;border:1px solid #3a3a60;border-radius:10px;padding:18px;margin-bottom:24px">
                <div style="margin-bottom:12px">
                  <div style="color:#60607a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">E-mail</div>
                  <div style="color:#f0f0ff;font-size:14px;font-weight:600">${email}</div>
                </div>
                <div style="margin-bottom:12px">
                  <div style="color:#60607a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Senha inicial</div>
                  <div style="color:#c4b5fd;font-size:14px;font-weight:600;font-family:monospace">${password}</div>
                </div>
                <div style="margin-bottom:12px">
                  <div style="color:#60607a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Cargo</div>
                  <div style="color:#f0f0ff;font-size:14px">${position || 'Membro'}</div>
                </div>
                <div>
                  <div style="color:#60607a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Nível de acesso</div>
                  <div style="color:#f0f0ff;font-size:14px">${roleLabels[role] || role}</div>
                </div>
              </div>

              <!-- Aviso troca de senha -->
              <div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:9px;padding:14px;margin-bottom:24px">
                <div style="color:#f59e0b;font-size:13px;font-weight:600;margin-bottom:4px">🔐 Importante</div>
                <div style="color:#a0a0c8;font-size:12px;line-height:1.5">
                  No seu primeiro acesso você será solicitado a criar uma nova senha pessoal.
                  A senha acima é temporária e será substituída.
                </div>
              </div>

              <!-- Botão -->
              <div style="text-align:center">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login"
                  style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:14px;font-weight:700">
                  Acessar o KRONOS →
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align:center;margin-top:24px;color:#60607a;font-size:11px;line-height:1.6">
              Este e-mail foi enviado automaticamente pelo KRONOS.<br/>
              Não responda este e-mail.
            </div>
          </div>
        </body>
        </html>
      `,
    })
    return { success: true }
  } catch (err) {
    console.error('[Email] Erro ao enviar boas-vindas:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Notifica o responsável ao ser atribuído a uma tarefa
 */
export async function sendTaskAssignedEmail({ toEmail, toName, taskTitle, projectName, dueDate, assignedBy }) {
  try {
    await resend.emails.send({
      from:    FROM,
      to:      toEmail,
      subject: `✅ Nova tarefa atribuída: ${taskTitle}`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"/></head>
        <body style="margin:0;padding:0;background:#07070d;font-family:'Segoe UI',sans-serif">
          <div style="max-width:560px;margin:0 auto;padding:40px 20px">
            <div style="text-align:center;margin-bottom:28px">
              <div style="display:inline-block;width:44px;height:44px;background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:12px;line-height:44px;font-size:22px;font-weight:900;color:#fff">K</div>
            </div>
            <div style="background:#0f0f1a;border:1px solid #2a2a4a;border-radius:16px;padding:28px">
              <h2 style="color:#f0f0ff;margin:0 0 6px;font-size:18px">Nova tarefa atribuída</h2>
              <p style="color:#a0a0c8;margin:0 0 20px;font-size:13px">Olá ${toName}, você tem uma nova tarefa.</p>
              <div style="background:#161625;border:1px solid #3a3a60;border-left:3px solid #7c3aed;border-radius:0 10px 10px 0;padding:16px;margin-bottom:20px">
                <div style="color:#c4b5fd;font-size:16px;font-weight:700;margin-bottom:8px">${taskTitle}</div>
                <div style="color:#a0a0c8;font-size:12px;margin-bottom:4px">📁 Projeto: <strong style="color:#f0f0ff">${projectName}</strong></div>
                ${dueDate ? `<div style="color:#a0a0c8;font-size:12px;margin-bottom:4px">📅 Prazo: <strong style="color:#f59e0b">${new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></div>` : ''}
                <div style="color:#a0a0c8;font-size:12px">👤 Atribuído por: <strong style="color:#f0f0ff">${assignedBy}</strong></div>
              </div>
              <div style="text-align:center">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks"
                  style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:11px 28px;border-radius:9px;font-size:13px;font-weight:700">
                  Ver tarefa →
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    })
    return { success: true }
  } catch (err) {
    console.error('[Email] Erro ao notificar tarefa:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Lembrete de prazo próximo
 */
export async function sendDeadlineReminderEmail({ toEmail, toName, tasks }) {
  if (!tasks || tasks.length === 0) return { success: true }

  const taskList = tasks.map(t => `
    <div style="background:#161625;border:1px solid #3a3a60;border-left:3px solid #ef4444;border-radius:0 9px 9px 0;padding:12px;margin-bottom:8px">
      <div style="color:#f0f0ff;font-size:13px;font-weight:600;margin-bottom:4px">${t.title}</div>
      <div style="color:#a0a0c8;font-size:11px">📁 ${t.project_name} · 📅 Prazo: <strong style="color:#ef4444">${new Date(t.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></div>
    </div>
  `).join('')

  try {
    await resend.emails.send({
      from:    FROM,
      to:      toEmail,
      subject: `⏰ ${tasks.length} tarefa${tasks.length > 1 ? 's' : ''} com prazo próximo`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"/></head>
        <body style="margin:0;padding:0;background:#07070d;font-family:'Segoe UI',sans-serif">
          <div style="max-width:560px;margin:0 auto;padding:40px 20px">
            <div style="text-align:center;margin-bottom:28px">
              <div style="display:inline-block;width:44px;height:44px;background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:12px;line-height:44px;font-size:22px;font-weight:900;color:#fff">K</div>
            </div>
            <div style="background:#0f0f1a;border:1px solid #2a2a4a;border-radius:16px;padding:28px">
              <h2 style="color:#f0f0ff;margin:0 0 6px;font-size:18px">⏰ Prazos se aproximando</h2>
              <p style="color:#a0a0c8;margin:0 0 20px;font-size:13px">
                Olá ${toName}, você tem ${tasks.length} tarefa${tasks.length > 1 ? 's' : ''} com prazo nas próximas 24 horas.
              </p>
              ${taskList}
              <div style="text-align:center;margin-top:20px">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks"
                  style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:11px 28px;border-radius:9px;font-size:13px;font-weight:700">
                  Ver minhas tarefas →
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    })
    return { success: true }
  } catch (err) {
    console.error('[Email] Erro ao enviar lembrete:', err)
    return { success: false, error: err.message }
  }
}