<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
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
      tabby: 'تابي ',
      tamara: 'تمارا ',
      paymob_visa: ' فيزا / ماستركارد / مدي',
      paymob_apple_pay: ' Apple Pay'
    },
    en: {
      tabby: 'Tabby',
      tamara: 'Tamara ',
      paymob_visa: ' Visa / Mastercard / Mada',
      paymob_apple_pay: ' Apple Pay'
    }
  }
  
  const currentLocale = locale.value || 'ar'
  const localeTranslations = translations[currentLocale as keyof typeof translations] || translations.ar
  
  const methods = [
    { id: 'tabby', name: localeTranslations.tabby, icon: 'https://admin.gotawfeer.com/pays/tabby-badge.png', available: true },
    { id: 'tamara', name: localeTranslations.tamara, icon: 'https://admin.gotawfeer.com/pays/5NSVd6hEkYhZvqdeEv3q5A760qtKEFUh4Na1ezMD.png', available: true },
    { id: 'paymob_visa', name: localeTranslations.paymob_visa, icon: 'https://admin.gotawfeer.com/pays/tap-pay.png', available: true, integration_id: 9985 },
    { id: 'paymob_apple_pay', name: localeTranslations.paymob_apple_pay, icon: 'https://admin.gotawfeer.com/pays/apple-pay.png', available: true, integration_id: 9984 }
  ]
  
  return methods
})
// Addresses
const addresses = ref<any[]>([])

// Address Form Modal State
const showAddressModal = ref(false)
const addressFormLoading = ref(false)
const addressFormError = ref('')
const addressForm = ref({
  address_type: 'home',
  contact_person_name: '',
  contact_person_number: '',
  phone: '',
  address: '',
  city: '',
  zip: '55555',
  country: 'Saudi Arabia',
  latitude: '24.7136',
  longitude: '46.6753',
  is_billing: 1
})

// Map state for address modal
const mapContainer = ref<HTMLElement | null>(null)
const map = ref<any>(null)
const marker = ref<any>(null)
const mapInitialized = ref(false)
const searchQuery = ref('')
const searching = ref(false)
const searchResults = ref<any[]>([])
const showSearchResults = ref(false)

// Open address modal
const openAddressModal = () => {
  addressForm.value = {
    address_type: 'home',
    contact_person_name: auth?.user?.value?.name || '',
    contact_person_number: auth?.user?.value?.phone || '',
    phone: auth?.user?.value?.phone || '',
    address: '',
    city: '',
    zip: '55555',
    country: 'Saudi Arabia',
    latitude: '24.7136',
    longitude: '46.6753',
    is_billing: 1
  }
  addressFormError.value = ''
  showAddressModal.value = true
  // Initialize map after modal opens
  nextTick(() => {
    setTimeout(() => initMap(), 100)
  })
}

// Close address modal
const closeAddressModal = () => {
  showAddressModal.value = false
  addressFormError.value = ''
  if (map.value) {
    map.value.remove()
    map.value = null
    marker.value = null
    mapInitialized.value = false
  }
}

// Initialize map
const initMap = async () => {
  if (!process.client || mapInitialized.value || !mapContainer.value) return
  
  try {
    const leafletModule = await import('leaflet')
    const L = (leafletModule as any).default || leafletModule
    
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
    
    if (process.client && !document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    
    const lat = parseFloat(addressForm.value.latitude) || 24.7136
    const lng = parseFloat(addressForm.value.longitude) || 46.6753
    
    map.value = L.map(mapContainer.value, { center: [lat, lng], zoom: 13 })
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map.value)
    
    marker.value = L.marker([lat, lng], { draggable: true }).addTo(map.value)
    
    marker.value.on('dragend', (e: any) => {
      const position = e.target.getLatLng()
      addressForm.value.latitude = position.lat.toFixed(6)
      addressForm.value.longitude = position.lng.toFixed(6)
    })
    
    map.value.on('click', (e: any) => {
      const { lat, lng } = e.latlng
      addressForm.value.latitude = lat.toFixed(6)
      addressForm.value.longitude = lng.toFixed(6)
      if (marker.value) {
        marker.value.setLatLng([lat, lng])
      }
    })
    
    mapInitialized.value = true
    setTimeout(() => { if (map.value) map.value.invalidateSize() }, 300)
  } catch (error) {
    console.error('Error initializing map:', error)
  }
}

// Search location on map
const searchLocation = async () => {
  if (!searchQuery.value.trim() || !map.value) return
  
  searching.value = true
  searchResults.value = []
  showSearchResults.value = false
  
  try {
    const query = encodeURIComponent(searchQuery.value.trim())
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5&addressdetails=1&accept-language=ar,en`)
    const data = await response.json()
    
    if (Array.isArray(data) && data.length > 0) {
      searchResults.value = data
      showSearchResults.value = true
    } else {
      addressFormError.value = 'لم يتم العثور على نتائج'
    }
  } catch (error) {
    console.error('Error searching location:', error)
    addressFormError.value = 'حدث خطأ أثناء البحث'
  } finally {
    searching.value = false
  }
}

// Select search result
const selectSearchResult = (result: any) => {
  const lat = parseFloat(result.lat)
  const lng = parseFloat(result.lon)
  
  if (!isNaN(lat) && !isNaN(lng)) {
    addressForm.value.latitude = lat.toFixed(6)
    addressForm.value.longitude = lng.toFixed(6)
    
    if (map.value) {
      map.value.setView([lat, lng], 15)
      if (marker.value) marker.value.setLatLng([lat, lng])
    }
    
    const address = result.address || {}
    if (address.road || address.street) {
      addressForm.value.address = (address.road || address.street || '') + (address.house_number ? ` ${address.house_number}` : '')
    }
    if (address.city || address.town || address.village) {
      addressForm.value.city = address.city || address.town || address.village || ''
    }
    
    searchQuery.value = ''
    searchResults.value = []
    showSearchResults.value = false
  }
}

// Get current location
const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    addressFormError.value = 'المتصفح لا يدعم تحديد الموقع'
    return
  }
  
  searching.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      addressForm.value.latitude = lat.toFixed(6)
      addressForm.value.longitude = lng.toFixed(6)
      if (map.value) {
        map.value.setView([lat, lng], 15)
        if (marker.value) marker.value.setLatLng([lat, lng])
      }
      searching.value = false
    },
    (error) => {
      console.error('Geolocation error:', error)
      addressFormError.value = 'فشل في تحديد موقعك الحالي'
      searching.value = false
    }
  )
}

// Submit address form
const submitAddress = async () => {
  addressFormLoading.value = true
  addressFormError.value = ''

  try {
    const formData = {
      address_type: addressForm.value.address_type,
      contact_person_name: addressForm.value.contact_person_name,
      contact_person_number: addressForm.value.phone,
      address: addressForm.value.address,
      city: addressForm.value.city,
      zip: addressForm.value.zip,
      country: addressForm.value.country,
      phone: addressForm.value.phone,
      latitude: addressForm.value.latitude || '24.7136',
      longitude: addressForm.value.longitude || '46.6753',
      is_billing: 1
    }

    await $post('v1/customer/address/add', formData)
    closeAddressModal()
    await loadAddresses()
    
    // Auto-select the newly added address
    if (addresses.value.length > 0) {
      selectedAddress.value = addresses.value[addresses.value.length - 1]
    }
  } catch (err: any) {
    console.error('Error saving address:', err)
    addressFormError.value = err?.data?.message || 'خطأ في حفظ العنوان'
  } finally {
    addressFormLoading.value = false
  }
}

// Computed
const items = computed(() => cart.items.value || [])
const itemsTotal = computed(() => items.value.reduce((s: number, it: any) => s + Number(it?.quantity || it?.qty || 0), 0))
const subtotal = computed(() => items.value.reduce((s: number, it: any) => s + (Number(it?.price || 0) * Number(it?.quantity || it?.qty || 0)), 0))
const discountTotal = computed(() => items.value.reduce((s: number, it: any) => s + (Number(it?.discount || 0) * Number(it?.quantity || it?.qty || 0)), 0))
const subtotalAfterDiscount = computed(() => Math.max(0, subtotal.value - discountTotal.value))
const taxExcluded = computed(() => items.value.reduce((s: number, it: any) => s + (it?.tax_model === 'exclude' ? Number(it?.tax || 0) * Number(it?.quantity || it?.qty || 0) : 0), 0))
// Shipping cost based on order value:
// - Less than 100 SAR: 30 SAR
// - 100 to less than 200 SAR: 25 SAR
// - 200 to less than 299 SAR: 25 SAR
// - 299 SAR and above: Free shipping
const FREE_SHIPPING_THRESHOLD = 299
const shipping = computed(() => {
  if (items.value.length === 0) return 0
  const orderValue = subtotalAfterDiscount.value
  if (orderValue >= FREE_SHIPPING_THRESHOLD) return 0
  if (orderValue >= 100 && orderValue < 299) return 25
  return 30 // Less than 100 SAR
})

// Coupon discount
const couponDiscount = computed(() => {
  if (appliedCoupon.value && appliedCoupon.value.discount_amount) {
    return Number(appliedCoupon.value.discount_amount)
  }
  return 0
})

// Payment method fees (8% for Tamara and Tabby)
const PAYMENT_FEE_PERCENTAGE = 0.08
const paymentMethodFee = computed(() => {
  if (selectedPaymentMethod.value === 'tamara' || selectedPaymentMethod.value === 'tabby') {
    const baseTotal = subtotalAfterDiscount.value + taxExcluded.value + shipping.value - couponDiscount.value
    return Math.round(baseTotal * PAYMENT_FEE_PERCENTAGE * 100) / 100 // Round to 2 decimal places
  }
  return 0
})

const grandTotal = computed(() => {
  const baseTotal = subtotalAfterDiscount.value + taxExcluded.value + shipping.value
  return Math.max(0, baseTotal - couponDiscount.value + paymentMethodFee.value)
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

// Calculate item price after discount
function getItemPriceAfterDiscount(item: any): number {
  const price = Number(item?.price || 0)
  const discount = Number(item?.discount || 0)
  const quantity = Number(item?.quantity || item?.qty || 1)
  
  // Calculate price per unit after discount
  const priceAfterDiscount = Math.max(0, price - discount)
  
  // Return total price for the quantity
  return priceAfterDiscount * quantity
}

// Check if item has discount
function hasItemDiscount(item: any): boolean {
  const discount = Number(item?.discount || 0)
  return discount > 0
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
    if (auth?.user?.value?.id) {
      requestData.is_authenticated = true
      requestData.user_id = Number(auth.user.value.id)
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

    const totals = {
      subtotal: Number(subtotalAfterDiscount.value.toFixed(2)),
      tax_amount: Number(taxExcluded.value.toFixed(2)),
      shipping_amount: Number(shipping.value.toFixed(2)),
      discount_amount: Number(couponDiscount.value.toFixed(2)),
      payment_fee: Number(paymentMethodFee.value.toFixed(2)),
      total_amount: Number(grandTotal.value.toFixed(2))
    }

    const customerName = auth?.user?.value?.name || selectedAddress.value?.contact_person_name || ''
    const customerEmail = auth?.user?.value?.email || ''
    const customerPhone = selectedAddress.value?.phone
      || selectedAddress.value?.contact_person_number
      || auth?.user?.value?.phone
      || ''
    const shippingAddress = {
      address: selectedAddress.value?.address || '',
      city: selectedAddress.value?.city || '',
      zip_code: selectedAddress.value?.zip_code || selectedAddress.value?.zip || '',
      country: selectedAddress.value?.country || 'Saudi Arabia',
      latitude: selectedAddress.value?.latitude || '',
      longitude: selectedAddress.value?.longitude || '',
      address_type: selectedAddress.value?.address_type || 'home',
      contact_person_name: selectedAddress.value?.contact_person_name || customerName,
      contact_person_number: customerPhone
    }

    const orderData: any = {
      address_id: selectedAddress.value.id,
      payment_method: selectedPaymentMethod.value,
      coupon_code: appliedCoupon.value?.coupon_code || '',
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      shipping_amount: totals.shipping_amount,
      discount_amount: totals.discount_amount,
      payment_fee: totals.payment_fee,
      total_amount: totals.total_amount,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_id: auth?.user?.value?.id || null,
      shipping_address: shippingAddress
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
        if (auth?.user?.value?.id) {
          requestData.is_authenticated = true
          requestData.user_id = Number(auth.user.value.id)
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
              <span v-if="auth?.user?.value" @click="openAddressModal" class="add-address-btn" style="cursor: pointer;">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                {{ t('checkout.add_new_address') || 'إضافة عنوان جديد' }}
              </span>
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
                <span @click="openAddressModal" class="add-address-btn" style="cursor: pointer;">
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  {{ t('checkout.add_address') || 'إضافة عنوان' }}
                </span>
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
                <div class="method-icon">
                  <img :src="method.icon" :alt="method.name" />
                </div>
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
                    <div class="item-price">
                      <template v-if="hasItemDiscount(item)">
                        <span class="price-after-discount">{{ money(getItemPriceAfterDiscount(item)) }}</span>
                        <span class="price-original">{{ money((item.price || 0) * (item.quantity || item.qty)) }}</span>
                      </template>
                      <template v-else>
                        <span class="price-normal">{{ money((item.price || 0) * (item.quantity || item.qty)) }}</span>
                      </template>
                    </div>
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
              <div v-if="paymentMethodFee > 0" class="total-row payment-fee">
                <span>{{ t('checkout.payment_fee') || 'رسوم شركة التقسيط' }} (8%)</span>
                <span>{{ money(paymentMethodFee) }}</span>
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

  <!-- Address Modal -->
  <teleport to="body">
    <div v-if="showAddressModal" class="address-modal-overlay" @click.self="closeAddressModal">
      <div class="address-modal" dir="rtl">
        <div class="modal-header">
          <h2>إضافة عنوان جديد</h2>
          <button class="close-btn" @click="closeAddressModal">
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
          </button>
        </div>
        
        <form @submit.prevent="submitAddress" class="address-form">
          <div class="form-row">
            <div class="form-group" style="grid-column: span 2;">
              <label>اسم المستلم</label>
              <input v-model="addressForm.contact_person_name" type="text" required :disabled="addressFormLoading" placeholder="اسم المستلم" />
            </div>
          </div>

          <div class="form-group">
            <label>العنوان التفصيلي</label>
            <input v-model="addressForm.address" type="text" required :disabled="addressFormLoading" placeholder="الشارع، الحي، رقم المبنى" />
          </div>

          <div class="form-group">
            <label>المدينة</label>
            <input v-model="addressForm.city" type="text" required :disabled="addressFormLoading" placeholder="المدينة" />
          </div>

          <!-- Map Section -->
          <ClientOnly>
            <div class="form-group">
              <label>تحديد الموقع على الخريطة</label>
              <p class="map-instructions">ابحث عن موقعك أو انقر على الخريطة</p>
              
              <div class="map-search-container">
                <div class="search-input-wrapper">
                  <input
                    v-model="searchQuery"
                    type="text"
                    class="map-search-input"
                    placeholder="ابحث عن عنوان..."
                    @keyup.enter="searchLocation"
                    :disabled="addressFormLoading || searching"
                  />
                  <button type="button" @click="searchLocation" class="search-btn" :disabled="addressFormLoading || searching || !searchQuery.trim()">
                    <svg v-if="!searching" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                    <div v-else class="search-spinner"></div>
                  </button>
                  <button type="button" @click="getCurrentLocation" class="location-btn" :disabled="addressFormLoading || searching" title="تحديد موقعي">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                    </svg>
                  </button>
                </div>
                
                <div v-if="showSearchResults && searchResults.length > 0" class="search-results">
                  <div v-for="(result, index) in searchResults" :key="index" class="search-result-item" @click="selectSearchResult(result)">
                    <span class="result-icon">📍</span>
                    <span class="result-name">{{ result.display_name }}</span>
                  </div>
                </div>
              </div>
              
              <div ref="mapContainer" class="map-container"></div>
            </div>
          </ClientOnly>

          <div v-if="addressFormError" class="error-message">{{ addressFormError }}</div>

          <div class="form-actions">
            <button type="button" @click="closeAddressModal" class="cancel-btn" :disabled="addressFormLoading">إلغاء</button>
            <button type="submit" class="submit-btn" :disabled="addressFormLoading">
              <span v-if="addressFormLoading">جاري الحفظ...</span>
              <span v-else>إضافة العنوان</span>
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
    
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
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
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .item-price .price-after-discount {
    color: #059669;
    font-weight: 700;
    font-size: 1.1em;
  }
  .item-price .price-original {
    color: #9ca3af;
    text-decoration: line-through;
    font-size: 0.9em;
    font-weight: 400;
  }
  .item-price .price-normal {
    color: #059669;
    font-weight: 600;
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

  /* Address Modal Styles */
  .address-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  }

  .address-modal {
    background: #fff;
    border-radius: 16px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  .address-modal .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
    background: #fff;
    z-index: 10;
  }

  .address-modal .modal-header h2 {
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .address-modal .close-btn {
    background: #f3f4f6;
    border: none;
    border-radius: 8px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #6b7280;
    transition: all 0.2s;
  }

  .address-modal .close-btn:hover {
    background: #ef4444;
    color: white;
  }

  .address-form {
    padding: 24px;
  }

  .address-form .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .address-form .form-group {
    margin-bottom: 16px;
  }

  .address-form label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 6px;
  }

  .address-form input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.2s;
    box-sizing: border-box;
  }

  .address-form input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .address-form input:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }

  .map-instructions {
    font-size: 12px;
    color: #6b7280;
    margin: 0 0 12px;
  }

  .map-search-container {
    position: relative;
    margin-bottom: 12px;
  }

  .search-input-wrapper {
    display: flex;
    gap: 8px;
  }

  .map-search-input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
  }

  .search-btn, .location-btn {
    background: #3b82f6;
    border: none;
    border-radius: 8px;
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;
    transition: all 0.2s;
  }

  .search-btn:hover, .location-btn:hover {
    background: #2563eb;
  }

  .search-btn:disabled, .location-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .location-btn {
    background: #10b981;
  }

  .location-btn:hover {
    background: #059669;
  }

  .search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    max-height: 200px;
    overflow-y: auto;
    z-index: 9999;
  }

  .search-result-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    cursor: pointer;
    transition: background 0.2s;
    border-bottom: 1px solid #f3f4f6;
  }

  .search-result-item:hover {
    background: #f3f4f6;
  }

  .search-result-item:last-child {
    border-bottom: none;
  }

  .result-icon {
    font-size: 16px;
  }

  .result-name {
    font-size: 13px;
    color: #374151;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .map-container {
    height: 250px;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    overflow: hidden;
  }

  .search-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .address-form .error-message {
    background: #fef2f2;
    color: #dc2626;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    margin-bottom: 16px;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .cancel-btn {
    padding: 12px 24px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-btn:hover:not(:disabled) {
    background: #e5e7eb;
  }

  .submit-btn {
    padding: 12px 24px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .submit-btn:disabled, .cancel-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .address-form .form-row {
      grid-template-columns: 1fr;
    }

    .address-modal {
      max-height: 95vh;
    }

    .form-actions {
      flex-direction: column-reverse;
    }

    .cancel-btn, .submit-btn {
      width: 100%;
    }
  }
</style>