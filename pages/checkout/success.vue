<template>
  <main class="checkout-success-page" dir="rtl">
    <div class="container">
      <div class="success-content">
        <div class="success-icon">
          <svg width="80" height="80" viewBox="0 0 24 24">
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
        
        <h1>{{ t('checkout.success.title') || 'تم إتمام الطلب بنجاح!' }}</h1>
        <p class="success-message">
          {{ t('checkout.success.message') || 'شكراً لك على طلبك. تم إرسال تفاصيل الطلب إلى بريدك الإلكتروني.' }}
        </p>

        <div v-if="orderId" class="order-info">
          <div class="info-item">
            <span class="label">{{ t('checkout.success.order_id') || 'رقم الطلب' }}</span>
            <span class="value">#{{ orderId }}</span>
          </div>
          <div v-if="paymentMethod" class="info-item">
            <span class="label">{{ t('checkout.success.payment_method') || 'طريقة الدفع' }}</span>
            <span class="value">{{ getPaymentMethodName(paymentMethod) }}</span>
          </div>
        </div>

        <div class="success-actions">
          <NuxtLink to="/account/orders" class="view-orders-btn">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
            </svg>
            {{ t('checkout.success.view_orders') || 'عرض طلباتي' }}
          </NuxtLink>
          
          <NuxtLink to="/" class="continue-shopping-btn">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
            </svg>
            {{ t('checkout.success.continue_shopping') || 'متابعة التسوق' }}
          </NuxtLink>
        </div>

        <div v-if="paymentMethod === 'tamara'" class="tamara-info">
          <div class="tamara-card">
            <div class="tamara-logo">
              <div class="tamara-text-logo">تمارا</div>
            </div>
            <div class="tamara-details">
              <h3>{{ t('tamara.success.title') || 'تم الدفع بنجاح مع تمارا' }}</h3>
              <p>{{ t('tamara.success.message') || 'سيتم خصم المبلغ على أقساط حسب الخطة المختارة' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()

// Get order details from URL params
const orderId = ref<string | null>(null)
const paymentMethod = ref<string | null>(null)

// Payment method names
const paymentMethodNames = {
  ar: {
    cash_on_delivery: 'الدفع عند الاستلام',
    wallet: 'المحفظة الرقمية',
    card: 'بطاقة ائتمان',
    bank_transfer: 'تحويل بنكي',
    tamara: 'تمارا - ادفع على أقساط'
  },
  en: {
    cash_on_delivery: 'Cash on Delivery',
    wallet: 'Digital Wallet',
    card: 'Credit Card',
    bank_transfer: 'Bank Transfer',
    tamara: 'Tamara - Pay in Installments'
  }
}

const getPaymentMethodName = (method: string) => {
  const currentLocale = useI18n().locale.value || 'ar'
  const localeTranslations = paymentMethodNames[currentLocale as keyof typeof paymentMethodNames] || paymentMethodNames.ar
  return localeTranslations[method as keyof typeof localeTranslations] || method
}

onMounted(() => {
  // Get order ID from URL params
  orderId.value = route.query.order_id as string || null
  paymentMethod.value = route.query.payment_method as string || null
})
</script>

<style scoped>
.checkout-success-page {
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

.success-content {
  background: #fff;
  border-radius: 20px;
  padding: 60px 40px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.success-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: linear-gradient(90deg, #10b981, #059669, #047857);
  z-index: 1;
}

.success-icon {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 30px;
  color: white;
  animation: successPulse 2s ease-in-out infinite;
  position: relative;
  z-index: 2;
}

.success-icon svg {
  width: 60px;
  height: 60px;
}

@keyframes successPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px;
  position: relative;
  z-index: 2;
}

.success-message {
  font-size: 18px;
  color: #64748b;
  margin: 0 0 40px;
  line-height: 1.6;
  position: relative;
  z-index: 2;
}

.order-info {
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
  border-bottom: 1px solid #e2e8f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  font-weight: 600;
  color: #475569;
}

.info-item .value {
  font-weight: 700;
  color: #1e293b;
}

.success-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 40px;
  position: relative;
  z-index: 2;
}

.view-orders-btn,
.continue-shopping-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  font-size: 16px;
}

.view-orders-btn {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
}

.view-orders-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px -3px rgba(59, 130, 246, 0.4);
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

.tamara-info {
  position: relative;
  z-index: 2;
}

.tamara-card {
  background: linear-gradient(135deg, #f0fdfa, #e6fffa);
  border: 2px solid #4ecdc4;
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
  color: #1e293b;
  margin: 0 0 8px;
}

.tamara-details p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

/* Responsive Design */
@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }
  
  .success-content {
    padding: 40px 24px;
  }
  
  .success-icon {
    width: 100px;
    height: 100px;
    margin-bottom: 24px;
  }
  
  .success-icon svg {
    width: 50px;
    height: 50px;
  }
  
  h1 {
    font-size: 24px;
  }
  
  .success-message {
    font-size: 16px;
  }
  
  .success-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .view-orders-btn,
  .continue-shopping-btn {
    width: 100%;
    justify-content: center;
  }
  
  .tamara-card {
    flex-direction: column;
    text-align: center;
  }
}
</style>
