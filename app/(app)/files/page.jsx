'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Avatar, Toast } from '@/components/ui'
import Icon from '@/components/ui/Icon'
import { CAN } from '@/lib/permissions'
import { getFileIcon, getFileColor, fmtSize } from '@/lib/constants'

export default function FilesPage() {
  const { profile } = useAuth()
  const supabase    = createClient()
  const fileRef     = useRef(null)

  const [files,      setFiles]      = useState([])
  const [projects,   setProjects]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [uploading,  setUploading]  = useState(false)
  const [projFilter, setProjFilter] = useState('')
  const [toast,      setToast]      = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [f, p] = await Promise.all([
      supabase.from('files').select('*, projects(name,color,icon), profiles!files_uploaded_by_fkey(name)').order('created_at', { ascending: false }),
      supabase.from('projects').select('id,name,color,icon'),
    ])
    setFiles(f.data    || [])
    setProjects(p.data || [])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

 async function handleUpload(e) {
  const picked = Array.from(e.target.files)
  if (!picked.length) return
  setUploading(true)

  for (const file of picked) {
    // 1. Upload no Supabase Storage
    const path = `${profile.id}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage
      .from('kronos-files')
      .upload(path, file)

    if (upErr) { showToast(`❌ Erro ao enviar ${file.name}`); continue }

    // 2. Registra no banco
    const { data: fileRecord } = await supabase.from('files').insert({
      name:         file.name,
      size:         file.size,
      mime_type:    file.type,
      storage_path: path,
      project_id:   projFilter || projects[0]?.id || null,
      uploaded_by:  profile.id,
    }).select().single()

    // 3. Sincroniza com Google Drive em segundo plano
    if (fileRecord && process.env.NEXT_PUBLIC_DRIVE_ENABLED === 'true') {
      const projData = projects.find(p => p.id === (projFilter || projects[0]?.id))
      if (projData?.drive_folder_id) {
        const driveForm = new FormData()
        driveForm.append('file',      file)
        driveForm.append('fileId',    fileRecord.id)
        driveForm.append('folderId',  projData.drive_folder_id)
        fetch('/api/drive/upload-file', { method: 'POST', body: driveForm })
          .catch(err => console.error('[Drive] Falha no sync:', err))
      }
    }
  }

  showToast('📁 Arquivo(s) enviado(s)!')
  setUploading(false)
  e.target.value = ''
  fetchAll()
}

  async function downloadFile(f) {
    const { data, error } = await supabase.storage.from('kronos-files').download(f.storage_path)
    if (error) { showToast('❌ Erro ao baixar arquivo.'); return }
    const url = URL.createObjectURL(data)
    const a   = document.createElement('a')
    a.href = url; a.download = f.name; a.click()
    URL.revokeObjectURL(url)
  }

  async function viewFile(f) {
    const { data } = supabase.storage.from('kronos-files').getPublicUrl(f.storage_path)
    if (data?.publicUrl) window.open(data.publicUrl, '_blank')
    else {
      const { data: blob } = await supabase.storage.from('kronos-files').download(f.storage_path)
      if (blob) window.open(URL.createObjectURL(blob), '_blank')
    }
  }

  async function deleteFile(f) {
    await supabase.storage.from('kronos-files').remove([f.storage_path])
    await supabase.from('files').delete().eq('id', f.id)
    showToast('🗑️ Arquivo removido.')
    fetchAll()
  }

  if (loading || !profile) return <div className="empty-state"><div className="empty-icon">⏳</div>Carregando...</div>

  const role    = profile.role
  const visible = projFilter ? files.filter(f => f.project_id === projFilter) : files

  const viewable = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']

  return (
    <div>
      <div className="section-header">
        <span className="section-title">Arquivos ({visible.length})</span>
        <div className="flex-center gap-8">
          <select className="form-select" style={{ width: 200, padding: '6px 10px', fontSize: 12 }}
            value={projFilter} onChange={e => setProjFilter(e.target.value)}>
            <option value="">Todos os projetos</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
          </select>
          {CAN.uploadFile(role) && (
            <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Icon name="upload" size={14} /> {uploading ? 'Enviando...' : 'Enviar arquivo'}
            </button>
          )}
          <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={handleUpload} />
        </div>
      </div>

      {CAN.uploadFile(role) && visible.length === 0 && (
        <div className="upload-zone" onClick={() => fileRef.current?.click()}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Clique para enviar arquivos</div>
          <div style={{ fontSize: 12 }}>PDF, DWG, PNG, DOC, XLS e outros formatos</div>
        </div>
      )}

      {visible.length === 0 && !CAN.uploadFile(role) && (
        <div className="empty-state"><div className="empty-icon">📁</div>Nenhum arquivo disponível.</div>
      )}

      <div className="files-grid">
        {visible.map(f => {
          const color   = getFileColor(f.name)
          const icon    = getFileIcon(f.name)
          const canView = viewable.includes(f.mime_type)
          const proj    = f.projects
          return (
            <div key={f.id} className="file-card">
              <div className="file-icon" style={{ background: color + '22', color }}>{icon}</div>
              <div className="file-name" title={f.name}>{f.name}</div>
              {proj && (
                <div className="file-meta" style={{ color: proj.color }}>
                  {proj.icon} {proj.name}
                </div>
              )}
              <div className="file-meta">{fmtSize(f.size)}</div>
              <div className="file-meta">
                {new Date(f.created_at).toLocaleDateString('pt-BR')} · {f.profiles?.name || '—'}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {canView && (
                  <button className="btn btn-ghost btn-sm" onClick={() => viewFile(f)}>
                    <Icon name="eye" size={12} /> Ver
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => downloadFile(f)}>
                  <Icon name="download" size={12} /> Baixar
                </button>
                {CAN.deleteFile(role) && (
                  <button className="btn btn-danger btn-sm" onClick={() => deleteFile(f)}>
                    <Icon name="trash" size={12} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}