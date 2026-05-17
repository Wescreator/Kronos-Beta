export const COLS = [
  { key: 'todo',   label: 'A Fazer',      color: 'var(--text2)' },
  { key: 'doing',  label: 'Em Progresso', color: 'var(--amber)' },
  { key: 'review', label: 'Em Revisão',   color: 'var(--blue2)' },
  { key: 'done',   label: 'Concluído',    color: 'var(--green)' },
]

export const STATUS_LABELS = {
  todo:   'A Fazer',
  doing:  'Em Progresso',
  review: 'Em Revisão',
  done:   'Concluído',
}

export const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
export const MONTHS       = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export const COLORS_LIST = [
  '#7c3aed','#2563eb','#10b981','#f59e0b','#ec4899','#ef4444','#14b8a6',
]

export const ICONS_LIST = ['🚀','🌐','⚙️','📊','💡','🎯','🛠️','📱','🔐','📈']

export const FILE_ICONS = {
  pdf:'📄', doc:'📝', docx:'📝', xls:'📊', xlsx:'📊',
  ppt:'📑', pptx:'📑', png:'🖼️', jpg:'🖼️', jpeg:'🖼️',
  gif:'🖼️', svg:'🖼️', zip:'📦', rar:'📦', mp4:'🎬',
  mp3:'🎵', dwg:'📐', dxf:'📐', fig:'🎨', default:'📁',
}

export const FILE_COLORS = {
  pdf:'#ef4444', doc:'#2563eb', docx:'#2563eb',
  xls:'#10b981', xlsx:'#10b981', ppt:'#f59e0b', pptx:'#f59e0b',
  png:'#7c3aed', jpg:'#7c3aed', jpeg:'#7c3aed',
  dwg:'#f59e0b', zip:'#14b8a6', default:'#a0a0c8',
}

export function getExt(name)       { return (name||'').split('.').pop().toLowerCase() }
export function getFileIcon(name)  { const e=getExt(name); return FILE_ICONS[e]||FILE_ICONS.default }
export function getFileColor(name) { const e=getExt(name); return FILE_COLORS[e]||FILE_COLORS.default }
export function fmtSize(b)         { if(!b) return '—'; if(b<1024) return b+'B'; if(b<1048576) return (b/1024).toFixed(1)+'KB'; return (b/1048576).toFixed(1)+'MB' }
export function fmtDate(d)         { if(!d) return '—'; const dt=new Date(d+'T12:00:00'); return `${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]}` }
export function makeInitials(name) { return (name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() }