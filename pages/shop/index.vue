<script setup lang="ts">
// Ultra-optimized Shop page with SSR-friendly data fetching and instant SPA navigation
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCatalog } from '../../composables/useCatalog'
import { useProducts } from '../../composables/useProducts'
import { useWishlist } from '../../composables/useWishlist'
import { useCart } from '../../composables/useCart'
import { useApi } from '../../composables/useApi'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { filter, search } = useProducts()
const { categories, brands } = useCatalog()
const cart = useCart()
const wishlist = useWishlist()

// Modal state - global state for product modal
const selectedProductForModal = useState<any>('selectedProductForModal', () => null)

// Search suggestions state
const searchSuggestions = ref<string[]>([])
const searchProducts = ref<any[]>([])
const showSuggestions = ref(false)
const searchLoading = ref(false)
const recentSearches = ref<string[]>([])

// Filter state - initialized from route query for SSR
const q = ref<string>((route.query.q as string) || '')
const sort_by = ref<string>((route.query.sort as string) || 'latest')
const product_type = ref<string>('')
const price_min = ref<number | null>(route.query.price_min ? Number(route.query.price_min) : null)
const price_max = ref<number | null>(route.query.price_max ? Number(route.query.price_max) : null)

// Price range slider configuration
const priceRangeMin = ref(0)
const priceRangeMax = ref(10000)
const priceRangeStep = ref(100)

// Slider values (synced with price_min and price_max)
const priceSliderMin = ref(0)
const priceSliderMax = ref(10000)

// Initialize slider values from price_min and price_max
const initializeSlider = () => {
  if (price_min.value != null && price_min.value > 0) {
    priceSliderMin.value = price_min.value
  } else {
    priceSliderMin.value = priceRangeMin.value
  }
  
  if (price_max.value != null && price_max.value > 0) {
    priceSliderMax.value = price_max.value
  } else {
    priceSliderMax.value = priceRangeMax.value
  }
}

// Debounce timer for slider updates
let sliderDebounceTimer: any

// Computed values for actual min/max (handles RTL correctly)
const actualMin = computed(() => Math.min(priceSliderMin.value, priceSliderMax.value))
const actualMax = computed(() => Math.max(priceSliderMin.value, priceSliderMax.value))

// Handle min slider input
const handleMinSliderInput = (e: Event) => {
  const value = Number((e.target as HTMLInputElement).value)
  priceSliderMin.value = value
  updatePriceFromSlider()
}

// Handle max slider input
const handleMaxSliderInput = (e: Event) => {
  const value = Number((e.target as HTMLInputElement).value)
  priceSliderMax.value = value
  updatePriceFromSlider()
}

// Update price_min and price_max from slider
const updatePriceFromSlider = () => {
  // Get current slider values
  const currentMin = priceSliderMin.value
  const currentMax = priceSliderMax.value
  
  // Ensure correct min/max order
  const actualMin = Math.min(currentMin, currentMax)
  const actualMax = Math.max(currentMin, currentMax)
  
  // Update slider values to ensure correct order
  if (currentMin !== actualMin || currentMax !== actualMax) {
    priceSliderMin.value = actualMin
    priceSliderMax.value = actualMax
  }
  
  // Ensure min doesn't exceed max (with minimum gap)
  const finalMin = Math.min(priceSliderMin.value, priceSliderMax.value)
  const finalMax = Math.max(priceSliderMin.value, priceSliderMax.value)
  
  if (finalMin >= finalMax) {
    if (finalMin === priceRangeMin.value) {
      priceSliderMax.value = Math.min(finalMin + priceRangeStep.value, priceRangeMax.value)
    } else {
      priceSliderMin.value = Math.max(finalMax - priceRangeStep.value, priceRangeMin.value)
    }
    // Recalculate after adjustment
    const adjustedMin = Math.min(priceSliderMin.value, priceSliderMax.value)
    const adjustedMax = Math.max(priceSliderMin.value, priceSliderMax.value)
    
    price_min.value = adjustedMin > priceRangeMin.value ? adjustedMin : null
    price_max.value = adjustedMax < priceRangeMax.value ? adjustedMax : null
    return
  }
  
  // Update price_min and price_max
  // Set values if they differ from default range
  // For min: only set if > 0 (not at minimum)
  // For max: only set if < max range (not at maximum) and > min (if min exists)
  const newMin = finalMin > priceRangeMin.value ? finalMin : null
  // For max: must be < max range, and if min exists, must be > min
  let newMax: number | null = null
  if (finalMax < priceRangeMax.value) {
    if (newMin != null) {
      // If min exists, max must be > min
      if (finalMax > finalMin) {
        newMax = finalMax
      }
    } else {
      // If no min, max can be any value < max range
      newMax = finalMax > priceRangeMin.value ? finalMax : null
    }
  }
  
  // Only update if values actually changed
  if (price_min.value !== newMin || price_max.value !== newMax) {
    price_min.value = newMin
    price_max.value = newMax
  }
}

// Watch price_min and price_max to sync with slider
watch([price_min, price_max], () => {
  if (price_min.value != null) {
    priceSliderMin.value = price_min.value
  } else {
    priceSliderMin.value = priceRangeMin.value
  }
  
  if (price_max.value != null) {
    priceSliderMax.value = price_max.value
  } else {
    priceSliderMax.value = priceRangeMax.value
  }
}, { deep: true })
// Initialize category from route query
const getInitialCategory = (): number[] => {
  const catParam = route.query.category
  if (Array.isArray(catParam)) {
    const result = catParam.map(v => Number(v)).filter(n => !isNaN(n))
    if (process.client && process.env.NODE_ENV === 'development') {
      console.log('[shop] Initial category from route (array):', result)
    }
    return result
  } else if (typeof catParam === 'string' && catParam) {
    const n = Number(catParam)
    const result = !isNaN(n) ? [n] : []
    if (process.client && process.env.NODE_ENV === 'development') {
      console.log('[shop] Initial category from route (string):', {
        param: catParam,
        parsed: n,
        result: result
      })
    }
    return result
  }
  if (process.client && process.env.NODE_ENV === 'development') {
    console.log('[shop] No category in route query')
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
const limit = ref(20)
const offset = ref(1)
const done = computed(() => items.value.length >= total.value && total.value > 0)

// Computed for best selling banner
const isBestSelling = computed(() => {
  return sort_by.value === 'best_selling' || route.query.sort === 'best_selling'
})

// SSR-friendly data fetching - load in background (non-blocking)
// This ensures page renders first, then data loads
const categoriesData = ref<any[]>([])
const brandsData = ref<any>({ total_size: 0, brands: [] })

// Load data in background (non-blocking)
if (process.client) {
  categories().then((data: any) => {
    categoriesData.value = Array.isArray(data) ? data : []
  }).catch(() => {
    categoriesData.value = []
  })
  
  brands({ limit: 100, offset: 1 }).then((data: any) => {
    brandsData.value = data || { total_size: 0, brands: [] }
  }).catch(() => {
    brandsData.value = { total_size: 0, brands: [] }
  })
} else {
  // SSR: use useAsyncData but don't await (let page render)
  useAsyncData('shop-categories', () => categories().catch(() => [])).then((result: any) => {
    if (result?.data?.value) {
      categoriesData.value = Array.isArray(result.data.value) ? result.data.value : []
    }
  })
  useAsyncData('shop-brands', () => brands({ limit: 100, offset: 1 }).catch(() => ({ total_size: 0, brands: [] }))).then((result: any) => {
    if (result?.data?.value) {
      brandsData.value = result.data.value || { total_size: 0, brands: [] }
    }
  })
}

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

// Helper function to encode string to base64 (works in both browser and SSR)
const encodeToBase64 = (str: string): string => {
  try {
    if (process.client && typeof btoa !== 'undefined') {
      // Browser environment - encode UTF-8 properly
      // btoa doesn't handle UTF-8 well, so we need to encode it first
      return btoa(unescape(encodeURIComponent(str)))
    } else {
      // Node.js environment (SSR) - use Buffer
      return Buffer.from(str, 'utf8').toString('base64')
    }
  } catch (e) {
    console.warn('[shop] Base64 encoding failed:', e)
    // Fallback: return original string (backend might handle it)
    return str
  }
}

// Fetch search suggestions
const fetchSearchSuggestions = async (term: string) => {
  if (!term || term.trim().length < 2) {
    searchSuggestions.value = []
    searchProducts.value = []
    showSuggestions.value = false
    return
  }
  
  searchLoading.value = true
  showSuggestions.value = true
  
  try {
    const { $post } = useApi()
    const body = {
      name: term.trim(),
      limit: 8,
      offset: 1
    }
    
    const res: any = await $post('v1/products/search', body)
    
    // Extract products
    const rawList = Array.isArray(res?.products)
      ? res.products
      : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.products?.data)
          ? res.products.data
          : (Array.isArray(res) ? res : [])
    
    // Normalize products
    const list = rawList.map((p: any) => ({
      ...p,
      name: p?.name || p?.product_name || p?.title || '',
      slug: p?.slug || p?.id,
      image_full_url: p?.image_full_url || p?.thumbnail || p?.image || p?.image_url,
      price: p?.price || p?.unit_price || p?.current_price || p?.selling_price,
    }))
    
    searchProducts.value = list.slice(0, 5)
    
    // Generate suggestions from product names
    const productNames = list
      .map((p: any) => p.name)
      .filter((name: string) => name && name.toLowerCase().includes(term.toLowerCase()))
      .slice(0, 3)
    
    // Add recent searches that match
    const matchingRecent = recentSearches.value
      .filter((s: string) => s.toLowerCase().includes(term.toLowerCase()))
      .slice(0, 2)
    
    searchSuggestions.value = Array.from(new Set([
      term.trim(),
      ...productNames,
      ...matchingRecent
    ])).slice(0, 5)
    
  } catch (e) {
    console.warn('[shop] Search suggestions failed:', e)
    searchSuggestions.value = []
    searchProducts.value = []
  } finally {
    searchLoading.value = false
  }
}

// Debounced search suggestions
let suggestionsDebounceTimer: any
const handleSearchInput = () => {
  clearTimeout(suggestionsDebounceTimer)
  suggestionsDebounceTimer = setTimeout(() => {
    if (q.value?.trim() && q.value.trim().length >= 2) {
      fetchSearchSuggestions(q.value.trim())
    } else {
      showSuggestions.value = false
      searchSuggestions.value = []
      searchProducts.value = []
    }
  }, 300)
}

// Handle search blur with delay
const handleSearchBlur = () => {
  if (process.client) {
    setTimeout(() => {
      showSuggestions.value = false
    }, 200)
  }
}

// Select suggestion
const selectSuggestion = (suggestion: string) => {
  q.value = suggestion
  showSuggestions.value = false
  // Trigger search
  router.replace({ path: route.path, query: { ...route.query, q: suggestion } })
  resetAndFetch()
  
  // Save to recent searches
  if (process.client) {
    recentSearches.value = [
      suggestion,
      ...recentSearches.value.filter((s: string) => s !== suggestion)
    ].slice(0, 10)
    localStorage.setItem('shop_recent_searches', JSON.stringify(recentSearches.value))
  }
}

// Select product from suggestions
const selectProduct = (product: any) => {
  showSuggestions.value = false
  navigateTo(`/product/${product.slug || product.id}`)
}

// Load recent searches from localStorage
onMounted(() => {
  if (process.client) {
    try {
      const stored = localStorage.getItem('shop_recent_searches')
      if (stored) {
        recentSearches.value = JSON.parse(stored)
      }
    } catch (e) {
      console.warn('[shop] Failed to load recent searches:', e)
    }
  }
})

// Build filter body for API
const buildBody = () => {
  const body: any = {
    limit: limit.value || 10,
    offset: offset.value || 1,
  }
  
  // Only add search if query exists (with base64 encoding as expected by backend)
  if (q.value?.trim()) {
    // Backend expects base64 encoded search string
    body.search = encodeToBase64(q.value.trim())
  }
  
  // Only add category if array has items
  if (Array.isArray(category.value) && category.value.length > 0) {
    body.category = JSON.stringify(category.value)
    // Log for debugging
    if (process.client && process.env.NODE_ENV === 'development') {
      console.log('[shop] Category filter:', {
        categoryIds: category.value,
        stringified: body.category
      })
    }
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
  // min_price: must be >= 0 and > priceRangeMin (0)
  if (price_min.value != null && !isNaN(Number(price_min.value)) && Number(price_min.value) > 0) {
    body.min_price = Number(price_min.value)
  }
  // max_price: must be > 0, < priceRangeMax, and > min_price (if min_price exists)
  if (price_max.value != null && !isNaN(Number(price_max.value)) && Number(price_max.value) > 0) {
    const maxValue = Number(price_max.value)
    // Only add max_price if it's less than the maximum range and greater than min_price (if exists)
    if (maxValue < priceRangeMax.value && (!price_min.value || maxValue > price_min.value)) {
      body.max_price = maxValue
    }
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
      // Use filter endpoint with search parameter (base64 encoded in buildBody)
      // This is more reliable and supports all filters including search
      const body = buildBody()
      
      // Log search query for debugging
      if (process.client) {
        console.log('[shop] Searching for:', q.value.trim())
        console.log('[shop] Search body:', { search: body.search, hasSearch: !!body.search })
      }
      
      res = await filter(body)
    } else {
      const body = buildBody()
      
      // Validate body before sending
      if (!body || typeof body !== 'object') {
        console.warn('[shop] Invalid filter body:', body)
        res = { products: [], total_size: 0, offset: 1 }
      } else if (body.limit && body.offset !== undefined) {
        // Log body for debugging
        if (process.client) {
          console.log('[shop] Filter body:', JSON.stringify(body, null, 2))
          if (body.search) {
            console.log('[shop] Search details:', {
              originalQuery: q.value,
              base64Encoded: body.search,
              decoded: process.client && typeof atob !== 'undefined' ? atob(body.search) : 'N/A (SSR)'
            })
          }
          console.log('[shop] Category filter details:', {
            categoryValue: category.value,
            categoryInBody: body.category,
            categoryParsed: body.category ? JSON.parse(body.category) : null
          })
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
    
    // Log response for debugging
    if (process.client) {
      console.log('[shop] API Response:', {
        productsCount: list.length,
        totalSize: total.value,
        categoryFilter: category.value,
        responseTotal: res?.total_size || res?.total
      })
    }
    
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

// Watch route.query.category directly to ensure it's synced
watch(() => route.query.category, (newCategoryParam) => {
  if (process.client) {
    const catParam = newCategoryParam
    let newCategory: number[] = []
    
    if (Array.isArray(catParam)) {
      newCategory = catParam.map(v => Number(v)).filter(n => !isNaN(n))
    } else if (typeof catParam === 'string' && catParam) {
      const n = Number(catParam)
      newCategory = !isNaN(n) ? [n] : []
    }
    
    // Only update if different to avoid infinite loops
    const currentCategoryStr = JSON.stringify(category.value.sort())
    const newCategoryStr = JSON.stringify(newCategory.sort())
    
    if (currentCategoryStr !== newCategoryStr) {
      category.value = newCategory
      if (process.env.NODE_ENV === 'development') {
        console.log('[shop] Category synced from route.query:', {
          from: category.value,
          to: newCategory
        })
      }
    }
  }
}, { immediate: true })

// Separate watcher for search with longer debounce for better UX
let searchDebounceTimer: any
watch(q, (newQ) => {
  // Clear existing timer
  clearTimeout(searchDebounceTimer)
  
  // If search is cleared, reset immediately
  if (!newQ?.trim()) {
    const query = { ...route.query }
    delete query.q
    router.replace({ path: route.path, query })
    resetAndFetch()
    return
  }
  
  // Debounce search input (longer delay for better UX)
  searchDebounceTimer = setTimeout(() => {
    // Update URL with search query
    const query = { ...route.query }
    if (newQ?.trim()) {
      query.q = newQ.trim()
    } else {
      delete query.q
    }
    
    // Navigate with new query (SPA navigation)
    router.replace({ path: route.path, query })
    
    // Reset and fetch with new search
    resetAndFetch()
  }, 500) // 500ms debounce for search
}, { immediate: false })

// Watch filter values - single optimized watcher (excluding q which has its own watcher)
watch([sort_by, product_type, price_min, price_max, category, brand], () => {
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
    
    // Log for debugging
    if (process.client && process.env.NODE_ENV === 'development') {
      console.log('[shop] Category updated from route:', {
        queryParam: catParam,
        categoryValue: category.value,
        willSendToAPI: category.value.length > 0 ? JSON.stringify(category.value) : 'none'
      })
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
  // Initialize price slider (non-blocking)
  initializeSlider()
  
  // Load initial products (non-blocking - page renders first)
  loadPage().catch(() => {})
  
  // Setup infinite scroll after products load (non-blocking)
  nextTick().then(() => {
    setupInfiniteScroll()
  })
  
  // Load cart and wishlist in background (non-blocking)
  // Use silent error handling to prevent console spam
  Promise.all([
    cart.list().catch((e) => {
      // Only log if it's not a timeout or 404 (these are expected)
      const statusCode = e?.statusCode || e?.status || e?.response?.status
      if (statusCode !== 404 && !e?.message?.includes('timeout') && !e?.message?.includes('Timeout')) {
        console.warn('[Shop] Cart load failed:', e)
      }
    }),
    wishlist.list().catch((e) => {
      // Only log if it's not a timeout or 404 (these are expected)
      const statusCode = e?.statusCode || e?.status || e?.response?.status
      if (statusCode !== 404 && !e?.message?.includes('timeout') && !e?.message?.includes('Timeout')) {
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

const getProductSku = (product: any): string => {
  if (!product) return ''
  // Use code as primary SKU, fallback to sku
  return product?.code || product?.product?.code || product?.sku || product?.product?.sku || ''
}

// Helper to normalize color code
const normalizeColorCode = (code: string | null | undefined): string => {
  if (!code) return ''
  return String(code).toUpperCase().replace(/^#/, '').trim()
}

// Helper to get color value for CSS
const getColorValue = (code: string | null | undefined): string => {
  if (!code) return '#000000'
  const normalized = normalizeColorCode(code)
  return normalized.startsWith('#') ? normalized : `#${normalized}`
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
      return null
    }
  }
  return null
}

// Helper to normalize image path
const normalizeImagePath = (imagePath: string | null | undefined, assetBase: string): string => {
  if (!imagePath || imagePath.trim() === '') return ''
  const trimmed = String(imagePath).trim()
  // If it's already a full URL, return as is
  if (/^(https?:|data:|blob:)/i.test(trimmed)) {
    return trimmed
  }
  // Otherwise build full URL
  const fixedPath = trimmed.replace(/^public\//, '').replace(/^storage\/app\/public\//, '').replace(/^storage\//, '')
  return `${assetBase}/storage/app/public/${fixedPath}`
}

// Get product colors
const getProductColors = (product: any): any[] => {
  if (!product) return []
  const cfg = useRuntimeConfig() as any
  const assetBase = (cfg?.public?.apiBase || 'https://gotawfeer.com/project/api').replace(/\/api(?:\/v\d+)?$/, '')
  
  // Try colors_formatted first
  if (product?.colors_formatted && Array.isArray(product.colors_formatted) && product.colors_formatted.length > 0) {
    return product.colors_formatted.map((color: any) => {
      const codeNormalized = normalizeColorCode(color.code)
      const hexCode = color.code && !color.code.startsWith('#') ? `#${color.code.toUpperCase()}` : (color.code?.toUpperCase() || '')
      
      // Find corresponding image
      const colorImage = product.color_images_full_url?.find((img: any) => {
        const imgColorNormalized = normalizeColorCode(img.color)
        return imgColorNormalized === codeNormalized
      })
      
      let imagePath = ''
      if (colorImage?.image_name) {
        if (typeof colorImage.image_name === 'string') {
          imagePath = colorImage.image_name
        } else if (colorImage.image_name.path) {
          imagePath = colorImage.image_name.path
        } else if (colorImage.image_name.key) {
          imagePath = colorImage.image_name.key
        }
      } else if (color.image) {
        imagePath = color.image
      }
      
      const finalImagePath = normalizeImagePath(imagePath, assetBase)
      
      return {
        name: color.name || hexCode || codeNormalized,
        originalName: color.name,
        code: codeNormalized,
        hexCode: hexCode,
        image: finalImagePath
      }
    })
  }
  
  // Try colors array
  if (product?.colors && Array.isArray(product.colors) && product.colors.length > 0) {
    return product.colors.map((color: any) => {
      if (typeof color === 'string') {
        const codeNormalized = normalizeColorCode(color)
        return {
          name: codeNormalized,
          originalName: null,
          code: codeNormalized,
          hexCode: getColorValue(color),
          image: ''
        }
      }
      
      const codeNormalized = normalizeColorCode(color.code || color.name)
      const hexCode = color.code && !color.code.startsWith('#') ? `#${color.code.toUpperCase()}` : (color.code?.toUpperCase() || getColorValue(color.code || color.name))
      
      let imagePath = ''
      if (color.image) {
        imagePath = color.image
      }
      
      const finalImagePath = normalizeImagePath(imagePath, assetBase)
      
      return {
        name: color.name || hexCode || codeNormalized,
        originalName: color.name,
        code: codeNormalized,
        hexCode: hexCode,
        image: finalImagePath
      }
    })
  }
  
  return []
}

// Get product variations
const getProductVariations = (product: any): string[] => {
  if (!product) return []
  
  // Check if product has choice_options
  if (product?.choice_options && Array.isArray(product.choice_options) && product.choice_options.length > 0) {
    const variationsSet = new Set<string>()
    
    product.choice_options.forEach((option: any) => {
      if (option.options && Array.isArray(option.options)) {
        option.options.forEach((opt: string) => {
          if (opt && opt.trim()) {
            variationsSet.add(opt.trim())
          }
        })
      }
    })
    
    return Array.from(variationsSet).sort()
  }
  
  // Check if product has variation array
  if (product?.variation && Array.isArray(product.variation) && product.variation.length > 0) {
    const variationsSet = new Set<string>()
    
    product.variation.forEach((v: any) => {
      if (v.type && typeof v.type === 'string') {
        // Extract variation type (e.g., "100ml" from "WARM PEACH 004-100ml")
        const parts = v.type.split('-')
        if (parts.length >= 2) {
          const variationType = parts[parts.length - 1].trim()
          if (variationType) {
            variationsSet.add(variationType)
          }
        }
      }
    })
    
    return Array.from(variationsSet).sort()
  }
  
  return []
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
const modalProductColors = computed(() => getProductColors(selectedProductForModal.value))
const modalProductVariations = computed(() => getProductVariations(selectedProductForModal.value))
const modalProductSku = computed(() => getProductSku(selectedProductForModal.value))

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
    if (product?.code) cartData.sku = product.code
    
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
          <div class="search-wrapper" @click.stop>
            <input 
              v-model="q" 
              type="search" 
              :placeholder="t('shop.search_placeholder')" 
              class="search-input"
              @input="handleSearchInput"
              @focus="q && q.length >= 2 && (showSuggestions = true)"
              @blur="handleSearchBlur"
            />
            <svg class="search-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            
            <!-- Search Suggestions Dropdown -->
            <div v-if="showSuggestions && (searchSuggestions.length > 0 || searchProducts.length > 0)" class="search-suggestions">
              <!-- Loading State -->
              <div v-if="searchLoading" class="suggestions-loading">
                <div class="loading-spinner-small"></div>
                <span>{{ t('shop.searching') || 'جاري البحث...' }}</span>
              </div>
              
              <!-- Suggestions List -->
              <div v-if="!searchLoading && searchSuggestions.length > 0" class="suggestions-section">
                <div class="suggestions-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.6-.58 3.07-1.54 4.2l.2.2h.84l5 5l-1.5 1.5l-5-5v-.84l-.2-.2A6.516 6.516 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3Z"/>
                  </svg>
                  {{ t('shop.suggestions') || 'مقترحات البحث' }}
                </div>
                <div 
                  v-for="(suggestion, index) in searchSuggestions" 
                  :key="`suggestion-${index}`"
                  class="suggestion-item"
                  @click="selectSuggestion(suggestion)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.6-.58 3.07-1.54 4.2l.2.2h.84l5 5l-1.5 1.5l-5-5v-.84l-.2-.2A6.516 6.516 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3Z"/>
                  </svg>
                  <span>{{ suggestion }}</span>
                </div>
              </div>
              
              <!-- Products List -->
              <div v-if="!searchLoading && searchProducts.length > 0" class="products-section">
                <div class="suggestions-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 4v2h10V4H7zm0 4v2h10V8H7zm0 4v2h7v-2H7zm13-1.59L17.59 12l-2.29 2.29 1.41 1.41L19 13.41z"/>
                  </svg>
                  {{ t('shop.products') || 'المنتجات' }}
                </div>
                <div 
                  v-for="product in searchProducts" 
                  :key="product.id || product.slug"
                  class="product-suggestion-item"
                  @click="selectProduct(product)"
                >
                  <img 
                    :src="product.image_full_url || '/images/product-placeholder.jpg'" 
                    :alt="product.name"
                    class="product-suggestion-image"
                    @error="(e: any) => { e.target.src = '/images/product-placeholder.jpg' }"
                  />
                  <div class="product-suggestion-info">
                    <div class="product-suggestion-name">{{ product.name }}</div>
                    <div class="product-suggestion-price" v-if="product.price">
                      {{ formatPrice(product.price) }}
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- No Results -->
              <div v-if="!searchLoading && searchSuggestions.length === 0 && searchProducts.length === 0" class="no-suggestions">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <span>{{ t('shop.no_suggestions') || 'لا توجد نتائج' }}</span>
              </div>
            </div>
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
            <option value="highest_discount">{{ t('shop.sort_options.highest_discount') }}</option>
            <option value="best_selling">{{ t('shop.sort_options.best_selling') }}</option>
            <option value="latest">{{ t('shop.sort_options.latest') }}</option>
            <option value="low-high">{{ t('shop.sort_options.low_high') }}</option>
            <option value="high-low">{{ t('shop.sort_options.high_low') }}</option>
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
          <div class="price-range-slider-container">
            <div class="price-range-display">
              <span class="price-value">{{ formatPrice(actualMin) }}</span>
              <span class="price-separator">-</span>
              <span class="price-value">{{ formatPrice(actualMax) }}</span>
            </div>
            <div class="price-range-slider-wrapper">
              <div class="price-range-track">
                <div 
                  class="price-range-active" 
                  :style="{
                    left: ((actualMin - priceRangeMin) / (priceRangeMax - priceRangeMin) * 100) + '%',
                    width: ((actualMax - actualMin) / (priceRangeMax - priceRangeMin) * 100) + '%'
                  }"
                ></div>
              </div>
              <input 
                type="range" 
                class="price-range-slider price-range-slider-min"
                :min="priceRangeMin"
                :max="priceRangeMax"
                :step="priceRangeStep"
                :value="actualMin"
                @input="handleMinSliderInput"
              />
              <input 
                type="range" 
                class="price-range-slider price-range-slider-max"
                :min="priceRangeMin"
                :max="priceRangeMax"
                :step="priceRangeStep"
                :value="actualMax"
                @input="handleMaxSliderInput"
              />
            </div>
            <div class="price-range-labels">
              <span class="price-label-min">{{ formatPrice(priceRangeMin) }}</span>
              <span class="price-label-max">{{ formatPrice(priceRangeMax) }}</span>
            </div>
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
          <option value="highest_discount">{{ t('shop.sort_options.highest_discount') }}</option>
          <option value="best_selling">{{ t('shop.sort_options.best_selling') }}</option>
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
            <button type="button" class="btn-close" data-bs-dismiss="modal" :aria-label="t('close')"></button>
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
                    <NuxtLink :to="modalProductBrand.id ? `/brand/${modalProductBrand.id}` : '#'" class="text-decoration-none d-flex align-items-center gap-2">
                      <picture>
                        <img class="cover-image-class" :src="modalProductBrand.image" :alt="modalProductBrand.name" @error="(e: any) => { e.target.src = '/images/Group 1171274840.png' }">
                      </picture>
                    </NuxtLink>
                  </div>
                  
                  <!-- Product SKU -->
                  <div v-if="modalProductSku" class="product-sku-modal mb-2">
                    <span class="sku-label">{{ t('product.sku') || 'رمز المنتج' }}:</span>
                    <span class="sku-value">{{ modalProductSku }}</span>
                  </div>
                  
                  <!-- Colors (Disabled) -->
                  <div v-if="modalProductColors.length > 0" class="variant-section-disabled mt-3">
                    <h6 class="variant-title-disabled mb-2">{{ t('product.select_color') || 'اختر اللون' }}</h6>
                    <div class="color-options-disabled">
                      <div
                        v-for="color in modalProductColors"
                        :key="color.code"
                        class="color-option-disabled"
                        :class="{ 'has-image': color.image && !color.originalName }"
                        :style="(color.image) 
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
                        :title="color.name || color.code || ''"
                      >
                      </div>
                    </div>
                  </div>

                  <!-- Variations (Disabled) -->
                  <div v-if="modalProductVariations.length > 0" class="variant-section-disabled mt-3">
                    <h6 class="variant-title-disabled mb-2">{{ t('product.select_variation') || 'اختر المتغير' }}</h6>
                    <div class="variation-options-disabled">
                      <div
                        v-for="variation in modalProductVariations"
                        :key="variation"
                        class="variation-option-disabled"
                      >
                        <span class="variation-value">{{ variation }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="pricing-section mt-3">
                    <div v-if="modalProductPrice.hasDiscount" class="old-price-row mb-2">
                      <span class="old">{{ formatPrice(modalProductPrice.old) }}</span>
                      <svg width="14" height="14" viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.41566 9.76641C6.24628 10.1389 6.13432 10.5431 6.09143 10.967L9.67578 10.2113C9.84515 9.83893 9.95703 9.43463 10 9.01074L6.41566 9.76641Z" fill="#808080" fill-opacity="0.6"/>
                        <path d="M9.67525 7.94574C9.84462 7.57335 9.95658 7.16905 9.99948 6.74516L7.20738 7.3341V6.20194L9.67516 5.68183C9.84454 5.30944 9.9565 4.90515 9.99939 4.48126L7.2073 5.0697V0.998106C6.77947 1.23635 6.39951 1.55347 6.09065 1.92753V5.30517L4.974 5.54057V0.444336C4.54616 0.682492 4.16621 0.999697 3.85734 1.37376V5.77587L1.35883 6.30243C1.18946 6.67482 1.07741 7.07911 1.03443 7.503L3.85734 6.90803V8.33379L0.832042 8.97138C0.662666 9.34377 0.550705 9.74806 0.507812 10.172L3.67446 9.50455C3.93224 9.45138 4.1538 9.30023 4.29784 9.09222L4.87859 8.23832V8.23815C4.93887 8.14981 4.974 8.04329 4.974 7.92857V6.67264L6.09065 6.43725V8.70157L9.67516 7.94557L9.67525 7.94574Z" fill="#808080" fill-opacity="0.6"/>
                      </svg>
                    </div>
                    <div class="price-row d-flex align-items-center gap-2">
                      <h5 class="price final mb-0">
                        {{ formatPrice(modalProductPrice.final) }} 
                        <img src="/images/Group 1171274840.png" alt="ر.س" class="currency-icon" />
                      </h5>
                      <div v-if="modalProductPrice.hasDiscount" class="badge bg-danger">-{{ modalProductPrice.discountPercent }}%</div>
                    </div>
                  </div>
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
                      <NuxtLink class="text-decoration-none category-badge" :to="`/category/${cat.id}`">
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
  right: 20px;
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
  right: 0;
}
[dir="ltr"] .filter-drawer.active {
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

/* Search Suggestions */
.search-suggestions {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #fff;
  border: 2px solid #F58040;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 500px;
  overflow-y: auto;
  margin-top: 4px;
}

.search-suggestions::-webkit-scrollbar {
  width: 6px;
}

.search-suggestions::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 0 12px 12px 0;
}

.search-suggestions::-webkit-scrollbar-thumb {
  background: #F58040;
  border-radius: 3px;
}

.suggestions-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  color: #6b7280;
  font-size: 14px;
}

.loading-spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top-color: #F58040;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.suggestions-section,
.products-section {
  padding: 12px 0;
}

.suggestions-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 8px;
}

.suggestions-title svg {
  opacity: 0.6;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #374151;
  font-size: 14px;
}

.suggestion-item:hover {
  background: #f9fafb;
  color: #F58040;
}

.suggestion-item svg {
  opacity: 0.5;
  flex-shrink: 0;
}

.suggestion-item:hover svg {
  opacity: 1;
}

.product-suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f3f4f6;
}

.product-suggestion-item:last-child {
  border-bottom: none;
}

.product-suggestion-item:hover {
  background: #f9fafb;
}

.product-suggestion-image {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.product-suggestion-info {
  flex: 1;
  min-width: 0;
}

.product-suggestion-name {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-suggestion-price {
  font-size: 13px;
  font-weight: 600;
  color: #F58040;
}

.no-suggestions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: #9ca3af;
  font-size: 14px;
}

.no-suggestions svg {
  opacity: 0.5;
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
/* Price Range Slider Styles */
.price-range-slider-container {
  padding: 12px 0;
}

.price-range-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 8px;
  font-weight: 600;
}

.price-value {
  color: #F58040;
  font-size: 16px;
}

.price-separator {
  color: #9ca3af;
  margin: 0 8px;
  font-weight: 500;
}

.price-range-slider-wrapper {
  position: relative;
  height: 10px;
  margin-bottom: 8px;
  padding: 0 10px;
}

.price-range-track {
  position: absolute;
  top: 50%;
  left: 10px;
  right: 10px;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  transform: translateY(-50%);
  z-index: 1;
}

.price-range-active {
  position: absolute;
  top: 0;
  height: 100%;
  background: #F58040;
  border-radius: 3px;
  transition: all 0.2s ease;
  z-index: 2;
}

.price-range-track {
  position: absolute;
  top: 50%;
  left: 10px;
  right: 10px;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  transform: translateY(-50%);
  z-index: 1;
}

.price-range-active {
  position: absolute;
  top: 0;
  height: 100%;
  background: #F58040;
  border-radius: 3px;
  transition: all 0.2s ease;
  z-index: 2;
}

.price-range-slider {
  position: absolute;
  width: calc(100% - 20px);
  left: 10px;
  height: 6px;
  background: transparent;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  pointer-events: none;
  z-index: 3;
  margin: 0;
}

.price-range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #F58040;
  cursor: pointer;
  pointer-events: all;
  border: 3px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.price-range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 8px rgba(245, 128, 64, 0.4);
}

.price-range-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #F58040;
  cursor: pointer;
  pointer-events: all;
  border: 3px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.price-range-slider::-moz-range-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 8px rgba(245, 128, 64, 0.4);
}


.price-range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  padding: 0 10px;
}

.price-label-min,
.price-label-max {
  font-weight: 500;
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

/* Pricing Section in Modal */
.pricing-section {
  margin-bottom: 12px;
}

.pricing-section .old-price-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pricing-section .old {
  color: #9ca3af;
  text-decoration: line-through;
  font-size: 14px;
}

.pricing-section .price-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pricing-section .price.final {
  color: #ef4444;
  font-weight: 800;
  font-size: 18px;
  margin: 0;
}

.pricing-section .currency-icon {
  width: 16px;
  height: 16px;
  margin-right: 2px;
  vertical-align: middle;
}

.pricing-section .badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}

/* Disabled Variants Styles */
.variant-section-disabled {
  margin-bottom: 16px;
}

.variant-title-disabled {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  margin: 0;
}

.color-options-disabled {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.color-option-disabled {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  cursor: not-allowed;
  opacity: 0.6;
  position: relative;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.variation-options-disabled {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.variation-option-disabled {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #f9fafb;
  cursor: not-allowed;
  opacity: 0.6;
}

.variation-value {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

/* Product SKU in Modal */
.product-sku-modal {
  font-size: 14px;
  color: #6b7280;
}

.product-sku-modal .sku-label {
  font-weight: 600;
  margin-left: 4px;
}

.product-sku-modal .sku-value {
  color: #374151;
  font-weight: 500;
}
</style>
