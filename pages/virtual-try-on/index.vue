<template>
  <div class="virtual-try-on-page">
    <div class="page-header">
      <div class="container">
        <h1>التجربة الافتراضية للملابس</h1>
        <p>جرب الملابس رقمياً قبل الشراء باستخدام الذكاء الاصطناعي</p>
      </div>
    </div>

    <div class="page-content">
      <div class="container">
        <!-- Step Indicator -->
        <div class="step-indicator">
          <div 
            v-for="(step, index) in steps" 
            :key="index"
            class="step"
            :class="{ 
              'active': currentStep === index,
              'completed': currentStep > index,
              'disabled': currentStep < index
            }"
          >
            <div class="step-number">
              <i :class="step.icon" v-if="currentStep > index"></i>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div class="step-label">{{ step.label }}</div>
          </div>
        </div>

        <!-- Step 1: Camera Capture -->
        <div v-if="currentStep === 0" class="step-content">
          <div class="step-header">
            <h2>التقاط صورة شخصية</h2>
            <p>التقط صورة واضحة لبدء التجربة الافتراضية</p>
          </div>
          
          <div class="camera-section">
            <CameraCapture
              :on-photo-captured="onPhotoCaptured"
              :on-error="onCameraError"
            />
          </div>
        </div>

        <!-- Step 2: Product Selection -->
        <div v-if="currentStep === 1" class="step-content">
          <div class="step-header">
            <h2>اختر المنتج</h2>
            <p>اختر المنتج الذي تريد تجربته</p>
          </div>
          
          <div class="product-selection-section">
            <ProductSelector
              :products="compatibleProducts"
              :loading="loadingProducts"
              @product-select="onProductSelect"
              @try-on="onTryOn"
              @view-details="onViewProductDetails"
            />
          </div>
        </div>

        <!-- Step 3: Virtual Try-On Result -->
        <div v-if="currentStep === 2" class="step-content">
          <div class="step-header">
            <h2>نتيجة التجربة الافتراضية</h2>
            <p>شاهد كيف تبدو الملابس عليك</p>
          </div>
          
          <div class="result-section">
            <VirtualTryOnResult
              :result-images="getResultImages()"
              :product-name="selectedProduct?.name || 'منتج غير محدد'"
              :product-brand="selectedProduct?.brand || 'علامة تجارية غير محددة'"
              :product-price="selectedProduct?.price || 0"
              :product-discount="selectedProduct?.discount || 0"
              :product-thumbnail="getProductImage(selectedProduct)"
              :selected-size="selectedSize"
              :measurements-used="getMeasurementsUsed()"
              :recommendations="getRecommendations()"
              :confidence-score="0.85"
              :result-id="1"
              @save="onSaveResult"
              @share="onShareResult"
              @try-another-size="onTryAnotherSize"
              @try-another-product="onTryAnotherProduct"
            />
          </div>
        </div>

        <!-- Navigation -->
        <div class="step-navigation">
          <button 
            v-if="currentStep > 0"
            @click="previousStep"
            class="nav-btn prev-btn"
          >
            <i class="fas fa-arrow-right"></i>
            السابق
          </button>
          
          <button 
            v-if="currentStep < steps.length - 1"
            @click="nextStep"
            class="nav-btn next-btn"
            :disabled="!canProceed"
          >
            التالي
            <i class="fas fa-arrow-left"></i>
          </button>
        </div>

        <!-- Session Info -->
        <div class="session-info" v-if="sessionToken">
          <div class="info-card">
            <h4>معلومات الجلسة</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">حالة الجلسة:</span>
                <span class="value" :class="{ 'active': sessionActive }">
                  {{ sessionActive ? 'نشطة' : 'منتهية' }}
                </span>
              </div>
              <div class="info-item" v-if="sessionExpiresAt">
                <span class="label">تنتهي في:</span>
                <span class="value">{{ formatTime(sessionExpiresAt) }}</span>
              </div>
              <div class="info-item" v-if="photoUploaded">
                <span class="label">الصورة:</span>
                <span class="value success">تم الرفع</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div class="loading-overlay" v-if="isLoading">
      <div class="loading-content">
        <div class="spinner"></div>
        <h3>{{ loadingMessage }}</h3>
        <p>{{ loadingSubMessage }}</p>
      </div>
    </div>

    <!-- Error Modal -->
    <div class="error-modal" v-if="showErrorModal" @click="closeErrorModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>حدث خطأ</h3>
        </div>
        <div class="modal-body">
          <p>{{ errorMessage }}</p>
        </div>
        <div class="modal-footer">
          <button @click="closeErrorModal" class="btn btn-primary">حسناً</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Meta
useHead({
  title: 'التجربة الافتراضية للملابس - جو توفير',
  meta: [
    { name: 'description', content: 'جرب الملابس رقمياً قبل الشراء باستخدام الذكاء الاصطناعي' }
  ]
})

// Components
import CameraCapture from '~/components/VirtualTryOn/CameraCapture.vue'
import ProductSelector from '~/components/VirtualTryOn/ProductSelector.vue'
import VirtualTryOnResult from '~/components/VirtualTryOn/VirtualTryOnResult.vue'

// Composables
const { $get, $post } = useApi()
const { createSession, uploadCustomerPhoto, getCompatibleProducts, generateTryOn, saveResult, shareResult } = useVirtualTryOn()
const { guestId, setGuestId } = useGuest()

// State
const currentStep = ref(0)
const sessionToken = ref<string | null>(null)
const sessionActive = ref(false)
const sessionExpiresAt = ref<Date | null>(null)
const photoUploaded = ref(false)
const selectedProduct = ref<any>(null)
const selectedSize = ref('')
const compatibleProducts = ref<any[]>([])
const tryOnResult = ref<any>(null)
const isLoading = ref(false)
const loadingMessage = ref('')
const loadingSubMessage = ref('')
const showErrorModal = ref(false)
const errorMessage = ref('')
const loadingProducts = ref(false)

// Steps configuration
const steps = [
  {
    label: 'التقاط الصورة',
    icon: 'fas fa-camera'
  },
  {
    label: 'اختيار المنتج',
    icon: 'fas fa-tshirt'
  },
  {
    label: 'النتيجة',
    icon: 'fas fa-magic'
  }
]

// Computed
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0:
      return photoUploaded.value
    case 1:
      return selectedProduct.value && selectedSize.value
    case 2:
      return true
    default:
      return false
  }
})

// Methods
const initializeSession = async () => {
  try {
    isLoading.value = true
    loadingMessage.value = 'إنشاء جلسة جديدة...'
    
    const session = await createSession(guestId.value?.toString())
    
    sessionToken.value = session.session_token
    sessionActive.value = true
    sessionExpiresAt.value = new Date(session.expires_at)
    
  } catch (error) {
    console.error('Failed to create session:', error)
    showError('فشل في إنشاء الجلسة')
  } finally {
    isLoading.value = false
  }
}

const onPhotoCaptured = async (photo: File) => {
  if (!sessionToken.value) {
    // إنشاء جلسة جديدة إذا لم تكن موجودة
    await initializeSession()
    if (!sessionToken.value) {
      showError('فشل في إنشاء الجلسة')
      return
    }
  }
  
  try {
    isLoading.value = true
    loadingMessage.value = 'جاري معالجة الصورة...'
    loadingSubMessage.value = 'تحليل القياسات والخصائص'
    
    const result = await uploadCustomerPhoto(sessionToken.value, photo)
    photoUploaded.value = true
    
    // Load compatible products
    await loadCompatibleProducts()
    
    nextStep()
    
  } catch (error) {
    showError('فشل في معالجة الصورة')
  } finally {
    isLoading.value = false
  }
}

const loadCompatibleProducts = async () => {
  if (!sessionToken.value) return
  
  try {
    loadingProducts.value = true
    console.log('🔵 Loading compatible products...')
    const products = await getCompatibleProducts(sessionToken.value)
    console.log('🔵 Products loaded:', products)
    compatibleProducts.value = products
    
  } catch (error) {
    console.error('Failed to load products:', error)
    showError('فشل في تحميل المنتجات')
  } finally {
    loadingProducts.value = false
  }
}

const onProductSelect = (product: any) => {
  selectedProduct.value = product
}

const onTryOn = async (product: any, size: string) => {
  console.log('🟢 onTryOn called with:', product, size)
  console.log('🟢 sessionToken:', sessionToken.value)
  
  if (!sessionToken.value) {
    console.log('🟢 No session token, returning')
    return
  }
  
  selectedProduct.value = product
  selectedSize.value = size
  
  try {
    isLoading.value = true
    loadingMessage.value = 'جاري توليد التجربة الافتراضية...'
    loadingSubMessage.value = 'استخدام الذكاء الاصطناعي لإنشاء الصورة'
    
    console.log('🟢 Calling generateTryOn...')
    const result = await generateTryOn(sessionToken.value, product.id, size)
    console.log('🟢 generateTryOn result:', result)
    tryOnResult.value = result
    
    nextStep()
    
  } catch (error) {
    console.error('🟢 Error in onTryOn:', error)
    showError('فشل في توليد التجربة الافتراضية')
  } finally {
    isLoading.value = false
  }
}

const onViewProductDetails = (product: any) => {
  navigateTo(`/product/${product.slug}`)
}

const onSaveResult = async () => {
  if (!sessionToken.value || !tryOnResult.value) return
  
  try {
    await saveResult(
      sessionToken.value,
      tryOnResult.value.product_info.id,
      selectedSize.value,
      tryOnResult.value.images,
      tryOnResult.value.measurements_used,
      tryOnResult.value.confidence_scores
    )
    
    // Show success message
    // You can add a toast notification here
    
  } catch (error) {
    showError('فشل في حفظ النتيجة')
  }
}

const onShareResult = async (platform: string) => {
  if (!tryOnResult.value?.result_id) return
  
  try {
    await shareResult(tryOnResult.value.result_id, platform)
    
    // Show success message
    // You can add a toast notification here
    
  } catch (error) {
    showError('فشل في مشاركة النتيجة')
  }
}

const onTryAnotherSize = () => {
  currentStep.value = 1
}

const onTryAnotherProduct = () => {
  currentStep.value = 1
  selectedProduct.value = null
  selectedSize.value = ''
  tryOnResult.value = null
}

const onCameraError = (error: string) => {
  showError(error)
}

const nextStep = () => {
  if (canProceed.value && currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const showError = (message: string) => {
  errorMessage.value = message
  showErrorModal.value = true
}

const closeErrorModal = () => {
  showErrorModal.value = false
  errorMessage.value = ''
}

const formatTime = (date: Date) => {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  
  if (diff <= 0) return 'منتهية'
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours} ساعة و ${minutes % 60} دقيقة`
  } else {
    return `${minutes} دقيقة`
  }
}

// Helper functions for VirtualTryOnResult
const getResultImages = () => {
  return {
    main: 'https://gotawfeer.com/project/storage/virtual-try-on/customer-photos/processed/e2049c12-57ba-469a-b507-70c9d8184821.jpg',
    front: 'https://gotawfeer.com/project/storage/virtual-try-on/customer-photos/processed/e2049c12-57ba-469a-b507-70c9d8184821.jpg',
    side: 'https://gotawfeer.com/project/storage/virtual-try-on/customer-photos/processed/e2049c12-57ba-469a-b507-70c9d8184821.jpg',
    back: 'https://gotawfeer.com/project/storage/virtual-try-on/customer-photos/processed/e2049c12-57ba-469a-b507-70c9d8184821.jpg',
    generated_0: 'https://gotawfeer.com/project/storage/virtual-try-on/customer-photos/processed/e2049c12-57ba-469a-b507-70c9d8184821.jpg',
    generated_1: 'https://gotawfeer.com/project/storage/virtual-try-on/customer-photos/processed/e2049c12-57ba-469a-b507-70c9d8184821.jpg',
    generated_2: 'https://gotawfeer.com/project/storage/virtual-try-on/customer-photos/processed/e2049c12-57ba-469a-b507-70c9d8184821.jpg'
  }
}

const getProductImage = (product: any) => {
  if (!product) return '/images/placeholder.svg'
  
  // Handle thumbnail object
  if (product.thumbnail && typeof product.thumbnail === 'object') {
    if (product.thumbnail.path && product.thumbnail.status === 200) {
      return product.thumbnail.path
    }
    if (product.thumbnail.key) {
      return `https://gotawfeer.com/project${product.thumbnail.key}`
    }
  }
  
  // Handle thumbnail string
  if (product.thumbnail && typeof product.thumbnail === 'string') {
    if (product.thumbnail.startsWith('http')) {
      return product.thumbnail
    }
    return `https://gotawfeer.com/project${product.thumbnail}`
  }
  
  return '/images/placeholder.svg'
}

const getMeasurementsUsed = () => {
  return {
    chest: 95,
    waist: 80,
    hips: 100,
    shoulder_width: 45,
    arm_length: 60,
    leg_length: 85
  }
}

const getRecommendations = () => {
  return {
    'S': 0.6,
    'M': 0.9,
    'L': 0.7,
    'XL': 0.4
  }
}

// Initialize
onMounted(async () => {
  console.log('🔵 Page mounted')
  // Ensure guest ID is set
  if (!guestId.value) {
    // Generate a random guest ID if not set
    const randomId = Math.floor(Math.random() * 1000000) + 100000
    setGuestId(randomId)
    console.log('🔵 Generated guest ID:', randomId)
  }
  
  await initializeSession()
  // Load products after session is created
  if (sessionToken.value) {
    await loadCompatibleProducts()
  }
})

// Cleanup
onUnmounted(() => {
  // Cleanup any resources
})
</script>

<style scoped>
.virtual-try-on-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 60px 0;
  text-align: center;
}

.page-header h1 {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 15px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.page-header p {
  font-size: 20px;
  opacity: 0.9;
  max-width: 600px;
  margin: 0 auto;
}

.page-content {
  padding: 60px 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.step-indicator {
  display: flex;
  justify-content: center;
  margin-bottom: 60px;
  position: relative;
}

.step-indicator::before {
  content: '';
  position: absolute;
  top: 25px;
  left: 10%;
  right: 10%;
  height: 2px;
  background: #e5e7eb;
  z-index: 1;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  position: relative;
  z-index: 2;
  background: #f5f7fa;
  padding: 0 20px;
}

.step-number {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.step.active .step-number {
  background: #f58040;
  color: white;
  transform: scale(1.1);
}

.step.completed .step-number {
  background: #10b981;
  color: white;
}

.step.disabled .step-number {
  background: #e5e7eb;
  color: #9ca3af;
}

.step-label {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
  min-width: 100px;
}

.step.active .step-label {
  color: #f58040;
  font-weight: 600;
}

.step.completed .step-label {
  color: #10b981;
}

.step-content {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  margin-bottom: 40px;
}

.step-header {
  text-align: center;
  margin-bottom: 40px;
}

.step-header h2 {
  font-size: 32px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.step-header p {
  font-size: 18px;
  color: #666;
}

.camera-section {
  max-width: 500px;
  margin: 0 auto;
}

.product-selection-section {
  margin: 0;
}

.result-section {
  margin: 0;
}

.step-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 30px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.prev-btn {
  background: #6b7280;
  color: white;
}

.prev-btn:hover {
  background: #4b5563;
  transform: translateY(-2px);
}

.next-btn {
  background: #f58040;
  color: white;
}

.next-btn:hover:not(:disabled) {
  background: #e67030;
  transform: translateY(-2px);
}

.next-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  transform: none;
}

.session-info {
  margin-top: 40px;
}

.info-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.info-card h4 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.value {
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.value.active {
  color: #10b981;
}

.value.success {
  color: #10b981;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  text-align: center;
  color: white;
}

.loading-content .spinner {
  width: 60px;
  height: 60px;
  border: 6px solid rgba(255, 255, 255, 0.3);
  border-top: 6px solid #f58040;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

.loading-content h3 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 10px;
}

.loading-content p {
  font-size: 16px;
  opacity: 0.8;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-modal {
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
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.modal-header {
  margin-bottom: 20px;
}

.modal-header i {
  font-size: 48px;
  color: #ef4444;
  margin-bottom: 15px;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.modal-body p {
  font-size: 16px;
  color: #666;
  margin-bottom: 20px;
}

.modal-footer {
  display: flex;
  justify-content: center;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #f58040;
  color: white;
}

.btn-primary:hover {
  background: #e67030;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .page-header h1 {
    font-size: 36px;
  }
  
  .page-header p {
    font-size: 18px;
  }
  
  .step-indicator {
    flex-direction: column;
    gap: 20px;
  }
  
  .step-indicator::before {
    display: none;
  }
  
  .step-content {
    padding: 20px;
  }
  
  .step-header h2 {
    font-size: 24px;
  }
  
  .step-header p {
    font-size: 16px;
  }
  
  .step-navigation {
    flex-direction: column;
    gap: 15px;
  }
  
  .nav-btn {
    width: 100%;
    justify-content: center;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
