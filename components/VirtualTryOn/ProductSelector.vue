<template>
  <div class="product-selector">
    <div class="selector-header">
      <h3>اختر المنتج للتجربة</h3>
      
      <!-- Error Message -->
      <div v-if="errorMessage" class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        {{ errorMessage }}
      </div>
      
      <div class="filters">
        <select v-model="selectedCategory" @change="filterProducts">
          <option value="">جميع الفئات</option>
          <option
            v-for="category in categories"
            :key="category"
            :value="category"
          >
            {{ category }}
          </option>
        </select>
        
        <div class="search-box">
          <input
            v-model="searchQuery"
            @input="onSearchInput"
            @focus="showSuggestions = true"
            @blur="hideSuggestions"
            type="text"
            placeholder="البحث في المنتجات..."
            class="search-input"
          />
          <i class="fas fa-search"></i>
          
          <!-- Search Suggestions -->
          <div v-if="showSuggestions && searchSuggestions.length > 0" class="search-suggestions">
            <div
              v-for="suggestion in searchSuggestions"
              :key="suggestion"
              @click="selectSuggestion(suggestion)"
              class="suggestion-item"
            >
              <i class="fas fa-search"></i>
              <span>{{ suggestion }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="products-grid" v-if="!loading">
      <div
        v-for="product in filteredProducts"
        :key="product.id"
        class="product-card"
        :class="{ 'selected': selectedProduct?.id === product.id }"
        @click="selectProduct(product)"
      >
        <div class="product-image">
          <img :src="getProductImage(product)" :alt="product.name" />
          <div class="product-overlay">
            <button 
              class="try-on-btn" 
              @click.stop="tryOnProduct(product)"
              :title="selectedSizes[product.id] ? `جرب المنتج بالحجم ${selectedSizes[product.id]}` : 'يرجى اختيار الحجم أولاً'"
            >
              <i class="fas fa-magic"></i>
              {{ selectedSizes[product.id] ? `جرب الآن (${selectedSizes[product.id]})` : 'جرب الآن' }}
            </button>
          </div>
        </div>
        
        <div class="product-info">
          <h4 class="product-name">{{ product.name }}</h4>
          <p class="product-brand">{{ product.brand }}</p>
          
          <div class="product-price">
            <span class="current-price">{{ formatPrice(product.price) }}</span>
            <span v-if="product.discount" class="original-price">
              {{ formatPrice(product.price + product.discount) }}
            </span>
          </div>
          
          <div class="product-meta">
            <div class="rating">
              <i class="fas fa-star" v-for="i in 5" :key="i" :class="{ 'filled': i <= product.rating }"></i>
              <span class="rating-count">({{ product.reviews_count }})</span>
            </div>
            
            <div class="compatibility-score">
              <div class="score-bar">
                <div 
                  class="score-fill" 
                  :style="{ width: `${product.compatibility_score * 100}%` }"
                ></div>
              </div>
              <span class="score-text">{{ Math.round(product.compatibility_score * 100) }}% توافق</span>
            </div>
          </div>
          
          <div class="size-selector" v-if="product.available_sizes.length > 0">
            <label>الحجم:</label>
            <select v-model="selectedSizes[product.id]" @change="onSizeChange(product)">
              <option value="">اختر الحجم</option>
              <option
                v-for="size in product.available_sizes"
                :key="size"
                :value="size"
              >
                {{ size }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
    
    <div class="loading-state" v-if="loading">
      <div class="spinner"></div>
      <p>جاري تحميل المنتجات...</p>
    </div>
    
    <div class="empty-state" v-if="!loading && filteredProducts.length === 0">
      <i class="fas fa-search"></i>
      <h4>لم يتم العثور على منتجات</h4>
      <p>جرب تغيير الفلتر أو البحث عن شيء آخر</p>
    </div>
    
    <div class="selected-product-actions" v-if="selectedProduct">
      <div class="selected-info">
        <img :src="selectedProduct.thumbnail || '/images/placeholder.jpg'" :alt="selectedProduct.name" />
        <div class="info">
          <h4>{{ selectedProduct.name }}</h4>
          <p>{{ selectedProduct.brand }}</p>
          <span class="size" v-if="selectedSizes[selectedProduct.id]">
            الحجم: {{ selectedSizes[selectedProduct.id] }}
          </span>
        </div>
      </div>
      
      <div class="actions">
        <button 
          class="try-on-btn primary"
          @click="() => { if (selectedProduct) tryOnProduct(selectedProduct); }"
          :disabled="!isSelectedProductReady"
        >
          <i class="fas fa-magic"></i>
          {{ isSelectedProductReady ? `جرب المنتج (${selectedSizes[selectedProduct.id]})` : 'جرب المنتج' }}
        </button>
        
        <button class="view-details-btn" @click="viewProductDetails(selectedProduct)">
          <i class="fas fa-eye"></i>
          عرض التفاصيل
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

interface Product {
  id: number
  name: string
  slug: string
  price: number
  discount?: number
  thumbnail: string
  brand?: string
  category?: string
  virtual_try_on_category?: string
  available_sizes: string[]
  compatibility_score: number
  rating: number
  reviews_count: number
}

interface Props {
  products: Product[]
  loading?: boolean
  onProductSelect?: (product: Product) => void
  onTryOn?: (product: Product, size: string) => void
  onViewDetails?: (product: Product) => void
}

const props = defineProps<Props>()

const emit = defineEmits<{
  productSelect: [product: Product]
  tryOn: [product: Product, size: string]
  viewDetails: [product: Product]
}>()

// Local state
const selectedProduct = ref<Product | null>(null)
const selectedSizes = ref<Record<number, string>>({})
const searchQuery = ref('')
const selectedCategory = ref('')
const showSuggestions = ref(false)
const searchTimeout = ref<NodeJS.Timeout | null>(null)
const errorMessage = ref('')

// Computed
const categories = computed(() => {
  const cats = new Set(props.products.map(p => p.virtual_try_on_category).filter(Boolean))
  return Array.from(cats)
})

const searchSuggestions = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) return []
  
  const query = searchQuery.value.toLowerCase()
  const suggestions = new Set<string>()
  
  props.products.forEach(product => {
    // Add product names that match
    if (product.name.toLowerCase().includes(query)) {
      suggestions.add(product.name)
    }
    
    // Add brand names that match
    if (product.brand?.toLowerCase().includes(query)) {
      suggestions.add(product.brand)
    }
    
    // Add category names that match
    if (product.category?.toLowerCase().includes(query)) {
      suggestions.add(product.category)
    }
    
    // Add virtual try-on category names that match
    if (product.virtual_try_on_category?.toLowerCase().includes(query)) {
      suggestions.add(product.virtual_try_on_category)
    }
  })
  
  return Array.from(suggestions).slice(0, 5) // Limit to 5 suggestions
})

const filteredProducts = computed(() => {
  let filtered = props.products

  // Filter by category
  if (selectedCategory.value) {
    filtered = filtered.filter(p => p.virtual_try_on_category === selectedCategory.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.brand?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query) ||
      p.virtual_try_on_category?.toLowerCase().includes(query)
    )
  }

  return filtered
})

// Check if selected product has a size selected
const isSelectedProductReady = computed(() => {
  return selectedProduct.value && selectedSizes.value[selectedProduct.value.id]
})

// Methods
const selectProduct = (product: Product) => {
  console.log('🟠 selectProduct called with:', product)
  console.log('🟠 product.available_sizes:', product.available_sizes)
  selectedProduct.value = product
  
  // Ensure size is selected for this product
  if (product.available_sizes && product.available_sizes.length > 0 && !selectedSizes.value[product.id]) {
    selectedSizes.value[product.id] = product.available_sizes[0]
    console.log('🟠 Set size for product', product.id, 'to', product.available_sizes[0])
  }
  
  console.log('🟠 selectedSizes after selectProduct:', selectedSizes.value)
  
  if (props.onProductSelect) {
    props.onProductSelect(product)
  }
  
  emit('productSelect', product)
}

const tryOnProduct = (product: Product) => {
  console.log('🔴 tryOnProduct called with:', product)
  const size = selectedSizes.value[product.id]
  console.log('🔴 Selected size:', size)
  console.log('🔴 selectedSizes object:', selectedSizes.value)
  
  if (!size) {
    // إذا لم يتم اختيار حجم، نحدد المنتج ونطلب اختيار الحجم
    selectProduct(product) // تحديد المنتج أولاً
    showError(`يرجى اختيار الحجم أولاً للمنتج: ${product.name}`)
    return
  }
  
  console.log('🔴 Calling onTryOn prop:', !!props.onTryOn)
  if (props.onTryOn) {
    props.onTryOn(product, size)
  }
  
  console.log('🔴 Emitting tryOn event')
  emit('tryOn', product, size)
}

const onSizeChange = (product: Product) => {
  // Size changed, could trigger additional logic
}

const showError = (message: string) => {
  errorMessage.value = message
  setTimeout(() => {
    errorMessage.value = ''
  }, 3000)
}

const viewProductDetails = (product: Product) => {
  if (props.onViewDetails) {
    props.onViewDetails(product)
  }
  
  emit('viewDetails', product)
}

const onSearchInput = () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  searchTimeout.value = setTimeout(() => {
    filterProducts()
  }, 300)
}

const selectSuggestion = (suggestion: string) => {
  searchQuery.value = suggestion
  showSuggestions.value = false
  filterProducts()
}

const hideSuggestions = () => {
  // Delay hiding to allow click on suggestion
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

const filterProducts = () => {
  // This function is called when search or category changes
  // The actual filtering is handled by the computed property filteredProducts
}

const getProductImage = (product: any) => {
  // Handle thumbnail object
  if (product.thumbnail && typeof product.thumbnail === 'object') {
    if (product.thumbnail.path && product.thumbnail.status === 200) {
      return product.thumbnail.path
    }
    if (product.thumbnail.key) {
      return `http://127.0.0.1:8000${product.thumbnail.key}`
    }
  }
  
  // Handle thumbnail string
  if (product.thumbnail && typeof product.thumbnail === 'string') {
    if (product.thumbnail.startsWith('http')) {
      return product.thumbnail
    }
    return `http://127.0.0.1:8000${product.thumbnail}`
  }
  
  // Fallback to placeholder
  return '/images/placeholder.svg'
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR'
  }).format(price)
}

// Watch for product changes
watch(() => props.products, (newProducts) => {
  console.log('🟡 Products changed:', newProducts)
  if (newProducts.length > 0) {
    // Auto-select first available size for each product
    newProducts.forEach(product => {
      console.log('🟡 Processing product:', product.id, product.name, 'available_sizes:', product.available_sizes)
      if (product.available_sizes && product.available_sizes.length > 0 && !selectedSizes.value[product.id]) {
        selectedSizes.value[product.id] = product.available_sizes[0]
        console.log('🟡 Set size for product', product.id, 'to', product.available_sizes[0])
      }
    })
    
    // Select first product if none selected
    if (!selectedProduct.value) {
      selectedProduct.value = newProducts[0]
      // Ensure size is selected for the first product
      if (newProducts[0].available_sizes && newProducts[0].available_sizes.length > 0) {
        selectedSizes.value[newProducts[0].id] = newProducts[0].available_sizes[0]
        console.log('🟡 Set size for first product', newProducts[0].id, 'to', newProducts[0].available_sizes[0])
      }
    }
    
    console.log('🟡 Final selectedSizes:', selectedSizes.value)
  }
}, { immediate: true })

// Debug on mount
onMounted(() => {
  console.log('🟢 Component mounted')
  console.log('🟢 props.products:', props.products)
  console.log('🟢 selectedSizes:', selectedSizes.value)
})
</script>

<style scoped>
.product-selector {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.selector-header {
  margin-bottom: 30px;
}

.selector-header h3 {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.filters {
  display: flex;
  gap: 15px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.filters select {
  padding: 10px 15px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  color: #333;
  min-width: 150px;
}

.search-box {
  position: relative;
  min-width: 250px;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 15px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #f58040;
  box-shadow: 0 0 0 3px rgba(245, 128, 64, 0.1);
}

.search-box i {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-top: none;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f3f4f6;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background-color: #f8f9fa;
}

.suggestion-item i {
  color: #9ca3af;
  font-size: 12px;
}

.suggestion-item span {
  color: #333;
  font-size: 14px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.product-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
}

.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.product-card.selected {
  border-color: #f58040;
  box-shadow: 0 8px 25px rgba(245, 128, 64, 0.3);
}

.product-image {
  position: relative;
  aspect-ratio: 3/4;
  overflow: hidden;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.product-card:hover .product-image img {
  transform: scale(1.05);
}

.product-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.product-card:hover .product-overlay {
  opacity: 1;
}

.try-on-btn {
  background: #f58040;
  color: #fff;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.try-on-btn:hover:not(.disabled) {
  background: #e67030;
  transform: translateY(-2px);
}

.try-on-btn.disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  opacity: 0.7;
}

.try-on-btn:not(.disabled) {
  background: #f58040;
  color: #fff;
  box-shadow: 0 2px 8px rgba(245, 128, 64, 0.3);
}

.product-info {
  padding: 15px;
}

.product-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
  line-height: 1.4;
}

.product-brand {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.product-price {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.current-price {
  font-size: 18px;
  font-weight: 600;
  color: #f58040;
}

.original-price {
  font-size: 14px;
  color: #999;
  text-decoration: line-through;
}

.product-meta {
  margin-bottom: 15px;
}

.rating {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
}

.rating i {
  color: #ddd;
  font-size: 12px;
}

.rating i.filled {
  color: #fbbf24;
}

.rating-count {
  font-size: 12px;
  color: #666;
  margin-right: 5px;
}

.compatibility-score {
  display: flex;
  align-items: center;
  gap: 10px;
}

.score-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background: linear-gradient(90deg, #f58040, #fbbf24);
  transition: width 0.3s ease;
}

.score-text {
  font-size: 12px;
  color: #666;
  font-weight: 600;
}

.size-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.size-selector label {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.size-selector select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  background: #fff;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #f58040;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-state i {
  font-size: 48px;
  color: #ddd;
  margin-bottom: 20px;
}

.empty-state h4 {
  font-size: 20px;
  margin-bottom: 10px;
}

.selected-product-actions {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 20px;
}

.selected-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.selected-info img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
}

.selected-info .info h4 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.selected-info .info p {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.selected-info .info .size {
  font-size: 12px;
  color: #f58040;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 10px;
}

.try-on-btn.primary {
  background: #f58040;
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.try-on-btn.primary:hover:not(:disabled) {
  background: #e67030;
  transform: translateY(-2px);
}

.try-on-btn.primary:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.view-details-btn {
  background: transparent;
  color: #f58040;
  border: 2px solid #f58040;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-details-btn:hover {
  background: #f58040;
  color: #fff;
}

@media (max-width: 768px) {
  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
  }
  
  .filters {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .search-suggestions {
    max-height: 150px;
  }
  
  .suggestion-item {
    padding: 10px 12px;
  }
  
  .selected-product-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .actions {
    justify-content: center;
  }
}

/* Error Message Styles */
.error-message {
  background: #fee;
  border: 1px solid #fcc;
  color: #c33;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: slideDown 0.3s ease;
}

.error-message i {
  font-size: 1.1rem;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
