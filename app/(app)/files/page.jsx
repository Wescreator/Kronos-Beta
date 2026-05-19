'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Toast } from '@/components/ui'
import Icon from '@/components/ui/Icon'
import { CAN } from '@/lib/permissions'
import { getFileIcon, getFileColor, fmtSize } from '@/lib/constants'

const PREVIEWABLE = ['application/pdf','image/png','image/jpeg','image/jpg','image/gif','image/webp','image/svg+xml']
const IMAGE_TYPES = ['image/png','image/jpeg','image/jpg','image/gif','image/webp','image/svg+xml']

export default function FilesPage() {
  const { profile } = useAuth()
  const supabase = createClient()
  const fileRef = useRef(null)

  const [files,       setFiles]       = useState([])
  const [projects,    setProjects]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [uploading,   setUploading]   = useState(false)
  const [projFilter,  setProjFilter]  = useState('')
  const [uploadProj,  setUploadProj]  = useState('')
  const [toast,       setToast]       = useState('')
  const [preview,     setPreview]     = useState(null) // {url, type, name}

  useEffect(() => { if (profile) fetchAll() }, [profile])

  async function fetchAll() {
    const [f, p] = await Promise.all([
      supabase.from('files')
        .select('*, projects(id,name,color,icon,drive_files_folder_id), profiles!files_uploaded_by_fkey(name)')
        .order('created_at', { ascending: false }),
      supabase.from('projects')
        .select('id,name,color,icon,drive_folder_id,drive_files_folder_id')
        .order('created_at', { ascending: false }),
    ])
    setFiles(f.data   || [])
    setProjects(p.data || [])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function getSignedUrl(path, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from('kronos-files')
      .createSignedUrl(path, expiresIn)
    if (error) throw new Error(error.message)
    return data.signedUrl
  }

  async function viewFile(f) {
    try {
      const url = await getSignedUrl(f.storage_path, 3600)
      if (IMAGE_TYPES.includes(f.mime_type)) {
        setPreview({ url, type: 'image', name: f.name })
      } else {
        window.open(url, '_blank')
      }
    } catch {
      showToast('❌ Erro ao abrir arquivo. Tente novamente.')
    }
  }

  async function downloadFile(f) {
    try {
      const url = await getSignedUrl(f.storage_path, 60)
      const a   = document.createElement('a')
      a.href     = url
      a.download = f.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      showToast('❌ Erro ao baixar arquivo.')
    }
  }

  async function handleUpload(e) {
    const picked = Array.from(e.target.files || [])
    if (!picked.length) return

    const selectedProjectId = uploadProj || projFilter || (projects[0]?.id ?? null)
    const selectedProject   = projects.find(p => p.id === selectedProjectId)

    if (!selectedProjectId) {
      showToast('❌ Selecione um projeto antes de enviar.')
      e.target.value = ''
      return
    }

    setUploading(true)
    let successCount = 0

    for (const file of picked) {
      const ext      = file.name.split('.').pop()
      const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const path     = `projects/${selectedProjectId}/${safeName}`

      // 1. Upload Supabase Storage
      const { error: upErr } = await supabase.storage
        .from('kronos-files')
        .upload(path, file, { upsert: false })

      if (upErr) { showToast(`❌ Erro ao enviar: ${file.name}`); continue }

      // 2. Registra no banco
      const { data: fileRecord, error: dbErr } = await supabase
        .from('files')
        .insert({
          name:         file.name,
          size:         file.size,
          mime_type:    file.type || 'application/octet-stream',
          storage_path: path,
          project_id:   selectedProjectId,
          uploaded_by:  profile.id,
        })
        .select()
        .single()

      if (dbErr) { showToast(`❌ Erro ao registrar: ${file.name}`); continue }

      successCount++

      // 3. Sync Google Drive (não bloqueia)
      const driveFolderId = selectedProject?.drive_files_folder_id
      if (fileRecord && driveFolderId) {
        const driveForm = new FormData()
        driveForm.append('file',     file)
        driveForm.append('fileId',   fileRecord.id)
        driveForm.append('folderId', driveFolderId)
        fetch('/api/drive/upload-file', { method: 'POST', body: driveForm })
          .catch(err => console.error('[Drive] Upload error:', err))
      }
    }

    if (successCount > 0) {
      showToast(`📁 ${successCount} arquivo${successCount > 1 ? 's' : ''} enviado${successCount > 1 ? 's' : ''}!`)
    }

    setUploading(false)
    e.target.value = ''
    await fetchAll()
  }

  async function deleteFile(f) {
    try {
      await supabase.storage.from('kronos-files').remove([f.storage_path])
      await supabase.from('files').delete().eq('id', f.id)
      showToast('🗑️ Arquivo removido.')
      await fetchAll()
    } catch {
      showToast('❌ Erro ao remover arquivo.')
    }
  }

  if (loading || !profile) return (
    <div className="empty-state"><div className="empty-icon">⏳</div>Carregando...</div>
  )

  const role    = profile.role
  const visible = projFilter
    ? files.filter(f => f.project_id === projFilter)
    : files

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span className="section-title">Arquivos</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            {visible.length} arquivo{visible.length !== 1 ? 's' : ''}
            {projFilter && projects.find(p => p.id === projFilter)
              ? ` em "${projects.find(p => p.id === projFilter)?.name}"`
              : ' no total'
            }
          </span>
        </div>
        <div className="flex-center gap-8" style={{ flexWrap: 'wrap' }}>
          {/* Filtro de visualização */}
          <select
            className="form-select"
            style={{ width: 180, padding: '6px 10px', fontSize: 12 }}
            value={projFilter}
            onChange={e => setProjFilter(e.target.value)}
          >
            <option value="">Todos os projetos</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
            ))}
          </select>
          <input
            ref={fileRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
        </div>
      </div>

      {/* Painel de upload */}
      {CAN.uploadFile(role) && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r2)', padding: '16px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <Icon name="upload" size={18} style={{ color: 'var(--purple3)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              Enviar arquivo
            </div>
            <select
              className="form-select"
              style={{ fontSize: 12, padding: '5px 10px', width: '100%', maxWidth: 280 }}
              value={uploadProj || projFilter}
              onChange={e => setUploadProj(e.target.value)}
            >
              <option value="">Selecione o projeto...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ flexShrink: 0 }}
          >
            <Icon name="upload" size={14} />
            {uploading ? 'Enviando...' : 'Escolher arquivo'}
          </button>
        </div>
      )}

      {/* Empty state */}
      {visible.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          {CAN.uploadFile(role)
            ? 'Nenhum arquivo ainda. Use o painel acima para enviar.'
            : 'Nenhum arquivo disponível.'
          }
        </div>
      )}

      {/* Grid de arquivos */}
      {visible.length > 0 && (
        <div className="files-grid">
          {visible.map(f => {
            const color    = getFileColor(f.name)
            const icon     = getFileIcon(f.name)
            const proj     = f.projects
            const canView  = PREVIEWABLE.includes(f.mime_type)
            const isImage  = IMAGE_TYPES.includes(f.mime_type)

            return (
              <div key={f.id} className="file-card" style={{ position: 'relative' }}>
                {/* Badge Drive */}
                {f.drive_file_id && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    background: 'rgba(37,99,235,.15)',
                    border: '1px solid rgba(37,99,235,.3)',
                    borderRadius: 5, padding: '2px 6px',
                    fontSize: 9, color: 'var(--blue3)', fontWeight: 700,
                  }}>
                    Drive ✓
                  </div>
                )}

                {/* Ícone */}
                <div className="file-icon" style={{ background: color + '22', color }}>
                  {isImage
                    ? <span style={{ fontSize: 22 }}>🖼️</span>
                    : <span style={{ fontSize: 22 }}>{icon}</span>
                  }
                </div>

                <div className="file-name" title={f.name}>{f.name}</div>

                {proj && (
                  <div className="file-meta" style={{ color: proj.color }}>
                    {proj.icon} {proj.name}
                  </div>
                )}

                <div className="file-meta">{fmtSize(f.size)}</div>
                <div className="file-meta" style={{ marginBottom: 12 }}>
                  {new Date(f.created_at).toLocaleDateString('pt-BR')} · {f.profiles?.name || '—'}
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {canView && (
                    <button className="btn btn-ghost btn-sm" onClick={() => viewFile(f)}>
                      <Icon name="eye" size={12} />
                      {isImage ? 'Ver' : 'Abrir'}
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
      )}

      {/* Preview de imagem */}
      {preview && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)',
            zIndex: 9999, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 20, flexDirection: 'column', gap: 14,
          }}
          onClick={() => setPreview(null)}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', maxWidth: 900,
          }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
              {preview.name}
            </span>
            <button
              onClick={() => setPreview(null)}
              style={{
                background: 'none', border: 'none', color: '#fff',
                fontSize: 22, cursor: 'pointer', lineHeight: 1,
              }}
            >✕</button>
          </div>
          <img
            src={preview.url}
            alt={preview.name}
            style={{
              maxWidth: '90vw', maxHeight: '80vh',
              borderRadius: 10, objectFit: 'contain',
              boxShadow: '0 20px 60px rgba(0,0,0,.6)',
            }}
            onClick={e => e.stopPropagation()}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={preview.url}
              download={preview.name}
              style={{
                background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
                borderRadius: 8, color: '#fff', textDecoration: 'none',
                padding: '8px 18px', fontSize: 13, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
              onClick={e => e.stopPropagation()}
            >
              ⬇ Baixar imagem
            </a>
          </div>
        </div>
      )}

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}