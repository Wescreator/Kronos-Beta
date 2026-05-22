import './globals.css'

export const metadata = {
  title: 'KRONOS — Gestão de Equipe',
  description: 'Plataforma de gestão de projetos, tarefas e equipes.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  )
}