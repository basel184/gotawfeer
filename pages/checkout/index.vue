<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaqnyatAuth } from '../../composables/useTaqnyatAuth'
const { t, locale, te } = useI18n()
const cart = useCart()
const auth = useAuth()
const { $get, $post } = useApi()

// SEO Configuration
const seo = useSeo()

// Set SEO for checkout page
seo.setSeo({
  title: locale.value === 'ar' ? 'إتمام الطلب' : 'Checkout',
  description: locale.value === 'ar' 
    ? 'أكمل عملية الشراء من جو توفير. اختر عنوان التسليم وطريقة الدفع.'
    : 'Complete your purchase from Go Tawfeer. Choose delivery address and payment method.',
  keywords: locale.value === 'ar' 
    ? 'إتمام الطلب، شراء، دفع، تسليم، جو توفير'
    : 'checkout, purchase, payment, delivery, Go Tawfeer',
  image: '/images/go-tawfeer-1-1.webp',
  noindex: true // Checkout pages shouldn't be indexed
})

// Loading states
const loading = ref(false)
const placingOrder = ref(false)

// Form data
const selectedAddress = ref<any>(null)
const selectedPaymentMethod = ref('')
const couponCode = ref('')
const appliedCoupon = ref<any>(null)

// Persist applied coupon to localStorage
const COUPON_STORAGE_KEY = 'applied_coupon'

// Save coupon to localStorage
function saveCouponToStorage(coupon: any) {
  if (process.client && coupon) {
    try {
      localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(coupon))
    } catch (error) {
      console.error('Error saving coupon to localStorage:', error)
    }
  }
}

// Load coupon from localStorage
function loadCouponFromStorage() {
  if (process.client) {
    try {
      const savedCoupon = localStorage.getItem(COUPON_STORAGE_KEY)
      if (savedCoupon) {
        const parsed = JSON.parse(savedCoupon)
        // Validate that coupon has required fields
        if (parsed && parsed.coupon_code && parsed.discount_amount !== undefined) {
          return parsed
        }
      }
    } catch (error) {
      console.error('Error loading coupon from localStorage:', error)
    }
  }
  return null
}

// Remove coupon from localStorage
function removeCouponFromStorage() {
  if (process.client) {
    try {
      localStorage.removeItem(COUPON_STORAGE_KEY)
    } catch (error) {
      console.error('Error removing coupon from localStorage:', error)
    }
  }
}

// Login modal state - OTP Login
const taqnyatAuth = useTaqnyatAuth()
const loginModalOpen = ref(false)
const otpForm = ref({
  phone: '',
  otp: ''
})
const otpSent = ref(false)
const otpCountdown = ref(0)
let otpTimer: any = null
const loginSuccess = ref(false)

const paymentMethods = computed(() => {
  const translations = {
    ar: {
      tabby: 'تابي - ادفع على 4 أقساط',
      tamara: 'تمارا - ادفع لاحقاً',
      paymob_visa: 'Paymob - فيزا / ماستركارد',
      paymob_apple_pay: 'Paymob - Apple Pay'
    },
    en: {
      tabby: 'Tabby - Pay in 4 Installments',
      tamara: 'Tamara - Pay Later',
      paymob_visa: 'Paymob - Visa / Mastercard',
      paymob_apple_pay: 'Paymob - Apple Pay'
    }
  }
  
  const currentLocale = locale.value || 'ar'
  const localeTranslations = translations[currentLocale as keyof typeof translations] || translations.ar
  
  const methods = [
    { id: 'tabby', name: localeTranslations.tabby, icon: '💳', available: true },
    { id: 'tamara', name: localeTranslations.tamara, icon: '🛒', available: true },
    { id: 'paymob_visa', name: localeTranslations.paymob_visa, icon: '💳', available: true, integration_id: 9668	 },
    { id: 'paymob_apple_pay', name: localeTranslations.paymob_apple_pay, icon: '🍎', available: true, integration_id: 9984 }
  ]
  
  return methods
})
// Addresses
const addresses = ref<any[]>([])

// Computed
const items = computed(() => cart.items.value || [])
const itemsTotal = computed(() => items.value.reduce((s: number, it: any) => s + Number(it?.quantity || it?.qty || 0), 0))
const subtotal = computed(() => items.value.reduce((s: number, it: any) => s + (Number(it?.price || 0) * Number(it?.quantity || it?.qty || 0)), 0))
const discountTotal = computed(() => items.value.reduce((s: number, it: any) => s + (Number(it?.discount || 0) * Number(it?.quantity || it?.qty || 0)), 0))
const subtotalAfterDiscount = computed(() => Math.max(0, subtotal.value - discountTotal.value))
const taxExcluded = computed(() => items.value.reduce((s: number, it: any) => s + (it?.tax_model === 'exclude' ? Number(it?.tax || 0) * Number(it?.quantity || it?.qty || 0) : 0), 0))
const shipping = computed(() => items.value.reduce((s: number, it: any) => s + Number(it?.shipping_cost || 25), 0))

// Coupon discount
const couponDiscount = computed(() => {
  if (appliedCoupon.value && appliedCoupon.value.discount_amount) {
    return Number(appliedCoupon.value.discount_amount)
  }
  return 0
})

const grandTotal = computed(() => {
  const baseTotal = subtotalAfterDiscount.value + taxExcluded.value + shipping.value
  return Math.max(0, baseTotal - couponDiscount.value)
})

// Currency helper
const cfg = useRuntimeConfig() as any
const currencyCode = (cfg?.public?.currencyCode || 'SAR') as string

function money(n: any): string {
  const loc = locale?.value === 'ar' ? 'ar-SA' : 'en-US'
  try {
    return new Intl.NumberFormat(loc, { style: 'currency', currency: currencyCode }).format(Number((n as any)?.value ?? n) || 0)
  } catch {
    const sym = (cfg?.public?.currencySymbol || (locale?.value === 'ar' ? 'ر.س' : 'SAR')) as string
    const raw = (n as any)?.value ?? n
    const val = Number(raw != null ? raw : 0)
    return `${val.toFixed(2)} ${sym}`
  }
}

// Image helper functions
function getProductImage(item: any): string {
  // Try different image sources in order of preference
  if (item.product?.thumbnail_full_url?.path) {
    return item.product.thumbnail_full_url.path
  }
  
  if (item.product?.thumbnail_full_url) {
    return item.product.thumbnail_full_url
  }
  
  if (item.product?.thumbnail) {
    return `${cfg?.public?.baseURL || 'https://admin.gotawfeer.com'}/storage/product/thumbnail/${item.product.thumbnail}`
  }
  
  if (item.thumbnail) {
    return `${cfg?.public?.baseURL || 'https://admin.gotawfeer.com'}/storage/product/thumbnail/${item.thumbnail}`
  }
  
  // Fallback to placeholder
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0MFY0MEgyMFYyMFoiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTI1IDI1SDM1VjM1SDI1VjI1WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0MFY0MEgyMFYyMFoiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTI1IDI1SDM1VjM1SDI1VjI1WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'
}

// Login modal functions
function openLoginModal() {
  loginModalOpen.value = true
  loginSuccess.value = false
  // Reset OTP form
  otpForm.value = { phone: '', otp: '' }
  otpSent.value = false
  otpCountdown.value = 0
  if (otpTimer) {
    clearInterval(otpTimer)
    otpTimer = null
  }
  taqnyatAuth.clearMessages()
}

function closeLoginModal() {
  loginModalOpen.value = false
  loginSuccess.value = false
  // Reset OTP form
  otpForm.value = { phone: '', otp: '' }
  otpSent.value = false
  otpCountdown.value = 0
  if (otpTimer) {
    clearInterval(otpTimer)
    otpTimer = null
  }
  taqnyatAuth.clearMessages()
}

// OTP Login Functions
async function handleRequestOtp() {
  if (!otpForm.value.phone || otpForm.value.phone.trim() === '') {
    taqnyatAuth.error.value = t('taqnyat.phone_required') || 'رقم الهاتف مطلوب'
    return
  }

  const success = await taqnyatAuth.requestOtp(otpForm.value.phone)
  if (success) {
    otpSent.value = true
    // Start countdown (60 seconds)
    otpCountdown.value = 60
    otpTimer = setInterval(() => {
      otpCountdown.value--
      if (otpCountdown.value <= 0) {
        clearInterval(otpTimer)
        otpTimer = null
      }
    }, 1000)
  }
}

async function handleOtpLogin() {
  if (!otpForm.value.phone || !otpForm.value.otp) {
    taqnyatAuth.error.value = t('taqnyat.otp_required') || 'رمز التحقق مطلوب'
    return
  }

  const success = await taqnyatAuth.verifyOtp(otpForm.value.phone, otpForm.value.otp)
  if (success) {
    loginModalOpen.value = false
    otpForm.value = { phone: '', otp: '' }
    otpSent.value = false
    otpCountdown.value = 0
    if (otpTimer) {
      clearInterval(otpTimer)
      otpTimer = null
    }
    // Show success message
    loginSuccess.value = true
    // Reload addresses after successful login
    await loadAddresses()
    setTimeout(() => {
      loginSuccess.value = false
    }, 2000)
  }
}

async function handleResendOtp() {
  if (!otpForm.value.phone) {
    taqnyatAuth.error.value = t('taqnyat.phone_required') || 'رقم الهاتف مطلوب'
    return
  }

  const success = await taqnyatAuth.resendOtp(otpForm.value.phone)
  if (success) {
    // Reset countdown
    otpCountdown.value = 60
    if (otpTimer) {
      clearInterval(otpTimer)
    }
    otpTimer = setInterval(() => {
      otpCountdown.value--
      if (otpCountdown.value <= 0) {
        clearInterval(otpTimer)
        otpTimer = null
      }
    }, 1000)
  }
}

async function loadAddresses() {
  try {
    // Check if user is authenticated
    if (!auth?.user?.value) {
      console.warn('User not authenticated, cannot load addresses')
      return
    }
    
    const response = await $get('v1/customer/address/list')
    console.log('Addresses response:', response) // Debug log
    
    // Handle different response formats
    if (Array.isArray(response)) {
      addresses.value = response
    } else if (response?.data && Array.isArray(response.data)) {
      addresses.value = response.data
    } else {
      addresses.value = []
    }
    
    if (addresses.value.length > 0) {
      selectedAddress.value = addresses.value[0]
    }
  } catch (error) {
    console.error('Error loading addresses:', error)
    // Show user-friendly error message
    alert(t('checkout.errors.load_addresses') || 'خطأ في تحميل العناوين. تأكد من تسجيل الدخول.')
  }
}

async function loadCart() {
  try {
    await cart.list()
  } catch (error) {
    console.error('Error loading cart:', error)
  }
}

// Apply coupon
async function applyCoupon() {
  if (!couponCode.value.trim()) return
  
  try {
    // Get guest_id from useGuest composable
    const { guestId } = useGuest()
    
    // Prepare request data
    // Backend handles: if user is authenticated, it uses customer_id from token ($request->user()->id)
    // If user is guest, it uses guest_id from request ($request->guest_id ?? '0')
    // We should always send guest_id as fallback, even for authenticated users
    const requestData: any = {
      coupon_code: couponCode.value.trim()
    }
    
    // Always send guest_id if available (backend uses it as fallback)
    // Backend code: $customer_id = $request->user() ? $request->user()->id : ($request->guest_id ?? '0');
    // Convert to number to ensure correct type
    if (guestId?.value) {
      requestData.guest_id = Number(guestId.value)
    } else {
      // If no guest_id, use 0 as fallback (backend default)
      requestData.guest_id = 0
    }
    
    console.log('Applying coupon:', {
      coupon_code: requestData.coupon_code,
      guest_id: requestData.guest_id,
      is_authenticated: !!auth?.user?.value,
      user_id: auth?.user?.value?.id || 'N/A'
    })
    
    const response = await $post('v1/coupon/apply', requestData)
    
    console.log('Coupon response:', response)
    
    // Backend returns: {success: true, data: {...}} for success (200)
    // Backend returns: {success: false, message: '...'} for failure (202)
    // Check success flag explicitly
    if (response?.success === true) {
      // Success case - apply the coupon
      if (response.data) {
        appliedCoupon.value = response.data
      } else {
        // Fallback: use response itself if data is not nested
        appliedCoupon.value = response
      }
      // Save coupon to localStorage for persistence
      saveCouponToStorage(appliedCoupon.value)
      // Clear the input after successful application
      couponCode.value = ''
      console.log('Coupon applied successfully:', appliedCoupon.value)
    } else {
      // Failure case - extract error message
      let errorMessage = ''
      
      // Backend returns message directly in response.message
      if (response?.message) {
        errorMessage = response.message
      } else if (response?.data?.message) {
        errorMessage = response.data.message
      } else if (response?.data?.data?.message) {
        errorMessage = response.data.data.message
      } else {
        errorMessage = t('checkout.errors.invalid_coupon') || 'كود الخصم غير صحيح'
      }
      
      console.error('Coupon application failed:', errorMessage)
      alert(errorMessage)
    }
  } catch (error: any) {
    console.error('Error applying coupon:', error)
    
    // Handle nested error structure (in case $fetch throws an error)
    // Backend may return status 202 with {success: false, message: '...'} in error.data
    let errorMessage = ''
    
    // First, check if error.data contains the response (status 202 case)
    if (error?.data && typeof error.data === 'object') {
      // If error.data has success: false, extract message from it
      if (error.data.success === false && error.data.message) {
        errorMessage = error.data.message
      } else if (error.data.message) {
        errorMessage = error.data.message
      } else if (error.data.data?.message) {
        errorMessage = error.data.data.message
      }
    }
    
    // If no message found yet, check other nested structures
    if (!errorMessage) {
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      } else {
        errorMessage = t('checkout.errors.apply_coupon') || 'حدث خطأ في تطبيق كود الخصم'
      }
    }
    
    alert(errorMessage)
  }
}

// Remove coupon
function removeCoupon() {
  appliedCoupon.value = null
  couponCode.value = ''
  // Remove coupon from localStorage
  removeCouponFromStorage()
}

// Select payment method
function selectPaymentMethod(methodId: string) {
  console.log('Payment method clicked:', methodId)
  selectedPaymentMethod.value = methodId
  console.log('Selected payment method set to:', selectedPaymentMethod.value)
}

// Place order
// Place order

async function placeOrder() {
  console.log('placeOrder called, selectedPaymentMethod:', selectedPaymentMethod.value) // Debug log
  
  if (!selectedAddress.value) {
    alert(t('checkout.errors.select_address') || 'يرجى اختيار عنوان التسليم')
    return
  }
  
  if (!selectedPaymentMethod.value) {
    alert(t('checkout.errors.select_payment') || 'يرجى اختيار طريقة الدفع')
    return
  }
  
  placingOrder.value = true
  
  try {
    // First, mark all cart items as checked
    const cartItems = items.value || []
    if (cartItems.length === 0) {
      alert(t('checkout.errors.empty_cart') || 'السلة فارغة')
      return
    }

    const cartItemIds = cartItems.map((item: any) => item.id).filter((id: any) => id)
    if (cartItemIds.length > 0) {
      console.log('Marking cart items as checked:', cartItemIds)
      await $post('v1/cart/select-cart-items', {
        action: 'checked',
        ids: cartItemIds
      })
    }

    // Get integration_id from selected payment method
    const selectedMethod = paymentMethods.value.find(m => m.id === selectedPaymentMethod.value)
    let integrationId = null
    if (selectedPaymentMethod.value === 'paymob_visa' || selectedPaymentMethod.value === 'paymob_apple_pay') {
      integrationId = selectedMethod?.integration_id || (selectedPaymentMethod.value === 'paymob_apple_pay' ? 9984 : 9985)
    }

    const orderData: any = {
      address_id: selectedAddress.value.id,
      payment_method: selectedPaymentMethod.value,
      coupon_code: appliedCoupon.value?.coupon_code || ''
    }
    
    // Add integration_id if it's a Paymob payment method
    if (integrationId) {
      orderData.integration_id = integrationId
    }
    
    console.log('Selected payment method:', selectedPaymentMethod.value) // Debug log
    console.log('Integration ID:', integrationId) // Debug log
    console.log('Available payment methods:', paymentMethods.value) // Debug log
    console.log('Sending order data:', orderData) // Debug log
    
    // Debug: Log payment method for Tamara
    if (selectedPaymentMethod.value === 'tamara') {
      console.log('Processing Tamara payment with method:', orderData.payment_method)
    }
    
    const response = await $post('v1/customer/order/place', orderData)
    console.log('Order placement response:', response) // Debug log
    
    // Handle Paymob payment (Visa or Apple Pay)
    if (selectedPaymentMethod.value === 'paymob_visa' || selectedPaymentMethod.value === 'paymob_apple_pay') {
      console.log('Paymob payment selected:', selectedPaymentMethod.value, response)
      
      // For Paymob, redirect to payment URL
      let paymentUrl = null
      
      if (response.payment_url) {
        paymentUrl = response.payment_url
      } else if (response.checkout_url) {
        paymentUrl = response.checkout_url
      } else if (response.payment_data?.payment_url) {
        paymentUrl = response.payment_data.payment_url
      } else if (response.payment_data?.checkout_url) {
        paymentUrl = response.payment_data.checkout_url
      } else if (response.payment_data?.redirect_url) {
        paymentUrl = response.payment_data.redirect_url
      }
      
      console.log('Payment URL found:', paymentUrl)
      
      if (paymentUrl) {
        console.log('Redirecting to Paymob payment page...', paymentUrl)
        
        // Show loading message
        const paymentType = selectedPaymentMethod.value === 'paymob_apple_pay' ? 'Apple Pay' : 'فيزا / ماستركارد'
        alert(`جاري فتح صفحة دفع Paymob (${paymentType})...`)
        
        // Force redirect immediately
        setTimeout(() => {
          window.location.href = paymentUrl
        }, 100)
        
        // Also try window.open as backup
        setTimeout(() => {
          window.open(paymentUrl, '_self')
        }, 200)
        
        // Try multiple methods to open the URL
        try {
          // Method 1: Direct redirect
          window.location.href = paymentUrl
        } catch (error) {
          console.error('Direct redirect failed:', error)
          try {
            // Method 2: Using window.open
            window.open(paymentUrl, '_self')
          } catch (error2) {
            console.error('Window.open failed:', error2)
            try {
              // Method 3: Using location.replace
              window.location.replace(paymentUrl)
            } catch (error3) {
              console.error('Location.replace failed:', error3)
              // Method 4: Create a link and click it
              const link = document.createElement('a')
              link.href = paymentUrl
              link.target = '_self'
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            }
          }
        }
        
        // Fallback: Show alert with URL after a short delay
        setTimeout(() => {
          if (window.location.href === window.location.origin + window.location.pathname) {
            // Try one more time
            window.location.href = paymentUrl
            setTimeout(() => {
              if (window.location.href === window.location.origin + window.location.pathname) {
                alert('يرجى النقر على الرابط لفتح صفحة دفع Paymob:\n' + paymentUrl)
              }
            }, 500)
          }
        }, 1000)
        return
      } else {
        console.error('No payment URL found in response:', response)
        alert('خطأ في إنشاء رابط دفع Paymob')
        return
      }
    }

    // Handle Tabby payment
    if (selectedPaymentMethod.value === 'tabby') {
      console.log('Tabby payment selected, response:', response)
      
      // For Tabby, redirect to payment URL
      let paymentUrl = null
      
      if (response.payment_url) {
        paymentUrl = response.payment_url
      } else if (response.checkout_url) {
        paymentUrl = response.checkout_url
      } else if (response.payment_data?.payment_url) {
        paymentUrl = response.payment_data.payment_url
      } else if (response.payment_data?.checkout_url) {
        paymentUrl = response.payment_data.checkout_url
      } else if (response.payment_data?.redirect_url) {
        paymentUrl = response.payment_data.redirect_url
      }
      
      console.log('Payment URL found:', paymentUrl)
      
      if (paymentUrl) {
        console.log('Redirecting to Tabby payment page...', paymentUrl)
        
        // Show loading message
        alert('جاري فتح صفحة دفع تابي...')
        
        // Force redirect immediately
        setTimeout(() => {
          window.location.href = paymentUrl
        }, 100)
        
        // Also try window.open as backup
        setTimeout(() => {
          window.open(paymentUrl, '_self')
        }, 200)
        
        // Try multiple methods to open the URL
        try {
          // Method 1: Direct redirect
          window.location.href = paymentUrl
        } catch (error) {
          console.error('Direct redirect failed:', error)
          try {
            // Method 2: Using window.open
            window.open(paymentUrl, '_self')
          } catch (error2) {
            console.error('Window.open failed:', error2)
            try {
              // Method 3: Using location.replace
              window.location.replace(paymentUrl)
            } catch (error3) {
              console.error('Location.replace failed:', error3)
              // Method 4: Create a link and click it
              const link = document.createElement('a')
              link.href = paymentUrl
              link.target = '_self'
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            }
          }
        }
        
        // Fallback: Show alert with URL after a short delay
        setTimeout(() => {
          if (window.location.href === window.location.origin + window.location.pathname) {
            // Try one more time
            window.location.href = paymentUrl
            setTimeout(() => {
              if (window.location.href === window.location.origin + window.location.pathname) {
                alert('يرجى النقر على الرابط لفتح صفحة دفع تابي:\n' + paymentUrl)
              }
            }, 500)
          }
        }, 1000)
        return
      } else {
        console.error('No payment URL found in response:', response)
        alert('خطأ في إنشاء رابط دفع تابي')
        return
      }
    }

    // Handle Tamara payment
    if (selectedPaymentMethod.value === 'tamara') {
      console.log('Tamara payment selected, response:', response)
      
      // For Tamara, redirect to payment URL
      let paymentUrl = null
      
      if (response.payment_url) {
        paymentUrl = response.payment_url
      } else if (response.payment_data?.payment_url) {
        paymentUrl = response.payment_data.payment_url
      } else if (response.payment_data?.checkout_url) {
        paymentUrl = response.payment_data.checkout_url
      } else if (response.payment_data?.redirect_url) {
        paymentUrl = response.payment_data.redirect_url
      }
      
      console.log('Payment URL found:', paymentUrl)
      
      if (paymentUrl) {
        console.log('Redirecting to Tamara payment page...', paymentUrl)
      
        // Try multiple methods to open the URL
        try {
          // Method 1: Direct redirect
          window.location.href = paymentUrl
        } catch (error) {
          console.error('Direct redirect failed:', error)
          try {
            // Method 2: Using window.open
            window.open(paymentUrl, '_self')
          } catch (error2) {
            console.error('Window.open failed:', error2)
            try {
              // Method 3: Using location.replace
              window.location.replace(paymentUrl)
            } catch (error3) {
              console.error('Location.replace failed:', error3)
              // Method 4: Create a link and click it
              const link = document.createElement('a')
              link.href = paymentUrl
              link.target = '_self'
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            }
          }
        }
        
        // Fallback: Show alert with URL after a short delay
        setTimeout(() => {
          if (window.location.href === window.location.origin + window.location.pathname) {
            alert('يرجى النقر على الرابط لفتح صفحة دفع تمارا:\n' + paymentUrl)
          }
        }, 1000)
        return
      } else {
        console.error('No payment URL found in response:', response)
        alert('خطأ في إنشاء رابط دفع تمارا')
        return
      }
    }
    
    // Check if order was created successfully for other payment methods
    if (response?.order_ids && response.order_ids.length > 0) {
      
      // For other payment methods, clear cart and redirect
      await cart.clearAll()
      
      // Redirect to success page or order details
      const orderId = response.order_ids[0] // Get first order ID
      await navigateTo(`/account/orders?order_id=${orderId}`)
    } else if (response?.order_ids && response.order_ids.length === 0) {
      alert(t('checkout.errors.order_success_no_order') || 'تم إرسال الطلب بنجاح ولكن لم يتم إنشاء طلب. يرجى المحاولة مرة أخرى.')
    } else {
      alert(response?.message || (t('checkout.errors.order_error') || 'حدث خطأ في إتمام الطلب'))
    }
  } catch (error) {
    console.error('Error placing order:', error)
    alert(t('checkout.errors.order_error') || 'حدث خطأ في إتمام الطلب')
  } finally {
    placingOrder.value = false
  }
}


// Check if cart is empty after loading
onMounted(async () => {
  loading.value = true
  try {
    // Load applied coupon from localStorage first
    const savedCoupon = loadCouponFromStorage()
    if (savedCoupon) {
      // Verify coupon is still valid by checking with backend
      try {
        const { guestId } = useGuest()
        const requestData: any = {
          coupon_code: savedCoupon.coupon_code
        }
        if (guestId?.value) {
          requestData.guest_id = Number(guestId.value)
        } else {
          requestData.guest_id = 0
        }
        
        const response = await $post('v1/coupon/apply', requestData)
        
        if (response?.success === true && response.data) {
          // Coupon is still valid, apply it
          appliedCoupon.value = response.data
          saveCouponToStorage(response.data)
          console.log('Restored and verified coupon from storage:', response.data)
        } else {
          // Coupon is no longer valid, remove it
          console.warn('Saved coupon is no longer valid, removing:', savedCoupon)
          removeCouponFromStorage()
          appliedCoupon.value = null
        }
      } catch (error) {
        // If verification fails, still try to use saved coupon
        // User can remove it manually if it doesn't work
        console.warn('Could not verify saved coupon, using saved value:', error)
        appliedCoupon.value = savedCoupon
      }
    }
    
    await Promise.all([
      loadAddresses(),
      loadCart()
    ])
    
    // Check if cart is empty after loading
    if (items.value.length === 0) {
      await navigateTo('/cart')
      return
    }
  } catch (error) {
    console.error('Error loading checkout data:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="checkout-page" dir="rtl">
    <div class="container">
      <!-- Header -->
      <section class="section card">
        <div class="section-header">
          <h1>{{ t('checkout.title') || 'إتمام الطلب' }}</h1>
          <div class="checkout-progress">
            <div class="progress-step active">
              <span class="step-number">1</span>
              <span class="step-label">{{ t('checkout.step_cart') || 'السلة' }}</span>
            </div>
            <div class="progress-line"></div>
            <div class="progress-step active">
              <span class="step-number">2</span>
              <span class="step-label">{{ t('checkout.step_payment') || 'الدفع' }}</span>
            </div>
            <div class="progress-line"></div>
            <div class="progress-step">
              <span class="step-number">3</span>
              <span class="step-label">{{ t('checkout.step_confirm') || 'التأكيد' }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <h3>{{ t('checkout.loading') || 'جاري تحميل بيانات الطلب...' }}</h3>
      </div>

      <!-- Checkout Content -->
      <div v-else class="checkout-content">
        <div class="checkout-main">
          <!-- Address Selection -->
          <section class="section card">
            <div class="section-header">
              <h2>{{ t('checkout.delivery_address') || 'عنوان التسليم' }}</h2>
              <NuxtLink  v-if="auth?.user?.value" to="/account/addresses" class="add-address-btn">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                {{ t('checkout.add_new_address') || 'إضافة عنوان جديد' }}
              </NuxtLink>
            </div>
            
            <div v-if="addresses.length === 0" class="empty-addresses">
              <div class="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <h3 v-if="!auth?.user?.value">{{ t('checkout.login_required') || 'يرجى تسجيل الدخول أولاً' }}</h3>
              <h3 v-else>{{ t('checkout.no_addresses') || 'لا توجد عناوين' }}</h3>
              <p v-if="!auth?.user?.value">{{ t('checkout.login_required_desc') || 'يجب تسجيل الدخول لعرض العناوين المحفوظة' }}</p>
              <p v-else>{{ t('checkout.add_address_desc') || 'يرجى إضافة عنوان تسليم للمتابعة' }}</p>
              <div v-if="!auth?.user?.value" class="auth-actions">
                <span @click="openLoginModal" class="add-address-btn" style="cursor: pointer;">
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 19.2c-2.5 0-7.5 1.25-7.5 3.75V25h15v-2.05c0-2.5-5-3.75-7.5-3.75M12 2a5 5 0 0 0-5 5a5 5 0 0 0 10 0a5 5 0 0 0-5-5Z"/>
                  </svg>
                  {{ t('checkout.login') || 'تسجيل الدخول' }}
                </span>
              </div>
              <div v-else class="address-actions">
                <NuxtLink to="/account/addresses" class="add-address-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  {{ t('checkout.add_address') || 'إضافة عنوان' }}
                </NuxtLink>
              </div>
            </div>
            
            <div v-else class="addresses-list">
              <div 
                v-for="address in addresses" 
                :key="address.id"
                class="address-card"
                :class="{ active: selectedAddress?.id === address.id }"
                @click="selectedAddress = address"
              >
                <div class="address-header">
                  <h3>{{ address.contact_person_name }}</h3>
                  <span class="address-type">{{ address.address_type }}</span>
                </div>
                <div class="address-details">
                  <p>{{ address.address }}</p>
                  <p>{{ address.city }}, {{ address.zip_code }}</p>
                  <p>{{ address.country }}</p>
                </div>
                <div class="address-phone">
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                  {{ address.phone }}
                </div>
              </div>
            </div>
          </section>

          <!-- Payment Method -->
          <section class="section card">
            <div class="section-header">
              <h2>{{ t('checkout.payment_method') || 'طريقة الدفع' }}</h2>
            </div>
            
            <div class="payment-methods">
              <div 
                v-for="method in paymentMethods" 
                :key="method.id"
                class="payment-method"
                :class="{ 
                  active: selectedPaymentMethod === method.id,
                  disabled: !method.available 
                }"
                @click="selectPaymentMethod(method.id)"
              >
                <div class="method-icon">{{ method.icon }}</div>
                <div class="method-info">
                  <h3>{{ method.name }}</h3>
                  <p v-if="!method.available">{{ t('checkout.not_available') || 'غير متوفر حالياً' }}</p>
                </div>
                <div class="method-radio">
                  <div class="radio-button" :class="{ active: selectedPaymentMethod === method.id }"></div>
                </div>
              </div>
            </div>
          </section>

        </div>

        <!-- Order Summary Sidebar -->
        <aside class="order-summary">
          <section class="section card">
            <div class="section-header">
              <h2>{{ t('checkout.order_summary') || 'ملخص الطلب' }}</h2>
            </div>
            
            <!-- Coupon Code -->
            <div class="coupon-section">
              <div class="form-group">
                <label>{{ t('checkout.coupon_code') || 'كود الخصم' }}</label>
                <div class="coupon-input-group">
                  <input 
                    v-model="couponCode"
                    type="text" 
                    class="form-control"
                    :placeholder="t('checkout.coupon_placeholder') || 'أدخل كود الخصم'"
                    :disabled="!!appliedCoupon"
                  />
                  <button 
                    class="apply-coupon-btn"
                    @click="applyCoupon"
                    :disabled="!couponCode.trim() || !!appliedCoupon"
                  >
                    {{ appliedCoupon ? (t('checkout.applied') || 'مطبق') : (t('checkout.apply') || 'تطبيق') }}
                  </button>
                </div>
                <div v-if="appliedCoupon" class="applied-coupon">
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  {{ appliedCoupon.coupon_code }} - {{ t('checkout.discount') || 'خصم' }} {{ money(appliedCoupon.discount_amount) }}
                  <button 
                    class="remove-coupon-btn"
                    @click="removeCoupon"
                    :title="t('checkout.remove_coupon') || 'إزالة الكوبون'"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Order Items -->
            <div class="order-items">
              <h3>{{ t('checkout.order_items') || 'عناصر الطلب' }} ({{ itemsTotal }})</h3>
              <div class="items-list">
                <div v-for="item in items" :key="item.id" class="order-item">
                  <div class="item-image">
                    <img 
                      :src="getProductImage(item)" 
                      :alt="item.product?.name || item.name" 
                      @error="handleImageError"
                    />
                  </div>
                  <div class="item-details">
                    <h4>{{ item.product?.name || item.name }}</h4>
                    
                    <!-- Variant Information -->
                    <div v-if="item.variant_type || item.sku || item.size || item.color" class="item-variant">
                      <span v-if="item.variant_type" class="variant-badge">{{ item.variant_type }}</span>
                      <span v-if="item.sku" class="variant-info">SKU: {{ item.sku }}</span>
                      <span v-if="item.size" class="variant-info">{{ t('checkout.size') || 'الحجم' }}: {{ item.size }}</span>
                      <span v-if="item.color" class="variant-info">{{ t('checkout.color') || 'اللون' }}: {{ item.color }}</span>
                    </div>
                    
                    <p>{{ t('checkout.quantity') || 'الكمية' }}: {{ item.quantity || item.qty }}</p>
                    <p class="item-price">{{ money((item.price || 0) * (item.quantity || item.qty)) }}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Order Totals -->
            <div class="order-totals">
              <div v-if="taxExcluded > 0" class="total-row">
                <span>{{ t('checkout.tax') || 'الضريبة' }}</span>
                <span>{{ money(taxExcluded) }}</span>
              </div>
              <div v-if="shipping > 0" class="total-row">
                <span>{{ t('checkout.shipping') || 'الشحن' }}</span>
                <span>{{ money(shipping) }}</span>
              </div>
              <div v-if="appliedCoupon" class="total-row discount">
                <span>{{ t('checkout.coupon_discount') || 'خصم الكوبون' }} ({{ appliedCoupon.coupon_code }})</span>
                <span>-{{ money(couponDiscount) }}</span>
              </div>
              <div class="total-row grand-total">
                <span>{{ t('checkout.total') || 'الإجمالي' }}</span>
                <span>{{ money(grandTotal) }}</span>
              </div>
            </div>
            
            <!-- Place Order Button -->
            <button 
              class="place-order-btn"
              @click="placeOrder"
              :disabled="placingOrder || !selectedAddress || !selectedPaymentMethod"
            >
              <div v-if="placingOrder" class="loading-spinner"></div>
              <svg v-else width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              {{ placingOrder ? (t('checkout.placing_order') || 'جاري إتمام الطلب...') : (t('checkout.place_order') || 'إتمام الطلب') }}
            </button>
            
            <NuxtLink to="/cart" class="back-to-cart-btn">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              {{ t('checkout.back_to_cart') || 'العودة للسلة' }}
            </NuxtLink>
          </section>
        </aside>
      </div>
    </div>
  </main>

  <!-- Login Modal -->
  <teleport to="body">
    <div v-if="loginModalOpen" class="login-overlay" @click.self="closeLoginModal">
      <div class="login-modal" dir="rtl">
        <div class="login-header">
          <h2>{{ t('login') || 'تسجيل الدخول' }}</h2>
          <button class="close-btn" @click="closeLoginModal">
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
          </button>
        </div>
        
        <!-- OTP Login -->
        <form @submit.prevent="handleOtpLogin" class="login-form">
          <div class="form-group">
            <label for="phone">{{ t('taqnyat.phone') || 'رقم الهاتف' }}</label>
            <input 
              id="phone"
              v-model="otpForm.phone" 
              type="tel" 
              :placeholder="t('taqnyat.phone_placeholder') || '05xxxxxxxx'"
              required
              :disabled="taqnyatAuth.requestingOtp.value || taqnyatAuth.verifyingOtp.value || otpSent"
            />
          </div>
          
          <div v-if="otpSent" class="form-group">
            <label for="otp">{{ t('taqnyat.otp_code') || 'رمز التحقق' }}</label>
            <input 
              id="otp"
              v-model="otpForm.otp" 
              type="text" 
              :placeholder="t('taqnyat.otp_placeholder') || 'أدخل رمز التحقق'"
              required
              maxlength="6"
              :disabled="taqnyatAuth.verifyingOtp.value"
            />
          </div>
          
          <div v-if="taqnyatAuth.error.value" class="error-message">
            {{ taqnyatAuth.error.value }}
          </div>
          
          <div v-if="taqnyatAuth.success.value" class="success-message">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            {{ taqnyatAuth.success.value }}
          </div>
          
          <div v-if="!otpSent">
            <button 
              type="button" 
              class="main-btn" 
              style="width: 100%;" 
              :disabled="taqnyatAuth.requestingOtp.value || !otpForm.phone"
              @click="handleRequestOtp"
            >
              <span v-if="taqnyatAuth.requestingOtp.value">{{ t('loading') || 'جاري التحميل...' }}</span>
              <span v-else>{{ t('taqnyat.send_otp') || 'إرسال رمز التحقق' }}</span>
            </button>
          </div>

          <div v-else>
            <button 
              type="submit" 
              class="main-btn" 
              style="width: 100%;margin-bottom: 10px;" 
              :disabled="taqnyatAuth.verifyingOtp.value || !otpForm.otp"
            >
              <span v-if="taqnyatAuth.verifyingOtp.value">{{ t('loading') || 'جاري التحميل...' }}</span>
              <span v-else>{{ t('taqnyat.verify') || 'التحقق وتسجيل الدخول' }}</span>
            </button>

            <button 
              type="button" 
              class="resend-btn" 
              style="width: 100%;background: transparent;color: #232323;padding: 10px;border-radius: 10px;border: 1px solid #232323;" 
              :disabled="taqnyatAuth.resendingOtp.value || otpCountdown > 0"
              @click="handleResendOtp"
            >
              <span v-if="taqnyatAuth.resendingOtp.value">{{ t('loading') || 'جاري التحميل...' }}</span>
              <span v-else-if="otpCountdown > 0">{{ t('taqnyat.resend_in') || 'إعادة الإرسال خلال' }} {{ otpCountdown }} {{ t('taqnyat.seconds') || 'ثانية' }}</span>
              <span v-else>{{ t('taqnyat.resend_otp') || 'إعادة إرسال رمز التحقق' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
  .checkout-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    padding: 20px 0;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  .section {
    margin-bottom: 24px;
  }

  .card {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid #e2e8f0;
    overflow: hidden;
    position: relative;
  }

  .card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #f58040, #1a1a1a, #2573b6);
    z-index: 1;
  }

  .section-header {
    padding: 24px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 2;
  }

  .section-header h1 {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(135deg, #1e293b, #475569);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
  }

  .section-header h2 {
    font-size: 20px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  /* Progress Steps */
  .checkout-progress {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .progress-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    opacity: 0.5;
    transition: opacity 0.3s ease;
  }

  .progress-step.active {
    opacity: 1;
  }

  .step-number {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #e2e8f0;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
  }

  .progress-step.active .step-number {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
  }

  .step-label {
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
  }

  .progress-step.active .step-label {
    color: #1e293b;
  }

  .progress-line {
    width: 40px;
    height: 2px;
    background: #e2e8f0;
    border-radius: 1px;
  }

  /* Loading State */
  .loading-state {
    text-align: center;
    padding: 60px 24px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .loading-state .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e2e8f0;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
  }

  .loading-state h3 {
    font-size: 20px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  /* Checkout Content */
  .checkout-content {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 24px;
    align-items: start;
  }

  .checkout-main {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  /* Address Selection */
  .add-address-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  }

  .add-address-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.4);
  }

  .empty-addresses {
    text-align: center;
    padding: 40px 24px;
  }

  .empty-icon {
    font-size: 48px;
    color: #cbd5e1;
    margin-bottom: 16px;
  }

  .empty-addresses h3 {
    font-size: 20px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 8px;
  }

  .empty-addresses p {
    color: #64748b;
    margin: 0 0 24px;
  }

  .auth-actions,
  .address-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .addresses-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
  }

  .address-card {
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    background: #fff;
  }

  .address-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1);
  }

  .address-card.active {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
  }

  .address-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .address-header h3 {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .address-type {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
  }

  .address-details p {
    margin: 4px 0;
    color: #64748b;
    line-height: 1.5;
  }

  .address-phone {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    color: #475569;
    font-weight: 500;
  }

  /* Payment Methods */
  .payment-methods {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .payment-method {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    background: #fff;
  }

  .payment-method:hover:not(.disabled) {
    border-color: #3b82f6;
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1);
  }

  .payment-method.active {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
  }

  .payment-method.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .method-icon {
    font-size: 24px;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    border-radius: 12px;
  }

  .method-info {
    flex: 1;
  }

  .method-info h3 {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 4px;
  }

  .method-info p {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }

  .method-radio {
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
    border-color: #3b82f6;
    background: #3b82f6;
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

  /* Form Elements */
  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
  }

  .form-control {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.3s ease;
    background: #fff;
  }

  .form-control:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-control:disabled {
    background: #f8fafc;
    color: #94a3b8;
    cursor: not-allowed;
  }

  /* Coupon Section */
  .coupon-section {
    padding: 24px;
    border-bottom: 1px solid #e2e8f0;
  }

  .coupon-input-group {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .coupon-input-group .form-control {
    flex: 1;
  }

  .apply-coupon-btn {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
  }

  .apply-coupon-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);
  }

  .apply-coupon-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .applied-coupon {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #dcfce7, #bbf7d0);
    color: #166534;
    padding: 8px 12px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 14px;
    position: relative;
  }

  .remove-coupon-btn {
    background: none;
    border: none;
    color: #166534;
    cursor: pointer;
    padding: 10px;
    border-radius: 4px;
    transition: all 0.2s ease;
    margin-left: auto;
    position: absolute;
    inset-inline-end: 0;

  }

  .remove-coupon-btn:hover {
    background: rgba(22, 101, 52, 0.1);
    transform: scale(1.1);
  }

  /* Order Summary */
  .order-summary {
    position: sticky;
    top: 20px;
    height: fit-content;
  }

  .order-items {
    padding: 24px;
    border-bottom: 1px solid #e2e8f0;
  }

  .order-items h3 {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 16px;
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .order-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .item-image {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    overflow: hidden;
    background: #e2e8f0;
  }

  .item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .item-details {
    flex: 1;
  }

  .item-details h4 {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 4px;
    line-height: 1.4;
  }

  .item-details p {
    font-size: 12px;
    color: #64748b;
    margin: 2px 0;
  }

  .item-price {
    font-weight: 600;
    color: #059669;
  }

  /* Item Variant Styles */
  .item-variant {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 4px 0;
  }

  .variant-badge {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
  }

  .variant-info {
    font-size: 10px;
    color: #64748b;
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
  }

  /* Order Totals */
  .order-totals {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
  }

  .total-row.discount {
    color: #059669;
    font-weight: 600;
  }

  .total-row.grand-total {
    border-top: 2px solid #e2e8f0;
    padding-top: 16px;
    margin-top: 8px;
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
  }

  /* Buttons */
  .place-order-btn {
    width: 88%;
    background: linear-gradient(135deg, #059669, #047857);
    color: white;
    border: none;
    padding: 16px 24px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.3);
    margin: 24px;
    position: relative;
    overflow: hidden;
  }

  .place-order-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  .place-order-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 15px -3px rgba(5, 150, 105, 0.4);
  }

  .place-order-btn:hover:not(:disabled)::before {
    left: 100%;
  }

  .place-order-btn:disabled {
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

  .back-to-cart-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: linear-gradient(135deg, #f8fafc, #e2e8f0);
    color: #475569;
    text-decoration: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.3s ease;
    margin: 0 24px 24px;
    border: 1px solid #cbd5e1;
  }

  .back-to-cart-btn:hover {
    background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  /* Animations */
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .checkout-content {
      grid-template-columns: 1fr;
      gap: 20px;
    }
    
    .order-summary {
      position: static;
    }
  }

  @media (max-width: 768px) {
    .container {
      padding: 0 16px;
    }
    
    .section-header {
      padding: 20px;
      flex-direction: column;
      gap: 16px;
      align-items: flex-start;
    }
    
    .checkout-progress {
      width: 100%;
      justify-content: space-between;
    }
    
    .progress-line {
      flex: 1;
      max-width: 40px;
    }
    
    .addresses-list,
    .payment-methods,
    .coupon-section,
    .order-items,
    .order-totals {
      padding: 20px;
    }
    
    .place-order-btn,
    .back-to-cart-btn {
      margin: 20px;
    }
  }

  @media (max-width: 480px) {
    .address-card,
    .payment-method {
      padding: 16px;
      flex-direction: column;
    }
    
    .coupon-input-group {
      flex-direction: column;
    }
    
    .apply-coupon-btn {
      width: 100%;
    }
  }

  /* Login Modal Styles */
  .login-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  }

  .login-modal {
    background: white;
    border-radius: 12px;
    padding: 30px;
    max-width: 400px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }

  .login-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    padding-bottom: 15px;
    border-bottom: 1px solid #eee;
  }

  .login-header h2 {
    margin: 0;
    color: #333;
    font-size: 24px;
    font-weight: 700;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: #f5f5f5;
    color: #333;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group label {
    font-weight: 600;
    color: #333;
    font-size: 14px;
  }

  .form-group input {
    padding: 12px 15px;
    border: 2px solid #e1e1e1;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.2s ease;
    background: #fff;
  }

  .form-group input:focus {
    outline: none;
    border-color: #f58040;
  }

  .form-group input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  .error-message {
    background: #fee;
    color: #c33;
    padding: 10px 15px;
    border-radius: 6px;
    font-size: 14px;
    border: 1px solid #fcc;
  }

  .login-btn {
    background: #f58040;
    color: white;
    border: none;
    padding: 15px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 10px;
  }

  .login-btn:hover:not(:disabled) {
    background: #e67030;
    transform: translateY(-1px);
  }

  .login-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }

  /* RTL Support for Modal */
  [dir="rtl"] .login-modal {
    text-align: right;
  }

  [dir="ltr"] .login-modal {
    text-align: left;
  }
</style>