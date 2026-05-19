import { createClient } from '@/lib/supabase/server'
import { uploadFileToDrive } from '@/lib/drive'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    console.log('==============================')
    console.log('[UPLOAD DRIVE] INICIANDO')

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log('[UPLOAD DRIVE] Usuário não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      )
    }

    const formData = await request.formData()

    const file = formData.get('file')
    const fileId = formData.get('fileId')
    const folderId = formData.get('folderId')

    console.log('[UPLOAD DRIVE] file:', file?.name)
    console.log('[UPLOAD DRIVE] fileId:', fileId)
    console.log('[UPLOAD DRIVE] folderId:', folderId)

    if (!file || !folderId) {
      console.log('[UPLOAD DRIVE] Dados obrigatórios ausentes')

      return NextResponse.json(
        { error: 'Arquivo e folderId são obrigatórios.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()

    console.log('[UPLOAD DRIVE] Buffer size:', arrayBuffer.byteLength)

    const buffer = Buffer.from(arrayBuffer)

    const result = await uploadFileToDrive({
      fileName: file.name,
      fileBuffer: buffer,
      mimeType: file.type || 'application/octet-stream',
      folderId,
    })

    console.log('[UPLOAD DRIVE] RESULTADO:', result)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    if (fileId) {
      const { error: updateError } = await supabase
        .from('files')
        .update({
          drive_file_id: result.driveFileId,
          drive_url: result.driveUrl,
        })
        .eq('id', fileId)

      if (updateError) {
        console.log('[UPLOAD DRIVE] ERRO AO SALVAR DB:', updateError)
      }
    }

    console.log('[UPLOAD DRIVE] SUCESSO')

    return NextResponse.json({
      success: true,
      driveFileId: result.driveFileId,
      driveUrl: result.driveUrl,
    })
  } catch (err) {
    console.error('[UPLOAD DRIVE] ERRO COMPLETO:')
    console.error(err)

    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    )
  }
}