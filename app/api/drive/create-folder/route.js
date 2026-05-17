import { createClient }       from '@/lib/supabase/server'
import { createProjectFolder } from '@/lib/drive'
import { NextResponse }        from 'next/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const { projectId, projectName } = await request.json()
    if (!projectId || !projectName) {
      return NextResponse.json({ error: 'projectId e projectName são obrigatórios.' }, { status: 400 })
    }

    const result = await createProjectFolder(projectName)

    if (!result.success) {
      // Não falha silenciosamente — loga mas não bloqueia criação do projeto
      console.error('[Drive] Falha ao criar pasta:', result.error)
      return NextResponse.json({ success: false, error: result.error })
    }

    // Salva o ID da pasta no projeto
    await supabase.from('projects')
      .update({ drive_folder_id: result.folderId })
      .eq('id', projectId)

    return NextResponse.json({ success: true, folderId: result.folderId, folderUrl: result.folderUrl })
  } catch (err) {
    console.error('[Drive API] Erro:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}