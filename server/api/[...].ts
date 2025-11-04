export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  
  // Only proxy API requests
  if (!url.startsWith('/api/')) {
    return
  }
  
  // Skip Tamara routes (they have their own handlers)
  // Note: This check must come after /api/ check
  if (url.includes('/v1/tamara') || url.includes('/test-tamara')) {
    return
  }
  
  // Remove /api prefix and build target URL
  // Split URL into path (getQuery will handle query string)
  const [pathPart] = url.replace(/^\/api/, '').split('?')
  const path = pathPart || '/'
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : '/' + path
  const targetBase = 'https://gotawfeer.com/project/api'
  const targetUrl = targetBase + cleanPath
  
  // Set CORS headers
  setHeader(event, 'Access-Control-Allow-Origin', '*')
  setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, lang')
  setHeader(event, 'Access-Control-Allow-Credentials', 'true')
  
  // Handle preflight requests
  if (event.node.req.method === 'OPTIONS') {
    return send(event, '', 204)
  }
  
  // Proxy the request
  let fullUrl: URL | null = null
  try {
    const headers: Record<string, string> = {}
    
    // Forward important headers
    const reqHeaders = event.node.req.headers
    if (reqHeaders.authorization) {
      headers.Authorization = reqHeaders.authorization
    }
    if (reqHeaders['content-type']) {
      headers['Content-Type'] = reqHeaders['content-type'] as string
    }
    if (reqHeaders.lang) {
      headers.lang = reqHeaders.lang as string
    }
    
    // Get query parameters (getQuery already parses query string from URL)
    const query = getQuery(event)
    // Build target URL with path
    fullUrl = new URL(targetUrl)
    // Add all query parameters
    Object.entries(query).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => fullUrl!.searchParams.append(key, String(v)))
        } else {
          fullUrl!.searchParams.set(key, String(value))
        }
      }
    })
    
    // Get request body for non-GET requests
    let body: any = undefined
    if (event.node.req.method !== 'GET' && event.node.req.method !== 'HEAD' && event.node.req.method !== 'OPTIONS') {
      try {
        body = await readBody(event).catch(() => null)
      } catch (e) {
        // Body might be a stream, try to read it differently
        body = null
      }
    }
    
    // Ensure Content-Type is set for POST/PUT requests with body
    if (body && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json'
    }
    
    const fullUrlString = fullUrl.toString()
    console.log('[API Proxy] Request:', {
      method: event.node.req.method,
      url: fullUrlString,
      hasBody: !!body,
      bodyKeys: body ? Object.keys(body) : [],
      headers: Object.keys(headers)
    })
    
    const response = await $fetch(fullUrlString, {
      method: event.node.req.method as any,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      timeout: 30000, // 30 seconds timeout
    }).catch((fetchError: any) => {
      console.error('[API Proxy] Fetch Error:', {
        url: fullUrlString,
        method: event.node.req.method,
        error: fetchError.message,
        cause: fetchError.cause,
        stack: fetchError.stack
      })
      throw fetchError
    })
    
    return response
  } catch (error: any) {
    console.error('[API Proxy Error]', {
      url: targetUrl,
      fullUrl: fullUrl?.toString(),
      method: event.node.req.method,
      error: error.message,
      status: error.response?.status || error.statusCode,
      statusMessage: error.response?.statusText || error.statusMessage,
      data: error.data || error.response?.data,
      cause: error.cause
    })
    
    const statusCode = error.response?.status || error.statusCode || 500
    const message = error.message || 'Proxy error'
    
    throw createError({
      statusCode,
      statusMessage: message,
      data: error.data || error.response?.data
    })
  }
})

