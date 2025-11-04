<template>
  <div class="toggle-sidebar">
    <i class="fa-solid fa-chevron-left"></i>
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
const isOpen = ref(false)
const loading = ref(false)
const categories = ref<any[]>([])
const hoveredCategory = ref<any>(null)
const hoveredCategoryId = ref<number | null>(null)
const showAllNames = ref(false)
const hideTimeout = ref<NodeJS.Timeout | null>(null)

// Methods
const toggleSidebar = () => {
  isOpen.value = !isOpen.value
}

const showAllCategoryNames = () => {
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
    hideTimeout.value = null
  }
  showAllNames.value = true
}

const hideAllCategoryNames = () => {
  showAllNames.value = false
  // Don't hide subcategories when leaving sidebar
  // They should only close when clicking close button
}

const showCategoryName = (category: any) => {
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
    hideTimeout.value = null
  }
  hoveredCategoryId.value = category.id
  // Don't auto-show subcategories on hover
  // Only show on click
}

const hideCategoryName = () => {
  hoveredCategoryId.value = null
  // Don't auto-hide subcategories
  // They should only close when clicking close button
}

const toggleSubcategories = (category: any) => {
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
    hideTimeout.value = null
  }
  
  // If clicking on the same category, close it
  if (hoveredCategory.value && hoveredCategory.value.id === category.id) {
    hoveredCategory.value = null
    hoveredCategoryId.value = null
  } else {
    // Open new category
    hoveredCategoryId.value = category.id
    hoveredCategory.value = category
  }
}

const closeSubcategories = () => {
  hoveredCategory.value = null
  hoveredCategoryId.value = null
}

const hideSubcategories = () => {
  // This function is no longer used since we removed auto-hide
  // Subcategories only close when clicking close button
}

// Removed unused functions since we're using click-only approach

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
  // Try placeholder, if that fails, use a data URI
  if (!target.src.includes('category-placeholder.png')) {
    target.src = '/images/category-placeholder.png'
  } else {
    // If placeholder also fails, use a data URI fallback
    target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="10">?</text></svg>'
    target.onerror = null // Prevent infinite loop
  }
}

const goToSubcategory = (subcategory: any) => {
  router.push({
    path: '/shop',
    query: { category: subcategory.id }
  })
  hideSubcategories()
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
// Lifecycle
onMounted(() => {
  loadCategories()

  const toggleSidebarV = document.getElementsByClassName("toggle-sidebar")[0];
  const catSidebar = document.querySelector(".categories-sidebar");
  const categoriesBtn = document.querySelector(".categories-btn"); // ← زر الأقسام الجديد

  const toggleSidebar = () => {
    catSidebar?.classList.toggle("hide");
    toggleSidebarV?.classList.toggle("hide");
  };

  // عند الضغط على زر الهامبرجر
  toggleSidebarV?.addEventListener("click", toggleSidebar);

  // عند الضغط على زر الأقسام الجديد
  categoriesBtn?.addEventListener("click", toggleSidebar);
})


onUnmounted(() => {
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
  }
})




</script>

<style scoped>
/* ===== MAIN CONTAINER ===== */
.categories-sidebar {
  position: fixed;;
  z-index: 1000;
  background: #fff;
  transition: all 0.3s ease;
  padding: 5px;
  border-radius: 20px 0px 0px 20px;
}

[dir="ltr"] .categories-sidebar{
  border-radius: 0px 20px 20px 0px;
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
  border-radius: 12px 0 0 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  width: 50px;
  height: 50px;
  margin-bottom: 10px;
  position: relative;
  overflow: hidden;
}

.categories-sidebar[dir="rtl"] .menu-toggle {
  border-radius:50%;
}

.categories-sidebar[dir="ltr"] .menu-toggle {
  border-radius:50%;
}

.menu-toggle:hover {
  background: #2563EB;
}

.categories-sidebar[dir="ltr"] .menu-toggle:hover {
  transform: translateX(5px);
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

.menu-text {
  position: absolute;
  left: 60px;
  top: 50%;
  transform: translateY(-50%);
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  background: #3B82F6;
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
}

.categories-sidebar[dir="ltr"] .menu-text {
  left: auto;
  right: 60px;
}

.menu-text.show {
  opacity: 1;
  visibility: visible;
}

/* ===== CATEGORIES ICONS LIST ===== */
.categories-icons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-icon-item {
  position: relative;
  width: 50px;
  height: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
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
}

/* ===== CATEGORY TOOLTIP ===== */
.category-tooltip {
  position: absolute;
  right: 50px;
  top: 50%;
  height: 60px;
  width: 150px;
  transform: translateY(-50%);
  background: white;
  padding: 8px 12px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  cursor: pointer;
}

.categories-sidebar[dir="ltr"] .category-tooltip {
  right: auto;
  left: 50px;
}

.category-tooltip.show {
  opacity: 1;
  visibility: visible;
}

.category-tooltip:hover {
  background: #f8fafc;
  transform: translateY(-50%) scale(1.05);
}

.category-name {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.arrow-icon {
  color: #9ca3af;
  transition: all 0.2s ease;
}

/* ===== LOADING STATE ===== */
.loading-state {
  padding: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
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
}

.empty-icon {
  color: #9ca3af;
}

/* ===== SUBCATEGORIES OVERLAY ===== */
.subcategories-overlay {
  position: fixed;
  left: auto;
  right: 185px;
  bottom: 0;
  z-index: 999;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  height: 100vh;
}
[dir="ltr"] .subcategories-overlay{
  right: auto;
  left: 185px;
}
.categories-sidebar[dir="rtl"] .subcategories-overlay {
  justify-content: flex-end;
}

.categories-sidebar[dir="ltr"] .subcategories-overlay {
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
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  margin-right: 20px;
}

.categories-sidebar[dir="rtl"] .subcategories-content {
  margin-right: 0;
  margin-left: 0;
}

.categories-sidebar[dir="ltr"] .subcategories-content {
  margin-left: 0;
  margin-right: 0;
}

/* ===== SUBCATEGORIES HEADER ===== */
.subcategories-header {
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.header-content {
  flex: 1;
  text-align: center;
}

.subcategories-header h4 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.subcategories-header p {
  margin: 0;
  color: #6b7280;
  font-size: 16px;
}

.close-subcategories-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.close-subcategories-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

/* ===== SUBCATEGORIES GRID ===== */
.subcategories-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.subcategory-item {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #e5e7eb;
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
  font-size: 16px;
  font-weight: 600;
}

.subcategory-item p {
  margin-top: 8px;
  font-size: 14px;
  opacity: 0.8;
}

/* ===== NO SUBCATEGORIES ===== */
.no-subcategories {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

/* ===== RTL SUPPORT ===== */
[dir="rtl"] .arrow-icon {
  transform: scaleX(-1);
}

[dir="rtl"] .category-tooltip:hover .arrow-icon {
  transform: scaleX(-1) translateX(-2px);
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

@media (max-width: 1200px) {
  .subcategories-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .subcategories-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.toggle-sidebar {
    background-color: var(--blue-color);
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
}
.toggle-sidebar.hide {
      inset-inline-start: -20px;
}
</style>