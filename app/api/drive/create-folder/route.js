import { createClient }        from '@/lib/supabase/server'
import { createProjectFolder } from '@/lib/drive'
import { NextResponse }        from 'next/server'
import { google }              from 'googleapis'

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

async function createSubfolder(name, parentId) {
  const drive = getDriveClient()
  const { data } = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents:  [parentId],
    },
    fields: 'id, name, webViewLink',
  })
  return data
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const { projectId, projectName } = await request.json()
    if (!projectId || !projectName) {
      return NextResponse.json({ error: 'projectId e projectName são obrigatórios.' }, { status: 400 })
    }

    // 1. Cria pasta principal do projeto no Drive
    const mainFolder = await createProjectFolder(projectName)
    if (!mainFolder.success) {
      console.error('[Drive] Falha ao criar pasta principal:', mainFolder.error)
      return NextResponse.json({ success: false, error: mainFolder.error })
    }

    // 2. Cria subpasta "Arquivos" dentro da pasta do projeto
    let filesFolderId = null
    try {
      const filesFolder = await createSubfolder('Arquivos', mainFolder.folderId)
      filesFolderId = filesFolder.id
    } catch (err) {
      console.error('[Drive] Falha ao criar subpasta Arquivos:', err)
    }

    // 3. Salva os dois IDs no projeto
    await supabase.from('projects').update({
      drive_folder_id:       mainFolder.folderId,
      drive_files_folder_id: filesFolderId,
    }).eq('id', projectId)

    return NextResponse.json({
      success:        true,
      folderId:       mainFolder.folderId,
      filesFolderId,
      folderUrl:      mainFolder.folderUrl,
    })
  } catch (err) {
    console.error('[Drive API] Erro:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}