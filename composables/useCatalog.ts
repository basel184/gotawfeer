// Catalog data helpers: categories and brands for filters
export function useCatalog() {
  const { $get } = useApi()

  // Categories: tree with childes; used to render filter lists
  const categories = (params: any = {}) => {
    const qs = new URLSearchParams(params).toString()
    return $get(`v1/categories${qs ? `?${qs}` : ''}`)
  }

  // Brands: returns { total_size, limit, offset, brands: [] }
  const brands = async (params: any = {}) => {
    const defaults = { limit: 200, offset: 1 }
    const merged = { ...defaults, ...params }
    const qs = new URLSearchParams(merged as Record<string, string>).toString()
    const response = await $get(`v1/brands?${qs}`)
    
    console.log('[useCatalog] Brands API response:', response)
    
    // Handle different response structures
    if (Array.isArray(response)) {
      return { total_size: response.length, brands: response }
    }
    if (response?.brands) {
      return response
    }
    if (response?.data) {
      return {
        total_size: response.total_size || response.total || (Array.isArray(response.data) ? response.data.length : 0),
        brands: Array.isArray(response.data) ? response.data : []
      }
    }
    // Return empty structure if response doesn't match expected format
    return { total_size: 0, brands: [] }
  }

  return { categories, brands }
}
