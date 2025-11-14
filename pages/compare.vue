<template>
  <main class="compare-page p-3" dir="rtl">
    <div class="container">
      <!-- Header Section -->
      <section class="section card">
        <div class="section-header p-3">
          <h1>{{ t('compare.title') || 'مقارنة المنتجات' }}</h1>
          <div class="compare-summary" v-if="!compare.isEmpty.value">
            <span class="items-count">{{ compare.compareCount.value }} {{ t('compare.items_count') || 'منتج للمقارنة' }}</span>
          </div>
        </div>
      </section>

      
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
                <th v-for="item in compare.items.value" :key="item.id" class="product-column">
                  <div class="product-header">
                    <button @click="removeProduct(item.id)" class="btn btn-sm btn-outline-danger remove-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                    <div class="product-image" v-if="item.image">
                      <img 
                        :src="item.image" 
                        :alt="item.name" 
                        style="width: 100%; height: 100%; object-fit: cover;"
                      />
                    </div>
                    <h5 class="product-name">{{ item.name }}</h5>
                    <div class="product-price">{{ money(item.price) }}</div>
                    <div class="product-rating" v-if="item.rating > 0">
                      <div class="stars">
                        <span v-for="i in 5" :key="i" :class="i <= item.rating ? 'star-filled' : 'star-empty'">★</span>
                      </div>
                      <small class="text-muted">({{ item.reviews_count }})</small>
                    </div>
                    <div class="product-actions mt-3">
                      <NuxtLink :to="`/product/${item.slug}`" class="btn btn-sm btn-outline-primary">
                        {{ t('compare.view_details') || 'عرض التفاصيل' }}
                      </NuxtLink>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>

          </table>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'

// @ts-ignore
const { t } = useI18n()
// @ts-ignore
const compare = useCompare()

// Initialize compare on mount
onMounted(() => {
  compare.init()
})

// Check if any product has features
const hasFeatures = computed(() => {
  return compare.items.value.some((item: any) => item.features && item.features.length > 0)
})

// Currency helper
const cfg = useRuntimeConfig() as any
const currencyCode = (cfg?.public?.currencyCode || 'SAR') as string
// @ts-ignore
const { locale } = useI18n() as any

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



// Remove product from comparison
const removeProduct = (productId: number) => {
  compare.remove(productId)
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

// SEO
// @ts-ignore
useHead({
  title: t('compare.title') || 'مقارنة المنتجات',
  meta: [
    { name: 'description', content: t('compare.meta_description') || 'قارن بين المنتجات المختلفة واختر الأفضل' }
  ]
})
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


.product-image {
  width: 120px;
  height: 120px;
  margin: 0 auto 1rem;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #f8f9fa;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-name {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  line-height: 1.3;
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
