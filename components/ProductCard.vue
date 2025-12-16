<script setup lang="ts">
import { computed, ref, watchEffect, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBrands } from '../composables/useBrands'
import { useWishlist } from '../composables/useWishlist'
import { useCart } from '../composables/useCart'
import { useCompare } from '../composables/useCompare'

const { locale, t } = useI18n()

const props = defineProps<{ product: any; qty?: number; busy?: boolean }>()
const emit = defineEmits<{
  (e: 'add', product: any): void;
  (e: 'update', payload: { product: any; qty: number }): void;
  (e: 'remove', product: any): void;
}>()

const cfg = useRuntimeConfig() as any
const assetBase = (cfg?.public?.apiBase || 'https://admin.gotawfeer.com/api').replace(/\/api(?:\/v\d+)?$/, '')
const fixPath = (s: string) => {
  if (!s || !s.trim()) {
    if (process.client) console.warn('[ProductCard] fixPath: empty input')
    return ''
  }
  
  let p = s.trim().replace(/\\/g, '/')
  
  // If it's already a full URL, return as is (handled in normalize)
  if (/^(https?:|data:|blob:)/i.test(p)) {
    if (process.client) console.log('[ProductCard] fixPath: already full URL', p)
    return p
  }
  
  // Remove common prefixes
  p = p.replace(/^public\//, '')
  p = p.replace(/^app\/public\//, '')
  p = p.replace(/^storage\/app\/public\/product\/thumbnail\//, '')
  p = p.replace(/^storage\/app\/public\//, '')
  p = p.replace(/^storage\/product\/thumbnail\//, '')
  p = p.replace(/^storage\//, '')
  
  // Clean up slashes
  p = p.replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '')
  
  // If empty after cleanup, return empty
  if (!p) {
    if (process.client) console.warn('[ProductCard] fixPath: empty after cleanup', { original: s })
    return ''
  }
  
  // If it's just a filename (no slashes), assume it's a product thumbnail
  // This handles cases like: 66666.webp, 2025-10-16-68f09dce45585.webp, etc.
  if (!p.includes('/')) {
    // Always add to product/thumbnail path for filenames only
    p = `storage/app/public/product/thumbnail/${p}`
    if (process.client) console.log('[ProductCard] fixPath: filename only, added path', { original: s, result: p })
  } else {
    // If it already has a path structure, ensure it starts with storage/app/public/
    if (!p.startsWith('storage/app/public/')) {
      p = `storage/app/public/${p}`
    }
    if (process.client) console.log('[ProductCard] fixPath: path structure', { original: s, result: p })
  }
  
  return p
}
// Normalize various backend image shapes: string path/URL, JSON string, object with path/url, or arrays
const normalize = (s: any): string => {
  if (!s) {
    if (process.client) console.warn('[ProductCard] normalize: empty input')
    return ''
  }
  // If array, take first
  if (Array.isArray(s)) return normalize(s[0])
  let v: any = s
  if (typeof s === 'string') {
    const trimmed = s.trim()
    // Skip empty strings
    if (!trimmed) {
      if (process.client) console.warn('[ProductCard] normalize: empty string after trim')
      return ''
    }
    // Attempt to parse JSON arrays/objects like images: "[...]"
    if ((trimmed.startsWith('[') || trimmed.startsWith('{'))) {
      try {
        const parsed = JSON.parse(trimmed)
        return normalize(parsed)
      } catch {
        // not JSON; continue as plain string
      }
    }
    v = trimmed
  } else if (typeof s === 'object') {
    // common keys: path/url/image, or nested objects with .path
    v = (s as any).path || (s as any).url || (s as any).image || ''
  }
  v = (typeof v === 'string' ? v : '').trim()
  if (!v) {
    if (process.client) console.warn('[ProductCard] normalize: empty value after processing', { input: s, type: typeof s })
    return ''
  }
  // If it's already a full URL, return as is
  if (/^(https?:|data:|blob:)/i.test(v)) {
    if (process.client) console.log('[ProductCard] normalize: already full URL', v)
    return v
  }
  // Fix path and build full URL
  const fixedPath = fixPath(v)
  if (!fixedPath) {
    if (process.client) console.warn('[ProductCard] normalize: fixPath returned empty', { input: v })
    return ''
  }
  const result = `${assetBase}/${fixedPath}`
  if (process.client) console.log('[ProductCard] normalize: final result', { input: s, value: v, fixedPath, result })
  return result
}

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

const link = computed(() => {
  const p: any = props.product || {}
  const slug = p?.slug || p?.product?.slug
  if (!slug) return ''
  
  // Create base path with encoded slug
  const basePath = `/product/${encodeURIComponent(String(slug))}`
  
  // Apply i18n localization
  return getLocalizedPath(basePath)
})
const imgSrc = computed(() => {
  const p: any = props.product || {}
  
  // Helper to check if URL object is valid
  const isValidUrlObject = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false
    // If it's an object, check if path exists and status is not 404
    if (obj.path && obj.status !== 404) return true
    // If key exists but path is null/404, consider it invalid
    if (obj.key && (!obj.path || obj.status === 404)) return false
    return true
  }
  
  // Helper to extract value from URL object
  const extractUrlValue = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj
    // If path exists and is valid, use it
    if (obj.path && obj.status !== 404) return obj.path
    // If key exists but path is invalid, return key as fallback
    if (obj.key) return obj.key
    return null
  }
  
  // Try to get thumbnail_full_url, but check if it's valid
  let thumbnailFullUrl = p?.thumbnail_full_url || p?.product?.thumbnail_full_url
  if (thumbnailFullUrl && typeof thumbnailFullUrl === 'object') {
    // If it's an object with invalid path (null/404), skip it and use thumbnail instead
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
      // If array, take first element that is a string
      const first = field.find((item: any) => typeof item === 'string')
      return first || null
    }
    if (typeof field === 'object' && field.path) return field.path
    if (typeof field === 'object' && field.key) return field.key
    return null
  }
  
  // Try each field and get string value
  const raw =
    // Prefer valid full URLs if provided
    getStringValue(thumbnailFullUrl) ||
    getStringValue(imageFullUrl) ||
    getStringValue(p?.photo_full_url) ||
    getStringValue(p?.images_full_url) ||
    getStringValue(p?.product?.photo_full_url) ||
    getStringValue(p?.product?.images_full_url) ||
    // Fall back to simple fields (these are usually strings)
    getStringValue(p?.thumbnail) ||
    getStringValue(p?.image) ||
    getStringValue(p?.photo) ||
    getStringValue(p?.images) ||
    getStringValue(p?.gallery_images) ||
    // Nested under product
    getStringValue(p?.product?.thumbnail) ||
    getStringValue(p?.product?.image) ||
    getStringValue(p?.product?.photo) ||
    getStringValue(p?.product?.images) ||
    getStringValue(p?.product?.gallery_images) ||
    ''
  // Debug: Log what we're getting from product
  if (process.client) {
    console.log('[ProductCard] Raw thumbnail data:', {
      productId: p?.id || p?.product_id,
      productName: p?.name || p?.product_name,
      thumbnail: p?.thumbnail,
      thumbnail_full_url: p?.thumbnail_full_url,
      image: p?.image,
      image_full_url: p?.image_full_url,
      raw: raw,
      assetBase: assetBase
    })
  }
  
  const result = normalize(raw)
  
  // Debug logging
  if (process.client) {
    console.log('[ProductCard] Image URL generated:', {
      raw,
      result,
      isEmpty: !result || result === `${assetBase}/`,
      productId: p?.id || p?.product_id,
      productName: p?.name || p?.product_name
    })
  }
  
  // If no result, return placeholder
  if (!result || result === `${assetBase}/`) {
    if (process.client) {
      console.warn('[ProductCard] No image URL generated, using placeholder:', {
        raw,
        productId: p?.id || p?.product_id
      })
    }
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="16">No image</text></svg>'
  }
  
  return result
})
const title = computed(() => {
  const p: any = props.product || {}
  return p?.name || p?.product_name || p?.product?.name || p?.product?.product_name || 'Product'
})
const status = computed(() => {
  const p: any = props.product || {}
  return p?.condition || p?.product?.condition 
})

const statusClass = computed(() => {
  const statusValue = status.value
  if (!statusValue) return ''
  
  // Convert to lowercase for case-insensitive matching
  const statusLower = String(statusValue).toLowerCase().trim()
  
  if (statusLower === 'most_popular' || statusLower === 'الأكثر شهرة') {
    return 'most-popular'
  } else if (statusLower === 'best_offers' || statusLower === 'أقوى العروض') {
    return 'best-offers'
  } else if (statusLower === 'best_selling' || statusLower === 'الأكثر مبيعاً' || statusLower === 'الأكثر مبيعا') {
    return 'best-selling'
  } else if (statusLower === 'new' || statusLower === 'جديد') {
    return 'new'
  }
  
  return 'available' // Default class
})

const translatedStatus = computed(() => {
  const statusValue = status.value
  if (!statusValue) return ''
  
  // Convert to lowercase for case-insensitive matching
  const statusLower = String(statusValue).toLowerCase().trim()
  
  if (statusLower === 'most_popular' || statusLower === 'الأكثر شهرة') {
    return t('product.status.most_popular') || 'الأكثر شهرة'
  } else if (statusLower === 'best_offers' || statusLower === 'أقوى العروض') {
    return t('product.status.best_offers') || 'أقوى العروض'
  } else if (statusLower === 'best_selling' || statusLower === 'الأكثر مبيعاً' || statusLower === 'الأكثر مبيعا') {
    return t('product.status.best_selling') || 'الأكثر مبيعاً'
  } else if (statusLower === 'new' || statusLower === 'جديد') {
    return t('product.status.new') || 'جديد'
  }
  
  return statusValue // Return original value if no translation found
})
const { ensure: ensureBrands, nameOf: brandNameOf, ensureBrand } = useBrands() as any
const cart = useCart()
const wishlist = useWishlist()
const compare = useCompare()

// Load cart, wishlist and compare on component mount
// Tooltip instances
const tooltipInstances = ref<any[]>([])

// Initialize tooltips for a specific element
const initTooltip = (element: any) => {
  if (!element || !process.client || !(window as any).bootstrap) return null
  
  // Check if element is in DOM
  if (!document.contains(element)) {
    return null
  }
  
  try {
    // Dispose existing tooltip if any (safely)
    try {
      const existingTooltip = (window as any).bootstrap.Tooltip.getInstance(element)
      if (existingTooltip) {
        // Only dispose if element is still in DOM
        if (document.contains(element)) {
          existingTooltip.dispose()
        }
      }
    } catch (e) {
      // Ignore errors when disposing existing tooltip
    }
    
    // Create new tooltip only if element is still in DOM
    if (!document.contains(element)) {
      return null
    }
    
    const tooltip = new (window as any).bootstrap.Tooltip(element, {
      trigger: 'hover',
      placement: element.getAttribute('data-bs-placement') || 'top',
      container: 'body',
      html: false
    })
    
    tooltipInstances.value.push(tooltip)
    return tooltip
  } catch (error) {
    console.warn('Failed to initialize tooltip:', error)
    return null
  }
}

onMounted(async () => {
  try {
    // Only load cart if not already loaded (avoid duplicate API calls)
    // Cart is usually loaded at page level (shop/index.vue, etc.)
    if (!cart.items.value || cart.items.value.length === 0) {
      await cart.list().catch(() => {
        // Silently fail - cart might be loading elsewhere
      })
    }
    
    // Only load wishlist if not already loaded
    if (!wishlist.wishlist.value || wishlist.wishlist.value.length === 0) {
      await wishlist.list().catch(() => {
        // Silently fail - wishlist might be loading elsewhere
      })
    }
    
    compare.init()
  } catch (error) {
    // Silently handle errors - these are non-critical
  }

  // Initialize Bootstrap tooltips - use requestAnimationFrame for better performance
  if (process.client && (window as any).bootstrap) {
    await nextTick()
    // Use requestAnimationFrame instead of setTimeout for better performance
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
        tooltipTriggerList.forEach((tooltipTriggerEl: any) => {
          initTooltip(tooltipTriggerEl)
        })
      })
    })
  }
  
  // Initialize discount countdown if applicable
  if (showDiscountCountdown.value) {
    initializeDiscountCountdown()
  }
})

// Cleanup tooltips and countdown on unmount
onBeforeUnmount(() => {
  if (!process.client) return
  
  // Clear countdown interval
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  
  // Dispose all tooltips safely
  tooltipInstances.value.forEach((tooltip: any) => {
    try {
      if (!tooltip) return
      
      // Get the element from tooltip instance
      const element = tooltip._element || tooltip._config?.element || tooltip.element
      
      // Only dispose if element exists and is in DOM
      if (element && typeof element.closest === 'function') {
        // Check if element is still in DOM
        if (document.contains(element)) {
          // Check if dispose method exists
          if (typeof tooltip.dispose === 'function') {
            tooltip.dispose()
          }
        }
      }
    } catch (error) {
      // Silently ignore errors during cleanup (element may already be removed)
      // This is safe - tooltip cleanup errors don't affect functionality
    }
  })
  
  // Clear the array
  tooltipInstances.value = []
  
  // Also dispose any tooltips that might be attached to elements in this component
  if (process.client && (window as any).bootstrap?.Tooltip) {
    try {
      const cardElement = document.querySelector(`[data-product-id="${props.product?.id || props.product?.product_id}"]`)
      if (cardElement) {
        const tooltipElements = cardElement.querySelectorAll('[data-bs-toggle="tooltip"]')
        tooltipElements.forEach((el: any) => {
          try {
            const tooltip = (window as any).bootstrap.Tooltip.getInstance(el)
            if (tooltip && typeof tooltip.dispose === 'function') {
              // Check if element is still in DOM before disposing
              if (el && typeof el.closest === 'function' && document.contains(el)) {
                tooltip.dispose()
              }
            }
          } catch (e) {
            // Ignore errors
          }
        })
  }
    } catch (e) {
      // Ignore errors
    }
  }
})



await ensureBrands()
// Ensure specific brand is loaded if only brand_id provided
watchEffect(async () => {
  const p: any = props.product || {}
  if (p?.brand_id) {
    try { await ensureBrand(p.brand_id) } catch {}
  }
})
const brandName = computed(() => {
  const p: any = props.product || {}
  return p?.brand_name || p?.brand?.name || p?.product?.brand_name || p?.product?.brand?.name || brandNameOf(p?.brand_id)
})
// Pricing & discount
const basePrice = computed<number>(() => {
  const p: any = props.product || {}
  const v = p?.unit_price ?? p?.price ?? p?.product?.unit_price ?? p?.product?.price
  const n = Number(v)
  return isFinite(n) && n > 0 ? n : 0
})
const discountValue = computed<number>(() => {
  const p: any = props.product || {}
  const v = p?.discount ?? p?.product?.discount ?? 0
  const n = Number(v)
  return isFinite(n) && n > 0 ? n : 0
})
const discountType = computed<string>(() => {
  const p: any = props.product || {}
  return p?.discount_type || p?.product?.discount_type || 'flat'
})
const oldPrice = computed<number>(() => basePrice.value)
const finalPrice = computed<number>(() => {
  const bp = basePrice.value
  const dv = discountValue.value
  if (!bp || !dv) return bp
  const isPercent = String(discountType.value).toLowerCase().startsWith('per')
  const diff = isPercent ? (bp * dv) / 100 : dv
  return Math.max(0, bp - diff)
})
const hasDiscount = computed<boolean>(() => finalPrice.value > 0 && finalPrice.value < oldPrice.value)
const discountPercent = computed<number>(() => {
  const bp = oldPrice.value
  const dv = discountValue.value
  if (!bp || !dv) return 0
  const isPercent = String(discountType.value).toLowerCase().startsWith('per')
  return Math.max(0, Math.round(isPercent ? dv : (dv / bp) * 100))
})

// Discount countdown timer
const discountStartDate = computed<string | null>(() => {
  const p: any = props.product || {}
  return p?.discount_start_date || p?.product?.discount_start_date || null
})

const discountEndDate = computed<string | null>(() => {
  const p: any = props.product || {}
  return p?.discount_end_date || p?.product?.discount_end_date || null
})

const discountPeriodType = computed<string | null>(() => {
  const p: any = props.product || {}
  return p?.discount_period_type || p?.product?.discount_period_type || null
})

const showDiscountCountdown = computed(() => {
  return discountPeriodType.value === 'temporary' && discountStartDate.value && discountEndDate.value
})

// Countdown state
const countdownDays = ref(0)
const countdownHours = ref(0)
const countdownMinutes = ref(0)
const countdownSeconds = ref(0)
const countdownExpired = ref(false)
let countdownInterval: any = null

// Initialize countdown
const initializeDiscountCountdown = () => {
  if (!process.client || !showDiscountCountdown.value) return
  
  const updateCountdown = () => {
    if (!discountEndDate.value) {
      countdownExpired.value = true
      return
    }
    
    const endDate = new Date(discountEndDate.value)
    const now = new Date()
    const distance = endDate.getTime() - now.getTime()
    
    if (distance < 0) {
      countdownExpired.value = true
      countdownDays.value = 0
      countdownHours.value = 0
      countdownMinutes.value = 0
      countdownSeconds.value = 0
      return
    }
    
    countdownDays.value = Math.floor(distance / (1000 * 60 * 60 * 24))
    countdownHours.value = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    countdownMinutes.value = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
    countdownSeconds.value = Math.floor((distance % (1000 * 60)) / 1000)
  }
  
  // Update immediately
  updateCountdown()
  
  // Update every second
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
  countdownInterval = setInterval(updateCountdown, 1000)
}

// Format countdown number with leading zero
const formatCountdown = (num: number): string => {
  return num.toString().padStart(2, '0')
}
const formatPrice = (n: number) => {
  if (!isFinite(n)) return ''
  try { return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }
  catch { return String(n) }
}
// Rating (0..5)
const rating = computed<number>(() => {
  const p: any = props.product || {}
  const r = p?.reviews_avg_rating ?? p?.avg_rating ?? p?.rating?.[0]?.average ?? 0
  const n = Number(r)
  return isFinite(n) && n >= 0 ? Math.min(5, Math.max(0, n)) : 0
})
const reviewsCount = computed<number>(() => {
  const p: any = props.product || {}
  const c = p?.reviews_count ?? p?.rating?.[0]?.count ?? 0
  const n = Number(c)
  return isFinite(n) && n >= 0 ? Math.round(n) : 0
})
const onErr = (e: any) => {
  const failedSrc = e.target.src
  console.error('[ProductCard] Image load failed:', {
    failedSrc,
    product: props.product?.id || props.product?.product_id,
    imgSrc: imgSrc.value
  })
  
  // Prevent infinite loop - only set placeholder if not already set
  if (!failedSrc.includes('data:image/svg+xml')) {
    e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="16">No image</text></svg>'
    e.target.onerror = null // Prevent infinite loop
  }
}

// Wishlist + Add to cart
const wished = computed(() => {
  const p: any = props.product || {}
  const productId = p?.id || p?.product_id
  if (!productId) return false
  
  // Check if product is in wishlist using useWishlist
  const result = wishlist.isInWishlist(String(productId))
  return result
})
const wishlistLoading = computed(() => wishlist.loading.value)

// Compare functionality
const isInCompare = computed(() => {
  const productId = props.product?.id || props.product?.product_id
  if (!productId) return false
  return compare.isInCompare(Number(productId))
})

// Watch for state changes to update tooltip text
watch([wished, isInCompare], () => {
  if (process.client && (window as any).bootstrap) {
    nextTick(() => {
      // Update tooltip titles dynamically
      const cardElement = document.querySelector(`[data-product-id="${props.product?.id || props.product?.product_id}"]`)
      if (!cardElement) return
      
      // Update wishlist tooltip
      const wishButton = cardElement.querySelector('[data-bs-toggle="tooltip"][data-wished]')
      if (wishButton) {
        const tooltip = (window as any).bootstrap.Tooltip.getInstance(wishButton)
        if (tooltip) {
          const newTitle = wished.value ? t('product.remove_from_wishlist') : t('product.add_to_wishlist')
          wishButton.setAttribute('data-bs-title', newTitle)
          tooltip.setContent({ '.tooltip-inner': newTitle })
        }
      }
      
      // Update compare tooltip
      const compareButton = cardElement.querySelector('[data-bs-toggle="tooltip"].compare-btn')
      if (compareButton) {
        const tooltip = (window as any).bootstrap.Tooltip.getInstance(compareButton)
        if (tooltip) {
          const newTitle = isInCompare.value ? t('product.remove_from_compare') : t('product.add_to_compare')
          compareButton.setAttribute('data-bs-title', newTitle)
          tooltip.setContent({ '.tooltip-inner': newTitle })
        }
      }
    })
  }
})

const toggleWish = async (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  
  // Check if user is logged in
  const auth = useAuth()
  if (!auth?.user?.value) {
    // Open login modal using global state
    const loginModalOpen = useState('loginModalOpen', () => false)
    loginModalOpen.value = true
    return
  }
  
  if (wishlistLoading.value) return
  
  try {
    const productId = props.product?.id || props.product?.product_id
    
    if (!productId) {
      throw new Error('Product ID not found')
    }
    
    // console.log(`[ProductCard] Toggling wishlist for product ${productId}`)
    // console.log(`[ProductCard] Current wishlist state:`, wishlist.wishlist.value)
    // console.log(`[ProductCard] Is in wishlist:`, wished.value)
    
    // Use wishlist.toggle to add/remove
    await wishlist.toggle(String(productId))
    
    // Show success message
    const message = wished.value 
      ? t('product.product_removed_from_wishlist') || 'تم إزالة المنتج من المفضلة' : t('product.product_added_to_wishlist') || 'تم إضافة المنتج إلى المفضلة'
    showSuccessToast(message)
  } catch (error: any) {
    console.error('Wishlist error:', error)
    
    // Handle specific error cases
    if (error?.status === 409 || error?.data?.message?.includes('Already in your wishlist')) {
      console.log('المنتج موجود بالفعل في المفضلة')
      return
    }
    
    if (error?.status === 404 || error?.data?.message?.includes('not in your wishlist')) {
      console.log('المنتج غير موجود في المفضلة')
      return
    }
    
    console.error('حدث خطأ أثناء تحديث المفضلة:', error?.data?.message || error.message)
  }
}

const toggleCompare = async (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  
  const productId = props.product?.id || props.product?.product_id
  if (!productId) {
    console.warn('No product ID found for compare toggle')
    return
  }
  
  if (compare.loading.value) return
  
  try {
    if (isInCompare.value) {
      // Remove from compare
      const success = compare.remove(Number(productId))
      if (success) {
        const message = t('product.product_removed_from_compare') || 'تم إزالة المنتج من المقارنة'
        showSuccessToast(message)
      }
    } else {
      // Check if compare is full
      if (compare.isFull.value) {
        const message = t('product.compare_max_products') || 'تم الوصول إلى الحد الأقصى للمنتجات في المقارنة'
        showSuccessToast(message)
        return
      }
      
      // Add to compare
      const success = compare.add(props.product)
      if (success) {
        const message = t('product.product_added_to_compare') || 'تم إضافة المنتج إلى المقارنة'
        showSuccessToast(message)
      } else {
        const errorMsg = compare.error.value || t('product.error_adding_product_to_compare') || 'حدث خطأ أثناء إضافة المنتج إلى المقارنة'
        showSuccessToast(errorMsg)
      }
    }
  } catch (error: any) {
    console.error('Error toggling compare:', error)
    const errorMsg = t('product.error_adding_product_to_compare') || 'حدث خطأ أثناء تحديث المقارنة'
    showSuccessToast(errorMsg)
  }
}
const currencySymbol = computed(() => {
  const p: any = props.product || {}
  return p?.currency_symbol || 'ر.س'
})

const currencyImage = computed(() => {
  return '/images/Group 1171274840.png'
})

// Helper function to convert color name/code to hex
const colorToHex = (color: string): string => {
  if (!color) return '#ccc'
  
  // If already a hex code, return it
  if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
    return color
  }
  
  // Common color name to hex mapping
  const colorMap: Record<string, string> = {
    'red': '#FF0000',
    'green': '#00FF00',
    'blue': '#0000FF',
    'yellow': '#FFFF00',
    'orange': '#FFA500',
    'purple': '#800080',
    'pink': '#FFC0CB',
    'black': '#000000',
    'white': '#FFFFFF',
    'gray': '#808080',
    'grey': '#808080',
    'brown': '#A52A2A',
    'cyan': '#00FFFF',
    'magenta': '#FF00FF',
    'lime': '#00FF00',
    'navy': '#000080',
    'maroon': '#800000',
    'olive': '#808000',
    'teal': '#008080',
    'silver': '#C0C0C0',
    'gold': '#FFD700',
    'beige': '#F5F5DC',
    'ivory': '#FFFFF0',
    'coral': '#FF7F50',
    'salmon': '#FA8072',
    'turquoise': '#40E0D0',
    'violet': '#EE82EE',
    'indigo': '#4B0082',
    'أحمر': '#FF0000',
    'أخضر': '#00FF00',
    'أزرق': '#0000FF',
    'أصفر': '#FFFF00',
    'برتقالي': '#FFA500',
    'بنفسجي': '#800080',
    'وردي': '#FFC0CB',
    'أسود': '#000000',
    'أبيض': '#FFFFFF',
    'رمادي': '#808080',
    'بني': '#A52A2A'
  }
  
  const normalizedColor = color.toLowerCase().trim()
  return colorMap[normalizedColor] || color
}

// Product colors
const productColors = computed(() => {
  const p: any = props.product || {}
  
  // Helper function to normalize image path
  const normalizeImage = (imagePath: string | null | undefined): string => {
    if (!imagePath || (typeof imagePath === 'string' && imagePath.trim() === '')) return ''
    const trimmed = String(imagePath).trim()
    // If it's already a full URL, return as is
    if (/^(https?:|data:|blob:)/i.test(trimmed)) {
      return trimmed
    }
    // Otherwise normalize it
    const normalized = normalize(trimmed)
    if (process.client && normalized) {
      console.log('[ProductCard] normalizeImage:', { original: imagePath, normalized })
    }
    return normalized
  }
  
  // Try to get colors_formatted first
  if (p?.colors_formatted && Array.isArray(p.colors_formatted) && p.colors_formatted.length > 0) {
    return p.colors_formatted.map((color: any) => {
      const hex = color.hex || color.code || color.name || ''
      return {
        name: color.name || color.code || 'Color',
        originalName: color.name, // Keep original name to check if it's null
        code: color.code || color.name || '',
        hex: colorToHex(hex),
        image: normalizeImage(color.image)
      }
    })
  }
  
  // Try nested product.colors_formatted
  if (p?.product?.colors_formatted && Array.isArray(p.product.colors_formatted) && p.product.colors_formatted.length > 0) {
    return p.product.colors_formatted.map((color: any) => {
      const hex = color.hex || color.code || color.name || ''
      return {
        name: color.name || color.code || 'Color',
        originalName: color.name, // Keep original name to check if it's null
        code: color.code || color.name || '',
        hex: colorToHex(hex),
        image: normalizeImage(color.image)
      }
    })
  }
  
  // Try simple colors array
  if (p?.colors && Array.isArray(p.colors) && p.colors.length > 0) {
    return p.colors.map((color: string | any, index: number) => {
      if (typeof color === 'string') {
        return {
          name: `Color ${index + 1}`,
          originalName: null,
          code: color,
          hex: colorToHex(color),
          image: ''
        }
      }
      const hex = color.hex || color.code || color.name || ''
      return {
        name: color.name || color.code || `Color ${index + 1}`,
        originalName: color.name, // Keep original name to check if it's null
        code: color.code || color.name || color,
        hex: colorToHex(hex),
        image: normalizeImage(color.image)
      }
    })
  }
  
  // Try nested product.colors
  if (p?.product?.colors && Array.isArray(p.product.colors) && p.product.colors.length > 0) {
    return p.product.colors.map((color: string | any, index: number) => {
      if (typeof color === 'string') {
        return {
          name: `Color ${index + 1}`,
          originalName: '',
          code: color,
          hex: colorToHex(color),
          image: ''
        }
      }
      const hex = color.hex || color.code || color.name || ''
      return {
        name: color.name || color.code || `Color ${index + 1}`,
        originalName: color.name, // Keep original name to check if it's null
        code: color.code || color.name || color,
        hex: colorToHex(hex),
        image: normalizeImage(color.image)
      }
    })
  }
  
  return []
})

const visibleColors = computed(() => {
  return productColors.value.slice(0, 3)
})

const remainingColorsCount = computed(() => {
  const total = productColors.value.length
  return total > 3 ? total - 3 : 0
})

// Check if product has colors
const hasColors = computed(() => {
  return productColors.value.length > 0
})

// Check if product has variations
const hasVariations = computed(() => {
  const p: any = props.product || {}
  // Check choice_options
  if (p?.choice_options && Array.isArray(p.choice_options) && p.choice_options.length > 0) {
    return true
  }
  // Check variation array
  if (p?.variation && Array.isArray(p.variation) && p.variation.length > 0) {
    return true
  }
  // Check nested product.choice_options
  if (p?.product?.choice_options && Array.isArray(p.product.choice_options) && p.product.choice_options.length > 0) {
    return true
  }
  // Check nested product.variation
  if (p?.product?.variation && Array.isArray(p.product.variation) && p.product.variation.length > 0) {
    return true
  }
  return false
})

// Check if product has options (colors or variations)
const hasProductOptions = computed(() => {
  return hasColors.value || hasVariations.value
})

// Cart controls with quantity
const qty = computed(() => {
  // Use cart.qtyOf if available, otherwise fall back to props.qty
  return cart.qtyOf(props.product) || props.qty || 0
})

// Local loading state for this specific product
const isAddingToCart = ref(false)
const isUpdatingCart = ref(false)
const isBusy = computed(() => !!props.busy || isAddingToCart.value || isUpdatingCart.value)

// Success message state
const showSuccessMessage = ref(false)
const successMessage = ref('')

// Function to show success message
const showSuccessToast = (message: string) => {
  successMessage.value = message
  showSuccessMessage.value = true
  setTimeout(() => {
    showSuccessMessage.value = false
  }, 3000)
}

// Function to open cart dropdown
const openCartDropdown = () => {
  if (process.client) {
    const event = new CustomEvent('open-cart')
    window.dispatchEvent(event)
  }
}

const handleAdd = async (e: Event) => {
  e.preventDefault(); e.stopPropagation()
  if (isBusy.value) return
  
  // If product has colors or variations, navigate to product page instead
  if (hasProductOptions.value) {
    const productLink = link.value
    if (productLink && productLink !== '#') {
      navigateTo(productLink)
    }
    return
  }
  
  try {
    isAddingToCart.value = true
    const productId = props.product?.id || props.product?.product_id
    if (!productId) {
      console.error('Product ID not found')
      return
    }
    
    // Prepare cart data
    const cartData: any = {
      product_id: Number(productId),
      quantity: 1
    }
    
    // Add variant info if available
    if (props.product?.variant) cartData.variant = props.product.variant
    if (props.product?.color) cartData.color = props.product.color
    if (props.product?.size) cartData.size = props.product.size
    if (props.product?.variant_type) cartData.variant_type = props.product.variant_type
    if (props.product?.sku) cartData.sku = props.product.sku
    
    // Add pricing info
    cartData.price = finalPrice.value
    cartData.base_price = basePrice.value
    if (hasDiscount.value) {
      cartData.discount = discountValue.value
      cartData.discount_type = discountType.value
    }
    
    // Add to cart - this will set cart.loading, but we use our local isAddingToCart instead
    await cart.add(cartData)
    // cart.add() already calls list(true) internally, so UI will update automatically
    
    // Wait a bit to ensure cart state is updated
    await nextTick()
    
    // Show success message
    showSuccessToast(t('product.cart_added_successfully') || 'تم إضافة المنتج إلى السلة بنجاح')
    
    // Open cart dropdown
    openCartDropdown()
    
    emit('add', props.product)
    console.log('✅', t('product.product_added_to_cart_successfully'))
  } catch (error: any) {
    console.error('❌ خطأ في إضافة المنتج للسلة:', error)
    alert(t('product.error_adding_product_to_cart'))
  } finally {
    // Reset local loading state immediately after operation completes
    // This ensures only this card shows loading, not others
    isAddingToCart.value = false
  }
}

const inc = async (e: Event) => {
  e.preventDefault(); e.stopPropagation();
  if (isBusy.value) return
  
  try {
    isUpdatingCart.value = true
    const currentQty = qty.value
    const newQty = currentQty + 1
    await cart.updateByProduct(props.product, newQty)
    // Wait a bit to ensure cart state is updated
    await nextTick()
    emit('update', { product: props.product, qty: newQty })
    console.log('تم تحديث الكمية:', newQty)
  } catch (error: any) {
    console.error('خطأ في تحديث الكمية:', error)
  } finally {
    // Reset local loading state immediately
    isUpdatingCart.value = false
  }
}

const dec = async (e: Event) => {
  e.preventDefault(); e.stopPropagation();
  if (isBusy.value) return
  
  try {
    isUpdatingCart.value = true
    const currentQty = qty.value
    if (currentQty > 1) {
      const newQty = currentQty - 1
      await cart.updateByProduct(props.product, newQty)
      // Wait a bit to ensure cart state is updated
      await nextTick()
      emit('update', { product: props.product, qty: newQty })
      console.log('تم تحديث الكمية:', newQty)
    } else if (currentQty === 1) {
      await cart.removeByProduct(props.product)
      // Wait a bit to ensure cart state is updated
      await nextTick()
      emit('remove', props.product)
      console.log(t('product.product_removed_from_cart'))
    }
  } catch (error: any) {
    console.error('خطأ في تحديث الكمية:', error)
  } finally {
    // Reset local loading state immediately
    isUpdatingCart.value = false
  }
}

const clearQty = async (e: Event) => {
  if (isBusy.value) return
  e.preventDefault()
  e.stopPropagation()
  
  try {
    isUpdatingCart.value = true
    await cart.removeByProduct(props.product)
    // Wait a bit to ensure cart state is updated
    await nextTick()
    emit('remove', props.product)
    console.log('تم إزالة المنتج من السلة')
  } catch (error: any) {
    console.error(t('product.error_removing_product_from_cart'), error)
  } finally {
    // Reset local loading state immediately
    isUpdatingCart.value = false
  }
}

// Promotional chip
const promoChip = computed<{ text: string; tone: 'green' | 'pink' | 'blue' } | null>(() => {
  const p: any = props.product || {}
  if (p?.flash_deal_status || p?.flash_deal) return { text: 'عرض اليوم الوطني', tone: 'green' }
  if (p?.bogo || p?.offer_type === 'buy_one_get_one') return { text: '1+1 مجاناً', tone: 'pink' }
  if ((p?.order_details_count ?? 0) > 500) return { text: 'الأفضل مبيعًا', tone: 'blue' }
  if (p?.is_bestseller) return { text: 'الأفضل مبيعًا', tone: 'blue' }
  return null
})
const promoText = computed(() => promoChip.value?.text || '')
const promoTone = computed(() => promoChip.value?.tone || '')
// Stock
const current_stock = computed<number>(() => {
  const p: any = props.product || {}
  const q = p?.current_stock ?? p?.stock ?? p?.quantity ?? p?.product?.current_stock ?? p?.product?.stock ?? 0
  return Number(q) || 0
})

const inStock = computed<boolean>(() => {
  const p: any = props.product || {}
  const q = p?.current_stock ?? p?.stock ?? p?.quantity ?? p?.product?.current_stock ?? p?.product?.stock ?? 0
  return (Number(q) > 0) || p?.in_stock === true
})

// Open product modal function
const openProductModal = async (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  
  // Set the selected product in global state
  const selectedProductForModal = useState<any>('selectedProductForModal', () => null)
  selectedProductForModal.value = props.product
  
  // Open the modal using Bootstrap
  if (process.client) {
    // Use requestAnimationFrame instead of setTimeout for better performance
    await nextTick()
    requestAnimationFrame(() => {
      const modalElement = document.getElementById('exampleModal')
      if (modalElement) {
        const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement)
        if (modal) {
          modal.show()
        } else {
          // If modal instance doesn't exist, create one
          const bsModal = new (window as any).bootstrap.Modal(modalElement)
          bsModal.show()
        }
      }
    })
  }
}
</script>

<template>
  <NuxtLink :to="(link as any) || '#'" class="card" dir="rtl" :aria-disabled="!(link as any)" @click="!(link as any) && $event.preventDefault()" :data-product-id="props.product?.id || props.product?.product_id">
    <div class="thumb">
      <!-- wishlist at top-left -->
      <div class="card-tools d-flex flex-column">
        <button 
          class="fab wish" 
          :class="{ on: wished, loading: wishlistLoading }" 
          @click="toggleWish" 
          :disabled="wishlistLoading"
          :data-wished="wished"
          :data-loading="wishlistLoading"
          data-bs-toggle="tooltip"
          :data-bs-title="wished ? t('product.remove_from_wishlist') : t('product.add_to_wishlist')"
          data-bs-placement="top"
          aria-label="Wishlist"
          >
          <svg v-if="!wishlistLoading" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 1C11.6566 1 13 2.49112 13 4.33081C13 5.81587 12.475 9.34047 7.3072 12.9034C7.21463 12.9666 7.10836 13 7 13C6.89164 13 6.78537 12.9666 6.6928 12.9034C1.525 9.34047 1 5.81587 1 4.33081C1 2.49112 2.3434 1 4 1C5.6566 1 7 3.01867 7 3.01867C7 3.01867 8.3434 1 10 1Z" stroke="black" stroke-opacity="0.49" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>

          <div v-else class="wishlist-spinner"></div>
        </button>
        <!-- Compare Button -->
        <button 
          class="fab wish compare-btn" 
          :class="{ 'in-compare': isInCompare }"
          @click="toggleCompare" 
          :disabled="compare.loading.value"
          data-bs-toggle="tooltip"
          :data-bs-title="isInCompare ? t('product.remove_from_compare') : t('product.add_to_compare')"
          data-bs-placement="top"
          aria-label="Compare"
        >
          <svg v-if="!compare.loading.value" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.00059994 9.42142C0.00059994 9.65916 0.0725927 9.8649 0.216578 10.0386C0.360564 10.2124 0.540546 10.2947 0.756524 10.2855H1.50045C2.0124 10.2855 2.50035 10.1712 2.9643 9.94262C3.42826 9.71402 3.82422 9.4077 4.15218 9.02366C4.48015 8.63962 4.74813 8.18242 4.9561 7.65207C5.16408 7.12173 5.26407 6.56852 5.25607 5.99246C5.25607 5.28838 5.47205 4.68488 5.90401 4.18196C6.33597 3.67905 6.86791 3.42759 7.49985 3.42759H8.9997V4.27797C8.9997 4.47 9.0477 4.63459 9.14369 4.77175C9.23968 4.9089 9.34766 5.00949 9.46765 5.07349C9.58764 5.1375 9.72763 5.15579 9.88761 5.12836C10.0476 5.10093 10.1796 5.0232 10.2836 4.89519L11.7834 3.18071C11.9354 2.99783 12.0074 2.79209 11.9994 2.56349C11.9914 2.3349 11.9194 2.13373 11.7834 1.96L10.2836 0.245514C10.1636 0.117499 10.0276 0.039776 9.87561 0.0123443C9.72363 -0.0150874 9.58364 0.00320038 9.45565 0.0672077C9.32767 0.131215 9.21968 0.231798 9.13169 0.368956C9.0437 0.506115 8.9997 0.666133 8.9997 0.849011V1.71311H7.49985C6.9959 1.71311 6.51195 1.82741 6.048 2.05601C5.58404 2.2846 5.18408 2.58635 4.84812 2.96125C4.51215 3.33615 4.24418 3.79335 4.0442 4.33284C3.84422 4.87233 3.74823 5.42553 3.75622 5.99246C3.75622 6.70568 3.53625 7.31375 3.09629 7.81667C2.65633 8.31958 2.12439 8.57104 1.50045 8.57104H0.756524C0.548545 8.57104 0.368563 8.65333 0.216578 8.81792C0.0645935 8.98251 -0.00739926 9.18368 0.00059994 9.42142ZM0.00059994 2.57721C0.00059994 2.81495 0.0725927 3.01612 0.216578 3.18071C0.360564 3.3453 0.540546 3.42759 0.756524 3.42759H1.50045C1.85241 3.42759 2.17638 3.51446 2.47235 3.68819C2.76832 3.86193 3.0283 4.09967 3.25227 4.40142C3.42026 3.81621 3.66823 3.29043 3.9962 2.82409C3.26827 2.08344 2.43636 1.71311 1.50045 1.71311H0.756524C0.548545 1.71311 0.368563 1.79998 0.216578 1.97371C0.0645935 2.14745 -0.00739926 2.34861 0.00059994 2.57721ZM5.0161 9.18825C5.72803 9.91976 6.55594 10.2855 7.49985 10.2855H8.9997V11.1496C8.9997 11.3325 9.0477 11.4971 9.14369 11.6434C9.23968 11.7897 9.34766 11.8903 9.46765 11.9451C9.58764 12 9.72763 12.0137 9.88761 11.9863C10.0476 11.9589 10.1796 11.8811 10.2836 11.7531L11.7834 10.0386C11.9354 9.8649 12.0074 9.65916 11.9994 9.42142C11.9914 9.18368 11.9194 8.98709 11.7834 8.83164L10.2836 7.11716C10.1636 6.98 10.0276 6.8977 9.87561 6.87027C9.72363 6.84284 9.58364 6.86113 9.45565 6.92514C9.32767 6.98914 9.21968 7.0943 9.13169 7.2406C9.0437 7.3869 8.9997 7.54692 8.9997 7.72065V8.57104H7.49985C7.15588 8.57104 6.83192 8.48874 6.52795 8.32415C6.22398 8.15956 5.968 7.92182 5.76002 7.61093C5.58404 8.19614 5.33607 8.72191 5.0161 9.18825Z" fill="currentColor"/>
          </svg>
          <div v-else class="compare-spinner"></div>
        </button>
        <button 
          class="fab wish" 
          data-bs-target="#exampleModal" 
          type="button" 
          @click.stop.prevent="openProductModal"
          data-bs-toggle="tooltip"
          :data-bs-title="t('product.view_product')"
          data-bs-placement="top"
          aria-label="View Product"
        >
          <svg svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.28198 9.25345C5.9701 9.6655 6.75742 9.88245 7.55947 9.88105C8.14273 9.88184 8.72039 9.76735 9.25925 9.54415C9.79812 9.32095 10.2875 8.99345 10.6994 8.58047C11.1124 8.1686 11.4399 7.67917 11.6631 7.14031C11.8863 6.60145 12.0008 6.02378 12 5.44053C12 4.21428 11.5033 3.10448 10.6994 2.30058C10.2875 1.8876 9.79812 1.5601 9.25925 1.3369C8.72039 1.1137 8.14273 0.999209 7.55947 1C6.33323 1 5.22343 1.49668 4.41953 2.30058C4.00655 2.71245 3.67905 3.20188 3.45585 3.74075C3.23265 4.27961 3.11816 4.85727 3.11895 5.44053C3.11781 6.22824 3.32697 7.00199 3.72484 7.68184C4.06495 8.26207 4.01034 8.98966 3.53472 9.46528L1 12" stroke="#6F6F6F" stroke-width="1.5"/>
          </svg>
        </button>
      </div>
      <div v-if="status != null" class="status-card" :class="statusClass">
        {{ translatedStatus }}
      </div>
      <div v-if="current_stock === 0" class="status-card out">
        {{ t('product.out_of_stock_quantity') }}
      </div>
      <div v-if="showDiscountCountdown && !countdownExpired" class="status-card count-down">
        <div class="countdown-label">{{ t('product.ends_in') }}</div>
        <div class="countdown-timer">
          <span v-if="countdownDays > 0" class="countdown-item">
            <span class="countdown-number">{{ formatCountdown(countdownDays) }}</span>
            <span class="countdown-unit">{{ t('product.day') }}</span>
          </span>
          <span class="countdown-item">
            <span class="countdown-number">{{ formatCountdown(countdownHours) }}</span>
            <span class="countdown-unit">{{ t('product.hour_short') }}</span>
          </span>
          <span class="countdown-separator">:</span>
          <span class="countdown-item">
            <span class="countdown-number">{{ formatCountdown(countdownMinutes) }}</span>
            <span class="countdown-unit">{{ t('product.minute_short') }}</span>
          </span>
          <span class="countdown-separator">:</span>
          <span class="countdown-item">
            <span class="countdown-number">{{ formatCountdown(countdownSeconds) }}</span>
            <span class="countdown-unit">{{ t('product.second_short') }}</span>
          </span>
        </div>
      </div>
      <img :src="(imgSrc as any)" :alt="(title as any)" @error="onErr" />
      
      <!-- promo below image -->
      <div v-if="promoText" class="chip" :class="promoTone">{{ promoText }}</div>
      
      <!-- add/qty area bottom-left; lock if out of stock -->
    </div>

    <div class="info">
      <!-- Brand and Title -->
      <div class="rating d-flex align-items-center justify-content-between ">
        <div class="stars" aria-label="rating">
          <b class="rating-num">{{ (rating as any)?.toFixed ? (rating as any).toFixed(1) : rating }}</b>
          <span class="star" :class="{ on: true }">★</span>
          <span class="count">({{ reviewsCount }})</span>
        </div>
        <div class="cart-ctrl" :class="{ oos: !inStock, busy: (isBusy as any) }">
          <template v-if="inStock">
            <template v-if="qty > 0">
              <button class="ctrl-btn" v-if="qty > 1" @click="dec" :disabled="(isBusy as any)" aria-label="Minus">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13H5v-2h14v2Z"/></svg>
              </button>
              <button class="ctrl-btn" v-else @click="dec" :disabled="(isBusy as any)" aria-label="Remove">
                <svg width="18" fill="#000000" viewBox="0 0 64 64" data-name="Layer 1" id="Layer_1" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><title></title><path d="M50.86,13.38H13a1.5,1.5,0,0,1,0-3H50.86a1.5,1.5,0,0,1,0,3Z"></path><path d="M42.4,57.93H21.48a5.5,5.5,0,0,1-5.5-5.5V11.87a1.5,1.5,0,0,1,1.5-1.5H46.4a1.5,1.5,0,0,1,1.5,1.5V52.43A5.51,5.51,0,0,1,42.4,57.93ZM19,13.37V52.43a2.5,2.5,0,0,0,2.5,2.5H42.4a2.5,2.5,0,0,0,2.5-2.5V13.37Z"></path><path d="M40,13.37H23.9a1.5,1.5,0,0,1-1.5-1.5V6.57a1.5,1.5,0,0,1,1.5-1.5H40a1.5,1.5,0,0,1,1.5,1.5v5.3A1.5,1.5,0,0,1,40,13.37Zm-14.58-3H38.48V8.07H25.4Z"></path><path d="M24.94,47.61a1.5,1.5,0,0,1-1.5-1.5V21.46a1.5,1.5,0,0,1,3,0V46.11A1.5,1.5,0,0,1,24.94,47.61Z"></path><path d="M38.94,47.61a1.5,1.5,0,0,1-1.5-1.5V21.46a1.5,1.5,0,0,1,3,0V46.11A1.5,1.5,0,0,1,38.94,47.61Z"></path><path d="M31.94,40.38a1.5,1.5,0,0,1-1.5-1.5V28.7a1.5,1.5,0,1,1,3,0V38.88A1.5,1.5,0,0,1,31.94,40.38Z"></path></g></svg>           
              </button>
              <span class="qty">{{ qty }}</span>
              <button class="ctrl-btn" @click="inc" :disabled="(isBusy as any)" aria-label="Plus">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M11 11V6h2v5h5v2h-5v5h-2v-5H6v-2z"/></svg>
              </button>
            </template>
            <template v-else>
          <button class="ctrl-btn" @click="handleAdd" :disabled="(isBusy as any)" aria-label="Add to cart">
            <svg v-if="!isBusy" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M7.5 18C8.32843 18 9 18.6716 9 19.5C9 20.3284 8.32843 21 7.5 21C6.67157 21 6 20.3284 6 19.5C6 18.6716 6.67157 18 7.5 18Z" stroke="#000000" stroke-width="1.5"></path> <path d="M16.5 18.0001C17.3284 18.0001 18 18.6716 18 19.5001C18 20.3285 17.3284 21.0001 16.5 21.0001C15.6716 21.0001 15 20.3285 15 19.5001C15 18.6716 15.6716 18.0001 16.5 18.0001Z" stroke="#000000" stroke-width="1.5"></path> <path d="M13 13V11M13 11V9M13 11H15M13 11H11" stroke="#000000" stroke-width="1.5" stroke-linecap="round"></path> <path d="M2 3L2.26121 3.09184C3.5628 3.54945 4.2136 3.77826 4.58584 4.32298C4.95808 4.86771 4.95808 5.59126 4.95808 7.03836V9.76C4.95808 12.7016 5.02132 13.6723 5.88772 14.5862C6.75412 15.5 8.14857 15.5 10.9375 15.5H12M16.2404 15.5C17.8014 15.5 18.5819 15.5 19.1336 15.0504C19.6853 14.6008 19.8429 13.8364 20.158 12.3075L20.6578 9.88275C21.0049 8.14369 21.1784 7.27417 20.7345 6.69708C20.2906 6.12 18.7738 6.12 17.0888 6.12H11.0235M4.95808 6.12H7" stroke="#000000" stroke-width="1.5" stroke-linecap="round"></path> </g></svg>
            <div v-else class="mini-spin"></div>
          </button>
            </template>
          </template>
          <template v-else>
            <span class="lock" :title="t('product.unavailable')">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17a2 2 0 0 0 2-2v-2a2 2 0 1 0-4 0v2a2 2 0 0 0 2 2m6-6h-1V9a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2m-3 0H9V9a3 3 0 0 1 6 0z"/></svg>
            </span>
          </template>
        </div>

      </div>
      <div v-if="productColors.length > 0" class="color-pallete-container d-flex align-items-center">
        
        <div 
          v-for="(color, index) in visibleColors" 
          :key="`color-${index}-${color.hex || color.code || index}`"
          class="color-pallete"
          :class="{ 'has-image': color.image && !color.originalName }"
          :style="(color.image) 
            ? { 
                backgroundImage: `url(${color.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: '#' + (color.hex || color.code),
                borderColor: '#e5e7eb'
              }
            : { 
                backgroundColor: '#' + (color.hex || color.code),
                borderColor: '#' + color.hex && '#' + color.hex !== '#FFFFFF' && '#' + color.hex !== '#ffffff' ? 'rgba(0,0,0,0.1)' : '#e5e7eb'
              }"
          :title="color.name || color.code || `Color ${index + 1}`"
        >
      </div>
        <div v-if="remainingColorsCount > 0" class="color-pallete-num">
          <span>{{ remainingColorsCount }}+</span>
        </div>
      </div>
      <div class="brand" v-if="brandName">{{ brandName }}</div>
      <div class="meta">

      </div>
      <div class="title">{{ title }}</div>
      
      <!-- Pricing -->
      <div class="pricing-section">
        <div v-if="hasDiscount" class="old-price-row">
          <span class="old">{{ formatPrice((oldPrice as any)) }} 
          </span>
          <svg width="14" height="14" viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.41566 9.76641C6.24628 10.1389 6.13432 10.5431 6.09143 10.967L9.67578 10.2113C9.84515 9.83893 9.95703 9.43463 10 9.01074L6.41566 9.76641Z" fill="#808080" fill-opacity="0.6"/>
            <path d="M9.67525 7.94574C9.84462 7.57335 9.95658 7.16905 9.99948 6.74516L7.20738 7.3341V6.20194L9.67516 5.68183C9.84454 5.30944 9.9565 4.90515 9.99939 4.48126L7.2073 5.0697V0.998106C6.77947 1.23635 6.39951 1.55347 6.09065 1.92753V5.30517L4.974 5.54057V0.444336C4.54616 0.682492 4.16621 0.999697 3.85734 1.37376V5.77587L1.35883 6.30243C1.18946 6.67482 1.07741 7.07911 1.03443 7.503L3.85734 6.90803V8.33379L0.832042 8.97138C0.662666 9.34377 0.550705 9.74806 0.507812 10.172L3.67446 9.50455C3.93224 9.45138 4.1538 9.30023 4.29784 9.09222L4.87859 8.23832V8.23815C4.93887 8.14981 4.974 8.04329 4.974 7.92857V6.67264L6.09065 6.43725V8.70157L9.67516 7.94557L9.67525 7.94574Z" fill="#808080" fill-opacity="0.6"/>
          </svg>
          <!-- <span class="save-amount">حفظ {{ formatPrice((oldPrice as any) - (finalPrice as any)) }} <img src="../images/Saudi_Riyal_Symbol.svg" alt="ر.س" class="currency-icon" /></span> -->
        </div>
        <div class="price-row">
          <span v-if="hasDiscount" style="color: red;" class="price final">{{ formatPrice((finalPrice as any)) }} <img src="../images/Group 1171274840.png" alt="ر.س" class="currency-icon" /></span>
          <span v-else class="price final">{{ formatPrice((basePrice as any)) }} <img src="../images/Saudi_Riyal_Symbol.svg" alt="ر.س" class="currency-icon" /></span>
          <div v-if="hasDiscount" class="badge">-{{ discountPercent }}%</div>
        </div>

      </div>
    </div>
    
    <!-- Success Toast Message -->
    <teleport to="body">
      <Transition name="slide-fade">
        <div v-if="showSuccessMessage" class="success-toast">
          <div class="success-content">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>{{ successMessage || t('product.cart_added_successfully') }}</span>
          </div>
        </div>
      </Transition>
    </teleport>
  </NuxtLink>
</template>

<style scoped>
html[dir="ltr"] .rating {
  flex-direction: row-reverse;
}
html[dir="ltr"] .color-pallete-container {
  flex-direction: row-reverse;
}
html[dir="ltr"] .brand {
  text-align: left;
}
html[dir="ltr"] .title {
  text-align: left;
}
html[dir="ltr"] .price-row {
  flex-direction: row-reverse;
}
.card { 
  display: block; 
  text-decoration: none;
  border: 1px solid #e5e7eb; 
  border-radius: 12px; 
  overflow: hidden; 
  background: #fff; 
  transition: transform 0.2s ease, box-shadow 0.2s ease; 
  direction: rtl;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.card:hover { 
  transform: translateY(-2px); 
}

.thumb { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  overflow: hidden; 
  position: relative;
}
img { 
  aspect-ratio: 16 / 13; 
  width: 100%; 
  height: auto; 
  object-fit: contain; 
}

.badge { 
  background: #F987873D; 
  color: var(--secondary-color); 
  font-size: 11px; 
  padding: 10px; 
  border-radius: 20px;
  display: inline-block;
  min-width: 32px;
  text-align: center;
}

.chip { 
  position: absolute; 
  left: 50%;
  transform: translateX(-50%);
  bottom: 10px; 
  text-align: center; 
  padding: 6px 12px; 
  font-size: 12px; 
  font-weight: 700; 
  border-radius: 20px; 
  color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.chip.green { background: #10b981 }
.chip.pink { background: #ec4899 }
.chip.blue { background: #3b82f6 }
.swiper-slide:hover .card-tools {
  bottom: -12%;
}
.card-tools {
    position: absolute;
    left: 50%;
    bottom: -100px;
    transform: translate(-50%, -50%);
    transition: all 0.3s ease;
    z-index: 10;
    border-radius: 15px;
    padding-block: 3px;
    width: 80%;
    justify-content: space-around;
    flex-direction: row !important;
}
.fab { 
  width: 32px; 
  height: 32px; 
  border-radius: 50%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  color: #374151; 
  border:0; 
  cursor: pointer; 
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
  background-color: #fff;
}

.fab.wish svg {
  transition: fill 0.3s ease;
}
.fab.wish:hover {
  transform: scale(1.1);
}
.fab.wish.on { 
  color: #ef4444 !important; 
  border-color: #fecaca !important; 
  background: #fff0f0 !important;
  animation: wishlist-pulse 0.6s ease-out;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2) !important;
  transform: scale(1.05);
}
.fab.wish.on svg {
  fill: #ef4444 !important;
}
.fab.wish.on:hover {
  background: #fecaca !important;
  transform: scale(1.15);
  color: #dc2626 !important;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3) !important;
}
.fab.wish.on:hover svg {
  fill: #dc2626 !important;
}
.fab.wish.loading {
  pointer-events: none;
  opacity: 0.7;
  transform: scale(0.95);
  color: #6b7280 !important;
  border-color: #d1d5db !important;
  background: #f9fafb !important;
}
.wishlist-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f4f6;
  border-top: 2px solid #ef4444;
  border-radius: 50%;
  animation: wishlist-spin 1s linear infinite;
}
.fab.wish.on .wishlist-spinner {
  border-top-color: #ef4444;
}
@keyframes wishlist-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes wishlist-pulse {
  0% { 
    transform: scale(1.05); 
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
  }
  50% { 
    transform: scale(1.15); 
    box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
  }
  100% { 
    transform: scale(1.05); 
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
  }
}



.fab.compare-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
  color: #495057;
}

.fab.compare-btn.in-compare {
  background: #007bff;
  border-color: #007bff;
  color: white;
  animation: compare-pulse 0.6s ease-out;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
}

.fab.compare-btn.in-compare:hover {
  background: #0056b3;
  border-color: #0056b3;
}

.compare-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: compare-spin 1s linear infinite;
}

.fab.compare-btn.in-compare .compare-spinner {
  border-top-color: white;
}

@keyframes compare-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes compare-pulse {
  0% { 
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
  }
  50% { 
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
  }
  100% { 
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
  }
}

.cart-ctrl.oos { opacity: 0.75 }
.cart-ctrl.busy { opacity: 0.85 }

.ctrl-btn { 
  width: 40px; 
  height: 40px; 
  border-radius: 50%; 
  display: inline-flex; 
  align-items: center; 
  justify-content: center; 
  border: 1px solid #ffffff; 
  background: #F2F2F2; 
  cursor: pointer;
  transition: all 0.2s ease;
}
.ctrl-btn:hover {
  background: #f3f4f6;
}
.ctrl-btn[disabled] { 
  opacity: 0.5; 
  cursor: not-allowed; 
}

.qty { 
  min-width: 20px; 
  text-align: center; 
  font-weight: 700; 
  font-size: 14px;
}

.lock { 
  display: inline-flex; 
  align-items: center; 
  justify-content: center; 
  color: #6b7280; 
}

.mini-spin { 
  width: 14px; 
  height: 14px; 
  border-radius: 50%; 
  border: 2px solid #e5e7eb; 
  border-top-color: #9ca3af; 
  animation: spin 0.8s linear infinite; 
}

@keyframes spin { 
  to { transform: rotate(360deg) } 
}

.info { 
  padding:2px 16px 0 16px; 
}

.meta { 
  display: inline-block; 
  width : 50%;
  margin-bottom: 8px; 
}

.stars { 
  color: #f59e0b; 
  font-size: 14px; 
  display: flex; 
  align-items: center; 
  justify-content: flex-end;
  gap: 4px; 
}

.star {
  font-size: 16px;
}

.rating-num { 
  color: #111827; 
  font-weight: 700; 
  font-size: 10px; 
}

.count { 
  color: #6b7280; 
  font-size: 12px; 
}

.brand { 
  color: #6b7280; 
  font-weight: 700; 
  margin-bottom: 4px; 
  display: inline-block;
  text-decoration: none;
  transition: transform 0.2s ease;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  height: 40px;
}

.title { 
  font-weight: 400; 
  color: #111827; 
  line-height: 1.4; 
  display: -webkit-box; 
  -webkit-line-clamp: 2; 
  line-clamp: 2; 
  -webkit-box-orient: vertical; 
  overflow: hidden; 
  text-align: right;
  font-size: 14px;
  height: 40px;
}

.pricing-section {
  margin-bottom: 12px;
}

.price-row { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  margin-bottom: 4px;
}

.price.final { 
  color: #000000; 
  font-weight: 800; 
  font-size: 16px;
}
@media (max-width: 768px) {
  .price.final {
    font-size: 14px;
  }
}
.old-price-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.currency-icon {
  width: 16px;
  height: 16px;
  margin-right: 2px;
  vertical-align: middle;
  display: inline-block;
}

.old { 
  color: #9ca3af; 
  text-decoration: line-through; 
}

.save-amount {
  color: #10b981;
  font-size: 12px;
  font-weight: 600;
}

.add-to-cart-btn {
  width: 100%;
  background: #fff;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.add-to-cart-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.add-to-cart-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.grid .card:hover .card-tools {
  bottom: -15px;
}

  /* Success Toast Styles */
  .success-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
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

  .slide-fade-enter-active {
    transition: all 0.3s ease-out;
  }

  .slide-fade-leave-active {
    transition: all 0.3s ease-in;
  }

  .slide-fade-enter-from {
    transform: translateX(100%);
    opacity: 0;
  }

  .slide-fade-leave-to {
    transform: translateX(100%);
    opacity: 0;
  }

  /* RTL Support */
  [dir="rtl"] .success-toast {
    right: auto;
    left: 20px;
  }

  [dir="rtl"] .success-content {
    text-align: right;
  }

  /* Color Palette Styles */
  .color-pallete-container {
    margin-top: 8px;
    margin-bottom: 8px;
    gap: 8px;
  }

  .color-pallete {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid #e5e7eb;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    flex-shrink: 0;
    display: inline-block;
    position: relative;
    overflow: hidden;
  }

  .color-pallete.has-image {
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  .color-pallete:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .color-pallete-num {
    font-size: 12px;
    color: #6b7280;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
  }


  .status-card.most-popular {
    background-color: #15803d; /* أخضر غامق */
  }

  .status-card.best-offers {
    background-color: #dc2626; /* أحمر */
  }

  .status-card.best-selling {
    background-color: #f97316; /* برتقالي */
  }

  .status-card.new {
    background-color: #22c55e; /* أخضر فاتح */
  }

  .status-card.available {
    background-color: #10b981; /* أخضر افتراضي */
  }

  .status-card.out {
    background-color: #6b7280; /* رمادي */
  }

  .status-card.count-down {
    background-color: #ef4444; /* أحمر للعد التنازلي */
  }
</style>
