import { createClient }      from '@/lib/supabase/server'
import { uploadFileToDrive }  from '@/lib/drive'
import { NextResponse }       from 'next/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const formData   = await request.formData()
    const file       = formData.get('file')
    const fileId     = formData.get('fileId')     // ID do arquivo na tabela files
    const folderId   = formData.get('folderId')   // drive_folder_id do projeto

    if (!file || !folderId) {
      return NextResponse.json({ error: 'Arquivo e folderId são obrigatórios.' }, { status: 400 })
    }

    const buffer   = Buffer.from(await file.arrayBuffer())
    const result   = await uploadFileToDrive({
      fileName:   file.name,
      fileBuffer: buffer,
      mimeType:   file.type || 'application/octet-stream',
      folderId,
    })

    if (!result.success) {
      console.error('[Drive] Falha no upload:', result.error)
      return NextResponse.json({ success: false, error: result.error })
    }

    // Atualiza o registro do arquivo com o ID do Drive
    if (fileId) {
      await supabase.from('files')
        .update({ drive_file_id: result.driveFileId })
        .eq('id', fileId)
    }

    return NextResponse.json({
      success:     true,
      driveFileId: result.driveFileId,
      driveUrl:    result.driveUrl,
    })
  } catch (err) {
    console.error('[Drive Upload API] Erro:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}