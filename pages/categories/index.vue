<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useCatalog } from '../../composables/useCatalog'

const { t, locale } = useI18n()
const { categories: getCategories } = useCatalog()
const router = useRouter()

// SEO Configuration
const seo = useSeo()

// Set SEO for categories page
seo.setSeo({
  title: locale.value === 'ar' ? 'التصنيفات' : 'Categories',
  description: locale.value === 'ar' 
    ? 'تصفح جميع التصنيفات المتاحة في متجر جو توفير. عثور على المنتجات التي تبحث عنها بسهولة.'
    : 'Browse all available categories at Go Tawfeer store. Find the products you are looking for easily.',
  keywords: locale.value === 'ar' 
    ? 'تصنيفات، أقسام، منتجات، جو توفير'
    : 'categories, sections, products, Go Tawfeer',
  image: '/images/go-tawfeer-1-1.webp'
})

// Loading state - use pending from useAsyncData
const loadingProgress = ref(0)

// Get category image with proper fallback
const getCategoryImage = (category: any) => {
  // Try different image sources in order of preference
  if (category?.icon_full_url?.path) {
    return category.icon_full_url.path
  }
  if (category?.image_full_url?.path) {
    return category.image_full_url.path
  }
  if (category?.icon) {
    return category.icon
  }
  if (category?.image) {
    return category.image
  }
  // Fallback to placeholder
  return '/images/category-placeholder.jpg'
}

// Preload images for better performance
const preloadImages = (categories: any[]) => {
  if (!process.client) return
  categories.forEach(category => {
    const imageUrl = getCategoryImage(category)
    if (imageUrl && imageUrl !== '/images/category-placeholder.jpg') {
      const img = new Image()
      img.src = imageUrl
    }
  })
}

// Load categories using useAsyncData with proper state management
const { data, pending, error } = await useAsyncData('categories-list', async () => {
  try {
    const result = await getCategories()
    return result
  } catch (error) {
    console.error('[Categories] Failed to load categories:', error)
    return null
  }
})

// Use pending from useAsyncData as loading state
const loading = computed(() => pending.value)

// Watch for data changes to preload images
watch(() => data.value, (newData) => {
  if (newData && process.client) {
    const categories = Array.isArray(newData?.data) ? newData.data : (Array.isArray(newData) ? newData : [])
    if (categories.length > 0) {
      // Preload only visible categories first
      const visibleCategories = categories.slice(0, 12)
      setTimeout(() => preloadImages(visibleCategories), 0)
      // Preload rest in background after a delay
      if (categories.length > 12) {
        setTimeout(() => preloadImages(categories.slice(12)), 500)
      }
    }
  }
}, { immediate: true })

// Group categories using childes/children from API
const groupedCategories = computed(() => {
  const raw = data.value
  if (!raw) return []
  
  let allCategories: any[] = []
  if (Array.isArray(raw?.data)) allCategories = raw.data
  else if (Array.isArray(raw)) allCategories = raw
  else if (Array.isArray(raw?.categories)) allCategories = raw.categories
  else return []
  
  // Get main categories (position = 0 or no position)
  const mainCategories = allCategories.filter((cat: any) => 
    cat.position === 0 || cat.position === '0' || !cat.position || cat.position === null
  )
  
  // Available banner files
  const bannerFiles = [
    'Mask-Group-45.webp',
    'Mask-Group-60.webp',
    'Mask-Group-56.webp',
    'Mask-Group-54.webp',
    'Mask-Group-62.webp',
    'Mask-Group-65.webp',
    'Mask-Group-63.webp',
    'Mask-Group-64.webp',
  ]
  
  // Process main categories and extract childes/children
  return mainCategories.map((mainCat: any, index: number) => {
    // Get subcategories from childes or children property
    const subcategories = Array.isArray(mainCat.childes) 
      ? mainCat.childes 
      : Array.isArray(mainCat.children) 
        ? mainCat.children 
        : Array.isArray(mainCat.subcategories)
          ? mainCat.subcategories
          : []
    
    // Use index to get banner file (cycling through available banners)
    const bannerFile = bannerFiles[index % bannerFiles.length]
    
    return {
      ...mainCat,
      subcategories: subcategories || [],
      banner: bannerFile ? `/images/banners-categories/${bannerFile}` : null
    }
  })
})

const items = computed(() => {
  // For backward compatibility, return flat list
  const raw = data.value
  if (!raw) return []
  if (Array.isArray(raw?.data)) return raw.data
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.categories)) return raw.categories
  return []
})

// Navigate to shop with category filter
const goToCategory = (category: any) => {
  // Use navigateTo for SPA navigation
  const categoryId = category.id || category.category_id || null
  
  if (!categoryId) {
    console.warn('[Categories] No category ID found:', category)
    return
  }
  
  // Log for debugging
  if (process.client) {
    console.log('[Categories] Navigating to shop with category:', {
      id: categoryId,
      name: category.name || category.title,
      isSubcategory: category.position === 1 || category.position === '1'
    })
  }
  
  // Navigate to shop with category filter
  navigateTo(`/shop?category=${categoryId}`)
}

// Handle image error
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  // Only set placeholder if it's not already set
  if (!img.src.includes('category-placeholder.jpg')) {
    img.src = '/images/category-placeholder.jpg'
  }
}

// Handle image load success
const handleImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.classList.add('loaded')
}
</script>

<template>
  <div class="categories-page" dir="rtl">
    <!-- Header Section -->
    <div class="categories-header">
      <div class="container">
        <div class="header-content">
          <h1 class="page-title">
            <svg width="32" height="32" viewBox="0 0 24 24" class="title-icon">
              <path fill="currentColor" d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2Z"/>
            </svg>
            {{ t('categories') || 'التصنيفات' }}
          </h1>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <div class="loading-progress">
        <div class="progress-bar" :style="{ width: loadingProgress + '%' }"></div>
      </div>
      <span class="loading-text">{{ t('shop.loading_categories') || 'جاري تحميل التصنيفات...' }}</span>
      
      <!-- Skeleton Loading -->
      <div class="skeleton-categories">
        <div v-for="n in 6" :key="n" class="skeleton-card">
          <div class="skeleton-image"></div>
          <div class="skeleton-content">
            <div class="skeleton-title"></div>
            <div class="skeleton-description"></div>
            <div class="skeleton-meta"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Categories Grid -->
    <div v-else class="categories-container">
      <div class="container">
        <!-- Grouped Categories with Subcategories -->
        <div v-if="groupedCategories.length > 0" class="categories-groups">
          <div 
            v-for="(mainCategory, groupIndex) in groupedCategories" 
            :key="mainCategory?.id || groupIndex" 
            class="category-group"
          >
            <!-- Main Category Card -->


            <!-- Banner and Subcategories -->
            <div v-if="mainCategory.subcategories && mainCategory.subcategories.length > 0" class="subcategories-section">
              <!-- Banner -->
              <div v-if="mainCategory.banner" class="category-banner">
                <img 
                  :src="mainCategory.banner" 
                  :alt="mainCategory?.name || 'Banner'"
                  class="banner-img"
                  loading="lazy"
                  @error="(e: any) => { e.target.style.display = 'none' }"
                />
              </div>

              <!-- Subcategories Grid -->
              <div class="subcategories-grid">
                <div 
                  v-for="(subcategory, subIndex) in mainCategory.subcategories" 
                  :key="subcategory?.id || subIndex" 
                  class="subcategory-card"
                  @click="goToCategory(subcategory)"
                >
                  <div class="subcategory-info">
                    <h4 class="subcategory-name">
                      {{ subcategory?.name || subcategory?.title || t('subcategory') || 'تصنيف فرعي' }}
                    </h4>
                    <div class="subcategory-meta">
                      <span class="products-count" v-if="subcategory?.product_count || subcategory?.products_count">
                        {{ subcategory.product_count || subcategory.products_count }} {{ t('shop.products') || 'منتج' }}
                      </span>
                    </div>
                  </div>
                  <div class="subcategory-arrow">
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M8.59 16.58L13.17 12L8.59 7.41L10 6l6 6-6 6-1.41-1.42z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Fallback: Simple Grid (if no grouped structure) -->
        <div v-else class="categories-grid">
          <div 
            v-for="(category, index) in items" 
            :key="category?.id || index" 
            class="category-card"
            @click="goToCategory(category)"
          >
            <!-- Category Image -->
            <div class="category-image">
              <img 
                :src="getCategoryImage(category)" 
                :alt="category?.name || category?.title || 'Category'"
                class="category-img"
                loading="lazy"
                @error="handleImageError"
                @load="handleImageLoad"
              />
              <div class="category-overlay">
                <svg width="24" height="24" viewBox="0 0 24 24" class="overlay-icon">
                  <path fill="currentColor" d="M8.59 16.58L13.17 12L8.59 7.41L10 6l6 6-6 6-1.41-1.42z"/>
                </svg>
              </div>
            </div>

            <!-- Category Info -->
            <div class="category-info">
              <h3 class="category-name">
                {{ category?.name || category?.title || t('category') || 'تصنيف' }}
              </h3>
              <p class="category-description" v-if="category?.description">
                {{ category.description }}
              </p>
              <div class="category-meta">
                <span class="products-count" v-if="category?.product_count || category?.products_count">
                  {{ category.product_count || category.products_count }} {{ t('products') || 'منتج' }}
                </span>
              </div>
            </div>

            <!-- Hover Effect -->
            <div class="category-hover-effect"></div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="(!groupedCategories || groupedCategories.length === 0) && (!items || items.length === 0)" class="empty-state">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24">
              <path fill="currentColor" d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2Z"/>
            </svg>
          </div>
          <h3>{{ t('no_categories') || 'لا توجد تصنيفات' }}</h3>
          <p>{{ t('no_categories_description') || 'لم يتم العثور على أي تصنيفات في الوقت الحالي' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&family=IBM+Plex+Sans+Arabic:wght@100;200;300;400;500;600;700&family=Tajawal:wght@200;300;400;500;700;800;900&display=swap');

.categories-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
  font-family: "Tajawal", sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Header Section */
.categories-header {
  background: linear-gradient(135deg, #F58040 0%, #ff6b35 100%);
  color: white;
  padding: 60px 0;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.categories-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.05)"/><circle cx="10" cy="60" r="0.5" fill="rgba(255,255,255,0.05)"/><circle cx="90" cy="40" r="0.5" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  opacity: 0.3;
  z-index: 1;
}

.header-content {
  position: relative;
  z-index: 2;
}

.page-title {
  font-size: 48px;
  font-weight: 800;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.title-icon {
  color: #ffd700;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.page-subtitle {
  font-size: 18px;
  font-weight: 400;
  margin: 0;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Loading State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 24px;
}

.loading-spinner {
  position: relative;
  width: 80px;
  height: 80px;
}

.spinner-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 4px solid transparent;
  border-radius: 50%;
  animation: spin 1.5s linear infinite;
}

.spinner-ring:nth-child(1) {
  border-top-color: #F58040;
  animation-delay: 0s;
}

.spinner-ring:nth-child(2) {
  border-right-color: #667eea;
  animation-delay: 0.5s;
}

.spinner-ring:nth-child(3) {
  border-bottom-color: #764ba2;
  animation-delay: 1s;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-progress {
  width: 200px;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #F58040, #667eea, #764ba2);
  border-radius: 3px;
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
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.loading-text {
  font-size: 16px;
  font-weight: 600;
  color: #666;
}

/* Skeleton Loading */
.skeleton-categories {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 40px;
  width: 100%;
}

.skeleton-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(245, 128, 64, 0.1);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-image {
  width: 100%;
  height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
}

.skeleton-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-title {
  height: 24px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 4px;
  width: 80%;
}

.skeleton-description {
  height: 16px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 4px;
  width: 100%;
}

.skeleton-meta {
  height: 20px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 10px;
  width: 60%;
  margin: 0 auto;
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes skeleton-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}


/* Categories Groups */
.categories-groups {
  display: flex;
  flex-direction: column;
  gap: 60px;
  margin-top: 40px;
}

.category-group {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.main-category-wrapper {
  width: 100%;
}

.main-category-card {
  max-width: 400px;
  margin: 0 auto;
}

/* Subcategories Section */
.subcategories-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Category Banner */
.category-banner {
  width: 100%;
  margin-bottom: 20px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.banner-img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
}

/* Subcategories Grid */
.subcategories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.subcategory-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.subcategory-card:hover {
  border-color: #F58040;
  background: linear-gradient(135deg, #fff5f0 0%, #fff 100%);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(245, 128, 64, 0.2);
}

.subcategory-info {
  flex: 1;
}

.subcategory-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.subcategory-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subcategory-card .products-count {
  background: linear-gradient(135deg, #F58040, #ff6b35);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(245, 128, 64, 0.3);
}

.subcategory-arrow {
  color: #6b7280;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.subcategory-card:hover .subcategory-arrow {
  color: #F58040;
  transform: translateX(-4px);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-top: 40px;
}

/* Category Card */
.category-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  cursor: pointer;
  position: relative;
  border: 1px solid rgba(245, 128, 64, 0.1);
}

.category-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 40px rgba(245, 128, 64, 0.2);
  border-color: #F58040;
}

.category-image {
  position: relative;
  height: 200px;
  overflow: hidden;
  background: linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%);
}

.category-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease, opacity 0.3s ease;
  opacity: 0;
}

.category-img.loaded {
  opacity: 1;
}

.category-card:hover .category-img {
  transform: scale(1.1);
}

.category-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.category-card:hover .category-overlay {
  opacity: 1;
}

.overlay-icon {
  color: white;
  transform: translateX(-10px);
  transition: transform 0.3s ease;
}

.category-card:hover .overlay-icon {
  transform: translateX(0);
}

.category-info {
  padding: 24px;
  text-align: center;
}

.category-name {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.category-description {
  font-size: 14px;
  color: #666;
  margin: 0 0 16px 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.category-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.products-count {
  background: linear-gradient(135deg, #F58040, #ff6b35);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(245, 128, 64, 0.3);
}

.category-hover-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(245, 128, 64, 0.05) 0%, rgba(102, 126, 234, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.category-card:hover .category-hover-effect {
  opacity: 1;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #666;
}

.empty-icon {
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: #333;
}

.empty-state p {
  font-size: 16px;
  margin: 0;
  line-height: 1.5;
}

/* Responsive Design */
@media (max-width: 768px) {
  .page-title {
    font-size: 36px;
    flex-direction: column;
    gap: 8px;
  }
  
  .page-subtitle {
    font-size: 16px;
  }
  
  .categories-groups {
    gap: 40px;
  }
  
  .subcategories-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .subcategory-card {
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .subcategory-arrow {
    align-self: flex-end;
  }
  
  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  
  .category-image {
    height: 160px;
  }
  
  .category-info {
    padding: 20px;
  }
  
  .category-name {
    font-size: 18px;
  }
  
  .main-category-card {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .subcategories-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .categories-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .page-title {
    font-size: 28px;
  }
  
  .categories-header {
    padding: 40px 0;
  }

  .categories-groups {
    gap: 30px;
  }
  
  .subcategory-card {
    padding: 14px;
  }
  
  .subcategory-name {
    font-size: 14px;
  }
}
</style>
