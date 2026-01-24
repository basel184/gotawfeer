<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

// Types
interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price: number
  product?: {
    name: string
    thumbnail: string
  }
}

interface TrackingResult {
  id: string
  order_status: string
  created_at: string
  order_amount: number
  shipping_cost?: number
  discount_amount?: number
  payment_method?: string
  tracking_number?: string
  delivery_address?: string
  details: OrderItem[]
}

const { t } = useI18n()
const { $get } = useApi()

// Tracking data
const trackingForm = ref({
  order_id: '',
  phone: ''
})

const trackingResult = ref<TrackingResult | null>(null)
const loading = ref(false)
const error = ref('')

// Track order
const trackOrder = async () => {
  if (!trackingForm.value.order_id && !trackingForm.value.phone) {
    error.value = 'يرجى إدخال رقم الطلب أو رقم الهاتف'
    return
  }

  loading.value = true
  error.value = ''
  trackingResult.value = null

  try {
    const params = new URLSearchParams()
    if (trackingForm.value.order_id) {
      params.append('order_id', trackingForm.value.order_id)
    }
    if (trackingForm.value.phone) {
      params.append('phone', trackingForm.value.phone)
    }

    const response = await $get(`v1/customer/order/track?${params.toString()}`)
    trackingResult.value = response
  } catch (err: any) {
    console.error('Error tracking order:', err)
    error.value = err?.data?.message || 'خطأ في تتبع الطلب'
  } finally {
    loading.value = false
  }
}

// Get status name
const getStatusName = (status: string) => {
  const statuses = {
    pending: { name: 'في الانتظار', color: '#f59e0b', icon: '⏳' },
    confirmed: { name: 'مؤكد', color: '#3b82f6', icon: '✅' },
    processing: { name: 'قيد المعالجة', color: '#8b5cf6', icon: '⚙️' },
    shipped: { name: 'تم الشحن', color: '#06b6d4', icon: '🚚' },
    out_for_delivery: { name: 'خارج للتوصيل', color: '#f59e0b', icon: '📦' },
    delivered: { name: 'تم التسليم', color: '#10b981', icon: '🎉' },
    cancelled: { name: 'ملغي', color: '#ef4444', icon: '❌' },
    returned: { name: 'مرتجع', color: '#6b7280', icon: '↩️' }
  }
  return statuses[status as keyof typeof statuses] || { name: status, color: '#6b7280', icon: '❓' }
}

// Format date
const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format currency
const formatCurrency = (amount: number) => {
  if (!amount || isNaN(amount)) return '0 ر.س'
  return `${amount.toLocaleString()} ر.س`
}

// Get tracking progress percentage
const getTrackingProgress = (status: string) => {
  const progressMap = {
    pending: 10,
    confirmed: 25,
    processing: 40,
    shipped: 60,
    out_for_delivery: 80,
    delivered: 100,
    cancelled: 0,
    returned: 0
  }
  return progressMap[status as keyof typeof progressMap] || 0
}

// Get tracking steps
const getTrackingSteps = () => {
  return [
    { key: 'pending', name: 'تم استلام الطلب', description: 'تم استلام طلبك بنجاح' },
    { key: 'confirmed', name: 'تم تأكيد الطلب', description: 'تم تأكيد طلبك وبدء المعالجة' },
    { key: 'processing', name: 'قيد المعالجة', description: 'يتم تحضير طلبك للتوصيل' },
    { key: 'shipped', name: 'تم الشحن', description: 'تم شحن طلبك وهو في الطريق' },
    { key: 'out_for_delivery', name: 'خارج للتوصيل', description: 'طلبك خارج للتوصيل' },
    { key: 'delivered', name: 'تم التسليم', description: 'تم تسليم طلبك بنجاح' }
  ]
}

// Check if step is completed
const isStepCompleted = (stepKey: string, currentStatus: string) => {
  const stepOrder = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered']
  const currentIndex = stepOrder.indexOf(currentStatus)
  const stepIndex = stepOrder.indexOf(stepKey)
  return stepIndex <= currentIndex
}

// Check if step is current
const isStepCurrent = (stepKey: string, currentStatus: string) => {
  return stepKey === currentStatus
}
</script>

<template>
  <div class="tracking-page" dir="rtl">
    <div class="container">
      <div class="page-header">
        <h1>تتبع الطلب</h1>
        <p>تتبع حالة طلباتك في الوقت الفعلي</p>
      </div>

      <div class="tracking-content">
        <!-- Tracking Form -->
        <div class="tracking-form-section">
          <div class="form-card">
            <h2>تتبع طلبك</h2>
            <p>أدخل رقم الطلب أو رقم الهاتف لتتبع حالة طلبك</p>
            
            <form @submit.prevent="trackOrder" class="tracking-form">
              <div class="form-row">
                <div class="form-group">
                  <label for="order_id">رقم الطلب</label>
                  <input
                    id="order_id"
                    v-model="trackingForm.order_id"
                    type="text"
                    placeholder="أدخل رقم الطلب"
                    :disabled="loading"
                  />
                </div>
                <div class="form-group">
                  <label for="phone">رقم الهاتف</label>
                  <input
                    id="phone"
                    v-model="trackingForm.phone"
                    type="tel"
                    placeholder="أدخل رقم الهاتف"
                    :disabled="loading"
                  />
                </div>
              </div>

              <div v-if="error" class="error-message">
                {{ error }}
              </div>

              <button type="submit" class="track-btn" :disabled="loading">
                <span v-if="loading">جاري التتبع...</span>
                <span v-else>تتبع الطلب</span>
              </button>
            </form>
          </div>
        </div>

        <!-- Tracking Result -->
        <div v-if="trackingResult" class="tracking-result-section">
          <div class="result-card">
            <div class="order-header">
              <div class="order-info">
                <h3>طلب #{{ trackingResult.id }}</h3>
                <p class="order-date">{{ formatDate(trackingResult.created_at) }}</p>
              </div>
              <div class="order-status">
                <span 
                  class="status-badge"
                  :style="{ backgroundColor: getStatusName(trackingResult.order_status).color }"
                >
                  {{ getStatusName(trackingResult.order_status).icon }}
                  {{ getStatusName(trackingResult.order_status).name }}
                </span>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="progress-section">
              <div class="progress-header">
                <h4>تقدم الطلب</h4>
                <span class="progress-percentage">{{ getTrackingProgress(trackingResult.order_status) }}%</span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill"
                  :style="{ width: `${getTrackingProgress(trackingResult.order_status)}%` }"
                ></div>
              </div>
            </div>

            <!-- Tracking Steps -->
            <div class="tracking-steps">
              <h4>مراحل التتبع</h4>
              <div class="steps-list">
                <div 
                  v-for="step in getTrackingSteps()" 
                  :key="step.key"
                  class="step-item"
                  :class="{
                    completed: isStepCompleted(step.key, trackingResult.order_status),
                    current: isStepCurrent(step.key, trackingResult.order_status)
                  }"
                >
                  <div class="step-icon">
                    <div v-if="isStepCompleted(step.key, trackingResult.order_status)" class="check-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                    <div v-else class="step-number">{{ getTrackingSteps().indexOf(step) + 1 }}</div>
                  </div>
                  <div class="step-content">
                    <h5>{{ step.name }}</h5>
                    <p>{{ step.description }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Order Details -->
            <div class="order-details">
              <h4>تفاصيل الطلب</h4>
              <div class="details-grid">
                <div class="detail-item">
                  <span class="label">المجموع الكلي:</span>
                  <span class="value">{{ formatCurrency(trackingResult.order_amount) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">رسوم الشحن:</span>
                  <span class="value">{{ formatCurrency(trackingResult.shipping_cost || 0) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">الخصم:</span>
                  <span class="value">-{{ formatCurrency(trackingResult.discount_amount || 0) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">طريقة الدفع:</span>
                  <span class="value">{{ trackingResult.payment_method || 'غير محدد' }}</span>
                </div>
                <div v-if="trackingResult.tracking_number" class="detail-item">
                  <span class="label">رقم التتبع:</span>
                  <span class="value">{{ trackingResult.tracking_number }}</span>
                </div>
                <div v-if="trackingResult.delivery_address" class="detail-item">
                  <span class="label">عنوان التوصيل:</span>
                  <span class="value">{{ trackingResult.delivery_address }}</span>
                </div>
              </div>
            </div>

            <!-- Order Items -->
            <div v-if="trackingResult.details && trackingResult.details.length > 0" class="order-items">
              <h4>منتجات الطلب</h4>
              <div class="items-list">
                <div v-for="item in trackingResult.details" :key="item.id" class="item-card">
                  <div class="item-image">
                    <img 
                      :src="item.product?.thumbnail || '/placeholder-product.jpg'" 
                      :alt="item.product?.name"
                    />
                  </div>
                  <div class="item-info">
                    <h5>{{ item.product?.name || 'منتج محذوف' }}</h5>
                    <p>الكمية: {{ item.quantity }}</p>
                    <p>السعر: {{ formatCurrency(item.price) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Contact Support -->
            <div class="support-section">
              <h4>تحتاج مساعدة؟</h4>
              <p>إذا كان لديك أي استفسارات حول طلبك، لا تتردد في التواصل معنا</p>
              <div class="support-actions">
                <NuxtLink to="/account/support" class="support-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                  </svg>
                  تواصل مع الدعم
                </NuxtLink>
                <a href="tel:+966500000000" class="call-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                  اتصل بنا
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- No Results -->
        <div v-if="!trackingResult && !loading && !error" class="no-results">
          <div class="no-results-icon">🔍</div>
          <h3>ابحث عن طلبك</h3>
          <p>أدخل رقم الطلب أو رقم الهاتف أعلاه لتتبع حالة طلبك</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tracking-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 20px 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px;
}

.page-header p {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

/* Tracking Form Section */
.tracking-form-section {
  margin-bottom: 40px;
}

.form-card {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 2px solid #6b46c1;
}

.form-card h2 {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px;
}

.form-card p {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 24px;
}

.tracking-form {
  max-width: 600px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.form-group input {
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #6b46c1;
  box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1);
}

.form-group input:disabled {
  background: #f9fafb;
  color: #6b7280;
}

.track-btn {
  background: #6b46c1;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.track-btn:hover:not(:disabled) {
  background: #553c9a;
}

.track-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  background: #fee;
  color: #c53030;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
  border: 1px solid #feb2b2;
}

/* Tracking Result Section */
.tracking-result-section {
  margin-bottom: 40px;
}

.result-card {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.order-info h3 {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px;
}

.order-date {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.status-badge {
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Progress Section */
.progress-section {
  margin-bottom: 32px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-header h4 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.progress-percentage {
  font-size: 16px;
  font-weight: 600;
  color: #6b46c1;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6b46c1 0%, #8b5cf6 100%);
  transition: width 0.3s ease;
}

/* Tracking Steps */
.tracking-steps {
  margin-bottom: 32px;
}

.tracking-steps h4 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 20px;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border-radius: 8px;
  transition: all 0.2s;
}

.step-item.completed {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.step-item.current {
  background: #fef3c7;
  border: 1px solid #fde68a;
}

.step-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-item.completed .step-icon {
  background: #10b981;
  color: white;
}

.step-item.current .step-icon {
  background: #f59e0b;
  color: white;
}

.step-item:not(.completed):not(.current) .step-icon {
  background: #e5e7eb;
  color: #6b7280;
}

.check-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-number {
  font-size: 14px;
  font-weight: 600;
}

.step-content h5 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 4px;
}

.step-content p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* Order Details */
.order-details {
  margin-bottom: 32px;
}

.order-details h4 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-item:last-child {
  border-bottom: none;
}

.label {
  font-weight: 600;
  color: #374151;
}

.value {
  color: #6b7280;
}

/* Order Items */
.order-items {
  margin-bottom: 32px;
}

.order-items h4 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.item-image {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-info h5 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px;
}

.item-info p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 4px;
}

/* Support Section */
.support-section {
  background: #f8fafc;
  padding: 24px;
  border-radius: 8px;
  text-align: center;
}

.support-section h4 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px;
}

.support-section p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 20px;
}

.support-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.support-btn,
.call-btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.support-btn {
  background: #6b46c1;
  color: white;
  border: none;
}

.support-btn:hover {
  background: #553c9a;
}

.call-btn {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.call-btn:hover {
  background: #e5e7eb;
}

/* No Results */
.no-results {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.no-results-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.no-results h3 {
  font-size: 24px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px;
}

.no-results p {
  font-size: 16px;
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .order-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .support-actions {
    flex-direction: column;
  }

  .support-btn,
  .call-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
