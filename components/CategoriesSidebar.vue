<template>
  <div class="toggle-sidebar">
    <i class="fa-solid fa-chevron-left"></i>
  </div>
  <div class="categories-sidebar" :dir="uiDir">
    <!-- Menu Toggle Button -->
    <div 
      class="menu-toggle" 
      @mouseenter="showMainCategories"
      @mouseleave="startHideMainCategoriesTimer"
    >
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
        @mouseenter="showMainCategories"
        @mouseleave="startHideMainCategoriesTimer"
      >
        <img 
          :src="getCategoryImage(category)" 
          :alt="category.name"
          class="category-icon"
          @error="handleImageError"
        />
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

    <!-- Main Categories Overlay -->
    <transition name="slide-fade">
      <div 
        v-if="showMainCategoriesMenu" 
        class="main-categories-overlay"
        @mouseenter="cancelHideMainCategoriesTimer"
        @mouseleave="startHideMainCategoriesTimer"
      >
        <div class="main-categories-content">
          <div class="main-categories-header">
            <h3>{{ t('all_categories') || 'جميع الأقسام' }}</h3>
            <p>{{ t('browse_categories') || 'تصفح الأقسام الرئيسية' }}</p>
          </div>
          
          <div class="main-categories-list" v-if="categories.length > 0">
            <div 
              v-for="category in categories" 
              :key="category.id"
              class="main-category-item"
              :class="{ 'active': hoveredCategoryId === category.id }"
              @mouseenter="showSubcategories(category)"
              @mouseleave="hideSubcategoriesPreview"
            >
              <div class="main-category-icon">
                <img 
                  :src="getCategoryImage(category)" 
                  :alt="category.name"
                  @error="handleImageError"
                />
              </div>
              <div class="main-category-info">
                <h4>{{ category.name }}</h4>
                <p v-if="category.childes && category.childes.length > 0">
                  {{ category.childes.length }} {{ category.childes.length === 1 ? (t('subcategory') || 'قسم فرعي') : (t('subcategories') || 'أقسام فرعية') }}
                </p>
                <p v-else>
                  {{ t('no_subcategories') || 'لا توجد أقسام فرعية' }}
                </p>
              </div>
              <svg class="category-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Subcategories Overlay -->
    <transition name="slide-fade-sub">
      <div 
        v-if="hoveredCategory && showMainCategoriesMenu" 
        class="subcategories-overlay"
        @mouseenter="cancelAllTimers"
        @mouseleave="startHideTimer"
      >
        <div class="subcategories-content">
          <div class="subcategories-header">
            <div class="header-content">
              <div class="header-icon">
                <img 
                  :src="getCategoryImage(hoveredCategory)" 
                  :alt="hoveredCategory.name"
                  @error="handleImageError"
                />
              </div>
              <h4>{{ hoveredCategory.name }}</h4>
              <p>{{ t('browse_subcategories') || 'تصفح الأقسام الفرعية' }}</p>
            </div>
          </div>
          
          <div class="subcategories-grid" v-if="hoveredCategory.childes && hoveredCategory.childes.length > 0">
            <div 
              v-for="subcategory in hoveredCategory.childes" 
              :key="subcategory.id"
              class="subcategory-item"
              @click="goToSubcategory(subcategory)"
            >
              <h5>{{ subcategory.name }}</h5>
              <p v-if="subcategory?.product_count || subcategory?.products_count">
                ( {{ subcategory.product_count || subcategory.products_count }} 
                {{ (subcategory.product_count || subcategory.products_count) === 1 
                  ? (t('product') || 'منتج') 
                  : (t('products') || 'منتجات') 
                }} )
              </p>
              <p v-else class="no-count">
                ( {{ t('products') || 'منتجات' }} )
              </p>
            </div>
          </div>
          
          <div v-else class="no-subcategories">
            <p>{{ t('no_subcategories') || 'لا توجد أقسام فرعية' }}</p>
            <button class="go-to-category-btn" @click="goToCategory(hoveredCategory)">
              {{ t('browse_category') || 'تصفح القسم' }}
            </button>
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

// Computed
const uiDir = computed(() => locale.value === 'ar' ? 'rtl' : 'ltr')

// State
const loading = ref(false)
const categories = ref<any[]>([])
const hoveredCategory = ref<any>(null)
const hoveredCategoryId = ref<number | null>(null)
const showMainCategoriesMenu = ref(false)
const hideTimer = ref<NodeJS.Timeout | null>(null)
const hideMainCategoriesTimer = ref<NodeJS.Timeout | null>(null)
const hideSubcategoriesTimer = ref<NodeJS.Timeout | null>(null)

// Hover delay settings
const HOVER_DELAY = 1000 // milliseconds to wait before hiding main categories
const SHOW_DELAY = 50 // milliseconds to wait before showing
const SUBCATEGORY_HIDE_DELAY = 1500 // much longer delay for subcategories

// Methods for main categories menu
const showMainCategories = () => {
  cancelHideMainCategoriesTimer()
  setTimeout(() => {
    showMainCategoriesMenu.value = true
  }, SHOW_DELAY)
}

const startHideMainCategoriesTimer = () => {
  hideMainCategoriesTimer.value = setTimeout(() => {
    showMainCategoriesMenu.value = false
    hoveredCategory.value = null
    hoveredCategoryId.value = null
  }, HOVER_DELAY)
}

const cancelHideMainCategoriesTimer = () => {
  if (hideMainCategoriesTimer.value) {
    clearTimeout(hideMainCategoriesTimer.value)
    hideMainCategoriesTimer.value = null
  }
}

// Methods for subcategories
const showSubcategories = (category: any) => {
  // Cancel all hide timers
  cancelHideTimer()
  cancelHideSubcategoriesTimer()
  
  // Immediately show subcategories
  hoveredCategoryId.value = category.id
  hoveredCategory.value = category
}

const hideSubcategoriesPreview = () => {
  // Don't hide if mouse is still over subcategories content
  hideSubcategoriesTimer.value = setTimeout(() => {
    hoveredCategory.value = null
    hoveredCategoryId.value = null
  }, SUBCATEGORY_HIDE_DELAY)
}

const cancelHideSubcategoriesTimer = () => {
  if (hideSubcategoriesTimer.value) {
    clearTimeout(hideSubcategoriesTimer.value)
    hideSubcategoriesTimer.value = null
  }
}

const startHideTimer = () => {
  // Cancel any existing hide timer first
  cancelHideTimer()
  
  hideTimer.value = setTimeout(() => {
    hoveredCategory.value = null
    hoveredCategoryId.value = null
  }, SUBCATEGORY_HIDE_DELAY)
}

const cancelHideTimer = () => {
  if (hideTimer.value) {
    clearTimeout(hideTimer.value)
    hideTimer.value = null
  }
  cancelHideSubcategoriesTimer()
}

// New function to cancel all timers
const cancelAllTimers = () => {
  cancelHideTimer()
  cancelHideSubcategoriesTimer()
  cancelHideMainCategoriesTimer()
}

const goToCategory = (category: any) => {
  router.push({
    path: '/shop',
    query: { category: category.id }
  })
  showMainCategoriesMenu.value = false
  hoveredCategory.value = null
}

const getCategoryImage = (category: any) => {
  if (category.icon_full_url?.path) {
    return category.icon_full_url.path
  }
  if (category.image_full_url?.path) {
    return category.image_full_url.path
  }
  if (category.icon) {
    return category.icon
  }
  if (category.image) {
    return category.image
  }
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

const goToSubcategory = (subcategory: any) => {
  router.push({
    path: '/shop',
    query: { category: subcategory.id }
  })
  hoveredCategory.value = null
  hoveredCategoryId.value = null
  showMainCategoriesMenu.value = false
}

const loadCategories = async () => {
  try {
    loading.value = true
    const { $get } = useApi()
    const response = await $get('v1/categories/')
    
    if (response && Array.isArray(response)) {
      categories.value = response
    } else {
      categories.value = []
    }
  } catch (error) {
    console.error('Error loading categories:', error)
    categories.value = []
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadCategories()

  const toggleSidebarV = document.getElementsByClassName("toggle-sidebar")[0];
  const catSidebar = document.querySelector(".categories-sidebar");
  const categoriesBtn = document.querySelector(".categories-btn");

  const toggleSidebar = () => {
    catSidebar?.classList.toggle("hide");
    toggleSidebarV?.classList.toggle("hide");
  };

  toggleSidebarV?.addEventListener("click", toggleSidebar);
  categoriesBtn?.addEventListener("click", toggleSidebar);
})

onUnmounted(() => {
  if (hideTimer.value) {
    clearTimeout(hideTimer.value)
  }
  if (hideMainCategoriesTimer.value) {
    clearTimeout(hideMainCategoriesTimer.value)
  }
  if (hideSubcategoriesTimer.value) {
    clearTimeout(hideSubcategoriesTimer.value)
  }
})
</script>

<style scoped>
/* ===== MAIN CONTAINER ===== */
.categories-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  height: 100vh;
  z-index: 1000;
  background: #fff;
  transition: all 0.3s ease;
  padding: 20px 5px;
  border-radius: 0 20px 20px 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}

[dir="ltr"] .categories-sidebar {
  border-radius: 20px 0 0 20px;
}

.categories-sidebar[dir="rtl"] {
  inset-inline-start: 0;
}

.categories-sidebar.hide {
  inset-inline-start: -65px;
}

/* ===== MENU TOGGLE BUTTON ===== */
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
  position: relative;
  overflow: visible;
  flex-shrink: 0;
}

.menu-toggle:hover {
  background: #2563EB;
  transform: scale(1.1);
}

/* ===== HAMBURGER ICON ===== */
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
  transition: all 0.3s ease;
}

/* ===== CATEGORIES ICONS LIST ===== */
.categories-icons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 0;
}

/* Custom scrollbar for categories */
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

.categories-icons::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.category-icon-item {
  position: relative;
  width: 50px;
  height: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.category-icon-item:hover .category-icon,
.category-icon-item.active .category-icon {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* ===== CATEGORY ICON ===== */
.category-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
  background: white;
  padding: 8px;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.category-icon-item:hover .category-icon {
  border-color: #3B82F6;
}

.category-icon-item.active .category-icon {
  border-color: #2563EB;
  background: #eff6ff;
}

/* ===== MAIN CATEGORIES OVERLAY ===== */
.main-categories-overlay {
  position: fixed;
  left: auto;
  right: 60px;
  top: 0;
  bottom: 0;
  height: 100vh;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

[dir="ltr"] .main-categories-overlay {
  right: auto;
  left: 60px;
  justify-content: flex-start;
}

/* ===== MAIN CATEGORIES CONTENT ===== */
.main-categories-content {
  background: white;
  padding: 24px;
  max-width: 350px;
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: 10px 0 40px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

[dir="ltr"] .main-categories-content {
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.1);
}

/* ===== MAIN CATEGORIES HEADER ===== */
.main-categories-header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f3f4f6;
}

.main-categories-header h3 {
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
}

.main-categories-header p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

/* ===== MAIN CATEGORIES LIST ===== */
.main-categories-list {
  flex: 1;
  /* overflow-y: auto; */
  padding: 10px 0;
}

.main-category-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 6px;
  background: #f9fafb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.main-category-item:hover,
.main-category-item.active {
  background: #eff6ff;
  border-color: #3B82F6;
  transform: translateX(-5px);
}

[dir="ltr"] .main-category-item:hover,
[dir="ltr"] .main-category-item.active {
  transform: translateX(5px);
}

.main-category-item.active {
  background: #dbeafe;
  border-color: #2563EB;
}

.main-category-icon {
  width: 45px;
  height: 45px;
  flex-shrink: 0;
}

.main-category-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
  background: white;
  padding: 6px;
}

.main-category-info {
  flex: 1;
}

.main-category-info h4 {
  margin: 0 0 3px 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.main-category-info p {
  margin: 0;
  font-size: 11px;
  color: #6b7280;
}

.category-arrow {
  color: #9ca3af;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.main-category-item:hover .category-arrow,
.main-category-item.active .category-arrow {
  color: #3B82F6;
  transform: translateX(3px);
}

[dir="rtl"] .main-category-item:hover .category-arrow,
[dir="rtl"] .main-category-item.active .category-arrow {
  transform: translateX(-3px) scaleX(-1);
}

[dir="rtl"] .category-arrow {
  transform: scaleX(-1);
}

/* ===== SUBCATEGORIES OVERLAY ===== */
.subcategories-overlay {
  position: fixed;
  left: auto;
  right: 410px;
  top: 0;
  bottom: 0;
  height: 100vh;
  z-index: 998;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

[dir="ltr"] .subcategories-overlay {
  right: auto;
  left: 410px;
  justify-content: flex-start;
}

/* ===== SUBCATEGORIES CONTENT ===== */
.subcategories-content {
  background: white;
  padding: 24px;
  max-width: 600px;
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: 10px 0 40px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

[dir="ltr"] .subcategories-content {
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.1);
}

/* ===== SUBCATEGORIES HEADER ===== */
.subcategories-header {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f3f4f6;
}

.header-content {
  text-align: center;
}

.header-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 15px;
}

.header-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 12px;
  background: #f9fafb;
  padding: 10px;
}

.subcategories-header h4 {
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
}

.subcategories-header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

/* ===== SUBCATEGORIES GRID ===== */
.subcategories-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  flex: 1;
  overflow-y: auto;
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
  height: fit-content;
}

.subcategory-item:hover {
  background: #3B82F6;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  border-color: #2563EB;
}

.subcategory-item h5 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.subcategory-item p {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.8;
}

.subcategory-item:hover p {
  color: white;
  opacity: 0.9;
}

/* ===== NO SUBCATEGORIES ===== */
.no-subcategories {
  text-align: center;
  padding: 40px;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.go-to-category-btn {
  background: #3B82F6;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.go-to-category-btn:hover {
  background: #2563EB;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* ===== LOADING STATE ===== */
.loading-state {
  padding: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
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

/* ===== EMPTY STATE ===== */
.empty-state {
  padding: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: auto;
}

.empty-icon {
  color: #9ca3af;
}

/* ===== TRANSITION ANIMATIONS ===== */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

[dir="ltr"] .slide-fade-enter-from {
  transform: translateX(20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

[dir="ltr"] .slide-fade-leave-to {
  transform: translateX(20px);
}

/* Subcategories specific animation */
.slide-fade-sub-enter-active,
.slide-fade-sub-leave-active {
  transition: all 0.25s ease;
}

.slide-fade-sub-enter-from {
  opacity: 0;
  transform: translateX(-15px);
}

[dir="ltr"] .slide-fade-sub-enter-from {
  transform: translateX(15px);
}

.slide-fade-sub-leave-to {
  opacity: 0;
  transform: translateX(-15px);
}

[dir="ltr"] .slide-fade-sub-leave-to {
  transform: translateX(15px);
}

/* ===== TOGGLE SIDEBAR BUTTON ===== */
.toggle-sidebar {
  background-color: #3B82F6;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  position: fixed;
  inset-inline-start: 43px;
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

/* ===== SCROLLBAR STYLING ===== */
.main-categories-content::-webkit-scrollbar,
.subcategories-content::-webkit-scrollbar,
.subcategories-grid::-webkit-scrollbar {
  width: 6px;
}

.main-categories-content::-webkit-scrollbar-track,
.subcategories-content::-webkit-scrollbar-track,
.subcategories-grid::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 3px;
}

.main-categories-content::-webkit-scrollbar-thumb,
.subcategories-content::-webkit-scrollbar-thumb,
.subcategories-grid::-webkit-scrollbar-thumb {
  background: #9ca3af;
  border-radius: 3px;
}

.main-categories-content::-webkit-scrollbar-thumb:hover,
.subcategories-content::-webkit-scrollbar-thumb:hover,
.subcategories-grid::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .categories-sidebar {
    display: none;
  }
  
  .toggle-sidebar {
    display: none !important;
  }
}

@media (max-width: 1400px) {
  .main-categories-content {
    max-width: 300px;
  }
  
  .subcategories-overlay {
    right: 360px;
  }
  
  [dir="ltr"] .subcategories-overlay {
    left: 360px;
  }
  
  .subcategories-content {
    max-width: 400px;
  }
  
  .subcategories-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1200px) {
  .subcategories-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .subcategories-grid {
    grid-template-columns: repeat(1, 1fr);
  }
}
</style>