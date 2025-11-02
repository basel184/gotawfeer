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
  if (!base || base.startsWith('http') || base === 'https://gotawfeer.com/project/api') {
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
    } catch {}
    return 'sa' // Default to 'sa' which is the Arabic code in database
  }
  const guestCookie = useCookie<number | null>('guest_id', { sameSite: 'lax' })
  // زامن الحالة مع الكوكي دائماً لتفادي اختلاف guest_id بين SSR وCSR
  if (guestCookie?.value != null && Number(guestCookie.value) !== Number(guestId?.value ?? NaN)) {
    setGuestId(Number(guestCookie.value))
  }
  const authHeader = token.value ? { Authorization: `Bearer ${token.value}` } : {}

  const buildUrl = (path: string) => {
    // Clean the path
    const cleanPath = path.replace(/^\//, '')
    
    if (base.startsWith('http')) {
      // Absolute URL - use URL constructor (handles existing query params automatically)
      const url = new URL(`${base}/${cleanPath}`)
      if (guestId?.value) url.searchParams.set('guest_id', String(guestId.value))
      const loc = localeValue()
      if (loc) url.searchParams.set('locale', String(loc))
      return url.toString()
    } else {
      // Relative URL - build query string manually
      const fullBase = base.startsWith('/') ? base : `/${base}`
      
      // Check if path already contains query string
      const [pathPart, existingQuery] = cleanPath.split('?')
      const fullPath = `${fullBase}/${pathPart}`
      
      // Parse existing query params if any
      const params = existingQuery ? new URLSearchParams(existingQuery) : new URLSearchParams()
      
      // Add guest_id and locale (will overwrite if they exist)
      if (guestId?.value) params.set('guest_id', String(guestId.value))
      const loc = localeValue()
      if (loc) params.set('locale', String(loc))
      
      const queryString = params.toString()
      return queryString ? `${fullPath}?${queryString}` : fullPath
    }
  }
  const $get = async (path: string, opts: any = {}) => {
    const url = buildUrl(path)
    const headers = { ...authHeader, lang: localeValue() || 'sa', ...(opts.headers||{}) }
    console.log('[API:$get]', url, headers, { guestId: guestId?.value, guestCookie: guestCookie?.value })
    return await $fetch(url, { credentials: 'include', headers, ...opts })
  }

  const $post = async (path: string, body?: any, opts: any = {}) => {
    const url = buildUrl(path)
    const headers = { ...authHeader, lang: localeValue() || 'sa', ...(opts.headers||{}) }
    console.log('[API:$post]', url, body, { guestId: guestId?.value, guestCookie: guestCookie?.value })
    return await $fetch(url, { method: 'POST', body, credentials: 'include', headers, ...opts })
  }

  const $put = async (path: string, body?: any, opts: any = {}) => {
    const url = buildUrl(path)
    const headers = { ...authHeader, lang: localeValue() || 'sa', ...(opts.headers||{}) }
    console.log('[API:$put]', url, body, { guestId: guestId?.value, guestCookie: guestCookie?.value })
    return await $fetch(url, { method: 'PUT', body, credentials: 'include', headers, ...opts })
  }

  const $del = async (path: string, body?: any, opts: any = {}) => {
    const url = buildUrl(path)
    const headers = { ...authHeader, lang: localeValue() || 'sa', ...(opts.headers||{}) }
    console.log('[API:$del]', url, body, { guestId: guestId?.value, guestCookie: guestCookie?.value })
    return await $fetch(url, { method: 'DELETE', body, credentials: 'include', headers, ...opts })
  }

  return { $get, $post, $put, $del }
}
