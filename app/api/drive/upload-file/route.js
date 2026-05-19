import { createClient } from '@/lib/supabase/server'
import { uploadFileToDrive } from '@/lib/drive'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      )
    }

    const formData = await request.formData()

    const file = formData.get('file')
    const fileId = formData.get('fileId')
    const folderId = formData.get('folderId')

    console.log('Arquivo recebido:', file?.name)
    console.log('Folder ID:', folderId)
    console.log('File ID:', fileId)

    if (!file || !folderId) {
      return NextResponse.json(
        { error: 'Arquivo e folderId são obrigatórios.' },
        { status: 400 }
      )
    }

    if (!file.arrayBuffer) {
      return NextResponse.json(
        { error: 'Arquivo inválido.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const result = await uploadFileToDrive({
      fileName: file.name,
      fileBuffer: buffer,
      mimeType: file.type || 'application/octet-stream',
      folderId,
    })

    console.log('Resultado upload:', result)

    if (!result.success) {
      console.error('[Drive] Falha no upload:', result.error)

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    // Atualiza o registro no banco
    if (fileId) {
      await supabase
        .from('files')
        .update({
          drive_file_id: result.driveFileId,
        })
        .eq('id', fileId)
    }

    return NextResponse.json({
      success: true,
      driveFileId: result.driveFileId,
      driveUrl: result.driveUrl,
      downloadUrl: result.downloadUrl,
    })
  } catch (err) {
    console.error('[UPLOAD ERROR COMPLETO]', err)

    return NextResponse.json(
      {
        error: err.message || 'Erro interno.',
      },
      { status: 500 }
    )
  }
}