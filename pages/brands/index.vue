<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t, locale } = useI18n()
const { $get } = useApi()
const router = useRouter()

// SEO Configuration
const seo = useSeo()

// Set SEO for brands page
seo.setSeo({
  title: locale.value === 'ar' ? 'البراندات' : 'Brands',
  description: locale.value === 'ar' 
    ? 'تصفح جميع العلامات التجارية المتاحة في متجر جو توفير. منتجات أصلية من أفضل البراندات العالمية.'
    : 'Browse all available brands at Go Tawfeer store. Authentic products from the best international brands.',
  keywords: locale.value === 'ar' 
    ? 'براندات، علامات تجارية، منتجات أصلية، جو توفير'
    : 'brands, trademarks, authentic products, Go Tawfeer',
  image: '/images/go-tawfeer-1-1.webp'
})

// Loading state - Start with false for instant display
const loading = ref(false)
const loadingProgress = ref(0)

// Get brand image with proper fallback
const getBrandImage = (brand: any) => {
  // Try different image sources in order of preference
  if (brand?.image_full_url?.path) {
    return brand.image_full_url.path
  }
  if (brand?.logo_full_url?.path) {
    return brand.logo_full_url.path
  }
  if (brand?.image_full_url) {
    return brand.image_full_url
  }
  if (brand?.logo_full_url) {
    return brand.logo_full_url
  }
  if (brand?.image) {
    return brand.image
  }
  if (brand?.logo) {
    return brand.logo
  }
  // Fallback to placeholder
  return '/images/brand-placeholder.jpg'
}

// Preload images for better performance
const preloadImages = (brands: any[]) => {
  brands.forEach(brand => {
    const imageUrl = getBrandImage(brand)
    if (imageUrl && imageUrl !== '/images/brand-placeholder.jpg') {
      const img = new Image()
      img.src = imageUrl
    }
  })
}

// Load brands with ultra-fast loading
const { data } = await useAsyncData('brands-list', async () => {
  loading.value = true
  loadingProgress.value = 0
  
  try {
    const result = await $get('v1/brands', {
      params: {
        limit: 1000
      }
    })
    loadingProgress.value = 100
    
    // Preload images in background (non-blocking) - only first 12 for faster initial load
    const brands = result?.data || result || []
    if (Array.isArray(brands)) {
      // Preload only visible brands first
      const visibleBrands = brands.slice(0, 12)
      setTimeout(() => preloadImages(visibleBrands), 0)
      // Preload rest in background after a delay
      if (brands.length > 12) {
        setTimeout(() => preloadImages(brands.slice(12)), 500)
      }
    }
    
    // Complete loading immediately
    loading.value = false
    loadingProgress.value = 0
    
    return result
  } catch (error) {
    loading.value = false
    loadingProgress.value = 0
    throw error
  }
})

const items = computed(() => {
  const raw = data.value
  if (!raw) return []
  
  // Handle different API response structures
  if (raw?.brands && Array.isArray(raw.brands)) {
    return raw.brands
  }
  if (Array.isArray(raw?.data)) {
    return raw.data
  }
  if (Array.isArray(raw?.data?.data)) {
    return raw.data.data
  }
  if (Array.isArray(raw)) {
    return raw
  }
  return []
})

// Helper function to get localized path with proper i18n handling
const getLocalizedPath = (path: string): string => {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  
  // Get current locale from i18n
  const currentLocale = locale.value || 'ar'
  
  // If English locale, add /en prefix
  if (currentLocale === 'en') {
    // Don't add prefix if already present
    if (cleanPath.startsWith('/en')) {
      return cleanPath
    }
    // Add /en prefix
    return `/en${cleanPath}`
  }
  
  // For Arabic (default), remove /en prefix if present
  if (cleanPath.startsWith('/en')) {
    return cleanPath.substring(3) || '/'
  }
  
  return cleanPath
}

// Navigate to shop with brand filter
const goToBrand = (brand: any) => {
  // Start loading
  loading.value = true
  loadingProgress.value = 0
  
  // Simulate progress
  const progressInterval = setInterval(() => {
    if (loadingProgress.value < 90) {
      loadingProgress.value += Math.random() * 30
    }
  }, 100)
  
  // Create shop link with brand query parameter
  const shopPath = `/shop?brand=${String(brand.id)}`
  
  // Apply i18n localization and navigate
  navigateTo(getLocalizedPath(shopPath))
  
  // Complete loading
  setTimeout(() => {
    loadingProgress.value = 100
    clearInterval(progressInterval)
    setTimeout(() => {
      loading.value = false
      loadingProgress.value = 0
    }, 300)
  }, 600)
}

// Handle image error
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  // Only set placeholder if it's not already set
  if (!img.src.includes('brand-placeholder.jpg')) {
    img.src = '/images/brand-placeholder.jpg'
  }
}

// Handle image load success
const handleImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.classList.add('loaded')
}
</script>

<template>
  <div class="brands-page">
    <!-- Header Section -->
    <div style="text-align: center;">
      <img style="width: 78%;" src="/images/براندات-جوتوفير (2).png" height="auto" alt="العروض" class="banner-image" />
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
      <span class="loading-text">{{ t('loading_brands') || 'جاري تحميل العلامات التجارية...' }}</span>
      
             <!-- Skeleton Loading -->
             <div class="skeleton-brands">
               <div v-for="n in 6" :key="n" class="skeleton-brand-card">
                 <div class="skeleton-logo"></div>
                 <div class="skeleton-name"></div>
               </div>
             </div>
    </div>

    <!-- Brands Grid -->
    <div v-else class="brands-container">
      <div class="container">
        <div class="brands-grid">
          <div 
            v-for="(brand, index) in items" 
            :key="brand?.id || index" 
            class="brand-card"
            @click="goToBrand(brand)"
          >
            <!-- Brand Logo -->
            <div class="brand-logo">
              <img 
                :src="getBrandImage(brand)" 
                :alt="brand?.name || brand?.title || 'Brand'"
                class="brand-img"
                loading="lazy"
                @error="handleImageError"
                @load="handleImageLoad"
              />
            </div>

            <!-- Brand Info -->
            <div class="brand-info">
              <h3 class="brand-name">
                {{ brand?.name || brand?.title || t('brand') || 'علامة تجارية' }}
              </h3>
              <div class="brand-meta" v-if="brand?.brand_products_count || brand?.products_count || brand?.product_count">
                <span class="products-count">
                  {{ brand.brand_products_count || brand.products_count || brand.product_count }} {{ t('products') || 'منتج' }}
                </span>
              </div>
            </div>

            <!-- Hover Effect -->
            <div class="brand-hover-effect"></div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!items || items.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <h3>{{ t('no_brands') || 'لا توجد علامات تجارية' }}</h3>
          <p>{{ t('no_brands_description') || 'لم يتم العثور على أي علامات تجارية في الوقت الحالي' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&family=IBM+Plex+Sans+Arabic:wght@100;200;300;400;500;600;700&family=Tajawal:wght@200;300;400;500;700;800;900&display=swap');

.brands-page {
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
.brands-header {
  background: linear-gradient(135deg, #F58040 0%, #ff6b35 100%);
  color: white;
  padding: 60px 0;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.brands-header::before {
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
  border-top-color: #667eea;
  animation-delay: 0s;
}

.spinner-ring:nth-child(2) {
  border-right-color: #764ba2;
  animation-delay: 0.5s;
}

.spinner-ring:nth-child(3) {
  border-bottom-color: #F58040;
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
  background: linear-gradient(135deg, #F58040 0%, #ff6b35 100%);
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
.skeleton-brands {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
  margin-top: 30px;
  width: 100%;
}

.skeleton-brand-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(102, 126, 234, 0.1);
  animation: skeleton-pulse 1s ease-in-out infinite;
  padding: 24px;
  text-align: center;
}

.skeleton-logo {
  width: 80px;
  height: 60px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1s infinite;
  border-radius: 8px;
  margin: 0 auto 16px;
}

.skeleton-name {
  height: 20px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1s infinite;
  border-radius: 4px;
  width: 70%;
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

/* Brands Container */
.brands-container {
  padding: 60px 0;
}

.brands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
  margin-top: 40px;
}

/* Brand Card */
.brand-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  cursor: pointer;
  position: relative;
  border: 1px solid rgba(102, 126, 234, 0.1);
  padding: 24px;
  text-align: center;
}

.brand-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 40px rgba(102, 126, 234, 0.2);
  border-color: #667eea;
}

.brand-logo {
  position: relative;
  height: auto;
  overflow: hidden;
  background: linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%);
  border-radius: 12px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease, opacity 0.3s ease;
  opacity: 0;
}

.brand-img.loaded {
  opacity: 1;
}

.brand-card:hover .brand-img {
  transform: scale(1.1);
}


.brand-card:hover .brand-overlay {
  opacity: 1;
}

.overlay-icon {
  color: white;
  transform: translateX(-10px);
  transition: transform 0.3s ease;
}

.brand-card:hover .overlay-icon {
  transform: translateX(0);
}

.brand-info {
  text-align: center;
}

.brand-name {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.brand-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.products-count {
  background: linear-gradient(135deg, #F58040 0%, #ff6b35 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.brand-hover-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  border-radius: 16px;
}

.brand-card:hover .brand-hover-effect {
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
  
  .brands-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 16px;
  }
  
  
  .brand-name {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .brands-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }
  
  .page-title {
    font-size: 28px;
  }
  
  .brands-header {
    padding: 40px 0;
  }
  
  .brands-container {
    padding: 40px 0;
  }
  
  .brand-card {
    padding: 16px;
  }

}
</style>
