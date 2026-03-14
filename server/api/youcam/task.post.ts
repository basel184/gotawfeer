export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const apiKey = config.youcamApiKey
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'YouCam API key not configured' })
  }

  console.log('[YouCam Task] Raw body received:', JSON.stringify(body, null, 2))
  console.log('[YouCam Task] Body keys:', Object.keys(body))
  console.log('[YouCam Task] Effects:', JSON.stringify(body.effects, null, 2))
  if (body.effects && body.effects.length > 0) {
    console.log('[YouCam Task] First effect:', JSON.stringify(body.effects[0], null, 2))
  }

  // Validate required fields
  if (!body.effects || !Array.isArray(body.effects) || body.effects.length === 0) {
    console.error('[YouCam Task] Missing or invalid effects:', body.effects)
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing or invalid effects array'
    })
  }

  if (!body.src_file_id && !body.src_file_url) {
    console.error('[YouCam Task] Missing both src_file_id and src_file_url')
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing image source (src_file_id or src_file_url)'
    })
  }

  console.log('[YouCam Task] Validation passed, sending to YouCam...')
  
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
