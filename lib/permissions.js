export const CAN = {
  createProject:    (role) => ['admin', 'manager'].includes(role),
  deleteProject:    (role) => ['admin', 'manager'].includes(role),
  createTask:       (role) => role !== 'viewer',
  moveTask:         (role) => role !== 'viewer',
  deleteTask:       (role) => ['admin', 'manager'].includes(role),
  manageMembers:    (role) => role === 'admin',
  changeRoles:      (role) => role === 'admin',
  scheduleMeeting:  (role) => ['admin', 'manager'].includes(role),
  createEvent:      (role) => ['admin', 'manager'].includes(role),
  uploadFile:       (role) => role !== 'viewer',
  deleteFile:       (role) => ['admin', 'manager'].includes(role),
  settings:         (role) => role === 'admin',
  seeNotifications: (role) => ['admin', 'manager'].includes(role),
}

// Labels neutros para o dropdown de nível de acesso
export const ROLE_LABELS = {
  admin:   'Administrador',
  manager: 'Gerente',
  dev:     'Colaborador',
  viewer:  'Visualizador',
}

// Cores dos níveis
export const ROLE_COLORS = {
  admin:   '#7c3aed',
  manager: '#2563eb',
  dev:     '#10b981',
  viewer:  '#60607a',
}

export const MEMBER_COLORS = [
  '#7c3aed','#2563eb','#10b981','#ec4899',
  '#f59e0b','#14b8a6','#ef4444','#8b5cf6',
]

export const PERMISSION_TABLE = [
  ['Criar projetos',    true,  true,  false, false],
  ['Excluir projetos',  true,  true,  false, false],
  ['Gerenciar membros', true,  false, false, false],
  ['Alterar acessos',   true,  false, false, false],
  ['Criar tarefas',     true,  true,  true,  false],
  ['Mover tarefas',     true,  true,  true,  false],
  ['Excluir tarefas',   true,  true,  false, false],
  ['Comentar',          true,  true,  true,  true ],
  ['Agendar reuniões',  true,  true,  false, false],
  ['Criar eventos',     true,  true,  false, false],
  ['Enviar arquivos',   true,  true,  true,  false],
  ['Ver notificações',  true,  true,  false, false],
  ['Configurações',     true,  false, false, false],
]