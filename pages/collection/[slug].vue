<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
const route = useRoute()
const slug = route.params.slug as string
const { $get } = useApi()
const cart = useCart()

const { data: section, pending, error } = await useAsyncData(`section-${slug}` as const, () => $get(`v1/home-sections/${slug}`))
// Fallback holder if show endpoint 404s
const localSection = ref<any | null>(null)
const sectionValue = computed(() => localSection.value ?? (section as any)?.value)

const limit = ref(24)
const offset = ref(0)
const loading = ref(false)
const products = ref<any[]>([])
const total = ref(0)
// Debounce handle for search
let qTimer: any = null

// Filters state
const q = ref('')
const selectedBrands = ref<number[]>([])
const selectedCategories = ref<number[]>([])
const minPrice = ref<number | null>(null)
const maxPrice = ref<number | null>(null)
const sort = ref<'latest' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc'>('latest')

// Facets
const facets = ref<{ brands: any[]; categories: any[]; price: { min: number; max: number } } | null>(null)
const loadFacets = async () => {
  try {
    const res = await $get(`v1/home-sections/${slug}/facets`)
    facets.value = res
    if (res?.price) {
      if (minPrice.value == null) minPrice.value = Number(res.price.min || 0)
      if (maxPrice.value == null) maxPrice.value = Number(res.price.max || 0)
    }
  } catch {}
}

const buildParams = () => {
  const params: Record<string, any> = { limit: limit.value, offset: offset.value }
  if (q.value) params.q = q.value
  if (selectedBrands.value.length) params.brand_ids = selectedBrands.value.join(',')
  if (selectedCategories.value.length) params.category_id = selectedCategories.value.join(',')
  if (minPrice.value != null) params.min_price = minPrice.value
  if (maxPrice.value != null) params.max_price = maxPrice.value
  if (sort.value) params.sort = sort.value
  const usp = new URLSearchParams(params as any)
  return usp.toString()
}

const load = async (reset = false) => {
  if (loading.value) return
  loading.value = true
  try {
    if (reset) { offset.value = 0; products.value = [] }
    const res = await $get(`v1/home-sections/${slug}/products?${buildParams()}`)
    total.value = res?.total_size || 0
    const list = Array.isArray(res?.products) ? res.products : []
    products.value = reset ? list : products.value.concat(list)
    offset.value += limit.value
  } finally {
    loading.value = false
  }
}

// Load products only when the section type is products
watch(
  () => sectionValue.value?.type,
  (t) => {
    if (t === 'products') {
      loadFacets();
      load(true)
    }
  },
  { immediate: true }
)

// If primary fetch failed, try to find the section from the list as a graceful fallback
watch(
  () => error?.value,
  async (err) => {
    if (err && !localSection.value) {
      try {
        const list = await $get('v1/home-sections')
        if (Array.isArray(list)) {
          const found = list.find((s: any) => String(s?.slug) === String(slug))
          if (found) {
            localSection.value = found
          }
        }
      } catch {}
    }
  },
  { immediate: true }
)

const hasMore = computed(() => products.value.length < total.value)
// When any filter changes, reload products
watch([selectedBrands, selectedCategories, minPrice, maxPrice, sort], () => {
  if (sectionValue.value?.type === 'products') load(true)
})

// Debounced search
watch(q, () => {
  if (qTimer) clearTimeout(qTimer)
  qTimer = setTimeout(() => {
    if (sectionValue.value?.type === 'products') load(true)
  }, 400)
})

// Helper functions
const hasActiveFilters = computed(() => {
  return q.value || selectedBrands.value.length > 0 || selectedCategories.value.length > 0 || 
         minPrice.value !== null || maxPrice.value !== null
})

const clearFilters = () => {
  q.value = ''
  selectedBrands.value = []
  selectedCategories.value = []
  minPrice.value = null
  maxPrice.value = null
  sort.value = 'latest'
}

const formatPrice = (price: number | null) => {
  if (price === null) return '0'
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0
  }).format(price)
}

// Cart event handlers
const handleAddToCart = async (product: any) => {
  try {
    await cart.add({
      product_id: product.id || product.product_id,
      quantity: 1,
      variant: product.variant,
      color: product.color
    })
    console.log('Product added to cart:', product.name || product.product_name)
  } catch (error) {
    console.error('Failed to add product to cart:', error)
    alert('فشل في إضافة المنتج إلى السلة')
  }
}

const handleUpdateCart = async (payload: { product: any; qty: number }) => {
  try {
    await cart.updateByProduct(payload.product, payload.qty)
    console.log('Cart updated:', payload.product.name || payload.product.product_name, 'qty:', payload.qty)
  } catch (error) {
    console.error('Failed to update cart:', error)
    alert('فشل في تحديث السلة')
  }
}

const handleRemoveFromCart = async (product: any) => {
  try {
    await cart.removeByProduct(product)
    console.log('Product removed from cart:', product.name || product.product_name)
  } catch (error) {
    console.error('Failed to remove product from cart:', error)
    alert('فشل في إزالة المنتج من السلة')
  }
}

// Load cart data on mount
onMounted(async () => {
  try {
    await cart.list()
  } catch (error) {
    console.warn('Failed to load cart:', error)
  }
})
</script>

<template>
  <main class="collection" dir="rtl">
    <div class="container">
      <!-- Header Section -->
      <section class="section card">
        <div class="section-header">
          <h1>{{ sectionValue?.title || 'المجموعة' }}</h1>
        </div>
      </section>

      <!-- Loading state -->
      <section v-if="pending" class="section card">
        <div class="section-header">
          <h2>جارٍ التحميل...</h2>
        </div>
      </section>

      <!-- Products type with sidebar layout -->
      <section v-else-if="sectionValue?.type === 'products'" class="products-layout">
        <!-- Sidebar Filters -->
        <aside class="sidebar">
          <div class="sidebar-card">
            <div class="sidebar-header">
              <h3>تصفية النتائج</h3>
              <button class="clear-filters" @click="clearFilters" v-if="hasActiveFilters">مسح الكل</button>
            </div>
            <div class="filters-content">
              <div class="filter-group">
                <label>البحث</label>
                <input type="search" v-model.trim="q" placeholder="ما الذي تبحث عنه؟" class="form-control" />
              </div>
              <div class="filter-group">
                <label>الترتيب</label>
                <select v-model="sort" class="form-control">
                  <option value="latest">الأحدث</option>
                  <option value="price_asc">السعر: من الأقل للأعلى</option>
                  <option value="price_desc">السعر: من الأعلى للأقل</option>
                  <option value="name_asc">الاسم: تصاعدي</option>
                  <option value="name_desc">الاسم: تنازلي</option>
                </select>
              </div>
              <div class="filter-group" v-if="facets?.brands?.length">
                <label>العلامات التجارية</label>
                <div class="chips">
                  <label v-for="b in (facets?.brands||[])" :key="b.id" class="chip">
                    <input type="checkbox" :value="b.id" v-model="selectedBrands"> 
                    <span>{{ b.name }}</span>
                  </label>
                </div>
              </div>
              <div class="filter-group" v-if="facets?.categories?.length">
                <label>الأقسام</label>
                <div class="chips">
                  <label v-for="c in (facets?.categories||[])" :key="c.id" class="chip">
                    <input type="checkbox" :value="c.id" v-model="selectedCategories"> 
                    <span>{{ c.name }}</span>
                  </label>
                </div>
              </div>
              <div class="filter-group" v-if="facets?.price">
                <label>السعر</label>
                <div class="price-range">
                  <div class="row">
                    <input type="number" v-model.number="minPrice" :min="facets?.price?.min ?? 0" :max="facets?.price?.max ?? undefined" placeholder="الأدنى" class="form-control"/>
                    <span>–</span>
                    <input type="number" v-model.number="maxPrice" :min="facets?.price?.min ?? 0" :max="facets?.price?.max ?? undefined" placeholder="الأعلى" class="form-control"/>
                  </div>
                  <div class="price-display">
                    {{ formatPrice(minPrice) }} - {{ formatPrice(maxPrice) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
          <div class="section card">
            <div class="section-header">
              <h2>المنتجات</h2>
              <div class="results-info">
                <span class="sub">{{ total }} منتج</span>
                <div class="view-toggle">
                  <button class="toggle-btn active" title="عرض الشبكة">
                    <i class="fi fi-sr-grid"></i>
                  </button>
                  <button class="toggle-btn" title="عرض القائمة">
                    <i class="fi fi-sr-list"></i>
                  </button>
                </div>
              </div>
            </div>
            <template v-if="loading">
              <div class="skeleton-grid">
                <div v-for="i in 8" :key="i" class="skeleton-card">
                  <div class="sk-img"></div>
                  <div class="sk-line w-80"></div>
                  <div class="sk-line w-60"></div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="grid">
                <ProductCard 
                  v-for="p in products" 
                  :key="p.id || p.slug" 
                  :product="p" 
                  :qty="cart.qtyOf(p)"
                  @add="handleAddToCart"
                  @update="handleUpdateCart"
                  @remove="handleRemoveFromCart"
                />
              </div>

              <div class="load-more" v-if="hasMore">
                <button class="btn" :disabled="loading" @click="load()">تحميل المزيد</button>
              </div>
            </template>
          </div>
        </main>
      </section>

      <!-- Banners type -->
      <section v-else-if="sectionValue?.type === 'banners'" class="section card">
        <div class="section-header">
          <h2>{{ sectionValue?.title || 'البانرات' }}</h2>
        </div>
        <div v-if="sectionValue?.banner_layout === 'slider'">
          <BannerCarousel :banners="sectionValue?.banners || []" />
        </div>
        <div v-else>
          <PromoBannerRow :banners="sectionValue?.banners || []" :columns="sectionValue?.banner_layout === 'grid_1' ? 1 : (sectionValue?.banner_layout === 'grid_2' ? 2 : 3)" />
        </div>
      </section>

      <!-- Categories type -->
      <section v-else-if="sectionValue?.type === 'categories'" class="section card">
        <div class="section-header">
          <h2>{{ sectionValue?.title || 'الأقسام' }}</h2>
        </div>
        <CategoryPills :categories="sectionValue?.categories || []" />
      </section>

      <!-- Brands type -->
      <section v-else-if="sectionValue?.type === 'brands'" class="section card">
        <div class="section-header">
          <h2>{{ sectionValue?.title || 'العلامات التجارية' }}</h2>
        </div>
        <BrandCarousel :brands="sectionValue?.brands || []" />
      </section>

      <!-- Not found / error -->
      <section v-else class="section card">
        <div class="section-header">
          <h2>القسم غير متاح</h2>
        </div>
        <p>عذراً، هذا القسم غير متاح حالياً.</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.collection { background: #f6f6f6; }
.container { max-width: 1400px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 20px; }

.section { display: flex; flex-direction: column; }
.section.card { border: 1px solid #eee; border-radius: 14px; padding: 14px; }
.section-header { display: flex; align-items: baseline; gap: 8px; padding: 0 4px; justify-content: space-between; }
.section-header h1 { font-size: 20px; font-weight: 700; color: #111827; }
.section-header h2 { font-size: 18px; font-weight: 700; color: #111827; }
.section-header .sub { color: #6b7280; font-size: 12px; }
.grid { display:grid; grid-template-columns: repeat(5, 1fr); gap:12px }
@media (max-width: 1200px){ .grid { grid-template-columns: repeat(4, 1fr) } }
@media (max-width: 900px){ .grid { grid-template-columns: repeat(3, 1fr) } }
@media (max-width: 640px){ .grid { grid-template-columns: repeat(2, 1fr) } }
/* Products Layout with Sidebar */
.products-layout { 
  display: grid; 
  grid-template-columns: 300px 1fr; 
  gap: 20px; 
  align-items: start; 
}

/* Sidebar */
.sidebar { 
  position: sticky; 
  top: 20px; 
  height: fit-content; 
}

.sidebar-card { 
  background: #fff; 
  border: 1px solid #eee; 
  border-radius: 14px; 
  padding: 16px; 
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.sidebar-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 16px; 
  padding-bottom: 12px; 
  border-bottom: 1px solid #f3f4f6; 
}

.sidebar-header h3 { 
  font-size: 16px; 
  font-weight: 600; 
  color: #111827; 
  margin: 0; 
}

.clear-filters { 
  background: none; 
  border: none; 
  color: #ef4444; 
  font-size: 12px; 
  cursor: pointer; 
  padding: 4px 8px; 
  border-radius: 4px; 
  transition: background-color 0.2s;
}

.clear-filters:hover { 
  background: #fef2f2; 
}

.filters-content { 
  display: flex; 
  flex-direction: column; 
  gap: 20px; 
}

/* Main Content */
.main-content { 
  min-width: 0; 
}

.results-info { 
  display: flex; 
  align-items: center; 
  gap: 16px; 
}

.view-toggle { 
  display: flex; 
  gap: 4px; 
}

.toggle-btn { 
  background: #f8f9fa; 
  border: 1px solid #e9ecef; 
  border-radius: 6px; 
  padding: 8px; 
  cursor: pointer; 
  transition: all 0.2s; 
  color: #6b7280;
}

.toggle-btn:hover { 
  background: #e9ecef; 
  color: #374151;
}

.toggle-btn.active { 
  background: #111827; 
  color: #fff; 
  border-color: #111827;
}

/* Filters */
.filter-group { display: flex; flex-direction: column; gap: 8px; }
.filter-group label { font-weight: 600; font-size: 14px; color: #374151; }
.form-control { 
  padding: 8px 12px; 
  border: 1px solid #d1d5db; 
  border-radius: 8px; 
  font-size: 14px; 
  transition: border-color 0.2s;
}
.form-control:focus { 
  outline: none; 
  border-color: #2563eb; 
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.price-range { 
  display: flex; 
  flex-direction: column; 
  gap: 8px; 
}

.price-display { 
  font-size: 12px; 
  color: #6b7280; 
  text-align: center; 
  padding: 4px 8px; 
  background: #f8f9fa; 
  border-radius: 4px; 
}

.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { 
  display: inline-flex; 
  align-items: center; 
  gap: 6px; 
  background: #f8f9fa; 
  border: 1px solid #e9ecef; 
  border-radius: 20px; 
  padding: 6px 12px; 
  cursor: pointer;
  transition: all 0.2s;
}
.chip:hover { background: #e9ecef; }
.chip input[type="checkbox"] { margin: 0; }
.chip span { font-size: 13px; color: #495057; }

.row { display: flex; align-items: center; gap: 8px; }

.load-more { display: flex; justify-content: center; padding: 20px 0; }
.btn { 
  background: #111827; 
  color: #fff; 
  padding: 12px 24px; 
  border-radius: 8px; 
  border: none; 
  cursor: pointer; 
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}
.btn:hover:not([disabled]) { background: #1f2937; }
.btn[disabled] { opacity: 0.5; cursor: not-allowed; }

/* Skeleton styles */
.skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.skeleton-card { 
  border: 1px solid #eee; 
  border-radius: 12px; 
  padding: 12px; 
  background: #fff; 
}
.sk-img { 
  height: 180px; 
  background: linear-gradient(90deg, #f5f5f5 25%, #ececec 37%, #f5f5f5 63%); 
  background-size: 400% 100%; 
  animation: sk 1.4s ease infinite; 
  border-radius: 8px; 
}
.sk-line { 
  height: 14px; 
  margin-top: 12px; 
  background: linear-gradient(90deg, #f5f5f5 25%, #ececec 37%, #f5f5f5 63%); 
  background-size: 400% 100%; 
  animation: sk 1.4s ease infinite; 
  border-radius: 6px; 
}
.sk-line.w-80 { width: 80%; }
.sk-line.w-60 { width: 60%; }
@keyframes sk { 
  0% { background-position: 100% 50%; } 
  100% { background-position: 0 50%; } 
}

/* Responsive */
@media (min-width: 900px) {
  .container { gap: 28px; padding: 20px; }
  .section-header h1 { font-size: 24px; }
  .section-header h2 { font-size: 20px; }
  .products-layout { grid-template-columns: 320px 1fr; gap: 24px; }
}

@media (max-width: 768px) {
  .products-layout { 
    grid-template-columns: 1fr; 
    gap: 16px; 
  }
  .sidebar { 
    position: static; 
    order: 2; 
  }
  .main-content { 
    order: 1; 
  }
  .sidebar-card { 
    padding: 12px; 
  }
  .filters-content { 
    gap: 16px; 
  }
  .results-info { 
    flex-direction: column; 
    align-items: flex-start; 
    gap: 8px; 
  }
}

@media (max-width: 640px) {
  .section-header { 
    flex-direction: column; 
    align-items: flex-start; 
    gap: 4px; 
  }
  .sidebar-header { 
    flex-direction: column; 
    align-items: flex-start; 
    gap: 8px; 
  }
  .chips { 
    gap: 6px; 
  }
  .chip { 
    padding: 4px 8px; 
    font-size: 12px; 
  }
}
</style>