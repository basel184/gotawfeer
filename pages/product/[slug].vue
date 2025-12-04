<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
// Import Swiper Vue.js components
import { Swiper, SwiperSlide } from 'swiper/vue'
// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/thumbs'
// Import required modules
import { Navigation, Thumbs } from 'swiper/modules'
import { useWishlist } from '../../composables/useWishlist'
import { useCart } from '../../composables/useCart'
import { useCompare } from '../../composables/useCompare'
import { useTaqnyatAuth } from '../../composables/useTaqnyatAuth'

// Register Swiper components globally for this component
const SwiperComponent = Swiper
const SwiperSlideComponent = SwiperSlide

const route = useRoute()
const { t, locale } = useI18n()
const { details: getDetails, related: getRelated, filter: filterProducts } = useProducts() as any
const cart = useCart()
const wishlist = useWishlist()
const compare = useCompare()

// SEO Configuration
const seo = useSeo()

// Product data - must be defined before computed properties and watch
const loading = ref(true)
const loadingProgress = ref(0)
const error = ref<string>('')
const product = ref<any>(null)
const recLoading = ref(true)
const recommended = ref<any[]>([])

// Offer products (4 random products)
const offerProducts = ref<any[]>([])
const offerProductsLoading = ref(false)

// Current URL for structured data
const currentUrl = computed(() => {
  if (process.client) {
    return window.location.href
  }
  return `${seo.siteUrl.value}${route.path}`
})

// Computed properties for SEO
const productTitle = computed(() => {
  const p: any = product.value || {}
  return p?.name || p?.product_name || p?.product?.name || ''
})

const productDescription = computed(() => {
  const p: any = product.value || {}
  return metaDescription.value || 
         p?.short_description || 
         p?.description || 
         p?.details || 
         p?.product?.short_description || 
         p?.product?.description || 
         p?.product?.details || 
         ''
})

const productImage = computed(() => {
  return getProductImage(product.value)
})

const productPrice = computed(() => {
  return finalPrice.value > 0 ? finalPrice.value : basePrice.value
})

const productCurrency = computed(() => {
  return 'SAR'
})

const productAvailability = computed(() => {
  return inStock.value ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
})

// Helper to get category name for SEO (extracts directly from product data)
const getCategoryNameForSeo = computed(() => {
  const p: any = product.value || {}
  
  // Try category_ids first (array of categories)
  const categoryIds = p?.category_ids || p?.product?.category_ids
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    const firstCategory = categoryIds[0]
    if (firstCategory?.name) return firstCategory.name
    if (firstCategory?.category_name) return firstCategory.category_name
    if (firstCategory?.title) return firstCategory.title
  }
  
  // Try to get category from product data
  const categories = p?.categories || p?.category || p?.product?.categories || p?.product?.category
  if (Array.isArray(categories) && categories.length > 0) {
    const firstCat = categories[0]
    if (firstCat?.name) return firstCat.name
    if (firstCat?.category_name) return firstCat.category_name
    if (firstCat?.title) return firstCat.title
  }
  
  if (categories && typeof categories === 'object') {
    if (categories.name) return categories.name
    if (categories.category_name) return categories.category_name
    if (categories.title) return categories.title
  }
  
  // Fallback to direct category fields
  const category = p?.category || p?.category_name || p?.product?.category || p?.product?.category_name
  if (typeof category === 'string') return category
  if (category?.name) return category.name
  if (category?.category_name) return category.category_name
  if (category?.title) return category.title
  
  return ''
})

const productBrand = computed(() => {
  return brandName.value
})

const productSku = computed(() => {
  const p: any = product.value || {}
  return p?.code || p?.sku || p?.product?.code || p?.product?.sku || ''
})

// Set SEO when product data is available
watch(() => [product.value, locale.value], () => {
  if (product.value) {
    const categoryName = getCategoryNameForSeo.value
    const keywords = [
      productTitle.value,
      productBrand.value,
      categoryName,
      locale.value === 'ar' ? 'تسوق' : 'shop',
      locale.value === 'ar' ? 'شراء' : 'buy',
      locale.value === 'ar' ? 'منتج' : 'product'
    ].filter(Boolean).join(', ')

    seo.setSeo({
      title: productTitle.value,
      description: productDescription.value || `${productTitle.value} - ${productBrand.value} - ${locale.value === 'ar' ? 'تسوق الآن من جو توفير' : 'Shop now from Go Tawfeer'}`,
      image: productImage.value,
      keywords: keywords,
      type: 'product'
    })
  }
}, { immediate: true })

// Modal state - global state for product modal
const selectedProductForModal = useState<any>('selectedProductForModal', () => null)

// Wishlist data
const isInWishlist = ref(false)
const wishlistLoading = ref(false)
// Helper function to get localized path with proper i18n handling
const getLocalizedPath = (path: string): string => {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  
  // Get current locale from i18n
  const currentLocale = locale.value || 'ar'
  
  // If English locale, add /en prefix
  if (currentLocale === 'en') {
    // Don't add prefix if already present
    if (cleanPath.startsWith('/en')) {
      return cleanPath
    }
    // Add /en prefix
    return `/en${cleanPath}`
  }
  
  // For Arabic (default), remove /en prefix if present
  if (cleanPath.startsWith('/en')) {
    return cleanPath.substring(3) || '/'
  }
  
  return cleanPath
}
// Compare data
const isInCompare = ref(false)
const compareLoading = ref(false)

// Success message state
const showSuccessMessage = ref(false)
const successMessage = ref('')

// Show success message function
const showSuccess = (message: string) => {
  successMessage.value = message
  showSuccessMessage.value = true
  setTimeout(() => {
    showSuccessMessage.value = false
  }, 3000) // Hide after 3 seconds
}

// Reviews data
const reviews = ref<any[]>([])
const reviewsLoading = ref(false)
const reviewsError = ref('')
const totalReviewsCount = ref(0)
const averageRating = ref(0)

// Decode slug from route params (Nuxt automatically decodes, but ensure it's a string)
const slug = computed(() => {
  const param = route.params.slug
  if (!param) {
    console.warn('[Product] No slug in route params')
    return ''
  }
  
  // Nuxt automatically decodes route params, but ensure it's a string
  let decoded = typeof param === 'string' ? param : String(param)
  
  // Double-decode if needed (in case of double encoding)
  try {
    if (decoded.includes('%')) {
      decoded = decodeURIComponent(decoded)
    }
  } catch (e) {
    // If decode fails, use original
    console.warn('[Product] Failed to decode slug:', decoded, e)
  }
  
  // Log for debugging
  if (process.client) {
    console.log('[Product] Slug from route:', {
      original: param,
      decoded: decoded,
      type: typeof param
    })
  }
  
  return decoded
})

// Helper functions to extract product data
const getProductImage = (product: any): string => {
  if (!product) return ''
  
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
  
  const raw = getStringValue(product?.thumbnail_full_url) ||
              getStringValue(product?.image_full_url) ||
              getStringValue(product?.photo_full_url) ||
              getStringValue(product?.images_full_url) ||
              getStringValue(product?.thumbnail) ||
              getStringValue(product?.image) ||
              getStringValue(product?.photo) ||
              getStringValue(product?.images) ||
              ''
  
  if (!raw) return ''
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw
  return normalize(raw)
}

const getProductTitle = (product: any): string => {
  if (!product) return 'Product'
  return product?.name || product?.product_name || product?.product?.name || product?.product?.product_name || 'Product'
}

const getProductPrice = (product: any): { final: number; old: number; hasDiscount: boolean } => {
  if (!product) return { final: 0, old: 0, hasDiscount: false }
  
  const basePrice = Number(product?.unit_price ?? product?.price ?? product?.product?.unit_price ?? product?.product?.price ?? 0)
  const discount = Number(product?.discount ?? product?.product?.discount ?? 0)
  const discountType = product?.discount_type || product?.product?.discount_type || 'flat'
  
  const isPercent = String(discountType).toLowerCase().startsWith('per')
  const diff = discount && basePrice ? (isPercent ? (basePrice * discount) / 100 : discount) : 0
  const finalPrice = Math.max(0, basePrice - diff)
  const hasDiscount = finalPrice > 0 && finalPrice < basePrice
  
  return { final: finalPrice, old: basePrice, hasDiscount }
}

const formatPrice = (n: number): string => {
  if (!isFinite(n) || n <= 0) return '0'
  try { 
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) 
  } catch { 
    return String(n) 
  }
}

// Load offer products
const loadOfferProducts = async () => {
  offerProductsLoading.value = true
  try {
    // Use POST request with body (as required by the API)
    const body = {
      limit: 50, // Get more products to have better random selection
      offset: 1
    }
    
    const response = await filterProducts(body)
    
    // Extract products from response (handle different response structures)
    let products: any[] = []
    if (Array.isArray(response)) {
      products = response
    } else if (Array.isArray(response?.data)) {
      products = response.data
    } else if (Array.isArray(response?.products)) {
      products = response.products
    } else if (Array.isArray(response?.items)) {
      products = response.items
    }
    
    // Filter out current product if it exists
    const currentProductId = product.value?.id || product.value?.product_id
    if (currentProductId) {
      products = products.filter((p: any) => {
        const pid = p?.id || p?.product_id
        return pid !== currentProductId
      })
    }
    
    // Shuffle array and take 4 random products
    const shuffled = [...products].sort(() => Math.random() - 0.5)
    offerProducts.value = shuffled.slice(0, 4)
  } catch (error) {
    console.error('Failed to load offer products:', error)
    offerProducts.value = []
  } finally {
    offerProductsLoading.value = false
  }
}

// Load offer products when product is loaded
watch(() => product.value, (newProduct) => {
  if (newProduct) {
    loadOfferProducts()
  }
}, { immediate: true })

// Helpers to normalize media paths similar to ProductCard
const cfg = useRuntimeConfig() as any
const assetBase = (cfg?.public?.apiBase || 'https://gotawfeer.com/project/api').replace(/\/api(?:\/v\d+)?$/, '')
const fixPath = (s: string) => {
  let p = (s || '').trim().replace(/\\/g, '/')
  
  // Handle different path formats
  if (p.startsWith('public/')) {
    p = p.replace(/^public\//, '')
  } else if (p.startsWith('app/public/')) {
    p = p.replace(/^app\/public\//, 'storage/')
  } else if (p.startsWith('storage/')) {
    // Already correct format
  } else if (!p.startsWith('http') && !p.startsWith('/')) {
    // If it's just a filename, determine the correct storage path
    if (p.includes('testimonial')) {
      p = `storage/testimonials/${p}`
    } else if (p.includes('brand')) {
      p = `storage/brand/${p}`
    } else if (p.includes('product')) {
      p = `storage/product/${p}`
    } else {
      p = `storage/${p}`
    }
  }
  
  // Clean up slashes
  p = p.replace(/\/+/g, '/').replace(/^\//, '')
  
  return p
}
const normalize = (s: any): string => {
  if (!s) return ''
  if (Array.isArray(s)) return normalize(s[0])
  let v: any = s
  if (typeof s === 'string') {
    const trimmed = s.trim()
    if ((trimmed.startsWith('[') || trimmed.startsWith('{'))) {
      try { const parsed = JSON.parse(trimmed); return normalize(parsed) } catch {}
    }
    v = trimmed
  } else if (typeof s === 'object') {
    // Handle different object formats
    v = (s as any).path || (s as any).url || (s as any).image || (s as any).key || ''
  }
  v = (typeof v === 'string' ? v : '').trim()
  if (!v) return ''
  if (/^(https?:|data:|blob:)/i.test(v)) return v
  return `${assetBase}/${fixPath(v)}`
}

// Helper to normalize color code for matching
const normalizeColorCode = (code: string | null | undefined): string => {
  if (!code) return ''
  return String(code).toUpperCase().replace(/^#/, '').trim()
}

// Helper to parse color_image if it's a JSON string
const parseColorImage = (colorImage: any): any[] | null => {
  if (!colorImage) return null
  if (Array.isArray(colorImage)) return colorImage
  if (typeof colorImage === 'string') {
    try {
      const parsed = JSON.parse(colorImage)
      return Array.isArray(parsed) ? parsed : null
    } catch (e) {
      console.warn('[Product] Failed to parse color_image JSON:', e)
      return null
    }
  }
  return null
}

// Detect mobile screen size
const isMobile = ref(false)
const checkMobile = () => {
  if (process.client) {
    isMobile.value = window.innerWidth < 768
  }
}

// Thumbnail swiper direction - vertical on desktop, horizontal on mobile
const thumbnailDirection = computed(() => {
  return isMobile.value ? 'horizontal' : 'vertical'
})

const images = computed<string[]>(() => {
  const p: any = product.value || {}
  
  // Helper function to extract image path from image object
  const extractImagePath = (img: any): string | null => {
    if (!img) return null
    
    // Try image_name first - prioritize path if it's a full URL
    if (img.image_name) {
      if (typeof img.image_name === 'string') {
        // If it's already a full URL, return it directly
        const trimmed = img.image_name.trim()
        if (/^(https?:|data:|blob:)/i.test(trimmed)) {
          return trimmed
        }
        
        // If it's a filename (key), search in images_full_url for the matching path
        const imageKey = trimmed
        if (p?.images_full_url && Array.isArray(p.images_full_url)) {
          const matchedImage = p.images_full_url.find((fullImg: any) => {
            if (fullImg.key && fullImg.key === imageKey) {
              return true
            }
            // Also check if key is in path
            if (fullImg.path && typeof fullImg.path === 'string' && fullImg.path.includes(imageKey)) {
              return true
            }
            return false
          })
          
          if (matchedImage && matchedImage.path) {
            const pathStr = String(matchedImage.path).trim()
            if (/^(https?:|data:|blob:)/i.test(pathStr)) {
              return pathStr
            }
            return normalize(matchedImage.path)
          }
        }
        
        // Fallback to normalize the string
        return normalize(trimmed)
      } else if (img.image_name.path) {
        // If path is a full URL, return it directly (this is the preferred source)
        const pathStr = String(img.image_name.path).trim()
        if (/^(https?:|data:|blob:)/i.test(pathStr)) {
          return pathStr
        }
        return normalize(img.image_name.path)
      } else if (img.image_name.key) {
        // Search in images_full_url for the matching path using key
        const imageKey = img.image_name.key
        if (p?.images_full_url && Array.isArray(p.images_full_url)) {
          const matchedImage = p.images_full_url.find((fullImg: any) => {
            if (fullImg.key && fullImg.key === imageKey) {
              return true
            }
            // Also check if key is in path
            if (fullImg.path && typeof fullImg.path === 'string' && fullImg.path.includes(imageKey)) {
              return true
            }
            return false
          })
          
          if (matchedImage && matchedImage.path) {
            const pathStr = String(matchedImage.path).trim()
            if (/^(https?:|data:|blob:)/i.test(pathStr)) {
              return pathStr
            }
            return normalize(matchedImage.path)
          }
        }
        // Fallback to normalize the key
        return normalize(img.image_name.key)
      }
    }
    
    // Try direct image fields
    if (img.image) {
      if (typeof img.image === 'string') {
        const trimmed = img.image.trim()
        if (/^(https?:|data:|blob:)/i.test(trimmed)) {
          return trimmed
        }
        return normalize(trimmed)
      } else if (img.image.path) {
        const pathStr = String(img.image.path).trim()
        if (/^(https?:|data:|blob:)/i.test(pathStr)) {
          return pathStr
        }
        return normalize(img.image.path)
      } else if (img.image.key) {
        return normalize(img.image.key)
      }
    }
    
    // Try path or key directly
    if (img.path) {
      const pathStr = String(img.path).trim()
      if (/^(https?:|data:|blob:)/i.test(pathStr)) {
        return pathStr
      }
      return normalize(img.path)
    }
    if (img.key) return normalize(img.key)
    
    return null
  }
  
  // If a variation is selected (with or without color), filter images by variation
  if (selectedVariation.value) {
    console.log('[Product] Filtering images by selected variation:', {
      selectedVariation: selectedVariation.value,
      selectedColor: selectedColor.value
    })
    
    // Check if variations are linked to colors by examining variation.type
    let variationsLinkedToColors = false
    if (p?.variation && Array.isArray(p.variation)) {
      variationsLinkedToColors = p.variation.some((v: any) => {
        if (v.type && typeof v.type === 'string') {
          const parts = v.type.split('-')
          if (parts.length >= 2) {
            const lastPart = parts[parts.length - 1].trim()
            const sizeOption = p?.choice_options?.find((option: any) => 
              option.title === 'Size' || option.name === 'choice_2'
            )
            if (sizeOption && sizeOption.options && sizeOption.options.includes(lastPart)) {
              return true
            }
          }
        }
        return false
      })
    }
    
    // Build the variation_types pattern to match
    let variationPatternsToMatch: string[] = []
    
    // If color is selected and variations are linked to colors, create color-variation pattern
    if (selectedColor.value && selectedVariation.value && variationsLinkedToColors) {
      const selectedColorName = selectedColor.value
      
      // Check if the selected color is a hex code (from colors array) or a color name (from variation.type)
      const isHexColor = /^#?[0-9A-Fa-f]{6}$/.test(selectedColorName.replace('#', ''))
      
      if (isHexColor) {
        // If it's a hex color from colors array, use selectedVariant.type if available
        // This ensures we use the exact variant type (e.g., "WARM PEACH 004-100ml")
        if (selectedVariant.value && selectedVariant.value.type) {
          // Use the exact variant type for filtering images
          variationPatternsToMatch = [selectedVariant.value.type]
        } else {
          // If no variant selected yet, try to find variant that matches the variation
          if (p?.variation && Array.isArray(p.variation)) {
            const matchingVariant = p.variation.find((v: any) => {
              if (v.type && typeof v.type === 'string') {
                const parts = v.type.split('-')
                if (parts.length >= 2) {
                  const lastPart = parts[parts.length - 1].trim()
                  return lastPart === selectedVariation.value && v.qty > 0
                }
              }
              return false
            })
            
            if (matchingVariant && matchingVariant.type) {
              // Use the exact variant type (e.g., "WARM PEACH 004-100ml")
              variationPatternsToMatch = [matchingVariant.type]
            } else {
              variationPatternsToMatch = [selectedVariation.value]
            }
          } else {
            variationPatternsToMatch = [selectedVariation.value]
          }
        }
      } else {
        // If it's a color name (from variation.type), use it directly to create exact pattern
        // e.g., "WARM PEACH 004-100ml" or "VERY BERRY 005-100ml"
        const colorVariationPattern = `${selectedColorName}-${selectedVariation.value}`
        variationPatternsToMatch = [colorVariationPattern]
      }
    } else if (selectedVariation.value) {
      // If only variation is selected (no color), use just the variation
      variationPatternsToMatch = [selectedVariation.value]
    }
    
    console.log('[Product] Variation patterns to match:', variationPatternsToMatch)
    
    let variationImages: string[] = []
    
    // First, check color_image (singular) field - parse if it's a JSON string
    // This is where variation_types is stored
    const parsedColorImage = parseColorImage(p?.color_image)
    if (parsedColorImage && Array.isArray(parsedColorImage)) {
      // Filter images that match the variation patterns
      const matchingColorImages = parsedColorImage.filter((img: any) => {
        // Check if variation_types matches any of the patterns
        if (img.variation_types && Array.isArray(img.variation_types) && img.variation_types.length > 0) {
          const matchesVariation = variationPatternsToMatch.some((pattern) => 
            img.variation_types.includes(pattern)
          )
          
          // If color is also selected and variations are NOT linked to colors, check color match too
          if (selectedColor.value && !variationsLinkedToColors) {
            const selectedColorObjForVariation = availableColors.value.find((c: any) => c.name === selectedColor.value)
            const colorCodeToMatchForVariation = selectedColorObjForVariation?.code || normalizeColorCode(selectedColor.value)
            const imgColorNormalized = normalizeColorCode(img.color)
            return matchesVariation && imgColorNormalized === colorCodeToMatchForVariation
          }
          
          // If variations are linked to colors, the pattern already includes the color
          // If no color selected, just check variation
          return matchesVariation
        }
        return false
      })
      
      // Now extract image paths from matching images
      // For each matching image, find the corresponding path in color_images_full_url or images_full_url
      matchingColorImages.forEach((img: any) => {
        const imageName = img.image_name
        
        // If image_name is a string, search for it in color_images_full_url or images_full_url
        if (typeof imageName === 'string') {
          const imageKey = imageName.trim()
          
          // First, try to find in color_images_full_url
          if (p?.color_images_full_url && Array.isArray(p.color_images_full_url)) {
            const matchedImage = p.color_images_full_url.find((fullImg: any) => {
              if (fullImg.image_name) {
                if (typeof fullImg.image_name === 'string' && fullImg.image_name.trim() === imageKey) {
                  return true
                }
                if (fullImg.image_name.key && fullImg.image_name.key === imageKey) {
                  return true
                }
              }
              return false
            })
            
            if (matchedImage) {
              const extractedPath = extractImagePath(matchedImage)
              if (extractedPath) {
                variationImages.push(extractedPath)
              }
            }
          }
          
          // If not found in color_images_full_url, try images_full_url
          if (p?.images_full_url && Array.isArray(p.images_full_url)) {
            const matchedImage = p.images_full_url.find((fullImg: any) => {
              if (fullImg.key && fullImg.key === imageKey) {
                return true
              }
              if (fullImg.path && typeof fullImg.path === 'string' && fullImg.path.includes(imageKey)) {
                return true
              }
              return false
            })
            
            if (matchedImage && matchedImage.path) {
              const pathStr = String(matchedImage.path).trim()
              if (/^(https?:|data:|blob:)/i.test(pathStr)) {
                variationImages.push(pathStr)
              } else {
                variationImages.push(normalize(matchedImage.path))
              }
            }
          }
        } else {
          // If image_name is an object, use extractImagePath directly
          const extractedPath = extractImagePath(img)
          if (extractedPath) {
            variationImages.push(extractedPath)
          }
        }
      })
    }
    
    // Note: color_images_full_url does NOT contain variation_types
    // variation_types is only in color_image, so we don't need to check color_images_full_url for variation_types
    
    if (variationImages.length > 0) {
      // Remove duplicates by extracting filename and comparing
      const getFilename = (url: string) => {
        try {
          const urlObj = new URL(url)
          const pathParts = urlObj.pathname.split('/')
          return pathParts[pathParts.length - 1] || url
        } catch {
          const parts = url.split('/')
          return parts[parts.length - 1].split('?')[0] || url
        }
      }
      
      // Use Set to track seen filenames for better duplicate removal
      const seenFilenames = new Set<string>()
      const uniqueImages = variationImages.filter((img) => {
        const filename = getFilename(img)
        if (seenFilenames.has(filename)) {
          return false
        }
        seenFilenames.add(filename)
        return true
      })
      
      // Final pass: keep only the one with the most complete path
      const finalImages: string[] = []
      const seenFilenamesFinal = new Set<string>()
      
      for (const img of uniqueImages) {
        const filename = getFilename(img)
        if (!seenFilenamesFinal.has(filename)) {
          seenFilenamesFinal.add(filename)
          finalImages.push(img)
        } else {
          const existingIndex = finalImages.findIndex((other) => getFilename(other) === filename)
          if (existingIndex !== -1 && img.length > finalImages[existingIndex].length) {
            finalImages[existingIndex] = img
          }
        }
      }
      
      console.log('[Product] Found variation-specific images:', finalImages.length, 'from', variationImages.length, 'total', finalImages)
      return finalImages
    } else {
      console.log('[Product] No variation-specific images found, checking color filter')
    }
  }
  
  // If a color is selected (but no variation), filter images by color
  if (selectedColor.value) {
    // Find the selected color object to get its normalized code
    const selectedColorObj = availableColors.value.find((c: any) => c.name === selectedColor.value)
    const colorCodeToMatch = selectedColorObj?.code || normalizeColorCode(selectedColor.value)
    
    console.log('[Product] Filtering images by selected color:', {
      selectedColor: selectedColor.value,
      colorCodeToMatch: colorCodeToMatch,
      availableColors: availableColors.value
    })
    
    // Check color_images_full_url
    let colorImages: string[] = []
    if (p?.color_images_full_url && Array.isArray(p.color_images_full_url)) {
      colorImages = p.color_images_full_url
        .filter((img: any) => {
          const imgColorNormalized = normalizeColorCode(img.color)
          return imgColorNormalized === colorCodeToMatch
        })
        .map(extractImagePath)
        .filter((x: string | null): x is string => typeof x === 'string' && x !== null)
    }
    
    // Also check color_image (singular) field - parse if it's a JSON string
    const parsedColorImageForColor = parseColorImage(p?.color_image)
    if (parsedColorImageForColor && Array.isArray(parsedColorImageForColor)) {
      const colorImageFromSingle = parsedColorImageForColor
        .filter((img: any) => {
          const imgColorNormalized = normalizeColorCode(img.color)
          // Exclude images that have variation_types (those should be filtered by variation)
          if (img.variation_types && Array.isArray(img.variation_types) && img.variation_types.length > 0) {
            return false // Skip images with variation_types when filtering by color only
          }
          return imgColorNormalized === colorCodeToMatch
        })
        .map(extractImagePath)
        .filter((x: string | null): x is string => typeof x === 'string' && x !== null)
      
      colorImages = [...colorImages, ...colorImageFromSingle]
    }
    
    if (colorImages.length > 0) {
      // Remove duplicates by extracting filename and comparing
      // This handles cases where same image appears with different paths
      const uniqueImages = colorImages.filter((img, index, self) => {
        // Extract filename from URL (everything after last slash)
        const getFilename = (url: string) => {
          try {
            const urlObj = new URL(url)
            const pathParts = urlObj.pathname.split('/')
            return pathParts[pathParts.length - 1] || url
          } catch {
            // If URL parsing fails, extract from string
            const parts = url.split('/')
            return parts[parts.length - 1].split('?')[0] || url
          }
        }
        
        const filename = getFilename(img)
        // Check if this filename already exists in the array
        const firstIndex = self.findIndex((other) => {
          const otherFilename = getFilename(other)
          return otherFilename === filename
        })
        
        // Only keep the first occurrence, prefer the one with full path
        if (firstIndex === index) {
          return true
        }
        // If same filename exists earlier, prefer the one with longer path (more complete)
        if (firstIndex < index) {
          const earlierImg = self[firstIndex]
          // Keep the one with longer path (more complete URL)
          if (img.length > earlierImg.length) {
            // Replace the earlier one with this one (but we can't modify array in filter)
            // So we'll keep the first one and skip this one
            return false
          }
          return false
        }
        return true
      })
      
      // Final pass: if we have duplicates by filename, keep only the one with the most complete path
      const finalImages: string[] = []
      const seenFilenames = new Set<string>()
      
      for (const img of uniqueImages) {
        const getFilename = (url: string) => {
          try {
            const urlObj = new URL(url)
            const pathParts = urlObj.pathname.split('/')
            return pathParts[pathParts.length - 1] || url
          } catch {
            const parts = url.split('/')
            return parts[parts.length - 1].split('?')[0] || url
          }
        }
        
        const filename = getFilename(img)
        if (!seenFilenames.has(filename)) {
          seenFilenames.add(filename)
          finalImages.push(img)
        } else {
          // If we've seen this filename, check if current image has a more complete path
          const existingIndex = finalImages.findIndex((other) => getFilename(other) === filename)
          if (existingIndex !== -1 && img.length > finalImages[existingIndex].length) {
            finalImages[existingIndex] = img // Replace with more complete path
          }
        }
      }
      
      console.log('[Product] Found color-specific images:', finalImages.length, 'from', colorImages.length, 'total', finalImages)
      return finalImages
    } else {
      console.log('[Product] No color-specific images found, showing all images')
    }
  }
  
  // If no color selected or no color-specific images, show all images
  const raw = p?.images_full_url || p?.images || p?.gallery_images || p?.product?.images_full_url || p?.product?.images || p?.product?.gallery_images || []
  const arr = Array.isArray(raw) ? raw : (typeof raw === 'string' && raw.trim().startsWith('[') ? (JSON.parse(raw) as any[]) : (raw ? [raw] : []))
  
  // Extract images from images_full_url - prioritize path if it's a full URL
  const norm: string[] = arr.map((x: any): string | null => {
    if (!x) return null
    
    // If it's already a string URL, return it
    if (typeof x === 'string') {
      const trimmed = x.trim()
      if (/^(https?:|data:|blob:)/i.test(trimmed)) {
        return trimmed
      }
      return normalize(trimmed)
    }
    
    // If it's an object with path (full URL), use it directly
    if (typeof x === 'object' && x.path) {
      const pathStr = String(x.path).trim()
      if (/^(https?:|data:|blob:)/i.test(pathStr)) {
        return pathStr
      }
      return normalize(x.path)
    }
    
    // Otherwise, use normalize which will handle key or other formats
    return normalize(x)
  }).filter((x): x is string => typeof x === 'string' && Boolean(x))
  
  // Also include images without color (color: null) from color_images_full_url when no color is selected
  // But exclude images that have variation_types if a variation is selected (those should be filtered by variation)
  if (!selectedColor.value && p?.color_images_full_url && Array.isArray(p.color_images_full_url)) {
    const noColorImages: string[] = p.color_images_full_url
      .filter((img: any) => {
        // Only include images without color
        if (img.color && img.color !== null && img.color !== '') {
          return false
        }
        // If variation is selected, exclude images with variation_types (they should be filtered by variation)
        if (selectedVariation.value && img.variation_types && Array.isArray(img.variation_types) && img.variation_types.length > 0) {
          return false
        }
        // If no variation selected but image has variation_types, include it (show all)
        return true
      })
      .map((img: any): string | null => {
      // Use extractImagePath helper function
      return extractImagePath(img)
      })
      .filter((x: string | null): x is string => typeof x === 'string' && x !== null)
    norm.push(...noColorImages)
  }
  
  // Handle thumbnail specifically
  const thumbnailData = p?.thumbnail_full_url || p?.image_full_url || p?.photo_full_url || p?.thumbnail || p?.image || p?.photo || p?.product?.thumbnail_full_url || p?.product?.image_full_url || p?.product?.thumbnail || p?.product?.image
  const thumb = normalize(thumbnailData)
  const finalImages = [...new Set([thumb, ...norm].filter(Boolean))]
  console.log('[Product] Final images array (no color selected):', finalImages.length, finalImages)
  return finalImages
})
const mainIndex = ref(0)
const mainImage = computed(() => images.value[mainIndex.value] || '')
const placeholderImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="16">No image</text></svg>'

const onImgErr = (e: Event) => {
  const el = e.target as HTMLImageElement | null
  if (!el) return
  el.src = placeholderImage
}

// Swiper configuration
const mainSwiper = ref<any>(null)
const thumbnailSwiper = ref<any>(null)
const setMainSwiper = (swiper: any) => {
  try {
    // Verify swiper and element exist and are in the DOM
    if (swiper && swiper.el && swiper.el.classList && document.body.contains(swiper.el)) {
    mainSwiper.value = swiper
      // Link thumbnails to main swiper (only if both exist and are in DOM)
      if (thumbnailSwiper.value && 
          thumbnailSwiper.value.el && 
          thumbnailSwiper.value.el.classList && 
          document.body.contains(thumbnailSwiper.value.el) &&
          swiper && 
          (swiper as any).controller) {
        (swiper as any).controller.control = thumbnailSwiper.value
        if ((thumbnailSwiper.value as any).controller) {
          (thumbnailSwiper.value as any).controller.control = swiper
        }
      }
    } else {
      console.warn('[Product] Main swiper element not ready or not in DOM')
    }
  } catch (e) {
    console.warn('[Product] Error setting main swiper:', e)
  }
}
const setThumbnailSwiper = (swiper: any) => {
  try {
    // Verify swiper and element exist and are in the DOM
    if (swiper && swiper.el && swiper.el.classList && document.body.contains(swiper.el)) {
      thumbnailSwiper.value = swiper
      // Link main to thumbnails (only if both exist and are in DOM)
      if (mainSwiper.value && 
          mainSwiper.value.el && 
          mainSwiper.value.el.classList && 
          document.body.contains(mainSwiper.value.el) &&
          swiper && 
          (swiper as any).controller) {
        (swiper as any).controller.control = mainSwiper.value
        if ((mainSwiper.value as any).controller) {
          (mainSwiper.value as any).controller.control = swiper
        }
      }
    } else {
      console.warn('[Product] Thumbnail swiper element not ready or not in DOM')
    }
  } catch (e) {
    console.warn('[Product] Error setting thumbnail swiper:', e)
  }
}
const modules = [Navigation, Thumbs]

// Ensure Swiper is only initialized when images are available and product is loaded
const shouldShowSwiper = computed(() => {
  return !loading.value && !error.value && product.value && images.value.length > 0
})

// Add a small delay to ensure DOM is fully rendered
const swiperReady = ref(false)
watch(shouldShowSwiper, async (newVal) => {
  if (newVal) {
    // Ensure Swiper instances are cleared
    mainSwiper.value = null
    thumbnailSwiper.value = null
    await nextTick()
    // Wait a bit longer to ensure DOM is fully ready
    setTimeout(() => {
      // Double-check that images are still available
      if (images.value && images.value.length > 0) {
      swiperReady.value = true
      }
    }, 200)
  } else {
    swiperReady.value = false
  }
}, { immediate: true })

// Core fields
const title = computed(() => {
  const p: any = product.value || {}
  return p?.name || p?.product?.name || 'المنتج'
})
const brandName = computed(() => {
  const p: any = product.value || {}
  return p?.brand_name || p?.brand?.name || p?.product?.brand_name || p?.product?.brand?.name || ''
})

// Brand image
const brandImage = computed(() => {
  const p: any = product.value || {}
  const brand = p?.brand || p?.product?.brand
  
  if (!brand) return ''
  
  // Try different image sources in order of preference
  let imageSrc = brand?.image_full_url?.path || 
                 brand?.logo_full_url?.path || 
                 brand?.image_full_url || 
                 brand?.logo_full_url || 
                 brand?.image || 
                 brand?.logo || 
                 ''
  
  if (!imageSrc) return ''
  
  // If it's already a full URL, return as is
  if (/^(https?:|data:|blob:)/i.test(imageSrc)) {
    return imageSrc
  }
  
  // Normalize the path and build full URL
  return normalize(imageSrc)
})

// Brand ID for link
const brandId = computed(() => {
  const p: any = product.value || {}
  const brand = p?.brand || p?.product?.brand
  return brand?.id || p?.brand_id || p?.product?.brand_id || null
})

// Brand link
const brandLink = computed(() => {
  const id = brandId.value
  const path = id ? `/shop?brand=${id}` : '/shop'
  return getLocalizedPath(path)
})
const basePrice = computed<number>(() => {
  const p: any = product.value || {}
  const v = p?.unit_price ?? p?.price ?? p?.product?.unit_price ?? p?.product?.price
  const n = Number(v)
  return isFinite(n) && n > 0 ? n : 0
})
const discountValue = computed<number>(() => {
  const p: any = product.value || {}
  const v = p?.discount ?? p?.product?.discount ?? 0
  const n = Number(v)
  return isFinite(n) && n > 0 ? n : 0
})
const discountType = computed<string>(() => {
  const p: any = product.value || {}
  return p?.discount_type || p?.product?.discount_type || 'flat'
})
const finalPrice = computed<number>(() => {
  const bp = basePrice.value, dv = discountValue.value
  if (!bp || !dv) return bp
  const isPercent = String(discountType.value).toLowerCase().startsWith('per')
  const diff = isPercent ? (bp * dv) / 100 : dv
  return Math.max(0, bp - diff)
})
const hasDiscount = computed(() => finalPrice.value > 0 && finalPrice.value < basePrice.value)
const discountPercent = computed(() => {
  const bp = basePrice.value, dv = discountValue.value
  if (!bp || !dv) return 0
  const isPercent = String(discountType.value).toLowerCase().startsWith('per')
  return Math.max(0, Math.round(isPercent ? dv : (dv / bp) * 100))
})
const rating = computed<number>(() => {
  // Use API data if available, otherwise fallback to product data
  if (averageRating.value > 0) return averageRating.value
  
  const p: any = product.value || {}
  const r = p?.reviews_avg_rating ?? p?.avg_rating ?? p?.rating?.[0]?.average ?? 0
  const n = Number(r)
  return isFinite(n) ? Math.min(5, Math.max(0, n)) : 0
})
const reviewsCount = computed<number>(() => {
  // Use API data if available, otherwise fallback to product data
  if (totalReviewsCount.value > 0) return totalReviewsCount.value
  
  const p: any = product.value || {}
  const c = p?.reviews_count ?? p?.rating?.[0]?.count ?? 0
  const n = Number(c)
  return isFinite(n) ? Math.max(0, Math.round(n)) : 0
})
const inStock = computed<boolean>(() => {
  const p: any = product.value || {}
  const q = p?.current_stock ?? p?.stock ?? p?.quantity ?? p?.product?.current_stock ?? p?.product?.stock ?? 0
  return (Number(q) > 0) || p?.in_stock === true
})
const currencySymbol = computed(() => (product.value?.currency_symbol || 'ر.س'))

const currencyImage = computed(() => {
  return '/images/currency-symbol.png'
})
const description = computed(() => {
  const p: any = product.value || {}
  return p?.details ?? p?.description ?? p?.product?.details ?? p?.product?.description ?? ''
})

const metaDescription = computed(() => {
  const p: any = product.value || {}
  const result = p?.meta_description ?? p?.short_description ?? p?.product?.meta_description ?? p?.product?.short_description ?? ''
  // Clean up the text by removing \r\n and extra whitespace
  const cleaned = result.replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned
})

const specifications = computed(() => {
  const p: any = product.value || {}
  return p?.specifications ?? p?.product?.specifications ?? {}
})

const howToUse = computed(() => {
  const p: any = product.value || {}
  return p?.how_to_use ?? p?.usage_instructions ?? p?.product?.how_to_use ?? p?.product?.usage_instructions ?? ''
})

// Helper function to format date
const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '/')
}

// Helper function to mask customer name
const maskCustomerName = (name: string) => {
  if (!name) return '*****'
  if (name.length <= 2) return '*****' + name
  return '*****' + name.slice(-2)
}

// Active tab
const activeTab = ref('description')

// Auth and review modal
const showLoginModal = ref(false)
const auth = useAuth()
const { $get, $post, $del } = useApi()

// Login form - OTP Login
const taqnyatAuth = useTaqnyatAuth()
const otpForm = ref({
  phone: '',
  otp: ''
})
const otpSent = ref(false)
const otpCountdown = ref(0)
let otpTimer: any = null
const loginSuccess = ref(false)


// Review form
const showReviewModal = ref(false)
const reviewForm = ref({
  rating: 5,
  comment: '',
  images: []
})
const reviewLoading = ref(false)
const reviewError = ref('')

// Handle write review button click
const handleWriteReview = () => {
  if (auth?.user?.value) {
    // User is logged in, show review form
    showReviewModal.value = true
    reviewForm.value = {
      rating: 5,
      comment: '',
      images: []
    }
  } else {
    // User is not logged in, show login modal
    showLoginModal.value = true
  }
}

// Submit review
const submitReview = async () => {
  if (!reviewForm.value.comment.trim()) {
    reviewError.value = 'يرجى كتابة تعليق'
    return
  }
  
  reviewLoading.value = true
  reviewError.value = ''
  
  try {
    const productId = product.value?.id || product.value?.product_id || product.value?.product?.id
    if (!productId) {
      reviewError.value = 'خطأ في معرف المنتج'
      return
    }
    
    const response = await $post('v1/products/reviews/submit-guest', {
      product_id: productId,
      rating: reviewForm.value.rating,
      comment: reviewForm.value.comment,
      images: reviewForm.value.images
    })
    
    if (response) {
      showReviewModal.value = false
      // Reload reviews
      await loadReviews()
      // Show success message
      // Review submitted successfully
    }
  } catch (error: any) {
    console.error('Review submission error:', error)
    if (error?.data?.errors && Array.isArray(error.data.errors)) {
      const errorMessages = error.data.errors.map((err: any) => err.message).join(', ')
      reviewError.value = errorMessages
    } else {
      reviewError.value = error?.data?.message || 'خطأ في إرسال التقييم'
    }
  } finally {
    reviewLoading.value = false
  }
}

// Close review modal
const closeReviewModal = () => {
  showReviewModal.value = false
  reviewError.value = ''
  reviewForm.value = {
    rating: 5,
    comment: '',
    images: []
  }
}

// Reply functions
const showReplyModal = ref(false)
const selectedReviewId = ref<string | null>(null)
const replyText = ref('')
const replyLoading = ref(false)
const replyError = ref('')

const openReplyModal = (reviewId: string) => {
  selectedReviewId.value = reviewId
  replyText.value = ''
  replyError.value = ''
  showReplyModal.value = true
}

const closeReplyModal = () => {
  showReplyModal.value = false
  selectedReviewId.value = null
  replyText.value = ''
  replyError.value = ''
}

const submitReply = async () => {
  if (!replyText.value.trim()) {
    replyError.value = 'يرجى كتابة رد'
    return
  }
  
  replyLoading.value = true
  replyError.value = ''
  
  try {
    const response = await $post('v1/products/review/reply', {
      review_id: selectedReviewId.value,
      reply_text: replyText.value
    })
    
    if (response) {
      closeReplyModal()
      // Reload reviews
      await loadReviews()
    }
  } catch (error: any) {
    console.error('Reply submission error:', error)
    if (error?.data?.errors && Array.isArray(error.data.errors)) {
      const errorMessages = error.data.errors.map((err: any) => err.message).join(', ')
      replyError.value = errorMessages
    } else {
      replyError.value = error?.data?.message || 'خطأ في إرسال الرد'
    }
  } finally {
    replyLoading.value = false
  }
}

// Like functions
const likeReview = async (reviewId: string) => {
  try {
    const response = await $post('v1/products/review/like', {
      review_id: reviewId
    })
    
    if (response) {
      // Reload reviews to update likes count
      await loadReviews()
    }
  } catch (error: any) {
    console.error('Like error:', error)
  }
}

const unlikeReview = async (reviewId: string) => {
  try {
    const response = await $fetch(`/api/v1/products/review/like/${reviewId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { lang: 'sa' }
    })
    
    if (response) {
      // Reload reviews to update likes count
      await loadReviews()
    }
  } catch (error: any) {
    console.error('Unlike error:', error)
  }
}

// Register modal state
const showRegisterModal = ref(false)
const registerForm = ref({
  f_name: '',
  l_name: '',
  email: '',
  phone: '',
  password: '',
  password_confirmation: '',
  referral_code: ''
})
const registerLoading = ref(false)
const registerError = ref('')

// Handle register
const handleRegister = () => {
  showLoginModal.value = false
  showRegisterModal.value = true
  registerError.value = ''
  registerForm.value = {
    f_name: '',
    l_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    referral_code: ''
  }
}

// Close register modal
const closeRegisterModal = () => {
  showRegisterModal.value = false
  registerError.value = ''
  registerForm.value = {
    f_name: '',
    l_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    referral_code: ''
  }
}

// Handle register submission
const handleRegisterSubmit = async () => {
  if (!registerForm.value.f_name || !registerForm.value.l_name || !registerForm.value.email || !registerForm.value.phone || !registerForm.value.password) {
    registerError.value = 'جميع الحقول مطلوبة'
    return
  }

  if (registerForm.value.password !== registerForm.value.password_confirmation) {
    registerError.value = 'كلمة المرور غير متطابقة'
    return
  }

  if (registerForm.value.password.length < 6) {
    registerError.value = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
    return
  }

  registerLoading.value = true
  registerError.value = ''

  try {
    const response = await $post('v1/auth/register', {
      f_name: registerForm.value.f_name,
      l_name: registerForm.value.l_name,
      email: registerForm.value.email,
      phone: registerForm.value.phone,
      password: registerForm.value.password,
      referral_code: registerForm.value.referral_code || null
    })

    if (response?.token) {
      // Login successful
      auth.setToken(response.token)
      try {
        const userInfo = await $get('v1/customer/info')
        if (userInfo) {
          auth.setUser(userInfo)
        }
      } catch (e) {
        auth.setUser(response.user || response.data)
      }
      closeRegisterModal()
      handleLoginSuccess()
    } else if (response?.temporary_token) {
      // Need verification
      registerError.value = 'تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني أو رقم الهاتف'
      setTimeout(() => {
        closeRegisterModal()
      }, 3000)
    }
  } catch (error: any) {
    console.error('Register error:', error)
    if (error?.data?.errors && Array.isArray(error.data.errors)) {
      const errorMessages = error.data.errors.map((err: any) => err.message).join(', ')
      registerError.value = errorMessages
    } else {
      registerError.value = error?.data?.message || 'خطأ في إنشاء الحساب'
    }
  } finally {
    registerLoading.value = false
  }
}

// Handle login success
const handleLoginSuccess = () => {
  showLoginModal.value = false
  // Reload reviews after login
  loadReviews()
}

  // Cart handlers
const qty = ref(1)
const busy = ref(false)

// Variant selection
const selectedColor = ref('')
const selectedSize = ref('')
const selectedVariation = ref('') // New: selected variation type (e.g., "100ml", "WARM PEACH 004-100ml")
const selectedVariant = ref<any>(null)
const availableVariants = ref<any[]>([])
const availableColors = ref<any[]>([])
const availableSizes = ref<any[]>([])
const availableVariations = ref<string[]>([]) // New: available variation types
const imageChanging = ref(false)


// Computed properties for variants
const filteredVariants = computed(() => {
  if (!product.value?.variation) return []
  
  let filtered = product.value.variation
  
  if (selectedColor.value) {
    filtered = filtered.filter((v: any) => v.type.startsWith(selectedColor.value))
  }
  
  if (selectedSize.value) {
    filtered = filtered.filter((v: any) => v.type.endsWith(selectedSize.value))
  }
  
  return filtered
})

const currentVariantPrice = computed(() => {
  if (selectedVariant.value && selectedVariant.value.price) {
    // استخدم سعر المتغير مباشرة
    const variantBasePrice = selectedVariant.value.price
    const variantDiscount = discountValue.value
    const variantDiscountType = discountType.value

    // إذا كان هناك خصم، احسبه
    if (variantDiscount && variantDiscount > 0) {
      const isPercent = String(variantDiscountType).toLowerCase().startsWith('per')
      const discountAmount = isPercent ? (variantBasePrice * variantDiscount) / 100 : variantDiscount
      const finalVariantPrice = Math.max(0, variantBasePrice - discountAmount)
      return finalVariantPrice
    }

    // إذا لم يكن هناك خصم، استخدم السعر الأساسي للمتغير
    return variantBasePrice
  }
  return finalPrice.value
})

const currentVariantStock = computed(() => {
  if (selectedVariant.value) {
    return selectedVariant.value.qty
  }
  return inStock.value
})

const currentVariantSku = computed(() => {
  if (selectedVariant.value && selectedVariant.value.sku) {
    return selectedVariant.value.sku
  }
  // Fallback to product SKU if no variant is selected
  const p: any = product.value || {}
  return p?.sku || p?.product?.sku || ''
})
const currentVariantName = computed(() => {
  if (selectedVariant.value && selectedVariant.value.type) {
    return selectedVariant.value.type
  }
  // Fallback to product SKU if no variant is selected
  const p: any = product.value || {}
  return p?.type || p?.product?.type || ''
})

// Initialize variants when product loads
const initializeVariants = () => {
  if (!product.value) return
  
  // Parse color_image if it's a JSON string
  const parsedColorImage = parseColorImage(product.value.color_image)
  
  console.log('[Product] Initializing variants:', {
    hasColorsFormatted: !!product.value.colors_formatted,
    hasColors: !!product.value.colors,
    hasColorImage: !!product.value.color_image,
    colorImageType: typeof product.value.color_image,
    parsedColorImageLength: parsedColorImage?.length || 0,
    colorsFormatted: product.value.colors_formatted,
    colors: product.value.colors,
    colorImagesFullUrl: product.value.color_images_full_url
  })
  
  // Initialize colors with proper image mapping
  if (product.value.colors_formatted && Array.isArray(product.value.colors_formatted) && product.value.colors_formatted.length > 0) {
    availableColors.value = product.value.colors_formatted.map((color: any) => {
      // Normalize color code for matching
      const colorCodeNormalized = normalizeColorCode(color.code)
      
      // Find corresponding image from color_images_full_url
      const colorImage = product.value.color_images_full_url?.find((img: any) => {
        const imgColorNormalized = normalizeColorCode(img.color)
        return imgColorNormalized === colorCodeNormalized
      })
      
      // Also check color_image field (singular) if it exists
      let colorImageFromSingle = null
      if (parsedColorImage && Array.isArray(parsedColorImage)) {
        colorImageFromSingle = parsedColorImage.find((img: any) => {
          const imgColorNormalized = normalizeColorCode(img.color)
          return imgColorNormalized === colorCodeNormalized
        })
      }
      
      // Use the found image (prefer color_images_full_url, fallback to color_image)
      const foundImage = colorImage || colorImageFromSingle
      
      // Extract image path properly
      let imagePath = ''
      if (foundImage?.image_name) {
        if (typeof foundImage.image_name === 'string') {
          // Search in images_full_url for the matching path
          const imageKey = foundImage.image_name.trim()
          if (product.value.images_full_url && Array.isArray(product.value.images_full_url)) {
            const matchedImage = product.value.images_full_url.find((fullImg: any) => {
              if (fullImg.key && fullImg.key === imageKey) {
                return true
              }
              if (fullImg.path && typeof fullImg.path === 'string' && fullImg.path.includes(imageKey)) {
                return true
              }
              return false
            })
            if (matchedImage && matchedImage.path) {
              imagePath = matchedImage.path
            } else {
              imagePath = foundImage.image_name
            }
          } else {
            imagePath = foundImage.image_name
          }
        } else if (foundImage.image_name.path) {
          imagePath = foundImage.image_name.path
        } else if (foundImage.image_name.key) {
          // Search in images_full_url for the matching path using key
          const imageKey = foundImage.image_name.key
          if (product.value.images_full_url && Array.isArray(product.value.images_full_url)) {
            const matchedImage = product.value.images_full_url.find((fullImg: any) => {
              if (fullImg.key && fullImg.key === imageKey) {
                return true
              }
              if (fullImg.path && typeof fullImg.path === 'string' && fullImg.path.includes(imageKey)) {
                return true
              }
              return false
            })
            if (matchedImage && matchedImage.path) {
              imagePath = matchedImage.path
            } else {
              imagePath = foundImage.image_name.key
            }
          } else {
            imagePath = foundImage.image_name.key
          }
        }
      }
      
      // Ensure color code is stored without # for matching
      const codeForMatching = normalizeColorCode(color.code)
      // Ensure hex code has # for display
      const hexCode = color.code && !color.code.startsWith('#') ? `#${color.code.toUpperCase()}` : (color.code?.toUpperCase() || '')
      
      // For image, if it's already a full URL, use it directly; otherwise normalize it
      let finalImagePath = ''
      if (imagePath) {
        // Check if it's already a full URL (starts with http:// or https://)
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          finalImagePath = imagePath
        } else {
          finalImagePath = normalize(imagePath)
        }
      } else if (color.image) {
        // If imagePath is empty but color.image exists, use it directly if it's a full URL
        if (color.image.startsWith('http://') || color.image.startsWith('https://')) {
          finalImagePath = color.image
        } else {
          finalImagePath = normalize(color.image)
        }
      }
      
      const colorData = {
        name: color.name || hexCode || codeForMatching,
        originalName: color.name, // Keep original name to check if it's null
        code: codeForMatching, // Store normalized code without # for matching
        hexCode: hexCode, // Store with # for CSS display
        image: finalImagePath,
        originalImage: foundImage?.image_name?.key || color.image || '',
        imageName: foundImage?.image_name?.key || color.image || ''
      }
      
      console.log('[Product] Color data (from colors_formatted):', {
        originalColor: color,
        colorData: colorData,
        hasImage: !!colorData.image,
        imagePath: colorData.image,
        originalName: colorData.originalName
      })
      
      console.log('[Product] Color data (from colors_formatted):', {
        originalColor: color,
        colorData: colorData,
        foundImage: !!foundImage,
        imagePath: imagePath
      })
      return colorData
    })
  } else if (product.value.colors && Array.isArray(product.value.colors)) {
    // Handle both string arrays and object arrays
    // First, normalize all colors to extract code/name
    const normalizedColors = product.value.colors.map((color: any) => {
      // If color is an object with code/name/image
      if (typeof color === 'object' && color !== null) {
        return {
          code: color.code || color.name || '',
          name: color.name,
          image: color.image || '',
          originalColor: color
        }
      }
      // If color is a string
      if (typeof color === 'string') {
        return {
          code: color,
          name: '',
          image: '',
          originalColor: color
        }
      }
      return null
    }).filter((c: any) => c !== null && c.code)
    
    // Get unique colors by code
    const uniqueColorsMap = new Map<string, any>()
    normalizedColors.forEach((color: any) => {
      const codeNormalized = normalizeColorCode(color.code)
      if (!uniqueColorsMap.has(codeNormalized)) {
        uniqueColorsMap.set(codeNormalized, color)
      }
    })
    const uniqueColors = Array.from(uniqueColorsMap.values())
    
    availableColors.value = uniqueColors.map((color: any, index: number) => {
      // Normalize color for matching
      const colorNormalized = normalizeColorCode(color.code)
      
      // Find first corresponding image from color_images_full_url
      const colorImage = product.value.color_images_full_url?.find((img: any) => {
        const imgColorNormalized = normalizeColorCode(img.color)
        return imgColorNormalized === colorNormalized
      })
      
      // Also check color_image field (singular) if it exists (parse if needed)
      let colorImageFromSingle = null
      const parsedColorImageForColors = parseColorImage(product.value.color_image)
      if (parsedColorImageForColors && Array.isArray(parsedColorImageForColors)) {
        colorImageFromSingle = parsedColorImageForColors.find((img: any) => {
          const imgColorNormalized = normalizeColorCode(img.color)
          return imgColorNormalized === colorNormalized
        })
      }
      
      // Use the found image (prefer color_images_full_url, fallback to color_image, then color.image)
      const foundImage = colorImage || colorImageFromSingle
      
      // Extract image path
      let imagePath = ''
      if (foundImage?.image_name) {
        if (typeof foundImage.image_name === 'string') {
          imagePath = foundImage.image_name
        } else if (foundImage.image_name.path) {
          imagePath = foundImage.image_name.path
        } else if (foundImage.image_name.key) {
          imagePath = foundImage.image_name.key
        }
      } else if (color.image) {
        // Use image from color object if available (may be full URL)
        imagePath = color.image
      }
      
      // Normalize color code (ensure it's uppercase and has # prefix for display)
      const colorCodeStr = String(color.code || '')
      const normalizedColor = colorCodeStr.toUpperCase().startsWith('#') 
        ? colorCodeStr.toUpperCase() 
        : `#${colorCodeStr.toUpperCase()}`
      
      // For image, if it's already a full URL, use it directly; otherwise normalize it
      let finalImagePath = ''
      if (imagePath) {
        // Check if it's already a full URL (starts with http:// or https://)
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          finalImagePath = imagePath
        } else {
          finalImagePath = normalize(imagePath)
        }
      } else if (color.image) {
        // If imagePath is empty but color.image exists, use it directly if it's a full URL
        if (color.image.startsWith('http://') || color.image.startsWith('https://')) {
          finalImagePath = color.image
        } else {
          finalImagePath = normalize(color.image)
        }
      }
      
      const colorData = {
        name: color.name || normalizedColor, // Use name from color object, fallback to hex code
        originalName: color.name, // Keep original name to check if it's null
        code: colorNormalized, // Store normalized code without # for matching
        hexCode: normalizedColor, // Store with # for CSS
        image: finalImagePath,
        originalImage: foundImage?.image_name?.key || color.image || '',
        imageName: foundImage?.image_name?.key || color.image || ''
      }
      
      console.log('[Product] Color data (from colors array):', {
        originalColor: color,
        colorData: colorData,
        foundImage: !!foundImage,
        imagePath: imagePath,
        finalImagePath: finalImagePath,
        hasImage: !!colorData.image,
        originalName: colorData.originalName
      })
      return colorData
    })
    
    console.log('[Product] Total unique colors found:', availableColors.value.length)
  } else {
    // If no colors found, log for debugging
    console.warn('[Product] No colors found in product:', {
      hasColorsFormatted: !!product.value.colors_formatted,
      hasColors: !!product.value.colors,
      hasColorImage: !!product.value.color_image,
      productKeys: Object.keys(product.value || {})
    })
  }
  
  console.log('[Product] Available colors:', availableColors.value)
  console.log('[Product] Available colors length:', availableColors.value.length)
  
  // Initialize sizes from choice_options
  if (product.value.choice_options && Array.isArray(product.value.choice_options)) {
    const sizeOption = product.value.choice_options.find((option: any) => 
      option.title === 'Size' || option.name === 'choice_2'
    )
    if (sizeOption && sizeOption.options) {
      availableSizes.value = sizeOption.options.map((size: string) => ({
        name: size,
        value: size
      }))
    }
  }
  
  // Initialize variations from variation.type and variation_types
  const variationsSet = new Set<string>()
  const variationColorsMap = new Map<string, Set<string>>() // Map variation -> Set of color names
  
  // Check if product has actual variations using choice_options
  // If choice_options is empty or doesn't contain Size option, there are no variations
  let hasActualVariations = false
  if (product.value.choice_options && Array.isArray(product.value.choice_options) && product.value.choice_options.length > 0) {
    // Check if there's a Size option in choice_options
    const sizeOption = product.value.choice_options.find((option: any) => 
      option.title === 'Size' || option.name === 'choice_2'
    )
    hasActualVariations = !!(sizeOption && sizeOption.options && sizeOption.options.length > 0)
  }
  
  // Only check variation.type as fallback if choice_options exists but doesn't have Size option
  // If choice_options is completely empty ([]), don't check variation.type - product has no variations
  if (!hasActualVariations && product.value.choice_options && Array.isArray(product.value.choice_options) && product.value.choice_options.length > 0) {
    // choice_options exists but no Size option found, check variation.type as fallback
    if (product.value.variation && Array.isArray(product.value.variation) && product.value.variation.length > 0) {
      hasActualVariations = product.value.variation.some((v: any) => {
        if (!v.type) return false
        const typeStr = String(v.type).trim()
        // Check if it's a simple variation (like "100ml", "200ml") - usually short, no spaces or dashes
        // Color names usually have spaces and are longer
        return typeStr.length <= 10 && !typeStr.includes(' ') && !/^[A-Z]/.test(typeStr)
      })
    }
  }
  
  // First, check if variations are linked to colors by examining variation.type
  // If variation.type contains "-" (e.g., "WARM PEACH 004-100ml"), variations are linked to colors
  // BUT only if product has actual variations (choice_options with Size option)
  let variationsLinkedToColors = false
  if (hasActualVariations && product.value.variation && Array.isArray(product.value.variation)) {
    const hasLinkedVariations = product.value.variation.some((v: any) => {
      if (v.type && typeof v.type === 'string') {
        // Check if type contains a dash and has both color name and size
        const parts = v.type.split('-')
        if (parts.length >= 2) {
          // Last part should be a size (e.g., "100ml", "200ml")
          const lastPart = parts[parts.length - 1].trim()
          const sizeOption = product.value.choice_options?.find((option: any) => 
            option.title === 'Size' || option.name === 'choice_2'
          )
          if (sizeOption && sizeOption.options && sizeOption.options.includes(lastPart)) {
            variationsLinkedToColors = true
            // Extract color name (everything before last part)
            const colorName = parts.slice(0, -1).join('-').trim()
            // Extract variation (size)
            const variation = lastPart
            
            // Store mapping: variation -> color names
            if (!variationColorsMap.has(variation)) {
              variationColorsMap.set(variation, new Set())
            }
            variationColorsMap.get(variation)!.add(colorName)
            
            // Add variation to set
            variationsSet.add(variation)
          }
        }
      }
      return false
    })
  }
  
  // If variations are NOT linked to colors, extract simple variations
  // But only if product has actual variations (not just color names)
  if (!variationsLinkedToColors && hasActualVariations) {
    // Extract from variation.type directly (for products with variations only, e.g., "100ml", "200ml")
    if (product.value.variation && Array.isArray(product.value.variation)) {
      product.value.variation.forEach((v: any) => {
        if (v.type && typeof v.type === 'string') {
          const typeStr = v.type.trim()
          // Only add if it looks like a variation (short, no spaces, not a color name)
          if (typeStr.length <= 10 && !typeStr.includes(' ') && !/^[A-Z]/.test(typeStr)) {
            variationsSet.add(typeStr)
          }
        }
      })
    }
  }
  
  // If variations are NOT linked to colors and we haven't found variations yet, extract from variation_types
  // But only if product has actual variations in variation array (not just color names)
  if (!variationsLinkedToColors && variationsSet.size === 0 && hasActualVariations) {
    // Extract from color_images_full_url
    if (product.value.color_images_full_url && Array.isArray(product.value.color_images_full_url)) {
      product.value.color_images_full_url.forEach((img: any) => {
        if (img.variation_types && Array.isArray(img.variation_types)) {
          img.variation_types.forEach((v: string) => {
            if (v && typeof v === 'string' && v.trim()) {
              // Only add simple variations (like "100ml", "200ml"), not color-linked ones
              const trimmed = v.trim()
              // Check if it's a simple variation (doesn't contain color name pattern)
              // Simple variations are usually short (<= 10 chars) and don't contain spaces
              if (trimmed.length <= 10 && !trimmed.includes(' ') && !/^[A-Z]/.test(trimmed)) {
                variationsSet.add(trimmed)
              }
            }
          })
        }
      })
    }
    
    // Extract from color_image (parse if needed)
    if (parsedColorImage && Array.isArray(parsedColorImage)) {
      parsedColorImage.forEach((img: any) => {
        if (img.variation_types && Array.isArray(img.variation_types)) {
          img.variation_types.forEach((v: string) => {
            if (v && typeof v === 'string' && v.trim()) {
              const trimmed = v.trim()
              // Only add simple variations
              if (trimmed.length <= 10 && !trimmed.includes(' ') && !/^[A-Z]/.test(trimmed)) {
                variationsSet.add(trimmed)
              }
            }
          })
        }
      })
    }
    
    // Also check if color_image is a string and needs parsing
    if (product.value.color_image && typeof product.value.color_image === 'string') {
      try {
        const parsed = JSON.parse(product.value.color_image)
        if (Array.isArray(parsed)) {
          parsed.forEach((img: any) => {
            if (img.variation_types && Array.isArray(img.variation_types)) {
              img.variation_types.forEach((v: string) => {
                if (v && typeof v === 'string' && v.trim()) {
                  const trimmed = v.trim()
                  // Only add simple variations
                  if (trimmed.length <= 10 && !trimmed.includes(' ') && !/^[A-Z]/.test(trimmed)) {
                    variationsSet.add(trimmed)
                  }
                }
              })
            }
          })
        }
      } catch (e) {
        // Already parsed or invalid JSON, ignore
      }
    }
  }
  
  // Create a mapping from hex colors to color names from variation.type
  // This allows us to map #D06A66 -> "WARM PEACH 004" and #A76570 -> "VERY BERRY 005"
  // Strategy: If variations are NOT linked to colors, variation.type contains color names directly
  // So we can map hex colors to color names by order
  const hexToColorNameMap = new Map<string, string>()
  
  // Check if variations contain color names directly (not linked to sizes)
  const hasDirectColorNames = !variationsLinkedToColors && 
                               product.value.variation && 
                               Array.isArray(product.value.variation) &&
                               product.value.variation.length > 0 &&
                               product.value.variation.every((v: any) => {
                                 if (!v.type) return false
                                 // Check if type doesn't contain a dash followed by a size
                                 const parts = v.type.split('-')
                                 if (parts.length === 1) return true // Single word, likely a color name
                                 // Check if last part is NOT a size
                                 const lastPart = parts[parts.length - 1].trim()
                                 const sizeOption = product.value.choice_options?.find((option: any) => 
                                   option.title === 'Size' || option.name === 'choice_2'
                                 )
                                 return !sizeOption || !sizeOption.options || !sizeOption.options.includes(lastPart)
                               })
  
  if (hasDirectColorNames) {
    // Get unique hex colors from availableColors
    const hexColorsArray = availableColors.value.map((c: any) => normalizeColorCode(c.code || c.hexCode || c.name))
    
    // Get color names from variation.type
    const colorNamesArray = product.value.variation.map((v: any) => v.type).filter((t: string) => t)
    
    console.log('[Product] Direct color names mode:', {
      hexColors: hexColorsArray,
      colorNames: colorNamesArray
    })
    
    // Map hex colors to color names by order
    if (hexColorsArray.length === colorNamesArray.length && hexColorsArray.length > 0) {
      hexColorsArray.forEach((hexColor: string, index: number) => {
        if (index < colorNamesArray.length) {
          hexToColorNameMap.set(hexColor, colorNamesArray[index])
          console.log('[Product] Mapped hex color to color name (direct):', hexColor, '->', colorNamesArray[index])
        }
      })
    }
  } else if (variationsLinkedToColors && product.value.variation && Array.isArray(product.value.variation)) {
    // If variations are linked to colors, use the previous logic
    // Get unique hex colors from color_images_full_url
    if (product.value.color_images_full_url && Array.isArray(product.value.color_images_full_url)) {
      const uniqueHexColors = new Set<string>()
      product.value.color_images_full_url.forEach((img: any) => {
        if (img.color) {
          const imgColorNormalized = normalizeColorCode(img.color)
          uniqueHexColors.add(imgColorNormalized)
        }
      })
      
      console.log('[Product] Unique hex colors from color_images_full_url:', Array.from(uniqueHexColors))
      
      // Get all unique color names from variants
      const colorNamesFromVariants = new Set<string>()
      product.value.variation.forEach((v: any) => {
        if (v.type && typeof v.type === 'string') {
          const parts = v.type.split('-')
          if (parts.length >= 2) {
            const colorName = parts.slice(0, -1).join('-').trim()
            colorNamesFromVariants.add(colorName)
          }
        }
      })
      
      // Simple mapping: if we have 2 hex colors and 2 color names, map them by order
      const hexColorsArray = Array.from(uniqueHexColors)
      const colorNamesArray = Array.from(colorNamesFromVariants)
      
      if (hexColorsArray.length === colorNamesArray.length && hexColorsArray.length > 0) {
        hexColorsArray.forEach((hexColor: string, index: number) => {
          if (index < colorNamesArray.length) {
            hexToColorNameMap.set(hexColor, colorNamesArray[index])
            console.log('[Product] Mapped hex color to color name (by order):', hexColor, '->', colorNamesArray[index])
          }
        })
      }
    }
  }
  
  // Store the mapping in a ref so we can use it later
  const hexToColorNameMapping = hexToColorNameMap
  console.log('[Product] Hex to color name mapping:', Object.fromEntries(hexToColorNameMapping))
  
  // Add colorName to each color in availableColors if we have a mapping
  if (hexToColorNameMapping.size > 0) {
    availableColors.value = availableColors.value.map((color: any) => {
      const colorCodeNormalized = normalizeColorCode(color.code || color.hexCode || color.name)
      const colorName = hexToColorNameMapping.get(colorCodeNormalized)
      if (colorName) {
        return {
          ...color,
          colorName: colorName, // Store the color name from variation.type
          displayName: colorName // Use color name for display if available
        }
      }
      return color
    })
  }
  
  availableVariations.value = Array.from(variationsSet).sort()
  console.log('[Product] Available variations:', availableVariations.value)
  console.log('[Product] Variations linked to colors:', variationsLinkedToColors)
  console.log('[Product] Variation colors map:', Object.fromEntries(variationColorsMap))
  
  // Don't auto-select first color - let user choose
  // Only set initial selections if no color is already selected
  if (availableColors.value.length > 0 && !selectedColor.value) {
    // Don't auto-select - let user choose
    // selectedColor.value = availableColors.value[0].name
  }
  
  // Auto-select first variation if available
  if (availableVariations.value.length > 0 && !selectedVariation.value) {
    selectedVariation.value = availableVariations.value[0]
  }
  
  // Auto-select first size if available
  if (availableSizes.value.length > 0 && !selectedSize.value) {
    selectedSize.value = availableSizes.value[0].value
  }
  
  // Update selected variant
  updateSelectedVariant()
}

// Update selected variant based on current selections
const updateSelectedVariant = () => {
  if (!product.value?.variation) {
    console.log('[Product] No variation data available')
    selectedVariant.value = null
    return
  }
  
  console.log('[Product] Updating selected variant:', {
    selectedColor: selectedColor.value,
    selectedVariation: selectedVariation.value,
    availableVariations: availableVariations.value,
    availableColors: availableColors.value.map((c: any) => c.name),
    allVariants: product.value.variation?.map((v: any) => ({ type: v.type, price: v.price, qty: v.qty }))
  })
  
  let variant = null
  
  // Check if variations are linked to colors by examining variation.type
  let variationsLinkedToColors = false
  if (product.value.variation && Array.isArray(product.value.variation)) {
    variationsLinkedToColors = product.value.variation.some((v: any) => {
      if (v.type && typeof v.type === 'string') {
        const parts = v.type.split('-')
        if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1].trim()
          const sizeOption = product.value.choice_options?.find((option: any) => 
            option.title === 'Size' || option.name === 'choice_2'
          )
          if (sizeOption && sizeOption.options && sizeOption.options.includes(lastPart)) {
            return true
          }
        }
      }
      return false
    })
  }
  
  console.log('[Product] Variations linked to colors:', variationsLinkedToColors)
  
  // If variations are linked to colors, use color-variation combination
  if (variationsLinkedToColors) {
    if (selectedColor.value && selectedVariation.value) {
      // Check if selected color is hex or color name
      const isHexColor = /^#?[0-9A-Fa-f]{6}$/i.test(selectedColor.value.replace('#', ''))
      
      if (isHexColor) {
        // If it's a hex color, we need to find which color name from variation.type matches this hex
        // Strategy: Find all variants with the selected variation, then check which one has images
        // that match the selected hex color in color_image
        const normalizedHex = normalizeColorCode(selectedColor.value)
        console.log('[Product] Hex color selected, searching for matching color name:', normalizedHex)
        
        // First, get all variants with the selected variation
        const variantsWithVariation = product.value.variation.filter((v: any) => {
          if (v.type && typeof v.type === 'string') {
            const parts = v.type.split('-')
            if (parts.length >= 2) {
              const lastPart = parts[parts.length - 1].trim()
              return lastPart === selectedVariation.value && v.qty > 0
            }
          }
          return false
        })
        
        console.log('[Product] Variants with selected variation:', variantsWithVariation.map((v: any) => v.type))
        
        // Find the color name from availableColors mapping
        const selectedColorObj = availableColors.value.find((c: any) => {
          const cCodeNormalized = normalizeColorCode(c.code || c.hexCode || c.name)
          return cCodeNormalized === normalizedHex
        })
        
        const colorName = selectedColorObj?.colorName || selectedColorObj?.displayName
        
        if (colorName) {
          // Use the color name to search for variant
          const colorVariationPattern = `${colorName}-${selectedVariation.value}`
          console.log('[Product] Found color name from mapping, searching for:', colorVariationPattern)
          variant = product.value.variation.find((v: any) => 
            v.type === colorVariationPattern && v.qty > 0
          )
        }
        
        // If not found, try to find color name from colors_formatted if available
        if (!variant) {
          let colorNameFromHex = null
          if (product.value.colors_formatted && Array.isArray(product.value.colors_formatted)) {
            const colorFormatted = product.value.colors_formatted.find((c: any) => {
              const colorCodeNormalized = normalizeColorCode(c.code)
              return colorCodeNormalized === normalizedHex
            })
            if (colorFormatted && colorFormatted.name) {
              colorNameFromHex = colorFormatted.name
            }
          }
          
          // If we found a color name, use it to search for variant
          if (colorNameFromHex) {
            const colorVariationPattern = `${colorNameFromHex}-${selectedVariation.value}`
            console.log('[Product] Found color name from colors_formatted, searching for:', colorVariationPattern)
            variant = product.value.variation.find((v: any) => 
              v.type === colorVariationPattern && v.qty > 0
            )
          }
        }
        
        // If still not found, search by variation only (will find first variant with this variation)
        if (!variant) {
          console.log('[Product] Color name not found, searching by variation only')
          variant = variantsWithVariation[0] || null
        }
      } else {
        // If it's a color name (from variation.type), use it directly
        const colorVariationPattern = `${selectedColor.value}-${selectedVariation.value}`
        console.log('[Product] Searching for variant with pattern:', colorVariationPattern)
        variant = product.value.variation.find((v: any) => 
          v.type === colorVariationPattern && v.qty > 0
        )
      }
      
      // If not found or qty is 0, try to find any available variant with same variation
      if (!variant || (variant.qty !== undefined && variant.qty <= 0)) {
        variant = product.value.variation.find((v: any) => {
          if (v.type && typeof v.type === 'string') {
            const parts = v.type.split('-')
            if (parts.length >= 2) {
              const lastPart = parts[parts.length - 1].trim()
              return lastPart === selectedVariation.value && v.qty > 0
            }
          }
          return false
        })
      }
    } else if (selectedVariation.value) {
      // If only variation is selected, find first available variant with that variation
      // First, try exact match (for products with variations only, e.g., "100ml", "200ml")
      variant = product.value.variation.find((v: any) => 
        (v.type === selectedVariation.value || v.type === String(selectedVariation.value)) && v.qty > 0
      )
      
      // If not found, try matching the last part (for products with color-variation pattern)
      if (!variant) {
        variant = product.value.variation.find((v: any) => {
          if (v.type && typeof v.type === 'string') {
            const parts = v.type.split('-')
            if (parts.length >= 2) {
              const lastPart = parts[parts.length - 1].trim()
              return lastPart === selectedVariation.value && v.qty > 0
            }
          }
          return false
        })
      }
      
      console.log('[Product] Searching for variant by variation only:', {
        selectedVariation: selectedVariation.value,
        foundVariant: variant?.type || null,
        foundPrice: variant?.price || null
      })
    }
  } else {
    // If variations are NOT linked to colors, use old logic
  // If product has no colors, search by size directly
  if (!selectedColor.value || availableColors.value.length === 0) {
    if (selectedSize.value) {
      variant = product.value.variation.find((v: any) => 
          (v.type === selectedSize.value || v.type === String(selectedSize.value)) && v.qty > 0
        )
      } else if (selectedVariation.value) {
        // Search for variant by variation only (exact match first)
        console.log('[Product] Before searching - all variants:', product.value.variation?.map((v: any) => ({ 
          type: v.type, 
          qty: v.qty, 
          price: v.price,
          matches: v.type === selectedVariation.value || v.type === String(selectedVariation.value)
        })))
        
        variant = product.value.variation.find((v: any) => {
          const matches = (v.type === selectedVariation.value || v.type === String(selectedVariation.value)) && v.qty > 0
          if (matches) {
            console.log('[Product] Found matching variant:', { type: v.type, price: v.price, qty: v.qty })
          }
          return matches
        })
        
        console.log('[Product] Searching for variant by variation only (no colors):', {
          selectedVariation: selectedVariation.value,
          selectedVariationType: typeof selectedVariation.value,
          allVariants: product.value.variation?.map((v: any) => ({ 
            type: v.type, 
            typeType: typeof v.type,
            qty: v.qty, 
            price: v.price,
            matches: v.type === selectedVariation.value || v.type === String(selectedVariation.value)
          })),
          foundVariant: variant?.type || null,
          foundPrice: variant?.price || null,
          variantMatches: variant ? (variant.type === selectedVariation.value) : false
        })
    }
  } else {
      // If product has colors, check if there are variations/sizes
      const hasVariations = availableVariations.value.length > 0
      const hasSizes = availableSizes.value.length > 0
      
      // If product has colors only (no variations or sizes), search by color only
      if (!hasVariations && !hasSizes) {
        // Search for variant that matches the color
        // First, try to get color name from availableColors mapping (colorName or displayName)
        const selectedColorObj = availableColors.value.find((c: any) => {
          const cCodeNormalized = normalizeColorCode(c.code || c.hexCode || c.name)
          const selectedColorNormalized = normalizeColorCode(selectedColor.value)
          return cCodeNormalized === selectedColorNormalized || c.name === selectedColor.value
        })
        
        const colorNameToSearch = selectedColorObj?.colorName || selectedColorObj?.displayName || selectedColorObj?.name || selectedColor.value
        
        console.log('[Product] Searching for variant by color only:', {
          selectedColor: selectedColor.value,
          colorNameToSearch: colorNameToSearch,
          selectedColorObj: selectedColorObj,
          allVariants: product.value.variation?.map((v: any) => ({ type: v.type, price: v.price, qty: v.qty }))
        })
        
        // Check if selectedColor is a hex color
        const isHexColor = /^#?[0-9A-Fa-f]{6}$/i.test(selectedColor.value.replace('#', ''))
        
        if (isHexColor) {
          // If it's a hex color, we need to find which color name from variation.type matches this hex
          // Strategy: Use the colorName from availableColors mapping if available
          const normalizedHex = normalizeColorCode(selectedColor.value)
          
          // First, try using colorName from mapping
          if (selectedColorObj?.colorName) {
    variant = product.value.variation.find((v: any) => 
              v.type === selectedColorObj.colorName && v.qty > 0
            )
            console.log('[Product] Trying colorName from mapping:', selectedColorObj.colorName, '->', variant?.type || 'not found')
          }
          
          // If not found, try to match hex color with color names by order
          if (!variant) {
            // Get all unique color names from variation.type
            const colorNamesFromVariants = new Set<string>()
            product.value.variation.forEach((v: any) => {
              if (v.type) {
                colorNamesFromVariants.add(v.type)
              }
            })
            
            // Try to match hex color with color names by checking availableColors
            // If we have 2 hex colors and 2 color names, map them by order
            const hexColorsArray = availableColors.value.map((c: any) => normalizeColorCode(c.code || c.hexCode || c.name))
            const colorNamesArray = Array.from(colorNamesFromVariants)
            
            console.log('[Product] Hex color mapping attempt:', {
              hexColorsArray,
              colorNamesArray,
              selectedColorNormalized: normalizedHex
            })
            
            if (hexColorsArray.length === colorNamesArray.length && hexColorsArray.length > 0) {
              const index = hexColorsArray.indexOf(normalizedHex)
              if (index >= 0 && index < colorNamesArray.length) {
                const mappedColorName = colorNamesArray[index]
                variant = product.value.variation.find((v: any) => 
                  v.type === mappedColorName && v.qty > 0
                )
                console.log('[Product] Mapped hex color to color name by order:', selectedColor.value, '->', mappedColorName, '->', variant?.type || 'not found')
              }
            }
          }
        } else {
          // If it's a color name (not hex), search directly
          // Try exact match first
          variant = product.value.variation.find((v: any) => {
            if (!v.type) return false
            return v.type === colorNameToSearch && v.qty > 0
          })
          
          // If not found, try case-insensitive match
          if (!variant) {
            variant = product.value.variation.find((v: any) => {
              if (!v.type) return false
              return v.type.toLowerCase() === colorNameToSearch.toLowerCase() && v.qty > 0
            })
          }
          
          // If still not found, try if variant.type contains color name
          if (!variant) {
            variant = product.value.variation.find((v: any) => {
              if (!v.type) return false
              return v.type.includes(colorNameToSearch) && v.qty > 0
            })
          }
        }
        
        console.log('[Product] Found variant by color only:', {
          selectedColor: selectedColor.value,
          colorNameToSearch: colorNameToSearch,
          foundVariant: variant?.type || null,
          foundPrice: variant?.price || null,
          foundQty: variant?.qty || null
        })
      } else if (selectedSize.value) {
        // If product has colors and sizes, search by color-size combination
        // Try different search patterns (only if qty > 0)
        variant = product.value.variation.find((v: any) => 
          v.type === `${selectedColor.value}-${selectedSize.value}` && v.qty > 0
    )
    
    // If not found, try with different separators
    if (!variant) {
      variant = product.value.variation.find((v: any) => 
            (v.type === `${selectedColor.value}_${selectedSize.value}` ||
        v.type === `${selectedColor.value} ${selectedSize.value}` ||
            v.type === `${selectedColor.value}/${selectedSize.value}`) && v.qty > 0
      )
    }
    
    // If still not found, try partial matches
    if (!variant) {
      variant = product.value.variation.find((v: any) => 
            v.type.includes(selectedColor.value) && v.type.includes(selectedSize.value) && v.qty > 0
          )
        }
      } else if (selectedVariation.value) {
        // If product has colors and variations, search by color-variation combination
        variant = product.value.variation.find((v: any) => 
          v.type === `${selectedColor.value}-${selectedVariation.value}` && v.qty > 0
        )
        
        // If not found, try with different separators
        if (!variant) {
          variant = product.value.variation.find((v: any) => 
            (v.type === `${selectedColor.value}_${selectedVariation.value}` ||
            v.type === `${selectedColor.value} ${selectedVariation.value}` ||
            v.type === `${selectedColor.value}/${selectedVariation.value}`) && v.qty > 0
          )
        }
      }
    }
  }
  
  // If variant found, check if it's available (qty > 0)
  // Only override if variant is not available (qty <= 0) OR if variant doesn't match selectedVariation
  // BUT: If product has colors only (no variations), don't check selectedVariation
  if (variant) {
    // Check if product has colors only (no variations or sizes)
    const hasVariations = availableVariations.value.length > 0
    const hasSizes = availableSizes.value.length > 0
    const colorsOnly = !hasVariations && !hasSizes && availableColors.value.length > 0
    
    // For products with colors only, variant matches if it's available (qty > 0)
    // For products with variations, variant must match selectedVariation
    let variantMatches = true
    if (!colorsOnly && selectedVariation.value) {
      // Only check variantMatches if we have variations and a selectedVariation
      variantMatches = variant.type === selectedVariation.value || variant.type === String(selectedVariation.value)
    }
    
    const variantIsAvailable = variant.qty !== undefined && variant.qty !== null && variant.qty > 0
    
    console.log('[Product] Checking variant before final assignment:', {
      variantType: variant.type,
      selectedVariation: selectedVariation.value,
      selectedColor: selectedColor.value,
      colorsOnly: colorsOnly,
      variantMatches: variantMatches,
      variantIsAvailable: variantIsAvailable,
      willOverride: !variantMatches || !variantIsAvailable
    })
    
    // If variant doesn't match or is not available, try to find correct one
    if (!variantMatches || !variantIsAvailable) {
      if (colorsOnly && selectedColor.value) {
        // For products with colors only, if variant is not available, try to find another variant for this color
        // Don't override if variant is available - it should match the color
        if (!variantIsAvailable) {
          // Try to find another available variant for this color
          const selectedColorObj = availableColors.value.find((c: any) => {
            const cCodeNormalized = normalizeColorCode(c.code || c.hexCode || c.name)
            const selectedColorNormalized = normalizeColorCode(selectedColor.value)
            return cCodeNormalized === selectedColorNormalized || c.name === selectedColor.value
          })
          
          const colorNameToSearch = selectedColorObj?.colorName || selectedColorObj?.displayName || selectedColorObj?.name || selectedColor.value
          
          const availableVariant = product.value.variation.find((v: any) => {
            if (!v.type) return false
            return (v.type === colorNameToSearch || v.type.toLowerCase() === colorNameToSearch.toLowerCase()) && v.qty > 0
          })
          
          if (availableVariant) {
            variant = availableVariant
          } else {
            variant = null
          }
        } else {
          // Variant is available and matches color, keep it
          console.log('[Product] Keeping variant (matches color and is available):', variant.type)
        }
      } else if (variationsLinkedToColors && selectedColor.value && selectedVariation.value) {
        // Try to find any available variant with same variation
        const availableVariant = product.value.variation.find((v: any) => {
          if (v.type && typeof v.type === 'string') {
            const parts = v.type.split('-')
            if (parts.length >= 2) {
              const lastPart = parts[parts.length - 1].trim()
              return lastPart === selectedVariation.value && v.qty > 0
            }
          }
          return false
        })
        if (availableVariant) {
          variant = availableVariant
        } else {
          variant = null
        }
      } else if (selectedVariation.value && (!selectedColor.value || availableColors.value.length === 0)) {
        // If only variation is selected (no colors), try to find exact match
        const availableVariant = product.value.variation.find((v: any) => {
          return (v.type === selectedVariation.value || v.type === String(selectedVariation.value)) && v.qty > 0
        })
        if (availableVariant) {
          console.log('[Product] Overriding variant (didn\'t match or qty was 0):', {
            originalVariant: variant?.type,
            newVariant: availableVariant.type,
            selectedVariation: selectedVariation.value
          })
          variant = availableVariant
        } else {
          variant = null
        }
      } else if (!colorsOnly) {
        // Only set to null if not colors-only product
        variant = null
      }
    }
  }
  
  selectedVariant.value = variant || null
  
  // Log for debugging
  if (selectedVariant.value) {
    console.log('[Product] ✅ Selected variant:', {
      type: selectedVariant.value.type,
      price: selectedVariant.value.price,
      qty: selectedVariant.value.qty,
      sku: selectedVariant.value.sku
    })
  } else {
    console.log('[Product] ❌ No variant selected')
    console.log('[Product] Available variants:', product.value.variation?.map((v: any) => ({
      type: v.type,
      qty: v.qty
    })))
  }
}

// Helper function to get color value (for CSS background)
const getColorValue = (colorCode: string): string => {
  if (!colorCode) return '#cccccc'
  
  // If color code is a valid hex code with #, return it
  if (/^#([0-9A-F]{3}){1,2}$/i.test(colorCode)) {
    return colorCode
  }
  
  // If color code is a valid hex code without #, add # and return
  if (/^([0-9A-F]{3}){1,2}$/i.test(colorCode)) {
    return `#${colorCode}`
  }
  
  // If it's a named color like "red", "blue", etc.
  if (/^[a-z]+$/i.test(colorCode) && colorCode.length < 20) {
    return colorCode
  }
  
  // Default fallback color
  return '#cccccc'
}

// Handle color selection
const selectColor = async (color: any) => {
  console.log('[Product] Selecting color:', color.name)
  
  // Destroy existing Swiper instances before changing color
  try {
    if (mainSwiper.value && mainSwiper.value.destroy) {
      mainSwiper.value.destroy(true, true)
      mainSwiper.value = null
    }
    if (thumbnailSwiper.value && thumbnailSwiper.value.destroy) {
      thumbnailSwiper.value.destroy(true, true)
      thumbnailSwiper.value = null
    }
  } catch (e) {
    console.warn('[Product] Error destroying swiper:', e)
  }
  
  // Reset swiperReady to force re-initialization
  swiperReady.value = false
  
  // Update color selection
  selectedColor.value = color.name
  
  // Auto-select first variation if no variation is selected
  if (!selectedVariation.value && availableVariations.value.length > 0) {
    selectedVariation.value = availableVariations.value[0]
  }
  
  updateSelectedVariant()
  
  // Reset main image index when color changes
  mainIndex.value = 0
  
  // Wait for images to update (they will be filtered by the images computed property)
  await nextTick()
  
  // Wait a bit more to ensure images computed has updated
  setTimeout(() => {
    console.log('[Product] After color selection, images count:', images.value.length)
    if (images.value && images.value.length > 0 && shouldShowSwiper.value) {
      console.log('[Product] Re-enabling swiper after color selection')
      swiperReady.value = true
    }
  }, 300) // Wait for images to be filtered and DOM to update
}

// Clear color selection
const clearColorSelection = async () => {
  console.log('[Product] Clearing color selection')
  
  // Destroy existing Swiper instances before clearing color
  try {
    if (mainSwiper.value && mainSwiper.value.destroy) {
      mainSwiper.value.destroy(true, true)
      mainSwiper.value = null
    }
    if (thumbnailSwiper.value && thumbnailSwiper.value.destroy) {
      thumbnailSwiper.value.destroy(true, true)
      thumbnailSwiper.value = null
    }
  } catch (e) {
    console.warn('[Product] Error destroying swiper:', e)
  }
  
  // Reset swiperReady to force re-initialization
  swiperReady.value = false
  
  // Clear color and variation selection
  selectedColor.value = ''
  selectedVariation.value = ''
  mainIndex.value = 0
  updateSelectedVariant()
  
  // Wait for images to update
  await nextTick()
  
  // Wait a bit more to ensure images computed has updated
      setTimeout(() => {
    console.log('[Product] After clearing color, images count:', images.value.length)
    if (images.value && images.value.length > 0 && shouldShowSwiper.value) {
      console.log('[Product] Re-enabling swiper after clearing color')
      swiperReady.value = true
    }
  }, 300) // Wait for images to be updated and DOM to update
}

// Handle variation selection
const selectVariation = async (variation: string) => {
  console.log('[Product] Selecting variation:', variation)
  
  // Destroy existing Swiper instances before changing variation
  try {
    if (mainSwiper.value && mainSwiper.value.destroy) {
      mainSwiper.value.destroy(true, true)
      mainSwiper.value = null
    }
    if (thumbnailSwiper.value && thumbnailSwiper.value.destroy) {
      thumbnailSwiper.value.destroy(true, true)
      thumbnailSwiper.value = null
    }
  } catch (e) {
    console.warn('[Product] Error destroying swiper:', e)
  }
  
  // Reset swiperReady to force re-initialization
  swiperReady.value = false
  
  // Update variation selection
  selectedVariation.value = variation
  
  // Auto-select first color if no color is selected
  if (!selectedColor.value && availableColors.value.length > 0) {
    selectedColor.value = availableColors.value[0].name
  }
  
  updateSelectedVariant()
  
  // Reset main image index when variation changes
  mainIndex.value = 0
  
  // Wait for images to update (they will be filtered by the images computed property)
  await nextTick()
  
  // Wait a bit more to ensure images computed has updated
  setTimeout(() => {
    console.log('[Product] After variation selection, images count:', images.value.length)
    if (images.value && images.value.length > 0 && shouldShowSwiper.value) {
      console.log('[Product] Re-enabling swiper after variation selection')
      swiperReady.value = true
    }
  }, 300) // Wait for images to be filtered and DOM to update
}

// Clear variation selection
const clearVariationSelection = async () => {
  console.log('[Product] Clearing variation selection')
  
  // Destroy existing Swiper instances before clearing variation
  try {
    if (mainSwiper.value && mainSwiper.value.destroy) {
      mainSwiper.value.destroy(true, true)
      mainSwiper.value = null
    }
    if (thumbnailSwiper.value && thumbnailSwiper.value.destroy) {
      thumbnailSwiper.value.destroy(true, true)
      thumbnailSwiper.value = null
    }
  } catch (e) {
    console.warn('[Product] Error destroying swiper:', e)
  }
  
  // Reset swiperReady to force re-initialization
  swiperReady.value = false
  
  // Clear variation and color selection
  selectedVariation.value = ''
  selectedColor.value = ''
  mainIndex.value = 0
  updateSelectedVariant()
  
  // Wait for images to update
  await nextTick()
  
  // Wait a bit more to ensure images computed has updated
  setTimeout(() => {
    console.log('[Product] After clearing variation, images count:', images.value.length)
    if (images.value && images.value.length > 0 && shouldShowSwiper.value) {
      console.log('[Product] Re-enabling swiper after clearing variation')
      swiperReady.value = true
    }
  }, 300) // Wait for images to be updated and DOM to update
}

// Watch selectedColor and selectedVariation to update variant
watch([selectedColor, selectedVariation], () => {
  console.log('[Product] Color or variation changed, updating variant')
  updateSelectedVariant()
}, { deep: true })

// Watch images to reset swiper when they change (e.g., when color is selected/cleared)
watch(images, async (newImages, oldImages) => {
  // Only reset if images actually changed (not just on initial load)
  if (oldImages && oldImages.length > 0 && newImages.length > 0) {
    // Check if images array changed
    if (JSON.stringify(newImages) !== JSON.stringify(oldImages)) {
      console.log('[Product] Images changed, resetting swiper:', {
        oldCount: oldImages.length,
        newCount: newImages.length,
        oldImages: oldImages.slice(0, 2),
        newImages: newImages.slice(0, 2)
      })
      
      mainIndex.value = 0
      
      // Destroy existing Swiper instances
      try {
        if (mainSwiper.value && mainSwiper.value.destroy) {
          mainSwiper.value.destroy(true, true)
          mainSwiper.value = null
        }
        if (thumbnailSwiper.value && thumbnailSwiper.value.destroy) {
          thumbnailSwiper.value.destroy(true, true)
          thumbnailSwiper.value = null
        }
      } catch (e) {
        console.warn('[Product] Error destroying swiper on images change:', e)
      }
      
      // Reset swiperReady to force re-initialization
      swiperReady.value = false
      
      // Wait for DOM to update, then re-enable swiper
      await nextTick()
      setTimeout(() => {
        if (newImages && newImages.length > 0 && shouldShowSwiper.value) {
          console.log('[Product] Re-enabling swiper after images change')
          swiperReady.value = true
        }
      }, 250) // Slightly longer delay to ensure DOM is ready
    }
  }
}, { deep: true })

// Handle size selection
const selectSize = (size: any) => {
  selectedSize.value = size.value
  updateSelectedVariant()
}

// Check if size is available
const isSizeAvailable = (sizeValue: string) => {
  if (!product.value?.variation) return true
  
  // If product has no colors, search by size directly
  if (!selectedColor.value || availableColors.value.length === 0) {
    const variant = product.value.variation.find((v: any) => 
      v.type === sizeValue || v.type === String(sizeValue)
    )
    return variant && variant.qty > 0
  }
  
  // If product has colors, search by color-size combination
  const variant = product.value.variation.find((v: any) => 
    v.type === `${selectedColor.value}-${sizeValue}` ||
    v.type === `${selectedColor.value}_${sizeValue}` ||
    v.type === `${selectedColor.value} ${sizeValue}` ||
    v.type === `${selectedColor.value}/${sizeValue}` ||
    (v.type.includes(selectedColor.value) && v.type.includes(sizeValue))
  )
  
  return variant && variant.qty > 0
}

// Helper function to find image index by name
const findImageIndexByName = (imageName: string) => {
  if (!imageName) return -1
  
  console.log(`البحث عن الصورة: ${imageName}`)
  
  // First try exact match
  let index = images.value.findIndex(img => {
    const imgFilename = img.split('/').pop()?.split('?')[0]
    const match = imgFilename === imageName
    if (match) console.log(`تم العثور على مطابقة دقيقة: ${imgFilename}`)
    return match
  })
  
  if (index !== -1) return index
  
  // Try partial match
  index = images.value.findIndex(img => {
    const match = img.includes(imageName)
    if (match) console.log(`تم العثور على مطابقة جزئية: ${img}`)
    return match
  })
  if (index !== -1) return index
  
  // Try without extension
  const nameWithoutExt = imageName.split('.')[0]
  index = images.value.findIndex(img => {
    const imgFilename = img.split('/').pop()?.split('?')[0]?.split('.')[0]
    const match = imgFilename === nameWithoutExt
    if (match) console.log(`تم العثور على مطابقة بدون امتداد: ${imgFilename}`)
    return match
  })
  
  if (index === -1) {
    console.log(`لم يتم العثور على الصورة: ${imageName}`)
    console.log('الصور المتاحة:', images.value.map(img => img.split('/').pop()))
  }
  
  return index
}

const addToCart = async () => {
  if (busy.value || !product.value) return
  const id = product.value?.id || product.value?.product_id || product.value?.product?.id
  if (!id) return
  
  // Check if variant is required but not selected
  if (availableColors.value.length > 0 && !selectedColor.value) {
    showSuccess('يرجى اختيار لون أولاً')
    return
  }
  
  if (availableSizes.value.length > 0 && !selectedSize.value) {
    showSuccess('يرجى اختيار حجم أولاً')
    return
  }
  
  // Check stock availability
  if (!currentVariantStock.value) {
    showSuccess('هذا المتغير غير متوفر حالياً')
    return
  }
  
  try {
    busy.value = true
    
    // Prepare cart data with variant info
    const cartData: any = { 
      product_id: Number(id), 
      quantity: qty.value 
    }
    
    // Add variant info if available
    if (selectedVariant.value) {
      cartData.variant_type = selectedVariant.value.type
      cartData.sku = selectedVariant.value.sku
      cartData.color = selectedColor.value
      cartData.size = selectedSize.value
    }
    
    // Add color and size info even if no variant
    if (selectedColor.value) {
      cartData.color = selectedColor.value
    }
    if (selectedSize.value) {
      cartData.size = selectedSize.value
    }
    
    // Add current price (with discount already applied)
    cartData.price = currentVariantPrice.value
    
    // Store original base price for backend reference
    if (selectedVariant.value && selectedVariant.value.price) {
      cartData.base_price = selectedVariant.value.price
    } else {
      cartData.base_price = basePrice.value
    }
    
    // Add discount info if available
    if (discountValue.value > 0) {
      cartData.discount = discountValue.value
      cartData.discount_type = discountType.value
    }
    
    // Add variant info for better tracking
    if (selectedVariant.value) {
      cartData.variant = `${selectedColor.value || ''}-${selectedSize.value || ''}`.replace(/^-|-$/g, '')
    }
    
    await cart.add(cartData)
    // Refresh cart to update counts and totals
    await cart.list()
    console.log('تم إرسال البيانات للسلة')
    
    // Show success message
    let message = 'تم إضافة المنتج للسلة بنجاح'
    if (selectedVariant.value) {
      message += ` (${selectedVariant.value.type})`
    }
    if (qty.value > 1) {
      message += ` - الكمية: ${qty.value}`
    }
    showSuccess(message)
    
    // Reset quantity to 1 after successful add
    qty.value = 1
    
  } catch (error: any) {
    console.error('خطأ في إضافة المنتج للسلة:', error)
    showSuccess('حدث خطأ في إضافة المنتج للسلة')
  } finally {
    busy.value = false
  }
}
// OTP Login Functions
async function handleRequestOtp() {
  if (!otpForm.value.phone || otpForm.value.phone.trim() === '') {
    taqnyatAuth.error.value = t('taqnyat.phone_required') || 'رقم الهاتف مطلوب'
    return
  }

  const success = await taqnyatAuth.requestOtp(otpForm.value.phone)
  if (success) {
    otpSent.value = true
    // Start countdown (60 seconds)
    otpCountdown.value = 60
    otpTimer = setInterval(() => {
      otpCountdown.value--
      if (otpCountdown.value <= 0) {
        clearInterval(otpTimer)
        otpTimer = null
      }
    }, 1000)
  }
}

async function handleOtpLogin() {
  if (!otpForm.value.phone || !otpForm.value.otp) {
    taqnyatAuth.error.value = t('taqnyat.otp_required') || 'رمز التحقق مطلوب'
    return
  }

  const success = await taqnyatAuth.verifyOtp(otpForm.value.phone, otpForm.value.otp)
  if (success) {
    showLoginModal.value = false
    otpForm.value = { phone: '', otp: '' }
    otpSent.value = false
    otpCountdown.value = 0
    if (otpTimer) {
      clearInterval(otpTimer)
      otpTimer = null
    }
    // Show success message
    loginSuccess.value = true
    // Reload reviews after successful login
    await loadReviews()
    setTimeout(() => {
      loginSuccess.value = false
    }, 2000)
  }
}

async function handleResendOtp() {
  if (!otpForm.value.phone) {
    taqnyatAuth.error.value = t('taqnyat.phone_required') || 'رقم الهاتف مطلوب'
    return
  }

  const success = await taqnyatAuth.resendOtp(otpForm.value.phone)
  if (success) {
    // Reset countdown
    otpCountdown.value = 60
    if (otpTimer) {
      clearInterval(otpTimer)
    }
    otpTimer = setInterval(() => {
      otpCountdown.value--
      if (otpCountdown.value <= 0) {
        clearInterval(otpTimer)
        otpTimer = null
      }
    }, 1000)
  }
}

function openLoginModal() {
  showLoginModal.value = true
  loginSuccess.value = false
  // Reset OTP form
  otpForm.value = { phone: '', otp: '' }
  otpSent.value = false
  otpCountdown.value = 0
  if (otpTimer) {
    clearInterval(otpTimer)
    otpTimer = null
  }
  taqnyatAuth.clearMessages()
}

// Wishlist functions
async function checkWishlistStatus() {
  if (!auth?.user?.value || !product.value?.id) return
  
  try {
    const response = await $get('v1/customer/wish-list/')
    if (response && Array.isArray(response)) {
      isInWishlist.value = response.some((item: any) => item.product_id === product.value.id)
    }
  } catch (error) {
    console.error('Error checking wishlist status:', error)
  }
}

async function toggleWishlist() {
  if (!auth?.user?.value) {
    showLoginModal.value = true
    // Reset OTP form when opening modal
    otpForm.value = { phone: '', otp: '' }
    otpSent.value = false
    otpCountdown.value = 0
    if (otpTimer) {
      clearInterval(otpTimer)
      otpTimer = null
    }
    taqnyatAuth.clearMessages()
    return
  }
  
  if (!product.value?.id) return
  
  wishlistLoading.value = true
  
  try {
    if (isInWishlist.value) {
      // Remove from wishlist
      await $del('v1/customer/wish-list/remove', {
        params: { product_id: product.value.id }
      })
      isInWishlist.value = false
      console.log('تم إزالة المنتج من المفضلة')
    } else {
      // Add to wishlist
      await $post('v1/customer/wish-list/add', {
        product_id: product.value.id
      })
      isInWishlist.value = true
      console.log('تم إضافة المنتج إلى المفضلة')
    }
  } catch (error: any) {
    console.error('Error toggling wishlist:', error)
    if (error?.data?.message) {
      console.error('Error message:', error.data.message)
    }
  } finally {
    wishlistLoading.value = false
  }
}

// Compare functions
function checkCompareStatus() {
  if (!product.value?.id) return
  
  const productId = product.value.id || product.value.product_id
  isInCompare.value = compare.items.value.some((item: any) => item.id === productId)
}

async function toggleCompare() {
  if (!product.value) return
  
  compareLoading.value = true
  
  try {
    const productId = product.value.id || product.value.product_id
    
    if (isInCompare.value) {
      // Remove from compare
      compare.remove(productId)
      isInCompare.value = false
      showSuccess('تم إزالة المنتج من المقارنة')
    } else {
      // Add to compare
      const success = compare.add(product.value)
      if (success) {
        isInCompare.value = true
        showSuccess('تم إضافة المنتج إلى المقارنة')
      } else {
        showSuccess(compare.error.value || 'فشل في إضافة المنتج إلى المقارنة')
      }
    }
  } catch (error: any) {
    console.error('Error toggling compare:', error)
    showSuccess('حدث خطأ في المقارنة')
  } finally {
    compareLoading.value = false
  }
}

function closeLoginModal() {
  showLoginModal.value = false
  loginSuccess.value = false
  // Reset OTP form
  otpForm.value = { phone: '', otp: '' }
  otpSent.value = false
  otpCountdown.value = 0
  if (otpTimer) {
    clearInterval(otpTimer)
    otpTimer = null
  }
  taqnyatAuth.clearMessages()
}
// Load reviews
const loadReviews = async () => {
  if (!product.value) return
  
  reviewsLoading.value = true
  reviewsError.value = ''
  
  try {
    const productId = product.value?.id || product.value?.product_id || product.value?.product?.id
    if (!productId) return
    
    // Load reviews using $get from useApi
    const reviewsResponse = await $get(`v1/products/reviews/${productId}`)
    
    // Handle different response structures
    if (Array.isArray(reviewsResponse)) {
      reviews.value = reviewsResponse
    } else if (Array.isArray(reviewsResponse?.data)) {
      reviews.value = reviewsResponse.data
    } else if (Array.isArray(reviewsResponse?.reviews)) {
      reviews.value = reviewsResponse.reviews
    } else {
      reviews.value = []
    }
    
    totalReviewsCount.value = reviews.value.length
    
    // Calculate average rating from reviews
    if (reviews.value.length > 0) {
      const sum = reviews.value.reduce((acc: number, review: any) => {
        const rating = Number(review?.rating || review?.stars || 0)
        return acc + rating
      }, 0)
      averageRating.value = sum / reviews.value.length
    } else {
      // Try to load rating separately if no reviews
      try {
        const ratingResponse = await $get(`v1/products/rating/${productId}`)
        averageRating.value = Number(ratingResponse) || 0
      } catch (ratingError) {
        console.warn('Could not load rating:', ratingError)
        averageRating.value = 0
      }
    }
    
  } catch (e: any) {
    console.error('Error loading reviews:', e)
    // If it's a 404, it means no reviews exist yet
    if (e?.status === 404 || e?.statusCode === 404) {
      reviews.value = []
      totalReviewsCount.value = 0
      averageRating.value = 0
      reviewsError.value = ''
    } else {
      reviewsError.value = e?.data?.message || 'تعذر تحميل التقييمات'
    }
  } finally {
    reviewsLoading.value = false
  }
}

// Calculate rating distribution (5 stars, 4 stars, etc.)
const ratingDistribution = computed(() => {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  
  reviews.value.forEach((review: any) => {
    const rating = Math.round(Number(review?.rating || review?.stars || 0))
    if (rating >= 1 && rating <= 5) {
      distribution[rating as keyof typeof distribution]++
    }
  })
  
  return distribution
})

// Calculate percentage for each rating
const getRatingPercentage = (stars: number): number => {
  if (totalReviewsCount.value === 0) return 0
  const distribution = ratingDistribution.value
  const count = distribution[stars as keyof typeof distribution] || 0
  return Math.round((count / totalReviewsCount.value) * 100)
}

// Guest review form
const guestReviewForm = ref({
  rating: 5,
  comment: '',
  name: '',
  email: ''
})

const guestReviewLoading = ref(false)
const guestReviewError = ref('')

// Submit guest review
const submitGuestReview = async (e: Event) => {
  e.preventDefault()
  
  if (!guestReviewForm.value.comment.trim()) {
    guestReviewError.value = 'يرجى كتابة تعليق'
    return
  }
  
  if (!guestReviewForm.value.name.trim()) {
    guestReviewError.value = 'يرجى إدخال الاسم'
    return
  }
  
  if (!guestReviewForm.value.email.trim()) {
    guestReviewError.value = 'يرجى إدخال البريد الإلكتروني'
    return
  }
  
  guestReviewLoading.value = true
  guestReviewError.value = ''
  
  try {
    const productId = product.value?.id || product.value?.product_id || product.value?.product?.id
    if (!productId) {
      guestReviewError.value = 'خطأ في معرف المنتج'
      return
    }
    
    const response = await $post('v1/products/reviews/submit-guest', {
      product_id: productId,
      rating: guestReviewForm.value.rating,
      comment: guestReviewForm.value.comment,
      name: guestReviewForm.value.name,
      email: guestReviewForm.value.email
    })
    
    if (response) {
      // Reset form
      guestReviewForm.value = {
        rating: 5,
        comment: '',
        name: '',
        email: ''
      }
      
      // Reload reviews
      await loadReviews()
      
      // Show success message
      showSuccess('تم إرسال التقييم بنجاح')
    }
  } catch (error: any) {
    console.error('Guest review submission error:', error)
    if (error?.data?.errors && Array.isArray(error.data.errors)) {
      const errorMessages = error.data.errors.map((err: any) => err.message).join(', ')
      guestReviewError.value = errorMessages
    } else {
      guestReviewError.value = error?.data?.message || 'خطأ في إرسال التقييم'
    }
  } finally {
    guestReviewLoading.value = false
  }
}

// Loaders
const load = async () => {
  loading.value = true
  loadingProgress.value = 0
  error.value = ''
  
  // Simulate progress
  const progressInterval = setInterval(() => {
    if (loadingProgress.value < 90) {
      loadingProgress.value += Math.random() * 30
    }
  }, 200)
  
  try {
    // Log slug for debugging
    console.log('[Product] Loading product with slug:', slug.value)
    const res = await getDetails(slug.value)
    console.log('[Product] Product loaded successfully:', res?.name || res?.product?.name)
    console.log('[Product] Product data:', {
      hasColors: !!res?.colors,
      colors: res?.colors,
      hasColorsFormatted: !!res?.colors_formatted,
      colorsFormatted: res?.colors_formatted,
      hasColorImages: !!res?.color_images_full_url,
      colorImagesCount: res?.color_images_full_url?.length || 0
    })
    product.value = res
    loadingProgress.value = 50
    
    // Initialize variants after product is loaded
    initializeVariants()
    console.log('[Product] After initializeVariants, availableColors:', availableColors.value)
    loadingProgress.value = 70
    
    // Wait for DOM to be ready before initializing Swiper
    await nextTick()
    loadingProgress.value = 80
    
    // Load reviews after product is loaded
    await loadReviews()
    loadingProgress.value = 90
    
    // Complete progress
    loadingProgress.value = 100
    clearInterval(progressInterval)
  } catch (e: any) {
    // Better error handling - check if it's a 404 or network error
    const statusCode = e?.statusCode || e?.status || e?.response?.status
    const errorMessage = e?.data?.message || e?.message || 'تعذر تحميل تفاصيل المنتج'
    
    console.error('[Product] Error loading product:', {
      slug: slug.value,
      statusCode,
      error: errorMessage,
      fullError: e
    })
    
    if (statusCode === 404) {
      error.value = `المنتج غير موجود: ${slug.value}`
      // Don't throw 404 error - let the error state display
    } else if (statusCode === 500) {
      error.value = 'خطأ في الخادم. يرجى المحاولة لاحقاً'
    } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      error.value = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى'
    } else {
      error.value = errorMessage
    }
    
    clearInterval(progressInterval)
  } finally {
    loading.value = false
    loadingProgress.value = 0
  }
  // Load recommended
  try {
    recLoading.value = true
    const id = product.value?.id || product.value?.product_id || product.value?.product?.id
    if (id) {
      const list = await getRelated(id)
      recommended.value = Array.isArray(list) ? list : []
    } else {
      recommended.value = []
    }
  } catch {
    recommended.value = []
  } finally {
    recLoading.value = false
  }
}

onMounted(async () => {
  // Check mobile screen size
  checkMobile()
  
  // Add resize listener for mobile detection
  if (process.client) {
    window.addEventListener('resize', checkMobile)
  }
  
  // Load product first (non-blocking)
  load()
  
  // Load wishlist, cart, and compare in parallel (non-blocking)
  compare.init()
  Promise.all([
    wishlist.list().catch(() => {}),
    cart.list().catch(() => {})
  ])
  // Check wishlist status after product loads
  watch(product, () => {
    if (product.value) {
      checkWishlistStatus()
      checkCompareStatus()
    }
  }, { immediate: true })
  
  // Check wishlist status when user logs in
  watch(() => auth?.user?.value, () => {
    if (auth?.user?.value && product.value) {
      checkWishlistStatus()
    }
  })
  
  // Check compare status when compare items change
  watch(() => compare.items.value, () => {
    if (product.value) {
      checkCompareStatus()
    }
  }, { deep: true })
  
  // Add escape key listener for modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (showLoginModal.value) {
        closeLoginModal()
      } else if (showReviewModal.value) {
        closeReviewModal()
      } else if (showReplyModal.value) {
        closeReplyModal()
      }
    }
  })
})

// Cleanup Swiper instances on unmount
onBeforeUnmount(() => {
  // Remove resize listener
  if (process.client) {
    window.removeEventListener('resize', checkMobile)
  }
  
  try {
    if (mainSwiper.value && mainSwiper.value.destroy) {
      mainSwiper.value.destroy(true, true)
      mainSwiper.value = null
    }
    if (thumbnailSwiper.value && thumbnailSwiper.value.destroy) {
      thumbnailSwiper.value.destroy(true, true)
      thumbnailSwiper.value = null
    }
  } catch (e) {
    console.warn('[Product] Error cleaning up swiper:', e)
  }
})

watch(slug, () => { mainIndex.value = 0; load() })

// Structured Data (JSON-LD) for Product
const productStructuredData = computed(() => {
  if (!product.value) return null

  const p: any = product.value || {}
  const categoryName = getCategoryNameForSeo.value
  
  const structuredData: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productTitle.value,
    description: productDescription.value || productTitle.value,
    image: images.value.length > 0 ? images.value.map((img: string) => {
      if (img.startsWith('http')) return img
      return `${seo.siteUrl.value}${img.startsWith('/') ? img : '/' + img}`
    }) : [productImage.value],
    brand: productBrand.value ? {
      '@type': 'Brand',
      name: productBrand.value
    } : undefined,
    category: categoryName || undefined,
    sku: productSku.value || undefined,
    offers: {
      '@type': 'Offer',
      url: currentUrl.value,
      priceCurrency: productCurrency.value,
      price: productPrice.value.toFixed(2),
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: productAvailability.value,
      seller: {
        '@type': 'Organization',
        name: seo.siteName.value,
        url: seo.siteUrl.value
      }
    }
  }

  // Add aggregateRating if reviews exist
  if (reviewsCount.value > 0 && rating.value > 0) {
    structuredData.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.value,
      reviewCount: reviewsCount.value,
      bestRating: 5,
      worstRating: 1
    }
  }

  // Remove undefined properties
  Object.keys(structuredData).forEach(key => {
    if (structuredData[key] === undefined) {
      delete structuredData[key]
    }
  })

  return structuredData
})

// Breadcrumb Structured Data
const breadcrumbStructuredData = computed(() => {
  const categoryName = getCategoryNameForSeo.value
  // Try to get category ID from product data
  const p: any = product.value || {}
  let categoryId: string | number | null = null
  const categoryIds = p?.category_ids || p?.product?.category_ids
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    categoryId = categoryIds[0]?.id || categoryIds[0]?.category_id || null
  }
  if (!categoryId) {
    const categories = p?.categories || p?.category || p?.product?.categories || p?.product?.category
    if (Array.isArray(categories) && categories.length > 0) {
      categoryId = categories[0]?.id || categories[0]?.category_id || null
    } else if (categories && typeof categories === 'object') {
      categoryId = categories.id || categories.category_id || null
    }
  }
  if (!categoryId && p?.category_id) {
    categoryId = p.category_id
  }
  
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: locale.value === 'ar' ? 'الرئيسية' : 'Home',
      item: seo.siteUrl.value
    }
  ]

  if (categoryName) {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: categoryName,
      item: categoryId ? `${seo.siteUrl.value}/shop?category=${categoryId}` : `${seo.siteUrl.value}/shop`
    })
  }

  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: productTitle.value,
    item: currentUrl.value
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items
  }
})

// Organization Structured Data
const organizationStructuredData = computed(() => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: seo.siteName.value,
    url: seo.siteUrl.value,
    logo: `${seo.siteUrl.value}/images/go-tawfeer-1-1.webp`,
    description: seo.siteDescription.value,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      areaServed: 'SA',
      availableLanguage: ['ar', 'en']
    }
  }
})

// Add structured data to head
watch(() => [productStructuredData.value, breadcrumbStructuredData.value, organizationStructuredData.value], () => {
  if (product.value) {
    useHead({
      script: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(productStructuredData.value)
        },
        {
          type: 'application/ld+json',
          children: JSON.stringify(breadcrumbStructuredData.value)
        },
        {
          type: 'application/ld+json',
          children: JSON.stringify(organizationStructuredData.value)
        }
      ]
    })
  }
}, { immediate: true })

// Enhanced Open Graph and Twitter Card meta tags
watch(() => [product.value, locale.value], () => {
  if (product.value) {
    const categoryName = getCategoryNameForSeo.value
    
    useHead({
      meta: [
        // Enhanced Open Graph for Products
        { property: 'og:type', content: 'product' },
        { property: 'product:price:amount', content: productPrice.value.toFixed(2) },
        { property: 'product:price:currency', content: productCurrency.value },
        { property: 'product:availability', content: inStock.value ? 'in stock' : 'out of stock' },
        { property: 'product:condition', content: 'new' },
        ...(productBrand.value ? [{ property: 'product:brand', content: productBrand.value }] : []),
        ...(categoryName ? [{ property: 'product:category', content: categoryName }] : []),
        
        // Enhanced Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:label1', content: locale.value === 'ar' ? 'السعر' : 'Price' },
        { name: 'twitter:data1', content: `${productPrice.value.toFixed(2)} ${productCurrency.value}` },
        ...(productBrand.value ? [
          { name: 'twitter:label2', content: locale.value === 'ar' ? 'البراند' : 'Brand' },
          { name: 'twitter:data2', content: productBrand.value }
        ] : []),
        
        // Additional meta tags
        { name: 'product:price:amount', content: productPrice.value.toFixed(2) },
        { name: 'product:price:currency', content: productCurrency.value },
        ...(productSku.value ? [{ name: 'product:sku', content: productSku.value }] : []),
        ...(rating.value > 0 ? [
          { name: 'rating:value', content: rating.value.toString() },
          { name: 'rating:scale', content: '5' }
        ] : [])
      ]
    })
  }
}, { immediate: true })

// Watch for mainIndex changes and update Swiper
watch(mainIndex, (newIndex) => {
  nextTick(() => {
    if (mainSwiper.value && (mainSwiper.value as any).slideTo) {
      (mainSwiper.value as any).slideTo(newIndex, 300)
    }
  })
})

// Helper functions for modal
const getProductBrand = (product: any): { name: string; id: number | null; image: string } => {
  if (!product) return { name: '', id: null, image: '' }
  
  const brand = product?.brand || product?.product?.brand
  const brandName = product?.brand_name || product?.brand?.name || product?.product?.brand_name || product?.product?.brand?.name || ''
  const brandId = product?.brand_id || product?.brand?.id || product?.product?.brand_id || product?.product?.brand?.id || null
  
  let brandImage = ''
  if (brand) {
    const imgSrc = brand?.image_full_url?.path || 
                   brand?.logo_full_url?.path || 
                   brand?.image_full_url || 
                   brand?.logo_full_url || 
                   brand?.image || 
                   brand?.logo || 
                   ''
    if (imgSrc) {
      if (/^(https?:|data:|blob:)/i.test(imgSrc)) {
        brandImage = imgSrc
      } else {
        brandImage = normalize(imgSrc)
      }
    }
  }
  
  return { name: brandName, id: brandId, image: brandImage || '/images/Group 1171274840.png' }
}

const getProductCategories = (product: any): Array<{ id: number | string; name: string }> => {
  if (!product) return []
  
  const categories = product?.categories || product?.category || product?.product?.categories || product?.product?.category
  
  if (Array.isArray(categories)) {
    return categories
      .filter((cat: any) => cat && (cat.name || cat.category_name || cat.title))
      .map((cat: any) => ({
        id: cat.id || cat.category_id || '',
        name: cat.name || cat.category_name || cat.title || ''
      }))
  }
  
  if (categories && typeof categories === 'object') {
    return [{
      id: categories.id || categories.category_id || '',
      name: categories.name || categories.category_name || categories.title || ''
    }]
  }
  
  return []
}

// Get primary category for breadcrumb (first category or category from product data)
const productCategory = computed(() => {
  if (!product.value) return null
  
  // Try category_ids first (array of categories)
  const categoryIds = product.value?.category_ids || product.value?.product?.category_ids
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    const firstCategory = categoryIds[0]
    if (firstCategory && (firstCategory.name || firstCategory.id)) {
      return {
        id: firstCategory.id || firstCategory.category_id || '',
        name: firstCategory.name || firstCategory.category_name || firstCategory.title || '',
        slug: firstCategory.slug || ''
      }
    }
  }
  
  // Try to get category from product data
  const categories = getProductCategories(product.value)
  if (categories.length > 0) {
    return categories[0] // Return first category
  }
  
  // Fallback to category fields
  const cat = product.value?.category || product.value?.product?.category
  if (cat) {
    if (typeof cat === 'object') {
      return {
        id: cat.id || cat.category_id || '',
        name: cat.name || cat.category_name || cat.title || '',
        slug: cat.slug || ''
      }
    }
  }
  
  // Try category_id and category_name
  if (product.value?.category_id && product.value?.category_name) {
    return {
      id: product.value.category_id,
      name: product.value.category_name,
      slug: product.value.category_slug || ''
    }
  }
  
  return null
})

const getProductLink = (product: any): string => {
  if (!product) return '#'
  const slug = product?.slug || product?.product?.slug
  if (!slug) return '#'
  return getLocalizedPath(`/product/${encodeURIComponent(String(slug))}`)
}

// Computed properties for modal
const modalProductImage = computed(() => getProductImage(selectedProductForModal.value))
const modalProductTitle = computed(() => getProductTitle(selectedProductForModal.value))
const modalProductPrice = computed(() => getProductPrice(selectedProductForModal.value))
const modalProductBrand = computed(() => getProductBrand(selectedProductForModal.value))
const modalProductCategories = computed(() => getProductCategories(selectedProductForModal.value))
const modalProductLink = computed(() => getProductLink(selectedProductForModal.value))

// Share functions
const shareUrl = computed(() => {
  if (process.client && modalProductLink.value !== '#') {
    return window.location.origin + modalProductLink.value
  }
  return ''
})

const shareText = computed(() => {
  return `تحقق من ${modalProductTitle.value} - ${modalProductBrand.value.name}`
})

const shareOnFacebook = () => {
  if (process.client && shareUrl.value) {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl.value)}`, '_blank')
  }
}

const shareOnTelegram = () => {
  if (process.client && shareUrl.value) {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl.value)}&text=${encodeURIComponent(shareText.value)}`, '_blank')
  }
}

const shareOnSnapchat = () => {
  if (process.client && shareUrl.value) {
    window.open(`https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(shareUrl.value)}`, '_blank')
  }
}

const shareOnLinkedIn = () => {
  if (process.client && shareUrl.value) {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl.value)}`, '_blank')
  }
}

// Check if product has variants/options
const hasProductOptions = computed(() => {
  if (!selectedProductForModal.value) return false
  const product = selectedProductForModal.value
  
  // Check for colors
  const hasColors = (product?.colors_formatted && Array.isArray(product.colors_formatted) && product.colors_formatted.length > 0) ||
                    (product?.colors && Array.isArray(product.colors) && product.colors.length > 0) ||
                    (product?.product?.colors_formatted && Array.isArray(product.product.colors_formatted) && product.product.colors_formatted.length > 0) ||
                    (product?.product?.colors && Array.isArray(product.product.colors) && product.product.colors.length > 0)
  
  // Check for sizes
  const hasSizes = (product?.choice_options && Array.isArray(product.choice_options)) ||
                   (product?.product?.choice_options && Array.isArray(product.product.choice_options))
  
  // Check for variations
  const hasVariations = (product?.variation && Array.isArray(product.variation) && product.variation.length > 0) ||
                        (product?.product?.variation && Array.isArray(product.product.variation) && product.product.variation.length > 0)
  
  return hasColors || hasSizes || hasVariations
})

// Loading state for modal add to cart
const isAddingToCart = ref(false)

// Function to open cart dropdown
const openCartDropdown = () => {
  if (process.client) {
    const event = new CustomEvent('open-cart')
    window.dispatchEvent(event)
  }
}

// Add to cart function for modal
const handleModalAddToCart = async () => {
  if (!selectedProductForModal.value || isAddingToCart.value) return
  
  try {
    isAddingToCart.value = true
    const product = selectedProductForModal.value
    const productId = product?.id || product?.product_id
    if (!productId) {
      console.error('Product ID not found')
      return
    }
    
    const priceData = modalProductPrice.value
    const cartData: any = {
      product_id: Number(productId),
      quantity: 1,
      price: priceData.final,
      base_price: priceData.old
    }
    
    if (priceData.hasDiscount) {
      cartData.discount = Number(product?.discount ?? product?.product?.discount ?? 0)
      cartData.discount_type = product?.discount_type || product?.product?.discount_type || 'flat'
    }
    
    if (product?.variant) cartData.variant = product.variant
    if (product?.color) cartData.color = product.color
    if (product?.size) cartData.size = product.size
    if (product?.variant_type) cartData.variant_type = product.variant_type
    if (product?.sku) cartData.sku = product.sku
    
    await cart.add(cartData)
    
    // Show success message
    showSuccess('تم إضافة السلة بنجاح')
    
    // Open cart dropdown
    openCartDropdown()
    
    // Close modal
    if (process.client) {
      const modalElement = document.getElementById('exampleModal')
      if (modalElement) {
        const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement)
        if (modal) {
          modal.hide()
        }
      }
    }
    
    console.log('✅ تم إضافة المنتج للسلة بنجاح')
  } catch (error: any) {
    console.error('❌ خطأ في إضافة المنتج للسلة:', error)
    showSuccess('حدث خطأ في إضافة المنتج للسلة')
  } finally {
    isAddingToCart.value = false
  }
}

// Function to close modal and navigate to product page
const handleProductDetails = () => {
  if (process.client) {
    const modalElement = document.getElementById('exampleModal')
    if (modalElement) {
      const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement)
      if (modal) {
        modal.hide()
      }
    }
  }
}
</script>

<template>
  <div class="wrap">
    <div class="crumbs">
      <NuxtLink :to="getLocalizedPath('/')">{{ t('product.home') }}</NuxtLink>
      <span>/</span>
      <template v-if="productCategory">
        <NuxtLink :to="getLocalizedPath(`/shop?category=${productCategory.id}`)">{{ productCategory.name }}</NuxtLink>
        <span>/</span>
      </template>
      <NuxtLink :to="getLocalizedPath('/shop')">{{ t('product.shop') }}</NuxtLink>
      <span>/</span>
      <b>{{ title }}</b>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="product-loading">
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-progress">
          <div class="progress-bar" :style="{ width: loadingProgress + '%' }"></div>
        </div>
        <span class="loading-text">{{ t('loading') || 'جارٍ التحميل…' }}</span>
      </div>
      
      <!-- Skeleton Product Layout -->
      <div class="skeleton-product">
        <div class="skeleton-gallery">
          <div class="skeleton-main-image"></div>
          <div class="skeleton-thumbnails">
            <div v-for="n in 4" :key="n" class="skeleton-thumbnail"></div>
          </div>
        </div>
        <div class="skeleton-info">
          <div class="skeleton-brand"></div>
          <div class="skeleton-title"></div>
          <div class="skeleton-rating"></div>
          <div class="skeleton-price"></div>
          <div class="skeleton-variants">
            <div class="skeleton-color-options">
              <div v-for="n in 3" :key="n" class="skeleton-color"></div>
            </div>
            <div class="skeleton-size-options">
              <div v-for="n in 4" :key="n" class="skeleton-size"></div>
            </div>
          </div>
          <div class="skeleton-add-to-cart"></div>
        </div>
      </div>
    </div>
    
    <!-- Error State with 404 handling -->
    <div v-else-if="error" class="error-container">
      <div class="error-content">
        <div class="error-code">404</div>
        <h1 class="error-title">المنتج غير موجود</h1>
        <p class="error-message">{{ error }}</p>
        <div class="error-actions">
          <NuxtLink :to="getLocalizedPath('/shop')" class="btn-primary">العودة للمتجر</NuxtLink>
          <NuxtLink :to="getLocalizedPath('/')" class="btn-secondary">الصفحة الرئيسية</NuxtLink>
        </div>
      </div>
    </div>
    <div v-else class="product">
      <!-- Gallery -->
      <div class="gallery">
        <div class="gallery-container">
          <!-- Thumbnail Swiper (Side) -->
          <div v-if="swiperReady && images.length > 1" class="thumbnail-swiper-container">
            <SwiperComponent
              :key="`thumb-swiper-${images.length}-${selectedColor || 'all'}-${selectedVariation || 'all'}-${thumbnailDirection}`"
              :space-between="10"
              :slides-per-view="isMobile ? 4 : 4"
              :direction="thumbnailDirection"
              :modules="modules"
              :loop="false"
              :watch-slides-progress="true"
              @swiper="setThumbnailSwiper"
              class="mySwiper">
              
              <SwiperSlideComponent v-for="(img, i) in images" :key="`thumb-${i}-${img}`">
                <div class="thumbnail-image-wrapper">
                  <img :src="img" :alt="`${title} - ${i + 1}`" @error="onImgErr" />
                </div>
              </SwiperSlideComponent>
            </SwiperComponent>
          </div>
          
        <!-- Main Swiper Gallery -->
          <div class="main-swiper-container">
        <div v-if="!shouldShowSwiper" class="no-images">
          <div class="no-images-content">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
                <p>{{ t('product.no_images') }}</p>
          </div>
        </div>
        <SwiperComponent
          v-if="swiperReady"
                :key="`main-swiper-${images.length}-${selectedColor || 'all'}-${selectedVariation || 'all'}`"
          :style="{
            '--swiper-navigation-color': '#fff',
            '--swiper-pagination-color': '#fff',
          }"
          :space-between="10"
          :navigation="images.length > 1"
          :modules="modules"
                :loop="false"
                :thumbs="{ swiper: thumbnailSwiper }"
          @swiper="setMainSwiper"
          class="mySwiper2"
        >
          <SwiperSlideComponent v-for="(img, i) in images" :key="`main-${i}-${img}`">
            <div class="image-container">
              <img :src="img" :alt="title" @error="onImgErr" />
              <div v-if="imageChanging && i === mainIndex" class="image-loading">
                <div class="loading-spinner"></div>
                    <span>{{ t('product.changing_image') }}</span>
              </div>
            </div>
          </SwiperSlideComponent>
        </SwiperComponent>
          </div>
        </div>
        
          <div class="product-description">
            <!-- Brand -->
            <div class="brand-section search-box-mobile">
              <div class="brand-info">
                <div v-if="brandName" class="brands-popup d-flex align-items-center gap-2">
                  <NuxtLink :to="brandLink" class="text-decoration-none">
                    <picture>
                      <img 
                        class="cover-image-class" 
                        :src="brandImage || '/images/Group 1171274840.png'" 
                        :alt="brandName"
                        @error="(e: any) => { e.target.src = '/images/Group 1171274840.png' }"
                      >
                    </picture>
                  </NuxtLink>
                </div>
                <span class="original-badge">{{ t('product.original') }}</span>
              </div>
            </div>
            
            <h1 class="title search-box-mobile">{{ title }}</h1>
            
            <!-- Product SKU -->
            <div v-if="currentVariantSku" class="product-sku search-box-mobile">
              <span class="sku-label">{{ t('product.sku') || 'رمز المنتج' }}:</span>
              <span class="sku-value">{{ currentVariantSku }}</span>
            </div>
            
            <!-- Rating -->
            <div class="rating-section search-box-mobile">
              <div class="stars">
                <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= Math.round(rating) }">★</span>
              </div>
              <span class="rating-text">({{ reviewsCount }}) {{ t('product.reviews') }}</span>
            </div>
            <p v-if="metaDescription" class="benefit-text">{{ metaDescription }}</p>
          </div>
          <div class="specifications">
            <div v-if="description" class="description-text" v-html="description"></div>
            <div v-if="Object.keys(metaDescription).length === 0" class="no-content">
              لا توجد مواصفات متاحة
            </div>
          </div>

      </div>
      <!-- Info -->
      <div class="info">
        <!-- Brand -->
        <div class="brand-section  search-box-desktop">
          <div class="brand-info">
        <div v-if="brandName" class="brands-popup d-flex align-items-center gap-2">
          <NuxtLink :to="brandLink" class="text-decoration-none">
            <picture>
              <img 
                class="cover-image-class" 
                :src="brandImage || '/images/Group 1171274840.png'" 
                :alt="brandName"
                @error="(e: any) => { e.target.src = '/images/Group 1171274840.png' }"
              >
            </picture>
          </NuxtLink>
        </div>
            <span class="original-badge">{{ t('product.original') }}</span>
          </div>
        </div>
        
        <h1 class="title search-box-desktop">{{ title }}</h1>
        
        <!-- Product SKU -->
        <div v-if="currentVariantSku" class="product-sku search-box-desktop">
          <span class="sku-label">{{ t('product.sku') || 'رمز المنتج' }}:</span>
          <span class="sku-value">{{ currentVariantSku }}</span>
        </div>
        
        <!-- Rating -->
        <div class="rating-section search-box-desktop">
          <div class="stars">
            <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= Math.round(rating) }">★</span>
          </div>
          <span class="rating-text">({{ reviewsCount }}) {{ t('product.reviews') }}</span>
        </div>

        <!-- Price -->
        <div class="price-section">
          <div class="price-main">{{ currentVariantPrice.toLocaleString() }} <img src="/images/Saudi_Riyal_Symbol.svg" alt="ر.س" class="currency-icon" /></div>
          <div v-if="hasDiscount" class="price-old">{{ basePrice.toLocaleString() }} <img src="/images/Saudi_Riyal_Symbol.svg" alt="ر.س" class="currency-icon" /></div>
          <div v-if="hasDiscount" class="discount-badge">-{{ discountPercent }}%</div>
        </div>

        <!-- Color Selection -->
        <div v-if="availableColors.length > 0" class="variant-section">
          <div class="variant-title-wrapper">
          <h4 class="variant-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
              {{ t('product.select_color') }} : {{ currentVariantName }}
          </h4>
            <button 
              v-if="selectedColor" 
              class="clear-color-btn"
              @click="clearColorSelection"
              :title="t('product.clear_color') || 'إزالة اختيار اللون'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
              <span>{{ t('product.clear') || 'إزالة' }}</span>
            </button>
          </div>
          <div class="color-options">
            <div
              v-for="color in availableColors"
              :key="color.code"
              class="color-option-wrapper"
              :class="{ active: selectedColor === color.name }"
            >
              <button
                class="color-option"
                :class="{ active: selectedColor === color.name, 'has-image': color.image && !color.originalName }"
                :style="( !color.originalName  ) 
                  ? { 
                      backgroundImage: `url(${color.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      backgroundColor: color.hexCode || getColorValue(color.code)
                    }
                  : { 
                      backgroundColor: color.hexCode || getColorValue(color.code) 
                    }"
                @click="selectColor(color)"
                :title="color.name || color.code || ''"
              >
              </button>
            </div>
          </div>
        </div>

        <!-- Variation Selection -->
        <div v-if="availableVariations.length > 0" class="variant-section">
          <div class="variant-title-wrapper">
          <h4 class="variant-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
              {{ t('product.select_variation') }}
          </h4>
            <button 
              v-if="selectedVariation" 
              class="clear-color-btn"
              @click="clearVariationSelection"
              :title="t('product.clear_variation') || 'إزالة اختيار المتغير'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
              <span>{{ t('product.clear') || 'إزالة' }}</span>
            </button>
          </div>
          <div class="size-options">
            <button
              v-for="variation in availableVariations"
              :key="variation"
              class="size-option"
              :class="{ active: selectedVariation === variation }"
              @click="selectVariation(variation)"
            >
              <span class="size-value">{{ variation }}</span>
            </button>
          </div>
        </div>



        <!-- Add to Cart -->
        <div class="add-to-cart-section">
          <div class="qty-selector">
            <button @click="qty = Math.max(1, qty - 1)" :disabled="qty <= 1" class="qty-btn">−</button>
            <input type="number" v-model.number="qty" min="1" class="qty-input" />
            <button @click="qty = qty + 1" class="qty-btn">+</button>
            <div class="qty-price">
              <span class="qty-price-value">{{ (currentVariantPrice * qty).toLocaleString() }}</span>
              <img src="/images/Saudi_Riyal_Symbol.svg" alt="ر.س" class="currency-icon" />
            </div>
          </div>
          <button class="add-to-cart-btn" :disabled="!currentVariantStock || busy" @click="addToCart">
            <span>{{ busy ? t('product.adding') : t('product.add_to_cart') }}</span>
          </button>
          <button 
            class="wishlist-btn" 
            :class="{ active: isInWishlist }"
            @click="toggleWishlist"
            :disabled="wishlistLoading"
            title="المفضلة"
          >
            <svg v-if="wishlistLoading" width="20" height="20" viewBox="0 0 24 24" class="spinner">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
              </circle>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" :fill="isInWishlist ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button 
            class="compare-btn" 
            :class="{ active: isInCompare }"
            @click="toggleCompare"
            :disabled="compareLoading"
            title="المقارنة"
          >
           <svg v-if="compareLoading" data-v-fe52aa40="" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path data-v-fe52aa40="" d="M0.00059994 9.42142C0.00059994 9.65916 0.0725927 9.8649 0.216578 10.0386C0.360564 10.2124 0.540546 10.2947 0.756524 10.2855H1.50045C2.0124 10.2855 2.50035 10.1712 2.9643 9.94262C3.42826 9.71402 3.82422 9.4077 4.15218 9.02366C4.48015 8.63962 4.74813 8.18242 4.9561 7.65207C5.16408 7.12173 5.26407 6.56852 5.25607 5.99246C5.25607 5.28838 5.47205 4.68488 5.90401 4.18196C6.33597 3.67905 6.86791 3.42759 7.49985 3.42759H8.9997V4.27797C8.9997 4.47 9.0477 4.63459 9.14369 4.77175C9.23968 4.9089 9.34766 5.00949 9.46765 5.07349C9.58764 5.1375 9.72763 5.15579 9.88761 5.12836C10.0476 5.10093 10.1796 5.0232 10.2836 4.89519L11.7834 3.18071C11.9354 2.99783 12.0074 2.79209 11.9994 2.56349C11.9914 2.3349 11.9194 2.13373 11.7834 1.96L10.2836 0.245514C10.1636 0.117499 10.0276 0.039776 9.87561 0.0123443C9.72363 -0.0150874 9.58364 0.00320038 9.45565 0.0672077C9.32767 0.131215 9.21968 0.231798 9.13169 0.368956C9.0437 0.506115 8.9997 0.666133 8.9997 0.849011V1.71311H7.49985C6.9959 1.71311 6.51195 1.82741 6.048 2.05601C5.58404 2.2846 5.18408 2.58635 4.84812 2.96125C4.51215 3.33615 4.24418 3.79335 4.0442 4.33284C3.84422 4.87233 3.74823 5.42553 3.75622 5.99246C3.75622 6.70568 3.53625 7.31375 3.09629 7.81667C2.65633 8.31958 2.12439 8.57104 1.50045 8.57104H0.756524C0.548545 8.57104 0.368563 8.65333 0.216578 8.81792C0.0645935 8.98251 -0.00739926 9.18368 0.00059994 9.42142ZM0.00059994 2.57721C0.00059994 2.81495 0.0725927 3.01612 0.216578 3.18071C0.360564 3.3453 0.540546 3.42759 0.756524 3.42759H1.50045C1.85241 3.42759 2.17638 3.51446 2.47235 3.68819C2.76832 3.86193 3.0283 4.09967 3.25227 4.40142C3.42026 3.81621 3.66823 3.29043 3.9962 2.82409C3.26827 2.08344 2.43636 1.71311 1.50045 1.71311H0.756524C0.548545 1.71311 0.368563 1.79998 0.216578 1.97371C0.0645935 2.14745 -0.00739926 2.34861 0.00059994 2.57721ZM5.0161 9.18825C5.72803 9.91976 6.55594 10.2855 7.49985 10.2855H8.9997V11.1496C8.9997 11.3325 9.0477 11.4971 9.14369 11.6434C9.23968 11.7897 9.34766 11.8903 9.46765 11.9451C9.58764 12 9.72763 12.0137 9.88761 11.9863C10.0476 11.9589 10.1796 11.8811 10.2836 11.7531L11.7834 10.0386C11.9354 9.8649 12.0074 9.65916 11.9994 9.42142C11.9914 9.18368 11.9194 8.98709 11.7834 8.83164L10.2836 7.11716C10.1636 6.98 10.0276 6.8977 9.87561 6.87027C9.72363 6.84284 9.58364 6.86113 9.45565 6.92514C9.32767 6.98914 9.21968 7.0943 9.13169 7.2406C9.0437 7.3869 8.9997 7.54692 8.9997 7.72065V8.57104H7.49985C7.15588 8.57104 6.83192 8.48874 6.52795 8.32415C6.22398 8.15956 5.968 7.92182 5.76002 7.61093C5.58404 8.19614 5.33607 8.72191 5.0161 9.18825Z" fill="currentColor"></path></svg>
            <svg v-else data-v-fe52aa40="" width="12" height="12" viewBox="0 0 12 12" :fill="isInCompare ? 'currentColor' : 'none'" xmlns="http://www.w3.org/2000/svg"><path data-v-fe52aa40="" d="M0.00059994 9.42142C0.00059994 9.65916 0.0725927 9.8649 0.216578 10.0386C0.360564 10.2124 0.540546 10.2947 0.756524 10.2855H1.50045C2.0124 10.2855 2.50035 10.1712 2.9643 9.94262C3.42826 9.71402 3.82422 9.4077 4.15218 9.02366C4.48015 8.63962 4.74813 8.18242 4.9561 7.65207C5.16408 7.12173 5.26407 6.56852 5.25607 5.99246C5.25607 5.28838 5.47205 4.68488 5.90401 4.18196C6.33597 3.67905 6.86791 3.42759 7.49985 3.42759H8.9997V4.27797C8.9997 4.47 9.0477 4.63459 9.14369 4.77175C9.23968 4.9089 9.34766 5.00949 9.46765 5.07349C9.58764 5.1375 9.72763 5.15579 9.88761 5.12836C10.0476 5.10093 10.1796 5.0232 10.2836 4.89519L11.7834 3.18071C11.9354 2.99783 12.0074 2.79209 11.9994 2.56349C11.9914 2.3349 11.9194 2.13373 11.7834 1.96L10.2836 0.245514C10.1636 0.117499 10.0276 0.039776 9.87561 0.0123443C9.72363 -0.0150874 9.58364 0.00320038 9.45565 0.0672077C9.32767 0.131215 9.21968 0.231798 9.13169 0.368956C9.0437 0.506115 8.9997 0.666133 8.9997 0.849011V1.71311H7.49985C6.9959 1.71311 6.51195 1.82741 6.048 2.05601C5.58404 2.2846 5.18408 2.58635 4.84812 2.96125C4.51215 3.33615 4.24418 3.79335 4.0442 4.33284C3.84422 4.87233 3.74823 5.42553 3.75622 5.99246C3.75622 6.70568 3.53625 7.31375 3.09629 7.81667C2.65633 8.31958 2.12439 8.57104 1.50045 8.57104H0.756524C0.548545 8.57104 0.368563 8.65333 0.216578 8.81792C0.0645935 8.98251 -0.00739926 9.18368 0.00059994 9.42142ZM0.00059994 2.57721C0.00059994 2.81495 0.0725927 3.01612 0.216578 3.18071C0.360564 3.3453 0.540546 3.42759 0.756524 3.42759H1.50045C1.85241 3.42759 2.17638 3.51446 2.47235 3.68819C2.76832 3.86193 3.0283 4.09967 3.25227 4.40142C3.42026 3.81621 3.66823 3.29043 3.9962 2.82409C3.26827 2.08344 2.43636 1.71311 1.50045 1.71311H0.756524C0.548545 1.71311 0.368563 1.79998 0.216578 1.97371C0.0645935 2.14745 -0.00739926 2.34861 0.00059994 2.57721ZM5.0161 9.18825C5.72803 9.91976 6.55594 10.2855 7.49985 10.2855H8.9997V11.1496C8.9997 11.3325 9.0477 11.4971 9.14369 11.6434C9.23968 11.7897 9.34766 11.8903 9.46765 11.9451C9.58764 12 9.72763 12.0137 9.88761 11.9863C10.0476 11.9589 10.1796 11.8811 10.2836 11.7531L11.7834 10.0386C11.9354 9.8649 12.0074 9.65916 11.9994 9.42142C11.9914 9.18368 11.9194 8.98709 11.7834 8.83164L10.2836 7.11716C10.1636 6.98 10.0276 6.8977 9.87561 6.87027C9.72363 6.84284 9.58364 6.86113 9.45565 6.92514C9.32767 6.98914 9.21968 7.0943 9.13169 7.2406C9.0437 7.3869 8.9997 7.54692 8.9997 7.72065V8.57104H7.49985C7.15588 8.57104 6.83192 8.48874 6.52795 8.32415C6.22398 8.15956 5.968 7.92182 5.76002 7.61093C5.58404 8.19614 5.33607 8.72191 5.0161 9.18825Z" fill="currentColor"></path></svg>
          </button>
        </div>

        <!-- Promotions -->
        <div v-if="hasDiscount" class="promotion-banner">
          <span class="promo-text">{{ t('product.promo_1_plus_1') }}</span>
        </div>

        <!-- Product Disclaimer -->
        <div class="disclaimer-box">
          <strong>{{ t('product.disclaimer_title') }}</strong>
          <p>{{ t('product.disclaimer_original') }}</p>
          <p>{{ t('product.disclaimer_availability') }}:</p>
          <ul>
            <li>
              <p>{{ t('product.disclaimer_availability_1') }}</p>
            </li>
            <li>
              <p>{{ t('product.disclaimer_availability_2') }}</p>
            </li>
          </ul>
        </div>

        <!-- Payment Options -->
        <div class="payment-options ">
          <div class="payment-option">
            <div class="payment-option-container d-flex align-items-center justify-content-between ">

              <picture>
                <img src="https://gotawfeer.com/wp-content/uploads/2022/12/1-150x84.png" alt="">
              </picture>
              <div class="payment-logo">Tabby</div>
            </div>
            <div class="payment-text">{{ t('product.payment_installments') }}</div>
            <div class="payment-amount">{{ Math.round(finalPrice / 4) }} <img src="/images/Saudi_Riyal_Symbol.svg" alt="ر.س" class="currency-icon" /></div>
          </div>
          <div class="payment-option">
            <div class="payment-option-container d-flex align-items-center justify-content-between ">
          <picture>
              <img src="https://gotawfeer.com/wp-content/uploads/2022/12/3-150x84.png" alt="">
            </picture>
              <div class="payment-logo">تمارا</div>
            </div>
            <div class="payment-text">{{ t('product.payment_installments') }}</div>
            <div class="payment-amount">{{ Math.round(finalPrice / 4) }} <img src="/images/Saudi_Riyal_Symbol.svg" alt="ر.س" class="currency-icon" /></div>
          </div>
        </div>
        <div class="order-now border py-2 px-3 d-flex justify-content-between align-items-center mb-3 rounded-3 ">
          <div class="ship d-flex align-items-center gap-2">
            <i class="fa-solid fa-truck-fast"></i>
            <strong>{{ t('product.expected_delivery') }}</strong>
          </div>
          <div class="d-flex flex-column ">
            <p class="mb-3">{{ t('product.delivery_jeddah_makkah') }}</p>
            <p class="mb-3">{{ t('product.delivery_all_kingdom') }}</p>
          </div>
        </div>
        <div class="payment-image mt-4 mb-3 d-flex align-items-center gap-2">
          <strong>{{ t('product.payment_methods') }}:</strong>
          <div class="payment-image-container d-flex align-items-center gap-4">
            <picture>
              <img src="https://gotawfeer.com/wp-content/uploads/2022/12/4-150x84.png" alt="">
            </picture>
            <picture>
              <img src="https://gotawfeer.com/wp-content/uploads/2022/12/3-150x84.png" alt="">
            </picture>
            <picture>
              <img src="https://gotawfeer.com/wp-content/uploads/2022/12/2-150x84.png" alt="">
            </picture>
            <picture>
              <img src="https://gotawfeer.com/wp-content/uploads/2022/12/1-150x84.png" alt="">
            </picture>
            <picture>
              <img src="https://gotawfeer.com/wp-content/uploads/2022/12/5-150x84.png" alt="">
            </picture>
          </div>
        </div>
        <!-- Stock Status -->
        <div class="stock-status" :class="{ in: currentVariantStock, out: !currentVariantStock }">
          {{ currentVariantStock ? `${t('product.in_stock')} (${currentVariantStock} ${t('product.pieces')})` : t('product.out_of_stock') }}
        </div>
        <div class="offer-products mt-3">
          <h4>{{ t('product.offer_products') }}</h4>
          <div class="offer-products-container mt-4">
            <div v-if="offerProductsLoading" class="text-center py-4">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">جاري التحميل...</span>
              </div>
            </div>
            <template v-else-if="offerProducts.length > 0">
              <NuxtLink 
                v-for="(offerProduct, index) in offerProducts" 
                :key="offerProduct?.id || offerProduct?.product_id || index"
                :to="getLocalizedPath(`/product/${encodeURIComponent(String(offerProduct?.slug || offerProduct?.product?.slug || ''))}`)"
                class="offer-product-card d-flex align-items-center gap-2 my-4 text-decoration-none"
              >
                <picture>
                  <img :src="getProductImage(offerProduct) || placeholderImage" :alt="getProductTitle(offerProduct)" @error="onImgErr">
                </picture>
                <div class="offer-product-card-content">
                  <h6 class="text-black">{{ getProductTitle(offerProduct) }}</h6>
                  <div class="offer-product-card-price d-flex align-items-center gap-3">
                    <span class="price final text-black fw-bold ">{{ formatPrice(getProductPrice(offerProduct).final) }} <img src="/images/Group 1171274840.png" alt="ر.س" class="currency-icon" /></span>
                    <span v-if="getProductPrice(offerProduct).hasDiscount" class="price old">{{ formatPrice(getProductPrice(offerProduct).old) }} <img src="/images/Group 1171274840.png" alt="ر.س" class="currency-icon" /></span>
                  </div>
                </div>
              </NuxtLink>
            </template>
            <div v-else class="text-center py-4 text-muted">
              {{ t('product.no_products_available') }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Message -->
    <div v-if="showSuccessMessage" class="success-message">
      <div class="success-content">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>{{ successMessage }}</span>
      </div>
    </div>

    <!-- Product Details Tabs -->


    <!-- Recommended -->
    <div class="rec">
      <h2>{{ t('product.recommended_products') || 'منتجات موصى بها' }}</h2>
      
      <!-- Recommended Loading State -->
      <div v-if="recLoading" class="recommended-loading">
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <span class="loading-text">{{ t('loading') || 'جارٍ التحميل…' }}</span>
        </div>
        
        <!-- Skeleton Recommended Products -->
        <div class="skeleton-recommended">
          <div v-for="n in 6" :key="n" class="skeleton-recommended-card">
            <div class="skeleton-card-image"></div>
            <div class="skeleton-card-content">
              <div class="skeleton-card-title"></div>
              <div class="skeleton-card-price"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="recommended-swiper">
        <Swiper
          :modules="[Navigation]"
          :navigation="true"
          :loop="false"
          :breakpoints="{
            0: { slidesPerView: 2.2, spaceBetween: 10 },
            480: { slidesPerView: 4, spaceBetween: 12 },
            640: { slidesPerView: 5, spaceBetween: 12 },
            900: { slidesPerView: 6, spaceBetween: 14 },
            1200: { slidesPerView: 7, spaceBetween: 16 }
          }"
          class="recommended-swiper-container"
        >
          <SwiperSlide v-for="p in recommended" :key="p.id || p.slug" class="recommended-slide">
            <ProductCard :product="p" />
          </SwiperSlide>
        </Swiper>
      </div>
    </div>

    <!-- Revision -->
     <div class="revision-section mt-5">
        <div class="container">
          <h4 class="text-center">{{ t('product.customer_reviews') }}</h4>
          <div class="row">
            <div class="col-lg-6 mb-4 d-flex flex-column gap-4 ">
              <strong class="text-center mt-3">
                {{ t('product.reviews_count') }} ({{ totalReviewsCount }})
              </strong>
              <!-- Rating distribution (5 stars to 1 star) -->
              <div class="progress mt-2" role="progressbar" aria-label="5 stars" aria-valuenow="getRatingPercentage(5)" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" :style="`width: ${getRatingPercentage(5)}%`"></div>
                <span class="ms-2">{{ t('product.stars_5') }}</span>
              </div>
              <div class="progress" role="progressbar" aria-label="4 stars" aria-valuenow="getRatingPercentage(4)" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" :style="`width: ${getRatingPercentage(4)}%`"></div>
                <span class="ms-2">{{ t('product.stars_4') }}</span>
              </div>
              <div class="progress" role="progressbar" aria-label="3 stars" aria-valuenow="getRatingPercentage(3)" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" :style="`width: ${getRatingPercentage(3)}%`"></div>
                <span class="ms-2">{{ t('product.stars_3') }}</span>
              </div>
              <div class="progress" role="progressbar" aria-label="2 stars" aria-valuenow="getRatingPercentage(2)" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" :style="`width: ${getRatingPercentage(2)}%`"></div>
                <span class="ms-2">{{ t('product.stars_2') }}</span>
              </div>
              <div class="progress" role="progressbar" aria-label="1 star" aria-valuenow="getRatingPercentage(1)" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" :style="`width: ${getRatingPercentage(1)}%`"></div>
                <span class="ms-2">{{ t('product.stars_1') }}</span>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-container mt-3">
                <p v-if="totalReviewsCount === 0">{{ t('product.be_first_review') }} "{{ product?.name || product?.product_name || t('product.product') }}"
                </p>
                <p v-else>
                  {{ t('product.share_review') }} "{{ product?.name || product?.product_name || t('product.product') }}"
                </p>
                <p>
                  {{ t('product.email_not_published') }} <span class="text-danger">*</span>
                </p>
                <div v-if="guestReviewError" class="alert alert-danger" role="alert">
                  {{ guestReviewError }}
                </div>
                <div class="rating d-flex align-items-center gap-2">
                  <strong>{{ t('product.rating') }}:</strong>
                  <div class="rating-box d-flex align-items-center gap-2">
                    <i 
                      v-for="star in 5" 
                      :key="star"
                      class="fa-solid fa-star"
                      :class="{ open: star <= guestReviewForm.rating }"
                      @click="guestReviewForm.rating = star"
                      style="cursor: pointer;"
                    ></i>
                  </div>
                </div>
                <form @submit="submitGuestReview">
                  <div class="mb-3">
                    <label for="reviewComment" class="form-label">{{ t('product.your_review') }} <span class="text-danger">*</span></label>
                    <textarea 
                      v-model="guestReviewForm.comment" 
                      class="form-control" 
                      id="reviewComment" 
                      rows="3"
                      required
                    ></textarea>
                  </div>
                  <div class="mb-3">
                    <label for="reviewName" class="form-label">{{ t('product.name') }} <span class="text-danger">*</span></label>
                    <input 
                      v-model="guestReviewForm.name" 
                      type="text" 
                      class="form-control" 
                      id="reviewName"
                      required
                    >
                  </div>
                  <div class="mb-3">
                    <label for="reviewEmail" class="form-label">{{ t('product.email') }} <span class="text-danger">*</span></label>
                    <input 
                      v-model="guestReviewForm.email" 
                      type="email" 
                      class="form-control" 
                      id="reviewEmail" 
                      aria-describedby="emailHelp"
                      required
                    >
                  </div>
                  <div class="mb-3 form-check d-flex align-items-center gap-2">
                    <input type="checkbox" class="form-check-input" id="exampleCheck1">
                    <label class="form-check-label" for="exampleCheck1">{{ t('product.save_info') }}</label>
                  </div>
                  <button type="submit" class="main-btn border-0" :disabled="guestReviewLoading">
                    <span v-if="guestReviewLoading">{{ t('product.sending_review') }}</span>
                    <span v-else>{{ t('product.submit') }}</span>
                  </button>
              </form>
              </div>
            </div>
          </div>
          
          <!-- Reviews List -->
          <div v-if="reviews.length > 0" class="reviews-list mt-5">
            <h5 class="mb-4">{{ t('product.reviews_count') }} ({{ totalReviewsCount }})</h5>
            <div v-if="reviewsLoading" class="text-center py-4">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">جاري التحميل...</span>
              </div>
            </div>
            <div v-else class="reviews-container">
              <div 
                v-for="(review, index) in reviews" 
                :key="review?.id || review?.review_id || index"
                class="review-item mb-4 p-3 border rounded"
              >
                <div class="review-header d-flex justify-content-between align-items-start mb-2">
                  <div class="review-author">
                    <strong class="d-block">{{ review?.name || review?.user?.name || review?.customer?.name || 'مستخدم' }}</strong>
                    <small class="text-muted">
                      {{ formatDate(review?.created_at || review?.date || review?.created_date) }}
                    </small>
                  </div>
                  <div class="review-rating d-flex align-items-center gap-1">
                    <span v-for="star in 5" :key="star" class="star-rating">
                      <i 
                        class="fa-solid fa-star"
                        :class="{ 'open': star <= (review?.rating || review?.stars || 0) }"
                      ></i>
                    </span>
                  </div>
                </div>
                <div class="review-content mt-3">
                  <p>{{ review?.comment || review?.review || review?.text || 'لا يوجد تعليق' }}</p>
                </div>
                <div v-if="review?.reply || review?.response" class="review-reply mt-3 p-3 bg-light rounded">
                  <div class="reply-header mb-2">
                    <strong class="text-primary">{{ t('product.vendor_reply') }}:</strong>
                  </div>
                  <p class="mb-0">{{ review?.reply || review?.response }}</p>
                </div>
                <div class="review-actions mt-3 d-flex align-items-center gap-3">
                  <button 
                    class="btn btn-sm btn-outline-primary"
                    @click="likeReview(review?.id || review?.review_id)"
                    :disabled="reviewLoading"
                  >
                    <i class="fa-solid fa-thumbs-up"></i>
                    <span class="ms-1">{{ review?.likes_count || review?.likes || 0 }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="!reviewsLoading" class="text-center py-5 text-muted">
            <p>{{ t('product.no_reviews_yet') }}</p>
          </div>
        </div>
     </div>

    <!-- Login Modal -->
    <teleport to="body">
      <div v-if="showLoginModal" class="login-overlay" @click.self="closeLoginModal">
        <div class="login-modal" dir="rtl">
          <div class="login-header">
            <h2>{{ t('login') || 'تسجيل الدخول' }}</h2>
            <button class="close-btn" @click="closeLoginModal">
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
            </button>
          </div>
          
          <!-- OTP Login -->
          <form @submit.prevent="handleOtpLogin" class="login-form">
            <div class="form-group">
              <label for="phone">{{ t('taqnyat.phone') || 'رقم الهاتف' }}</label>
              <input 
                id="phone"
                v-model="otpForm.phone" 
                type="tel" 
                :placeholder="t('taqnyat.phone_placeholder') || '05xxxxxxxx'"
                required
                :disabled="taqnyatAuth.requestingOtp.value || taqnyatAuth.verifyingOtp.value || otpSent"
              />
            </div>
            
            <div v-if="otpSent" class="form-group">
              <label for="otp">{{ t('taqnyat.otp_code') || 'رمز التحقق' }}</label>
              <input 
                id="otp"
                v-model="otpForm.otp" 
                type="text" 
                :placeholder="t('taqnyat.otp_placeholder') || 'أدخل رمز التحقق'"
                required
                maxlength="6"
                :disabled="taqnyatAuth.verifyingOtp.value"
              />
            </div>
            
            <div v-if="taqnyatAuth.error.value" class="error-message">
              {{ taqnyatAuth.error.value }}
            </div>
            
            <div v-if="taqnyatAuth.success.value" class="success-message">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              {{ taqnyatAuth.success.value }}
            </div>
            
            <div v-if="!otpSent">
              <button 
                type="button" 
                class="login-btn" 
                style="width: 100%;" 
                :disabled="taqnyatAuth.requestingOtp.value || !otpForm.phone"
                @click="handleRequestOtp"
              >
                <span v-if="taqnyatAuth.requestingOtp.value">{{ t('loading') || 'جاري التحميل...' }}</span>
                <span v-else>{{ t('taqnyat.send_otp') || 'إرسال رمز التحقق' }}</span>
              </button>
            </div>

            <div v-else>
              <button 
                type="submit" 
                class="login-btn" 
                style="width: 100%;margin-bottom: 10px;" 
                :disabled="taqnyatAuth.verifyingOtp.value || !otpForm.otp"
              >
                <span v-if="taqnyatAuth.verifyingOtp.value">{{ t('loading') || 'جاري التحميل...' }}</span>
                <span v-else>{{ t('taqnyat.verify') || 'التحقق وتسجيل الدخول' }}</span>
              </button>

              <button 
                type="button" 
                class="resend-btn" 
                style="width: 100%;background: transparent;color: #232323;padding: 10px;border-radius: 10px;border: 1px solid #232323;" 
                :disabled="taqnyatAuth.resendingOtp.value || otpCountdown > 0"
                @click="handleResendOtp"
              >
                <span v-if="taqnyatAuth.resendingOtp.value">{{ t('loading') || 'جاري التحميل...' }}</span>
                <span v-else-if="otpCountdown > 0">{{ t('taqnyat.resend_in') || 'إعادة الإرسال خلال' }} {{ otpCountdown }} {{ t('taqnyat.seconds') || 'ثانية' }}</span>
                <span v-else>{{ t('taqnyat.resend_otp') || 'إعادة إرسال رمز التحقق' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </teleport>

    <!-- Register Modal -->
    <teleport to="body">
      <div v-if="showRegisterModal" class="login-overlay" @click.self="closeRegisterModal">
        <div class="login-modal" dir="rtl">
          <div class="login-header">
            <h2>{{ t('register') || 'إنشاء حساب جديد' }}</h2>
            <button class="close-btn" @click="closeRegisterModal">
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
            </button>
          </div>
          
          <form @submit.prevent="handleRegisterSubmit" class="login-form">
            <div class="form-row">
              <div class="form-group">
                <label for="f_name">{{ t('first_name') || 'الاسم الأول' }} *</label>
                <input 
                  id="f_name" 
                  v-model="registerForm.f_name" 
                  type="text" 
                  :placeholder="t('first_name') || 'الاسم الأول'" 
                  required 
                  :disabled="registerLoading" 
                />
              </div>
              <div class="form-group">
                <label for="l_name">{{ t('last_name') || 'الاسم الأخير' }} *</label>
                <input 
                  id="l_name" 
                  v-model="registerForm.l_name" 
                  type="text" 
                  :placeholder="t('last_name') || 'الاسم الأخير'" 
                  required 
                  :disabled="registerLoading" 
                />
              </div>
            </div>

            <div class="form-group">
              <label for="register_email">{{ t('email') || 'البريد الإلكتروني' }} *</label>
              <input 
                id="register_email" 
                v-model="registerForm.email" 
                type="email" 
                :placeholder="t('email') || 'البريد الإلكتروني'" 
                required 
                :disabled="registerLoading" 
              />
            </div>

            <div class="form-group">
              <label for="register_phone">{{ t('phone') || 'رقم الهاتف' }} *</label>
              <input 
                id="register_phone" 
                v-model="registerForm.phone" 
                type="tel" 
                :placeholder="t('phone') || 'رقم الهاتف'" 
                required 
                :disabled="registerLoading" 
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="register_password">{{ t('password') || 'كلمة المرور' }} *</label>
                <input 
                  id="register_password" 
                  v-model="registerForm.password" 
                  type="password" 
                  :placeholder="t('password') || 'كلمة المرور'" 
                  required 
                  :disabled="registerLoading" 
                />
              </div>
              <div class="form-group">
                <label for="password_confirmation">{{ t('confirm_password') || 'تأكيد كلمة المرور' }} *</label>
                <input 
                  id="password_confirmation" 
                  v-model="registerForm.password_confirmation" 
                  type="password" 
                  :placeholder="t('confirm_password') || 'تأكيد كلمة المرور'" 
                  required 
                  :disabled="registerLoading" 
                />
              </div>
            </div>

            <div class="form-group">
              <label for="referral_code">{{ t('referral_code') || 'كود الإحالة' }} ({{ t('optional') || 'اختياري' }})</label>
              <input 
                id="referral_code" 
                v-model="registerForm.referral_code" 
                type="text" 
                :placeholder="t('referral_code') || 'كود الإحالة'" 
                :disabled="registerLoading" 
              />
            </div>

            <div v-if="registerError" class="error-message">
              {{ registerError }}
            </div>

            <button type="submit" class="login-btn" :disabled="registerLoading">
              <span v-if="registerLoading">{{ t('creating_account') || 'جاري إنشاء الحساب...' }}</span>
              <span v-else>{{ t('register') || 'إنشاء حساب' }}</span>
            </button>
          </form>
          
          <div class="login-footer">
            <p>{{ t('have_account') || 'لديك حساب بالفعل؟' }} <a href="#" @click.prevent="showLoginModal = true; closeRegisterModal()">{{ t('login') || 'تسجيل الدخول' }}</a></p>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Review Modal -->
    <teleport to="body">
      <div v-if="showReviewModal" class="review-overlay" @click.self="closeReviewModal">
        <div class="review-modal" dir="rtl">
          <div class="review-header">
            <h2>{{ t('product.write_review') || 'اكتب تقييمك' }}</h2>
            <button class="close-btn" @click="closeReviewModal">
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
            </button>
          </div>
          
          <form @submit.prevent="submitReview" class="review-form">
            <div class="form-group">
              <label>{{ t('product.your_rating') || 'تقييمك' }}</label>
              <div class="rating-input">
                <span 
                  v-for="i in 5" 
                  :key="i" 
                  class="star-input" 
                  :class="{ filled: i <= reviewForm.rating }"
                  @click="reviewForm.rating = i"
                >
                  ★
                </span>
              </div>
            </div>
            
            <div class="form-group">
              <label for="comment">{{ t('product.your_comment') || 'تعليقك' }}</label>
              <textarea 
                id="comment"
                v-model="reviewForm.comment" 
                :placeholder="t('product.write_comment_placeholder') || 'اكتب تعليقك عن المنتج...'"
                rows="4"
                required
                :disabled="reviewLoading"
              ></textarea>
            </div>
            
            <div v-if="reviewError" class="error-message">
              {{ reviewError }}
            </div>
            
            <button type="submit" class="submit-btn" :disabled="reviewLoading">
              <span v-if="reviewLoading">{{ t('product.sending') || 'جاري الإرسال...' }}</span>
              <span v-else>{{ t('product.submit_review') || 'إرسال التقييم' }}</span>
            </button>
          </form>
        </div>
      </div>
    </teleport>

    <!-- Reply Modal -->
    <teleport to="body">
      <div v-if="showReplyModal" class="reply-overlay" @click.self="closeReplyModal">
        <div class="reply-modal" dir="rtl">
          <div class="reply-header">
            <h2>{{ t('product.add_reply') || 'أضف رد' }}</h2>
            <button class="close-btn" @click="closeReplyModal">
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
            </button>
          </div>
          
          <form @submit.prevent="submitReply" class="reply-form">
            <div class="form-group">
              <label for="reply-text">{{ t('product.your_reply') || 'ردك' }}</label>
              <textarea 
                id="reply-text"
                v-model="replyText" 
                :placeholder="t('product.write_reply_placeholder') || 'اكتب ردك...'"
                rows="4"
                required
                :disabled="replyLoading"
              ></textarea>
            </div>
            
            <div v-if="replyError" class="error-message">
              {{ replyError }}
            </div>
            
            <button type="submit" class="submit-btn" :disabled="replyLoading">
              <span v-if="replyLoading">{{ t('product.sending') || 'جاري الإرسال...' }}</span>
              <span v-else>{{ t('product.submit_reply') || 'إرسال الرد' }}</span>
            </button>
          </form>
        </div>
      </div>
    </teleport>
  </div>

  
  <!-- Product Modal -->
  <div class="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-products">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
        <div class="modal-body">
          <div v-if="selectedProductForModal" class="row">
            <div class="col-lg-6 mb-3">
              <picture>
                <img class="mw-100 pic-img" :src="modalProductImage || placeholderImage" :alt="modalProductTitle" @error="onImgErr">
              </picture>
    </div>
            <div class="col-lg-6">
              <div class="product-content-popup">
                <h5>{{ modalProductTitle }}</h5>
                <div v-if="modalProductBrand.name" class="brands-popup d-flex align-items-center gap-2 mt-2 mb-2">
                  <strong class="me-2">{{ t('product.brand') }}:</strong>
                  <NuxtLink :to="modalProductBrand.id ? getLocalizedPath(`/brand/${modalProductBrand.id}`) : '#'" class="text-decoration-none d-flex align-items-center gap-2">
                    <picture>
                      <img class="cover-image-class" :src="modalProductBrand.image" :alt="modalProductBrand.name" @error="(e: any) => { e.target.src = '/images/Group 1171274840.png' }">
                    </picture>
                  </NuxtLink>
                </div>
                <h5 class="price final mt-3">
                  {{ formatPrice(modalProductPrice.final) }} 
                  <img src="/images/Group 1171274840.png" alt="ر.س" class="currency-icon" />
                </h5>
              </div>
              <div class="buttons d-flex align-items-center gap-2">
                <template v-if="hasProductOptions">
                  <NuxtLink :to="modalProductLink" class="main-btn" @click="handleProductDetails">{{ t('product.select_options') }}</NuxtLink>
                </template>
                <template v-else>
                  <a href="#" class="main-btn" @click.prevent="handleModalAddToCart" :disabled="isAddingToCart">
                    <span v-if="!isAddingToCart">{{ t('product.add_to_cart') }}</span>
                    <span v-else class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  </a>
                </template>
                <NuxtLink :to="modalProductLink" class="second-btn" @click="handleProductDetails">{{ t('product.product_details') }}</NuxtLink>
              </div>
              <div v-if="modalProductCategories.length > 0" class="cat border-top mt-3 pt-3">
                <strong class="d-block mb-2">{{ t('product.categories') }}:</strong>
                <ul class="d-flex align-items-center gap-2 p-0 m-0 list-unstyled flex-wrap">
                  <li v-for="(cat, index) in modalProductCategories" :key="index">
                    <NuxtLink class="text-decoration-none category-badge" :to="getLocalizedPath(`/category/${cat.id}`)">
                      {{ cat.name }}
                    </NuxtLink>
                  </li>
                </ul>
              </div>
              <strong class="mt-4 mb-2 d-block">{{ t('product.share') }}</strong>
              <div class="share d-flex align-items-center gap-2">
                <a href="#" class="text-decoration-none" @click.prevent="shareOnFacebook">
                  <i class="fa-brands fa-facebook"></i>
                </a>
                <a href="#" class="text-decoration-none" @click.prevent="shareOnTelegram">
                  <i class="fa-brands fa-telegram"></i>
                </a>
                <a href="#" class="text-decoration-none" @click.prevent="shareOnSnapchat">
                  <i class="fa-brands fa-square-snapchat"></i>
                </a>
                <a href="#" class="text-decoration-none" @click.prevent="shareOnLinkedIn">
                  <i class="fa-brands fa-linkedin"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .wrap{ padding:20px; max-width:1400px; margin:0 auto }
  .crumbs{ display:flex; align-items:center; gap:8px; color:#6b7280; margin-bottom:20px; font-size:14px }
  .crumbs a{ color:#6b7280; text-decoration:none }
  .crumbs a:hover{ color:#2563eb }
  .loader,.error{ padding:20px; background:#fafafa; border:1px solid #eee; border-radius:12px; text-align:center }

  /* Product Loading States */
  .product-loading {
    padding: 40px 0;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    margin-bottom: 40px;
  }

  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f4f6;
    border-top: 4px solid #F58040;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-progress {
    width: 300px;
    height: 6px;
    background: #f3f4f6;
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #F58040, #ff6b35);
    border-radius: 3px;
    transition: width 0.3s ease;
    position: relative;
  }

  .progress-bar::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    animation: progress-shimmer 1.5s infinite;
  }

  .loading-text {
    font-size: 16px;
    color: #6b7280;
    font-weight: 500;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes progress-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  /* Skeleton Product Layout */
  .skeleton-product {
    display: flex;
    gap: 40px;
    margin-bottom: 40px;
  }

  .skeleton-gallery {
    flex: 1;
    max-width: 50%;
  }

  .skeleton-main-image {
    width: 100%;
    height: 400px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 16px;
    margin-bottom: 12px;
  }

  .skeleton-thumbnails {
    display: flex;
    gap: 10px;
  }

  .skeleton-thumbnail {
    width: 60px;
    height: 60px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 8px;
  }

  .skeleton-info {
    flex: 1;
    max-width: 50%;
    padding: 0 20px;
  }

  .skeleton-brand {
    width: 120px;
    height: 20px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 4px;
    margin-bottom: 12px;
  }

  .skeleton-title {
    width: 80%;
    height: 32px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .skeleton-rating {
    width: 150px;
    height: 20px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .skeleton-price {
    width: 200px;
    height: 36px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 4px;
    margin-bottom: 24px;
  }

  .skeleton-variants {
    margin-bottom: 24px;
  }

  .skeleton-color-options {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  .skeleton-color {
    width: 60px;
    height: 60px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 12px;
  }

  .skeleton-size-options {
    display: flex;
    gap: 10px;
  }

  .skeleton-size {
    width: 60px;
    height: 40px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 8px;
  }

  .skeleton-add-to-cart {
    width: 100%;
    height: 48px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 8px;
  }

  @keyframes skeleton-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* Recommended Loading */
  .recommended-loading {
    margin-top: 20px;
  }

  .skeleton-recommended {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 20px;
  }

  .skeleton-recommended-card {
    background: white;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }

  .skeleton-card-image {
    width: 100%;
    height: 200px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .skeleton-card-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .skeleton-card-title {
    height: 20px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 4px;
    width: 80%;
  }

  .skeleton-card-price {
    height: 16px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 4px;
    width: 60%;
  }

  @keyframes skeleton-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  /* Responsive Skeleton */
  @media (max-width: 768px) {
    .skeleton-product {
      flex-direction: column;
      gap: 20px;
    }

    .skeleton-gallery,
    .skeleton-info {
      max-width: 100%;
    }

    .skeleton-main-image {
      height: 300px;
    }

    .skeleton-thumbnail {
      width: 50px;
      height: 50px;
    }
  }

  /* Product Layout */
  .product{ display:flex; margin-bottom:40px }
  .product .gallery {width: 50%;}
  @media (max-width: 900px){ .product{ grid-template-columns: 1fr; gap:20px } }

  /* Gallery */
  .gallery{ margin-bottom:20px }
  .no-images{ 
    background:#fafafa; 
    border:1px solid #eee; 
    border-radius:16px; 
    min-height:400px;
    display:flex;
    align-items:center;
    justify-content:center;
  }
  .no-images-content{ 
    text-align:center; 
    color:#9ca3af;
  }
  .no-images-content svg{ 
    margin-bottom:12px; 
    opacity:0.5;
  }
  .no-images-content p{ 
    margin:0; 
    font-size:16px;
  }

  .gallery-container {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .thumbnail-swiper-container {
    flex-shrink: 0;
    width: 80px;
  }

  .main-swiper-container {
    flex: 1;
    min-width: 0;
  }

  .mySwiper2{ 
    background:#fafafa; 
    border:1px solid #eee; 
    border-radius:16px; 
    overflow:hidden; 
    margin-bottom:12px;
    min-height:400px;
  }
  .mySwiper2 img{ 
    width:100%; 
    height:100%; 
    object-fit:contain; 
    max-height:400px;
    display:block;
    transition:opacity 0.3s ease, transform 0.3s ease;
  }
  .mySwiper2 .swiper-slide{ 
    transition:opacity 0.3s ease, transform 0.3s ease;
  }
  .image-container{ 
    position:relative; 
    width:100%; 
    height:100%;
  }
  .image-loading{ 
    position:absolute; 
    top:0; 
    left:0; 
    right:0; 
    bottom:0; 
    background:rgba(255,255,255,0.9); 
    display:flex; 
    flex-direction:column; 
    align-items:center; 
    justify-content:center; 
    z-index:10;
    border-radius:12px;
  }
  .loading-spinner{ 
    width:32px; 
    height:32px; 
    border:3px solid #e5e7eb; 
    border-top:3px solid #2563eb; 
    border-radius:50%; 
    animation:spin 1s linear infinite; 
    margin-bottom:8px;
  }
  .image-loading span{ 
    font-size:12px; 
    color:#6b7280; 
    font-weight:500;
  }
  @keyframes spin{ 
    0%{ transform:rotate(0deg); } 
    100%{ transform:rotate(360deg); } 
  }
  .mySwiper{ 
    height:400px;
    box-sizing:border-box; 
    padding:0;
    width: 100%;
  }
  .thumbnail-image-wrapper {
    width: 100%;
    height: 100%;
    padding: 4px;
    border-radius: 8px;
    border: 2px solid #eee;
    transition: all 0.2s ease;
    cursor: pointer;
    background: #fff;
  }
  .thumbnail-image-wrapper:hover {
    border-color: #F58040;
  }
  .mySwiper .swiper-slide-thumb-active .thumbnail-image-wrapper {
    border-color: #F58040;
    box-shadow: 0 0 0 2px rgba(245, 128, 64, 0.2);
  }
  .mySwiper img{ 
    width:100%; 
    height:100%; 
    object-fit:cover; 
    border-radius:6px;
    display: block;
  }
  .mySwiper .swiper-slide{ 
    width: 100% !important; 
    height: 80px !important; 
    margin-bottom: 10px;
    cursor:pointer;
  }
  .mySwiper .swiper-slide:last-child {
    margin-bottom: 0;
  }

  /* Responsive Swiper Gallery */
  @media (max-width: 768px) {
    .gallery ,.info {
      width: 100% !important;
    }
    .product {
      flex-direction: column;
    }
    .gallery-container {
      flex-direction: column;
    }
    .thumbnail-swiper-container {
      width: 100%;
      order: 2;
    }
    .main-swiper-container {
      order: 1;
      width: 100%;
    }
    .mySwiper2{ 
      min-height:300px;
    }
    .mySwiper2 img{ 
      max-height:300px;
    }
    .mySwiper{ 
      height: auto;
      max-height: 100px;
      display: flex;
      flex-direction: row;
      overflow-x: auto;
    }
    .mySwiper .swiper-slide{ 
      width: 80px !important; 
      height: 80px !important; 
      margin-bottom: 8px;
    }
  }

  /* Product Info */
  .info{ padding:0 20px;width: 50%; }
  .brand-section{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px }
  .brand-info{ display:flex; align-items:center; gap:12px }
  .brand{ font-size:18px; font-weight:600; color:#6b7280 }
  .original-badge{ background:#e5f7e5; color:#16a34a; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600 }
  .wishlist-btn{ 
    background:#fff; 
    border:2px solid #e5e7eb; 
    cursor:pointer; 
    color:#6b7280; 
    transition:all 0.3s ease;
    padding: 12px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
  }
  .wishlist-btn:hover{ 
    color:#ef4444; 
    background: rgba(239, 68, 68, 0.1);
    border-color: #ef4444;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
  }
  .wishlist-btn.active {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    border-color: #ef4444;
  }
  .wishlist-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  /* Wishlist button in add-to-cart section */
  .add-to-cart-section .wishlist-btn {
    width: 48px;
    height: 48px;
    padding: 12px;
  }
  
  /* Compare button */
  .compare-btn{ 
    background:#fff; 
    border:2px solid #e5e7eb; 
    cursor:pointer; 
    color:#6b7280; 
    transition:all 0.3s ease;
    padding: 12px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
  }
  .compare-btn:hover{ 
    color:#2563eb; 
    background: rgba(37, 99, 235, 0.1);
    border-color: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
  }
  .compare-btn.active {
    color: #2563eb;
    background: rgba(37, 99, 235, 0.1);
    border-color: #2563eb;
  }
  .compare-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  /* Compare button in add-to-cart section */
  .add-to-cart-section .compare-btn {
    width: 48px;
    height: 48px;
    padding: 12px;
  }
  .wishlist-btn .spinner {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .title{ font-size:24px; font-weight:700; color:#111827; margin:0 0 12px; line-height:1.3 }

  .product-sku{ 
    display:flex; 
    align-items:center; 
    gap:8px; 
    margin-bottom:16px; 
    padding:8px 12px; 
    background:#f9fafb; 
    border-radius:6px; 
    border:1px solid #e5e7eb;
    font-size:14px;
  }
  .sku-label{ 
    color:#6b7280; 
    font-weight:500;
  }
  .sku-value{ 
    color:#111827; 
    font-weight:600; 
    font-family:monospace;
    letter-spacing:0.5px;
  }

  .rating-section{ display:flex; align-items:center; gap:8px; margin-bottom:16px }
  .stars{ display:flex; gap:2px }
  .star{ color:#d1d5db; font-size:16px }
  .star.filled{ color:#f59e0b }
  .rating-text{ color:#6b7280; font-size:14px }

  .price-section{ display:flex; align-items:center; gap:12px; margin-bottom:16px }
  .price-main{ font-size:28px; font-weight:700; color:#111827 }
  .price-old{ font-size:18px; color:#9ca3af; text-decoration:line-through }
  .discount-badge{ background:#ef4444; color:#fff; padding:4px 8px; border-radius:6px; font-size:14px; font-weight:600 }

  .promotion-banner{ background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:8px 12px; margin-bottom:16px; text-align:center }
  .promo-text{ color:#dc2626; font-weight:600; font-size:14px }

  .disclaimer-box{ background:#fef7f7; border:1px solid #fed7d7; border-radius:8px; padding:12px; margin-bottom:20px }
  .disclaimer-box p{ margin:0 0 4px; font-size:12px; color:#7f1d1d }
  .disclaimer-box p:last-child{ margin-bottom:0 }

  .payment-options{ display:flex; gap:12px; margin-bottom:20px }
  .payment-option{ flex:1; border:1px solid #e5e7eb; border-radius:8px; padding:12px; background:#fff; cursor:pointer; transition:all 0.2s }
  .payment-option:hover{ border-color:#2563eb; box-shadow:0 0 0 2px rgba(37, 99, 235, 0.1) }
  .payment-logo{ font-weight:600; color:#111827; margin-bottom:4px }
  .payment-text{ font-size:12px; color:#6b7280; margin-bottom:4px }
  .payment-amount{ font-weight:600; color:#111827 }
  
  .currency-icon {
    width: 16px;
    height: 16px;
    margin-right: 2px;
    vertical-align: middle;
    display: inline-block;
  }

  .add-to-cart-section{ display:flex; gap:12px; align-items:center; margin-bottom:16px }
  .qty-selector{ display:flex; align-items:center; gap:12px; border:1px solid #e5e7eb; border-radius:8px; background:#fff; padding:4px }
  .qty-btn{ width:36px; height:36px; border:none; background:#f9fafb; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:600; color:#6b7280; border-radius:6px }
  .qty-btn:hover{ background:#f3f4f6 }
  .qty-btn:disabled{ opacity:0.5; cursor:not-allowed }
  .qty-input{ width:60px; height:36px; border:none; text-align:center; font-size:16px; font-weight:600; outline:none }
  .qty-price{ display:flex; align-items:center; gap:6px; margin-inline-start:auto; padding-inline-start:12px; border-inline-start:1px solid #e5e7eb }
  .qty-price-label{ font-size:14px; color:#6b7280; font-weight:500 }
  .qty-price-value{ font-size:16px; color:#111827; font-weight:700 }
  .qty-price .currency-icon{ width:16px; height:16px; object-fit:contain }
  .add-to-cart-btn{ 
    flex:1; 
    background:linear-gradient(135deg, #111827, #374151); 
    color:#fff; 
    border:none; 
    border-radius:8px; 
    padding:12px 20px; 
    font-size:16px; 
    font-weight:600; 
    cursor:pointer; 
    transition:all 0.3s ease;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    position:relative;
    overflow:hidden;
  }
  .add-to-cart-btn:hover:not(:disabled){ 
    background:linear-gradient(135deg, #374151, #4b5563);
    transform:translateY(-1px);
    box-shadow:0 4px 12px rgba(17, 24, 39, 0.3);
  }
  .add-to-cart-btn:disabled{ 
    background:#9ca3af; 
    cursor:not-allowed;
    transform:none;
    box-shadow:none;
  }
  .add-to-cart-btn .spinner{ 
    animation:spin 1s linear infinite;
  }
  .add-to-cart-btn svg{ 
    flex-shrink:0;
  }
  .add-to-cart-btn span{ 
    font-weight:600;
  }

  .stock-status{ font-weight:600; font-size:14px }
  .stock-status.in{ color:#16a34a }
  .stock-status.out{ color:#ef4444 }

  /* Variant Selection */
  .variant-section{ 
    margin-bottom:24px; 
    padding:20px; 
    background:#fafafa; 
    border-radius:12px; 
    border:1px solid #e5e7eb;
  }
  .variant-title-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .variant-title{ 
    font-size:16px; 
    font-weight:600; 
    color:#111827; 
    margin:0;
    display:flex; 
    align-items:center; 
    gap:8px;
  }
  .variant-title svg{ 
    color:#2563eb; 
    flex-shrink:0;
  }
  .clear-color-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    color: #6b7280;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .clear-color-btn:hover {
    background: #ef4444;
    border-color: #ef4444;
    color: #fff;
  }
  .clear-color-btn svg {
    width: 14px;
    height: 14px;
  }
  
  .color-options{ 
    display:flex; 
    gap:12px; 
    flex-wrap:wrap; 
  }
  .color-option-wrapper{ 
    position:relative; 
    transition:all 0.3s ease;
  }
  .color-option-wrapper.active{ 
    transform:translateY(-2px);
  }
  .color-option{ 
    width:35px; 
    height:35px; 
    border:3px solid #e5e7eb; 
    border-radius:50%; 
    cursor:pointer; 
    position:relative; 
    transition:all 0.3s ease;
    display:flex;
    flex-direction:column;
    align-items:center;
    background-repeat: no-repeat;
    overflow: hidden;
    justify-content:center;
    overflow:hidden;
    background:#fff;
    box-shadow:0 2px 8px rgba(0,0,0,0.1);
  }
  .color-option:hover{ 
    border-color:#2563eb; 
    transform:scale(1.05);
    box-shadow:0 4px 16px rgba(37, 99, 235, 0.2);
  }
  .color-option.active{ 
    border-color:#2563eb; 
    box-shadow:0 0 0 3px rgba(37, 99, 235, 0.2);
    transform:scale(1.05);
  }
  .color-image{ 
    width:100%; 
    height:100%; 
    border-radius:8px; 
    overflow:hidden;
  }
  .color-image img{ 
    width:100%; 
    height:100%; 
    object-fit:cover;
  }
  .color-circle{ 
    width:32px; 
    height:32px; 
    border-radius:50%; 
    border:2px solid rgba(255,255,255,0.3);
  }
  .color-placeholder {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
    border-radius: 50%;
    color: #9ca3af;
    flex-shrink: 0;
  }
  .color-name{ 
    font-size:10px; 
    color:#111827; 
    font-weight:600; 
    margin-top:4px; 
    text-align:center;
    background:rgba(255,255,255,0.9);
    padding:2px 4px;
    border-radius:4px;
    backdrop-filter:blur(4px);
  }
  
  .size-options{ 
    display:flex; 
    gap:10px; 
    flex-wrap:wrap; 
  }
  .size-option{ 
    padding:12px 20px; 
    border:2px solid #e5e7eb; 
    border-radius:8px; 
    background:#fff; 
    cursor:pointer; 
    font-size:14px; 
    font-weight:600; 
    color:#6b7280; 
    transition:all 0.3s ease;
    position:relative;
    min-width:50px;
    text-align:center;
    box-shadow:0 2px 4px rgba(0,0,0,0.05);
  }
  .size-option:hover:not(:disabled){ 
    border-color:#2563eb; 
    color:#111827;
    transform:translateY(-2px);
    box-shadow:0 4px 12px rgba(37, 99, 235, 0.15);
  }
  .size-option.active{ 
    border-color:#2563eb; 
    background:linear-gradient(135deg, #2563eb, #3b82f6); 
    color:#fff;
    transform:translateY(-2px);
    box-shadow:0 4px 16px rgba(37, 99, 235, 0.3);
  }
  .size-option.unavailable{ 
    opacity:0.4; 
    cursor:not-allowed; 
    background:#f9fafb;
    border-color:#d1d5db;
  }
  .size-option:disabled{ 
    cursor:not-allowed;
  }
  .size-value{ 
    display:block; 
    font-weight:600;
  }
  .unavailable-text{ 
    font-size:10px; 
    color:#ef4444; 
    display:block; 
    margin-top:2px;
  }
  
  .variant-info{ 
    background:linear-gradient(135deg, #f8fafc, #f1f5f9); 
    border:2px solid #e2e8f0; 
    border-radius:12px; 
    padding:20px; 
    margin-bottom:24px;
    box-shadow:0 4px 12px rgba(0,0,0,0.05);
  }
  .variant-header{ 
    display:flex; 
    align-items:center; 
    gap:8px; 
    margin-bottom:16px; 
    font-weight:600; 
    color:#111827; 
    font-size:16px;
  }
  .variant-header svg{ 
    color:#10b981; 
    flex-shrink:0;
  }
  .variant-details{ 
    display:grid; 
    grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); 
    gap:12px;
  }
  .variant-type, 
  .variant-sku, 
  .variant-price, 
  .variant-stock{ 
    display:flex; 
    justify-content:space-between; 
    align-items:center; 
    padding:8px 12px; 
    background:#fff; 
    border-radius:8px; 
    border:1px solid #e5e7eb;
  }
  .label{ 
    font-weight:500; 
    color:#6b7280; 
    font-size:13px;
  }
  .value{ 
    font-weight:600; 
    color:#111827; 
    font-size:14px;
  }
  .variant-stock .value.low{ 
    color:#ef4444; 
    font-weight:700;
  }

  /* Success Message */
  .success-message{ 
    position:fixed; 
    top:20px; 
    right:20px; 
    z-index:1000; 
    animation:slideInRight 0.3s ease;
  }
  .success-content{ 
    background:linear-gradient(135deg, #10b981, #059669); 
    color:#fff; 
    padding:12px 20px; 
    border-radius:8px; 
    box-shadow:0 4px 12px rgba(16, 185, 129, 0.3); 
    display:flex; 
    align-items:center; 
    gap:8px; 
    font-weight:500; 
    font-size:14px;
  }
  .success-content svg{ 
    flex-shrink:0; 
    color:#fff;
  }
  @keyframes slideInRight{ 
    from{ 
      transform:translateX(100%); 
      opacity:0; 
    } 
    to{ 
      transform:translateX(0); 
      opacity:1; 
    } 
  }

  /* Product Details Tabs */
  .product-details{ margin-top:40px; border-top:1px solid #e5e7eb; padding-top:20px }
  .tabs{ display:flex; border-bottom:1px solid #e5e7eb; margin-bottom:20px }
  .tab{ background:none; border:none; padding:12px 20px; cursor:pointer; font-size:14px; font-weight:500; color:#6b7280; border-bottom:2px solid transparent; transition:all 0.2s }
  .tab:hover{ color:#111827 }
  .tab.active{ color:#111827; border-bottom-color:#111827 }
  .tab-content{ min-height:200px }
  .tab-panel{ padding:20px 0 }

  .product-description h3{ font-size:20px; font-weight:700; color:#111827; margin:0 0 12px }
  .benefit-text{ font-size:16px; font-weight:600; color:#111827; margin:0 0 16px }
  .description-text{ color:#6b7280; line-height:1.6; margin-bottom:16px }
  .how-to-use{ color:#6b7280; line-height:1.6 }
  .no-content{ color:#9ca3af; font-style:italic; text-align:center; padding:40px 0 }

  .spec-row{ display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #f3f4f6 }
  .spec-row:last-child{ border-bottom:none }
  .spec-row:nth-child(even){ background:#f9fafb }
  .spec-label{ font-weight:600; color:#111827 }
  .spec-value{ color:#6b7280 }

   /* Reviews Header */
   .reviews-header{ 
     display:flex; 
     justify-content:space-between; 
     align-items:center; 
     margin-bottom:24px; 
     padding:20px; 
     background:#f9fafb; 
     border-radius:12px;
   }
   .reviews-summary{ 
     display:flex; 
     align-items:center; 
     gap:20px;
   }
   .rating-display{ 
     text-align:center;
   }
   .rating-number{ 
     font-size:48px; 
     font-weight:700; 
     color:#111827; 
     line-height:1;
   }
   .rating-stars{ 
     display:flex; 
     gap:2px; 
     justify-content:center; 
     margin:8px 0;
   }
   .rating-stars .star{ 
     color:#d1d5db; 
     font-size:20px;
   }
   .rating-stars .star.filled{ 
     color:#f59e0b;
   }
   .rating-text{ 
     color:#6b7280; 
     font-size:14px;
   }
   .reviews-actions{ 
     display:flex; 
     gap:12px; 
     align-items:center;
   }
   .write-review-btn{ 
     background:#8b5cf6; 
     color:#fff; 
     border:none; 
     border-radius:8px; 
     padding:10px 20px; 
     font-weight:600; 
     cursor:pointer; 
     transition:background 0.2s;
   }
   .write-review-btn:hover{ 
     background:#7c3aed;
   }
   .sort-select{ 
     border:1px solid #e5e7eb; 
     border-radius:8px; 
     padding:10px 12px; 
     background:#fff; 
     color:#6b7280; 
     font-size:14px;
   }

   /* Reviews List */
   .reviews-loading, .reviews-error, .no-reviews{ 
     text-align:center; 
     padding:40px 20px; 
     color:#6b7280;
   }
   .reviews-error{ 
     color:#ef4444;
   }
   .no-reviews-content{ 
     display:flex; 
     flex-direction:column; 
     align-items:center; 
     gap:16px;
   }
   .no-reviews-content svg{ 
     color:#d1d5db; 
     opacity:0.5;
   }
   .no-reviews-content h3{ 
     margin:0; 
     color:#6b7280; 
     font-size:18px;
   }
   .no-reviews-content p{ 
     margin:0; 
     color:#9ca3af; 
     font-size:14px;
   }
   .reviews{ 
     margin-top:20px;
   }
   .review-item{ 
     border:1px solid #e5e7eb; 
     border-radius:12px; 
     padding:20px; 
     margin-bottom:16px; 
     background:#fff; 
     transition:box-shadow 0.2s;
   }
   .review-item:hover{ 
     box-shadow:0 4px 12px rgba(0,0,0,0.1);
   }
   .review-header{ 
     display:flex; 
     align-items:center; 
     gap:12px; 
     margin-bottom:12px;
   }
   .review-stars{ 
     display:flex; 
     gap:2px;
   }
   .review-stars .star{ 
     color:#d1d5db; 
     font-size:16px;
   }
   .review-stars .star.filled{ 
     color:#f59e0b;
   }
   .review-author{ 
     font-weight:600; 
     color:#111827; 
     font-size:14px;
   }
   .review-date{ 
     color:#9ca3af; 
     font-size:12px; 
     margin-left:auto;
   }
   .review-text{ 
     color:#6b7280; 
     line-height:1.6; 
     margin-bottom:12px; 
     font-size:14px;
   }
   .review-actions{ 
     display:flex; 
     gap:20px;
   }
   .action-btn{ 
     background:none; 
     border:none; 
     color:#6b7280; 
     cursor:pointer; 
     font-size:12px; 
     display:flex; 
     align-items:center; 
     gap:4px; 
     transition:color 0.2s;
   }
   .action-btn:hover{ 
     color:#111827;
   }

   /* Responsive Reviews */
   @media (max-width: 768px) {
    .payment-image-container , .add-to-cart-section {
      display: flex !important;
      flex-wrap: wrap !important;
    }
     .reviews-header{ 
       flex-direction:column; 
       gap:16px; 
       text-align:center;
     }
     .reviews-actions{ 
       flex-direction:column; 
       width:100%;
     }
     .write-review-btn{ 
       width:100%;
     }
     .sort-select{ 
       width:100%;
     }
     .rating-number{ 
       font-size:36px;
     }
     .review-header{ 
       flex-wrap:wrap; 
       gap:8px;
     }
     .review-date{ 
       margin-left:0; 
       width:100%;
     }
   }

  /* Login Modal */
  .modal-overlay{ 
    position:fixed; 
    top:0; 
    left:0; 
    right:0; 
    bottom:0; 
    background:rgba(0,0,0,0.5); 
    display:flex; 
    align-items:center; 
    justify-content:center; 
    z-index:1000; 
    padding:20px;
  }
  .modal-content{ 
    background:#fff; 
    border-radius:16px; 
    width:100%; 
    box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
  }
  .modal-header{ 
    display:flex; 
    justify-content:space-between; 
    align-items:center; 
    padding:20px 24px; 
    border-bottom:1px solid #e5e7eb;
  }
  .modal-header h3{ 
    margin:0; 
    font-size:18px; 
    font-weight:600; 
    color:#111827;
  }
  .close-btn{ 
    background:none; 
    border:none; 
    color:#6b7280; 
    cursor:pointer; 
    padding:4px; 
    border-radius:4px; 
    transition:background 0.2s;
  }
  .close-btn:hover{ 
    background:#f3f4f6;
  }
  .modal-body{ 
    padding:24px;
  }
  .modal-body p{ 
    margin:0 0 20px; 
    color:#6b7280; 
    text-align:center; 
    line-height:1.5;
  }
  .login-options{ 
    display:flex; 
    gap:12px;
  }
  .login-btn{ 
    flex:1; 
    padding:12px 20px; 
    border-radius:8px; 
    font-weight:600; 
    cursor:pointer; 
    transition:all 0.2s; 
    border:none;
  }
  .login-btn.primary{ 
    background:#8b5cf6; 
    color:#fff;
  }
  .login-btn.primary:hover{ 
    background:#7c3aed;
  }
  .login-btn.secondary{ 
    background:#f3f4f6; 
    color:#6b7280;
  }
  .login-btn.secondary:hover{ 
    background:#e5e7eb;
  }

  /* Responsive Modal */
  @media (max-width: 480px) {
    .modal-content{ 
      margin:10px; 
      max-width:none;
    }
    .login-options{ 
      flex-direction:column;
    }
    .modal-header{ 
      padding:16px 20px;
    }
    .modal-body{ 
      padding:20px;
    }
  }

  /* Responsive Variants */
  @media (max-width: 768px) {
    .variant-section{ 
      padding:16px; 
      margin-bottom:20px;
    }
    .color-options{ 
      gap:8px;
    }
    .color-option{ 
      width:50px; 
      height:50px;
    }
    .color-name{ 
      font-size:9px; 
      padding:1px 3px;
    }
    .size-options{ 
      gap:8px;
    }
    .size-option{ 
      padding:10px 16px; 
      font-size:13px; 
      min-width:45px;
    }
    .variant-info{ 
      padding:16px;
    }
    .variant-details{ 
      grid-template-columns:1fr; 
      gap:8px;
    }
    .variant-type, 
    .variant-sku, 
    .variant-price, 
    .variant-stock{ 
      padding:6px 10px;
    }
  }
  
  @media (max-width: 480px) {
    .variant-section{ 
      padding:12px; 
      margin-bottom:16px;
    }
    .color-option{ 
      width:45px; 
      height:45px;
    }
    .color-name{ 
      font-size:8px;
    }
    .size-option{ 
      padding:8px 12px; 
      font-size:12px; 
      min-width:40px;
    }
    .variant-info{ 
      padding:12px;
    }
  }

  /* Recommended */
  .rec{ margin-top:40px; padding-top:20px; border-top:1px solid #e5e7eb }
  .rec h2{ font-size:20px; font-weight:700; color:#111827; margin-bottom:16px }
  .grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:16px }

  /* Login Modal */
  .login-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 70;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .login-modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .login-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 24px 0;
  }

  .login-header h2 {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
    transition: background-color 0.2s ease;
  }

  .close-btn:hover {
    background: #f3f4f6;
  }

  .login-form {
    padding: 24px;
  }

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

  .form-group label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
  }

  .form-group input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.2s ease;
    box-sizing: border-box;
  }

  .form-group input:focus {
    outline: none;
    border-color: #6b46c1;
    box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1);
  }

  .login-btn {
    width: 100%;
    color: #fff;
    border: none;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    background: #232323;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .login-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .error-message {
    background: #fee;
    color: #c53030;
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 14px;
    margin-bottom: 16px;
    border: 1px solid #feb2b2;
  }

  .login-footer {
    padding: 16px 24px 24px;
    text-align: center;
    border-top: 1px solid #e5e7eb;
  }

  .login-footer p {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
  }

  .login-footer a {
    color: #6b46c1;
    text-decoration: none;
    font-weight: 600;
  }

  .login-footer a:hover {
    text-decoration: underline;
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  /* Review Modal */
  .review-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .review-modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .review-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 24px 0;
  }

  .review-header h2 {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .review-form {
    padding: 24px;
  }

  .rating-input {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .star-input {
    font-size: 32px;
    color: #d1d5db;
    cursor: pointer;
    transition: color 0.2s ease;
    user-select: none;
  }

  .star-input:hover {
    color: #f59e0b;
  }

  .star-input.filled {
    color: #f59e0b;
  }

  .form-group textarea {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.2s ease;
    box-sizing: border-box;
    resize: vertical;
    min-height: 100px;
    font-family: inherit;
  }

  .form-group textarea:focus {
    outline: none;
    border-color: #6b46c1;
    box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1);
  }

  .submit-btn {
    width: 100%;
    background: #6b46c1;
    color: #fff;
    border: none;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .submit-btn:hover:not(:disabled) {
    background: #553c9a;
  }

  .submit-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  /* Replies Section */
  .replies-section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
  }

  .replies-header h4 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .replies-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .reply-item {
    background: #f9fafb;
    border-radius: 8px;
    padding: 12px;
    border: 1px solid #e5e7eb;
  }

  .reply-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .reply-author {
    font-weight: 600;
    color: #111827;
    font-size: 13px;
  }

  .reply-date {
    color: #9ca3af;
    font-size: 12px;
  }

  .reply-text {
    color: #6b7280;
    line-height: 1.5;
    font-size: 14px;
  }

  /* Reply Modal */
  .reply-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .reply-modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .reply-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 24px 0;
  }

  .reply-header h2 {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .reply-form {
    padding: 24px;
  }

  /* Enhanced Action Buttons */
  .action-btn {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: color 0.2s;
    padding: 8px 12px;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .action-btn:hover {
    color: #111827;
    background: #f3f4f6;
  }

  .action-btn svg {
    width: 16px;
    height: 16px;
  }

  /* Recommended Products Swiper */
  .recommended-swiper {
    margin-top: 20px;
  }

  .recommended-swiper-container {
    padding: 10px 0;
  }

  .recommended-slide {
    height: auto;
  }

  .recommended-swiper-container :deep(.swiper-button-prev),
  .recommended-swiper-container :deep(.swiper-button-next) {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #fff;
    color: #111827;
    border: 1px solid #e5e7eb;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
    top: 50%;
    transform: translateY(-50%);
  }

  .recommended-swiper-container :deep(.swiper-button-prev) {
    left: -20px;
  }

  .recommended-swiper-container :deep(.swiper-button-next) {
    right: -20px;
  }

  .recommended-swiper-container :deep(.swiper-button-prev::after),
  .recommended-swiper-container :deep(.swiper-button-next::after) {
    font-size: 16px;
    font-weight: bold;
  }

  .recommended-swiper-container :deep(.swiper-button-disabled) {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* RTL Support for Swiper */
  [dir="rtl"] .recommended-swiper-container :deep(.swiper-button-prev) {
    left: auto;
    right: -20px;
  }

  [dir="rtl"] .recommended-swiper-container :deep(.swiper-button-next) {
    right: auto;
    left: -20px;
  }

  /* Success Toast Styles */
  .success-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
  }

  .success-content {
    background: #10b981;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    font-weight: 600;
    font-size: 14px;
    min-width: 200px;
  }

  .success-content svg {
    flex-shrink: 0;
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* RTL Support */
  [dir="rtl"] .success-toast {
    right: auto;
    left: 20px;
  }

  [dir="rtl"] .success-content {
    text-align: right;
  }

  /* Product Modal Styles */
  .modal-products .modal-dialog {
    max-width: 800px;
  }

  .modal-products .pic-img {
    width: 100%;
    height: auto;
    border-radius: 12px;
    object-fit: contain;
  }

  .product-content-popup h5 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 12px;
  }

  .product-content-popup .price.final {
    font-size: 1.75rem;
    font-weight: 800;
    color: #ef4444;
  }

  .main-btn, .second-btn {
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
    display: inline-block;
    transition: all 0.2s ease;
    text-align: center;
  }

  .main-btn {
    background: #F58040;
    color: white;
    border: none;
  }

  .main-btn:hover:not(:disabled) {
    background: #e6733a;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(245, 128, 64, 0.3);
  }

  .main-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .second-btn {
    background: transparent;
    color: #F58040;
    border: 2px solid #F58040;
  }

  .second-btn:hover {
    background: #F58040;
    color: white;
  }

  .spinner-border-sm {
    width: 1rem;
    height: 1rem;
    border-width: 0.2em;
  }

  /* Brand and Categories Styles */
  .brands-popup {
    padding: 8px 0;
  }

  .brands-popup .cover-image-class {
    width: 100%;
    height: 90px;
    object-fit: contain;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    padding: 4px;
  }

  .brands-popup .brand-name {
    color: #111827;
    font-weight: 600;
    font-size: 14px;
    transition: color 0.2s ease;
  }

  .brands-popup a:hover .brand-name {
    color: #F58040;
  }

  .cat {
    padding-top: 16px;
    margin-top: 16px;
  }

  .category-badge {
    display: inline-block;
    padding: 6px 12px;
    background: #f3f4f6;
    color: #374151;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    border: 1px solid #e5e7eb;
  }

  .category-badge:hover {
    background: #F58040;
    color: #fff;
    border-color: #F58040;
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(245, 128, 64, 0.3);
  }

  .share a {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    color: #374151;
    transition: all 0.2s ease;
  }

  .share a:hover {
    background: #F58040;
    color: white;
    transform: translateY(-2px);
  }

  .share a i {
    font-size: 18px;
  }

  /* Error/404 Page Styles */
  .error-container {
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  }

  .error-content {
    text-align: center;
    max-width: 600px;
    padding: 40px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  }

  .error-code {
    font-size: 120px;
    font-weight: 900;
    color: #F58040;
    line-height: 1;
    margin-bottom: 20px;
  }

  .error-title {
    font-size: 32px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 16px;
  }

  .error-message {
    font-size: 18px;
    color: #6b7280;
    margin-bottom: 32px;
  }

  .error-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn-primary,
  .btn-secondary {
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
    display: inline-block;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: #F58040;
    color: white;
  }

  .btn-primary:hover {
    background: #e6733a;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(245, 128, 64, 0.3);
  }

  .btn-secondary {
    background: transparent;
    color: #F58040;
    border: 2px solid #F58040;
  }

  .btn-secondary:hover {
    background: #F58040;
    color: white;
  }
</style>
