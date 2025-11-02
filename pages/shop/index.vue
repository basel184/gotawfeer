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

// Options data
const cats = ref<any[]>([])
const brandsResp = ref<any>({ total_size: 0, brands: [] })

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
    console.log('[shop] onMounted - معامل البحث:', searchParam)
    console.log('[shop] onMounted - q.value تم تعيينه إلى:', q.value)
  }
  
  // Fetch filter data
  try { 
    cats.value = await categories() 
  } catch (e) { 
    console.warn(t('shop.errors.categories_failed'), e)
    cats.value = []
  }
  try { 
    brandsResp.value = await brands({ limit: 200, offset: 1 }) 
  } catch (e) { 
    console.warn(t('shop.errors.brands_failed'), e)
    brandsResp.value = { total_size: 0, brands: [] }
  }
  try { 
    await cart.list() 
  } catch (e) { 
    console.warn(t('shop.errors.cart_load_failed'), e)
  }
  try { 
    await wishlist.list() 
  } catch (e) { 
    console.warn(t('shop.errors.wishlist_load_failed'), e)
  }
  
  // Load initial page of products
  console.log('[shop] onMounted - استدعاء loadPage')
  console.log('[shop] onMounted - q.value:', q.value)
  console.log('[shop] onMounted - route.query:', route.query)
  
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
      console.log('[shop] جسم الفلتر:', body)
      
      // Ensure we have valid data before sending
      if (body.limit && body.offset !== undefined) {
      res = await filter(body)
      } else {
        console.warn('[shop] بيانات غير صحيحة، استخدام البيانات الافتراضية')
        res = { products: [], total_size: 0, offset: 1 }
      }
    }
    
    console.log('[shop] الاستجابة:', res)
    const list = Array.isArray(res?.products) ? res.products : []
    console.log('[shop] قائمة المنتجات:', list)
    
    // On first page, reset items
    if (offset.value === 1) {
      items.value = []
      console.log('[shop] بدء تحميل الصفحة الأولى')
    }
    
    // Add new items to existing ones
    items.value = items.value.concat(list)
    total.value = Number(res?.total_size || res?.total || 0)
    
    console.log('[shop] تم تحميل:', list.length, 'منتج')
    console.log('[shop] إجمالي المنتجات المحملة:', items.value.length)
    console.log('[shop] إجمالي المنتجات المتاحة:', total.value)
    console.log('[shop] الصفحة الحالية:', offset.value)
    
    // Increment offset for next page
    offset.value = offset.value + 1
    
    console.log('[shop] الصفحة التالية:', offset.value)
    
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
        <div class="list">
          <label v-for="b in (brandsResp?.brands || [])" :key="b.id" class="chk">
            <input type="checkbox" :value="b.id" v-model="brand" /> {{ b.name }}
          </label>
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
      
      <!-- Offers Header -->
      <div v-if="route.query.has_discount === 'true'" class="offers-header">
        <h2>
          <svg width="24" height="24" viewBox="0 0 24 24" style="margin-left: 8px; vertical-align: middle;">
            <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          {{ t('shop.offers') || 'العروض' }}
        </h2>
        <p v-if="items.length > 0">{{ items.length }} {{ t('shop.offers_count') || 'منتج مخفض' }}</p>
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
            <div class="filter-options">
              <label v-for="b in (brandsResp?.brands || [])" :key="b.id" class="filter-option">
                <input type="checkbox" :value="b.id" v-model="brand" />
                <span>{{ b.name }}</span>
              </label>
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
  gap: 8px 
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
</style>
