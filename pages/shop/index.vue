<script setup lang="ts">
// Ultra-optimized Shop page with SSR-friendly data fetching and instant SPA navigation
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCatalog } from '../../composables/useCatalog'
import { useProducts } from '../../composables/useProducts'
import { useWishlist } from '../../composables/useWishlist'
import { useCart } from '../../composables/useCart'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { filter, search } = useProducts()
const { categories, brands } = useCatalog()
const cart = useCart()
const wishlist = useWishlist()

// Modal state - global state for product modal
const selectedProductForModal = useState<any>('selectedProductForModal', () => null)

// Filter state - initialized from route query for SSR
const q = ref<string>((route.query.q as string) || '')
const sort_by = ref<string>((route.query.sort as string) || 'latest')
const product_type = ref<string>('')
const price_min = ref<number | null>(route.query.price_min ? Number(route.query.price_min) : null)
const price_max = ref<number | null>(route.query.price_max ? Number(route.query.price_max) : null)
// Initialize category from route query
const getInitialCategory = (): number[] => {
  const catParam = route.query.category
  if (Array.isArray(catParam)) {
    return catParam.map(v => Number(v)).filter(n => !isNaN(n))
  } else if (typeof catParam === 'string' && catParam) {
    const n = Number(catParam)
    return !isNaN(n) ? [n] : []
  }
  return []
}

// Initialize brand from route query
const getInitialBrand = (): number[] => {
  const brandParam = route.query.brand
  if (Array.isArray(brandParam)) {
    return brandParam.map(v => Number(v)).filter(n => !isNaN(n))
  } else if (typeof brandParam === 'string' && brandParam) {
    const n = Number(brandParam)
    return !isNaN(n) ? [n] : []
  }
  return []
}

const category = ref<number[]>(getInitialCategory())
const brand = ref<number[]>(getInitialBrand())

// UI state
const mobileFilterOpen = ref(false)
const filterDrawerOpen = ref(false)

// Products state
const items = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const loadingProgress = ref(0)
const limit = ref(24)
const offset = ref(1)
const done = computed(() => items.value.length >= total.value && total.value > 0)

// Computed for best selling banner
const isBestSelling = computed(() => {
  return sort_by.value === 'best_selling' || route.query.sort === 'best_selling'
})

// SSR-friendly data fetching using useAsyncData
// This ensures data is fetched on server and hydrated on client
const { data: categoriesData } = await useAsyncData(
  'shop-categories',
  () => categories().catch(() => [])
)

const { data: brandsData } = await useAsyncData(
  'shop-brands',
  () => brands({ limit: 100, offset: 1 }).catch(() => ({ total_size: 0, brands: [] }))
)

// Normalize categories and brands data
const cats = computed(() => {
  const data = categoriesData.value
  return Array.isArray(data) ? data : []
})

const brandsList = computed(() => {
  const resp = brandsData.value
  if (!resp) return []
  if (Array.isArray(resp)) return resp
  if (Array.isArray(resp.brands)) return resp.brands
  if (Array.isArray(resp.data)) return resp.data
  return []
})

// Build filter body for API
const buildBody = () => {
  const body: any = {
    limit: limit.value || 24,
    offset: offset.value || 1,
  }
  
  // Only add search if query exists
  if (q.value?.trim()) {
    body.search = q.value.trim()
  }
  
  // Only add category if array has items
  if (Array.isArray(category.value) && category.value.length > 0) {
    body.category = JSON.stringify(category.value)
  }
  
  // Only add brand if array has items
  if (Array.isArray(brand.value) && brand.value.length > 0) {
    body.brand = JSON.stringify(brand.value)
  }
  
  // Only add sort_by if it's not default
  if (sort_by.value && sort_by.value !== 'latest' && sort_by.value !== 'newest') {
    body.sort_by = sort_by.value
  }
  
  // Only add product_type if it exists
  if (product_type.value && product_type.value.trim()) {
    body.product_type = product_type.value.trim()
  }
  
  // Only add price filters if they're valid numbers
  if (price_min.value != null && !isNaN(Number(price_min.value)) && Number(price_min.value) > 0) {
    body.price_min = Number(price_min.value)
  }
  if (price_max.value != null && !isNaN(Number(price_max.value)) && Number(price_max.value) > 0) {
    body.price_max = Number(price_max.value)
  }
  
  // Only add has_discount if explicitly set
  if (route.query.has_discount === 'true') {
    body.has_discount = true
  }
  
  return body
}

// Load products page
const loadPage = async () => {
  if (loading.value || done.value) return
  
  loading.value = true
  loadingProgress.value = 0
  
  // Lightweight progress simulation
  const progressInterval = setInterval(() => {
    if (loadingProgress.value < 90) {
      loadingProgress.value += Math.random() * 30
    }
  }, 80)
  
  try {
    let res: any
    
    if (q.value?.trim()) {
      res = await search(q.value.trim(), limit.value, offset.value)
    } else {
      const body = buildBody()
      
      // Validate body before sending
      if (!body || typeof body !== 'object') {
        console.warn('[shop] Invalid filter body:', body)
        res = { products: [], total_size: 0, offset: 1 }
      } else if (body.limit && body.offset !== undefined) {
        // Log body for debugging (only in development)
        if (process.env.NODE_ENV === 'development') {
          console.log('[shop] Filter body:', JSON.stringify(body, null, 2))
        }
        res = await filter(body)
      } else {
        res = { products: [], total_size: 0, offset: 1 }
      }
    }
    
    const list = Array.isArray(res?.products) ? res.products : []
    
    if (offset.value === 1) {
      items.value = []
    }
    
    items.value = items.value.concat(list)
    total.value = Number(res?.total_size || res?.total || 0)
    offset.value = offset.value + 1
    
    loadingProgress.value = 100
    clearInterval(progressInterval)
  } catch (e: any) {
    // Better error handling - don't spam console with 500 errors
    const statusCode = e?.statusCode || e?.status || e?.response?.status
    const errorMessage = e?.message || 'Unknown error'
    
    // Only log non-500 errors or log 500 errors once
    if (statusCode !== 500) {
      console.error('[shop] Load failed:', {
        statusCode,
        error: errorMessage,
        offset: offset.value,
        body: buildBody()
      })
    } else {
      // Log 500 errors with reduced frequency
      console.warn('[shop] Server error (500) - this may be a backend issue:', {
        offset: offset.value,
        hasFilters: category.value.length > 0 || brand.value.length > 0 || q.value?.trim()
      })
    }
    
    if (offset.value === 1) {
      items.value = []
      total.value = 0
    }
    clearInterval(progressInterval)
  } finally {
    loading.value = false
    loadingProgress.value = 0
  }
}

// Reset and fetch from first page
const resetAndFetch = async () => {
  offset.value = 1
  total.value = 0
  items.value = []
  await loadPage()
  // Re-setup observer after reset
  await nextTick()
  setupInfiniteScroll()
}

// Infinite scroll sentinel
const sentinel = ref<HTMLElement | null>(null)
let io: IntersectionObserver | null = null

// Setup Intersection Observer for infinite scroll
const setupInfiniteScroll = () => {
  if (io) {
    io.disconnect()
    io = null
  }

  if (!sentinel.value) return

  io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !loading.value && !done.value) {
          loadPage()
        }
      }
    },
    { 
      rootMargin: '300px',
      threshold: 0.1 
    }
  )
  
  io.observe(sentinel.value)
}

// Watch for filter changes (debounced) - optimized to use single watcher
let filterDebounceTimer: any
const watchFilters = () => {
  clearTimeout(filterDebounceTimer)
  filterDebounceTimer = setTimeout(() => {
    resetAndFetch()
  }, 300)
}

// Watch filter values - single optimized watcher
watch([q, sort_by, product_type, price_min, price_max, category, brand], () => {
  watchFilters()
}, { deep: true })

// Watch route.fullPath for navigation changes - CRITICAL for SPA navigation
// This ensures page reloads when navigating via router
// IMPORTANT: Only watch when we're on the shop page to avoid blocking navigation to other pages
let routeWatchTimer: any
const stopRouteWatcher = watch(() => route.fullPath, async (newPath, oldPath) => {
  // Only react if we're still on the shop page
  // Check if new path is still a shop route (handles both /shop and /en/shop)
  const isShopRoute = newPath.includes('/shop') || newPath.match(/^\/?(en\/)?shop(\/|$)/)
  
  // If we're leaving the shop page, stop watching and allow navigation
  if (!isShopRoute) {
    return // Don't interfere with navigation to other pages
  }
  
  // Only react to actual route changes (not initial load)
  if (oldPath && newPath !== oldPath && isShopRoute) {
    // Update filters from new route query
    const newQuery = route.query
    
    // Update search
    if (typeof newQuery.q === 'string') {
      q.value = newQuery.q
    } else {
      q.value = ''
    }
    
    // Update category
    const catParam = newQuery.category
    if (Array.isArray(catParam)) {
      category.value = catParam.map(v => Number(v)).filter(n => !isNaN(n))
    } else if (typeof catParam === 'string' && catParam) {
      const n = Number(catParam)
      category.value = !isNaN(n) ? [n] : []
    } else {
      category.value = []
    }
    
    // Update brand
    const brandParam = newQuery.brand
    if (Array.isArray(brandParam)) {
      brand.value = brandParam.map(v => Number(v)).filter(n => !isNaN(n))
    } else if (typeof brandParam === 'string' && brandParam) {
      const n = Number(brandParam)
      brand.value = !isNaN(n) ? [n] : []
    } else {
      brand.value = []
    }
    
    // Update price range
    price_min.value = newQuery.price_min ? Number(newQuery.price_min) : null
    price_max.value = newQuery.price_max ? Number(newQuery.price_max) : null
    
    // Update sort
    if (typeof newQuery.sort === 'string') {
      sort_by.value = newQuery.sort === 'newest' ? 'latest' : newQuery.sort
    }
    
    // Reset and reload products
    clearTimeout(routeWatchTimer)
    routeWatchTimer = setTimeout(() => {
      resetAndFetch()
    }, 100) // Small delay to ensure DOM is ready
  }
})

// Initialize page on mount
onMounted(async () => {
  // Load initial products
  await loadPage()
  
  // Setup infinite scroll after products load
  await nextTick()
  setupInfiniteScroll()
  
  // Load cart and wishlist in background (non-blocking)
  // Use silent error handling to prevent console spam
  Promise.all([
    cart.list().catch((e) => {
      // Only log if it's not a timeout (timeouts are expected if API is slow)
      if (!e?.message?.includes('timeout') && !e?.message?.includes('Timeout')) {
        console.warn('[Shop] Cart load failed:', e)
      }
    }),
    wishlist.list().catch((e) => {
      if (!e?.message?.includes('timeout') && !e?.message?.includes('Timeout')) {
        console.warn('[Shop] Wishlist load failed:', e)
      }
    })
  ])
  
  // Setup escape key handler
  if (process.client) {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && filterDrawerOpen.value) {
        filterDrawerOpen.value = false
      }
    }
    document.addEventListener('keydown', handleEscape)
    
    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleEscape)
    })
  }
})

// Cleanup on unmount
onBeforeUnmount(() => {
  // Stop route watcher to allow navigation
  if (stopRouteWatcher) {
    stopRouteWatcher()
  }
  
  if (io) {
    io.disconnect()
    io = null
  }
  clearTimeout(filterDebounceTimer)
  clearTimeout(routeWatchTimer)
})

// Helpers for rendering categories (flat checklist from tree)
type FlatCat = { id: number | string; name: string; depth: number }
const flatCategories = computed<FlatCat[]>(() => {
  const res: FlatCat[] = []
  const walk = (arr: any[], depth = 0) => {
    for (const c of arr || []) {
      res.push({ id: c.id, name: c.name, depth })
      if (Array.isArray(c.childes) && c.childes.length) walk(c.childes, depth + 1)
    }
  }
  walk(cats.value)
  return res
})

const priceRangeText = computed(() => {
  const parts: string[] = []
  if (price_min.value != null) parts.push(String(price_min.value))
  if (price_max.value != null) parts.push(String(price_max.value))
  return parts.length ? parts.join(' - ') : ''
})

// Cart event handlers
const handleAddToCart = async (product: any) => {
  try {
    await cart.add({
      product_id: product.id || product.product_id,
      quantity: 1,
      variant: product.variant,
      color: product.color
    })
  } catch (error) {
    console.error('Add to cart failed:', error)
  }
}

const handleUpdateCart = async (payload: { product: any; qty: number }) => {
  try {
    await cart.updateByProduct(payload.product, payload.qty)
  } catch (error) {
    console.error('Update cart failed:', error)
  }
}

const handleRemoveFromCart = async (product: any) => {
  try {
    await cart.removeByProduct(product)
  } catch (error) {
    console.error('Remove from cart failed:', error)
  }
}

// Clear all filters
const clearFilters = () => {
  q.value = ''
  price_min.value = null
  price_max.value = null
  category.value = []
  brand.value = []
  sort_by.value = 'latest'
  resetAndFetch()
}

// Apply filters and close drawer
const applyFilters = () => {
  resetAndFetch()
  filterDrawerOpen.value = false
}

// Helper functions for modal (same as before)
const cfg = useRuntimeConfig() as any
const assetBase = (cfg?.public?.apiBase || 'https://gotawfeer.com/project/api').replace(/\/api(?:\/v\d+)?$/, '')

const fixPath = (s: string) => {
  let p = s.trim().replace(/\\/g, '/')
  if (p.startsWith('public/')) {
    p = p.replace(/^public\//, '')
  } else if (p.startsWith('app/public/')) {
    p = p.replace(/^app\/public\//, 'storage/')
  } else if (!p.startsWith('http') && !p.startsWith('/')) {
    if (p.includes('product')) {
      p = `storage/product/${p}`
    } else {
      p = `storage/${p}`
    }
  }
  p = p.replace(/\/+/g, '/').replace(/^\//, '')
  return p
}

const toSrc = (u: any): string => {
  if (!u) return ''
  if (Array.isArray(u)) return toSrc(u[0])
  let s: any = u
  if (typeof u === 'string') {
    const t = u.trim()
    if (t.startsWith('[') || t.startsWith('{')) {
      try { return toSrc(JSON.parse(t)) } catch {}
    }
    s = t
  } else if (typeof u === 'object') {
    s = (u as any).path || (u as any).url || (u as any).image || ''
  }
  s = (typeof s === 'string' ? s : '').trim()
  if (!s) return ''
  if (/^(https?:|data:|blob:)/i.test(s)) return s
  return `${assetBase}/${fixPath(s)}`
}

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
  return toSrc(raw)
}

const getProductTitle = (product: any): string => {
  if (!product) return 'Product'
  return product?.name || product?.product_name || product?.product?.name || product?.product?.product_name || 'Product'
}

const getProductPrice = (product: any): { final: number; old: number; hasDiscount: boolean; discountPercent: number } => {
  if (!product) return { final: 0, old: 0, hasDiscount: false, discountPercent: 0 }
  
  const basePrice = Number(product?.unit_price ?? product?.price ?? product?.product?.unit_price ?? product?.product?.price ?? 0)
  const discount = Number(product?.discount ?? product?.product?.discount ?? 0)
  const discountType = product?.discount_type || product?.product?.discount_type || 'flat'
  
  const isPercent = String(discountType).toLowerCase().startsWith('per')
  const diff = discount && basePrice ? (isPercent ? (basePrice * discount) / 100 : discount) : 0
  const finalPrice = Math.max(0, basePrice - diff)
  const hasDiscount = finalPrice > 0 && finalPrice < basePrice
  const discountPercent = basePrice && discount ? Math.max(0, Math.round(isPercent ? discount : (discount / basePrice) * 100)) : 0
  
  return { final: finalPrice, old: basePrice, hasDiscount, discountPercent }
}

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
        brandImage = toSrc(imgSrc)
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

const getProductLink = (product: any): string => {
  if (!product) return '#'
  const slug = product?.slug || product?.product?.slug
  return slug ? `/product/${encodeURIComponent(String(slug))}` : '#'
}

const formatPrice = (n: number): string => {
  if (!isFinite(n) || n <= 0) return '0'
  try { 
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) 
  } catch { 
    return String(n) 
  }
}

const placeholderImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="16">No image</text></svg>'

const onImgErr = (e: any) => {
  e.target.src = placeholderImage
}

// Computed properties for modal
const modalProductImage = computed(() => getProductImage(selectedProductForModal.value))
const modalProductTitle = computed(() => getProductTitle(selectedProductForModal.value))
const modalProductPrice = computed(() => getProductPrice(selectedProductForModal.value))
const modalProductBrand = computed(() => getProductBrand(selectedProductForModal.value))
const modalProductCategories = computed(() => getProductCategories(selectedProductForModal.value))
const modalProductLink = computed(() => getProductLink(selectedProductForModal.value))

// Share functions - avoid hydration mismatch by ensuring consistent output
const shareUrl = computed(() => {
  // Return empty string on server to avoid hydration mismatch
  if (!process.client) return ''
  
  // Only compute URL if modal product link is valid
  if (modalProductLink.value && modalProductLink.value !== '#') {
    try {
      return window.location.origin + modalProductLink.value
    } catch (e) {
      return ''
    }
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
  
  const hasColors = (product?.colors_formatted && Array.isArray(product.colors_formatted) && product.colors_formatted.length > 0) ||
                    (product?.colors && Array.isArray(product.colors) && product.colors.length > 0) ||
                    (product?.product?.colors_formatted && Array.isArray(product.product.colors_formatted) && product.product.colors_formatted.length > 0) ||
                    (product?.product?.colors && Array.isArray(product.product.colors) && product.product.colors.length > 0)
  
  const hasSizes = (product?.choice_options && Array.isArray(product.choice_options)) ||
                  (product?.product?.choice_options && Array.isArray(product.product.choice_options))
  
  const hasVariations = (product?.variation && Array.isArray(product.variation) && product.variation.length > 0) ||
                        (product?.product?.variation && Array.isArray(product.product.variation) && product.product.variation.length > 0)
  
  return hasColors || hasSizes || hasVariations
})

// Loading state for modal add to cart
const isAddingToCart = ref(false)
const showSuccessMessage = ref(false)

const showSuccessToast = () => {
  showSuccessMessage.value = true
  setTimeout(() => {
    showSuccessMessage.value = false
  }, 3000)
}

const openCartDropdown = () => {
  if (process.client) {
    const event = new CustomEvent('open-cart')
    window.dispatchEvent(event)
  }
}

const handleModalAddToCart = async () => {
  if (!selectedProductForModal.value || isAddingToCart.value) return
  
  try {
    isAddingToCart.value = true
    const product = selectedProductForModal.value
    const productId = product?.id || product?.product_id
    if (!productId) return
    
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
    showSuccessToast()
    openCartDropdown()
    
    if (process.client) {
      const modalElement = document.getElementById('exampleModal')
      if (modalElement) {
        const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement)
        if (modal) {
          modal.hide()
        }
      }
    }
  } catch (error: any) {
    console.error('Add to cart failed:', error)
  } finally {
    isAddingToCart.value = false
  }
}

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
  <div class="shop container" dir="rtl">
    <!-- Filter Toggle Button -->
    <button 
      class="filter-toggle-btn" 
      @click="filterDrawerOpen = !filterDrawerOpen"
      :class="{ active: filterDrawerOpen }"
    >
      <svg v-if="!filterDrawerOpen" class="filter-icon" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="122.88px" height="117.824px" viewBox="0 0 122.88 117.824" enable-background="new 0 0 122.88 117.824" xml:space="preserve"><g><path fill-rule="evenodd" clip-rule="evenodd" d="M122.774,16.459L122.774,16.459c0,5.393-4.412,9.805-9.805,9.805H92.202 c1.457-2.919,2.278-6.212,2.278-9.697c0-3.571-0.861-6.941-2.387-9.913h20.876C118.362,6.654,122.774,11.066,122.774,16.459 L122.774,16.459z M89.306,101.257c0,9.15-7.418,16.567-16.568,16.567s-16.567-7.417-16.567-16.567 c0-9.149,7.417-16.567,16.567-16.567S89.306,92.107,89.306,101.257L89.306,101.257z M122.869,101.148L122.869,101.148 c0,5.393-4.413,9.805-9.806,9.805H92.202c1.457-2.919,2.278-6.212,2.278-9.696c0-3.571-0.861-6.941-2.387-9.913h20.97 C118.457,91.344,122.869,95.756,122.869,101.148L122.869,101.148z M53.272,110.953H9.816c-5.393,0-9.805-4.412-9.805-9.805l0,0 c0-5.393,4.412-9.805,9.805-9.805h43.565c-1.525,2.972-2.387,6.342-2.387,9.913C50.994,104.741,51.815,108.034,53.272,110.953 L53.272,110.953z M28.326,58.717c0,9.149,7.418,16.567,16.568,16.567c9.149,0,16.567-7.418,16.567-16.567 c0-9.15-7.418-16.568-16.567-16.568C35.744,42.148,28.326,49.566,28.326,58.717L28.326,58.717z M0,58.608L0,58.608 c0,5.393,4.414,9.805,9.805,9.805h15.675c-1.457-2.92-2.278-6.169-2.278-9.696c0-3.528,0.861-6.941,2.387-9.914H9.805 C4.412,48.803,0,53.215,0,58.608L0,58.608z M64.409,68.413h48.666c5.392,0,9.805-4.412,9.805-9.805l0,0 c0-5.394-4.412-9.806-9.805-9.806H64.301c1.525,2.973,2.387,6.386,2.387,9.914C66.688,62.244,65.866,65.493,64.409,68.413 L64.409,68.413z M89.306,16.567c0,9.15-7.418,16.567-16.568,16.567S56.17,25.718,56.17,16.567C56.17,7.417,63.587,0,72.737,0 S89.306,7.417,89.306,16.567L89.306,16.567z M53.272,26.264H9.853c-5.393,0-9.805-4.413-9.805-9.805l0,0 c0-5.393,4.412-9.805,9.805-9.805h43.528c-1.525,2.972-2.387,6.342-2.387,9.913C50.994,20.052,51.815,23.345,53.272,26.264 L53.272,26.264z"/></g></svg>
      <svg v-else class="close-icon" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
      </svg>
    </button>

    <!-- Overlay -->
    <div 
      v-if="filterDrawerOpen" 
      class="filter-overlay" 
      @click="filterDrawerOpen = false"
    ></div>

    <!-- Filter Drawer -->
    <div class="filter-drawer" :class="{ active: filterDrawerOpen }">
      <div class="drawer-header">
        <h3>
          <svg class="header-icon" fill="currentColor" viewBox="0 0 24 24" width="20" height="20">
            <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
          </svg>
          {{ t('shop.filter') }}
        </h3>
        <button class="close-drawer-btn" @click="filterDrawerOpen = false">
          <svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20">
            <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
          </svg>
        </button>
      </div>

      <div class="drawer-content">
        <!-- Search -->
        <div class="filter-section">
          <div class="filter-title">
            <svg class="filter-title-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            {{ t('search.title') }}
          </div>
          <div class="search-wrapper">
            <input 
              v-model="q" 
              type="search" 
              :placeholder="t('shop.search_placeholder')" 
              class="search-input"
            />
            <svg class="search-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </div>
        </div>

        <!-- Sort By -->
        <div class="filter-section">
          <div class="filter-title">
            <svg class="filter-title-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
            </svg>
            {{ t('shop.sort_by') }}
          </div>
          <select v-model="sort_by" class="sort-select">
            <option value="latest">{{ t('shop.sort_options.latest') }}</option>
            <option value="price_low">{{ t('shop.sort_options.low_high') }}</option>
            <option value="price_high">{{ t('shop.sort_options.high_low') }}</option>
            <option value="a-z">{{ t('shop.sort_options.a_z') }}</option>
            <option value="z-a">{{ t('shop.sort_options.z_a') }}</option>
          </select>
        </div>

        <!-- Price Range -->
        <div class="filter-section">
          <div class="filter-title">
            <svg class="filter-title-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1.81.45 1.61 1.67 1.61 1.16 0 1.6-.64 1.6-1.46 0-.84-.68-1.22-1.88-1.54-2.57-.72-3.58-1.74-3.58-3.36 0-1.58 1.16-2.81 3.12-3.17V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.63-1.63-1.63-1.01 0-1.46.54-1.46 1.28 0 .64.5 1.02 1.88 1.37 2.51.68 3.58 1.52 3.58 3.4 0 1.71-1.2 3.06-3.26 3.33z"/>
            </svg>
            {{ t('shop.price') }}
          </div>
          <div class="price-range">
            <input 
              class="price-input" 
              type="number" 
              v-model.number="price_min" 
              :placeholder="t('shop.min_price')"
            />
            <span class="price-separator">-</span>
            <input 
              class="price-input" 
              type="number" 
              v-model.number="price_max" 
              :placeholder="t('shop.max_price')"
            />
          </div>
          <div class="price-hint" v-if="priceRangeText">
            {{ t('shop.price_range') }}: {{ priceRangeText }}
          </div>
        </div>

        <!-- Categories -->
        <div class="filter-section">
          <div class="filter-title">
            <svg class="filter-title-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l-5.5 9h11z M12 22l5.5-9v-11z M3.5 9l5.5 9v-11z M20.5 9l-5.5 9v-11z"/>
            </svg>
            {{ t('shop.categories') }}
          </div>
          <div class="filter-options">
            <label 
              v-for="c in flatCategories" 
              :key="c.id" 
              class="filter-option"
              :class="{ selected: category.includes(Number(c.id)) }"
              :style="{ paddingInlineStart: (10 + c.depth*16) + 'px' }"
            >
              <input 
                type="checkbox" 
                :value="Number(c.id)" 
                v-model="category"
                class="filter-checkbox"
              />
              <span class="filter-option-label">{{ c.name }}</span>
            </label>
          </div>
        </div>

        <!-- Brands -->
        <div class="filter-section">
          <div class="filter-title">
            <svg class="filter-title-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 7h5v2H5zm0 4h5v2H5zm0 4h5v2H5zm7-8h7v10h-7z"/>
            </svg>
            {{ t('shop.brands') }}
          </div>
          <div class="filter-options" v-if="brandsList.length > 0">
            <label 
              v-for="b in brandsList" 
              :key="b.id" 
              class="filter-option"
              :class="{ selected: brand.includes(Number(b.id)) }"
            >
              <input 
                type="checkbox" 
                :value="Number(b.id)" 
                v-model="brand"
                class="filter-checkbox"
              />
              <span class="filter-option-label">{{ b.name }}</span>
            </label>
          </div>
          <div v-else class="no-items-message">
            {{ t('shop.no_brands') || 'لا توجد علامات تجارية' }}
          </div>
        </div>
      </div>

      <div class="drawer-footer">
        <button class="btn-clear" @click="clearFilters">
          {{ t('shop.clear_filters') }}
        </button>
        <button class="btn-apply" @click="applyFilters">
          {{ t('shop.apply_filters') }}
        </button>
      </div>
    </div>

    <main class="content">
      <div class="toolbar">
        <div class="result">{{ t('shop.results') }}: {{ items.length }} / {{ total }}</div>
        <div class="spacer" />
        <select v-model="sort_by" class="select small">
          <option value="latest">{{ t('shop.sort_options.latest') }}</option>
          <option value="low-high">{{ t('shop.sort_options.low_high') }}</option>
          <option value="high-low">{{ t('shop.sort_options.high_low') }}</option>
          <option value="a-z">{{ t('shop.sort_options.a_z') }}</option>
          <option value="z-a">{{ t('shop.sort_options.z_a') }}</option>
        </select>
      </div>

      <div v-if="q" class="search-results-header">
        <h2>{{ t('shop.search_results.title') }}: "{{ q }}"</h2>
        <p v-if="items.length > 0">{{ items.length }} {{ t('shop.search_results.products_count') }}</p>
      </div>
      
      <!-- Best Selling Banner -->
      <div v-if="isBestSelling" class="best-selling-banner">
        <img src="/images/الافضل-مبيعا-جو-توفير.png" alt="الأفضل مبيعاً" class="banner-image" />
      </div>
      
      <!-- Offers Header -->
      <div v-if="route.query.has_discount === 'true' ">
        <img src="/images/خصومات2-جوتوفير.png" width="100%" height="auto" alt="العروض" class="banner-image" />
      </div>

      <div class="grid">
        <!-- Product Cards -->
        <ProductCard 
          v-for="p in items" 
          :key="p.id || p.slug" 
          :product="p" 
          :qty="cart.qtyOf(p)"
          :busy="cart.loading.value"
          @add="handleAddToCart"
          @update="handleUpdateCart"
          @remove="handleRemoveFromCart"
        />
        
        <!-- Skeleton Loading Cards -->
        <div v-if="loading && items.length > 0" v-for="n in 6" :key="`skeleton-${n}`" class="skeleton-card">
          <div class="skeleton-image"></div>
          <div class="skeleton-content">
            <div class="skeleton-title"></div>
            <div class="skeleton-price"></div>
            <div class="skeleton-button"></div>
          </div>
        </div>
      </div>

      <div ref="sentinel" class="sentinel">
        <!-- Loading Spinner -->
        <div v-if="loading && !done" class="loading-container">
          <div class="loading-spinner"></div>
          <div class="loading-progress">
            <div class="progress-bar" :style="{ width: loadingProgress + '%' }"></div>
          </div>
          <span class="loading-text">{{ t('shop.loading') }}</span>
        </div>
        
        <!-- No More Results -->
        <div v-else-if="done" class="no-more-results">
          <div class="no-more-icon">✓</div>
          <span>{{ t('shop.no_more_results') }}</span>
        </div>
        
        <!-- Initial Loading -->
        <div v-else-if="items.length === 0 && !loading" class="initial-loading">
          <div class="loading-spinner"></div>
          <span>{{ t('shop.loading_products') }}</span>
        </div>
      </div>
    </main>

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
                    <strong class="me-2">البراند:</strong>
                    <NuxtLink :to="modalProductBrand.id ? `/brand/${modalProductBrand.id}` : '#'" class="text-decoration-none d-flex align-items-center gap-2">
                      <picture>
                        <img class="cover-image-class" :src="modalProductBrand.image" :alt="modalProductBrand.name" @error="(e: any) => { e.target.src = '/images/Group 1171274840.png' }">
                      </picture>
                      <span class="brand-name">{{ modalProductBrand.name }}</span>
                    </NuxtLink>
                  </div>
                  <h5 class="price final mt-3">
                    {{ formatPrice(modalProductPrice.final) }} 
                    <img src="/images/Group 1171274840.png" alt="ر.س" class="currency-icon" />
                  </h5>
                </div>
                <div class="buttons d-flex align-items-center gap-2">
                  <template v-if="hasProductOptions">
                    <NuxtLink :to="modalProductLink" class="main-btn" @click="handleProductDetails">تحديد خيارات</NuxtLink>
                  </template>
                  <template v-else>
                    <a href="#" class="main-btn" @click.prevent="handleModalAddToCart" :disabled="isAddingToCart">
                      <span v-if="!isAddingToCart">إضافة إلى السلة</span>
                      <span v-else class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    </a>
                  </template>
                  <NuxtLink :to="modalProductLink" class="second-btn" @click="handleProductDetails">تفاصيل المنتج</NuxtLink>
                </div>
                <div v-if="modalProductCategories.length > 0" class="cat border-top mt-3 pt-3">
                  <strong class="d-block mb-2">التصنيفات:</strong>
                  <ul class="d-flex align-items-center gap-2 p-0 m-0 list-unstyled flex-wrap">
                    <li v-for="(cat, index) in modalProductCategories" :key="index">
                      <NuxtLink class="text-decoration-none category-badge" :to="`/category/${cat.id}`">
                        {{ cat.name }}
                      </NuxtLink>
                    </li>
                  </ul>
                </div>
                <strong class="mt-4 mb-2 d-block">مشاركة</strong>
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
    
    <!-- Success Toast Message -->
    <teleport to="body">
      <Transition name="slide-fade">
        <div v-if="showSuccessMessage" class="success-toast">
          <div class="success-content">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>تم إضافة السلة بنجاح</span>
          </div>
        </div>
      </Transition>
    </teleport>
  </div>
</template>

<style scoped>
/* Keep all existing styles - they're already optimized */
.shop { 
  display: block;
  padding: 16px; 
  position: relative 
}

.content { 
  display:flex; 
  flex-direction:column; 
  gap:12px 
}

.toolbar { 
  display:flex; 
  align-items:center; 
  gap:12px; 
  padding:8px 0 
}

.spacer { 
  flex:1 
}

.grid { 
  display:grid; 
  grid-template-columns: repeat(7, 1fr); 
  gap:12px 
}

@media (max-width: 1200px){ 
  .grid { 
    grid-template-columns: repeat(4, 1fr) 
  } 
}

@media (max-width: 900px){ 
  .grid { 
    grid-template-columns: repeat(3, 1fr) 
  } 
}

@media (max-width: 640px){ 
  .grid { 
    grid-template-columns: repeat(2, 1fr) 
  } 
}

.sentinel { 
  text-align:center; 
  padding:32px 16px; 
  color:#6b7280;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Filter Toggle Button */
.filter-toggle-btn {
  position: fixed;
  top: 100px;
  right: 20px;
  z-index: 999;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #F58040 0%, #ff6b35 100%);
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(245, 128, 64, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.filter-toggle-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(245, 128, 64, 0.4);
}

.filter-toggle-btn.active {
  background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
}

.filter-icon, .close-icon {
  width: 24px;
  height: 24px;
}

/* Overlay */
.filter-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

/* Filter Drawer */
.filter-drawer {
  position: fixed;
  top: 0;
  right: -320px;
  width: 430px;
  height: 100vh;
  background: white;
  z-index: 1001;
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: -5px 0 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.filter-drawer.active {
  right: 0;
}

/* RTL Support */
[dir="rtl"] .filter-drawer {
  right: auto;
  left: -100%;
}

[dir="rtl"] .filter-drawer.active {
  left: 0;
}

[dir="rtl"] .filter-toggle-btn {
  right: auto;
  left: 20px;
}

/* Drawer Header */
.drawer-header {
  padding: 20px;
  background: #1a1a1a;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.drawer-header h3 {
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.header-icon {
  width: 20px;
  height: 20px;
}

.close-drawer-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-drawer-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

/* Drawer Content */
.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.drawer-content::-webkit-scrollbar {
  width: 6px;
}

.drawer-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.drawer-content::-webkit-scrollbar-thumb {
  background: #F58040;
  border-radius: 3px;
}

/* Filter Sections */
.filter-section {
  margin-bottom: 25px;
  padding-bottom: 25px;
  border-bottom: 1px solid #e5e7eb;
}

.filter-section:last-child {
  border-bottom: none;
}

.filter-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-title-icon {
  width: 20px;
  height: 20px;
  opacity: 0.6;
}

/* Search Input */
.search-wrapper {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  opacity: 0.5;
  pointer-events: none;
}

.search-input:focus {
  outline: none;
  border-color: #F58040;
  box-shadow: 0 0 0 3px rgba(245, 128, 64, 0.1);
}

/* Sort Select */
.sort-select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-select:focus {
  outline: none;
  border-color: #F58040;
  box-shadow: 0 0 0 3px rgba(245, 128, 64, 0.1);
}

/* Price Range */
.price-range {
  display: flex;
  align-items: center;
  gap: 10px;
}

.price-input {
  flex: 1;
  padding: 10px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.price-input:focus {
  outline: none;
  border-color: #F58040;
  box-shadow: 0 0 0 3px rgba(245, 128, 64, 0.1);
}

.price-separator {
  color: #9ca3af;
  font-weight: 500;
}

.price-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

/* Filter Options */
.filter-options {
  max-height: 250px;
  overflow-y: auto;
  padding: 5px;
}

.filter-options::-webkit-scrollbar {
  width: 4px;
}

.filter-options::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 2px;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  margin-bottom: 5px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-option:hover {
  background: #f9fafb;
}

.filter-option.selected {
  background: rgba(245, 128, 64, 0.05);
}

.filter-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #F58040;
  cursor: pointer;
}

.filter-option-label {
  flex: 1;
  font-size: 14px;
  color: #4b5563;
  cursor: pointer;
  user-select: none;
}

.filter-option.selected .filter-option-label {
  color: #F58040;
  font-weight: 500;
}

.no-items-message {
  padding: 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  background: #f9fafb;
  border-radius: 8px;
}

/* Drawer Footer */
.drawer-footer {
  padding: 20px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 10px;
}

.btn-clear, .btn-apply {
  flex: 1;
  padding: 12px 20px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear {
  background: white;
  color: #6b7280;
  border: 2px solid #e5e7eb;
}

.btn-clear:hover {
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}

.btn-apply {
  background: #1a1a1a;
  color: white;
  border: none;
}

.btn-apply:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 128, 64, 0.3);
}

/* Loading Container */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #F58040;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  animation: pulse 1.5s ease-in-out infinite;
}

/* Loading Progress Bar */
.loading-progress {
  width: 200px;
  height: 4px;
  background: #f3f4f6;
  border-radius: 2px;
  overflow: hidden;
  margin: 8px 0;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #F58040, #ff6b35);
  border-radius: 2px;
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

/* No More Results */
.no-more-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #9ca3af;
}

.no-more-icon {
  width: 32px;
  height: 32px;
  background: #10b981;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
}

/* Initial Loading */
.initial-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #6b7280;
}

/* Skeleton Loading */
.skeleton-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-image {
  width: 100%;
  height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 8px;
  margin-bottom: 12px;
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-title {
  height: 20px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 4px;
  width: 80%;
}

.skeleton-price {
  height: 16px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 4px;
  width: 60%;
}

.skeleton-button {
  height: 36px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 8px;
  width: 100%;
  margin-top: 8px;
}

/* Search Results Header */
.search-results-header { 
  margin-bottom: 20px; 
  padding: 16px; 
  background: #f9fafb; 
  border-radius: 8px; 
  border: 1px solid #e5e7eb 
}

.search-results-header h2 { 
  margin: 0 0 8px 0; 
  color: #111827; 
  font-size: 1.25rem; 
  font-weight: 600 
}

.search-results-header p { 
  margin: 0; 
  color: #6b7280; 
  font-size: 0.875rem 
}

/* Best Selling Banner */
.best-selling-banner {
  margin-bottom: 20px;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.best-selling-banner .banner-image {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
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
  width: 40px;
  height: 40px;
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

/* Animations */
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

@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Responsive Design */
@media (max-width: 768px) {
  .filter-drawer {
    width: 280px;
    right: -280px;
  }
  
  [dir="rtl"] .filter-drawer {
    left: -280px;
  }
}

@media (max-width: 480px) {
  .filter-drawer {
    width: 100%;
    right: -100%;
  }
  
  [dir="rtl"] .filter-drawer {
    left: -100%;
  }
  
  .filter-toggle-btn {
    width: 45px;
    height: 45px;
    right: 15px;
  }
  
  [dir="rtl"] .filter-toggle-btn {
    left: 15px;
  }
  
  .price-range {
    flex-direction: column;
    align-items: flex-start;
  }
}

.select {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  background: #fff;
}

.select.small {
  width: auto;
}

.result {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}
</style>
