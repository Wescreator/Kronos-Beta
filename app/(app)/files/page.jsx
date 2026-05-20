'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Toast } from '@/components/ui'
import Icon from '@/components/ui/Icon'
import { CAN } from '@/lib/permissions'
import { getFileIcon, getFileColor, fmtSize } from '@/lib/constants'

const PREVIEWABLE = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

const IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

export default function FilesPage() {
  const { profile } = useAuth()
  const supabase = createClient()
  const fileRef = useRef(null)

  const [files, setFiles] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [projFilter, setProjFilter] = useState('')
  const [uploadProj, setUploadProj] = useState('')
  const [toast, setToast] = useState('')
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (profile) {
      fetchAll()
    }
  }, [profile])

  async function fetchAll() {
    const [f, p] = await Promise.all([
      supabase
        .from('files')
        .select(
          '*, projects(id,name,color,icon,drive_folder_id), profiles!files_uploaded_by_fkey(name)'
        )
        .order('created_at', { ascending: false }),

      supabase
        .from('projects')
        .select('id,name,color,icon,drive_folder_id')
        .order('created_at', { ascending: false }),
    ])

    setFiles(f.data || [])
    setProjects(p.data || [])
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function getSignedUrl(path, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from('kronos-files')
      .createSignedUrl(path, expiresIn)

    if (error) {
      throw new Error(error.message)
    }

    return data.signedUrl
  }

  async function viewFile(file) {
    try {
      const url = await getSignedUrl(file.storage_path)

      if (IMAGE_TYPES.includes(file.mime_type)) {
        setPreview({
          url,
          type: 'image',
          name: file.name,
        })
      } else {
        window.open(url, '_blank')
      }
    } catch (err) {
      console.error(err)
      showToast('❌ Erro ao abrir arquivo.')
    }
  }

  async function downloadFile(file) {
    try {
      const url = await getSignedUrl(file.storage_path, 60)

      const a = document.createElement('a')
      a.href = url
      a.download = file.name

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error(err)
      showToast('❌ Erro ao baixar arquivo.')
    }
  }

  async function handleUpload(e) {
    const picked = Array.from(e.target.files || [])

    if (!picked.length) return

    const selectedProjectId =
      uploadProj || projFilter || projects[0]?.id

    const selectedProject = projects.find(
      p => p.id === selectedProjectId
    )

    if (!selectedProjectId) {
      showToast('❌ Selecione um projeto.')
      return
    }

    setUploading(true)

    let successCount = 0

    for (const file of picked) {
      try {
        const ext = file.name.split('.').pop()

        const safeName = `${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}.${ext}`

        const path = `projects/${selectedProjectId}/${safeName}`

        // Upload Supabase
        const { error: upErr } = await supabase.storage
          .from('kronos-files')
          .upload(path, file)

        if (upErr) {
          console.error(upErr)
          showToast(`❌ ${upErr.message}`)
          continue
        }

        // Registro banco
        const { data: fileRecord, error: dbErr } =
          await supabase
            .from('files')
            .insert({
              name: file.name,
              size: file.size,
              mime_type:
                file.type || 'application/octet-stream',
              storage_path: path,
              project_id: selectedProjectId,
              uploaded_by: profile.id,
            })
            .select()
            .single()

        if (dbErr) {
          console.error(dbErr)
          showToast(`❌ Erro ao registrar ${file.name}`)
          continue
        }

        successCount++

        // Sincroniza com Google Drive
const driveFolderId = selectedProject?.drive_files_folder_id

if (fileRecord && driveFolderId) {
  try {
    const driveForm = new FormData()
    driveForm.append('file',     file)
    driveForm.append('fileId',   fileRecord.id)
    driveForm.append('folderId', driveFolderId)

    const driveRes  = await fetch('/api/drive/upload-file', {
      method: 'POST',
      body:   driveForm,
    })
    const driveData = await driveRes.json()

    if (!driveRes.ok || !driveData.success) {
      console.error('[Drive] Falha:', driveData)
      // Mostra o erro real para facilitar diagnóstico
      showToast(`⚠️ Arquivo salvo, mas falhou no Drive: ${driveData.error || 'erro desconhecido'}`)
    } else {
      console.log('[Drive] Sucesso:', driveData.driveFileId)
    }
  } catch (driveErr) {
    console.error('[Drive] Erro inesperado:', driveErr.message)
    showToast('⚠️ Arquivo salvo no sistema. Falha na sincronização com o Drive.')
  }
} else {
  // Avisa se o projeto não tem pasta configurada
  if (!driveFolderId) {
    console.warn('[Drive] Projeto sem drive_files_folder_id:', selectedProjectId)
    showToast('⚠️ Arquivo salvo. Execute a sincronização do Drive em /api/drive/sync-projects')
  }
}
      } catch (err) {
        console.error(err)
      }
    }

    if (successCount > 0) {
      showToast(
        `📁 ${successCount} arquivo(s) enviado(s)!`
      )
    }

    setUploading(false)

    e.target.value = ''

    await fetchAll()
  }

  async function deleteFile(file) {
    try {
      await supabase.storage
        .from('kronos-files')
        .remove([file.storage_path])

      await supabase
        .from('files')
        .delete()
        .eq('id', file.id)

      showToast('🗑️ Arquivo removido.')

      await fetchAll()
    } catch (err) {
      console.error(err)
      showToast('❌ Erro ao remover.')
    }
  }

  if (loading || !profile) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⏳</div>
        Carregando...
      </div>
    )
  }

  const role = profile.role

  const visible = projFilter
    ? files.filter(f => f.project_id === projFilter)
    : files

  return (
    <div>
      <div className="section-header">
        <span className="section-title">
          Arquivos
        </span>

        <div
          className="flex-center gap-8"
          style={{ flexWrap: 'wrap' }}
        >
          <select
            className="form-select"
            value={projFilter}
            onChange={e =>
              setProjFilter(e.target.value)
            }
          >
            <option value="">
              Todos os projetos
            </option>

            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.icon} {p.name}
              </option>
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

      {CAN.uploadFile(role) && (
        <div
          style={{
            marginBottom: 20,
          }}
        >
          <select
            className="form-select"
            value={uploadProj || projFilter}
            onChange={e =>
              setUploadProj(e.target.value)
            }
          >
            <option value="">
              Selecione o projeto...
            </option>

            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.icon} {p.name}
              </option>
            ))}
          </select>

          <button
            className="btn btn-primary"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? 'Enviando...'
              : 'Escolher arquivo'}
          </button>
        </div>
      )}

      {visible.length > 0 && (
        <div className="files-grid">
          {visible.map(file => {
            const color = getFileColor(file.name)
            const icon = getFileIcon(file.name)

            return (
              <div
                key={file.id}
                className="file-card"
              >
                <div
                  className="file-icon"
                  style={{
                    background: color + '22',
                    color,
                  }}
                >
                  <span style={{ fontSize: 22 }}>
                    {icon}
                  </span>
                </div>

                <div className="file-name">
                  {file.name}
                </div>

                <div className="file-meta">
                  {fmtSize(file.size)}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    marginTop: 10,
                  }}
                >
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => viewFile(file)}
                  >
                    Abrir
                  </button>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      downloadFile(file)
                    }
                  >
                    Baixar
                  </button>

                  {CAN.deleteFile(role) && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() =>
                        deleteFile(file)
                      }
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.88)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={preview.url}
            alt={preview.name}
            style={{
              maxWidth: '90vw',
              maxHeight: '80vh',
            }}
          />
        </div>
      )}

      <Toast
        message={toast}
        onClose={() => setToast('')}
      />
    </div>
  )
}