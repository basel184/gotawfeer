<template>
  <main class="search-page" dir="rtl">
    <div class="container">
      <!-- Search Header -->
      <div class="search-header">
        <h1 class="search-title">{{ t('search.title') }}</h1>
        <div class="search-stats">
          <span v-if="searchResults.length > 0">
            {{ t('search.results_count', { count: searchResults.length }) }}
          </span>
          <span v-else-if="!isLoading">
            {{ t('search.no_results') }}
          </span>
        </div>
      </div>

      <!-- Search Form -->
      <div class="search-form-container">
        <form @submit.prevent="performSearch" class="search-form">
          <div class="search-input-wrapper">
            <i class="fa-solid fa-search search-icon"></i>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('search.placeholder')"
              class="search-input"
              @input="handleSearchInput"
            />
            <button v-if="searchQuery" @click="clearSearch" class="clear-btn" type="button">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
          <button type="submit" class="search-btn" :disabled="!searchQuery.trim()">
            {{ t('search.search_button') }}
          </button>
        </form>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>{{ t('search.searching') }}</p>
      </div>

      <!-- Search Results -->
      <div v-else-if="searchResults.length > 0" class="search-results">
        <div class="results-grid">
          <div v-for="product in searchResults" :key="product.id" class="product-card">
            <NuxtLink :to="`/product/${product.slug || product.id}`" class="product-link">
              <div class="product-image">
                <img 
                  :src="toSrc(product.thumbnail_image || product.thumbnail_full_url || product.thumbnail)" 
                  :alt="product.name"
                  @error="onImgErr"
                />
                <div v-if="product.discount_percentage || product.discount" class="discount-badge">
                  -{{ product.discount_percentage || product.discount }}%
                </div>
              </div>
              <div class="product-info">
                <h3 class="product-name">{{ product.name || product.product_name }}</h3>
                <div class="product-price">
                  <span v-if="product.discount_percentage || product.discount" class="original-price">
                    {{ formatPrice(product.unit_price) }}
                  </span>
                  <span class="current-price">
                    {{ formatPrice(product.discounted_price || (product.unit_price - (product.unit_price * (product.discount_percentage || product.discount || 0) / 100)) || product.unit_price) }}
                  </span>
                </div>
                <div v-if="product.rating" class="product-rating">
                  <div class="stars">
                    <span 
                      v-for="i in 5" 
                      :key="i" 
                      class="star" 
                      :class="{ 'filled': i <= product.rating }"
                    >★</span>
                  </div>
                  <span class="rating-count">({{ product.reviews_count || 0 }})</span>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination">
          <button 
            @click="goToPage(currentPage - 1)" 
            :disabled="currentPage === 1"
            class="pagination-btn"
          >
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          
          <span 
            v-for="page in visiblePages" 
            :key="page"
            class="pagination-number"
            :class="{ 'active': page === currentPage }"
            @click="goToPage(page)"
          >
            {{ page }}
          </span>
          
          <button 
            @click="goToPage(currentPage + 1)" 
            :disabled="currentPage === totalPages"
            class="pagination-btn"
          >
            <i class="fa-solid fa-chevron-left"></i>
          </button>
        </div>
      </div>

      <!-- No Results -->
      <div v-else-if="!isLoading && searchQuery" class="no-results">
        <div class="no-results-icon">
          <i class="fa-solid fa-search"></i>
        </div>
        <h3>{{ t('search.no_results_title') }}</h3>
        <p>{{ t('search.no_results_description') }}</p>
        <div class="suggestions">
          <h4>{{ t('search.suggestions_title') }}</h4>
          <ul>
            <li>{{ t('search.suggestion_1') }}</li>
            <li>{{ t('search.suggestion_2') }}</li>
            <li>{{ t('search.suggestion_3') }}</li>
          </ul>
        </div>
      </div>

      <!-- Popular Searches -->
      <div v-if="!searchQuery && !isLoading" class="popular-searches">
        <h3>{{ t('search.popular_searches') }}</h3>
        <div class="popular-tags">
          <button 
            v-for="tag in popularSearches" 
            :key="tag"
            @click="searchForTag(tag)"
            class="popular-tag"
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

// SEO Configuration
const seo = useSeo()

// Set SEO for search page
seo.setSeo({
  title: locale.value === 'ar' ? 'البحث' : 'Search',
  description: locale.value === 'ar' 
    ? 'ابحث عن المنتجات في متجر جو توفير. ابحث عن آلاف المنتجات الأصيلة بأسعار مميزة.'
    : 'Search for products at Go Tawfeer store. Search for thousands of authentic products at great prices.',
  keywords: locale.value === 'ar' 
    ? 'بحث، منتجات، جو توفير، تسوق'
    : 'search, products, Go Tawfeer, shopping',
  image: '/images/go-tawfeer-1-1.webp'
})

// Search state
const searchQuery = ref('')
const searchResults = ref([])
const isLoading = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const itemsPerPage = 12

// Popular searches
const popularSearches = ref([
  'عطور',
  'مكياج',
  'ملابس',
  'إلكترونيات',
  'أحذية',
  'حقائب'
])

// Helper functions
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
  
  const cfg = useRuntimeConfig()
  const assetBase = (cfg?.public?.apiBase || '').replace(/\/api(?:\/v\d+)?$/, '')
  
  // Remove common prefixes
  let p = s.replace(/\\/g, '/')
  p = p.replace(/^public\//, '')
  p = p.replace(/^app\/public\//, '')
  p = p.replace(/^storage\/app\/public\//, '')
  p = p.replace(/\/+/g, '/').replace(/^\//, '')
  
  // Ensure it starts with storage/
  if (!p.startsWith('storage/')) {
    p = 'storage/' + p
  }
  
  return `${assetBase}/${p}`
}

const onImgErr = (e: any) => {
  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="16">No image</text></svg>'
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR'
  }).format(price)
}

// Search functions
const performSearch = async () => {
  if (!searchQuery.value.trim()) return
  
  isLoading.value = true
  currentPage.value = 1
  
  try {
    const { $get } = useApi()
    const response = await $get(`v1/products/search?q=${encodeURIComponent(searchQuery.value)}&page=${currentPage.value}&per_page=${itemsPerPage}`)
    
    console.log('Search response:', response) // Debug log
    
    // Handle different response formats
    let products = []
    if (Array.isArray(response)) {
      products = response
    } else if (response.data && Array.isArray(response.data)) {
      products = response.data
    } else if (response.products && Array.isArray(response.products)) {
      products = response.products
    } else if (response.items && Array.isArray(response.items)) {
      products = response.items
    }
    
    searchResults.value = products
    totalPages.value = Math.ceil((response.total || products.length) / itemsPerPage)
    
    console.log('Processed products:', products) // Debug log
    
    // Update URL
    router.push({
      path: '/search',
      query: { q: searchQuery.value }
    })
  } catch (error) {
    console.error('Search error:', error)
    searchResults.value = []
  } finally {
    isLoading.value = false
  }
}

const handleSearchInput = () => {
  // Debounce search
  clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    if (searchQuery.value.trim()) {
      performSearch()
    }
  }, 500)
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
  currentPage.value = 1
  totalPages.value = 1
  router.push('/search')
}

const searchForTag = (tag: string) => {
  searchQuery.value = tag
  performSearch()
}

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  performSearch()
}

const searchTimeout = ref(null)

// Computed
const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, currentPage.value + 2)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

// Initialize search from URL
onMounted(() => {
  const query = route.query.q as string
  if (query) {
    searchQuery.value = decodeURIComponent(query)
    performSearch()
  }
})

// Watch for route changes
watch(() => route.query.q, (newQuery) => {
  if (newQuery && newQuery !== searchQuery.value) {
    searchQuery.value = decodeURIComponent(newQuery as string)
    performSearch()
  }
})
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  background: #f6f6f6;
  padding: 20px 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Search Header */
.search-header {
  text-align: center;
  margin-bottom: 30px;
}

.search-title {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 10px;
}

.search-stats {
  color: #6b7280;
  font-size: 16px;
}

/* Search Form */
.search-form-container {
  background: #fff;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.search-form {
  display: flex;
  gap: 15px;
  max-width: 600px;
  margin: 0 auto;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-size: 16px;
}

.search-input {
  width: 100%;
  padding: 15px 50px 15px 15px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #f58040;
}

.clear-btn {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 5px;
}

.search-btn {
  background: #f58040;
  color: #fff;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
}

.search-btn:hover:not(:disabled) {
  background: #e67030;
}

.search-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

/* Loading */
.loading-container {
  text-align: center;
  padding: 60px 0;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #f58040;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Search Results */
.search-results {
  background: #fff;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.product-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.product-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.product-image {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.discount-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #ef4444;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.product-info {
  padding: 15px;
}

.product-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 10px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-price {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.original-price {
  color: #9ca3af;
  text-decoration: line-through;
  font-size: 14px;
}

.current-price {
  color: #f58040;
  font-weight: 700;
  font-size: 16px;
}

.product-rating {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stars {
  display: flex;
  gap: 2px;
}

.star {
  color: #d1d5db;
  font-size: 14px;
}

.star.filled {
  color: #fbbf24;
}

.rating-count {
  color: #6b7280;
  font-size: 12px;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 30px;
}

.pagination-btn {
  background: #f3f4f6;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.pagination-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-number {
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
  min-width: 40px;
  text-align: center;
}

.pagination-number:hover {
  background: #f3f4f6;
}

.pagination-number.active {
  background: #f58040;
  color: #fff;
}

/* No Results */
.no-results {
  text-align: center;
  padding: 60px 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.no-results-icon {
  font-size: 64px;
  color: #d1d5db;
  margin-bottom: 20px;
}

.no-results h3 {
  font-size: 24px;
  color: #111827;
  margin-bottom: 10px;
}

.no-results p {
  color: #6b7280;
  margin-bottom: 30px;
}

.suggestions h4 {
  color: #111827;
  margin-bottom: 15px;
}

.suggestions ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.suggestions li {
  color: #6b7280;
  margin-bottom: 8px;
}

/* Popular Searches */
.popular-searches {
  background: #fff;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.popular-searches h3 {
  font-size: 20px;
  color: #111827;
  margin-bottom: 20px;
  text-align: center;
}

.popular-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.popular-tag {
  background: #f3f4f6;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.3s ease;
  color: #374151;
}

.popular-tag:hover {
  background: #f58040;
  color: #fff;
}

/* Responsive */
@media (max-width: 768px) {
  .search-form {
    flex-direction: column;
  }
  
  .search-btn {
    width: 100%;
  }
  
  .results-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 15px;
  }
  
  .search-title {
    font-size: 24px;
  }
  
  .search-form-container {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .results-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }
  
  .product-info {
    padding: 12px;
  }
  
  .product-name {
    font-size: 14px;
  }
  
  .current-price {
    font-size: 14px;
  }
  
  .search-form-container {
    padding: 15px;
  }
}
</style>
