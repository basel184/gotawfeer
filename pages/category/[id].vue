<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t } = useI18n()
const { byCategory } = useProducts()

// Get category ID from route params
const id = computed(() => String(route.params.id || ''))

// Fetch category products with proper error handling and lazy loading
const { data, pending, error } = await useAsyncData(
  `cat-${id.value}`, 
  () => byCategory(id.value),
  {
    lazy: true, // Don't block page render
    server: true, // Allow SSR
    default: () => null,
    // Watch for route changes to refetch when ID changes
    watch: [id]
  }
)

// Normalize data structure
const items = computed(() => {
  const val: any = data.value
  if (!val) return []
  if (Array.isArray(val)) return val
  if (Array.isArray(val?.data)) return val.data
  if (Array.isArray(val?.products)) return val.products
  if (Array.isArray(val?.items)) return val.items
  return []
})

// Set page title
useHead({
  title: computed(() => {
    const categoryName = items.value[0]?.category?.name || items.value[0]?.categories?.[0]?.name || 'Category'
    return `${categoryName} - ${t('site_name') || 'Go Tawfeer'}`
  })
})
</script>

<template>
  <div class="category-page" dir="rtl">
    <!-- Loading State -->
    <div v-if="pending" class="loading-container">
      <div class="loading-spinner"></div>
      <p>{{ t('loading') || 'جاري التحميل...' }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <h2>{{ t('error') || 'حدث خطأ' }}</h2>
      <p>{{ error.message || t('error_loading_category') || 'تعذر تحميل التصنيف' }}</p>
      <NuxtLink to="/shop" class="btn-primary">
        {{ t('back_to_shop') || 'العودة للمتجر' }}
      </NuxtLink>
    </div>

    <!-- Content -->
    <div v-else-if="items.length > 0" class="category-content">
      <div class="container">
        <h1 class="category-title">
          {{ items[0]?.category?.name || items[0]?.categories?.[0]?.name || 'Category' }}
        </h1>
        <p class="category-count">
          {{ items.length }} {{ t('products') || 'منتج' }}
        </p>
        
        <ProductGrid :products="items" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-container">
      <h2>{{ t('no_products') || 'لا توجد منتجات' }}</h2>
      <p>{{ t('no_products_in_category') || 'لا توجد منتجات في هذا التصنيف' }}</p>
      <NuxtLink to="/shop" class="btn-primary">
        {{ t('browse_all_products') || 'تصفح جميع المنتجات' }}
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.category-page {
  min-height: 60vh;
  padding: 2rem 0;
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 2rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #f58040;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.category-content {
  padding: 2rem 0;
}

.category-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #333;
  margin-bottom: 1rem;
}

.category-count {
  color: #666;
  margin-bottom: 2rem;
}

.btn-primary {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: #f58040;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  margin-top: 1rem;
  transition: background 0.3s;
}

.btn-primary:hover {
  background: #e67030;
}
</style>
