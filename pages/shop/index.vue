<script setup lang="ts">
// Shop page with filters + infinite scroll
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCatalog } from '../../composables/useCatalog'
import { useProducts } from '../../composables/useProducts'
import { useWishlist } from '../../composables/useWishlist'
import { useCart } from '../../composables/useCart'

// Translation
const { t } = useI18n()
const { filter, search } = useProducts()

const { categories, brands } = useCatalog()
const cart = useCart()
const wishlist = useWishlist()

// Modal state - global state for product modal
const selectedProductForModal = useState<any>('selectedProductForModal', () => null)

// Mobile filter state
const mobileFilterOpen = ref(false)

// Filter state
const route = useRoute()
const router = useRouter()
const q = ref<string>('')
const sort_by = ref<string>('latest')
const product_type = ref<string>('') // physical|digital|''
const price_min = ref<number | null>(null)
const price_max = ref<number | null>(null)
const category = ref<number[]>([]) // store selected ids (any level)
const brand = ref<number[]>([])

// Computed for best selling banner
const isBestSelling = computed(() => {
  return sort_by.value === 'best_selling' || route.query.sort === 'best_selling'
})

// Options data
const cats = ref<any[]>([])
const brandsResp = ref<any>({ total_size: 0, brands: [] })

// Computed for brands list
const brandsList = computed(() => {
  const resp = brandsResp.value
  if (!resp) return []
  
  // Handle different response structures
  if (Array.isArray(resp)) {
    return resp
  }
  if (Array.isArray(resp.brands)) {
    return resp.brands
  }
  if (Array.isArray(resp.data)) {
    return resp.data
  }
  return []
})

// Initialize with safe defaults
const items = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const loadingProgress = ref(0)

// Handle query parameters from navigation links
const initializeFromQuery = () => {
  // Handle sort parameter
  if (route.query.sort === 'newest') {
    sort_by.value = 'latest'
  } else if (route.query.sort === 'best_selling') {
    sort_by.value = 'best_selling'
  }
  
  // Handle discount filter
  if (route.query.has_discount === 'true') {
    console.log('عرض المنتجات المخفضة - سيتم تطبيق الفلتر في API')
  }
  
  // Handle category filter
  if (route.query.category) {
    const categoryId = Number(route.query.category)
    if (!isNaN(categoryId)) {
      category.value = [categoryId]
    }
  }
  
  // Handle brand filter
  if (route.query.brand) {
    const brandId = Number(route.query.brand)
    if (!isNaN(brandId)) {
      brand.value = [brandId]
    }
  }
}

// Fetch filter sources and initialize page
onMounted(async () => {
  // Initialize filters from query parameters
  initializeFromQuery()
  
  // Apply route query parameters
  const catParam = route.query.category
  if (Array.isArray(catParam)) {
    category.value = catParam.map(v => Number(v)).filter(n => !isNaN(n))
  } else if (typeof catParam === 'string' && catParam) {
    const n = Number(catParam)
    if (!isNaN(n)) category.value = [n]
  }
  
  const brandParam = route.query.brand
  if (Array.isArray(brandParam)) {
    brand.value = brandParam.map(v => Number(v)).filter(n => !isNaN(n))
  } else if (typeof brandParam === 'string' && brandParam) {
    const n = Number(brandParam)
    if (!isNaN(n)) brand.value = [n]
  }
  
    const searchParam = route.query.q
    if (typeof searchParam === 'string' && searchParam) {
      q.value = searchParam
    }
  
  // Fetch filter data - load in parallel for faster loading
  try { 
    const [categoriesData, brandsDataResult] = await Promise.all([
      categories().catch(() => []),
      brands({ limit: 100, offset: 1 }).catch(() => ({ total_size: 0, brands: [] }))
    ])
    cats.value = categoriesData
    const brandsData = brandsDataResult
    // Handle different response structures
    if (Array.isArray(brandsData)) {
      brandsResp.value = { total_size: brandsData.length, brands: brandsData }
    } else if (brandsData?.brands) {
      brandsResp.value = brandsData
    } else if (brandsData?.data) {
      brandsResp.value = { 
        total_size: brandsData.total_size || brandsData.total || brandsData.data.length,
        brands: Array.isArray(brandsData.data) ? brandsData.data : []
      }
    } else {
      brandsResp.value = { total_size: 0, brands: [] }
    }
  } catch (e) { 
    console.warn(t('shop.errors.brands_failed'), e)
    brandsResp.value = { total_size: 0, brands: [] }
  }
  // Load cart and wishlist in parallel (non-blocking)
  Promise.all([
    cart.list().catch(() => {}),
    wishlist.list().catch(() => {})
  ])
  
  // Load initial page of products
  await loadPage()
  
  // Setup infinite scroll after initial load
  setupInfiniteScroll()
})

onBeforeUnmount(() => {
  if (io) { 
    io.disconnect()
    io = null 
  }
})

// Results with pagination via infinite scroll
const limit = ref(24)
const offset = ref(1) // page-style offset used by backend
const done = computed(() => items.value.length >= total.value && total.value > 0)

// Build filter body for API
const buildBody = () => {
  const body: any = {
    limit: limit.value,
    offset: offset.value,
  }
  
  // Add search parameter if exists
  if (q.value && q.value.trim()) {
    body.search = q.value.trim()
  }
  
  // Add filters only if they have values
  if (category.value && category.value.length > 0) {
    body.category = JSON.stringify(category.value)
  }
  if (brand.value && brand.value.length > 0) {
    body.brand = JSON.stringify(brand.value)
  }
  if (sort_by.value && sort_by.value !== 'latest') {
    body.sort_by = sort_by.value
  }
  if (product_type.value) {
    body.product_type = product_type.value
  }
  if (price_min.value != null && price_min.value > 0) {
    body.price_min = Number(price_min.value)
  }
  if (price_max.value != null && price_max.value > 0) {
    body.price_max = Number(price_max.value)
  }
  
  // Handle discount filter from query
  if (route.query.has_discount === 'true') {
    body.has_discount = true
  }
  
  console.log('[shop] بناء الجسم - q.value:', q.value)
  console.log('[shop] بناء الجسم - search:', body.search)
  console.log('[shop] بناء الجسم - full body:', body)
  
  return body
}

// Load a page
const loadPage = async () => {
  if (loading.value || done.value) return
  loading.value = true
  loadingProgress.value = 0
  
  // Simulate progress
  const progressInterval = setInterval(() => {
    if (loadingProgress.value < 90) {
      loadingProgress.value += Math.random() * 30
    }
  }, 200)
  
  try {
    let res: any
    
    // If there's a search query, use search endpoint
    if (q.value && q.value.trim()) {
      console.log('[shop] استخدام نقطة البحث لـ:', q.value)
      res = await search(q.value.trim(), limit.value, offset.value)
    } else {
      // Otherwise use filter endpoint with minimal data
      const body = buildBody()
      
      // Ensure we have valid data before sending
      if (body.limit && body.offset !== undefined) {
      res = await filter(body)
      } else {
        res = { products: [], total_size: 0, offset: 1 }
      }
    }
    
    const list = Array.isArray(res?.products) ? res.products : []
    
    // On first page, reset items
    if (offset.value === 1) {
      items.value = []
    }
    
    // Add new items to existing ones
    items.value = items.value.concat(list)
    total.value = Number(res?.total_size || res?.total || 0)
    
    // Increment offset for next page
    offset.value = offset.value + 1
    
    // Complete progress
    loadingProgress.value = 100
    clearInterval(progressInterval)
  } catch (e) {
    console.error('[shop]', t('shop.errors.load_failed'), e)
    
    // Show user-friendly error message
    if (e && typeof e === 'object' && 'status' in e && e.status === 500) {
      console.error('[shop] خطأ في الخادم - يرجى المحاولة لاحقاً')
      // Set empty state on server error
      if (offset.value === 1) {
        items.value = []
        total.value = 0
      }
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
  setupInfiniteScroll()
}

// Fetch on any filter change, debounced
const filterKey = computed(() => JSON.stringify({
  q: q.value,
  sort: sort_by.value,
  type: product_type.value,
  min: price_min.value,
  max: price_max.value,
  category: [...category.value].sort(),
  brand: [...brand.value].sort(),
}))
let keyTimer: any
watch(filterKey, () => {
  clearTimeout(keyTimer)
  keyTimer = setTimeout(() => {
    resetAndFetch()
  }, 300)
})

// Infinite scroll sentinel
const sentinel = ref<HTMLElement | null>(null)
let io: IntersectionObserver | null = null

// Setup Intersection Observer for infinite scroll
const setupInfiniteScroll = () => {
  // Disconnect previous observer if exists
  if (io) {
    io.disconnect()
    io = null
  }

  // Wait for next tick to ensure sentinel is in DOM
  setTimeout(() => {
    if (sentinel.value) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && !loading.value && !done.value) {
              console.log('[shop] Sentry visible, loading next page...')
              loadPage()
            }
          }
        },
        { 
          rootMargin: '300px', // Load earlier
          threshold: 0.1 
        }
      )
      io.observe(sentinel.value)
      console.log('[shop] IntersectionObserver setup complete')
    } else {
      console.warn('[shop] Sentinel element not found')
    }
  }, 100)
}

// Re-setup observer when sentinel ref changes (after DOM is ready)
watch(sentinel, (newVal) => {
  if (newVal && !io && items.value.length > 0) {
    // Only setup if we have items loaded
    setupInfiniteScroll()
  }
})

// React to route query changes
watch(() => route.query, (qobj) => {
  const catParam = qobj?.category as any
  let nextCats: number[] = []
  if (Array.isArray(catParam)) {
    nextCats = catParam.map(v => Number(v)).filter(n => !isNaN(n))
  } else if (typeof catParam === 'string' && catParam) {
    const n = Number(catParam)
    if (!isNaN(n)) nextCats = [n]
  }
  // Only update if different
  if (JSON.stringify(nextCats) !== JSON.stringify(category.value)) {
    category.value = nextCats
    resetAndFetch()
  }
  
  const brandParam = qobj?.brand as any
  let nextBrands: number[] = []
  if (Array.isArray(brandParam)) {
    nextBrands = brandParam.map(v => Number(v)).filter(n => !isNaN(n))
  } else if (typeof brandParam === 'string' && brandParam) {
    const n = Number(brandParam)
    if (!isNaN(n)) nextBrands = [n]
  }
  // Only update if different
  if (JSON.stringify(nextBrands) !== JSON.stringify(brand.value)) {
    brand.value = nextBrands
    resetAndFetch()
  }
  
  const searchParam = qobj?.q as any
  if (typeof searchParam === 'string' && searchParam !== q.value) {
    q.value = searchParam
    resetAndFetch()
  }
}, { deep: true })

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
  const parts = [] as string[]
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
    console.log(t('shop.success.added_to_cart'), product.name || product.product_name)
  } catch (error) {
    console.error(t('shop.errors.add_to_cart_failed'), error)
    alert(t('shop.errors.add_to_cart_failed'))
  }
}

const handleUpdateCart = async (payload: { product: any; qty: number }) => {
  try {
    await cart.updateByProduct(payload.product, payload.qty)
    console.log(t('shop.success.cart_updated'), payload.product.name || payload.product.product_name, t('shop.debug.quantity'), payload.qty)
  } catch (error) {
    console.error(t('shop.errors.update_cart_failed'), error)
    alert(t('shop.errors.update_cart_failed'))
  }
}

const handleRemoveFromCart = async (product: any) => {
  try {
    await cart.removeByProduct(product)
    console.log(t('shop.success.removed_from_cart'), product.name || product.product_name)
  } catch (error) {
    console.error(t('shop.errors.remove_from_cart_failed'), error)
    alert(t('shop.errors.remove_from_cart_failed'))
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

// Helper functions for modal
const cfg = useRuntimeConfig() as any
const assetBase = (cfg?.public?.apiBase || 'https://gotawfeer.com/project/api').replace(/\/api(?:\/v\d+)?$/, '')

const fixPath = (s: string) => {
  let p = s.trim().replace(/\\/g, '/')
  if (p.startsWith('public/')) {
    p = p.replace(/^public\//, '')
  } else if (p.startsWith('app/public/')) {
    p = p.replace(/^app\/public\//, 'storage/')
  } else if (p.startsWith('storage/')) {
    // Already correct format
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

// Success message state
const showSuccessMessage = ref(false)

// Function to show success message
const showSuccessToast = () => {
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
    showSuccessToast()
    
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
    alert('حدث خطأ في إضافة المنتج للسلة')
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
  <div class="shop container" dir="rtl">
    <!-- Desktop Sidebar -->
    <aside class="desktop-sidebar">
      <div class="box">
        <input v-model="q" type="search" :placeholder="t('shop.search_placeholder')" class="search" />
      </div>

      <div class="box">
        <div class="box-title">{{ t('shop.price') }}</div>
        <div class="row">
          <input class="num" type="number" v-model.number="price_min" :placeholder="t('shop.min_price')" />
          <span>-</span>
          <input class="num" type="number" v-model.number="price_max" :placeholder="t('shop.max_price')" />
        </div>
        <div class="subtle" v-if="priceRangeText">{{ t('shop.price_range') }}: {{ priceRangeText }}</div>
      </div>

      <div class="box">
        <div class="box-title">{{ t('shop.categories') }}</div>
        <div class="list">
          <label v-for="c in flatCategories" :key="c.id" class="chk" :style="{ paddingInlineStart: (8 + c.depth*12) + 'px' }">
            <input type="checkbox" :value="c.id" v-model="category" /> {{ c.name }}
          </label>
        </div>
      </div>

      <div class="box">
        <div class="box-title">{{ t('shop.brands') }}</div>
        <div class="list" v-if="brandsList.length > 0">
          <label v-for="b in brandsList" :key="b.id" class="chk">
            <input type="checkbox" :value="b.id" v-model="brand" /> {{ b.name }}
          </label>
        </div>
        <div v-else class="empty-list">
          <p style="padding: 12px; color: #6b7280; font-size: 14px; text-align: center;">
            {{ t('shop.no_brands') || 'لا توجد براندات متاحة' }}
          </p>
        </div>
      </div>
    </aside>

    <main class="content">
      <!-- Mobile Filter Toggle Button -->
      <button class="mobile-filter-btn" @click="mobileFilterOpen = !mobileFilterOpen">
        <svg width="20" height="20" viewBox="0 0 24 24" class="filter-icon">
          <path fill="currentColor" d="M3 17h18v-2H3v2zm0-5h18V7H3v5zm0-7v2h18V5H3z"/>
        </svg>
        <span>{{ t('shop.filter') }}</span>
      </button>

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

    <!-- Mobile Filter Popup -->
    <div v-if="mobileFilterOpen" class="mobile-filter-overlay" @click="mobileFilterOpen = false">
      <div class="mobile-filter-popup" @click.stop>
        <!-- Header -->
        <div class="popup-header">
          <h3>{{ t('shop.filter') }}</h3>
          <button class="close-btn" @click="mobileFilterOpen = false">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="popup-content">
          <!-- Search -->
          <div class="filter-group">
            <input v-model="q" type="search" :placeholder="t('shop.search_placeholder')" class="filter-input" />
          </div>
          
          <!-- Price Range -->
          <div class="filter-group">
            <label class="filter-label">{{ t('shop.price') }}</label>
            <div class="price-range">
              <input class="price-input" type="number" v-model.number="price_min" :placeholder="t('shop.min_price')" />
              <span class="price-separator">-</span>
              <input class="price-input" type="number" v-model.number="price_max" :placeholder="t('shop.max_price')" />
            </div>
          </div>
          
          <!-- Categories -->
          <div class="filter-group">
            <label class="filter-label">{{ t('shop.categories') }}</label>
            <div class="filter-options">
              <label v-for="c in flatCategories" :key="c.id" class="filter-option" :style="{ paddingInlineStart: (8 + c.depth*12) + 'px' }">
                <input type="checkbox" :value="c.id" v-model="category" />
                <span>{{ c.name }}</span>
              </label>
            </div>
          </div>
          
          <!-- Brands -->
          <div class="filter-group">
            <label class="filter-label">{{ t('shop.brands') }}</label>
            <div class="filter-options" v-if="brandsList.length > 0">
              <label v-for="b in brandsList" :key="b.id" class="filter-option">
                <input type="checkbox" :value="b.id" v-model="brand" />
                <span>{{ b.name }}</span>
              </label>
            </div>
            <div v-else class="empty-message">
              <p style="padding: 12px; color: #6b7280; font-size: 14px; text-align: center;">
                {{ t('shop.no_brands') || 'لا توجد براندات متاحة' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="popup-actions">
          <button class="btn-clear" @click="clearFilters">
            {{ t('shop.clear_filters') }}
          </button>
          <button class="btn-apply" @click="mobileFilterOpen = false">
            {{ t('shop.apply_filters') }}
          </button>
        </div>
      </div>
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
.shop { 
  display: grid; 
  grid-template-columns: 280px 1fr; 
  gap: 16px; 
  padding: 16px; 
  position: relative 
}

@media (max-width: 900px) { 
  .shop { 
    grid-template-columns: 1fr; 
  } 
}

/* Desktop Sidebar */
.desktop-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: sticky;
  top: 20px;
  height: fit-content;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
  padding: 16px;
}

@media (max-width: 900px) {
  .desktop-sidebar {
    display: none;
  }
}

/* Mobile Filter Button */
.mobile-filter-btn {
  display: none;
  position: absolute;
  top: 20px;
  right: 16px;
  z-index: 1000;
  background: #F58040;
  color: white;
  border: none;
  border-radius: 25px;
  padding: 12px 20px;
  box-shadow: 0 4px 12px rgba(245, 128, 64, 0.3);
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.mobile-filter-btn:hover {
  background: #e6733a;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(245, 128, 64, 0.4);
}

.mobile-filter-btn .filter-icon {
  width: 20px;
  height: 20px;
}

@media (max-width: 900px) {
  .mobile-filter-btn {
    display: flex;
  }
  
  .shop {
    padding-top: 80px;
  }
}

.filter-group {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.filter-group:last-of-type {
  border-bottom: none;
}

.filter-label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
  font-size: 14px;
}

.filter-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.filter-input:focus {
  outline: none;
  border-color: #F58040;
  box-shadow: 0 0 0 3px rgba(245, 128, 64, 0.1);
}

.price-range {
  display: flex;
  align-items: center;
  gap: 12px;
}

.price-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.price-input:focus {
  outline: none;
  border-color: #F58040;
  box-shadow: 0 0 0 3px rgba(245, 128, 64, 0.1);
}

.price-separator {
  color: #6b7280;
  font-weight: 500;
}

.filter-options {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px;
  background: #fafafa;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  cursor: pointer;
  color: #374151;
  font-size: 14px;
  transition: color 0.2s ease;
}

.filter-option:hover {
  color: #F58040;
}

.filter-option input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #F58040;
}

.filter-actions {
  padding: 20px;
  display: flex;
  gap: 12px;
  background: #f8f9fa;
  border-top: 1px solid #e5e7eb;
}

.btn-clear {
  flex: 1;
  padding: 12px 20px;
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear:hover {
  background: #f3f4f6;
  color: #374151;
}

.btn-apply {
  flex: 1;
  padding: 12px 20px;
  background: #F58040;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-apply:hover {
  background: #e6733a;
}

/* Mobile Filter Popup */
.mobile-filter-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.mobile-filter-popup {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8f9fa;
}

.popup-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: #6b7280;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.popup-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.popup-actions {
  padding: 20px;
  display: flex;
  gap: 12px;
  background: #f8f9fa;
  border-top: 1px solid #e5e7eb;
}

/* Desktop Sidebar Styles */
.box { 
  border: 1px solid #eee; 
  border-radius: 12px; 
  background: #fff; 
  padding: 12px 
}

.box-title { 
  font-weight: 800; 
  margin-bottom: 8px; 
  color: #111827 
}

.search { 
  width: 100%; 
  border: 1px solid #e5e7eb; 
  border-radius: 8px; 
  padding: 10px 12px 
}

.select { 
  width: 100%; 
  border: 1px solid #e5e7eb; 
  border-radius: 8px; 
  padding: 8px 12px; 
  background: #fff 
}

.select.small { 
  width: auto 
}

.chk { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  padding: 6px 0; 
  color: #111827 
}

.row { 
  display: flex; 
  align-items: center; 
}

.num { 
  width: 100%; 
  border: 1px solid #e5e7eb; 
  border-radius: 8px; 
  padding: 8px 10px 
}

.subtle { 
  color: #6b7280; 
  font-size: 12px; 
  margin-top: 6px 
}

.list { 
  max-height: 280px; 
  overflow: auto; 
  border: 1px dashed #eee; 
  border-radius: 8px; 
  padding: 8px 
}

.content { display:flex; flex-direction:column; gap:12px }
.toolbar { display:flex; align-items:center; gap:12px; padding:8px 0 }
.spacer { flex:1 }
.grid { display:grid; grid-template-columns: repeat(5, 1fr); gap:12px }
@media (max-width: 1200px){ .grid { grid-template-columns: repeat(4, 1fr) } }
@media (max-width: 900px){ .grid { grid-template-columns: repeat(3, 1fr) } }
@media (max-width: 640px){ 
  .grid { grid-template-columns: repeat(2, 1fr) } 
}
@media (max-width: 768px){ 
  .price-range {
    flex-direction: column;
    align-items: flex-start;
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

/* Loading Spinner */
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

/* Spinner Animation */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Pulse Animation for Loading */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-text {
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

@keyframes progress-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
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

/* Skeleton Animations */
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.search-results-header { margin-bottom: 20px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb }
.search-results-header h2 { margin: 0 0 8px 0; color: #111827; font-size: 1.25rem; font-weight: 600 }
.search-results-header p { margin: 0; color: #6b7280; font-size: 0.875rem }

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

.offers-header { 
  margin-bottom: 20px; 
  padding: 16px; 
  background: linear-gradient(135deg, #F58040 0%, #ff6b35 100%); 
  border-radius: 12px; 
  color: white;
  text-align: center;
}
.offers-header h2 { 
  margin: 0 0 8px 0; 
  font-size: 1.5rem; 
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.offers-header p { 
  margin: 0; 
  font-size: 1rem; 
  opacity: 0.9;
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
</style>
