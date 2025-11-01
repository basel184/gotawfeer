<template>
  <div class="tamara-payment-widget" v-if="isTamaraAvailable">
    <div class="tamara-header">
      <div class="tamara-logo">
        <img src="/images/tamara-logo.png" alt="Tamara" v-if="false" />
        <div class="tamara-text-logo">تمارا</div>
      </div>
      <div class="tamara-description">
        {{ t('tamara.description') || 'ادفع على أقساط بدون فوائد مع تمارا' }}
      </div>
    </div>

    <div class="tamara-options" v-if="paymentOptions.length > 0">
      <div 
        v-for="option in paymentOptions" 
        :key="option.id"
        class="tamara-option"
        :class="{ active: selectedOption?.id === option.id }"
        @click="selectOption(option)"
      >
        <div class="option-icon">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div class="option-details">
          <div class="option-title">{{ option.name }}</div>
          <div class="option-description">{{ option.description }}</div>
          <div class="option-amount">{{ formatAmount(option.amount) }}</div>
        </div>
        <div class="option-radio">
          <div class="radio-button" :class="{ active: selectedOption?.id === option.id }"></div>
        </div>
      </div>
    </div>

    <div class="tamara-info" v-if="selectedOption">
      <div class="info-item">
        <span class="label">{{ t('tamara.total_amount') || 'المبلغ الإجمالي' }}</span>
        <span class="value">{{ formatAmount(orderTotal) }}</span>
      </div>
      <div class="info-item">
        <span class="label">{{ t('tamara.installment_amount') || 'مبلغ القسط' }}</span>
        <span class="value">{{ formatAmount(selectedOption.amount) }}</span>
      </div>
      <div class="info-item">
        <span class="label">{{ t('tamara.number_of_installments') || 'عدد الأقساط' }}</span>
        <span class="value">{{ selectedOption.installments }}</span>
      </div>
      <div class="info-item highlight">
        <span class="label">{{ t('tamara.interest_rate') || 'معدل الفائدة' }}</span>
        <span class="value">{{ selectedOption.interest_rate || '0%' }}</span>
      </div>
    </div>

    <div class="tamara-actions">
      <button 
        class="tamara-pay-btn"
        @click="proceedWithTamara"
        :disabled="!selectedOption || tamaraLoading"
      >
        <div v-if="tamaraLoading" class="loading-spinner"></div>
        <svg v-else width="20" height="20" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        {{ tamaraLoading ? (t('tamara.processing') || 'جاري المعالجة...') : (t('tamara.pay_with_tamara') || 'ادفع مع تمارا') }}
      </button>
    </div>

    <div v-if="tamaraError" class="tamara-error">
      <svg width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      {{ tamaraError }}
    </div>

    <div class="tamara-terms">
      <p>{{ t('tamara.terms') || 'بالضغط على "ادفع مع تمارا"، فإنك توافق على شروط وأحكام تمارا' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const tamara = useTamara()

// Props
interface Props {
  orderData: any
  orderTotal: number
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  paymentSuccess: [result: any]
  paymentFailure: [error: any]
  paymentCancel: []
}>()

// State
const paymentOptions = ref<any[]>([])
const selectedOption = ref<any>(null)

// Computed
const isTamaraAvailable = computed(() => tamara.isTamaraAvailable.value)
const tamaraLoading = computed(() => tamara.tamaraLoading.value)
const tamaraError = computed(() => tamara.tamaraError.value)

// Methods
const loadPaymentOptions = async () => {
  try {
    const options = await tamara.getPaymentOptions(props.orderTotal)
    paymentOptions.value = options
    
    // Auto-select first option if available
    if (options.length > 0) {
      selectedOption.value = options[0]
    }
  } catch (error) {
    console.error('Error loading Tamara payment options:', error)
  }
}

const selectOption = (option: any) => {
  selectedOption.value = option
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR'
  }).format(amount)
}

const proceedWithTamara = async () => {
  if (!selectedOption.value) return

  try {
    const orderData = {
      ...props.orderData,
      payment_option: selectedOption.value,
      payment_method: 'tamara'
    }

    // Create Tamara session
    const session = await tamara.createTamaraSession(orderData)
    
    if (session?.checkout_url) {
      // Redirect to Tamara checkout
      window.location.href = session.checkout_url
    } else {
      throw new Error('فشل في الحصول على رابط الدفع من تمارا')
    }
  } catch (error: any) {
    console.error('Tamara payment error:', error)
    emit('paymentFailure', error)
  }
}

// Check availability on mount
onMounted(async () => {
  await tamara.checkTamaraAvailability(props.orderData)
  if (isTamaraAvailable.value) {
    await loadPaymentOptions()
  }
})

// Watch for order data changes
watch(() => props.orderData, async (newData) => {
  if (newData) {
    await tamara.checkTamaraAvailability(newData)
    if (isTamaraAvailable.value) {
      await loadPaymentOptions()
    }
  }
}, { deep: true })
</script>

<style scoped>
.tamara-payment-widget {
  background: #fff;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  margin: 16px 0;
  position: relative;
  overflow: hidden;
}

.tamara-payment-widget::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1);
  z-index: 1;
}

.tamara-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  position: relative;
  z-index: 2;
}

.tamara-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tamara-text-logo {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tamara-description {
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}

.tamara-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.tamara-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fff;
}

.tamara-option:hover {
  border-color: #4ecdc4;
  box-shadow: 0 4px 6px -1px rgba(78, 205, 196, 0.1);
}

.tamara-option.active {
  border-color: #4ecdc4;
  background: linear-gradient(135deg, #f0fdfa, #e6fffa);
  box-shadow: 0 4px 6px -1px rgba(78, 205, 196, 0.2);
}

.option-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0fdfa;
  border-radius: 8px;
  color: #4ecdc4;
}

.option-details {
  flex: 1;
}

.option-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.option-description {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 4px;
}

.option-amount {
  font-size: 16px;
  font-weight: 700;
  color: #059669;
}

.option-radio {
  width: 20px;
  height: 20px;
  position: relative;
}

.radio-button {
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-radius: 50%;
  position: relative;
  transition: all 0.3s ease;
}

.radio-button.active {
  border-color: #4ecdc4;
  background: #4ecdc4;
}

.radio-button.active::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
}

.tamara-info {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.info-item.highlight {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: 600;
  color: #166534;
}

.info-item .label {
  color: #64748b;
  font-weight: 500;
}

.info-item .value {
  color: #1e293b;
  font-weight: 600;
}

.tamara-actions {
  margin-bottom: 16px;
}

.tamara-pay-btn {
  width: 100%;
  background: linear-gradient(135deg, #4ecdc4, #45b7d1);
  color: white;
  border: none;
  padding: 16px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 6px -1px rgba(78, 205, 196, 0.3);
  position: relative;
  overflow: hidden;
}

.tamara-pay-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.tamara-pay-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px -3px rgba(78, 205, 196, 0.4);
}

.tamara-pay-btn:hover:not(:disabled)::before {
  left: 100%;
}

.tamara-pay-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.tamara-error {
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 16px;
  border: 1px solid #fca5a5;
}

.tamara-terms {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.tamara-terms p {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .tamara-payment-widget {
    padding: 20px;
    margin: 12px 0;
  }
  
  .tamara-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .tamara-option {
    padding: 12px;
    gap: 12px;
  }
  
  .option-icon {
    width: 32px;
    height: 32px;
  }
  
  .tamara-info {
    padding: 12px;
  }
  
  .tamara-pay-btn {
    padding: 14px 20px;
    font-size: 14px;
  }
}
</style>
