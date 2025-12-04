<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const auth = useAuth()
const { $get } = useApi()
const config = useRuntimeConfig()

// Protect page - redirect if not authenticated
if (process.client) {
  // Check authentication on client side
  if (!auth?.user?.value && !auth?.token?.value) {
    // User is not authenticated, redirect to home page
    navigateTo('/')
  }
}

// Success message state
const logoutSuccess = ref(false)

// Toast message state
const showToastMessage = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

// Helper function to get correct image URL
function getImageUrl(imagePath: string | undefined, fallback: string = '/images/placeholder.png'): string {
  console.log('getImageUrl called with:', imagePath)
  
  if (!imagePath) {
    console.log('No image path, using fallback:', fallback)
    return fallback
  }
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    console.log('Full URL detected, returning as is:', imagePath)
    return imagePath
  }
  
  // If it's a relative path, build the full URL
  const baseURL = config?.public?.baseURL || 'https://gotawfeer.com/project'
  console.log('Base URL:', baseURL)
  
  // Handle different image path formats
  let finalUrl = ''
  if (imagePath.includes('storage/product/thumbnail/')) {
    finalUrl = `${baseURL}/storage/product/thumbnail/${imagePath.split('/').pop()}`
  } else if (imagePath.includes('storage/product/')) {
    finalUrl = `${baseURL}/storage/product/${imagePath.split('/').pop()}`
  } else if (imagePath.startsWith('storage/')) {
    finalUrl = `${baseURL}/${imagePath}`
  } else if (imagePath.includes('customer/')) {
    // Handle customer profile images
    finalUrl = `${baseURL}/storage/customer/${imagePath.split('/').pop()}`
  } else {
    // Default to customer profile images
    finalUrl = `${baseURL}/storage/customer/${imagePath}`
  }
  
  console.log('Final image URL:', finalUrl)
  return finalUrl
}

// Handle image load errors
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0MFY0MEgyMFYyMFoiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTI1IDI1SDM1VjM1SDI1VjI1WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'
}

// Get route to handle tab from URL
const route = useRoute()

// Active tab - check URL params first
const activeTab = ref(route.query.tab as string || 'profile')

// Selected order for details
const selectedOrderId = ref<string | null>(null)

// Get selected order details
const selectedOrder = computed(() => {
  if (!selectedOrderId.value) return null
  return orders.value.find(order => order.id === selectedOrderId.value)
})

// Watch user image changes - moved after user definition

// Watch for URL changes to update active tab
watch(() => route.query.tab, (newTab) => {
  if (newTab && typeof newTab === 'string') {
    activeTab.value = newTab
  }
})

// User data
const user = ref({
  id: null,
  f_name: '',
  l_name: '',
  email: '',
  phone: '',
  image: '',
  created_at: ''
})

// Watch user image changes
watch(() => user.value.image, (newImage) => {
  console.log('User image changed to:', newImage)
  if (newImage && typeof newImage === 'string') {
    console.log('Generated image URL:', getImageUrl(newImage))
  }
})

// Profile form
const profileForm = ref({
  f_name: '',
  l_name: '',
  email: '',
  phone: '',
  image: null as File | null
})

const profileLoading = ref(false)
const profileError = ref('')
const profileSuccess = ref('')

// Orders data
interface OrderItem {
  id: string
  product_id: string
  qty: number
  price: number
  product?: {
    name: string
    thumbnail: string
  }
}

interface Order {
  id: string
  order_status: string
  created_at: string
  order_amount: number
  details: OrderItem[]
}

const orders = ref<Order[]>([])
const ordersLoading = ref(false)
const ordersError = ref('')

// Wishlist data
interface WishlistItem {
  id: string
  product_id: string
  created_at: string
  productFullInfo?: {
    id?: string
    name?: string
    product_name?: string
    thumbnail?: string
    image?: string
    brand?: {
      name: string
    }
    unit_price?: number
    discount?: number
    current_stock?: number
    reviews_avg_rating?: number
    reviews_count?: number
    slug?: string
  }
}

const wishlist = ref<WishlistItem[]>([])
const wishlistLoading = ref(false)
const wishlistError = ref('')

// Addresses data
interface Address {
  id: string
  address_type: string
  contact_person_name: string
  contact_person_number: string
  phone?: string
  address: string
  city: string
  zip: string
  country: string
  latitude?: string | number
  longitude?: string | number
  is_billing?: number
}

const addresses = ref<Address[]>([])
const addressesLoading = ref(false)
const addressesError = ref('')

// Address form
const showAddressForm = ref(false)
const editingAddress = ref<Address | null>(null)
const addressForm = ref({
  contact_person_name: '',
  contact_person_number: '',
  phone: '', // Required field
  address: '',
  city: ''
})

const addressFormLoading = ref(false)
const addressFormError = ref('')

// Support tickets data
interface SupportTicket {
  id: string
  subject: string
  type: string
  priority: string
  status: string
  description: string
  created_at: string
  updated_at: string
}

const supportTickets = ref<SupportTicket[]>([])
const supportLoading = ref(false)
const supportError = ref('')

// Support form
const showSupportForm = ref(false)
const supportForm = ref({
  subject: '',
  type: 'general',
  priority: 'medium',
  description: '',
  attachments: null as FileList | null
})

const supportFormLoading = ref(false)
const supportFormError = ref('')

// Coupons data
interface Coupon {
  id: string
  code: string
  coupon_type: string
  discount: number
  min_purchase: number
  max_discount: number
  expire_date: string
  status: number
}

const myCoupons = ref<Coupon[]>([])
const availableCoupons = ref<Coupon[]>([])
const couponsLoading = ref(false)
const couponsError = ref('')

// Coupon form
const showCouponForm = ref(false)
const couponForm = ref({
  code: ''
})

const couponFormLoading = ref(false)
const couponFormError = ref('')
const couponFormSuccess = ref('')

// Restock requests data
interface RestockRequest {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  product_image: string
  message: string
  status: string
  created_at: string
}

const restockRequests = ref<RestockRequest[]>([])
const restockLoading = ref(false)
const restockError = ref('')

// Tracking data
interface TrackingResult {
  order_id: string
  status: string
  created_at: string
  order_amount: number
  delivery_man?: {
    name: string
    phone: string
  }
  tracking_history: Array<{
    status_name: string
    description: string
    created_at: string
    is_current: boolean
    is_completed: boolean
  }>
  order_items: Array<{
    id: string
    product_name: string
    product_image: string
    quantity: number
    price: number
  }>
}

const trackingForm = ref({
  searchTerm: '',
  searchType: 'order_id' as 'order_id' | 'phone'
})

const trackingResult = ref<TrackingResult | null>(null)
const trackingLoading = ref(false)
const trackingError = ref('')

// Load user data
const loadUserData = async () => {
  try {
    const { $get } = useApi()
    const userData = await $get('v1/customer/info')
    console.log('User data from API:', userData)
    console.log('User image:', userData.image)
    user.value = userData
    profileForm.value = {
      f_name: userData.f_name || '',
      l_name: userData.l_name || '',
      email: userData.email || '',
      phone: userData.phone || '',
      image: null
    }
  } catch (error) {
    console.error('Error loading user data:', error)
  }
}

// Update profile
const updateProfile = async () => {
  profileLoading.value = true
  profileError.value = ''
  profileSuccess.value = ''

  try {
    const { $put } = useApi()
    const response = await $put('v1/customer/update-profile', profileForm.value)
    
    if (response) {
      profileSuccess.value = 'تم تحديث الملف الشخصي بنجاح'
      await loadUserData()
    }
  } catch (error: any) {
    console.error('Profile update error:', error)
    profileError.value = error?.data?.message || 'خطأ في تحديث الملف الشخصي'
  } finally {
    profileLoading.value = false
  }
}

// Load orders
const loadOrders = async () => {
  ordersLoading.value = true
  ordersError.value = ''

  try {
    const { $get } = useApi()
    const response = await $get('v1/customer/order/list')
    orders.value = response?.orders || []
  } catch (error: any) {
    console.error('Error loading orders:', error)
    ordersError.value = error?.data?.message || 'خطأ في تحميل الطلبات'
  } finally {
    ordersLoading.value = false
  }
}

// Order status mapping
const getOrderStatus = (status: string) => {
  const statusMap: Record<string, { name: string; color: string }> = {
    pending: { name: t('account.orders.status.pending'), color: '#f59e0b' },
    confirmed: { name: t('account.orders.status.confirmed'), color: '#3b82f6' },
    processing: { name: t('account.orders.status.processing'), color: '#8b5cf6' },
    out_for_delivery: { name: t('account.orders.status.out_for_delivery'), color: '#06b6d4' },
    delivered: { name: t('account.orders.status.delivered'), color: '#10b981' },
    canceled: { name: t('account.orders.status.canceled'), color: '#ef4444' },
    failed: { name: t('account.orders.status.failed'), color: '#ef4444' },
    returned: { name: t('account.orders.status.returned'), color: '#6b7280' }
  }
  return statusMap[status] || { name: status, color: '#6b7280' }
}

// Format date
const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// Format currency
const formatCurrency = (amount: number) => {
  if (!amount || isNaN(amount)) return '0 ر.س'
  return `${amount.toLocaleString()} ر.س`
}

// Check if order can be reordered
const canReorder = (order: any) => {
  return order.order_status === 'delivered' || order.order_status === 'canceled'
}

// View order details
const viewOrderDetails = (orderId: string) => {
  console.log('View order details:', orderId)
  selectedOrderId.value = orderId
  activeTab.value = 'orders'
}

// Reorder items
const reorderItems = async (order: any) => {
  try {
    const { $post } = useApi()
    await $post('v1/customer/order/again', { order_id: order.id })
    // Show success message or redirect to cart
    console.log('Items added to cart for reorder')
  } catch (error: any) {
    console.error('Error reordering items:', error)
  }
}

// Load wishlist
const loadWishlist = async () => {
  wishlistLoading.value = true
  wishlistError.value = ''

  try {
    const { $get } = useApi()
    const response = await $get('v1/customer/wish-list/')
    wishlist.value = response || []
  } catch (error: any) {
    console.error('Error loading wishlist:', error)
    wishlistError.value = error?.data?.message || 'خطأ في تحميل قائمة الرغبات'
  } finally {
    wishlistLoading.value = false
  }
}

// Remove from wishlist
const removeFromWishlist = async (productId: string) => {
  try {
    wishlistLoading.value = true
    
    console.log('Removing from wishlist:', productId)
    console.log('User authenticated:', !!auth.user.value)
    
    // Check if user is authenticated
    if (!auth.user.value) {
      alert('يجب تسجيل الدخول أولاً')
      return
    }
    
    // Use DELETE method with product_id in body
    const { $del } = useApi()
    const response = await $del('v1/customer/wish-list/remove', {
      product_id: productId
    })
    
    console.log('Remove response:', response)
    
    // Update local wishlist state
    const initialLength = wishlist.value.length
    wishlist.value = wishlist.value.filter(item => item.product_id !== productId)
    
    console.log('Wishlist updated:', {
      initialLength,
      newLength: wishlist.value.length,
      removed: initialLength > wishlist.value.length
    })
    
    // Show success message
    if (initialLength > wishlist.value.length) {
      console.log('Item successfully removed from wishlist')
    }
    
  } catch (error: any) {
    console.error('Error removing from wishlist:', error)
    
    // Check if it's an authentication error
    if (error?.status === 401 || error?.statusCode === 401) {
      alert('يجب تسجيل الدخول أولاً')
    } else if (error?.data?.errors) {
      console.error('Validation errors:', error.data.errors)
      alert('خطأ في البيانات المرسلة')
    } else {
      alert('حدث خطأ في إزالة المنتج من المفضلة')
    }
  } finally {
    wishlistLoading.value = false
  }
}

// Add to cart
const addToCart = async (product: any) => {
  try {
    const { $post } = useApi()
    await $post('v1/cart/add', {
      product_id: product.id || product.product_id,
      quantity: 1
    })
    
    // Show success message or handle cart update
    console.log('Added to cart:', product.name)
  } catch (error: any) {
    console.error('Error adding to cart:', error)
  }
}

// Load addresses
const loadAddresses = async () => {
  addressesLoading.value = true
  addressesError.value = ''

  try {
    const { $get } = useApi()
    const response = await $get('v1/customer/address/list')
    addresses.value = response || []
  } catch (error: any) {
    console.error('Error loading addresses:', error)
    addressesError.value = error?.data?.message || 'خطأ في تحميل العناوين'
  } finally {
    addressesLoading.value = false
  }
}

// Open address form
const openAddressForm = () => {
  editingAddress.value = null
  addressForm.value = {
    contact_person_name: '',
    contact_person_number: '',
    phone: '', // Required field
    address: '',
    city: ''
  }
  addressFormError.value = ''
  showAddressForm.value = true
}

// Edit address
const editAddress = (address: Address) => {
  editingAddress.value = address
  addressForm.value = {
    contact_person_name: address.contact_person_name || '',
    contact_person_number: address.contact_person_number || '',
    phone: address.phone || address.contact_person_number || '', // Use phone or fallback to contact_person_number
    address: address.address || '',
    city: address.city || ''
  }
  addressFormError.value = ''
  showAddressForm.value = true
}

// Close address form
const closeAddressForm = () => {
  showAddressForm.value = false
  editingAddress.value = null
  addressFormError.value = ''
}

// Save address
const saveAddress = async () => {
  addressFormLoading.value = true
  addressFormError.value = ''

  try {
    const { $post, $put } = useApi()
    
    // Prepare form data with required fields - ensure all required fields are present
    const formData = {
      address_type: 'home', // Default value
      contact_person_name: addressForm.value.contact_person_name,
      contact_person_number: addressForm.value.contact_person_number,
      address: addressForm.value.address,
      city: addressForm.value.city,
      zip: '', // Default empty
      country: 'Saudi Arabia', // Default value
      // Required fields with fallbacks - ensure they are not empty
      phone: addressForm.value.phone || addressForm.value.contact_person_number || '',
      latitude: '24.7136', // Default Riyadh coordinates
      longitude: '46.6753', // Default Riyadh coordinates
      is_billing: 1 // Default value
    }

    console.log('Sending address form data:', formData) // Debug log
    
    if (editingAddress.value) {
      // Update existing address
      await $put('v1/customer/address/update', {
        id: editingAddress.value.id,
        ...formData
      })
    } else {
      // Add new address
      await $post('v1/customer/address/add', formData)
    }
    
    await loadAddresses()
    closeAddressForm()
  } catch (error: any) {
    console.error('Error saving address:', error)
    addressFormError.value = error?.data?.message || 'خطأ في حفظ العنوان'
  } finally {
    addressFormLoading.value = false
  }
}

// Delete address
const deleteAddress = async (addressId: string) => {
  if (!confirm('هل أنت متأكد من حذف هذا العنوان؟')) return

  try {
    const { $del } = useApi()
    await $del('v1/customer/address', { id: addressId })
    await loadAddresses()
  } catch (error: any) {
    console.error('Error deleting address:', error)
  }
}

// Get address type name
const getAddressTypeName = (type: string) => {
  const types: Record<string, string> = {
    home: t('account.addresses.type.home'),
    work: t('account.addresses.type.work'),
    other: t('account.addresses.type.other')
  }
  return types[type] || type
}

// Load support tickets
const loadSupportTickets = async () => {
  supportLoading.value = true
  supportError.value = ''

  try {
    const { $get } = useApi()
    const response = await $get('v1/customer/support-ticket/get')
    supportTickets.value = response || []
  } catch (error: any) {
    console.error('Error loading support tickets:', error)
    supportError.value = error?.data?.message || 'خطأ في تحميل تذاكر الدعم'
  } finally {
    supportLoading.value = false
  }
}

// Open support form
const openSupportForm = () => {
  supportForm.value = {
    subject: '',
    type: 'general',
    priority: 'medium',
    description: '',
    attachments: null
  }
  supportFormError.value = ''
  showSupportForm.value = true
}

// Close support form
const closeSupportForm = () => {
  showSupportForm.value = false
  supportFormError.value = ''
}

// Create support ticket
const createSupportTicket = async () => {
  supportFormLoading.value = true
  supportFormError.value = ''

  try {
    const { $post } = useApi()
    const formData = new FormData()
    
    formData.append('subject', supportForm.value.subject)
    formData.append('type', supportForm.value.type)
    formData.append('priority', supportForm.value.priority)
    formData.append('description', supportForm.value.description)
    
    if (supportForm.value.attachments) {
      for (let i = 0; i < supportForm.value.attachments.length; i++) {
        formData.append('image[]', supportForm.value.attachments[i])
      }
    }

    await $post('v1/customer/support-ticket/create', formData)
    await loadSupportTickets()
    closeSupportForm()
  } catch (error: any) {
    console.error('Error creating support ticket:', error)
    supportFormError.value = error?.data?.message || 'خطأ في إنشاء تذكرة الدعم'
  } finally {
    supportFormLoading.value = false
  }
}

// View ticket details
const viewTicket = (ticketId: string) => {
  // Navigate to ticket details or show modal
  console.log('View ticket:', ticketId)
}

// Close ticket
const closeTicket = async (ticketId: string) => {
  if (!confirm('هل أنت متأكد من إغلاق هذه التذكرة؟')) return

  try {
    const { $get } = useApi()
    await $get(`v1/customer/support-ticket/close/${ticketId}`)
    await loadSupportTickets()
  } catch (error: any) {
    console.error('Error closing ticket:', error)
  }
}

// Get ticket status name
const getTicketStatusName = (status: string) => {
  const statuses: Record<string, string> = {
    open: t('account.support.status.open'),
    closed: t('account.support.status.closed'),
    pending: t('account.support.status.pending'),
    resolved: t('account.support.status.resolved')
  }
  return statuses[status] || status
}

// Get ticket type name
const getTicketTypeName = (type: string) => {
  const types: Record<string, string> = {
    general: t('account.support.type_options.general'),
    technical: t('account.support.type_options.technical'),
    order: t('account.support.type_options.order'),
    refund: t('account.support.type_options.refund'),
    other: t('account.support.type_options.other')
  }
  return types[type] || type
}

// Get priority name
const getPriorityName = (priority: string) => {
  const priorities: Record<string, string> = {
    low: t('account.support.priority_options.low'),
    medium: t('account.support.priority_options.medium'),
    high: t('account.support.priority_options.high'),
    urgent: t('account.support.priority_options.urgent')
  }
  return priorities[priority] || priority
}

// Load coupons
const loadCoupons = async () => {
  couponsLoading.value = true
  couponsError.value = ''

  try {
    const { $get } = useApi()
    
    // Load my coupons
    const myCouponsResponse = await $get('v1/coupon/list')
    myCoupons.value = myCouponsResponse || []
    
    // Load available coupons
    const availableCouponsResponse = await $get('v1/coupon/applicable-list')
    availableCoupons.value = availableCouponsResponse || []
  } catch (error: any) {
    console.error('Error loading coupons:', error)
    couponsError.value = error?.data?.message || 'خطأ في تحميل القسائم'
  } finally {
    couponsLoading.value = false
  }
}

// Open coupon form
const openCouponForm = () => {
  couponForm.value = { code: '' }
  couponFormError.value = ''
  couponFormSuccess.value = ''
  showCouponForm.value = true
}

// Close coupon form
const closeCouponForm = () => {
  showCouponForm.value = false
  couponFormError.value = ''
  couponFormSuccess.value = ''
}

// Apply coupon code
const applyCouponCode = async () => {
  couponFormLoading.value = true
  couponFormError.value = ''
  couponFormSuccess.value = ''

  try {
    const { $get } = useApi()
    const response = await $get('v1/coupon/apply', {
      params: { code: couponForm.value.code }
    })
    
    couponFormSuccess.value = 'تم تطبيق القسيمة بنجاح!'
    await loadCoupons()
    
    setTimeout(() => {
      closeCouponForm()
    }, 2000)
  } catch (error: any) {
    console.error('Error applying coupon:', error)
    couponFormError.value = error?.data?.message || 'خطأ في تطبيق القسيمة'
  } finally {
    couponFormLoading.value = false
  }
}

// Apply coupon directly
const applyCoupon = async (code: string) => {
  try {
    const { $get } = useApi()
    await $get('v1/coupon/apply', {
      params: { code }
    })
    await loadCoupons()
  } catch (error: any) {
    console.error('Error applying coupon:', error)
  }
}

// Get coupon type name
const getCouponTypeName = (type: string) => {
  const types: Record<string, string> = {
    discount_on_purchase: t('account.coupons.type.discount_on_purchase'),
    free_delivery: t('account.coupons.type.free_delivery'),
    flat_discount: t('account.coupons.type.flat_discount')
  }
  return types[type] || type
}

// Show toast message
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToastMessage.value = true
  setTimeout(() => {
    showToastMessage.value = false
  }, 3000)
}

// Copy coupon code to clipboard
const copyCouponCode = async (code: string) => {
  if (!code) return
  
  try {
    if (process.client && navigator.clipboard) {
      await navigator.clipboard.writeText(code)
      // Show success toast
      showToast(t('account.coupons.copied'), 'success')
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = code
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      // Show success toast
      showToast(t('account.coupons.copied'), 'success')
    }
  } catch (error) {
    console.error('Error copying coupon code:', error)
    // Show error toast
    showToast(t('account.coupons.copy_error'), 'error')
  }
}

// Load restock requests
const loadRestockRequests = async () => {
  restockLoading.value = true
  restockError.value = ''

  try {
    const { $get } = useApi()
    const response = await $get('v1/customer/restock-requests/list')
    restockRequests.value = response || []
  } catch (error: any) {
    console.error('Error loading restock requests:', error)
    restockError.value = error?.data?.message || 'خطأ في تحميل طلبات إعادة التخزين'
  } finally {
    restockLoading.value = false
  }
}

// Delete restock request
const deleteRestockRequest = async (requestId: string) => {
  if (!confirm('هل أنت متأكد من إلغاء طلب إعادة التخزين؟')) return

  try {
    const { $post } = useApi()
    await $post('v1/customer/restock-requests/delete', {
      id: requestId
    })
    await loadRestockRequests()
  } catch (error: any) {
    console.error('Error deleting restock request:', error)
  }
}

// Get restock status name
const getRestockStatusName = (status: string) => {
  const statuses: Record<string, string> = {
    pending: t('account.restock.status.pending'),
    approved: t('account.restock.status.approved'),
    rejected: t('account.restock.status.rejected'),
    completed: t('account.restock.status.completed')
  }
  return statuses[status] || status
}

// Track order
const trackOrder = async () => {
  trackingLoading.value = true
  trackingError.value = ''
  trackingResult.value = null

  try {
    const { $get } = useApi()
    const params = trackingForm.value.searchType === 'order_id' 
      ? { order_id: trackingForm.value.searchTerm }
      : { phone: trackingForm.value.searchTerm }
    
    const response = await $get('v1/order/track', { params })
    trackingResult.value = response
  } catch (error: any) {
    console.error('Error tracking order:', error)
    trackingError.value = error?.data?.message || 'لم يتم العثور على الطلب'
  } finally {
    trackingLoading.value = false
  }
}

// Clear tracking
const clearTracking = () => {
  trackingResult.value = null
  trackingError.value = ''
  trackingForm.value = {
    searchTerm: '',
    searchType: 'order_id'
  }
}

// Get order status name
const getOrderStatusName = (status: string) => {
  const statuses = {
    pending: 'في الانتظار',
    confirmed: 'مؤكد',
    processing: 'قيد المعالجة',
    shipped: 'تم الشحن',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
    returned: 'مرتجع'
  }
  return statuses[status as keyof typeof statuses] || status
}

// Handle avatar change
const handleAvatarChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح')
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت')
      return
    }
    
    try {
      // Update profile form with new image
      profileForm.value.image = file
      
      // Update user image immediately for preview
      const reader = new FileReader()
      reader.onload = (e) => {
        user.value.image = e.target?.result as string
      }
      reader.readAsDataURL(file)
      
      // Auto-save the profile
      await updateProfile()
    } catch (error) {
      console.error('Error updating avatar:', error)
      alert('خطأ في تحديث الصورة')
    }
  }
}

// Logout function
const logout = () => {
  if (confirm(t('logout_confirm') || 'هل أنت متأكد من تسجيل الخروج؟')) {
    auth.setToken(null)
    auth.setUser(null)
    
    // Show success message
    logoutSuccess.value = true
    setTimeout(() => {
      logoutSuccess.value = false
      // Refresh the page after showing success message
      window.location.reload()
    }, 2000)
  }
}

// Load data on mount
onMounted(async () => {
  // Check authentication before loading data
  if (!auth?.user?.value && !auth?.token?.value) {
    // User is not authenticated, redirect to home page
    await navigateTo('/')
    return
  }
  
  // User is authenticated, load data
  loadUserData()
  loadOrders()
  loadWishlist()
  loadAddresses()
  loadSupportTickets()
  loadCoupons()
  loadRestockRequests()
})

// Tab navigation
const tabs = computed(() => [
  { id: 'profile', name: t('account.tabs.profile'), icon: '👤' },
  { id: 'orders', name: t('account.tabs.orders'), icon: '📦' },
  { id: 'wishlist', name: t('account.tabs.wishlist'), icon: '❤️' },
  { id: 'addresses', name: t('account.tabs.addresses'), icon: '📍' },
  { id: 'support', name: t('account.tabs.support'), icon: '🎫' },
  { id: 'coupons', name: t('account.tabs.coupons'), icon: '🎟️' },
  { id: 'tracking', name: t('account.tabs.tracking'), icon: '🚚' }
])
</script>

<template>
  <div class="account-page">
    <!-- Success Message -->
    <teleport to="body">
      <div v-if="logoutSuccess" class="global-success-message">
        <div class="success-content">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <span>{{ t('logout.success') || 'تم تسجيل الخروج بنجاح' }}</span>
        </div>
      </div>
      
      <!-- Toast Message -->
      <Transition name="slide-fade">
        <div v-if="showToastMessage" class="toast-message" :class="toastType">
          <div class="toast-content">
            <svg v-if="toastType === 'success'" width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>{{ toastMessage }}</span>
          </div>
        </div>
      </Transition>
    </teleport>

    <div class="container">
      <div class="account-header">
        <h1>{{ t('account.title') }}</h1>
        <p>{{ t('account.subtitle') }}</p>
      </div>

      <div class="account-content">
        <!-- Sidebar -->
        <div class="account-sidebar">
            <div class="user-info">
              <div class="user-details">
                <h3>{{ user.f_name }} {{ user.l_name }}</h3>
                <p>{{ user.email }}</p>
                <span class="member-since">{{ t('account.member_since') }} {{ formatDate(user.created_at) }}</span>
              </div>
            </div>

          <nav class="account-nav">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="nav-item"
              :class="{ active: activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              <span class="nav-icon">{{ tab.icon }}</span>
              <span class="nav-text">{{ tab.name }}</span>
            </button>
            
            <button class="nav-item logout-btn" @click="logout">
              <span class="nav-icon">🚪</span>
              <span class="nav-text">{{ t('account.logout') }}</span>
            </button>
          </nav>
        </div>

        <!-- Main Content -->
        <div class="account-main">
          <!-- Profile Tab -->
          <div v-if="activeTab === 'profile'" class="tab-content">
            <div class="tab-header">
              <h2>{{ t('account.profile.title') }}</h2>
              <p class="mb-3">{{ t('account.profile.subtitle') }}</p>
            </div>

            <form @submit.prevent="updateProfile" class="profile-form">
              <div class="form-row">
                <div class="form-group">
                  <label for="f_name">{{ t('account.profile.first_name') }}</label>
                  <input
                    id="f_name"
                    v-model="profileForm.f_name"
                    type="text"
                    required
                    :disabled="profileLoading"
                  />
                </div>
                <div class="form-group">
                  <label for="l_name">{{ t('account.profile.last_name') }}</label>
                  <input
                    id="l_name"
                    v-model="profileForm.l_name"
                    type="text"
                    required
                    :disabled="profileLoading"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="email">{{ t('account.profile.email') }}</label>
                  <input
                    id="email"
                    v-model="profileForm.email"
                    type="email"
                    required
                    :disabled="profileLoading"
                  />
                </div>
                <div class="form-group">
                  <label for="phone">{{ t('account.profile.phone') }}</label>
                  <input
                    id="phone"
                    v-model="profileForm.phone"
                    type="tel"
                    :disabled="profileLoading"
                  />
                </div>
              </div>

              <div v-if="profileError" class="error-message">
                {{ profileError }}
              </div>

              <div v-if="profileSuccess" class="success-message">
                {{ profileSuccess }}
              </div>

              <button type="submit" class="submit-btn" :disabled="profileLoading">
                <span v-if="profileLoading">{{ t('account.profile.saving') }}</span>
                <span v-else>{{ t('account.profile.save_changes') }}</span>
              </button>
            </form>
          </div>

          <!-- Orders Tab -->
          <div v-if="activeTab === 'orders'" class="tab-content">
            <div class="tab-header">
              <h2>{{ t('account.orders.title') }}</h2>
              <p class="mb-3">{{ t('account.orders.subtitle') }}</p>
            </div>

            <!-- Loading State -->
            <div v-if="ordersLoading" class="loading-state">
              <div class="spinner"></div>
              <p>{{ t('account.orders.loading') }}</p>
            </div>

            <!-- Error State -->
            <div v-else-if="ordersError" class="error-state">
              <div class="error-icon">⚠️</div>
              <h3>{{ t('account.orders.error_title') }}</h3>
              <p>{{ ordersError }}</p>
              <button @click="loadOrders" class="retry-btn">{{ t('account.orders.retry') }}</button>
            </div>

            <!-- Empty State -->
            <div v-else-if="orders.length === 0" class="empty-state">
              <div class="empty-icon">📦</div>
              <h3>{{ t('account.orders.empty_title') }}</h3>
              <p>{{ t('account.orders.empty_description') }}</p>
              <NuxtLink to="/shop" class="shop-btn">{{ t('account.orders.shop_now') }}</NuxtLink>
            </div>

            <!-- Orders List -->
            <div v-else class="orders-list">
              <div v-for="order in orders" :key="order.id" class="order-card">
                <div class="order-header">
                  <div class="order-info">
                    <h3>{{ t('account.orders.order_number') }} #{{ order.id }}</h3>
                    <p class="order-date">{{ formatDate(order.created_at) }}</p>
                  </div>
                  <div class="order-status">
                    <span 
                      class="status-badge" 
                      :style="{ backgroundColor: getOrderStatus(order.order_status).color }"
                    >
                      {{ getOrderStatus(order.order_status).name }}
                    </span>
                  </div>
                </div>

                <div class="order-items">
                  <div v-for="item in order.details" :key="item.id" class="order-item">
                    <div class="item-image">
                      <img 
                        :src="getImageUrl(item.product?.thumbnail)" 
                        :alt="item.product?.name"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="item-details">
                      <h4>{{ item.product?.name || 'منتج' }}</h4>
                      <p>{{ t('account.orders.quantity') }}: {{ item.qty }}</p>
                      <p class="item-price">{{ formatCurrency(item.price) }}</p>
                    </div>
                  </div>
                </div>

                <div class="order-footer">
                  <div class="order-total">
                    <span>{{ t('account.orders.total') }}: {{ formatCurrency(order.order_amount) }}</span>
                  </div>
                  <div class="order-actions">
                    <button class="action-btn secondary" @click="viewOrderDetails(order.id)">
                      {{ t('account.orders.view_details') }}
                    </button>
                    <button 
                      v-if="canReorder(order)" 
                      class="action-btn primary" 
                      @click="reorderItems(order)"
                    >
                      {{ t('account.orders.reorder') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Restock Tab -->
          <div v-if="activeTab === 'restock'" class="tab-content">
            <div class="tab-header">
              <h2>{{ t('account.restock.title') }}</h2>
              <p class="mb-3">{{ t('account.restock.subtitle') }}</p>
            </div>

            <!-- Loading State -->
            <div v-if="restockLoading" class="loading-state">
              <div class="spinner"></div>
              <p>{{ t('account.restock.loading') }}</p>
            </div>

            <!-- Error State -->
            <div v-else-if="restockError" class="error-state">
              <div class="error-icon">⚠️</div>
              <h3>{{ t('account.restock.error_title') }}</h3>
              <p>{{ restockError }}</p>
              <button @click="loadRestockRequests" class="retry-btn">{{ t('account.orders.retry') }}</button>
            </div>

            <!-- Empty State -->
            <div v-else-if="restockRequests.length === 0" class="empty-state">
              <div class="empty-icon">🔄</div>
              <h3>{{ t('account.restock.empty_title') }}</h3>
              <p>{{ t('account.restock.empty_description') }}</p>
            </div>

            <!-- Restock Requests List -->
            <div v-else class="restock-requests-list">
              <div v-for="request in restockRequests" :key="request.id" class="restock-card">
                <div class="restock-header">
                  <div class="restock-info">
                    <h3>{{ request.product_name || 'منتج' }}</h3>
                    <p class="restock-date">{{ formatDate(request.created_at) }}</p>
                  </div>
                  <div class="restock-status">
                    <span 
                      class="status-badge" 
                      :class="request.status"
                    >
                      {{ getRestockStatusName(request.status) }}
                    </span>
                  </div>
                </div>

                <div class="restock-details">
                  <div class="product-info">
                    <div class="product-image">
                      <img 
                        :src="getImageUrl(request.product_image)" 
                        :alt="request.product_name"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="product-details">
                      <p class="product-name">{{ request.product_name || 'منتج' }}</p>
                      <p class="product-sku" v-if="request.product_sku">
                        SKU: {{ request.product_sku }}
                      </p>
                    </div>
                  </div>
                  
                  <div class="restock-message" v-if="request.message">
                    <p><strong>{{ t('account.restock.your_message') }}:</strong> {{ request.message }}</p>
                  </div>
                </div>

                <div class="restock-actions">
                  <button 
                    v-if="request.status === 'pending'" 
                    class="action-btn danger" 
                    @click="deleteRestockRequest(request.id)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                    {{ t('account.restock.cancel_request') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Wishlist Tab -->
          <div v-if="activeTab === 'wishlist'" class="tab-content">
            <div class="tab-header">
              <h2>{{ t('account.wishlist.title') }}</h2>
              <p class="mb-3">{{ t('account.wishlist.subtitle') }}</p>
            </div>

            <!-- Loading State -->
            <div v-if="wishlistLoading" class="loading-state">
              <div class="spinner"></div>
              <p>{{ t('account.wishlist.loading') }}</p>
            </div>

            <!-- Error State -->
            <div v-else-if="wishlistError" class="error-state">
              <div class="error-icon">⚠️</div>
              <h3>{{ t('account.wishlist.error_title') }}</h3>
              <p>{{ wishlistError }}</p>
              <button @click="loadWishlist" class="retry-btn">{{ t('account.orders.retry') }}</button>
            </div>

            <!-- Empty State -->
            <div v-else-if="wishlist.length === 0" class="empty-state">
              <div class="empty-icon">❤️</div>
              <h3>{{ t('account.wishlist.empty_title') }}</h3>
              <p>{{ t('account.wishlist.empty_description') }}</p>
              <NuxtLink to="/shop" class="shop-btn">{{ t('account.orders.shop_now') }}</NuxtLink>
            </div>

            <!-- Wishlist Grid -->
            <div v-else class="wishlist-grid">
              <div v-for="item in wishlist" :key="item.id" class="wishlist-item">
                <button 
                      class="remove-btn" 
                      @click="removeFromWishlist(item.product_id)"
                      :disabled="wishlistLoading"
                    >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
                    </svg>
                  </button>
                <div class="item-image">
                  <img 
                    :src="getImageUrl(item.productFullInfo?.thumbnail_full_url.path || item.productFullInfo?.image)" 
                    :alt="item.productFullInfo?.name || item.productFullInfo?.product_name"
                    @error="handleImageError"
                  />
                  
                </div>
                
                <div class="item-details">
                  <h3 class="item-name">{{ item.productFullInfo?.name || item.productFullInfo?.product_name || 'منتج' }}</h3>
                  <p v-if="item.productFullInfo?.brand?.name" class="item-brand">
                    {{ item.productFullInfo.brand.name }}
                  </p>
                  
                  <div class="item-rating" v-if="item.productFullInfo?.reviews_avg_rating">
                    <div class="stars">
                      <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= Math.round(item.productFullInfo.reviews_avg_rating) }">
                        ★
                      </span>
                    </div>
                    <span class="rating-text">({{ item.productFullInfo.reviews_count || 0 }})</span>
                  </div>

                  <div class="item-price">
                    <span v-if="item.productFullInfo?.discount && item.productFullInfo?.unit_price" class="original-price">
                      {{ formatCurrency(item.productFullInfo.unit_price) }}
                    </span>
                    <span class="current-price">
                      {{ formatCurrency((item.productFullInfo?.unit_price || 0) - (item.productFullInfo?.discount || 0)) }}
                    </span>
                    <span v-if="item.productFullInfo?.discount && item.productFullInfo?.unit_price" class="discount-badge">
                      -{{ Math.round((item.productFullInfo.discount / item.productFullInfo.unit_price) * 100) }}%
                    </span>
                  </div>

                  <div class="item-stock" :class="{ 'out-of-stock': !item.productFullInfo?.current_stock }">
                    <span v-if="item.productFullInfo?.current_stock">
                      {{ t('account.wishlist.in_stock') }} ({{ item.productFullInfo.current_stock }} {{ t('account.wishlist.pieces') }})
                    </span>
                    <span v-else>{{ t('account.wishlist.out_of_stock') }}</span>
                  </div>
                </div>

                <div class="item-actions">
                  <NuxtLink 
                    :to="`/product/${item.productFullInfo?.slug || item.productFullInfo?.id || item.product_id}`" 
                    class="action-btn secondary"
                  >
                    {{ t('account.wishlist.view_product') }}
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>

          <!-- Addresses Tab -->
          <div v-if="activeTab === 'addresses'" class="tab-content">
            <div class="tab-header">
              <h2>{{ t('account.addresses.title') }}</h2>
              <p class="mb-3">{{ t('account.addresses.subtitle') }}</p>
              <button class="add-address-btn" @click="openAddressForm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                {{ t('account.addresses.add_new') }}
              </button>
            </div>

            <!-- Loading State -->
            <div v-if="addressesLoading" class="loading-state">
              <div class="spinner"></div>
              <p>{{ t('account.addresses.loading') }}</p>
            </div>

            <!-- Error State -->
            <div v-else-if="addressesError" class="error-state">
              <div class="error-icon">⚠️</div>
              <h3>{{ t('account.addresses.error_title') }}</h3>
              <p>{{ addressesError }}</p>
              <button @click="loadAddresses" class="retry-btn">{{ t('account.orders.retry') }}</button>
            </div>

            <!-- Empty State -->
            <div v-else-if="addresses.length === 0" class="empty-state">
              <div class="empty-icon">📍</div>
              <h3>{{ t('account.addresses.empty_title') }}</h3>
              <p>{{ t('account.addresses.empty_description') }}</p>
              <button @click="openAddressForm" class="add-address-btn">{{ t('account.addresses.add_new') }}</button>
            </div>

            <!-- Addresses List -->
            <div v-else class="addresses-list">
              <div v-for="address in addresses" :key="address.id" class="address-card">
                <div class="address-header">
                  <div class="address-type">
                    <span class="type-badge" :class="address.address_type">
                      {{ getAddressTypeName(address.address_type) }}
                    </span>
                  </div>
                  <div class="address-actions">
                    <button class="action-btn secondary" @click="editAddress(address)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                      {{ t('account.addresses.edit') }}
                    </button>
                    <button class="action-btn danger" @click="deleteAddress(address.id)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                      {{ t('account.addresses.delete') }}
                    </button>
                  </div>
                </div>

                <div class="address-details">
                  <div class="contact-info">
                    <h3>{{ address.contact_person_name }}</h3>
                    <p>{{ address.contact_person_number }}</p>
                  </div>
                  
                  <div class="address-info">
                    <p class="address-text">{{ address.address }}</p>
                    <p class="city-zip">{{ address.city }}, {{ address.zip }}</p>
                    <p class="country">{{ address.country }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Support Tab -->
          <div v-if="activeTab === 'support'" class="tab-content">
            <div class="tab-header">
              <h2>{{ t('account.support.title') }}</h2>
              <p class="mb-3">{{ t('account.support.subtitle') }}</p>
              <button class="create-ticket-btn" @click="openSupportForm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                {{ t('account.support.create_ticket') }}
              </button>
            </div>

            <!-- Loading State -->
            <div v-if="supportLoading" class="loading-state">
              <div class="spinner"></div>
              <p>{{ t('account.support.loading') }}</p>
            </div>

            <!-- Error State -->
            <div v-else-if="supportError" class="error-state">
              <div class="error-icon">⚠️</div>
              <h3>{{ t('account.support.error_title') }}</h3>
              <p>{{ supportError }}</p>
              <button @click="loadSupportTickets" class="retry-btn">{{ t('account.orders.retry') }}</button>
            </div>

            <!-- Empty State -->
            <div v-else-if="supportTickets.length === 0" class="empty-state">
              <div class="empty-icon">🎫</div>
              <h3>{{ t('account.support.empty_title') }}</h3>
              <p>{{ t('account.support.empty_description') }}</p>
              <button @click="openSupportForm" class="create-ticket-btn">{{ t('account.support.create_ticket') }}</button>
            </div>

            <!-- Support Tickets List -->
            <div v-else class="support-tickets-list">
              <div v-for="ticket in supportTickets" :key="ticket.id" class="ticket-card">
                <div class="ticket-header">
                  <div class="ticket-info">
                    <h3>{{ ticket.subject }}</h3>
                    <p class="ticket-date">{{ formatDate(ticket.created_at) }}</p>
                  </div>
                  <div class="ticket-status">
                    <span 
                      class="status-badge" 
                      :class="ticket.status"
                    >
                      {{ getTicketStatusName(ticket.status) }}
                    </span>
                    <span 
                      class="priority-badge" 
                      :class="ticket.priority"
                    >
                      {{ getPriorityName(ticket.priority) }}
                    </span>
                  </div>
                </div>

                <div class="ticket-details">
                  <div class="ticket-type">
                    <span class="type-label">{{ t('account.support.type_label') }}:</span>
                    <span class="type-value">{{ getTicketTypeName(ticket.type) }}</span>
                  </div>
                  
                  <div class="ticket-description">
                    <p>{{ ticket.description }}</p>
                  </div>
                </div>

                <div class="ticket-actions">
                  <button class="action-btn secondary" @click="viewTicket(ticket.id)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                    {{ t('account.support.view_details') }}
                  </button>
                  <button 
                    v-if="ticket.status === 'open'" 
                    class="action-btn danger" 
                    @click="closeTicket(ticket.id)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
                    </svg>
                    {{ t('account.support.close_ticket') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Coupons Tab -->
          <div v-if="activeTab === 'coupons'" class="tab-content">
            <div class="tab-header">
              <h2>{{ t('account.coupons.title') }}</h2>
              <p class="mb-3">{{ t('account.coupons.subtitle') }}</p>
              <button class="apply-coupon-btn" @click="openCouponForm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                {{ t('account.coupons.apply_coupon') }}
              </button>
            </div>

            <!-- Loading State -->
            <div v-if="couponsLoading" class="loading-state">
              <div class="spinner"></div>
              <p>{{ t('account.coupons.loading') }}</p>
            </div>

            <!-- Error State -->
            <div v-else-if="couponsError" class="error-state">
              <div class="error-icon">⚠️</div>
              <h3>{{ t('account.coupons.error_title') }}</h3>
              <p>{{ couponsError }}</p>
              <button @click="loadCoupons" class="retry-btn">{{ t('account.orders.retry') }}</button>
            </div>

            <!-- Empty State -->
            <div v-else-if="myCoupons.length === 0 && availableCoupons.length === 0" class="empty-state">
              <div class="empty-icon">🎟️</div>
              <h3>{{ t('account.coupons.empty_title') }}</h3>
              <p>{{ t('account.coupons.empty_description') }}</p>
            </div>

            <!-- Coupons Content -->
            <div v-else class="coupons-content">
            <!-- My Coupons -->
            <div v-if="myCoupons.length > 0" class="coupons-section">
              <h3 class="section-title">{{ t('account.coupons.my_coupons') }}</h3>
              <div class="coupons-grid">
                <div v-for="coupon in myCoupons" :key="coupon.id" class="coupon-card my-coupon">
                  <div class="coupon-header">
                    <div class="coupon-code-wrapper">
                      <div class="coupon-code">{{ coupon.code }}</div>
                      <button 
                        class="copy-coupon-btn" 
                        @click="copyCouponCode(coupon.code)"
                        :title="t('account.coupons.copy') || 'نسخ الكوبون'"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
                        </svg>
                      </button>
                    </div>
                    <div class="coupon-type">{{ getCouponTypeName(coupon.coupon_type) }}</div>
                  </div>
                    
                    <div class="coupon-details">
                      <div class="coupon-discount">
                        <span v-if="coupon.coupon_type === 'discount_on_purchase'">
                          {{ t('account.coupons.discount') }} {{ coupon.discount }}%
                        </span>
                        <span v-else-if="coupon.coupon_type === 'free_delivery'">
                          {{ t('account.coupons.free_delivery') }}
                        </span>
                        <span v-else>
                          {{ t('account.coupons.discount') }} {{ coupon.discount }} ر.س
                        </span>
                      </div>
                      
                      <div class="coupon-conditions">
                        <p v-if="coupon.min_purchase > 0">
                          {{ t('account.coupons.min_purchase') }}: {{ formatCurrency(coupon.min_purchase) }}
                        </p>
                        <p v-if="coupon.max_discount > 0">
                          {{ t('account.coupons.max_discount') }}: {{ formatCurrency(coupon.max_discount) }}
                        </p>
                      </div>
                    </div>

                    <div class="coupon-footer">
                      <div class="coupon-expiry">
                        <span class="expiry-label">{{ t('account.coupons.expires_at') }}:</span>
                        <span class="expiry-date">{{ formatDate(coupon.expire_date) }}</span>
                      </div>
                      <div class="coupon-status">
                        <span class="status-badge active">{{ t('account.coupons.active') }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Available Coupons -->
              <div v-if="availableCoupons.length > 0" class="coupons-section">
                <h3 class="section-title">{{ t('account.coupons.available_coupons') }}</h3>
                <div class="coupons-grid">
                  <div v-for="coupon in availableCoupons" :key="coupon.id" class="coupon-card available-coupon">
                    <div class="coupon-header">
                      <div class="coupon-code-wrapper">
                        <div class="coupon-code">{{ coupon.code }}</div>
                        <button 
                          class="copy-coupon-btn" 
                          @click="copyCouponCode(coupon.code)"
                          :title="t('account.coupons.copy') || 'نسخ الكوبون'"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
                          </svg>
                        </button>
                      </div>
                      <div class="coupon-type">{{ getCouponTypeName(coupon.coupon_type) }}</div>
                    </div>
                    
                    <div class="coupon-details">
                      <div class="coupon-discount">
                        <span v-if="coupon.coupon_type === 'discount_on_purchase'">
                          {{ t('account.coupons.discount') }} {{ coupon.discount }}%
                        </span>
                        <span v-else-if="coupon.coupon_type === 'free_delivery'">
                          {{ t('account.coupons.free_delivery') }}
                        </span>
                        <span v-else>
                          {{ t('account.coupons.discount') }} {{ coupon.discount }} ر.س
                        </span>
                      </div>
                      
                      <div class="coupon-conditions">
                        <p v-if="coupon.min_purchase > 0">
                          {{ t('account.coupons.min_purchase') }}: {{ formatCurrency(coupon.min_purchase) }}
                        </p>
                        <p v-if="coupon.max_discount > 0">
                          {{ t('account.coupons.max_discount') }}: {{ formatCurrency(coupon.max_discount) }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tracking Tab -->
          <div v-if="activeTab === 'tracking'" class="tab-content">
            <div class="tab-header">
              <h2>{{ t('account.tracking.title') }}</h2>
              <p class="mb-3">{{ t('account.tracking.subtitle') }}</p>
            </div>

            <!-- Search Form -->
            <div class="tracking-search">
              <form @submit.prevent="trackOrder" class="search-form">
                <div class="search-input-group">
                  <input
                    v-model="trackingForm.searchTerm"
                    type="text"
                    :placeholder="trackingForm.searchType === 'order_id' ? t('account.tracking.enter_order_id') : t('account.tracking.enter_phone')"
                    required
                    :disabled="trackingLoading"
                    class="search-input"
                  />
                  <select v-model="trackingForm.searchType" class="search-type-select" :disabled="trackingLoading">
                    <option value="order_id">{{ t('account.tracking.order_id') }}</option>
                    <option value="phone">{{ t('account.tracking.phone') }}</option>
                  </select>
                  <button type="submit" class="search-btn" :disabled="trackingLoading">
                    <span v-if="trackingLoading">{{ t('account.tracking.searching') }}</span>
                    <span v-else>{{ t('account.tracking.track') }}</span>
                  </button>
            </div>
              </form>
          </div>

            <!-- Loading State -->
            <div v-if="trackingLoading" class="loading-state">
              <div class="spinner"></div>
              <p>{{ t('account.tracking.loading') }}</p>
        </div>

            <!-- Error State -->
            <div v-else-if="trackingError" class="error-state">
              <div class="error-icon">⚠️</div>
              <h3>{{ t('account.tracking.error_title') }}</h3>
              <p>{{ trackingError }}</p>
              <button @click="clearTracking" class="retry-btn">{{ t('account.tracking.new_search') }}</button>
      </div>

            <!-- Tracking Results -->
            <div v-else-if="trackingResult" class="tracking-result">
              <div class="order-summary">
                <div class="order-header">
                  <h3>{{ t('account.tracking.order_number') }}: {{ trackingResult.order_id }}</h3>
                  <span class="order-status" :class="trackingResult.status">
                    {{ getOrderStatusName(trackingResult.status) }}
                  </span>
    </div>
                
                <div class="order-details">
                  <div class="detail-row">
                    <span class="label">{{ t('account.tracking.order_date') }}:</span>
                    <span class="value">{{ formatDate(trackingResult.created_at) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">{{ t('account.tracking.total_amount') }}:</span>
                    <span class="value">{{ formatCurrency(trackingResult.order_amount) }}</span>
                  </div>
                  <div class="detail-row" v-if="trackingResult.delivery_man">
                    <span class="label">{{ t('account.tracking.delivery_man') }}:</span>
                    <span class="value">{{ trackingResult.delivery_man.name }}</span>
                  </div>
                  <div class="detail-row" v-if="trackingResult.delivery_man?.phone">
                    <span class="label">{{ t('account.tracking.delivery_phone') }}:</span>
                    <span class="value">{{ trackingResult.delivery_man.phone }}</span>
                  </div>
                </div>
              </div>

              <!-- Tracking Timeline -->
              <div class="tracking-timeline">
                <h4>{{ t('account.tracking.tracking_path') }}</h4>
                <div class="timeline">
                  <div 
                    v-for="(step, index) in trackingResult.tracking_history" 
                    :key="index"
                    class="timeline-item"
                    :class="{ active: step.is_current, completed: step.is_completed }"
                  >
                    <div class="timeline-marker">
                      <div class="marker-dot"></div>
                    </div>
                    <div class="timeline-content">
                      <h5>{{ step.status_name }}</h5>
                      <p>{{ step.description }}</p>
                      <span class="timeline-date">{{ formatDate(step.created_at) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Order Items -->
              <div class="order-items" v-if="trackingResult.order_items">
                <h4>{{ t('account.tracking.order_items') }}</h4>
                <div class="items-list">
                  <div v-for="item in trackingResult.order_items" :key="item.id" class="order-item">
                    <div class="item-image">
                      <img 
                        :src="getImageUrl(item.product_image)" 
                        :alt="item.product_name"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="item-details">
                      <h5>{{ item.product_name }}</h5>
                      <p>{{ t('account.orders.quantity') }}: {{ item.quantity }}</p>
                      <p>{{ t('shop.price') }}: {{ formatCurrency(item.price) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="empty-state">
              <div class="empty-icon">🚚</div>
              <h3>{{ t('account.tracking.empty_title') }}</h3>
              <p>{{ t('account.tracking.empty_description') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Address Form Modal -->
    <teleport to="body">
      <div v-if="showAddressForm" class="modal-overlay" @click.self="closeAddressForm">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ editingAddress ? t('account.addresses.edit_address') : t('account.addresses.add_address') }}</h2>
            <button class="close-btn" @click="closeAddressForm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
              </svg>
            </button>
          </div>

          <form @submit.prevent="saveAddress" class="address-form">
            <div class="form-row">
              <div class="form-group">
                <label for="contact_person_name">{{ t('account.addresses.recipient_name') }}</label>
                <input
                  id="contact_person_name"
                  v-model="addressForm.contact_person_name"
                  type="text"
                  required
                  :disabled="addressFormLoading"
                />
              </div>
              <div class="form-group">
                <label for="phone">{{ t('account.addresses.phone_required') }}</label>
                <input
                  id="phone"
                  v-model="addressForm.phone"
                  type="tel"
                  required
                  :placeholder="t('account.addresses.phone_placeholder')"
                  :disabled="addressFormLoading"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="address">{{ t('account.addresses.address') }}</label>
              <textarea
                id="address"
                v-model="addressForm.address"
                required
                rows="3"
                :disabled="addressFormLoading"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="city">{{ t('account.addresses.city') }}</label>
              <input
                id="city"
                v-model="addressForm.city"
                type="text"
                required
                :disabled="addressFormLoading"
              />
            </div>

            <div v-if="addressFormError" class="error-message">
              {{ addressFormError }}
            </div>

            <div class="form-actions">
              <button type="button" class="action-btn secondary" @click="closeAddressForm" :disabled="addressFormLoading">
                {{ t('account.addresses.cancel') }}
              </button>
              <button type="submit" class="action-btn primary" :disabled="addressFormLoading">
                <span v-if="addressFormLoading">{{ t('account.addresses.saving') }}</span>
                <span v-else>{{ editingAddress ? t('account.addresses.update') : t('account.addresses.add') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </teleport>

    <!-- Support Form Modal -->
    <teleport to="body">
      <div v-if="showSupportForm" class="modal-overlay" @click.self="closeSupportForm">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ t('account.support.create_title') }}</h2>
            <button class="close-btn" @click="closeSupportForm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
              </svg>
            </button>
          </div>

          <form @submit.prevent="createSupportTicket" class="support-form">
            <div class="form-group">
              <label for="subject">{{ t('account.support.subject') }}</label>
              <input
                id="subject"
                v-model="supportForm.subject"
                type="text"
                required
                :disabled="supportFormLoading"
                :placeholder="t('account.support.subject_placeholder')"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="type">{{ t('account.support.type') }}</label>
                <select id="type" v-model="supportForm.type" required>
                  <option value="general">{{ t('account.support.type_options.general') }}</option>
                  <option value="technical">{{ t('account.support.type_options.technical') }}</option>
                  <option value="order">{{ t('account.support.type_options.order') }}</option>
                  <option value="refund">{{ t('account.support.type_options.refund') }}</option>
                  <option value="other">{{ t('account.support.type_options.other') }}</option>
                </select>
              </div>
              <div class="form-group">
                <label for="priority">{{ t('account.support.priority') }}</label>
                <select id="priority" v-model="supportForm.priority" required>
                  <option value="low">{{ t('account.support.priority_options.low') }}</option>
                  <option value="medium">{{ t('account.support.priority_options.medium') }}</option>
                  <option value="high">{{ t('account.support.priority_options.high') }}</option>
                  <option value="urgent">{{ t('account.support.priority_options.urgent') }}</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="description">{{ t('account.support.description') }}</label>
              <textarea
                id="description"
                v-model="supportForm.description"
                required
                rows="5"
                :disabled="supportFormLoading"
                :placeholder="t('account.support.description_placeholder')"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="attachments">{{ t('account.support.attachments') }}</label>
              <input
                id="attachments"
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                @change="supportForm.attachments = ($event.target as HTMLInputElement)?.files"
                :disabled="supportFormLoading"
              />
              <p class="form-help">{{ t('account.support.attachments_help') }}</p>
            </div>

            <div v-if="supportFormError" class="error-message">
              {{ supportFormError }}
            </div>

            <div class="form-actions">
              <button type="button" class="action-btn secondary" @click="closeSupportForm" :disabled="supportFormLoading">
                {{ t('account.addresses.cancel') }}
              </button>
              <button type="submit" class="action-btn primary" :disabled="supportFormLoading">
                <span v-if="supportFormLoading">{{ t('account.support.sending') }}</span>
                <span v-else>{{ t('account.support.send_ticket') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </teleport>

    <!-- Coupon Form Modal -->
    <teleport to="body">
      <div v-if="showCouponForm" class="modal-overlay" @click.self="closeCouponForm">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ t('account.coupons.apply_coupon_title') }}</h2>
            <button class="close-btn" @click="closeCouponForm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
              </svg>
            </button>
          </div>

          <form @submit.prevent="applyCouponCode" class="coupon-form p-3">
            <div class="form-group">
              <label for="coupon_code">{{ t('account.coupons.coupon_code') }}</label>
              <input
                id="coupon_code"
                v-model="couponForm.code"
                type="text"
                required
                :disabled="couponFormLoading"
                :placeholder="t('account.coupons.coupon_code_placeholder')"
              />
            </div>

            <div v-if="couponFormError" class="error-message">
              {{ couponFormError }}
            </div>

            <div v-if="couponFormSuccess" class="success-message">
              {{ couponFormSuccess }}
            </div>

            <div class="form-actions">
              <button type="button" class="action-btn secondary" @click="closeCouponForm" :disabled="couponFormLoading">
                {{ t('account.addresses.cancel') }}
              </button>
              <button type="submit" class="action-btn primary" :disabled="couponFormLoading">
                <span v-if="couponFormLoading">{{ t('account.coupons.applying') }}</span>
                <span v-else>{{ t('account.coupons.apply_coupon') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </teleport>

    <!-- Order Details Modal -->
    <div v-if="selectedOrder" class="modal-overlay" @click="selectedOrderId = null">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ t('account.orders.details_title') }} #{{ selectedOrder.id }}</h3>
          <button class="close-btn" @click="selectedOrderId = null">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
            </svg>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="order-info">
            <div class="info-row">
              <span class="label">{{ t('account.orders.status.pending') }}:</span>
              <span class="value status" :class="selectedOrder.order_status">
                {{ getOrderStatusName(selectedOrder.order_status) }}
              </span>
            </div>
            <div class="info-row">
              <span class="label">{{ t('account.orders.order_date') }}:</span>
              <span class="value">{{ formatDate(selectedOrder.created_at) }}</span>
            </div>
            <div class="info-row">
              <span class="label">{{ t('account.orders.total') }}:</span>
              <span class="value">{{ formatCurrency(selectedOrder.order_amount) }}</span>
            </div>
          </div>
          
          <div class="order-items-details">
            <h4>{{ t('account.tracking.order_items') }}</h4>
            <div class="items-list">
              <div v-for="item in selectedOrder.details" :key="item.id" class="order-item-detail">
                <div class="item-image">
                  <img 
                    :src="getImageUrl(item.product?.thumbnail)" 
                    :alt="item.product?.name"
                    @error="handleImageError"
                  />
                </div>
                <div class="item-info">
                  <h5>{{ item.product?.name || 'منتج' }}</h5>
                  <p>{{ t('account.orders.quantity') }}: {{ item.qty }}</p>
                  <p class="price">{{ formatCurrency(item.price) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .account-page {
    min-height: 100vh;
    background: #f8fafc;
    padding: 20px 0;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  .account-header {
    margin-bottom: 40px;
  }

  .account-header h1 {
    font-size: 32px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 8px;
  }

  .account-header p {
    font-size: 16px;
    color: #6b7280;
    margin: 0;
  }

  .account-content {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 30px;
  }

  /* Sidebar */
  .account-sidebar {
    background: white;
    border-radius: 20px;
    padding: 0;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    height: fit-content;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(20px);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    border-radius: 16px;
    color: white;
    position: relative;
    overflow: hidden;
  }

  .user-info::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    opacity: 0.3;
  }

  .user-avatar {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    border: 3px solid rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  }

  .user-avatar:hover {
    transform: scale(1.05);
    border-color: rgba(255, 255, 255, 0.6);
  }

  .user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    font-size: 28px;
    font-weight: 700;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .avatar-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.3s ease;
    border-radius: 50%;
    cursor: pointer;
  }

  .user-avatar:hover .avatar-overlay {
    opacity: 1;
  }

  .avatar-upload-btn {
    background: rgba(255, 255, 255, 0.9);
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #667eea;
  }

  .avatar-upload-btn:hover {
    background: white;
    transform: scale(1.1);
  }

  .user-details {
    flex: 1;
    position: relative;
    z-index: 1;
  }

  .user-details h3 {
    font-size: 18px;
    font-weight: 700;
    color: white;
    margin: 0 0 6px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .user-details p {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    margin: 0 0 4px;
  }

  .member-since {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }

  .account-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 20px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    border: none;
    background: none;
    border-radius: 12px;
    cursor: pointer;
    margin: 10px 0;
    transition: all 0.3s ease;
    text-align: right;
    width: 100%;
    position: relative;
    font-weight: 500;
    color: #6b7280;
  }

  .nav-item::before {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 0;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    border-radius: 2px;
    transition: height 0.3s ease;
  }

  .nav-item:hover {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    color: #374151;
    transform: translateX(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .nav-item.active {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    color: white;
    transform: translateX(-4px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
  }

  .nav-item.active::before {
    height: 24px;
  }

  .nav-icon {
    font-size: 20px;
    transition: transform 0.2s ease;
  }

  .nav-item:hover .nav-icon {
    transform: scale(1.1);
  }

  .nav-text {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }

  .logout-btn {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #f1f5f9;
    color: #ef4444;
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border: 1px solid #fecaca;
  }

  .logout-btn:hover {
    background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
    color: #dc2626;
    transform: translateX(-4px);
    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
  }

  .logout-btn.active {
    background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
    color: #dc2626;
  }

  .logout-btn::before {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }

  /* Main Content */
  .account-main {
    background: white;
    border-radius: 20px;
    padding: 40px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(20px);
    position: relative;
    overflow: hidden;
  }

  .account-main::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
  }

  .tab-header {
    margin-bottom: 40px;
    padding-bottom: 24px;
    border-bottom: 2px solid #f1f5f9;
    position: relative;
  }

  .tab-header::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 60px;
    height: 2px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    border-radius: 1px;
  }

  .tab-header h2 {
    font-size: 28px;
    font-weight: 800;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 12px;
    letter-spacing: -0.5px;
  }

  .tab-header p {
    font-size: 16px;
    color: #6b7280;
    margin: 0;
    font-weight: 500;
  }

  /* Profile Form */
  .profile-form {
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
    padding: 16px 20px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    font-size: 16px;
    transition: all 0.3s ease;
    background: #fafbfc;
    font-weight: 500;
  }

  .form-group input:focus {
    outline: none;
    border-color: #667eea;
    background: white;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    transform: translateY(-2px);
  }

  .form-group input:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  .form-group input:hover:not(:disabled) {
    border-color: #cbd5e1;
    background: white;
  }

  .submit-btn {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    color: white;
    border: none;
    padding: 16px 32px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    position: relative;
    overflow: hidden;
  }

  .submit-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .submit-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
  }

  .submit-btn:hover:not(:disabled)::before {
    left: 100%;
  }

  .submit-btn:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .error-message {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    color: #dc2626;
    padding: 16px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 20px;
    border: 2px solid #fecaca;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
    position: relative;
    overflow: hidden;
  }

  .error-message::before {
    content: '⚠️';
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 18px;
  }

  .success-message {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    color: #166534;
    padding: 16px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 20px;
    border: 2px solid #bbf7d0;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.1);
    position: relative;
    overflow: hidden;
  }

  .success-message::before {
    content: '✅';
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 18px;
  }

  /* Loading State */
  .loading-state {
    text-align: center;
    padding: 80px 20px;
    color: #6b7280;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 16px;
    border: 2px solid #e2e8f0;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #e2e8f0;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 24px;
    position: relative;
  }

  .spinner::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 20px;
    height: 20px;
    border: 2px solid transparent;
    border-top: 2px solid #764ba2;
    border-radius: 50%;
    animation: spin 0.5s linear infinite reverse;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Error State */
  .error-state {
    text-align: center;
    padding: 60px 20px;
    color: #6b7280;
  }

  .error-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .error-state h3 {
    font-size: 24px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 12px;
  }

  .retry-btn {
    background: #6b46c1;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 16px;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 80px 20px;
    color: #6b7280;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 16px;
    border: 2px dashed #cbd5e1;
    position: relative;
    overflow: hidden;
  }

  .empty-state::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="%23cbd5e1" opacity="0.3"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>');
    opacity: 0.5;
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 24px;
    position: relative;
    z-index: 1;
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  .empty-state h3 {
    font-size: 28px;
    font-weight: 700;
    color: #374151;
    margin: 0 0 16px;
    position: relative;
    z-index: 1;
  }

  .empty-state p {
    font-size: 16px;
    margin: 0 0 24px;
    position: relative;
    z-index: 1;
    font-weight: 500;
  }

  .shop-btn {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    color: white;
    text-decoration: none;
    padding: 16px 32px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 700;
    display: inline-block;
    margin-top: 16px;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    position: relative;
    z-index: 1;
  }

  .shop-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
  }

  /* Orders List */
  .orders-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .order-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .order-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
  }

  .order-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f3f4f6;
  }

  .order-info h3 {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 4px;
  }

  .order-date {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
  }

  .status-badge {
    padding: 8px 16px;
    border-radius: 20px;
    color: white;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    position: relative;
    overflow: hidden;
  }

  .status-badge::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .status-badge:hover::before {
    left: 100%;
  }

  .order-items {
    margin-bottom: 16px;
  }

  .order-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f9fafb;
  }

  .order-item:last-child {
    border-bottom: none;
  }

  .item-image {
    width: 150px;
    height: auto;
    border-radius: 8px;
    overflow: hidden;
    background: #f3f4f6;
    flex-shrink: 0;
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
    font-size: 16px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 4px;
  }

  .item-details p {
    font-size: 14px;
    color: #6b7280;
    margin: 0 0 4px;
  }

  .item-price {
    font-weight: 600;
    color: #111827;
  }

  .order-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid #f3f4f6;
  }

  .order-total {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }

  .order-actions {
    display: flex;
    gap: 12px;
  }

  .action-btn {
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    border: none;
    position: relative;
    overflow: hidden;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .action-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .action-btn:hover::before {
    left: 100%;
  }

  .action-btn.primary {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  }

  .action-btn.primary:hover {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
  }

  .action-btn.secondary {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    color: #374151;
    border: 2px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .action-btn.secondary:hover {
    background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  }

  /* Wishlist Grid */
  .wishlist-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }

  .wishlist-item {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .wishlist-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
  }

  .wishlist-item:hover {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    transform: translateY(-4px);
  }

  .item-image {
    position: relative;
    width: 100%;
    height: 200px;
    border-radius: 8px;
    overflow: hidden;
    background: #f3f4f6;
    margin-bottom: 12px;
  }

  .item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .remove-btn {
    position: absolute;
    top: 12px;
    left: 12px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 100%);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }

  .remove-btn:hover {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    transform: scale(1.15);
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
  }

  .item-details {
    margin-bottom: 16px;
  }

  .item-name {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 4px;
    line-height: 1.4;
  }

  .item-brand {
    font-size: 14px;
    color: #6b7280;
    margin: 0 0 8px;
  }

  .item-rating {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .stars {
    display: flex;
    gap: 2px;
  }

  .star {
    color: #d1d5db;
    font-size: 14px;
  }

  .star.filled {
    color: #fbbf24;
  }

  .rating-text {
    font-size: 12px;
    color: #6b7280;
  }

  .item-price {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .original-price {
    font-size: 14px;
    color: #9ca3af;
    text-decoration: line-through;
  }

  .current-price {
    font-size: 20px;
    font-weight: 800;
    color: #111827;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .discount-badge {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .item-stock {
    font-size: 14px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 8px;
    display: inline-block;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .item-stock:not(.out-of-stock) {
    color: #10b981;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    border: 2px solid #bbf7d0;
  }

  .item-stock.out-of-stock {
    color: #ef4444;
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border: 2px solid #fecaca;
  }

  .item-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
  }

  .item-actions .action-btn {
    width: 100%;
    justify-content: center;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 20px;
    font-size: 15px;
    font-weight: 700;
  }

  /* Coming Soon */
  .coming-soon {
    text-align: center;
    padding: 60px 20px;
    color: #6b7280;
  }

  .coming-soon h3 {
    font-size: 24px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 12px;
  }

  .coming-soon p {
    font-size: 16px;
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .account-content {
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .account-sidebar {
      order: 2;
      border-radius: 16px;
    }

    .account-main {
      order: 1;
      padding: 24px;
      border-radius: 16px;
    }

    .form-row {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .account-nav {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding: 16px;
    }

    .nav-item {
      flex-direction: column;
      text-align: center;
      padding: 16px 8px;
      border-radius: 10px;
    }

    .nav-text {
      font-size: 12px;
    }

    .user-info {
      padding: 20px;
      margin-bottom: 24px;
    }

    .user-avatar {
      width: 60px;
      height: 60px;
    }

    .user-details h3 {
      font-size: 16px;
    }

    .user-details p {
      font-size: 13px;
    }

    .member-since {
      font-size: 11px;
    }

    .order-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .order-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }

    .order-actions {
      width: 100%;
      justify-content: stretch;
    }

    .action-btn {
      flex: 1;
      text-align: center;
    }

    .wishlist-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .wishlist-item {
      padding: 16px;
      border-radius: 12px;
    }

    .item-image {
      height: 180px;
    }

    .item-actions {
      flex-direction: row;
      gap: 8px;
    }

    .item-actions .action-btn {
      flex: 1;
      padding: 12px 16px;
      font-size: 14px;
    }
  }

  /* Addresses */
  .add-address-btn {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .add-address-btn:hover {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
  }

  .addresses-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
  }

  .address-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .address-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
  }

  .address-card:hover {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    transform: translateY(-4px);
  }

  .address-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f3f4f6;
  }

  .type-badge {
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .type-badge.home {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    color: #1e40af;
    border: 2px solid #93c5fd;
  }

  .type-badge.work {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    color: #166534;
    border: 2px solid #86efac;
  }

  .type-badge.other {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    color: #374151;
    border: 2px solid #d1d5db;
  }

  .address-actions {
    display: flex;
    gap: 8px;
  }

  .action-btn.danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
  }

  .action-btn.danger:hover {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.6);
  }

  .address-details {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .contact-info h3 {
    font-size: 18px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 6px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .contact-info p {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
    font-weight: 500;
  }

  .address-info p {
    margin: 0 0 6px;
    font-size: 14px;
    color: #374151;
  }

  .address-text {
    font-weight: 600;
    line-height: 1.6;
    color: #111827;
  }

  .city-zip {
    color: #6b7280;
    font-weight: 500;
  }

  .country {
    color: #9ca3af;
    font-size: 13px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal-content {
    background: #fff;
    border-radius: 20px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(20px);
    position: relative;
    overflow: hidden;
  }

  .modal-content::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 28px 20px;
    border-bottom: 2px solid #f1f5f9;
    position: relative;
    z-index: 1;
  }

  .modal-header h2 {
    font-size: 24px;
    font-weight: 800;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
    letter-spacing: -0.5px;
  }

  .close-btn {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 2px solid #e2e8f0;
    cursor: pointer;
    padding: 8px;
    border-radius: 10px;
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .close-btn:hover {
    background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
    color: #374151;
    transform: scale(1.1);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  }

  .address-form {
    padding: 24px;
  }

  .form-actions {
    display: flex;
    gap: 16px;
    justify-content: flex-end;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 2px solid #f1f5f9;
    position: relative;
  }

  .form-actions::before {
    content: '';
    position: absolute;
    top: -2px;
    left: 0;
    width: 60px;
    height: 2px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    border-radius: 1px;
  }

  .form-group textarea {
    padding: 16px 20px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    font-size: 16px;
    transition: all 0.3s ease;
    resize: vertical;
    min-height: 100px;
    font-family: inherit;
    background: #fafbfc;
    font-weight: 500;
  }

  .form-group textarea:focus {
    outline: none;
    border-color: #667eea;
    background: white;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    transform: translateY(-2px);
  }

  .form-group textarea:hover:not(:focus) {
    border-color: #cbd5e1;
    background: white;
  }

  .form-group select {
    padding: 16px 20px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    font-size: 16px;
    transition: all 0.3s ease;
    background: #fafbfc;
    cursor: pointer;
    font-weight: 500;
  }

  .form-group select:focus {
    outline: none;
    border-color: #667eea;
    background: white;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    transform: translateY(-2px);
  }

  .form-group select:hover:not(:focus) {
    border-color: #cbd5e1;
    background: white;
  }

  .form-group select:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  /* Responsive for addresses */
  @media (max-width: 768px) {
    .addresses-list {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .address-card {
      padding: 20px;
      border-radius: 12px;
    }

    .address-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .address-actions {
      width: 100%;
      justify-content: stretch;
      gap: 8px;
    }

    .address-actions .action-btn {
      flex: 1;
      text-align: center;
      padding: 12px 16px;
    }

    .modal-content {
      margin: 10px;
      max-width: none;
      border-radius: 16px;
    }

    .modal-header,
    .address-form {
      padding: 20px;
    }

    .form-actions {
      flex-direction: column;
      gap: 12px;
    }

    .form-actions .action-btn {
      width: 100%;
      padding: 14px 20px;
    }
  }

  /* Support Tickets */
  .create-ticket-btn {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .create-ticket-btn:hover {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
  }

  .support-tickets-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .ticket-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .ticket-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
  }

  .ticket-card:hover {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    transform: translateY(-4px);
  }

  .ticket-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f3f4f6;
  }

  .ticket-info h3 {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 6px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .ticket-date {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
    font-weight: 500;
  }

  .ticket-status {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
  }

  .status-badge {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-badge.open {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    color: #166534;
    border: 2px solid #86efac;
  }

  .status-badge.closed {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    color: #6b7280;
    border: 2px solid #d1d5db;
  }

  .status-badge.pending {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #92400e;
    border: 2px solid #fbbf24;
  }

  .priority-badge {
    padding: 6px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .priority-badge.low {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    color: #166534;
    border: 2px solid #86efac;
  }

  .priority-badge.medium {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #92400e;
    border: 2px solid #fbbf24;
  }

  .priority-badge.high {
    background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
    color: #991b1b;
    border: 2px solid #f87171;
  }

  .priority-badge.urgent {
    background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
    color: #7f1d1d;
    border: 2px solid #f87171;
  }

  .ticket-details {
    margin-bottom: 16px;
  }

  .ticket-type {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .type-label {
    font-size: 14px;
    color: #6b7280;
    font-weight: 500;
  }

  .type-value {
    font-size: 14px;
    color: #374151;
    font-weight: 600;
  }

  .ticket-description {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 16px;
    border-radius: 12px;
    border-left: 4px solid #667eea;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .ticket-description p {
    margin: 0;
    font-size: 14px;
    color: #374151;
    line-height: 1.6;
    font-weight: 500;
  }

  .ticket-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .form-help {
    font-size: 12px;
    color: #6b7280;
    margin: 8px 0 0;
    font-weight: 500;
    font-style: italic;
  }

  /* Responsive for support */
  @media (max-width: 768px) {
    .ticket-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .ticket-status {
      flex-direction: row;
      align-items: center;
      width: 100%;
      justify-content: space-between;
      gap: 8px;
    }

    .ticket-actions {
      flex-direction: column;
      width: 100%;
      gap: 8px;
    }

    .ticket-actions .action-btn {
      width: 100%;
      text-align: center;
      padding: 12px 16px;
    }

    .ticket-card {
      padding: 20px;
      border-radius: 12px;
    }
  }

  /* Coupons */
  .apply-coupon-btn {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .apply-coupon-btn:hover {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
  }

  .coupons-content {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .coupons-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .section-title {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0;
    padding-bottom: 12px;
    border-bottom: 2px solid #e5e7eb;
  }

  .coupons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 24px;
  }

  .coupon-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .coupon-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
  }

  .coupon-card:hover {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    transform: translateY(-4px);
  }

  .coupon-card.my-coupon {
    border-left: 4px solid #10b981;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  }

  .coupon-card.my-coupon::before {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  }

  .coupon-card.available-coupon {
    border-left: 4px solid #6b46c1;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  }

  .coupon-card.available-coupon::before {
    background: linear-gradient(135deg, #6b46c1 0%, #553c9a 100%);
  }

  .coupon-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 2px solid #f1f5f9;
    position: relative;
  }

  .coupon-header::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 40px;
    height: 2px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    border-radius: 1px;
  }

  .coupon-code-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
    flex: 1;
  }

  .coupon-code {
    font-size: 20px;
    font-weight: 800;
    color: #111827;
    font-family: 'Courier New', monospace;
    letter-spacing: 1px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 12px 16px;
    border-radius: 10px;
    border: 2px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    flex: 1;
  }

  .copy-coupon-btn {
    background: #f58040;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    min-width: 36px;
    height: 36px;
  }

  .copy-coupon-btn:hover {
    background: #e67030;
    transform: scale(1.05);
  }

  .copy-coupon-btn:active {
    transform: scale(0.95);
  }

  .copy-coupon-btn svg {
    width: 16px;
    height: 16px;
  }

  .coupon-type {
    background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
    color: #374151;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .coupon-details {
    margin-bottom: 16px;
  }

  .coupon-discount {
    font-size: 28px;
    font-weight: 800;
    color: #10b981;
    margin-bottom: 16px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .coupon-conditions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 16px;
    border-radius: 12px;
    border: 2px solid #e2e8f0;
  }

  .coupon-conditions p {
    margin: 0;
    font-size: 14px;
    color: #6b7280;
    font-weight: 500;
  }

  .coupon-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 20px;
    border-top: 2px solid #f1f5f9;
    position: relative;
  }

  .coupon-footer::before {
    content: '';
    position: absolute;
    top: -2px;
    left: 0;
    width: 40px;
    height: 2px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    border-radius: 1px;
  }

  .coupon-expiry {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .expiry-label {
    font-size: 12px;
    color: #6b7280;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .expiry-date {
    font-size: 14px;
    color: #374151;
    font-weight: 700;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .coupon-status .status-badge {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-badge.active {
    background: #dcfce7;
    color: #166534;
  }

  .apply-btn {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .apply-btn:hover {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
  }

  .success-message {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    color: #166534;
    padding: 16px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 20px;
    border: 2px solid #86efac;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.1);
    position: relative;
    overflow: hidden;
  }

  .success-message::before {
    content: '✅';
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 18px;
  }

  /* Responsive for coupons */
  @media (max-width: 768px) {
    .coupons-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .coupon-card {
      padding: 20px;
      border-radius: 12px;
    }

    .coupon-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .coupon-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }

    .apply-btn {
      width: 100%;
      text-align: center;
      padding: 14px 20px;
    }

    .coupon-code {
      font-size: 18px;
      padding: 10px 14px;
    }
  }

  /* Restock Requests */
  .restock-requests-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .restock-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .restock-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
  }

  .restock-card:hover {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    transform: translateY(-4px);
  }

  .restock-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f3f4f6;
  }

  .restock-info h3 {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 6px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .restock-date {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
    font-weight: 500;
  }

  .restock-status .status-badge {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-badge.pending {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #92400e;
    border: 2px solid #fbbf24;
  }

  .status-badge.approved {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    color: #166534;
    border: 2px solid #86efac;
  }

  .status-badge.rejected {
    background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
    color: #991b1b;
    border: 2px solid #f87171;
  }

  .status-badge.completed {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    color: #1e40af;
    border: 2px solid #93c5fd;
  }

  .restock-details {
    margin-bottom: 20px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 20px;
    border-radius: 12px;
    border: 2px solid #e2e8f0;
  }

  .product-info {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
  }

  .product-image {
    width: 70px;
    height: 70px;
    border-radius: 12px;
    overflow: hidden;
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .product-details {
    flex: 1;
  }

  .product-name {
    font-size: 18px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 6px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .product-sku {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
    font-weight: 500;
  }

  .restock-message {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 16px;
    border-radius: 12px;
    border-left: 4px solid #667eea;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .restock-message p {
    margin: 0;
    font-size: 14px;
    color: #374151;
    line-height: 1.6;
    font-weight: 500;
  }

  .restock-actions {
    display: flex;
    gap: 16px;
    justify-content: flex-end;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 2px solid #f1f5f9;
    position: relative;
  }

  .restock-actions::before {
    content: '';
    position: absolute;
    top: -2px;
    left: 0;
    width: 40px;
    height: 2px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    border-radius: 1px;
  }

  /* Responsive for restock */
  @media (max-width: 768px) {
    .restock-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .product-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .product-image {
      width: 60px;
      height: 60px;
    }

    .restock-actions {
      flex-direction: column;
      width: 100%;
      gap: 12px;
    }

    .restock-actions .action-btn {
      width: 100%;
      text-align: center;
      padding: 12px 16px;
    }

    .restock-card {
      padding: 20px;
      border-radius: 12px;
    }
  }

  /* Tracking */
  .tracking-search {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 28px;
    margin-bottom: 32px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
  }

  .tracking-search::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
  }

  .search-form {
    width: 100%;
  }

  .search-input-group {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .search-input {
    flex: 1;
    padding: 16px 20px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    font-size: 16px;
    transition: all 0.3s ease;
    background: #fafbfc;
    font-weight: 500;
  }

  .search-input:focus {
    outline: none;
    border-color: #667eea;
    background: white;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    transform: translateY(-2px);
  }

  .search-input:hover:not(:focus) {
    border-color: #cbd5e1;
    background: white;
  }

  .search-type-select {
    padding: 16px 20px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    font-size: 16px;
    background: #fafbfc;
    cursor: pointer;
    min-width: 140px;
    transition: all 0.3s ease;
    font-weight: 500;
  }

  .search-type-select:focus {
    outline: none;
    border-color: #667eea;
    background: white;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    transform: translateY(-2px);
  }

  .search-type-select:hover:not(:focus) {
    border-color: #cbd5e1;
    background: white;
  }

  .search-btn {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    color: white;
    border: none;
    padding: 16px 32px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    min-width: 100px;
  }

  .search-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
  }

  .search-btn:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .tracking-result {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .order-summary {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
  }

  .order-summary::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 2px solid #f1f5f9;
    position: relative;
  }

  .order-header::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 60px;
    height: 2px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    border-radius: 1px;
  }

  .order-header h3 {
    font-size: 24px;
    font-weight: 800;
    color: #111827;
    margin: 0;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.5px;
  }

  .order-status {
    padding: 10px 20px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .order-status.pending {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #92400e;
    border: 2px solid #fbbf24;
  }

  .order-status.confirmed {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    color: #1e40af;
    border: 2px solid #93c5fd;
  }

  .order-status.processing {
    background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
    color: #3730a3;
    border: 2px solid #a5b4fc;
  }

  .order-status.shipped {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    color: #166534;
    border: 2px solid #86efac;
  }

  .order-status.delivered {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    color: #166534;
    border: 2px solid #86efac;
  }

  .order-status.cancelled {
    background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
    color: #991b1b;
    border: 2px solid #f87171;
  }

  .order-status.returned {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    color: #6b7280;
    border: 2px solid #d1d5db;
  }

  .order-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 20px;
    border-radius: 12px;
    border: 2px solid #e2e8f0;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
  }

  .detail-row .label {
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 14px;
  }

  .detail-row .value {
    font-weight: 700;
    color: #111827;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-size: 16px;
  }

  .tracking-timeline {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 28px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
  }

  .tracking-timeline::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
  }

  .tracking-timeline h4 {
    font-size: 22px;
    font-weight: 800;
    color: #111827;
    margin: 0 0 24px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.5px;
  }

  .timeline {
    position: relative;
    padding-left: 24px;
  }

  .timeline::before {
    content: '';
    position: absolute;
    left: 12px;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    border-radius: 2px;
  }

  .timeline-item {
    position: relative;
    margin-bottom: 28px;
    padding-left: 24px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 20px;
    border-radius: 12px;
    border: 2px solid #e2e8f0;
    transition: all 0.3s ease;
  }

  .timeline-item:last-child {
    margin-bottom: 0;
  }

  .timeline-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .timeline-marker {
    position: absolute;
    left: -18px;
    top: 24px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    border: 4px solid #fff;
    box-shadow: 0 0 0 3px #e5e7eb;
  }

  .timeline-item.completed .timeline-marker {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    box-shadow: 0 0 0 3px #10b981;
    transform: scale(1.1);
  }

  .timeline-item.active .timeline-marker {
    background: linear-gradient(135deg, #f58040 0%, #f58040 100%);
    box-shadow: 0 0 0 3px #667eea;
    transform: scale(1.2);
  }

  .marker-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .timeline-content h5 {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 4px;
  }

  .timeline-content p {
    font-size: 14px;
    color: #6b7280;
    margin: 0 0 8px;
    line-height: 1.5;
  }

  .timeline-date {
    font-size: 12px;
    color: #9ca3af;
    font-weight: 500;
  }

  .order-items {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .order-items h4 {
    font-size: 18px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 20px;
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .order-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: #f9fafb;
    border-radius: 8px;
  }

  .item-image {
    width: 150px;
    height: auto;
    border-radius: 8px;
    overflow: hidden;
    background: #f3f4f6;
    flex-shrink: 0;
  }

  .item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .item-details {
    flex: 1;
  }

  .item-details h5 {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 4px;
  }

  .item-details p {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
  }

  /* Responsive for tracking */
  @media (max-width: 768px) {
    .search-input-group {
      flex-direction: column;
      gap: 12px;
    }

    .search-input,
    .search-type-select,
    .search-btn {
      width: 100%;
    }

    .order-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .order-details {
      grid-template-columns: 1fr;
    }

    .timeline {
      padding-left: 16px;
    }
  }

  /* Order Details Modal */
  .modal-overlay {
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
    padding: 20px;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }

  .close-btn {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .modal-body {
    padding: 24px;
  }

  .order-info {
    background: #f8fafc;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .info-row:last-child {
    margin-bottom: 0;
  }

  .info-row .label {
    font-weight: 500;
    color: #6b7280;
  }

  .info-row .value {
    font-weight: 600;
    color: #111827;
  }

  .info-row .value.status {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .info-row .value.status.pending {
    background: #fef3c7;
    color: #92400e;
  }

  .info-row .value.status.confirmed {
    background: #dbeafe;
    color: #1e40af;
  }

  .info-row .value.status.processing {
    background: #e0e7ff;
    color: #3730a3;
  }

  .info-row .value.status.shipped {
    background: #d1fae5;
    color: #065f46;
  }

  .info-row .value.status.delivered {
    background: #dcfce7;
    color: #166534;
  }

  .info-row .value.status.canceled {
    background: #fee2e2;
    color: #dc2626;
  }

  .order-items-details h4 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .order-item-detail {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: #f8fafc;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
  }

  .order-item-detail .item-image {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .order-item-detail .item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .order-item-detail .item-info {
    flex: 1;
  }

  .order-item-detail .item-info h5 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: #111827;
  }

  .order-item-detail .item-info p {
    margin: 0 0 4px 0;
    font-size: 12px;
    color: #6b7280;
  }

  .order-item-detail .item-info .price {
    font-weight: 600;
    color: #059669;
  }

  @media (max-width: 768px) {
    .modal-overlay {
      padding: 10px;
    }
    
    .modal-content {
      max-height: 90vh;
    }
    
    .modal-header {
      padding: 16px 20px;
    }
    
    .modal-body {
      padding: 20px;
    }
    
    .order-item-detail {
      flex-direction: column;
      align-items: flex-start;
      text-align: right;
    }
    
    .order-item-detail .item-image {
      width: 80px;
      height: 80px;
      align-self: center;
    }

    .timeline-marker {
      left: -8px;
    }

    .order-item {
      flex-direction: column;
      align-items: flex-start;
      text-align: center;
    }

    .item-image {
      width: 80px;
      height: 80px;
    }
  }

  /* Toast Message Styles */
  .toast-message {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
  }

  .toast-message.success {
    background: #10b981;
    color: white;
  }

  .toast-message.error {
    background: #ef4444;
    color: white;
  }

  .toast-content {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 250px;
    font-size: 14px;
    font-weight: 500;
  }

  .toast-content svg {
    flex-shrink: 0;
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  [dir="rtl"] .toast-message {
    right: auto;
    left: 20px;
    animation: slideInLeft 0.3s ease-out;
  }

  @keyframes slideInLeft {
    from {
      transform: translateX(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* Success Message Styles */
  .global-success-message {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    animation: slideInFromRight 0.3s ease-out;
  }

  .success-content {
    background: #f0fff4;
    color: #22543d;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    border: 1px solid #9ae6b4;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 200px;
  }

  @keyframes slideInFromRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>

