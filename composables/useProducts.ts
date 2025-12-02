// Centralized product API helpers
export function useProducts() {
  const { $get, $post } = useApi()

  // Lists
  const latest = () => $get('v1/products/latest')
  const featured = () => $get('v1/products/featured')
  const topRated = () => $get('v1/products/top-rated')
  const bestSellings = () => $get('v1/products/best-sellings')
  const newArrival = () => $get('v1/products/new-arrival')
  const discounted = () => $get('v1/products/discounted-product')
  const justForYou = () => $get('v1/products/just-for-you')
  const clearance = () => $get('v1/products/clearance-sale')

  // Category & Brand
  const byCategory = (categoryId: string | number) => $get(`v1/categories/products/${categoryId}`)
  const byBrand = (brandId: string | number) => $get(`v1/brands/products/${brandId}`)

  // Search & filter
  const search = (q: string, limit = 24, offset = 1) => {
    // Use POST request with body as expected by backend
    return $post('v1/products/search', {
      name: q,
      limit: limit,
      offset: offset
    })
  }
  const filter = (body: any) => $post('v1/products/filter', body)

  // Details and related
  const details = (slug: string) => {
    // Ensure slug is properly encoded (but not double-encoded)
    const cleanSlug = slug ? String(slug).trim() : ''
    if (!cleanSlug) {
      throw new Error('Product slug is required')
    }
    // Encode slug for URL (handles special characters)
    const encodedSlug = encodeURIComponent(cleanSlug)
    console.log('[useProducts] Fetching product details:', { original: cleanSlug, encoded: encodedSlug })
    return $get(`v1/products/details/${encodedSlug}`)
  }
  const related = (productId: string | number) => $get(`v1/products/related-products/${productId}`)

  return {
    latest, featured, topRated, bestSellings, newArrival, discounted, justForYou, clearance,
    byCategory, byBrand, search, filter, details, related
  }
}
