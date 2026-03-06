export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const taskId = getRouterParam(event, 'taskId')

  const apiKey = config.youcamApiKey
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'YouCam API key not configured' })
  }

  if (!taskId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing taskId parameter' })
  }

  try {
    const response = await $fetch(`https://yce-api-01.makeupar.com/s2s/v2.0/task/makeup-vto/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })
    return response
  } catch (error: any) {
    console.error('[YouCam Status] Error:', error.message, error.data)
    throw createError({
      statusCode: error.response?.status || error.statusCode || 500,
      statusMessage: error.message || 'YouCam API error',
      data: error.data || error.response?.data
    })
  }
})
