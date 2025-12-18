// Comparison composable using localStorage
// Nuxt auto-imports defineComponent APIs at runtime; declare ref for TS when types aren't generated
declare function ref<T = any>(v?: T): { value: T }
declare function computed<T = any>(fn: () => T): { value: T }

// Singleton state
const items = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const STORAGE_KEY = 'compare_items'
const MAX_COMPARE_ITEMS = 4 // Maximum items that can be compared

export function useCompare() {
  // Load items from localStorage on client side
  const loadFromStorage = () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            // Clean up old data and migrate to new format
            items.value = parsed.map(item => ({
              id: item.id,
              name: item.name,
              price: item.price || 0,
              image: item.image || '', // Keep image field if it exists
              slug: item.slug || '',
              brand: item.brand || '',
              category: item.category || '',
              rating: item.rating || 0,
              reviews_count: item.reviews_count || 0,
              description: item.description || '',
              meta_description: item.meta_description || '',
              colors: item.colors || [],
              variation: item.variation || null,
              features: item.features || [],
              specifications: item.specifications || {},
              added_at: item.added_at || new Date().toISOString()
            }))
            // Save cleaned data back to localStorage
            saveToStorage()
          } else {
            items.value = []
          }
        }
      } catch (e) {
        console.warn('Failed to load compare items from localStorage:', e)
        items.value = []
      }
    }
  }

  // Save items to localStorage
  const saveToStorage = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
      } catch (e) {
        console.warn('Failed to save compare items to localStorage:', e)
      }
    }
  }

  // Initialize on mount
  const init = () => {
    loadFromStorage()
  }

  // Add product to comparison
  const add = (product: any) => {
    if (!product || !product.id) {
      error.value = 'Invalid product'
      return false
    }

    // Check if already exists
    const exists = items.value.find(item => item.id === product.id)
    if (exists) {
      error.value = 'Product already in comparison'
      return false
    }

    // Check maximum limit
    if (items.value.length >= MAX_COMPARE_ITEMS) {
      error.value = `Maximum ${MAX_COMPARE_ITEMS} items can be compared`
      return false
    }

    loading.value = true
    error.value = null

    try {
      // Helper function to extract URL from object or string
      const extractUrlValue = (obj: any): string | null => {
        if (!obj) return null
        if (typeof obj === 'string') return obj
        if (typeof obj === 'object') {
          // Check if it's a valid URL object (not 404)
          if (obj.path && obj.status !== 404) return obj.path
          if (obj.key && (!obj.path || obj.status === 404)) return null
          if (obj.path) return obj.path
          if (obj.url) return obj.url
          if (obj.image) return obj.image
        }
        return null
      }

      // Helper function to get product image URL (similar to ProductCard logic)
      const getProductImageUrl = (product: any): string => {
        const p = product || {}
        
        // Helper to check if URL object is valid
        const isValidUrlObject = (obj: any): boolean => {
          if (!obj || typeof obj !== 'object') return false
          if (obj.path && obj.status !== 404) return true
          if (obj.key && (!obj.path || obj.status === 404)) return false
          return true
        }
        
        // Try to get thumbnail_full_url, but check if it's valid
        let thumbnailFullUrl = p?.thumbnail_full_url || p?.product?.thumbnail_full_url
        if (thumbnailFullUrl && typeof thumbnailFullUrl === 'object') {
          if (!isValidUrlObject(thumbnailFullUrl)) {
            thumbnailFullUrl = null
          } else {
            thumbnailFullUrl = extractUrlValue(thumbnailFullUrl)
          }
        }
        
        // Try to get image_full_url, but check if it's valid
        let imageFullUrl = p?.image_full_url || p?.product?.image_full_url
        if (imageFullUrl && typeof imageFullUrl === 'object') {
          if (!isValidUrlObject(imageFullUrl)) {
            imageFullUrl = null
          } else {
            imageFullUrl = extractUrlValue(imageFullUrl)
          }
        }
        
        // Helper to get string value from field (handle arrays)
        const getStringValue = (field: any): string | null => {
          if (!field) return null
          if (typeof field === 'string') return field
          if (Array.isArray(field) && field.length > 0) {
            const first = field.find((item: any) => typeof item === 'string')
            return first || null
          }
          if (typeof field === 'object' && field.path) return field.path
          if (typeof field === 'object' && field.key) return field.key
          return null
        }
        
        // Try each field and get string value
        const raw =
          getStringValue(thumbnailFullUrl) ||
          getStringValue(imageFullUrl) ||
          getStringValue(p?.photo_full_url) ||
          getStringValue(p?.images_full_url) ||
          getStringValue(p?.product?.photo_full_url) ||
          getStringValue(p?.product?.images_full_url) ||
          getStringValue(p?.thumbnail) ||
          getStringValue(p?.image) ||
          getStringValue(p?.photo) ||
          getStringValue(p?.product?.thumbnail) ||
          getStringValue(p?.product?.image) ||
          getStringValue(p?.product?.photo) ||
          ''
        
        if (!raw) return ''
        
        // If already a full URL, return as is
        if (/^(https?:|data:|blob:)/i.test(raw)) {
          return raw
        }
        
        // Get base URL from runtime config
        const cfg = useRuntimeConfig()
        const assetBase = (cfg?.public?.apiBase || 'https://admin.gotawfeer.com/api').replace(/\/api(?:\/v\d+)?$/, '')
        
        // Normalize path
        let path = String(raw).trim().replace(/\\/g, '/')
        path = path.replace(/^public\//, '')
        path = path.replace(/^app\/public\//, '')
        path = path.replace(/^storage\/app\/public\//, '')
        path = path.replace(/\/+/g, '/').replace(/^\//, '')
        
        // If it's just a filename, add to product/thumbnail path
        if (!path.includes('/')) {
          path = `storage/app/public/product/thumbnail/${path}`
        } else if (!path.startsWith('storage/')) {
          path = `storage/app/public/product/${path}`
        }
        
        return `${assetBase}/${path}`
      }

      // Helper function to extract colors from product
      const extractColors = (product: any): any[] => {
        // Try colors_formatted first
        if (product?.colors_formatted && Array.isArray(product.colors_formatted) && product.colors_formatted.length > 0) {
          return product.colors_formatted.map((color: any) => ({
            name: color.name || color.code || 'Color',
            code: color.code || color.name || '',
            hex: color.hex || color.code || ''
          }))
        }
        
        // Try nested product.colors_formatted
        if (product?.product?.colors_formatted && Array.isArray(product.product.colors_formatted) && product.product.colors_formatted.length > 0) {
          return product.product.colors_formatted.map((color: any) => ({
            name: color.name || color.code || 'Color',
            code: color.code || color.name || '',
            hex: color.hex || color.code || ''
          }))
        }
        
        // Try simple colors array
        if (product?.colors && Array.isArray(product.colors) && product.colors.length > 0) {
          return product.colors.map((color: string | any, index: number) => {
            if (typeof color === 'string') {
              return {
                name: `Color ${index + 1}`,
                code: color,
                hex: color
              }
            }
            return {
              name: color.name || color.code || `Color ${index + 1}`,
              code: color.code || color.name || color,
              hex: color.hex || color.code || color
            }
          })
        }
        
        // Try nested product.colors
        if (product?.product?.colors && Array.isArray(product.product.colors) && product.product.colors.length > 0) {
          return product.product.colors.map((color: string | any, index: number) => {
            if (typeof color === 'string') {
              return {
                name: `Color ${index + 1}`,
                code: color,
                hex: color
              }
            }
            return {
              name: color.name || color.code || `Color ${index + 1}`,
              code: color.code || color.name || color,
              hex: color.hex || color.code || color
            }
          })
        }
        
        return []
      }

      // Helper function to extract variation from product
      const extractVariation = (product: any): any => {
        // Try variation field directly
        if (product?.variation) {
          return product.variation
        }
        
        // Try nested product.variation
        if (product?.product?.variation) {
          return product.product.variation
        }
        
        // Try variations array (take first one)
        if (product?.variations && Array.isArray(product.variations) && product.variations.length > 0) {
          return product.variations[0]
        }
        
        // Try nested product.variations
        if (product?.product?.variations && Array.isArray(product.product.variations) && product.product.variations.length > 0) {
          return product.product.variations[0]
        }
        
        return null
      }

      // Add product with essential data including full image URL
      const compareItem = {
        id: product.id,
        name: product.name,
        price: product.price || product.unit_price || product.selling_price || 0,
        image: getProductImageUrl(product),
        slug: product.slug,
        brand: product.brand?.name || product.brand_name || '',
        category: product.category?.name || product.category_name || '',
        rating: product.rating || 0,
        reviews_count: product.reviews_count || 0,
        description: product.description || '',
        meta_description: product.meta_description || product.product?.meta_description || product.seo_description || '',
        colors: extractColors(product),
        variation: extractVariation(product),
        features: product.features || [],
        specifications: product.specifications || {},
        added_at: new Date().toISOString()
      }

      items.value.push(compareItem)
      saveToStorage()
      return true
    } catch (e: any) {
      error.value = e?.message || 'Failed to add product to comparison'
      return false
    } finally {
      loading.value = false
    }
  }

  // Remove product from comparison
  const remove = (productId: number) => {
    loading.value = true
    error.value = null

    try {
      const index = items.value.findIndex(item => item.id === productId)
      if (index > -1) {
        items.value.splice(index, 1)
        saveToStorage()
        return true
      }
      error.value = 'Product not found in comparison'
      return false
    } catch (e: any) {
      error.value = e?.message || 'Failed to remove product from comparison'
      return false
    } finally {
      loading.value = false
    }
  }

  // Check if product is in comparison
  const isInCompare = (productId: number) => {
    return items.value.some(item => item.id === productId)
  }

  // Clear all items
  const clearAll = () => {
    loading.value = true
    error.value = null

    try {
      items.value = []
      saveToStorage()
      return true
    } catch (e: any) {
      error.value = e?.message || 'Failed to clear comparison'
      return false
    } finally {
      loading.value = false
    }
  }

  // Get comparison count
  const compareCount = computed(() => items.value.length)

  // Check if comparison is full
  const isFull = computed(() => items.value.length >= MAX_COMPARE_ITEMS)

  // Check if comparison is empty
  const isEmpty = computed(() => items.value.length === 0)

  // Get comparison items
  const getItems = () => items.value

  // Clear old data and reset
  const clearOldData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      items.value = []
    }
  }

  return {
    items,
    loading,
    error,
    compareCount,
    isFull,
    isEmpty,
    init,
    add,
    remove,
    isInCompare,
    clearAll,
    getItems,
    clearOldData
  }
}
