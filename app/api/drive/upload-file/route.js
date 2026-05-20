import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'
import { google }        from 'googleapis'

function getDriveClient() {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || ''
  // Garante que \n seja convertido em quebras de linha reais
  const privateKey = rawKey.includes('\\n')
    ? rawKey.replace(/\\n/g, '\n')
    : rawKey

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

export async function POST(request) {
  try {
    // Autenticação
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    // Lê o FormData
    const formData = await request.formData()
    const file     = formData.get('file')
    const fileId   = formData.get('fileId')   || null
    const folderId = formData.get('folderId') || null

    if (!file)     return NextResponse.json({ error: 'Arquivo não enviado.' },   { status: 400 })
    if (!folderId) return NextResponse.json({ error: 'folderId não informado.' }, { status: 400 })

    // Valida credenciais
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Credenciais Google não configuradas no servidor.' }, { status: 500 })
    }

    // Converte o arquivo para Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)
    const mimeType    = file.type || 'application/octet-stream'

    // Cria stream a partir do Buffer
    const stream = new (require('stream').PassThrough)()
    stream.end(buffer)

    // Upload para o Google Drive
    const drive = getDriveClient()
    const { data: driveFile } = await drive.files.create({
      requestBody: {
        name:    file.name,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, name, webViewLink',
    })

    // Atualiza o banco com o ID do arquivo no Drive
    if (fileId && driveFile?.id) {
      await supabase
        .from('files')
        .update({ drive_file_id: driveFile.id })
        .eq('id', fileId)
    }

    return NextResponse.json({
      success:     true,
      driveFileId: driveFile.id,
      driveUrl:    driveFile.webViewLink,
    })

  } catch (err) {
    console.error('[Drive Upload Error]', {
      message: err.message,
      code:    err.code,
      status:  err.status,
    })
    return NextResponse.json({
      error:   err.message || 'Erro ao fazer upload para o Drive.',
      code:    err.code    || null,
    }, { status: 500 })
  }
}