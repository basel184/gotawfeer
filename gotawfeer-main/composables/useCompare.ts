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

  // Fetch product details from API by slug
  const fetchProductBySlug = async (slug: string): Promise<any> => {
    try {
      // Always use the admin API base URL for fetching product data
      const apiBase = 'https://admin.gotawfeer.com/api'
      
      const response = await fetch(`${apiBase}/v2/products/${slug}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch product: ${response.status}`)
      }
      
      const data = await response.json()
      return data.data || data
    } catch (e: any) {
      console.error('Error fetching product by slug:', e)
      return null
    }
  }

  // Add product to comparison using slug (fetches full data from API)
  const addBySlug = async (slug: string, selectedColor?: string, selectedVariation?: string, colorImage?: string): Promise<boolean> => {
    if (!slug) {
      error.value = 'Invalid product slug'
      return false
    }

    // Check maximum limit first
    if (items.value.length >= MAX_COMPARE_ITEMS) {
      error.value = `Maximum ${MAX_COMPARE_ITEMS} items can be compared`
      return false
    }

    loading.value = true
    error.value = null

    try {
      // Fetch full product data from API
      const productData = await fetchProductBySlug(slug)
      
      if (!productData) {
        error.value = 'Failed to fetch product data'
        loading.value = false
        return false
      }

      // Use the add function with fetched data
      const result = add(productData, selectedColor, selectedVariation, colorImage)
      return result
    } catch (e: any) {
      error.value = e?.message || 'Failed to add product to comparison'
      loading.value = false
      return false
    }
  }

  // Add product to comparison (with optional color and variation)
  const add = (product: any, selectedColor?: string, selectedVariation?: string, colorImage?: string) => {
    if (!product || !product.id) {
      error.value = 'Invalid product'
      return false
    }

    // Create unique key based on product id + color + variation
    const uniqueKey = `${product.id}-${selectedColor || 'default'}-${selectedVariation || 'default'}`
    
    // Check if this exact combination already exists
    const exists = items.value.find(item => item.uniqueKey === uniqueKey)
    if (exists) {
      error.value = 'Product with this color/variation already in comparison'
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
        
        // Use fixed base URL
        const assetBase = 'https://admin.gotawfeer.com'
        
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

      // Helper function to get color image from color_images_full_url
      const getColorImageFromProduct = (product: any, colorCode: string): string | null => {
        const colorImages = product?.color_images_full_url || product?.product?.color_images_full_url || []
        if (!Array.isArray(colorImages) || colorImages.length === 0) return null
        
        // Normalize color code for comparison
        const normalizeCode = (code: string) => String(code || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const normalizedColorCode = normalizeCode(colorCode)
        
        // Find matching color image
        const colorImage = colorImages.find((img: any) => {
          const imgColor = normalizeCode(img.color || img.code || '')
          return imgColor === normalizedColorCode
        })
        
        if (colorImage) {
          const imagePath = colorImage.image_name || colorImage.image || colorImage.path
          if (imagePath) {
            // If already a full URL, return as is
            if (/^(https?:|data:|blob:)/i.test(imagePath)) {
              return imagePath
            }
            // Build full URL with fixed base
            const assetBase = 'https://admin.gotawfeer.com'
            return `${assetBase}/storage/app/public/product/${imagePath}`
          }
        }
        return null
      }

      // Helper function to extract colors from product
      const extractColors = (product: any): any[] => {
        // Try colors_formatted first
        if (product?.colors_formatted && Array.isArray(product.colors_formatted) && product.colors_formatted.length > 0) {
          return product.colors_formatted.map((color: any) => ({
            name: color.name || color.code || 'Color',
            code: color.code || color.name || '',
            hex: color.hex || color.code || '',
            image: getColorImageFromProduct(product, color.code || color.name || '')
          }))
        }
        
        // Try nested product.colors_formatted
        if (product?.product?.colors_formatted && Array.isArray(product.product.colors_formatted) && product.product.colors_formatted.length > 0) {
          return product.product.colors_formatted.map((color: any) => ({
            name: color.name || color.code || 'Color',
            code: color.code || color.name || '',
            hex: color.hex || color.code || '',
            image: getColorImageFromProduct(product, color.code || color.name || '')
          }))
        }
        
        // Try simple colors array
        if (product?.colors && Array.isArray(product.colors) && product.colors.length > 0) {
          return product.colors.map((color: string | any, index: number) => {
            if (typeof color === 'string') {
              return {
                name: `Color ${index + 1}`,
                code: color,
                hex: color,
                image: getColorImageFromProduct(product, color)
              }
            }
            return {
              name: color.name || color.code || `Color ${index + 1}`,
              code: color.code || color.name || color,
              hex: color.hex || color.code || color,
              image: getColorImageFromProduct(product, color.code || color.name || '')
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
                hex: color,
                image: getColorImageFromProduct(product, color)
              }
            }
            return {
              name: color.name || color.code || `Color ${index + 1}`,
              code: color.code || color.name || color,
              hex: color.hex || color.code || color,
              image: getColorImageFromProduct(product, color.code || color.name || '')
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
      // Use color-specific image if provided, otherwise use default product image
      const productImage = colorImage || getProductImageUrl(product)
      
      // Build display name with color/variation info
      let displayName = product.name
      if (selectedColor || selectedVariation) {
        const parts = []
        if (selectedColor) parts.push(selectedColor)
        if (selectedVariation) parts.push(selectedVariation)
        displayName = `${product.name} (${parts.join(' - ')})`
      }
      
      const compareItem = {
        id: product.id,
        uniqueKey: `${product.id}-${selectedColor || 'default'}-${selectedVariation || 'default'}`,
        name: displayName,
        originalName: product.name,
        price: product.price || product.unit_price || product.selling_price || 0,
        image: productImage,
        slug: product.slug,
        brand: product.brand?.name || product.brand_name || '',
        category: product.category?.name || product.category_name || '',
        rating: product.rating || 0,
        reviews_count: product.reviews_count || 0,
        description: product.description || '',
        meta_description: product.meta_description || product.product?.meta_description || product.seo_description || '',
        colors: extractColors(product),
        variation: extractVariation(product),
        selectedColor: selectedColor || null,
        selectedVariation: selectedVariation || null,
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

  // Remove product from comparison (by uniqueKey or productId)
  const remove = (productIdOrKey: number | string) => {
    loading.value = true
    error.value = null

    try {
      let index = -1
      
      // If it's a string, treat as uniqueKey
      if (typeof productIdOrKey === 'string') {
        index = items.value.findIndex(item => item.uniqueKey === productIdOrKey)
      } else {
        // If it's a number, find by id (removes first match)
        index = items.value.findIndex(item => item.id === productIdOrKey)
      }
      
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

  // Check if product is in comparison (can check by id only or by id+color+variation)
  const isInCompare = (productId: number, selectedColor?: string, selectedVariation?: string) => {
    if (selectedColor || selectedVariation) {
      // Check for exact match with color/variation
      const uniqueKey = `${productId}-${selectedColor || 'default'}-${selectedVariation || 'default'}`
      return items.value.some(item => item.uniqueKey === uniqueKey)
    }
    // Check if any variant of this product is in compare
    return items.value.some(item => item.id === productId)
  }
  
  // Get unique key for a product with color/variation
  const getUniqueKey = (productId: number, selectedColor?: string, selectedVariation?: string) => {
    return `${productId}-${selectedColor || 'default'}-${selectedVariation || 'default'}`
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
    addBySlug,
    fetchProductBySlug,
    remove,
    isInCompare,
    getUniqueKey,
    clearAll,
    getItems,
    clearOldData
  }
}
