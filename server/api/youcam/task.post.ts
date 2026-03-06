export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const apiKey = config.youcamApiKey
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'YouCam API key not configured' })
  }

  try {
    const response = await $fetch('https://yce-api-01.makeupar.com/s2s/v2.0/task/makeup-vto', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body
    })
    return response
  } catch (error: any) {
    console.error('[YouCam Task] Error:', error.message, error.data)
    throw createError({
      statusCode: error.response?.status || error.statusCode || 500,
      statusMessage: error.message || 'YouCam API error',
      data: error.data || error.response?.data
    })
  }
})
