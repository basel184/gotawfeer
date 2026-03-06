export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const apiKey = config.youcamApiKey
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'YouCam API key not configured' })
  }

  try {
    // 1. Create file entry in YouCam
    const fileResponse: any = await $fetch('https://yce-api-01.makeupar.com/s2s/v2.0/file/makeup-vto', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: {
        file_name: body.file_name || 'selfie.jpg',
        content_type: body.content_type || 'image/jpeg'
      }
    })

    const uploadUrl = fileResponse?.data?.upload_url
    const fileId = fileResponse?.data?.file_id

    if (!uploadUrl || !fileId) {
      throw new Error('Failed to get upload URL from YouCam')
    }

    // 2. Upload the actual file data
    const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    await $fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': body.content_type || 'image/jpeg' },
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
