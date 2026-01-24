import { ref, computed, readonly } from 'vue'
import { useI18n } from 'vue-i18n'

// Tamara API configuration
const TAMARA_API_BASE = 'https://api.tamara.co'
const TAMARA_MERCHANT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhY2NvdW50SWQiOiI4ZDZmMWUyYi1hNzNlLTQxOTItYWMxOS02NjU4NzZhZGM1MjMiLCJ0eXBlIjoibWVyY2hhbnQiLCJzYWx0IjoiMDlkYzk0NTEtZTdkYi00MWQ4LWE4OGUtNmU2OThjYmJlYWUzIiwicm9sZXMiOlsiUk9MRV9NRVJDSEFOVCJdLCJpc010bHMiOmZhbHNlLCJpYXQiOjE3NDExODE5NTgsImlzcyI6IlRhbWFyYSBQUCJ9.qzZmwPjLVmDp-BHZ6cNB1ZYa6l8p4SZB3fijxXg_kwBDXNhn6yeVGpm2bQ-JPRe5KEdj9hJC9u02xfXm-8HMpNAJGCMhBwUswjOS3tdyrpox8Lq44hCgKoHeyAwcDLI89rR4cLTL5D7Y24KclvOPRoKQYWH--LSse5jdyDmJa8uguhm3EL0y9KaSQHSxTw1unuJRpaYe8sEhQfcKwc2liND9aFxx5-4MLZ6EpPqyviVF8Ehc0Ue1FbAKYTGzxlNU6wqXATbaZc-r7zOuN41Hof60vd3Iz0S2XdAiDv6LarXzMY3k3YkR3joV8vxBM9v9g2R-fZjQE8WY4pOI9xnCvA'
const TAMARA_NOTIFICATION_KEY = '4d078ad1-5659-4263-aa0f-d4eeb508e666'
const TAMARA_PUBLIC_KEY = 'fb8d3ca9-5f13-4e30-9915-0234854d9624'

// State
const isTamaraAvailable = ref(false)
const tamaraWidget = ref<any>(null)
const tamaraSession = ref<any>(null)
const tamaraLoading = ref(false)
const tamaraError = ref('')

export const useTamara = () => {
  const { $get, $post } = useApi()
  const { locale } = useI18n()

  // Check if Tamara is available for the current order
  const checkTamaraAvailability = async (orderData: any) => {
    try {
      tamaraLoading.value = true
      tamaraError.value = ''

      // Simple availability check without API call
      const orderTotal = orderData?.total_amount || 0
      const minAmount = 50
      
      console.log('Checking Tamara availability:', { orderTotal, minAmount })
      
      if (orderTotal >= minAmount) {
        isTamaraAvailable.value = true
        console.log('Tamara is available')
        return true
      } else {
        isTamaraAvailable.value = false
        console.log('Tamara is not available - order too small')
        return false
      }
    } catch (error: any) {
      console.error('Tamara availability check failed:', error)
      tamaraError.value = error?.message || 'فشل في التحقق من توفر تمارا'
      isTamaraAvailable.value = false
      return false
    } finally {
      tamaraLoading.value = false
    }
  }

  // Create Tamara session
  const createTamaraSession = async (orderData: any) => {
    try {
      tamaraLoading.value = true
      tamaraError.value = ''

      // Create a mock Tamara checkout URL
      const orderId = orderData.order_reference_id || `ORDER_${Date.now()}`
      const amount = orderData.total_amount || 0
      const currentLocale = locale.value === 'ar' ? 'ar_SA' : 'en_US'
      
      const mockSession = {
        order_id: orderId,
        checkout_url: `https://checkout.tamara.co/login?locale=${currentLocale}&orderId=${orderId}&pay_in_full_value=value_support&ivr=ivr_enabled&payment_fee_popup=detail&ajs_uid=${Date.now()}&checkout_canary=false&checkoutId=${Date.now()}`,
        status: 'created',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      }

      tamaraSession.value = mockSession
      return mockSession
    } catch (error: any) {
      console.error('Tamara session creation failed:', error)
      tamaraError.value = error?.message || 'فشل في إنشاء جلسة تمارا'
      throw error
    } finally {
      tamaraLoading.value = false
    }
  }

  // Initialize Tamara widget
  const initializeTamaraWidget = async (containerId: string, orderData: any) => {
    try {
      // Check if Tamara script is already loaded
      if (!window.Tamara) {
        await loadTamaraScript()
      }

      // Create session first
      const session = await createTamaraSession(orderData)
      
      if (!session?.checkout_url) {
        throw new Error('فشل في الحصول على رابط الدفع من تمارا')
      }

      // Initialize widget
      tamaraWidget.value = new window.Tamara({
        containerId,
        checkoutUrl: session.checkout_url,
        onSuccess: (result: any) => {
          console.log('Tamara payment successful:', result)
          handlePaymentSuccess(result)
        },
        onFailure: (error: any) => {
          console.error('Tamara payment failed:', error)
          handlePaymentFailure(error)
        },
        onCancel: () => {
          console.log('Tamara payment cancelled')
          handlePaymentCancel()
        }
      })

      return tamaraWidget.value
    } catch (error: any) {
      console.error('Tamara widget initialization failed:', error)
      tamaraError.value = error?.message || 'فشل في تهيئة واجهة تمارا'
      throw error
    }
  }

  // Load Tamara script
  const loadTamaraScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.Tamara) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn-sandbox.tamara.co/widget-v2/tamara-widget.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('فشل في تحميل سكريبت تمارا'))
      document.head.appendChild(script)
    })
  }

  // Handle payment success
  const handlePaymentSuccess = async (result: any) => {
    try {
      // Update order status
      await $post('v1/tamara/payment-success', {
        order_id: result.order_id,
        tamara_order_id: result.tamara_order_id,
        payment_status: 'completed'
      })

      // Redirect to success page
      await navigateTo(`/checkout/success?order_id=${result.order_id}&payment_method=tamara`)
    } catch (error) {
      console.error('Error handling payment success:', error)
      tamaraError.value = 'حدث خطأ في تأكيد الدفع'
    }
  }

  // Handle payment failure
  const handlePaymentFailure = (error: any) => {
    tamaraError.value = error?.message || 'فشل في عملية الدفع'
    // Redirect to failure page
    navigateTo('/checkout/failure?payment_method=tamara')
  }

  // Handle payment cancel
  const handlePaymentCancel = () => {
    // Redirect back to checkout
    navigateTo('/checkout')
  }

  // Get payment options
  const getPaymentOptions = async (amount: number) => {
    try {
      // Mock payment options without API call
      const paymentOptions = []
      
      // Pay in full option
      paymentOptions.push({
        id: 'pay_in_full',
        name: 'ادفع كاملاً',
        description: 'ادفع المبلغ كاملاً بدون فوائد',
        amount: amount,
        installments: 1,
        interest_rate: '0%',
        monthly_payment: amount
      })
      
      // Split payment options
      if (amount >= 100) {
        paymentOptions.push({
          id: 'pay_in_2',
          name: 'ادفع على قسطين',
          description: 'قسطان بدون فوائد',
          amount: amount,
          installments: 2,
          interest_rate: '0%',
          monthly_payment: Math.round(amount / 2 * 100) / 100
        })
      }
      
      if (amount >= 200) {
        paymentOptions.push({
          id: 'pay_in_3',
          name: 'ادفع على 3 أقساط',
          description: 'ثلاثة أقساط بدون فوائد',
          amount: amount,
          installments: 3,
          interest_rate: '0%',
          monthly_payment: Math.round(amount / 3 * 100) / 100
        })
      }
      
      if (amount >= 300) {
        paymentOptions.push({
          id: 'pay_in_4',
          name: 'ادفع على 4 أقساط',
          description: 'أربعة أقساط بدون فوائد',
          amount: amount,
          installments: 4,
          interest_rate: '0%',
          monthly_payment: Math.round(amount / 4 * 100) / 100
        })
      }
      
      return paymentOptions
    } catch (error) {
      console.error('Error getting Tamara payment options:', error)
      return []
    }
  }

  // Validate Tamara order
  const validateTamaraOrder = async (orderId: string) => {
    try {
      const response = await $get(`v1/tamara/validate-order/${orderId}`)
      return response?.valid || false
    } catch (error) {
      console.error('Error validating Tamara order:', error)
      return false
    }
  }

  // Get order status
  const getOrderStatus = async (orderId: string) => {
    try {
      const response = await $get(`v1/tamara/order-status/${orderId}`)
      return response
    } catch (error) {
      console.error('Error getting Tamara order status:', error)
      return null
    }
  }

  // Refund order
  const refundOrder = async (orderId: string, amount?: number) => {
    try {
      const response = await $post('v1/tamara/refund', {
        order_id: orderId,
        amount: amount
      })
      return response
    } catch (error) {
      console.error('Error refunding Tamara order:', error)
      throw error
    }
  }

  // Clear Tamara data
  const clearTamaraData = () => {
    isTamaraAvailable.value = false
    tamaraWidget.value = null
    tamaraSession.value = null
    tamaraError.value = ''
  }

  return {
    // State
    isTamaraAvailable: readonly(isTamaraAvailable),
    tamaraWidget: readonly(tamaraWidget),
    tamaraSession: readonly(tamaraSession),
    tamaraLoading: readonly(tamaraLoading),
    tamaraError: readonly(tamaraError),

    // Methods
    checkTamaraAvailability,
    createTamaraSession,
    initializeTamaraWidget,
    getPaymentOptions,
    validateTamaraOrder,
    getOrderStatus,
    refundOrder,
    clearTamaraData
  }
}

// Global Tamara interface
declare global {
  interface Window {
    Tamara: any
  }
}

// Export as default
export default useTamara
