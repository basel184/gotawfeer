<template>
  <main class="compare-page p-3" dir="rtl">
    <div class="container">
      <!-- Header Section -->
      <section class="section card">
        <div class="section-header p-3">
          <h1>{{ t('compare.title') || 'مقارنة المنتجات' }}</h1>
          <ClientOnly>
            <div class="compare-summary" v-if="!compare.isEmpty.value">
              <span class="items-count">{{ compare.compareCount.value }} {{ t('compare.items_count') || 'منتج للمقارنة' }}</span>
            </div>
          </ClientOnly>
        </div>
      </section>

      <ClientOnly>
        <!-- Empty State -->
        <section v-if="compare.isEmpty.value" class="section card text-center py-5">
        <div class="empty-state">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="mb-4">
            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h3 class="text-muted mb-3">{{ t('compare.empty_title') || 'لا توجد منتجات للمقارنة' }}</h3>
          <p class="text-muted mb-4">{{ t('compare.empty_description') || 'أضف منتجات للمقارنة لرؤية الفروقات بينها' }}</p>
          <NuxtLink to="/products" class="btn btn-primary">
            {{ t('compare.browse_products') || 'تصفح المنتجات' }}
          </NuxtLink>
        </div>
      </section>

      <!-- Comparison Table -->
      <section v-else class="section card">
        <div class="table-responsive">
          <table class="table table-bordered compare-table">
            <thead>
              <tr>
                <th class="feature-column">{{ t('compare.feature') || 'الميزة' }}</th>
                <th v-for="item in compare.items.value" :key="item.uniqueKey || item.id" class="product-column">
                  <div class="product-header">
                    <button @click="removeProduct(item.uniqueKey || item.id)" class="btn btn-sm btn-outline-danger remove-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                    
                    <!-- Product Image with Color Navigation -->
                    <div class="product-image-container">
                      <div class="product-image" v-if="item.image || (item.colors && item.colors.length > 0)">
                        <img 
                          :src="getProductImage(item)" 
                          :alt="item.name" 
                          style="width: 100%; height: 100%; object-fit: contain;"
                          @error="handleImageError"
                        />
                      </div>
                      
                      <!-- Color Navigation Arrows -->
                      <div v-if="item.colors && item.colors.length > 1" class="color-nav-arrows">
                        <button class="color-nav-btn prev" @click="prevColor(item)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                          </svg>
                        </button>
                        <button class="color-nav-btn next" @click="nextColor(item)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <!-- Current Color Info -->
                    <div v-if="item.colors && item.colors.length > 0" class="current-color-info">
                      <span 
                        class="current-color-swatch" 
                        :style="{ backgroundColor: '#' + (getCurrentColor(item)?.hex || getCurrentColor(item)?.code || 'ccc') }"
                      ></span>
                      <span class="current-color-name">{{ getCurrentColor(item)?.name || 'اللون' }}</span>
                      <span class="color-counter">({{ getSelectedColorIndex(item.uniqueKey || item.id) + 1 }}/{{ item.colors.length }})</span>
                    </div>
                    
                    <!-- Color Thumbnails -->
                    <div v-if="item.colors && item.colors.length > 1" class="color-thumbnails">
                      <button 
                        v-for="(color, index) in item.colors" 
                        :key="`thumb-${item.id}-${index}`"
                        class="color-thumb"
                        :class="{ active: getSelectedColorIndex(item.uniqueKey || item.id) === index }"
                        :style="{ backgroundColor: '#' + (color.hex || color.code || 'ccc') }"
                        :title="color.name || color.code"
                        @click="setSelectedColorIndex(item.uniqueKey || item.id, index)"
                      ></button>
                    </div>
                    
                    <h5 class="product-name">{{ item.originalName || item.name }}</h5>
                    <!-- Show selected color badge -->
                    <div v-if="item.selectedColor" class="selected-variant-badge color-badge">
                      <span class="color-dot" :style="{ backgroundColor: getColorHex(item.selectedColor, item.colors) }"></span>
                      {{ item.selectedColor }}
                    </div>
                    <!-- Show selected variation badge -->
                    <div v-if="item.selectedVariation" class="selected-variant-badge variation-badge">
                      {{ item.selectedVariation }}
                    </div>
                    <div class="product-price">{{ money(item.price) }}</div>
                    <div class="product-rating" v-if="item.rating > 0">
                      <div class="stars">
                        <span v-for="i in 5" :key="i" :class="i <= item.rating ? 'star-filled' : 'star-empty'">★</span>
                      </div>
                      <small class="text-muted">({{ item.reviews_count }})</small>
                    </div>
 
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- Brand Row -->
              <tr v-if="hasBrand">
                <td class="feature-name">{{ t('compare.brand') || 'البراند' }}</td>
                <td v-for="item in compare.items.value" :key="`brand-${item.id}`" class="product-data">
                  <span v-if="item.brand" class="brand-name">{{ item.brand }}</span>
                  <span v-else class="text-muted">-</span>
                </td>
              </tr>
              
              <!-- Category Row -->
              <tr v-if="hasCategory">
                <td class="feature-name">{{ t('compare.category') || 'التصنيف' }}</td>
                <td v-for="item in compare.items.value" :key="`category-${item.id}`" class="product-data">
                  <span v-if="item.category" class="category-name">{{ item.category }}</span>
                  <span v-else class="text-muted">-</span>
                </td>
              </tr>
              
              <!-- Meta Description Row -->
              <tr v-if="hasMetaDescription">
                <td class="feature-name">{{ t('compare.meta_description') || 'الوصف التعريفي' }}</td>
                <td v-for="item in compare.items.value" :key="`meta-${item.id}`" class="product-data">
                  <p class="description" v-if="item.meta_description">{{ item.meta_description }}</p>
                  <span v-else class="text-muted">-</span>
                </td>
              </tr>
              
              <!-- Colors Row -->
              <tr v-if="hasColors">
                <td class="feature-name">{{ t('compare.colors') || 'الألوان المتاحة' }}</td>
                <td v-for="item in compare.items.value" :key="`colors-${item.id}`" class="product-data">
                  <div v-if="item.colors && item.colors.length > 0" class="colors-display">
                    <div 
                      v-for="(color, index) in item.colors" 
                      :key="`color-${item.id}-${index}`"
                      class="color-circle"
                      :style="{ backgroundColor:'#' + color.hex || '#' + color.code || '#ccc' }"
                      :title="color.name || color.code"
                    ></div>
                  </div>
                  <span v-else class="text-muted">-</span>
                </td>
              </tr>
              
              <!-- Variation Row -->
              <tr v-if="hasVariation">
                <td class="feature-name">{{ t('compare.variation') || 'المتغيرات' }}</td>
                <td v-for="item in compare.items.value" :key="`variation-${item.id}`" class="product-data">
                  <div v-if="item.variation" class="variation-display">
                    <div v-if="typeof item.variation === 'object'">
                      <div v-for="(value, key) in item.variation" :key="key" class="variation-item">
                        <strong>{{ key }}:</strong> {{ value.type }}
                      </div>
                    </div>
                    <span v-else>{{ item.variation }}</span>
                  </div>
                  <span v-else class="text-muted">-</span>
                </td>
              </tr>
              
              <!-- Description Row -->
              <tr v-if="hasDescription">
                <td class="feature-name">{{ t('compare.description') || 'الوصف' }}</td>
                <td v-for="item in compare.items.value" :key="`desc-${item.id}`" class="product-data">
                  <p class="description" v-if="item.description">{{ item.description }}</p>
                  <span v-else class="text-muted">-</span>
                </td>
              </tr>
              
              <!-- Features Row -->
              <tr v-if="hasFeatures">
                <td class="feature-name">{{ t('compare.features') || 'المميزات' }}</td>
                <td v-for="item in compare.items.value" :key="`features-${item.id}`" class="product-data">
                  <ul v-if="item.features && item.features.length > 0" class="features-list">
                    <li v-for="(feature, index) in item.features" :key="index">{{ feature }}</li>
                  </ul>
                  <span v-else class="text-muted">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      </ClientOnly>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, computed, ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSeo } from '~/composables/useSeo'

const { t, locale } = useI18n()

// Track if component is mounted (client-side only)
const isMounted = ref(false)

// Track selected color index for each product in compare
const selectedColorIndex = reactive<Record<string, number>>({})

// Get selected color index for an item
const getSelectedColorIndex = (itemKey: string): number => {
  return selectedColorIndex[itemKey] || 0
}

// Set selected color index for an item
const setSelectedColorIndex = (itemKey: string, index: number) => {
  selectedColorIndex[itemKey] = index
}

// Navigate to next color for an item
const nextColor = (item: any) => {
  const key = item.uniqueKey || item.id
  const colors = item.colors || []
  if (colors.length === 0) return
  const currentIndex = getSelectedColorIndex(key)
  setSelectedColorIndex(key, (currentIndex + 1) % colors.length)
}

// Navigate to previous color for an item
const prevColor = (item: any) => {
  const key = item.uniqueKey || item.id
  const colors = item.colors || []
  if (colors.length === 0) return
  const currentIndex = getSelectedColorIndex(key)
  setSelectedColorIndex(key, currentIndex === 0 ? colors.length - 1 : currentIndex - 1)
}

// Get current selected color for an item
const getCurrentColor = (item: any) => {
  const colors = item.colors || []
  if (colors.length === 0) return null
  const key = item.uniqueKey || item.id
  const index = getSelectedColorIndex(key)
  return colors[index] || colors[0]
}

// Get image for a specific color
const getColorImage = (item: any, color: any): string => {
  if (!color) return item.image || ''
  
  // Try to find color-specific image from color object
  if (color.image) {
    // If it's already a full URL, return as is
    if (/^(https?:|data:|blob:)/i.test(color.image)) {
      return color.image
    }
    // Build full URL
    const assetBase = 'https://admin.gotawfeer.com'
    return `${assetBase}/storage/app/public/product/${color.image}`
  }
  
  // Fallback to main product image
  return item.image || ''
}

// Get product image with color support
const getProductImage = (item: any): string => {
  const currentColor = getCurrentColor(item)
  const colorImage = getColorImage(item, currentColor)
  
  if (colorImage) {
    return getImageUrl(colorImage)
  }
  
  return getImageUrl(item.image) || '/images/category-placeholder.png'
}

// Handle image error - use placeholder
const handleImageError = (e: any) => {
  if (e.target && e.target.src !== '/images/category-placeholder.png') {
    e.target.src = '/images/category-placeholder.png'
  }
}

// SEO Configuration
const seo = useSeo()

// Set SEO for compare page
seo.setSeo({
  title: locale.value === 'ar' ? 'مقارنة المنتجات' : 'Compare Products',
  description: locale.value === 'ar' 
    ? 'قارن بين المنتجات في متجر جو توفير لاتخاذ أفضل قرار شراء.'
    : 'Compare products at Go Tawfeer store to make the best purchase decision.',
  keywords: locale.value === 'ar' 
    ? 'مقارنة، منتجات، جو توفير'
    : 'compare, products, Go Tawfeer',
  image: '/images/go-tawfeer-1-1.webp',
  noindex: true // Compare pages typically shouldn't be indexed
})

// @ts-ignore
// t and locale are already defined at the top
const compare = useCompare()

// Initialize compare on mount
onMounted(() => {
  compare.init()
  isMounted.value = true
})

// Check if any product has features
const hasFeatures = computed(() => {
  return compare.items.value.some((item: any) => item.features && item.features.length > 0)
})

// Check if any product has meta_description
const hasMetaDescription = computed(() => {
  return compare.items.value.some((item: any) => item.meta_description && item.meta_description.trim().length > 0)
})

// Check if any product has colors
const hasColors = computed(() => {
  return compare.items.value.some((item: any) => item.colors && Array.isArray(item.colors) && item.colors.length > 0)
})

// Check if any product has variation
const hasVariation = computed(() => {
  return compare.items.value.some((item: any) => item.variation !== null && item.variation !== undefined)
})

// Check if any product has description
const hasDescription = computed(() => {
  return compare.items.value.some((item: any) => item.description && item.description.trim().length > 0)
})

// Check if any product has brand
const hasBrand = computed(() => {
  return compare.items.value.some((item: any) => item.brand && item.brand.trim().length > 0)
})

// Check if any product has category
const hasCategory = computed(() => {
  return compare.items.value.some((item: any) => item.category && item.category.trim().length > 0)
})

// Currency helper
const cfg = useRuntimeConfig() as any
const currencyCode = (cfg?.public?.currencyCode || 'SAR') as string

function money(n: any): string {
  const loc = locale?.value === 'ar' ? 'ar-SA' : 'en-US'
  try {
    return new Intl.NumberFormat(loc, { style: 'currency', currency: currencyCode }).format(Number((n as any)?.value ?? n) || 0)
  } catch {
    const sym = (cfg?.public?.currencySymbol || (locale?.value === 'ar' ? 'ر.س' : 'SAR')) as string
    const raw = (n as any)?.value ?? n
    const val = Number(raw != null ? raw : 0)
    return `${val.toFixed(2)} ${sym}`
  }
}

// Image URL helper
const assetBase = (cfg?.public?.apiBase || 'https://admin.gotawfeer.com/api').replace(/\/api(?:\/v\d+)?$/, '')
const fixPath = (s: string) => {
  let p = s.trim().replace(/\\/g, '/')
  
  // Handle different path formats
  if (p.startsWith('public/')) {
    p = p.replace(/^public\//, '')
  } else if (p.startsWith('app/public/')) {
    p = p.replace(/^app\/public\//, 'storage/')
  } else if (p.startsWith('storage/')) {
    // Already correct format
  } else if (!p.startsWith('http') && !p.startsWith('/')) {
    // If it's just a filename, determine the correct storage path
    if (p.includes('product')) {
      p = `storage/product/${p}`
    } else {
      p = `storage/${p}`
    }
  }
  
  // Clean up slashes
  p = p.replace(/\/+/g, '/').replace(/^\//, '')
  
  return p
}

const getImageUrl = (imagePath: any): string => {
  if (!imagePath) return ''
  
  if (Array.isArray(imagePath)) return getImageUrl(imagePath[0])
  
  let s: any = imagePath
  if (typeof imagePath === 'string') {
    const t = imagePath.trim()
    if (t.startsWith('[') || t.startsWith('{')) {
      try { return getImageUrl(JSON.parse(t)) } catch {}
    }
    s = t
  } else if (typeof imagePath === 'object') {
    s = (imagePath as any).path || (imagePath as any).url || (imagePath as any).image || ''
  }
  
  s = (typeof s === 'string' ? s : '').trim()
  if (!s) return ''
  
  // If already a full URL, return as is
  if (/^(https?:|data:|blob:)/i.test(s)) return s
  
  return `${assetBase}/${fixPath(s)}`
}



// Remove product from comparison
const removeProduct = (productIdOrKey: number | string) => {
  compare.remove(productIdOrKey)
}

// Get color hex from color name
const getColorHex = (colorName: string, colors: any[]): string => {
  if (!colors || !Array.isArray(colors)) return '#ccc'
  const color = colors.find((c: any) => c.name === colorName || c.code === colorName)
  if (color) {
    return color.hex || color.code || '#ccc'
  }
  return '#ccc'
}

// Clear all products
const clearAll = () => {
  if (confirm(t('compare.confirm_clear') || 'هل أنت متأكد من مسح جميع المنتجات من المقارنة؟')) {
    compare.clearAll()
  }
}

// Clear old data
const clearOldData = () => {
  if (confirm('هل أنت متأكد من مسح البيانات القديمة وإعادة تحميل الصفحة؟')) {
    compare.clearOldData()
    // Reload the page to refresh the data
    window.location.reload()
  }
}

// SEO is already configured at the top using seo.setSeo()
</script>

<style scoped>
.compare-page {
  min-height: 100vh;
  background-color: #f8f9fa;
}

.section {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.compare-summary {
  background: #e3f2fd;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
}

.empty-state {
  padding: 3rem 1rem;
}

.compare-table {
  margin-bottom: 0;
}

.feature-column {
  background-color: #f8f9fa;
  font-weight: 600;
  width: 200px;
  vertical-align: middle;
}

.product-column {
  text-align: center;
  vertical-align: top;
  min-width: 250px;
}

.product-header {
  position: relative;
  padding: 1rem;
}

.remove-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 2rem;
  height: 2rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}


/* Product Image Container with Color Navigation */
.product-image-container {
  position: relative;
  margin-bottom: 0.75rem;
}

.product-image {
  width: 140px;
  height: 140px;
  margin: 0 auto;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #f8f9fa;
  border: 2px solid #e5e7eb;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Color Navigation Arrows */
.color-nav-arrows {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  justify-content: space-between;
  padding: 0 2px;
  pointer-events: none;
}

.color-nav-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.2s ease;
  color: #374151;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.color-nav-btn:hover {
  background: #F58040;
  color: white;
  border-color: #F58040;
}

/* Current Color Info */
.current-color-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.current-color-swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  flex-shrink: 0;
}

.current-color-name {
  font-weight: 600;
  color: #374151;
}

.color-counter {
  color: #9ca3af;
  font-size: 0.75rem;
}

/* Color Thumbnails */
.color-thumbnails {
  display: flex;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
  padding: 8px;
  background: #f9fafb;
  border-radius: 8px;
}

.color-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.color-thumb:hover {
  transform: scale(1.15);
  border-color: #F58040;
}

.color-thumb.active {
  border-color: #F58040;
  border-width: 3px;
  box-shadow: 0 0 0 2px rgba(245, 128, 64, 0.2);
}

.product-name {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.selected-variant-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.color-badge {
  background-color: #f3f4f6;
  color: #374151;
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
}

.variation-badge {
  background-color: #dbeafe;
  color: #1e40af;
}

.product-price {
  font-size: 1.25rem;
  font-weight: 700;
  color: #e74c3c;
  margin-bottom: 0.5rem;
}

.product-rating {
  margin-bottom: 1rem;
}

.stars {
  display: inline-block;
  margin-right: 0.5rem;
}

.star-filled {
  color: #ffc107;
}

.star-empty {
  color: #e9ecef;
}

.feature-name {
  background-color: #f8f9fa;
  font-weight: 600;
  padding: 1rem;
  vertical-align: middle;
}

.product-data {
  padding: 1rem;
  vertical-align: middle;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: right;
}

.features-list li {
  padding: 0.25rem 0;
  position: relative;
  padding-right: 1rem;
}

.features-list li::before {
  content: '•';
  color: #28a745;
  font-weight: bold;
  position: absolute;
  right: 0;
}

.description {
  margin: 0;
  line-height: 1.5;
  text-align: right;
}

.colors-display {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.color-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  flex-shrink: 0;
}

.color-circle:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.variation-display {
  text-align: right;
}

.variation-item {
  margin-bottom: 0.5rem;
  padding: 0.25rem 0;
}

.variation-item strong {
  color: #495057;
  margin-left: 0.5rem;
}

.brand-name,
.category-name {
  font-weight: 500;
  color: #495057;
  padding: 0.25rem 0.75rem;
  background-color: #f8f9fa;
  border-radius: 0.25rem;
  display: inline-block;
}

.compare-actions {
  padding: 1rem;
  border-top: 1px solid #dee2e6;
}

@media (max-width: 768px) {
  .table-responsive {
    font-size: 0.875rem;
  }
  
  .product-column {
    min-width: 200px;
  }
  
  .product-image {
    width: 80px;
    height: 80px;
  }
  
  .feature-column {
    width: 150px;
  }
}
</style>
