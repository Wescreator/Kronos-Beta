import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const FROM =
  process.env.RESEND_FROM_EMAIL ||
  'KRONOS <onboarding@resend.dev>'

export async function sendDeadlineReminderEmail({
  toEmail,
  toName,
  tasks,
}) {
  const resend = getResend()

  return await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: 'Prazos próximos no KRONOS',
    html: `
      <h2>Olá, ${toName}</h2>

      <p>Você possui tarefas próximas do vencimento:</p>

      <ul>
        ${tasks
          .map(
            (task) => `
              <li>
                <strong>${task.title}</strong>
                — vence em ${task.due_date}
              </li>
            `
          )
          .join('')}
      </ul>
    `,
  })
}