<template>
  <div class="virtual-try-on-result">
    <div class="result-header">
      <h3>نتيجة التجربة الافتراضية</h3>
      <div class="confidence-score">
        <span class="score-label">درجة الثقة:</span>
        <div class="score-bar">
          <div 
            class="score-fill" 
            :style="{ width: `${(confidenceScore || 0) * 100}%` }"
          ></div>
        </div>
        <span class="score-value">{{ Math.round((confidenceScore || 0) * 100) }}%</span>
      </div>
    </div>
    
    <div class="result-content">
      <!-- Main Result Image -->
      <div class="main-result">
        <div class="image-container">
          <img 
            v-if="resultImages.main"
            :src="resultImages.main" 
            :alt="productName"
            class="result-image"
            @load="onImageLoad"
            @error="onImageError"
          />
          <div v-else class="no-image-placeholder">
            <i class="fas fa-image"></i>
            <p>لا توجد صورة متاحة</p>
          </div>
          
          <!-- Loading Overlay -->
          <div class="loading-overlay" v-if="imageLoading">
            <div class="spinner"></div>
            <p>جاري تحميل الصورة...</p>
          </div>
          
          <!-- Error State -->
          <div class="error-state" v-if="imageError">
            <i class="fas fa-exclamation-triangle"></i>
            <p>فشل في تحميل الصورة</p>
            <button @click="retryImage" class="retry-btn">إعادة المحاولة</button>
          </div>
        </div>
        
        <!-- Image Controls -->
        <div class="image-controls">
          <button 
            v-for="(image, key) in availableImages" 
            :key="key"
            @click="setActiveImage(key)"
            class="control-btn"
            :class="{ 'active': activeImage === key }"
          >
            <img :src="image || ''" :alt="key" />
            <span>{{ getImageLabel(key) }}</span>
          </button>
        </div>
      </div>
      
      <!-- Product Info -->
      <div class="product-info">
        <div class="product-header">
          <img :src="productThumbnail" :alt="productName" class="product-thumbnail" />
          <div class="product-details">
            <h4>{{ productName }}</h4>
            <p class="product-brand">{{ productBrand }}</p>
            <div class="product-price">
              <span class="current-price">{{ formatPrice(productPrice) }}</span>
              <span v-if="productDiscount" class="original-price">
                {{ formatPrice(productPrice + productDiscount) }}
              </span>
            </div>
            <div class="size-info">
              <span class="size-label">الحجم المختار:</span>
              <span class="size-value">{{ selectedSize }}</span>
            </div>
          </div>
        </div>
        
        <!-- Measurements Used -->
        <div class="measurements-section" v-if="measurementsUsed">
          <h5>القياسات المستخدمة:</h5>
          <div class="measurements-grid">
            <div 
              v-for="(value, key) in measurementsUsed" 
              :key="key"
              class="measurement-item"
            >
              <span class="measurement-label">{{ getMeasurementLabel(String(key)) }}:</span>
              <span class="measurement-value">{{ value }} سم</span>
            </div>
          </div>
        </div>
        
        <!-- Recommendations -->
        <div class="recommendations" v-if="recommendations && Object.keys(recommendations).length > 0">
          <h5>توصيات الحجم:</h5>
          <div class="recommendation-list">
            <div 
              v-for="(score, size) in recommendations" 
              :key="size"
              class="recommendation-item"
              :class="{ 'best-match': score > 0.8 }"
            >
              <span class="size">{{ size }}</span>
              <div class="match-bar">
                <div 
                  class="match-fill" 
                  :style="{ width: `${score * 100}%` }"
                ></div>
              </div>
              <span class="match-score">{{ Math.round(score * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="result-actions">
      <button @click="saveResult" class="save-btn" :disabled="saving">
        <i class="fas fa-save" v-if="!saving"></i>
        <i class="fas fa-spinner fa-spin" v-else></i>
        {{ saving ? 'جاري الحفظ...' : 'حفظ النتيجة' }}
      </button>
      
      <button @click="shareResult" class="share-btn">
        <i class="fas fa-share"></i>
        مشاركة
      </button>
      
      <button @click="tryAnotherSize" class="try-another-btn">
        <i class="fas fa-redo"></i>
        جرب حجم آخر
      </button>
      
      <button @click="tryAnotherProduct" class="try-product-btn">
        <i class="fas fa-tshirt"></i>
        جرب منتج آخر
      </button>
    </div>
    
    <!-- Share Modal -->
    <div class="share-modal" v-if="showShareModal" @click="closeShareModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h4>مشاركة النتيجة</h4>
          <button @click="closeShareModal" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="share-options">
          <button @click="shareOnPlatform('whatsapp')" class="share-option whatsapp">
            <i class="fab fa-whatsapp"></i>
            واتساب
          </button>
          
          <button @click="shareOnPlatform('facebook')" class="share-option facebook">
            <i class="fab fa-facebook"></i>
            فيسبوك
          </button>
          
          <button @click="shareOnPlatform('twitter')" class="share-option twitter">
            <i class="fab fa-twitter"></i>
            تويتر
          </button>
          
          <button @click="shareOnPlatform('instagram')" class="share-option instagram">
            <i class="fab fa-instagram"></i>
            إنستغرام
          </button>
          
          <button @click="copyLink" class="share-option copy">
            <i class="fas fa-link"></i>
            نسخ الرابط
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
interface ResultImages {
  main: string
  thumbnail: string
  front?: string
  side?: string
  back?: string
  [key: string]: string | undefined
}

interface MeasurementsUsed {
  chest?: number
  waist?: number
  hips?: number
  [key: string]: number | undefined
}

interface Recommendations {
  [size: string]: number
}

interface Props {
  resultImages: ResultImages
  productName: string
  productBrand?: string
  productPrice: number
  productDiscount?: number
  productThumbnail: string
  selectedSize: string
  measurementsUsed?: MeasurementsUsed
  recommendations?: Recommendations
  confidenceScore: number
  resultId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  save: []
  share: [platform: string]
  tryAnotherSize: []
  tryAnotherProduct: []
}>()

// Local state
const activeImage = ref('main')
const imageLoading = ref(true)
const imageError = ref(false)
const saving = ref(false)
const showShareModal = ref(false)

// Computed
const availableImages = computed(() => {
  const images: Record<string, string> = {}
  
  Object.entries(props.resultImages).forEach(([key, value]) => {
    if (value && key !== 'thumbnail' && typeof value === 'string') {
      images[key] = value
    }
  })
  
  return images
})

const confidenceScore = computed(() => props.confidenceScore)

// Methods
const setActiveImage = (key: string) => {
  activeImage.value = key
}

const getImageLabel = (key: string) => {
  const labels: Record<string, string> = {
    main: 'الرئيسية',
    front: 'أمامية',
    side: 'جانبية',
    back: 'خلفية',
    generated_0: 'النتيجة 1',
    generated_1: 'النتيجة 2',
    generated_2: 'النتيجة 3'
  }
  
  return labels[key] || key
}

const getMeasurementLabel = (key: string) => {
  const labels: Record<string, string> = {
    chest: 'الصدر',
    waist: 'الخصر',
    hips: 'الوركين',
    shoulder_width: 'عرض الكتفين',
    arm_length: 'طول الذراع',
    leg_length: 'طول الساق'
  }
  
  return labels[key] || key
}

const onImageLoad = () => {
  console.log('🟢 Image loaded successfully')
  imageLoading.value = false
  imageError.value = false
}

const onImageError = (event: Event) => {
  console.error('🔴 Image failed to load:', event)
  imageLoading.value = false
  imageError.value = true
}

const retryImage = () => {
  console.log('🔄 Retrying image load...')
  imageError.value = false
  imageLoading.value = true
  
  // Force reload by changing src
  const img = document.querySelector('.result-image') as HTMLImageElement
  if (img) {
    // Fix URL to use correct backend URL
    let currentSrc = img.src
    if (currentSrc.includes('localhost:3000')) {
      currentSrc = currentSrc.replace('localhost:3000', 'localhost:8000')
    }
    if (currentSrc.includes('127.0.0.1:3000')) {
      currentSrc = currentSrc.replace('127.0.0.1:3000', '127.0.0.1:8000')
    }
    
    // Add timestamp to force reload
    const separator = currentSrc.includes('?') ? '&' : '?'
    img.src = currentSrc + separator + 't=' + Date.now()
    
    console.log('🔄 New image src:', img.src)
  }
}

const saveResult = async () => {
  console.log('💾 Saving result...')
  saving.value = true
  
  try {
    // Call API to save result
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
    
    console.log('✅ Result saved successfully')
    emit('save')
    
    // Show success message
    // You can add a toast notification here
    
  } catch (error) {
    console.error('❌ Failed to save result:', error)
    // Show error message
  } finally {
    saving.value = false
  }
}

const shareResult = () => {
  showShareModal.value = true
}

const closeShareModal = () => {
  showShareModal.value = false
}

const shareOnPlatform = (platform: string) => {
  emit('share', platform)
  closeShareModal()
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    console.log('📋 Link copied to clipboard')
    // Show success message
  } catch (error) {
    console.error('❌ Failed to copy link:', error)
  }
}

const tryAnotherSize = () => {
  emit('tryAnotherSize')
}

const tryAnotherProduct = () => {
  emit('tryAnotherProduct')
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR'
  }).format(price)
}

// Initialize
onMounted(() => {
  console.log('🟢 VirtualTryOnResult mounted')
  console.log('🟢 resultImages:', props.resultImages)
  console.log('🟢 productName:', props.productName)
  console.log('🟢 selectedSize:', props.selectedSize)
  
  // Set initial image
  if (props.resultImages.main) {
    activeImage.value = 'main'
  } else {
    // Find first available image
    const firstKey = Object.keys(availableImages.value)[0]
    if (firstKey) {
      activeImage.value = firstKey
    }
  }
  
  // Set initial loading state
  imageLoading.value = true
})
</script>

<style scoped>
.virtual-try-on-result {
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  color: white;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}

.result-header h3 {
  font-size: 32px;
  font-weight: 700;
  color: white;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.confidence-score {
  display: flex;
  align-items: center;
  gap: 15px;
}

.score-label {
  font-size: 16px;
  color: white;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.score-bar {
  width: 200px;
  height: 12px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.score-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ffed4e);
  transition: width 0.5s ease;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);
}

.score-value {
  font-size: 18px;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.result-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
}

.main-result {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.image-container {
  position: relative;
  aspect-ratio: 3/4;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
  background: #f8f9fa;
}

.result-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #f58040;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ff4444;
}

.error-state i {
  font-size: 48px;
  margin-bottom: 15px;
}

.retry-btn {
  background: #f58040;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  background: #e67030;
}

.no-image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6c757d;
}

.no-image-placeholder i {
  font-size: 48px;
  margin-bottom: 15px;
  opacity: 0.5;
}

.no-image-placeholder p {
  font-size: 16px;
  margin: 0;
  opacity: 0.7;
}

.image-controls {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 80px;
  flex-shrink: 0;
}

.control-btn:hover {
  border-color: #f58040;
}

.control-btn.active {
  border-color: #f58040;
  background: #fef7f0;
}

.control-btn img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.control-btn span {
  font-size: 12px;
  color: #666;
  text-align: center;
}

.product-info {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
}

.product-header {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.product-thumbnail {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.product-details h4 {
  font-size: 18px;
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
  margin-bottom: 10px;
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

.size-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.size-label {
  font-size: 14px;
  color: #666;
}

.size-value {
  font-size: 14px;
  font-weight: 600;
  color: #f58040;
  background: #fef7f0;
  padding: 4px 8px;
  border-radius: 4px;
}

.measurements-section,
.recommendations {
  margin-bottom: 20px;
}

.measurements-section h5,
.recommendations h5 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 15px;
}

.measurements-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.measurement-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.measurement-label {
  font-size: 14px;
  color: #666;
}

.measurement-value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recommendation-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
}

.recommendation-item.best-match {
  border-color: #f58040;
  background: #fef7f0;
}

.recommendation-item .size {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  min-width: 30px;
}

.match-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.match-fill {
  height: 100%;
  background: linear-gradient(90deg, #f58040, #fbbf24);
  transition: width 0.3s ease;
}

.match-score {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  min-width: 35px;
  text-align: right;
}

.result-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.result-actions button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.save-btn {
  background: #f58040;
  color: #fff;
}

.save-btn:hover:not(:disabled) {
  background: #e67030;
  transform: translateY(-2px);
}

.save-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.share-btn {
  background: #25d366;
  color: #fff;
}

.share-btn:hover {
  background: #1da851;
  transform: translateY(-2px);
}

.try-another-btn {
  background: #3b82f6;
  color: #fff;
}

.try-another-btn:hover {
  background: #2563eb;
  transform: translateY(-2px);
}

.try-product-btn {
  background: #8b5cf6;
  color: #fff;
}

.try-product-btn:hover {
  background: #7c3aed;
  transform: translateY(-2px);
}

.share-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h4 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #666;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.share-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
}

.share-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 15px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  color: #333;
}

.share-option:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.share-option.whatsapp {
  border-color: #25d366;
  color: #25d366;
}

.share-option.whatsapp:hover {
  background: #25d366;
  color: #fff;
}

.share-option.facebook {
  border-color: #1877f2;
  color: #1877f2;
}

.share-option.facebook:hover {
  background: #1877f2;
  color: #fff;
}

.share-option.twitter {
  border-color: #1da1f2;
  color: #1da1f2;
}

.share-option.twitter:hover {
  background: #1da1f2;
  color: #fff;
}

.share-option.instagram {
  border-color: #e4405f;
  color: #e4405f;
}

.share-option.instagram:hover {
  background: #e4405f;
  color: #fff;
}

.share-option.copy {
  border-color: #6b7280;
  color: #6b7280;
}

.share-option.copy:hover {
  background: #6b7280;
  color: #fff;
}

.share-option i {
  font-size: 24px;
}

@media (max-width: 768px) {
  .result-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .result-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .confidence-score {
    justify-content: center;
  }
  
  .result-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .result-actions button {
    justify-content: center;
  }
  
  .measurements-grid {
    grid-template-columns: 1fr;
  }
  
  .share-options {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
