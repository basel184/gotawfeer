<template>
  <div class="toggle-sidebar">
    <i class="fa-solid fa-chevron-left"></i>
  </div>
  <div 
    class="categories-sidebar shadow" 
    :dir="uiDir"
    :class="{ 'expanded': isSidebarExpanded }"
    @mouseenter="handleSidebarEnter"
    @mouseleave="handleSidebarLeave"
  >
    <!-- Menu Toggle Button -->
    <div class="menu-toggle">
      <div class="hamburger-icon">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>

    <!-- Categories Icons List -->
    <div class="categories-icons" v-if="!loading">
      <div 
        v-for="category in categories" 
        :key="category.id"
        class="category-icon-item"
        :class="{ 'active': hoveredCategoryId === category.id }"
        @mouseenter="handleCategoryIconEnter(category)"
        @mouseleave="handleCategoryIconLeave"
        @click="goToCategory(category)"
      >
        <img 
          :src="getCategoryImage(category)" 
          :alt="category.name"
          class="category-icon"
          @error="handleImageError"
        />
        <div class="category-info">
          <h4>{{ category.name }}</h4>
          <p v-if="getProductCount(category) > 0">
            {{ getProductCount(category) }} {{ getProductCount(category) === 1 ? t('shop.products') : t('products') }}
          </p>
          <p v-else>
            {{ t('no_products') || 'لا توجد منتجات' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && categories.length === 0" class="empty-state">
      <svg class="empty-icon" width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" stroke="currentColor" stroke-width="2"/>
        <path d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" stroke="currentColor" stroke-width="2"/>
      </svg>
    </div>

    <!-- Subcategories Overlay -->
    <transition name="slide-fade-sub">
      <div 
        v-if="hoveredCategory && hoveredCategory.childes && hoveredCategory.childes.length > 0" 
        class="subcategories-overlay"
        @mouseenter="handleSubcategoriesEnter"
        @mouseleave="handleSubcategoriesLeave"
      >
        <div class="subcategories-content">
          <div class="subcategories-grid">
            <div 
              class="subcategory-item view-all"
              @click="goToCategory(hoveredCategory)"
            >
              <h5>{{ locale === 'ar' ? 'كل منتجات ' + hoveredCategory.name : 'All ' + hoveredCategory.name }}</h5>
              <p>
                ( {{ getProductCount(hoveredCategory) }} 
                {{ getProductCount(hoveredCategory) <= 1 
                  ? t('shop.products') 
                  : t('products') 
                }} )
              </p>
            </div>
            <div 
              v-for="subcategory in hoveredCategory.childes" 
              :key="subcategory.id"
              class="subcategory-item"
              @click="goToSubcategory(subcategory)"
            >
              <h5>{{ subcategory.name }}</h5>
              <p>
                ( {{ getProductCount(subcategory) }} 
                {{ getProductCount(subcategory) <= 1 
                  ? t('shop.products') 
                  : t('products') 
                }} )
              </p>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t, locale } = useI18n()
const router = useRouter()

const uiDir = computed(() => locale.value === 'ar' ? 'rtl' : 'ltr')

const loading = ref(false)
const categories = ref<any[]>([])
const hoveredCategory = ref<any>(null)
const hoveredCategoryId = ref<number | null>(null)
const isSidebarExpanded = ref(false)

const hideTimer = ref<NodeJS.Timeout | null>(null)
const HIDE_DELAY = 300

const clearHideTimer = () => {
  if (hideTimer.value) {
    clearTimeout(hideTimer.value)
    hideTimer.value = null
  }
}

const setHideTimer = () => {
  clearHideTimer()
  hideTimer.value = setTimeout(() => {
    isSidebarExpanded.value = false
    hoveredCategory.value = null
    hoveredCategoryId.value = null
  }, HIDE_DELAY)
}

const handleSidebarEnter = () => {
  clearHideTimer()
  isSidebarExpanded.value = true
}

const handleSidebarLeave = () => {
  setHideTimer()
}

const handleCategoryIconEnter = (category: any) => {
  clearHideTimer()
  hoveredCategoryId.value = category.id
  hoveredCategory.value = category
}

const handleCategoryIconLeave = () => {
  // Don't clear immediately, wait for potential subcategories hover
}

const handleSubcategoriesEnter = () => {
  clearHideTimer()
}

const handleSubcategoriesLeave = () => {
  hoveredCategory.value = null
  hoveredCategoryId.value = null
  setHideTimer()
}

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

const goToCategory = (category: any) => {
  // Create shop link with category query parameter
  const shopPath = `/shop?category=${category.id}`
  
  // Apply i18n localization and navigate
  navigateTo(getLocalizedPath(shopPath))
  
  isSidebarExpanded.value = false
  hoveredCategory.value = null
  hoveredCategoryId.value = null
}

const goToSubcategory = (subcategory: any) => {
  // Create shop link with category query parameter
  const shopPath = `/shop?category=${subcategory.id}`
  
  // Apply i18n localization and navigate
  navigateTo(getLocalizedPath(shopPath))
  
  isSidebarExpanded.value = false
  hoveredCategory.value = null
  hoveredCategoryId.value = null
}

const getProductCount = (subcategory: any): number => {
  if (subcategory?.product_count !== undefined && subcategory?.product_count !== null) {
    return Number(subcategory.product_count)
  }
  if (subcategory?.products_count !== undefined && subcategory?.products_count !== null) {
    return Number(subcategory.products_count)
  }
  return 0
}

const getCategoryImage = (category: any) => {
  if (category.icon_full_url?.path) return category.icon_full_url.path
  if (category.image_full_url?.path) return category.image_full_url.path
  if (category.icon) return category.icon
  if (category.image) return category.image
  return '/images/category-placeholder.png'
}

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  if (!target.src.includes('category-placeholder.png')) {
    target.src = '/images/category-placeholder.png'
  } else {
    target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="10">?</text></svg>'
    target.onerror = null
  }
}

const loadCategories = async () => {
  try {
    loading.value = true
    const { $get } = useApi()
    const response = await $get('v1/categories/', { timeout: 3000 })
    categories.value = response && Array.isArray(response) ? response : []
  } catch (error) {
    console.error('Error loading categories:', error)
    categories.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCategories()
  const toggleSidebarV = document.getElementsByClassName("toggle-sidebar")[0]
  const catSidebar = document.querySelector(".categories-sidebar")
  const categoriesBtn = document.querySelector(".categories-btn")
  const toggleSidebar = () => {
    catSidebar?.classList.toggle("hide")
    toggleSidebarV?.classList.toggle("hide")
  }
  toggleSidebarV?.addEventListener("click", toggleSidebar)
  categoriesBtn?.addEventListener("click", toggleSidebar)
})

onUnmounted(() => {
  clearHideTimer()
})
</script>

<style scoped>
/* Main Sidebar - Collapsed by default */
.categories-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  height: 100vh;
  z-index: 1000;
  background: #fff;
  transition: width 0.3s ease;
  padding: 20px 8px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  width: 70px; /* Collapsed width */
}

.categories-sidebar.expanded {
  width: 280px; /* Expanded width */
}

[dir="ltr"] .categories-sidebar {
  border-radius: 0 20px 20px 0;
}

.categories-sidebar[dir="rtl"] {
  inset-inline-start: 0;
  border-radius: 20px 0 0 20px;
  transition: .3s;
}

.categories-sidebar.hide {
  inset-inline-start: -70px;
}

.categories-sidebar.expanded.hide {
  inset-inline-start: -280px;
}

/* Menu Toggle */
.menu-toggle {
  background: #3B82F6;
  color: white;
  padding: 12px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  width: 50px;
  height: 50px;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.menu-toggle:hover {
  background: #2563EB;
  transform: scale(1.1);
}

.hamburger-icon {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.hamburger-icon span {
  width: 18px;
  height: 2px;
  background: white;
  border-radius: 1px;
}

/* Categories Icons List */
.categories-icons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 5px 0;
}

.categories-icons::-webkit-scrollbar {
  width: 4px;
}

.categories-icons::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 2px;
}

.categories-icons::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

/* Category Item */
.category-icon-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
  /* background: #f9fafb; */
  border: 2px solid transparent;
  min-height: 54px;
}

.category-icon-item:hover {
  background: #eff6ff;
  border-color: #3B82F6;
}

/* .category-icon-item.active {
  background: #dbeafe;
  border-color: #2563EB;
} */

.category-icon {
  width: 38px;
  height: 38px;
  object-fit: contain;
  border-radius: 8px;
  background: white;
  padding: 5px;
  flex-shrink: 0;
}

/* Category Info - Hidden when collapsed */
.category-info {
  flex: 1;
  min-width: 0;
  opacity: 0;
  width: 0;
  overflow: hidden;
  transition: opacity 0.3s ease, width 0.3s ease;
}

.categories-sidebar.expanded .category-info {
  opacity: 1;
  width: auto;
}

.category-info h4 {
  margin: 0 0 2px 0;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-info p {
  margin: 0;
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
}

/* Subcategories Overlay */
.subcategories-overlay {
  position: fixed;
  top: 0;
  bottom: 0;
  height: 100vh;
  z-index: 999;
  display: flex;
  align-items: center;
}

[dir="rtl"] .subcategories-overlay {
  right: 280px;
  left: auto;
}

[dir="ltr"] .subcategories-overlay {
  left: 280px;
  right: auto;
}

.subcategories-content {
  background: white;
  padding: 20px;
  max-width: 450px;
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  box-shadow: 10px 0 40px rgba(0, 0, 0, 0.1);
}

[dir="ltr"] .subcategories-content {
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.1);
}

.subcategories-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 10px 0;
}

.subcategory-item {
  background: #f9f9f9;
  padding: 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  text-align: center;
}

.subcategory-item:hover {
  background: #3B82F6;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.subcategory-item h5 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.subcategory-item p {
  margin-top: 5px;
  font-size: 11px;
  opacity: 0.8;
}

.subcategory-item:hover p {
  color: white;
}

.subcategory-item.view-all {
  background: #eff6ff;
  border-color: #3B82F6;
}

.subcategory-item.view-all h5 {
  color: #1e40af;
}

.subcategory-item.view-all p {
  color: #1d4ed8;
}

.subcategory-item.view-all:hover {
  background: #3B82F6;
  border-color: #3B82F6;
}

.subcategory-item.view-all:hover h5,
.subcategory-item.view-all:hover p {
  color: white;
}

/* States */
.loading-state, .empty-state {
  padding: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: auto;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3B82F6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  color: #9ca3af;
}

/* Transitions */
.slide-fade-sub-enter-active,
.slide-fade-sub-leave-active {
  transition: all 0.25s ease;
}

.slide-fade-sub-enter-from,
.slide-fade-sub-leave-to {
  opacity: 0;
  transform: translateX(-15px);
}

[dir="ltr"] .slide-fade-sub-enter-from,
[dir="ltr"] .slide-fade-sub-leave-to {
  transform: translateX(15px);
}

/* Toggle Button */
.toggle-sidebar {
  background-color: #3B82F6;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  position: fixed;
  inset-inline-start: 50px;
  top: 90%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: .3s;
  z-index: 999;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toggle-sidebar:hover {
  background-color: #2563EB;
  transform: translate(-50%, -50%) scale(1.1);
}

.toggle-sidebar.hide {
  inset-inline-start: -20px;
}

/* Responsive */
@media (max-width: 768px) {
  .categories-sidebar, .toggle-sidebar {
    display: none !important;
  }
}

@media (max-width: 1200px) {
  .categories-sidebar.expanded {
    width: 250px;
  }
  
  [dir="rtl"] .subcategories-overlay {
    right: 250px;
  }
  
  [dir="ltr"] .subcategories-overlay {
    left: 250px;
  }
  
  .subcategories-content {
    max-width: 350px;
  }
  
  .subcategories-grid {
    grid-template-columns: 1fr;
  }
}
</style>