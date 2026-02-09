// TS shims for Nuxt auto-imports when types aren't generated yet
declare function useRuntimeConfig(): any
declare function useAuth(): any
declare function useGuest(): any
declare function useCookie<T = any>(name: string, opts?: any): { value: T | null }
declare function useNuxtApp(): any

export function useApi() {
  const config = useRuntimeConfig()
  let base = (config.public.apiBase as string || '').replace(/\/$/, '')

  // ALWAYS use relative path to route through server proxy (prevents CORS)
  // This ensures all API requests go through same-origin Nuxt server
  if (!base || base.startsWith('http') || base === 'https://admin.gotawfeer.com/api') {
    // Force relative path to use Nuxt server proxy
    base = '/api'
  }

  // Ensure base starts with / for relative paths
  if (base && !base.startsWith('/') && !base.startsWith('http')) {
    base = '/' + base
  }
  const { token } = useAuth() as { token: { value: string | null } }
  const { guestId, setGuestId } = useGuest() as { guestId: { value: number | null }, setGuestId: (n: number) => void }
  // Avoid calling useI18n here to prevent "must be called at the top of setup" in plugin context
  const nuxtApp = useNuxtApp()
  const localeValue = () => {
    try {
      // Try common shapes exposed by i18n
      const loc = nuxtApp?.$i18n?.locale?.value || nuxtApp?.$i18n?.global?.locale || (nuxtApp?.$i18n?.global?.locale?.value)
      if (typeof loc === 'string' && loc) {
        // Map frontend locale to backend locale
        return loc === 'ar' ? 'sa' : loc
      }
    } catch { }
    return 'sa' // Default to 'sa' which is the Arabic code in database
  }
  const guestCookie = useCookie<number | null>('guest_id', { sameSite: 'lax' })
  // زامن الحالة مع الكوكي دائماً لتفادي اختلاف guest_id بين SSR وCSR
  if (guestCookie?.value != null && Number(guestCookie.value) !== Number(guestId?.value ?? NaN)) {
    setGuestId(Number(guestCookie.value))
  }
  const authHeader = token.value ? { Authorization: `Bearer ${token.value}` } : {}

  const buildUrl = (path: string, skipGuestParams = false) => {
    // Clean the path
    const cleanPath = path.replace(/^\//, '')

    if (base.startsWith('http')) {
      // Absolute URL - use URL constructor (handles existing query params automatically)
      const url = new URL(`${base}/${cleanPath}`)
      if (!skipGuestParams) {
        if (guestId?.value) url.searchParams.set('guest_id', String(guestId.value))
        const loc = localeValue()
        if (loc) url.searchParams.set('locale', String(loc))
      }
      return url.toString()
    } else {
      // Relative URL - build query string manually
      const fullBase = base.startsWith('/') ? base : `/${base}`

      // Check if path already contains query string
      const [pathPart, existingQuery] = cleanPath.split('?')
      const fullPath = `${fullBase}/${pathPart}`

      // Parse existing query params if any
      const params = existingQuery ? new URLSearchParams(existingQuery) : new URLSearchParams()

      // Add guest_id and locale (will overwrite if they exist) unless skipGuestParams is true
      if (!skipGuestParams) {
        if (guestId?.value) params.set('guest_id', String(guestId.value))
        const loc = localeValue()
        if (loc) params.set('locale', String(loc))
      }

      const queryString = params.toString()
      return queryString ? `${fullPath}?${queryString}` : fullPath
    }
  }
  const $get = async (path: string, opts: any = {}) => {
    const url = buildUrl(path)
    const headers = { ...authHeader, lang: localeValue() || 'sa', ...(opts.headers || {}) }
    const silent = opts.silent !== false // Default to silent for 404 errors
    if (!silent) {
      console.log('[API:$get]', url, headers, { guestId: guestId?.value, guestCookie: guestCookie?.value })
    }
    // Add timeout to prevent hanging requests
    try {
      // Suppress console errors for 404 in silent mode
      // Use shorter timeout for better UX (3 seconds for critical, 5 seconds for normal)
      const defaultTimeout = opts.timeout || 5000 // 5 seconds default timeout (reduced from 10)
      const fetchOptions: any = {
        credentials: 'include',
        headers,
        timeout: defaultTimeout,
        ...opts
      }

      // For silent mode, intercept and suppress 404 errors
      if (silent) {
        // Store original onResponseError if exists
        const originalOnResponseError = opts.onResponseError

        // Override onResponseError to completely suppress 404 errors
        fetchOptions.onResponseError = ({ response }: any) => {
          // Completely suppress 404 errors - don't log to console
          if (response.status === 404) {
            // Return without throwing to prevent console logging
            return
          }
          // Call original handler for non-404 errors
          if (originalOnResponseError) {
            originalOnResponseError({ response })
          }
        }
      }

      return await $fetch(url, fetchOptions)
    } catch (err: any) {
      // Silently handle 404 errors if silent mode is enabled
      const is404 = err?.status === 404 || err?.statusCode === 404 || err?.response?.status === 404
      if (is404 && silent) {
        // Completely suppress 404 errors - return null instead of throwing
        // This prevents any console logging
        return null
      }
      throw err
    }
  }

  const $post = async (path: string, body?: any, opts: any = {}) => {
    const url = buildUrl(path)
    const headers = { ...authHeader, lang: localeValue() || 'sa', ...(opts.headers || {}) }
    console.log('[API:$post]', url, body, { guestId: guestId?.value, guestCookie: guestCookie?.value })
    return await $fetch(url, {
      method: 'POST',
      body,
      credentials: 'include',
      headers,
      timeout: opts.timeout || 10000, // 10 seconds default timeout
      ...opts
    })
  }

  const $put = async (path: string, body?: any, opts: any = {}) => {
    const url = buildUrl(path)
    const headers = { ...authHeader, lang: localeValue() || 'sa', ...(opts.headers || {}) }
    console.log('[API:$put]', url, body, { guestId: guestId?.value, guestCookie: guestCookie?.value })
    return await $fetch(url, {
      method: 'PUT',
      body,
      credentials: 'include',
      headers,
      timeout: opts.timeout || 10000,
      ...opts
    })
  }

  const $del = async (path: string, body?: any, opts: any = {}) => {
    const url = buildUrl(path, opts.skipGuestParams)
    const headers = { ...authHeader, lang: localeValue() || 'sa', ...(opts.headers || {}) }
    console.log('[API:$del]', url, body, { guestId: guestId?.value, guestCookie: guestCookie?.value })
    return await $fetch(url, {
      method: 'DELETE',
      body,
      credentials: 'include',
      headers,
      timeout: opts.timeout || 10000,
      ...opts
    })
  }

  return { $get, $post, $put, $del }
}
