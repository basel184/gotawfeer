<template>
  <main class="checkout-failure-page" :dir="dir">
    <div class="container">
      <div class="failure-content">
        <div class="failure-icon">
          <svg width="80" height="80" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
          </svg>
        </div>
        
        <h1>{{ t('checkout.failure.title') || 'فشل في إتمام الطلب' }}</h1>
        <p class="failure-message">
          {{ t('checkout.failure.message') || 'عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى أو التواصل معنا.' }}
        </p>

        <div v-if="error" class="error-message">
          <p>{{ error }}</p>
        </div>

        <div v-if="paymentMethod" class="payment-info">
          <div class="info-item">
            <span class="label">{{ t('checkout.failure.payment_method') || 'طريقة الدفع' }}</span>
            <span class="value">{{ getPaymentMethodName(paymentMethod) }}</span>
          </div>
        </div>

        <div v-if="paymentMethod === 'tamara'" class="tamara-error-info">
          <div class="tamara-error-card">
            <div class="tamara-logo">
              <div class="tamara-text-logo">تمارا</div>
            </div>
            <div class="tamara-details">
              <h3>{{ t('tamara.failure.title') || 'فشل في الدفع مع تمارا' }}</h3>
              <p>{{ t('tamara.failure.message') || 'لم يتم إتمام عملية الدفع مع تمارا. يرجى المحاولة مرة أخرى أو اختيار طريقة دفع أخرى.' }}</p>
            </div>
          </div>
        </div>

        <div class="failure-actions">
          <button @click="retryPayment" class="retry-btn">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            {{ t('checkout.failure.retry') || 'إعادة المحاولة' }}
          </button>
          
          <NuxtLink :to="getLocalizedPath('/checkout')" class="back-to-checkout-btn">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            {{ t('checkout.failure.back_to_checkout') || 'العودة للدفع' }}
          </NuxtLink>
          
          <NuxtLink :to="getLocalizedPath('/')" class="continue-shopping-btn">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
            </svg>
            {{ t('checkout.failure.continue_shopping') || 'متابعة التسوق' }}
          </NuxtLink>
        </div>

        <div class="support-info">
          <h3>{{ t('checkout.failure.need_help') || 'تحتاج مساعدة؟' }}</h3>
          <p>{{ t('checkout.failure.contact_support') || 'تواصل مع فريق الدعم لدينا' }}</p>
          <div class="support-actions">
            <a href="tel:+966537030838" class="support-btn" dir="ltr">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
              +966 53 703 0838
            </a>
            <a href="mailto:gotawfeer@gmail.com" class="support-btn">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              gotawfeer@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const route = useRoute()
const dir = computed(() => locale.value === 'ar' ? 'rtl' : 'ltr')

// State
const error = ref<string | null>(null)
const paymentMethod = ref<string | null>(null)

// Helper function to get localized path with proper i18n handling
const getLocalizedPath = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const currentLocale = locale.value || 'ar'
  
  if (currentLocale === 'en') {
    if (cleanPath.startsWith('/en')) {
      return cleanPath
    }
    return `/en${cleanPath}`
  }
  
  if (cleanPath.startsWith('/en')) {
    return cleanPath.substring(3) || '/'
  }
  
  return cleanPath
}

// SEO Configuration
const seo = useSeo()

seo.setSeo({
  title: locale.value === 'ar' ? 'فشل في إتمام الطلب' : 'Order Failed',
  description: locale.value === 'ar' 
    ? 'عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى أو التواصل معنا.'
    : 'Sorry, an error occurred while processing your order. Please try again or contact us.',
  keywords: locale.value === 'ar' 
    ? 'فشل الطلب، خطأ، جو توفير'
    : 'order failed, error, Go Tawfeer',
  image: '/images/go-tawfeer-1-1.webp',
  noindex: true
})

// Payment method names
const paymentMethodNames = {
  ar: {
    cash_on_delivery: 'الدفع عند الاستلام',
    wallet: 'المحفظة الرقمية',
    card: 'بطاقة ائتمان',
    bank_transfer: 'تحويل بنكي',
    tamara: 'تمارا - ادفع على أقساط',
    paymob_accept: 'باي موب',
    tabby: 'تابي - ادفع على أقساط'
  },
  en: {
    cash_on_delivery: 'Cash on Delivery',
    wallet: 'Digital Wallet',
    card: 'Credit Card',
    bank_transfer: 'Bank Transfer',
    tamara: 'Tamara - Pay in Installments',
    paymob_accept: 'PayMob',
    tabby: 'Tabby - Pay in Installments'
  }
}

const getPaymentMethodName = (method: string) => {
  const currentLocale = useI18n().locale.value || 'ar'
  const localeTranslations = paymentMethodNames[currentLocale as keyof typeof paymentMethodNames] || paymentMethodNames.ar
  return localeTranslations[method as keyof typeof localeTranslations] || method
}

const retryPayment = () => {
  // Go back to checkout page
  navigateTo(getLocalizedPath('/checkout'))
}

onMounted(() => {
  // Get payment method from URL params
  paymentMethod.value = route.query.payment_method as string || null
  
  // Get error message from URL if available
  const errorMessage = route.query.error as string
  if (errorMessage) {
    error.value = decodeURIComponent(errorMessage)
  }
})
</script>

<style scoped>
.checkout-failure-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 40px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 0 20px;
}

.failure-content {
  background: #fff;
  border-radius: 20px;
  padding: 60px 40px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.failure-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: linear-gradient(90deg, #ef4444, #dc2626, #b91c1c);
  z-index: 1;
}

.failure-icon {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 30px;
  color: white;
  animation: failureShake 0.5s ease-in-out;
  position: relative;
  z-index: 2;
}

.failure-icon svg {
  width: 60px;
  height: 60px;
}

@keyframes failureShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px;
  position: relative;
  z-index: 2;
}

.failure-message {
  font-size: 18px;
  color: #64748b;
  margin: 0 0 40px;
  line-height: 1.6;
  position: relative;
  z-index: 2;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 40px;
  position: relative;
  z-index: 2;
}

.payment-info {
  background: #f8fafc;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 40px;
  text-align: right;
  position: relative;
  z-index: 2;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.info-item .label {
  font-weight: 600;
  color: #475569;
}

.info-item .value {
  font-weight: 700;
  color: #1e293b;
}

.tamara-error-info {
  margin-bottom: 40px;
  position: relative;
  z-index: 2;
}

.tamara-error-card {
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  border: 2px solid #fca5a5;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.tamara-logo {
  flex-shrink: 0;
}

.tamara-text-logo {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tamara-details h3 {
  font-size: 18px;
  font-weight: 600;
  color: #dc2626;
  margin: 0 0 8px;
}

.tamara-details p {
  font-size: 14px;
  color: #b91c1c;
  margin: 0;
  line-height: 1.5;
}

.failure-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 40px;
  position: relative;
  z-index: 2;
  flex-wrap: wrap;
}

.retry-btn,
.back-to-checkout-btn,
.continue-shopping-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 32px;
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  font-size: 16px;
  border: none;
  cursor: pointer;
}

.retry-btn {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px -3px rgba(59, 130, 246, 0.4);
}

.back-to-checkout-btn {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.3);
}

.back-to-checkout-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px -3px rgba(245, 158, 11, 0.4);
}

.continue-shopping-btn {
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  color: #475569;
  border: 1px solid #cbd5e1;
}

.continue-shopping-btn:hover {
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.support-info {
  background: #f8fafc;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  position: relative;
  z-index: 2;
}

.support-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px;
}

.support-info p {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 16px;
}

.support-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.support-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #fff;
  color: #475569;
  text-decoration: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.support-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

/* Responsive Design */
@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }
  
  .failure-content {
    padding: 40px 24px;
  }
  
  .failure-icon {
    width: 100px;
    height: 100px;
    margin-bottom: 24px;
  }
  
  .failure-icon svg {
    width: 50px;
    height: 50px;
  }
  
  h1 {
    font-size: 24px;
  }
  
  .failure-message {
    font-size: 16px;
  }
  
  .tamara-error-card {
    flex-direction: column;
    text-align: center;
  }
  
  .failure-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .retry-btn,
  .back-to-checkout-btn,
  .continue-shopping-btn {
    width: 100%;
    justify-content: center;
  }
  
  .support-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .support-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
