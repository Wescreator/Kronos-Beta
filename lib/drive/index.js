import { google } from 'googleapis'

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

/**
 * Cria uma pasta no Drive dentro da pasta raiz do KRONOS
 */
export async function createProjectFolder(projectName) {
  try {
    const drive    = getDriveClient()
    const rootId   = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID

    if (!rootId) throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID não configurado.')

    const { data } = await drive.files.create({
      requestBody: {
        name:     projectName,
        mimeType: 'application/vnd.google-apps.folder',
        parents:  [rootId],
      },
      fields: 'id, name, webViewLink',
    })

    return { success: true, folderId: data.id, folderUrl: data.webViewLink }
  } catch (err) {
    console.error('[Drive] Erro ao criar pasta:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Faz upload de um arquivo para a pasta do projeto no Drive
 */
export async function uploadFileToDrive({ fileName, fileBuffer, mimeType, folderId }) {
  try {
    const drive = getDriveClient()
    const { Readable } = await import('stream')

    const stream = Readable.from(fileBuffer)

    const { data } = await drive.files.create({
      requestBody: {
        name:    fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, name, webViewLink, webContentLink',
    })

    return {
      success:      true,
      driveFileId:  data.id,
      driveUrl:     data.webViewLink,
      downloadUrl:  data.webContentLink,
    }
  } catch (err) {
    console.error('[Drive] Erro ao fazer upload:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Deleta um arquivo ou pasta do Drive
 */
export async function deleteFromDrive(fileId) {
  try {
    const drive = getDriveClient()
    await drive.files.delete({ fileId })
    return { success: true }
  } catch (err) {
    console.error('[Drive] Erro ao deletar:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Renomeia a pasta de um projeto no Drive
 */
export async function renameFolder(folderId, newName) {
  try {
    const drive = getDriveClient()
    await drive.files.update({
      fileId:      folderId,
      requestBody: { name: newName },
    })
    return { success: true }
  } catch (err) {
    console.error('[Drive] Erro ao renomear:', err.message)
    return { success: false, error: err.message }
  }
}