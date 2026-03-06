export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const apiKey = config.youcamApiKey
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'YouCam API key not configured' })
  }

  try {
    // Decode base64 to get file size
    const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const contentType = body.content_type || 'image/jpeg'
    const fileName = body.file_name || 'selfie.jpg'

    // 1. Create file entry in YouCam (files array format)
    const fileResponse: any = await $fetch('https://yce-api-01.makeupar.com/s2s/v2.0/file/makeup-vto', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: {
        files: [{
          content_type: contentType,
          file_name: fileName,
          file_size: buffer.length
        }]
      }
    })

    const fileData = fileResponse?.data?.files?.[0]
    const fileId = fileData?.file_id
    const uploadRequest = fileData?.requests?.[0]

    if (!fileId || !uploadRequest?.url) {
      console.error('[YouCam Upload] Unexpected response:', JSON.stringify(fileResponse))
      throw new Error('Failed to get upload URL from YouCam')
    }

    // 2. Upload the actual file to the presigned URL
    await $fetch(uploadRequest.url, {
      method: uploadRequest.method || 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.length)
      },
      body: buffer
    })

    return { file_id: fileId }
  } catch (error: any) {
    console.error('[YouCam Upload] Error:', error.message, error.data)
    throw createError({
      statusCode: error.response?.status || error.statusCode || 500,
      statusMessage: error.message || 'YouCam upload error',
      data: error.data || error.response?.data
    })
  }
})
