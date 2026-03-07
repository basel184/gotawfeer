export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const apiKey = config.youcamApiKey
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'YouCam API key not configured' })
  }

  console.log('[YouCam Task] Sending to YouCam:', JSON.stringify(body, null, 2))

  try {
    const response = await $fetch('https://yce-api-01.makeupar.com/s2s/v2.0/task/makeup-vto', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body
    })
    console.log('[YouCam Task] Success:', JSON.stringify(response))
    return response
  } catch (error: any) {
    const rawData = error.data ?? error.response?._data ?? error.response?.data ?? {}
    const statusCode = error.response?.status ?? error.statusCode ?? 400
    console.error('[YouCam Task] HTTP Status:', statusCode)
    console.error('[YouCam Task] Raw error data:', JSON.stringify(rawData))
    console.error('[YouCam Task] Error message:', error.message)

    const errorCode = rawData?.error_code ?? rawData?.error ?? rawData?.message ?? error.message ?? 'unknown'

    let statusMessage = `YouCam error [${statusCode}]: ${errorCode}`
    if (errorCode === 'CreditInsufficiency') statusMessage = 'رصيد API غير كافٍ'
    else if (errorCode === 'Unauthorized') statusMessage = 'مفتاح API غير صحيح'

    throw createError({
      statusCode,
      statusMessage,
      data: { youcam: rawData, sent: body }
    })
  }
})
