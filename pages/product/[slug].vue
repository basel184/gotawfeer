<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
// Import Swiper Vue.js components
import { Swiper, SwiperSlide } from 'swiper/vue'
// Import Swiper styles
import 'swiper/css'
import 'swiper/css/free-mode'
import 'swiper/css/navigation'
import 'swiper/css/thumbs'
// Import required modules
import { FreeMode, Navigation, Thumbs } from 'swiper/modules'
import { useWishlist } from '../../composables/useWishlist'
import { useCart } from '../../composables/useCart'

// Register Swiper components globally for this component
const SwiperComponent = Swiper
const SwiperSlideComponent = SwiperSlide

const route = useRoute()
const { details: getDetails, related: getRelated, filter: filterProducts } = useProducts() as any
const cart = useCart()
const wishlist = useWishlist()

// Modal state - global state for product modal
const selectedProductForModal = useState<any>('selectedProductForModal', () => null)

// Wishlist data
const isInWishlist = ref(false)
const wishlistLoading = ref(false)

// Success message state
const showSuccessMessage = ref(false)
const successMessage = ref('')

// Show success message function
const showSuccess = (message: string) => {
  successMessage.value = message
  showSuccessMessage.value = true
  setTimeout(() => {
    showSuccessMessage.value = false
  }, 3000) // Hide after 3 seconds
}

// Reviews data
const reviews = ref<any[]>([])
const reviewsLoading = ref(false)
const reviewsError = ref('')
const totalReviewsCount = ref(0)
const averageRating = ref(0)

const slug = computed(() => String(route.params.slug || ''))
const loading = ref(true)
const loadingProgress = ref(0)
const error = ref<string>('')
const product = ref<any>(null)
const recLoading = ref(true)
const recommended = ref<any[]>([])

// Offer products (4 random products)
const offerProducts = ref<any[]>([])
const offerProductsLoading = ref(false)

// Helper functions to extract product data
const getProductImage = (product: any): string => {
  if (!product) return ''
  
  const getStringValue = (field: any): string | null => {
    if (!field) return null
    if (typeof field === 'string') return field
    if (Array.isArray(field) && field.length > 0) {
      const first = field.find((item: any) => typeof item === 'string')
      return first || null
    }
    if (typeof field === 'object' && field.path) return field.path
    if (typeof field === 'object' && field.key) return field.key
    return null
  }
  
  const raw = getStringValue(product?.thumbnail_full_url) ||
              getStringValue(product?.image_full_url) ||
              getStringValue(product?.photo_full_url) ||
              getStringValue(product?.images_full_url) ||
              getStringValue(product?.thumbnail) ||
              getStringValue(product?.image) ||
              getStringValue(product?.photo) ||
              getStringValue(product?.images) ||
              ''
  
  if (!raw) return ''
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw
  return normalize(raw)
}

const getProductTitle = (product: any): string => {
  if (!product) return 'Product'
  return product?.name || product?.product_name || product?.product?.name || product?.product?.product_name || 'Product'
}

const getProductPrice = (product: any): { final: number; old: number; hasDiscount: boolean } => {
  if (!product) return { final: 0, old: 0, hasDiscount: false }
  
  const basePrice = Number(product?.unit_price ?? product?.price ?? product?.product?.unit_price ?? product?.product?.price ?? 0)
  const discount = Number(product?.discount ?? product?.product?.discount ?? 0)
  const discountType = product?.discount_type || product?.product?.discount_type || 'flat'
  
  const isPercent = String(discountType).toLowerCase().startsWith('per')
  const diff = discount && basePrice ? (isPercent ? (basePrice * discount) / 100 : discount) : 0
  const finalPrice = Math.max(0, basePrice - diff)
  const hasDiscount = finalPrice > 0 && finalPrice < basePrice
  
  return { final: finalPrice, old: basePrice, hasDiscount }
}

const formatPrice = (n: number): string => {
  if (!isFinite(n) || n <= 0) return '0'
  try { 
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) 
  } catch { 
    return String(n) 
  }
}

// Load offer products
const loadOfferProducts = async () => {
  offerProductsLoading.value = true
  try {
    // Use POST request with body (as required by the API)
    const body = {
      limit: 50, // Get more products to have better random selection
      offset: 1
    }
    
    const response = await filterProducts(body)
    
    // Extract products from response (handle different response structures)
    let products: any[] = []
    if (Array.isArray(response)) {
      products = response
    } else if (Array.isArray(response?.data)) {
      products = response.data
    } else if (Array.isArray(response?.products)) {
      products = response.products
    } else if (Array.isArray(response?.items)) {
      products = response.items
    }
    
    // Filter out current product if it exists
    const currentProductId = product.value?.id || product.value?.product_id
    if (currentProductId) {
      products = products.filter((p: any) => {
        const pid = p?.id || p?.product_id
        return pid !== currentProductId
      })
    }
    
    // Shuffle array and take 4 random products
    const shuffled = [...products].sort(() => Math.random() - 0.5)
    offerProducts.value = shuffled.slice(0, 4)
  } catch (error) {
    console.error('Failed to load offer products:', error)
    offerProducts.value = []
  } finally {
    offerProductsLoading.value = false
  }
}

// Load offer products when product is loaded
watch(() => product.value, (newProduct) => {
  if (newProduct) {
    loadOfferProducts()
  }
}, { immediate: true })

// Helpers to normalize media paths similar to ProductCard
const cfg = useRuntimeConfig() as any
const assetBase = (cfg?.public?.apiBase || 'https://gotawfeer.com/project/api').replace(/\/api(?:\/v\d+)?$/, '')
const fixPath = (s: string) => {
  let p = (s || '').trim().replace(/\\/g, '/')
  
  // Handle different path formats
  if (p.startsWith('public/')) {
    p = p.replace(/^public\//, '')
  } else if (p.startsWith('app/public/')) {
    p = p.replace(/^app\/public\//, 'storage/')
  } else if (p.startsWith('storage/')) {
    // Already correct format
  } else if (!p.startsWith('http') && !p.startsWith('/')) {
    // If it's just a filename, determine the correct storage path
    if (p.includes('testimonial')) {
      p = `storage/testimonials/${p}`
    } else if (p.includes('brand')) {
      p = `storage/brand/${p}`
    } else if (p.includes('product')) {
      p = `storage/product/${p}`
    } else {
      p = `storage/${p}`
    }
  }
  
  // Clean up slashes
  p = p.replace(/\/+/g, '/').replace(/^\//, '')
  
  return p
}
const normalize = (s: any): string => {
  if (!s) return ''
  if (Array.isArray(s)) return normalize(s[0])
  let v: any = s
  if (typeof s === 'string') {
    const trimmed = s.trim()
    if ((trimmed.startsWith('[') || trimmed.startsWith('{'))) {
      try { const parsed = JSON.parse(trimmed); return normalize(parsed) } catch {}
    }
    v = trimmed
  } else if (typeof s === 'object') {
    // Handle different object formats
    v = (s as any).path || (s as any).url || (s as any).image || (s as any).key || ''
  }
  v = (typeof v === 'string' ? v : '').trim()
  if (!v) return ''
  if (/^(https?:|data:|blob:)/i.test(v)) return v
  return `${assetBase}/${fixPath(v)}`
}

const images = computed<string[]>(() => {
  const p: any = product.value || {}
  const raw = p?.images_full_url || p?.images || p?.gallery_images || p?.product?.images_full_url || p?.product?.images || p?.product?.gallery_images || []
  const arr = Array.isArray(raw) ? raw : (typeof raw === 'string' && raw.trim().startsWith('[') ? (JSON.parse(raw) as any[]) : (raw ? [raw] : []))
  const norm = arr.map((x: any) => normalize(x)).filter(Boolean)
  // Handle thumbnail specifically
  const thumbnailData = p?.thumbnail_full_url || p?.image_full_url || p?.photo_full_url || p?.thumbnail || p?.image || p?.photo || p?.product?.thumbnail_full_url || p?.product?.image_full_url || p?.product?.thumbnail || p?.product?.image
  const thumb = normalize(thumbnailData)
  return [...new Set([thumb, ...norm].filter(Boolean))]
})
const mainIndex = ref(0)
const mainImage = computed(() => images.value[mainIndex.value] || '')
const placeholderImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="16">No image</text></svg>'

const onImgErr = (e: Event) => {
  const el = e.target as HTMLImageElement | null
  if (!el) return
  el.src = placeholderImage
}

// Swiper configuration
const thumbsSwiper = ref(null)
const mainSwiper = ref(null)
const setThumbsSwiper = (swiper: any) => {
  if (swiper && swiper.el) {
    thumbsSwiper.value = swiper
  }
}
const setMainSwiper = (swiper: any) => {
  if (swiper && swiper.el) {
    mainSwiper.value = swiper
  }
}
const modules = [FreeMode, Navigation, Thumbs]

// Ensure Swiper is only initialized when images are available and product is loaded
const shouldShowSwiper = computed(() => {
  return !loading.value && !error.value && product.value && images.value.length > 0
})

// Add a small delay to ensure DOM is fully rendered
const swiperReady = ref(false)
watch(shouldShowSwiper, async (newVal) => {
  if (newVal) {
    await nextTick()
    setTimeout(() => {
      swiperReady.value = true
    }, 100)
  } else {
    swiperReady.value = false
  }
}, { immediate: true })

// Core fields
const title = computed(() => {
  const p: any = product.value || {}
  return p?.name || p?.product?.name || 'المنتج'
})
const brandName = computed(() => {
  const p: any = product.value || {}
  return p?.brand_name || p?.brand?.name || p?.product?.brand_name || p?.product?.brand?.name || ''
})

// Brand image
const brandImage = computed(() => {
  const p: any = product.value || {}
  const brand = p?.brand || p?.product?.brand
  
  if (!brand) return ''
  
  // Try different image sources in order of preference
  let imageSrc = brand?.image_full_url?.path || 
                 brand?.logo_full_url?.path || 
                 brand?.image_full_url || 
                 brand?.logo_full_url || 
                 brand?.image || 
                 brand?.logo || 
                 ''
  
  if (!imageSrc) return ''
  
  // If it's already a full URL, return as is
  if (/^(https?:|data:|blob:)/i.test(imageSrc)) {
    return imageSrc
  }
  
  // Normalize the path and build full URL
  return normalize(imageSrc)
})

// Brand ID for link
const brandId = computed(() => {
  const p: any = product.value || {}
  const brand = p?.brand || p?.product?.brand
  return brand?.id || p?.brand_id || p?.product?.brand_id || null
})

// Brand link
const brandLink = computed(() => {
  const id = brandId.value
  return id ? `/shop?brand=${id}` : '/shop'
})
const basePrice = computed<number>(() => {
  const p: any = product.value || {}
  const v = p?.unit_price ?? p?.price ?? p?.product?.unit_price ?? p?.product?.price
  const n = Number(v)
  return isFinite(n) && n > 0 ? n : 0
})
const discountValue = computed<number>(() => {
  const p: any = product.value || {}
  const v = p?.discount ?? p?.product?.discount ?? 0
  const n = Number(v)
  return isFinite(n) && n > 0 ? n : 0
})
const discountType = computed<string>(() => {
  const p: any = product.value || {}
  return p?.discount_type || p?.product?.discount_type || 'flat'
})
const finalPrice = computed<number>(() => {
  const bp = basePrice.value, dv = discountValue.value
  if (!bp || !dv) return bp
  const isPercent = String(discountType.value).toLowerCase().startsWith('per')
  const diff = isPercent ? (bp * dv) / 100 : dv
  return Math.max(0, bp - diff)
})
const hasDiscount = computed(() => finalPrice.value > 0 && finalPrice.value < basePrice.value)
const discountPercent = computed(() => {
  const bp = basePrice.value, dv = discountValue.value
  if (!bp || !dv) return 0
  const isPercent = String(discountType.value).toLowerCase().startsWith('per')
  return Math.max(0, Math.round(isPercent ? dv : (dv / bp) * 100))
})
const rating = computed<number>(() => {
  // Use API data if available, otherwise fallback to product data
  if (averageRating.value > 0) return averageRating.value
  
  const p: any = product.value || {}
  const r = p?.reviews_avg_rating ?? p?.avg_rating ?? p?.rating?.[0]?.average ?? 0
  const n = Number(r)
  return isFinite(n) ? Math.min(5, Math.max(0, n)) : 0
})
const reviewsCount = computed<number>(() => {
  // Use API data if available, otherwise fallback to product data
  if (totalReviewsCount.value > 0) return totalReviewsCount.value
  
  const p: any = product.value || {}
  const c = p?.reviews_count ?? p?.rating?.[0]?.count ?? 0
  const n = Number(c)
  return isFinite(n) ? Math.max(0, Math.round(n)) : 0
})
const inStock = computed<boolean>(() => {
  const p: any = product.value || {}
  const q = p?.current_stock ?? p?.stock ?? p?.quantity ?? p?.product?.current_stock ?? p?.product?.stock ?? 0
  return (Number(q) > 0) || p?.in_stock === true
})
const currencySymbol = computed(() => (product.value?.currency_symbol || 'ر.س'))

const currencyImage = computed(() => {
  return '/images/currency-symbol.png'
})
const description = computed(() => {
  const p: any = product.value || {}
  return p?.details ?? p?.description ?? p?.product?.details ?? p?.product?.description ?? ''
})

const metaDescription = computed(() => {
  const p: any = product.value || {}
  const result = p?.meta_description ?? p?.short_description ?? p?.product?.meta_description ?? p?.product?.short_description ?? ''
  // Clean up the text by removing \r\n and extra whitespace
  const cleaned = result.replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned
})

const specifications = computed(() => {
  const p: any = product.value || {}
  return p?.specifications ?? p?.product?.specifications ?? {}
})

const howToUse = computed(() => {
  const p: any = product.value || {}
  return p?.how_to_use ?? p?.usage_instructions ?? p?.product?.how_to_use ?? p?.product?.usage_instructions ?? ''
})

// Helper function to format date
const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '/')
}

// Helper function to mask customer name
const maskCustomerName = (name: string) => {
  if (!name) return '*****'
  if (name.length <= 2) return '*****' + name
  return '*****' + name.slice(-2)
}

// Active tab
const activeTab = ref('description')

// Auth and review modal
const showLoginModal = ref(false)
const auth = useAuth()
const { t } = useI18n()
const { $get, $post, $del } = useApi()

// Login form
const loginForm = ref({ email: '', password: '' })
const loginLoading = ref(false)
const loginError = ref('')


// Review form
const showReviewModal = ref(false)
const reviewForm = ref({
  rating: 5,
  comment: '',
  images: []
})
const reviewLoading = ref(false)
const reviewError = ref('')

// Handle write review button click
const handleWriteReview = () => {
  if (auth?.user?.value) {
    // User is logged in, show review form
    showReviewModal.value = true
    reviewForm.value = {
      rating: 5,
      comment: '',
      images: []
    }
  } else {
    // User is not logged in, show login modal
    showLoginModal.value = true
  }
}

// Submit review
const submitReview = async () => {
  if (!reviewForm.value.comment.trim()) {
    reviewError.value = 'يرجى كتابة تعليق'
    return
  }
  
  reviewLoading.value = true
  reviewError.value = ''
  
  try {
    const productId = product.value?.id || product.value?.product_id || product.value?.product?.id
    if (!productId) {
      reviewError.value = 'خطأ في معرف المنتج'
      return
    }
    
    const response = await $post('v1/products/reviews/submit-guest', {
      product_id: productId,
      rating: reviewForm.value.rating,
      comment: reviewForm.value.comment,
      images: reviewForm.value.images
    })
    
    if (response) {
      showReviewModal.value = false
      // Reload reviews
      await loadReviews()
      // Show success message
      console.log('تم إرسال التقييم بنجاح')
    }
  } catch (error: any) {
    console.error('Review submission error:', error)
    if (error?.data?.errors && Array.isArray(error.data.errors)) {
      const errorMessages = error.data.errors.map((err: any) => err.message).join(', ')
      reviewError.value = errorMessages
    } else {
      reviewError.value = error?.data?.message || 'خطأ في إرسال التقييم'
    }
  } finally {
    reviewLoading.value = false
  }
}

// Close review modal
const closeReviewModal = () => {
  showReviewModal.value = false
  reviewError.value = ''
  reviewForm.value = {
    rating: 5,
    comment: '',
    images: []
  }
}

// Reply functions
const showReplyModal = ref(false)
const selectedReviewId = ref<string | null>(null)
const replyText = ref('')
const replyLoading = ref(false)
const replyError = ref('')

const openReplyModal = (reviewId: string) => {
  selectedReviewId.value = reviewId
  replyText.value = ''
  replyError.value = ''
  showReplyModal.value = true
}

const closeReplyModal = () => {
  showReplyModal.value = false
  selectedReviewId.value = null
  replyText.value = ''
  replyError.value = ''
}

const submitReply = async () => {
  if (!replyText.value.trim()) {
    replyError.value = 'يرجى كتابة رد'
    return
  }
  
  replyLoading.value = true
  replyError.value = ''
  
  try {
    const response = await $post('v1/products/review/reply', {
      review_id: selectedReviewId.value,
      reply_text: replyText.value
    })
    
    if (response) {
      closeReplyModal()
      // Reload reviews
      await loadReviews()
    }
  } catch (error: any) {
    console.error('Reply submission error:', error)
    if (error?.data?.errors && Array.isArray(error.data.errors)) {
      const errorMessages = error.data.errors.map((err: any) => err.message).join(', ')
      replyError.value = errorMessages
    } else {
      replyError.value = error?.data?.message || 'خطأ في إرسال الرد'
    }
  } finally {
    replyLoading.value = false
  }
}

// Like functions
const likeReview = async (reviewId: string) => {
  try {
    const response = await $post('v1/products/review/like', {
      review_id: reviewId
    })
    
    if (response) {
      // Reload reviews to update likes count
      await loadReviews()
    }
  } catch (error: any) {
    console.error('Like error:', error)
  }
}

const unlikeReview = async (reviewId: string) => {
  try {
    const response = await $fetch(`/api/v1/products/review/like/${reviewId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { lang: 'sa' }
    })
    
    if (response) {
      // Reload reviews to update likes count
      await loadReviews()
    }
  } catch (error: any) {
    console.error('Unlike error:', error)
  }
}

// Register modal state
const showRegisterModal = ref(false)
const registerForm = ref({
  f_name: '',
  l_name: '',
  email: '',
  phone: '',
  password: '',
  password_confirmation: '',
  referral_code: ''
})
const registerLoading = ref(false)
const registerError = ref('')

// Handle register
const handleRegister = () => {
  showLoginModal.value = false
  showRegisterModal.value = true
  registerError.value = ''
  registerForm.value = {
    f_name: '',
    l_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    referral_code: ''
  }
}

// Close register modal
const closeRegisterModal = () => {
  showRegisterModal.value = false
  registerError.value = ''
  registerForm.value = {
    f_name: '',
    l_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    referral_code: ''
  }
}

// Handle register submission
const handleRegisterSubmit = async () => {
  if (!registerForm.value.f_name || !registerForm.value.l_name || !registerForm.value.email || !registerForm.value.phone || !registerForm.value.password) {
    registerError.value = 'جميع الحقول مطلوبة'
    return
  }

  if (registerForm.value.password !== registerForm.value.password_confirmation) {
    registerError.value = 'كلمة المرور غير متطابقة'
    return
  }

  if (registerForm.value.password.length < 6) {
    registerError.value = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
    return
  }

  registerLoading.value = true
  registerError.value = ''

  try {
    const response = await $post('v1/auth/register', {
      f_name: registerForm.value.f_name,
      l_name: registerForm.value.l_name,
      email: registerForm.value.email,
      phone: registerForm.value.phone,
      password: registerForm.value.password,
      referral_code: registerForm.value.referral_code || null
    })

    if (response?.token) {
      // Login successful
      auth.setToken(response.token)
      try {
        const userInfo = await $get('v1/customer/info')
        if (userInfo) {
          auth.setUser(userInfo)
        }
      } catch (e) {
        auth.setUser(response.user || response.data)
      }
      closeRegisterModal()
      handleLoginSuccess()
    } else if (response?.temporary_token) {
      // Need verification
      registerError.value = 'تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني أو رقم الهاتف'
      setTimeout(() => {
        closeRegisterModal()
      }, 3000)
    }
  } catch (error: any) {
    console.error('Register error:', error)
    if (error?.data?.errors && Array.isArray(error.data.errors)) {
      const errorMessages = error.data.errors.map((err: any) => err.message).join(', ')
      registerError.value = errorMessages
    } else {
      registerError.value = error?.data?.message || 'خطأ في إنشاء الحساب'
    }
  } finally {
    registerLoading.value = false
  }
}

// Handle login success
const handleLoginSuccess = () => {
  showLoginModal.value = false
  // Reload reviews after login
  loadReviews()
}

  // Cart handlers
const qty = ref(1)
const busy = ref(false)

// Variant selection
const selectedColor = ref('')
const selectedSize = ref('')
const selectedVariant = ref<any>(null)
const availableVariants = ref<any[]>([])
const availableColors = ref<any[]>([])
const availableSizes = ref<any[]>([])
const imageChanging = ref(false)


// Computed properties for variants
const filteredVariants = computed(() => {
  if (!product.value?.variation) return []
  
  let filtered = product.value.variation
  
  if (selectedColor.value) {
    filtered = filtered.filter((v: any) => v.type.startsWith(selectedColor.value))
  }
  
  if (selectedSize.value) {
    filtered = filtered.filter((v: any) => v.type.endsWith(selectedSize.value))
  }
  
  return filtered
})

const currentVariantPrice = computed(() => {
  console.log('حساب السعر:', {
    hasSelectedVariant: !!selectedVariant.value,
    selectedVariant: selectedVariant.value,
    variantPrice: selectedVariant.value?.price,
    finalPrice: finalPrice.value,
    basePrice: basePrice.value,
    discountValue: discountValue.value,
    discountType: discountType.value
  })

  if (selectedVariant.value && selectedVariant.value.price) {
    // استخدم سعر المتغير مباشرة
    const variantBasePrice = selectedVariant.value.price
    const variantDiscount = discountValue.value
    const variantDiscountType = discountType.value

    console.log('حساب سعر المتغير:', {
      selectedVariantPrice: selectedVariant.value.price,
      basePrice: basePrice.value,
      usingVariantPrice: variantBasePrice,
      variantDiscount,
      variantDiscountType
    })

    // إذا كان هناك خصم، احسبه
    if (variantDiscount && variantDiscount > 0) {
      const isPercent = String(variantDiscountType).toLowerCase().startsWith('per')
      const discountAmount = isPercent ? (variantBasePrice * variantDiscount) / 100 : variantDiscount
      const finalVariantPrice = Math.max(0, variantBasePrice - discountAmount)
      console.log('سعر المتغير بعد الخصم:', {
        basePrice: variantBasePrice,
        discount: variantDiscount,
        discountType: variantDiscountType,
        isPercent,
        discountAmount,
        finalPrice: finalVariantPrice
      })
      return finalVariantPrice
    }

    // إذا لم يكن هناك خصم، استخدم السعر الأساسي للمتغير
    console.log('سعر المتغير بدون خصم:', variantBasePrice)
    return variantBasePrice
  }

  console.log('استخدام السعر النهائي:', finalPrice.value)
  return finalPrice.value
})

const currentVariantStock = computed(() => {
  if (selectedVariant.value) {
    return selectedVariant.value.qty
  }
  return inStock.value
})

const currentVariantSku = computed(() => {
  if (selectedVariant.value) {
    return selectedVariant.value.sku
  }
  return ''
})
// Initialize variants when product loads
const initializeVariants = () => {
  if (!product.value) return
  
  // Initialize colors with proper image mapping
  if (product.value.colors_formatted && Array.isArray(product.value.colors_formatted)) {
    availableColors.value = product.value.colors_formatted.map((color: any) => {
      // Find corresponding image from color_images_full_url
      const colorImage = product.value.color_images_full_url?.find((img: any) => 
        img.color === color.code
      )
      
      const colorData = {
        name: color.name,
        code: color.code,
        image: colorImage?.image_name?.path || color.image || '',
        originalImage: colorImage?.image_name?.key || color.image || '',
        imageName: colorImage?.image_name?.key || color.image || ''
      }
      
      console.log(`تم تهيئة اللون: ${color.name}`, colorData)
      return colorData
    })
  } else if (product.value.colors && Array.isArray(product.value.colors)) {
    availableColors.value = product.value.colors.map((color: string, index: number) => {
      // Find corresponding image from color_images_full_url
      const colorImage = product.value.color_images_full_url?.find((img: any) => 
        img.color === color
      )
      
      const colorData = {
        name: `Color ${index + 1}`,
        code: color,
        image: colorImage?.image_name?.path || '',
        originalImage: colorImage?.image_name?.key || '',
        imageName: colorImage?.image_name?.key || ''
      }
      
      console.log(`تم تهيئة اللون: ${colorData.name}`, colorData)
      return colorData
    })
  }
  
  // Debug: Print available images
  console.log('الصور المتاحة:', images.value.map((img, index) => ({
    index,
    url: img,
    filename: img.split('/').pop()
  })))
  
  // Initialize sizes from choice_options
  if (product.value.choice_options && Array.isArray(product.value.choice_options)) {
    const sizeOption = product.value.choice_options.find((option: any) => 
      option.title === 'Size' || option.name === 'choice_2'
    )
    if (sizeOption && sizeOption.options) {
      availableSizes.value = sizeOption.options.map((size: string) => ({
        name: size,
        value: size
      }))
    }
  }
  
  // Set initial selections
  if (availableColors.value.length > 0) {
    selectedColor.value = availableColors.value[0].name
    console.log('تم تعيين اللون الأولي:', selectedColor.value)
  }
  if (availableSizes.value.length > 0) {
    selectedSize.value = availableSizes.value[0].value
    console.log('تم تعيين الحجم الأولي:', selectedSize.value)
  }
  
  // Update selected variant
  console.log('قبل تحديث المتغير الأولي:', {
    selectedColor: selectedColor.value,
    selectedSize: selectedSize.value,
    variations: product.value.variation
  })
  updateSelectedVariant()
  console.log('بعد تحديث المتغير الأولي:', {
    selectedVariant: selectedVariant.value,
    currentPrice: currentVariantPrice.value
  })
}

// Update selected variant based on current selections
const updateSelectedVariant = () => {
  if (!product.value?.variation) return
  
  console.log('البحث عن المتغير:', {
    selectedColor: selectedColor.value,
    selectedSize: selectedSize.value,
    hasColors: availableColors.value.length > 0,
    searchPattern: `${selectedColor.value}-${selectedSize.value}`,
    availableVariations: product.value.variation
  })
  
  let variant = null
  
  // If product has no colors, search by size directly
  if (!selectedColor.value || availableColors.value.length === 0) {
    if (selectedSize.value) {
      variant = product.value.variation.find((v: any) => 
        v.type === selectedSize.value || v.type === String(selectedSize.value)
      )
    }
  } else {
    // If product has colors, search by color-size combination
    // Try different search patterns
    variant = product.value.variation.find((v: any) => 
      v.type === `${selectedColor.value}-${selectedSize.value}`
    )
    
    // If not found, try with different separators
    if (!variant) {
      variant = product.value.variation.find((v: any) => 
        v.type === `${selectedColor.value}_${selectedSize.value}` ||
        v.type === `${selectedColor.value} ${selectedSize.value}` ||
        v.type === `${selectedColor.value}/${selectedSize.value}`
      )
    }
    
    // If still not found, try partial matches
    if (!variant) {
      variant = product.value.variation.find((v: any) => 
        v.type.includes(selectedColor.value) && v.type.includes(selectedSize.value)
      )
    }
  }
  
  selectedVariant.value = variant || null
  
  console.log('النتيجة:', {
    found: !!variant,
    variant: variant,
    selectedVariant: selectedVariant.value
  })
}

// Handle color selection
const selectColor = (color: any) => {
  console.log('اختيار اللون:', color)
  selectedColor.value = color.name
  console.log('تم تعيين اللون المختار:', selectedColor.value)
  
  updateSelectedVariant()
  
  console.log('بعد تحديث المتغير:', {
    selectedColor: selectedColor.value,
    selectedSize: selectedSize.value,
    selectedVariant: selectedVariant.value,
    currentPrice: currentVariantPrice.value
  })
  
  // Update main image if color has specific image
  if (color.imageName || color.originalImage) {
    const targetImageName = color.imageName || color.originalImage
    const imageIndex = findImageIndexByName(targetImageName)
    
    if (imageIndex !== -1) {
      imageChanging.value = true
      
      // Update mainIndex - watch will handle Swiper update
      mainIndex.value = imageIndex
      
      // Hide loading after transition
      setTimeout(() => {
        imageChanging.value = false
      }, 300)
      
      console.log(`تم تغيير الصورة إلى: ${color.name} - ${targetImageName}`)
    } else {
      console.log(`لم يتم العثور على صورة للون: ${color.name} - ${targetImageName}`)
      console.log('الصور المتاحة:', images.value.map(img => img.split('/').pop()))
    }
  }
}

// Handle size selection
const selectSize = (size: any) => {
  console.log('اختيار الحجم:', size)
  selectedSize.value = size.value
  console.log('تم تعيين الحجم المختار:', selectedSize.value)
  
  updateSelectedVariant()
  
  console.log('بعد تحديث المتغير:', {
    selectedColor: selectedColor.value,
    selectedSize: selectedSize.value,
    selectedVariant: selectedVariant.value,
    currentPrice: currentVariantPrice.value
  })
}

// Check if size is available
const isSizeAvailable = (sizeValue: string) => {
  if (!product.value?.variation) return true
  
  // If product has no colors, search by size directly
  if (!selectedColor.value || availableColors.value.length === 0) {
    const variant = product.value.variation.find((v: any) => 
      v.type === sizeValue || v.type === String(sizeValue)
    )
    return variant && variant.qty > 0
  }
  
  // If product has colors, search by color-size combination
  const variant = product.value.variation.find((v: any) => 
    v.type === `${selectedColor.value}-${sizeValue}` ||
    v.type === `${selectedColor.value}_${sizeValue}` ||
    v.type === `${selectedColor.value} ${sizeValue}` ||
    v.type === `${selectedColor.value}/${sizeValue}` ||
    (v.type.includes(selectedColor.value) && v.type.includes(sizeValue))
  )
  
  return variant && variant.qty > 0
}

// Helper function to find image index by name
const findImageIndexByName = (imageName: string) => {
  if (!imageName) return -1
  
  console.log(`البحث عن الصورة: ${imageName}`)
  
  // First try exact match
  let index = images.value.findIndex(img => {
    const imgFilename = img.split('/').pop()?.split('?')[0]
    const match = imgFilename === imageName
    if (match) console.log(`تم العثور على مطابقة دقيقة: ${imgFilename}`)
    return match
  })
  
  if (index !== -1) return index
  
  // Try partial match
  index = images.value.findIndex(img => {
    const match = img.includes(imageName)
    if (match) console.log(`تم العثور على مطابقة جزئية: ${img}`)
    return match
  })
  if (index !== -1) return index
  
  // Try without extension
  const nameWithoutExt = imageName.split('.')[0]
  index = images.value.findIndex(img => {
    const imgFilename = img.split('/').pop()?.split('?')[0]?.split('.')[0]
    const match = imgFilename === nameWithoutExt
    if (match) console.log(`تم العثور على مطابقة بدون امتداد: ${imgFilename}`)
    return match
  })
  
  if (index === -1) {
    console.log(`لم يتم العثور على الصورة: ${imageName}`)
    console.log('الصور المتاحة:', images.value.map(img => img.split('/').pop()))
  }
  
  return index
}

const addToCart = async () => {
  if (busy.value || !product.value) return
  const id = product.value?.id || product.value?.product_id || product.value?.product?.id
  if (!id) return
  
  // Check if variant is required but not selected
  if (availableColors.value.length > 0 && !selectedColor.value) {
    showSuccess('يرجى اختيار لون أولاً')
    return
  }
  
  if (availableSizes.value.length > 0 && !selectedSize.value) {
    showSuccess('يرجى اختيار حجم أولاً')
    return
  }
  
  // Check stock availability
  if (!currentVariantStock.value) {
    showSuccess('هذا المتغير غير متوفر حالياً')
    return
  }
  
  try {
    busy.value = true
    
    // Prepare cart data with variant info
    const cartData: any = { 
      product_id: Number(id), 
      quantity: qty.value 
    }
    
    // Add variant info if available
    if (selectedVariant.value) {
      cartData.variant_type = selectedVariant.value.type
      cartData.sku = selectedVariant.value.sku
      cartData.color = selectedColor.value
      cartData.size = selectedSize.value
    }
    
    // Add color and size info even if no variant
    if (selectedColor.value) {
      cartData.color = selectedColor.value
    }
    if (selectedSize.value) {
      cartData.size = selectedSize.value
    }
    
    // Add current price (with discount already applied)
    cartData.price = currentVariantPrice.value
    
    // Store original base price for backend reference
    if (selectedVariant.value && selectedVariant.value.price) {
      cartData.base_price = selectedVariant.value.price
    } else {
      cartData.base_price = basePrice.value
    }
    
    // Add discount info if available
    if (discountValue.value > 0) {
      cartData.discount = discountValue.value
      cartData.discount_type = discountType.value
    }
    
    // Add variant info for better tracking
    if (selectedVariant.value) {
      cartData.variant = `${selectedColor.value || ''}-${selectedSize.value || ''}`.replace(/^-|-$/g, '')
    }
    
    console.log('إضافة للسلة:', cartData)
    console.log('selectedVariant:', selectedVariant.value)
    console.log('selectedColor:', selectedColor.value)
    console.log('selectedSize:', selectedSize.value)
    console.log('currentVariantPrice:', currentVariantPrice.value)
    console.log('basePrice:', basePrice.value)
    console.log('discountValue:', discountValue.value)
    console.log('discountType:', discountType.value)
    console.log('finalPrice:', finalPrice.value)
    console.log('hasDiscount:', hasDiscount.value)
    
    await cart.add(cartData)
    // Refresh cart to update counts and totals
    await cart.list()
    console.log('تم إرسال البيانات للسلة')
    
    // Show success message
    let message = 'تم إضافة المنتج للسلة بنجاح'
    if (selectedVariant.value) {
      message += ` (${selectedVariant.value.type})`
    }
    if (qty.value > 1) {
      message += ` - الكمية: ${qty.value}`
    }
    showSuccess(message)
    
    // Reset quantity to 1 after successful add
    qty.value = 1
    
  } catch (error: any) {
    console.error('خطأ في إضافة المنتج للسلة:', error)
    showSuccess('حدث خطأ في إضافة المنتج للسلة')
  } finally {
    busy.value = false
  }
}
// Login functions
async function handleLogin() {
  if (!loginForm.value.email || !loginForm.value.password) {
    loginError.value = t('login.required_fields') || 'جميع الحقول مطلوبة'
    return
  }
  
  loginLoading.value = true
  loginError.value = ''
  
  try {
    const response = await $post('v1/auth/login', {
      email_or_phone: loginForm.value.email,
      password: loginForm.value.password,
      type: 'email'
    })
    
    // Handle different response formats
    if (response?.access_token) {
      auth.setToken(response.access_token)
      // Try to get user info
      try {
        const userInfo = await $get('v1/customer/info')
        if (userInfo) auth.setUser(userInfo)
      } catch (e) {
        // If user info fails, still set token
        auth.setUser(response.user || response.data)
      }
      showLoginModal.value = false
      loginForm.value = { email: '', password: '' }
    } else if (response?.token) {
      auth.setToken(response.token)
      auth.setUser(response.user || response.data)
      showLoginModal.value = false
      loginForm.value = { email: '', password: '' }
    }
  } catch (error: any) {
    console.error('Login error:', error)
    // Handle validation errors
    if (error?.data?.errors && Array.isArray(error.data.errors)) {
      const errorMessages = error.data.errors.map((err: any) => err.message).join(', ')
      loginError.value = errorMessages
    } else {
      loginError.value = error?.data?.message || t('login.error') || 'خطأ في تسجيل الدخول'
    }
  } finally {
    loginLoading.value = false
  }
}

function openLoginModal() {
  showLoginModal.value = true
  loginError.value = ''
  loginForm.value = { email: '', password: '' }
}

// Wishlist functions
async function checkWishlistStatus() {
  if (!auth?.user?.value || !product.value?.id) return
  
  try {
    const response = await $get('v1/customer/wish-list/')
    if (response && Array.isArray(response)) {
      isInWishlist.value = response.some((item: any) => item.product_id === product.value.id)
    }
  } catch (error) {
    console.error('Error checking wishlist status:', error)
  }
}

async function toggleWishlist() {
  if (!auth?.user?.value) {
    showLoginModal.value = true
    return
  }
  
  if (!product.value?.id) return
  
  wishlistLoading.value = true
  
  try {
    if (isInWishlist.value) {
      // Remove from wishlist
      await $del('v1/customer/wish-list/remove', {
        params: { product_id: product.value.id }
      })
      isInWishlist.value = false
      console.log('تم إزالة المنتج من المفضلة')
    } else {
      // Add to wishlist
      await $post('v1/customer/wish-list/add', {
        product_id: product.value.id
      })
      isInWishlist.value = true
      console.log('تم إضافة المنتج إلى المفضلة')
    }
  } catch (error: any) {
    console.error('Error toggling wishlist:', error)
    if (error?.data?.message) {
      console.error('Error message:', error.data.message)
    }
  } finally {
    wishlistLoading.value = false
  }
}

function closeLoginModal() {
  showLoginModal.value = false
  loginError.value = ''
  loginForm.value = { email: '', password: '' }
}
// Load reviews
const loadReviews = async () => {
  if (!product.value) return
  
  reviewsLoading.value = true
  reviewsError.value = ''
  
  try {
    const productId = product.value?.id || product.value?.product_id || product.value?.product?.id
    if (!productId) return
    
    // Load reviews using $get from useApi
    const reviewsResponse = await $get(`v1/products/reviews/${productId}`)
    
    // Handle different response structures
    if (Array.isArray(reviewsResponse)) {
      reviews.value = reviewsResponse
    } else if (Array.isArray(reviewsResponse?.data)) {
      reviews.value = reviewsResponse.data
    } else if (Array.isArray(reviewsResponse?.reviews)) {
      reviews.value = reviewsResponse.reviews
    } else {
      reviews.value = []
    }
    
    totalReviewsCount.value = reviews.value.length
    
    // Calculate average rating from reviews
    if (reviews.value.length > 0) {
      const sum = reviews.value.reduce((acc: number, review: any) => {
        const rating = Number(review?.rating || review?.stars || 0)
        return acc + rating
      }, 0)
      averageRating.value = sum / reviews.value.length
    } else {
      // Try to load rating separately if no reviews
      try {
        const ratingResponse = await $get(`v1/products/rating/${productId}`)
        averageRating.value = Number(ratingResponse) || 0
      } catch (ratingError) {
        console.warn('Could not load rating:', ratingError)
        averageRating.value = 0
      }
    }
    
  } catch (e: any) {
    console.error('Error loading reviews:', e)
    // If it's a 404, it means no reviews exist yet
    if (e?.status === 404 || e?.statusCode === 404) {
      reviews.value = []
      totalReviewsCount.value = 0
      averageRating.value = 0
      reviewsError.value = ''
    } else {
      reviewsError.value = e?.data?.message || 'تعذر تحميل التقييمات'
    }
  } finally {
    reviewsLoading.value = false
  }
}

// Calculate rating distribution (5 stars, 4 stars, etc.)
const ratingDistribution = computed(() => {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  
  reviews.value.forEach((review: any) => {
    const rating = Math.round(Number(review?.rating || review?.stars || 0))
    if (rating >= 1 && rating <= 5) {
      distribution[rating as keyof typeof distribution]++
    }
  })
  
  return distribution
})

// Calculate percentage for each rating
const getRatingPercentage = (stars: number): number => {
  if (totalReviewsCount.value === 0) return 0
  const distribution = ratingDistribution.value
  const count = distribution[stars as keyof typeof distribution] || 0
  return Math.round((count / totalReviewsCount.value) * 100)
}

// Guest review form
const guestReviewForm = ref({
  rating: 5,
  comment: '',
  name: '',
  email: ''
})

const guestReviewLoading = ref(false)
const guestReviewError = ref('')

// Submit guest review
const submitGuestReview = async (e: Event) => {
  e.preventDefault()
  
  if (!guestReviewForm.value.comment.trim()) {
    guestReviewError.value = 'يرجى كتابة تعليق'
    return
  }
  
  if (!guestReviewForm.value.name.trim()) {
    guestReviewError.value = 'يرجى إدخال الاسم'
    return
  }
  
  if (!guestReviewForm.value.email.trim()) {
    guestReviewError.value = 'يرجى إدخال البريد الإلكتروني'
    return
  }
  
  guestReviewLoading.value = true
  guestReviewError.value = ''
  
  try {
    const productId = product.value?.id || product.value?.product_id || product.value?.product?.id
    if (!productId) {
      guestReviewError.value = 'خطأ في معرف المنتج'
      return
    }
    
    const response = await $post('v1/products/reviews/submit-guest', {
      product_id: productId,
      rating: guestReviewForm.value.rating,
      comment: guestReviewForm.value.comment,
      name: guestReviewForm.value.name,
      email: guestReviewForm.value.email
    })
    
    if (response) {
      // Reset form
      guestReviewForm.value = {
        rating: 5,
        comment: '',
        name: '',
        email: ''
      }
      
      // Reload reviews
      await loadReviews()
      
      // Show success message
      showSuccess('تم إرسال التقييم بنجاح')
    }
  } catch (error: any) {
    console.error('Guest review submission error:', error)
    if (error?.data?.errors && Array.isArray(error.data.errors)) {
      const errorMessages = error.data.errors.map((err: any) => err.message).join(', ')
      guestReviewError.value = errorMessages
    } else {
      guestReviewError.value = error?.data?.message || 'خطأ في إرسال التقييم'
    }
  } finally {
    guestReviewLoading.value = false
  }
}

// Loaders
const load = async () => {
  loading.value = true
  loadingProgress.value = 0
  error.value = ''
  
  // Simulate progress
  const progressInterval = setInterval(() => {
    if (loadingProgress.value < 90) {
      loadingProgress.value += Math.random() * 30
    }
  }, 200)
  
  try {
    const res = await getDetails(slug.value)
    product.value = res
    loadingProgress.value = 50
    
    // Initialize variants after product is loaded
    initializeVariants()
    loadingProgress.value = 70
    
    // Wait for DOM to be ready before initializing Swiper
    await nextTick()
    loadingProgress.value = 80
    
    // Load reviews after product is loaded
    await loadReviews()
    loadingProgress.value = 90
    
    // Complete progress
    loadingProgress.value = 100
    clearInterval(progressInterval)
  } catch (e: any) {
    error.value = e?.data?.message || 'تعذر تحميل تفاصيل المنتج'
    clearInterval(progressInterval)
  } finally {
    loading.value = false
    loadingProgress.value = 0
  }
  // Load recommended
  try {
    recLoading.value = true
    const id = product.value?.id || product.value?.product_id || product.value?.product?.id
    if (id) {
      const list = await getRelated(id)
      recommended.value = Array.isArray(list) ? list : []
    } else {
      recommended.value = []
    }
  } catch {
    recommended.value = []
  } finally {
    recLoading.value = false
  }
}

onMounted(async () => {
  // Load wishlist and cart first
  try {
    await Promise.all([
      wishlist.list(),
      cart.list()
    ])
  } catch (error) {
    console.error('Failed to load wishlist or cart:', error)
  }
  
  load()
  // Check wishlist status after product loads
  watch(product, () => {
    if (product.value) {
      checkWishlistStatus()
    }
  }, { immediate: true })
  
  // Check wishlist status when user logs in
  watch(() => auth?.user?.value, () => {
    if (auth?.user?.value && product.value) {
      checkWishlistStatus()
    }
  })
  
  // Add escape key listener for modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (showLoginModal.value) {
        closeLoginModal()
      } else if (showReviewModal.value) {
        closeReviewModal()
      } else if (showReplyModal.value) {
        closeReplyModal()
      }
    }
  })
})
watch(slug, () => { mainIndex.value = 0; load() })

// Watch for mainIndex changes and update Swiper
watch(mainIndex, (newIndex) => {
  nextTick(() => {
    if (mainSwiper.value && (mainSwiper.value as any).slideTo) {
      (mainSwiper.value as any).slideTo(newIndex, 300)
    }
    if (thumbsSwiper.value && (thumbsSwiper.value as any).slideTo) {
      (thumbsSwiper.value as any).slideTo(newIndex, 300)
    }
  })
})

// Helper functions for modal
const getProductBrand = (product: any): { name: string; id: number | null; image: string } => {
  if (!product) return { name: '', id: null, image: '' }
  
  const brand = product?.brand || product?.product?.brand
  const brandName = product?.brand_name || product?.brand?.name || product?.product?.brand_name || product?.product?.brand?.name || ''
  const brandId = product?.brand_id || product?.brand?.id || product?.product?.brand_id || product?.product?.brand?.id || null
  
  let brandImage = ''
  if (brand) {
    const imgSrc = brand?.image_full_url?.path || 
                   brand?.logo_full_url?.path || 
                   brand?.image_full_url || 
                   brand?.logo_full_url || 
                   brand?.image || 
                   brand?.logo || 
                   ''
    if (imgSrc) {
      if (/^(https?:|data:|blob:)/i.test(imgSrc)) {
        brandImage = imgSrc
      } else {
        brandImage = normalize(imgSrc)
      }
    }
  }
  
  return { name: brandName, id: brandId, image: brandImage || '/images/Group 1171274840.png' }
}

const getProductCategories = (product: any): Array<{ id: number | string; name: string }> => {
  if (!product) return []
  
  const categories = product?.categories || product?.category || product?.product?.categories || product?.product?.category
  
  if (Array.isArray(categories)) {
    return categories
      .filter((cat: any) => cat && (cat.name || cat.category_name || cat.title))
      .map((cat: any) => ({
        id: cat.id || cat.category_id || '',
        name: cat.name || cat.category_name || cat.title || ''
      }))
  }
  
  if (categories && typeof categories === 'object') {
    return [{
      id: categories.id || categories.category_id || '',
      name: categories.name || categories.category_name || categories.title || ''
    }]
  }
  
  return []
}

const getProductLink = (product: any): string => {
  if (!product) return '#'
  const slug = product?.slug || product?.product?.slug
  return slug ? `/product/${encodeURIComponent(String(slug))}` : '#'
}

// Computed properties for modal
const modalProductImage = computed(() => getProductImage(selectedProductForModal.value))
const modalProductTitle = computed(() => getProductTitle(selectedProductForModal.value))
const modalProductPrice = computed(() => getProductPrice(selectedProductForModal.value))
const modalProductBrand = computed(() => getProductBrand(selectedProductForModal.value))
const modalProductCategories = computed(() => getProductCategories(selectedProductForModal.value))
const modalProductLink = computed(() => getProductLink(selectedProductForModal.value))

// Share functions
const shareUrl = computed(() => {
  if (process.client && modalProductLink.value !== '#') {
    return window.location.origin + modalProductLink.value
  }
  return ''
})

const shareText = computed(() => {
  return `تحقق من ${modalProductTitle.value} - ${modalProductBrand.value.name}`
})

const shareOnFacebook = () => {
  if (process.client && shareUrl.value) {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl.value)}`, '_blank')
  }
}

const shareOnTelegram = () => {
  if (process.client && shareUrl.value) {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl.value)}&text=${encodeURIComponent(shareText.value)}`, '_blank')
  }
}

const shareOnSnapchat = () => {
  if (process.client && shareUrl.value) {
    window.open(`https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(shareUrl.value)}`, '_blank')
  }
}

const shareOnLinkedIn = () => {
  if (process.client && shareUrl.value) {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl.value)}`, '_blank')
  }
}

// Check if product has variants/options
const hasProductOptions = computed(() => {
  if (!selectedProductForModal.value) return false
  const product = selectedProductForModal.value
  
  // Check for colors
  const hasColors = (product?.colors_formatted && Array.isArray(product.colors_formatted) && product.colors_formatted.length > 0) ||
                    (product?.colors && Array.isArray(product.colors) && product.colors.length > 0) ||
                    (product?.product?.colors_formatted && Array.isArray(product.product.colors_formatted) && product.product.colors_formatted.length > 0) ||
                    (product?.product?.colors && Array.isArray(product.product.colors) && product.product.colors.length > 0)
  
  // Check for sizes
  const hasSizes = (product?.choice_options && Array.isArray(product.choice_options)) ||
                   (product?.product?.choice_options && Array.isArray(product.product.choice_options))
  
  // Check for variations
  const hasVariations = (product?.variation && Array.isArray(product.variation) && product.variation.length > 0) ||
                        (product?.product?.variation && Array.isArray(product.product.variation) && product.product.variation.length > 0)
  
  return hasColors || hasSizes || hasVariations
})

// Loading state for modal add to cart
const isAddingToCart = ref(false)

// Function to open cart dropdown
const openCartDropdown = () => {
  if (process.client) {
    const event = new CustomEvent('open-cart')
    window.dispatchEvent(event)
  }
}

// Add to cart function for modal
const handleModalAddToCart = async () => {
  if (!selectedProductForModal.value || isAddingToCart.value) return
  
  try {
    isAddingToCart.value = true
    const product = selectedProductForModal.value
    const productId = product?.id || product?.product_id
    if (!productId) {
      console.error('Product ID not found')
      return
    }
    
    const priceData = modalProductPrice.value
    const cartData: any = {
      product_id: Number(productId),
      quantity: 1,
      price: priceData.final,
      base_price: priceData.old
    }
    
    if (priceData.hasDiscount) {
      cartData.discount = Number(product?.discount ?? product?.product?.discount ?? 0)
      cartData.discount_type = product?.discount_type || product?.product?.discount_type || 'flat'
    }
    
    if (product?.variant) cartData.variant = product.variant
    if (product?.color) cartData.color = product.color
    if (product?.size) cartData.size = product.size
    if (product?.variant_type) cartData.variant_type = product.variant_type
    if (product?.sku) cartData.sku = product.sku
    
    await cart.add(cartData)
    
    // Show success message
    showSuccess('تم إضافة السلة بنجاح')
    
    // Open cart dropdown
    openCartDropdown()
    
    // Close modal
    if (process.client) {
      const modalElement = document.getElementById('exampleModal')
      if (modalElement) {
        const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement)
        if (modal) {
          modal.hide()
        }
      }
    }
    
    console.log('✅ تم إضافة المنتج للسلة بنجاح')
  } catch (error: any) {
    console.error('❌ خطأ في إضافة المنتج للسلة:', error)
    showSuccess('حدث خطأ في إضافة المنتج للسلة')
  } finally {
    isAddingToCart.value = false
  }
}

// Function to close modal and navigate to product page
const handleProductDetails = () => {
  if (process.client) {
    const modalElement = document.getElementById('exampleModal')
    if (modalElement) {
      const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement)
      if (modal) {
        modal.hide()
      }
    }
  }
}
</script>

<template>
  <div class="wrap" dir="rtl">
    <div class="crumbs">
      <NuxtLink to="/">الرئيسية</NuxtLink>
      <span>/</span>
      <NuxtLink to="/shop">المتجر</NuxtLink>
      <span>/</span>
      <b>{{ title }}</b>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="product-loading">
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-progress">
          <div class="progress-bar" :style="{ width: loadingProgress + '%' }"></div>
        </div>
        <span class="loading-text">{{ t('loading') || 'جارٍ التحميل…' }}</span>
      </div>
      
      <!-- Skeleton Product Layout -->
      <div class="skeleton-product">
        <div class="skeleton-gallery">
          <div class="skeleton-main-image"></div>
          <div class="skeleton-thumbnails">
            <div v-for="n in 4" :key="n" class="skeleton-thumbnail"></div>
          </div>
        </div>
        <div class="skeleton-info">
          <div class="skeleton-brand"></div>
          <div class="skeleton-title"></div>
          <div class="skeleton-rating"></div>
          <div class="skeleton-price"></div>
          <div class="skeleton-variants">
            <div class="skeleton-color-options">
              <div v-for="n in 3" :key="n" class="skeleton-color"></div>
            </div>
            <div class="skeleton-size-options">
              <div v-for="n in 4" :key="n" class="skeleton-size"></div>
            </div>
          </div>
          <div class="skeleton-add-to-cart"></div>
        </div>
      </div>
    </div>
    
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="product">
      <!-- Gallery -->
      <div class="gallery">
        <div class="gallery-container">

        </div>
        <!-- Main Swiper Gallery -->
        <div v-if="!shouldShowSwiper" class="no-images">
          <div class="no-images-content">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
            <p>لا توجد صور متاحة</p>
          </div>
        </div>
        <SwiperComponent
          v-if="swiperReady"
          :key="`main-swiper-${images.length}`"
          :style="{
            '--swiper-navigation-color': '#fff',
            '--swiper-pagination-color': '#fff',
          }"
          :space-between="10"
          :navigation="images.length > 1"
          :thumbs="{ swiper: thumbsSwiper }"
          :modules="modules"
          @swiper="setMainSwiper"
          class="mySwiper2"
        >
          <SwiperSlideComponent v-for="(img, i) in images" :key="`main-${i}-${img}`">
            <div class="image-container">
              <img :src="img" :alt="title" @error="onImgErr" />
              <div v-if="imageChanging && i === mainIndex" class="image-loading">
                <div class="loading-spinner"></div>
                <span>جاري تغيير الصورة...</span>
              </div>
            </div>
          </SwiperSlideComponent>
        </SwiperComponent>
        <!-- Thumbnails Swiper Gallery -->
        <SwiperComponent
          v-if="swiperReady && images.length > 1"
          :key="`thumbs-swiper-${images.length}`"
          @swiper="setThumbsSwiper"
          :space-between="10"
          :slides-per-view="4"
          :free-mode="true"
          :watch-slides-progress="true"
          :modules="modules"
          class="mySwiper"
        >
          <SwiperSlideComponent v-for="(img, i) in images" :key="`thumb-${i}-${img}`">
            <img :src="img" :alt="'img-'+i" />
          </SwiperSlideComponent>
        </SwiperComponent>
          <div class="product-description">
            <h3>{{ title }}</h3>
            <p v-if="metaDescription" class="benefit-text">{{ metaDescription }}</p>
          </div>
          <div class="specifications">
            <div v-if="description" class="description-text" v-html="description"></div>
            <div v-if="Object.keys(metaDescription).length === 0" class="no-content">
              لا توجد مواصفات متاحة
            </div>
          </div>

      </div>

      <!-- Info -->
      <div class="info">
        <!-- Brand & Wishlist -->
        <div class="brand-section">
          <div class="brand-info">
            <span v-if="brandName" class="brand">{{ brandName }}</span>
            <span class="original-badge">100% أصلي</span>
          </div>
          <button 
            class="wishlist-btn" 
            :class="{ active: isInWishlist }"
            @click="toggleWishlist"
            :disabled="wishlistLoading"
          >
            <svg v-if="wishlistLoading" width="20" height="20" viewBox="0 0 24 24" class="spinner">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
              </circle>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" :fill="isInWishlist ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
        <div v-if="brandName" class="brands-popup d-flex align-items-center gap-2">
          <NuxtLink :to="brandLink" class="text-decoration-none">
            <picture>
              <img 
                class="cover-image-class" 
                :src="brandImage || '/images/Group 1171274840.png'" 
                :alt="brandName"
                @error="(e: any) => { e.target.src = '/images/Group 1171274840.png' }"
              >
            </picture>
          </NuxtLink>
        </div>
        <h1 class="title">{{ title }}</h1>
        
        <!-- Rating -->
        <div class="rating-section">
          <div class="stars">
            <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= Math.round(rating) }">★</span>
          </div>
          <span class="rating-text">({{ reviewsCount }}) التقييمات</span>
        </div>

        <!-- Price -->
        <div class="price-section">
          <div class="price-main">{{ currentVariantPrice.toLocaleString() }} <img src="/images/Group 1171274840 (1).png" alt="ر.س" class="currency-icon" /></div>
          <div v-if="hasDiscount" class="price-old">{{ basePrice.toLocaleString() }} <img src="/images/Group 1171274840 (1).png" alt="ر.س" class="currency-icon" /></div>
          <div v-if="hasDiscount" class="discount-badge">-{{ discountPercent }}%</div>
        </div>

        <!-- Color Selection -->
        <div v-if="availableColors.length > 0" class="variant-section">
          <h4 class="variant-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            اختر اللون
          </h4>
          <div class="color-options">
            <div
              v-for="color in availableColors"
              :key="color.code"
              class="color-option-wrapper"
              :class="{ active: selectedColor === color.name }"
            >
              <button
                class="color-option"
                :class="{ active: selectedColor === color.name }"
                :style="{ backgroundColor: color.code }"
                @click="selectColor(color)"
                :title="color.name"
              >
                <div v-if="color.image" class="color-image">
                  <img :src="color.image" :alt="color.name" @error="onImgErr" />
                </div>
                <div v-else class="color-circle" :style="{ backgroundColor: color.code }"></div>
                <span class="color-name">{{ color.name }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Size Selection -->
        <div v-if="availableSizes.length > 0" class="variant-section">
          <h4 class="variant-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            اختر الحجم
          </h4>
          <div class="size-options">
            <button
              v-for="size in availableSizes"
              :key="size.value"
              class="size-option"
              :class="{ 
                active: selectedSize === size.value,
                unavailable: !isSizeAvailable(size.value)
              }"
              @click="selectSize(size)"
              :disabled="!isSizeAvailable(size.value)"
            >
              <span class="size-value">{{ size.name }}</span>
              <span v-if="!isSizeAvailable(size.value)" class="unavailable-text">غير متوفر</span>
            </button>
          </div>
        </div>

        <!-- Promotions -->
        <div v-if="hasDiscount" class="promotion-banner">
          <span class="promo-text">1+1 مجانا</span>
        </div>

        <!-- Product Disclaimer -->
        <div class="disclaimer-box">
          <strong>.هذا المنتج لا يرد ولأستبدل لضمان سلامتكم الا إذا تتبق سياسة الإرجاع.
          </strong>
          <p>جميع المنتجات أصلية ومستوردة من الوكالء المعتمدين
          </p>
          <p>
            :سياسة توفر المنتجات
          </p>
          <ul>
            <li>
              <p>

                جميع المنتجات المعروضة خاضعة لتوفرها في المخزون وقت تنفيذ الطلب. بعد تأكيد الطلب عبر الموقع، سيتم إخطاركم في حال عدم توفر أي
                . من المنتجات المطلوبة. وفي هذه الحالة، يمكنكم اختيار استرداد قيمة المنتج غير المتوفر فقط
              </p>
            </li>
            <li>
              <p>
                .قد يختلف شكل عبوة المنتج الخارجي عن الصورة المعروضة في الموقع بسبب تحديثات التصميم من المصنع، لكن محتوى المنتج يظل كما هو
              </p>
            </li>
          </ul>
        </div>

        <!-- Payment Options -->
        <div class="payment-options ">
          <div class="payment-option">
            <div class="payment-option-container d-flex align-items-center justify-content-between ">

              <picture>
                <img src="https://gotawfeer.com/wp-content/uploads/2022/12/1-150x84.png" alt="">
              </picture>
              <div class="payment-logo">Tabby</div>
            </div>
            <div class="payment-text">قسم فاتورتك على 4 دفعات بدون فوائد</div>
            <div class="payment-amount">{{ Math.round(finalPrice / 4) }} <img src="/images/Group 1171274840 (1).png" alt="ر.س" class="currency-icon" /></div>
          </div>
          <div class="payment-option">
            <div class="payment-option-container d-flex align-items-center justify-content-between ">
          <picture>
              <img src="https://gotawfeer.com/wp-content/uploads/2022/12/3-150x84.png" alt="">
            </picture>
              <div class="payment-logo">تمارا</div>
            </div>
            <div class="payment-text">قسم فاتورتك على 4 دفعات بدون فوائد</div>
            <div class="payment-amount">{{ Math.round(finalPrice / 4) }} <img src="/images/Group 1171274840 (1).png" alt="ر.س" class="currency-icon" /></div>
          </div>
        </div>
        <div class="order-now border py-2 px-3 d-flex justify-content-between align-items-center mb-3 rounded-3 ">
          <div class="ship d-flex align-items-center gap-2">
            <i class="fa-solid fa-truck-fast"></i>
            <strong>التوصيل المتوقع
            </strong>
          </div>
          <div class="d-flex flex-column ">
            <p class="mb-3">مدة التوصيل لمدينة جدة ومكة: 3 أيام عمل.
            </p>
            <p class="mb-3">مدة التوصيل لكل انحاء المملكة: 5 أيام عمل
            </p>
          </div>
        </div>

        <!-- Add to Cart -->
        <div class="add-to-cart-section">
          <div class="qty-selector">
            <button @click="qty = Math.max(1, qty - 1)" :disabled="qty <= 1" class="qty-btn">−</button>
            <input type="number" v-model.number="qty" min="1" class="qty-input" />
            <button @click="qty = qty + 1" class="qty-btn">+</button>
          </div>
          <button class="add-to-cart-btn" :disabled="!currentVariantStock || busy" @click="addToCart">

            <span>{{ busy ? 'جاري الإضافة...' : 'أضف للسلة' }}</span>
          </button>
        </div>
        <div class="payment-image mt-4 mb-3 d-flex align-items-center gap-2">
          <strong>
            وسائل الدفع :
          </strong>
          <div class="payment-image-container d-flex align-items-center gap-4">
            <picture>
              <img src="https://gotawfeer.com/wp-content/uploads/2022/12/4-150x84.png" alt="">
            </picture>
            <picture>
              <img src="https://gotawfeer.com/wp-content/uploads/2022/12/3-150x84.png" alt="">
            </picture>
            <picture>
              <img src="https://gotawfeer.com/wp-content/uploads/2022/12/2-150x84.png" alt="">
            </picture>
            <picture>
              <img src="https://gotawfeer.com/wp-content/uploads/2022/12/1-150x84.png" alt="">
            </picture>
            <picture>
              <img src="https://gotawfeer.com/wp-content/uploads/2022/12/5-150x84.png" alt="">
            </picture>
          </div>
        </div>
        <!-- Stock Status -->
        <div class="stock-status" :class="{ in: currentVariantStock, out: !currentVariantStock }">
          {{ currentVariantStock ? `متوفر في المخزون (${currentVariantStock} قطعة)` : 'غير متوفر حالياً' }}
        </div>
        <div class="offer-products mt-3">
          <h4>
            منتجات عليها عروض
          </h4>
          <div class="offer-products-container mt-4">
            <div v-if="offerProductsLoading" class="text-center py-4">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">جاري التحميل...</span>
              </div>
            </div>
            <template v-else-if="offerProducts.length > 0">
              <NuxtLink 
                v-for="(offerProduct, index) in offerProducts" 
                :key="offerProduct?.id || offerProduct?.product_id || index"
                :to="`/product/${encodeURIComponent(String(offerProduct?.slug || offerProduct?.product?.slug || ''))}`"
                class="offer-product-card d-flex align-items-center gap-2 my-4 text-decoration-none"
              >
                <picture>
                  <img :src="getProductImage(offerProduct) || placeholderImage" :alt="getProductTitle(offerProduct)" @error="onImgErr">
                </picture>
                <div class="offer-product-card-content">
                  <h6 class="text-black">{{ getProductTitle(offerProduct) }}</h6>
                  <div class="offer-product-card-price d-flex align-items-center gap-3">
                    <span class="price final">{{ formatPrice(getProductPrice(offerProduct).final) }} <img src="../images/Group 1171274840.png" alt="ر.س" class="currency-icon" /></span>
                    <span v-if="getProductPrice(offerProduct).hasDiscount" class="price old">{{ formatPrice(getProductPrice(offerProduct).old) }} <img src="../images/Group 1171274840.png" alt="ر.س" class="currency-icon" /></span>
                  </div>
                </div>
              </NuxtLink>
            </template>
            <div v-else class="text-center py-4 text-muted">
              لا توجد منتجات متاحة حالياً
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Message -->
    <div v-if="showSuccessMessage" class="success-message">
      <div class="success-content">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>{{ successMessage }}</span>
      </div>
    </div>

    <!-- Product Details Tabs -->


    <!-- Recommended -->
    <div class="rec">
      <h2>{{ t('product.recommended_products') || 'منتجات موصى بها' }}</h2>
      
      <!-- Recommended Loading State -->
      <div v-if="recLoading" class="recommended-loading">
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <span class="loading-text">{{ t('loading') || 'جارٍ التحميل…' }}</span>
        </div>
        
        <!-- Skeleton Recommended Products -->
        <div class="skeleton-recommended">
          <div v-for="n in 6" :key="n" class="skeleton-recommended-card">
            <div class="skeleton-card-image"></div>
            <div class="skeleton-card-content">
              <div class="skeleton-card-title"></div>
              <div class="skeleton-card-price"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="recommended-swiper">
        <Swiper
          :modules="[Navigation]"
          :navigation="true"
          :breakpoints="{
            0: { slidesPerView: 2.2, spaceBetween: 10 },
            480: { slidesPerView: 4, spaceBetween: 12 },
            640: { slidesPerView: 5, spaceBetween: 12 },
            900: { slidesPerView: 6, spaceBetween: 14 },
            1200: { slidesPerView: 7, spaceBetween: 16 }
          }"
          class="recommended-swiper-container"
        >
          <SwiperSlide v-for="p in recommended" :key="p.id || p.slug" class="recommended-slide">
            <ProductCard :product="p" />
          </SwiperSlide>
        </Swiper>
      </div>
    </div>

    <!-- Revision -->
     <div class="revision-section mt-5">
        <div class="container">
          <h4 class="text-center">
            مراجعة العملاء
          </h4>
          <div class="row">
            <div class="col-lg-6 mb-4 d-flex flex-column gap-4 ">
              <strong class="text-center mt-3">
                المراجعات ({{ totalReviewsCount }})
              </strong>
              <!-- Rating distribution (5 stars to 1 star) -->
              <div class="progress mt-2" role="progressbar" aria-label="5 stars" aria-valuenow="getRatingPercentage(5)" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" :style="`width: ${getRatingPercentage(5)}%`"></div>
                <span class="ms-2">5 نجوم</span>
              </div>
              <div class="progress" role="progressbar" aria-label="4 stars" aria-valuenow="getRatingPercentage(4)" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" :style="`width: ${getRatingPercentage(4)}%`"></div>
                <span class="ms-2">4 نجوم</span>
              </div>
              <div class="progress" role="progressbar" aria-label="3 stars" aria-valuenow="getRatingPercentage(3)" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" :style="`width: ${getRatingPercentage(3)}%`"></div>
                <span class="ms-2">3 نجوم</span>
              </div>
              <div class="progress" role="progressbar" aria-label="2 stars" aria-valuenow="getRatingPercentage(2)" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" :style="`width: ${getRatingPercentage(2)}%`"></div>
                <span class="ms-2">2 نجوم</span>
              </div>
              <div class="progress" role="progressbar" aria-label="1 star" aria-valuenow="getRatingPercentage(1)" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" :style="`width: ${getRatingPercentage(1)}%`"></div>
                <span class="ms-2">1 نجم</span>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-container mt-3">
                <p v-if="totalReviewsCount === 0">كن أول من يقيم "{{ product?.name || product?.product_name || 'هذا المنتج' }}"
                </p>
                <p v-else>
                  شاركنا رأيك في "{{ product?.name || product?.product_name || 'هذا المنتج' }}"
                </p>
                <p>
                  لن يتم نشر عنوان بريدك الإلكتروني. الحقول الإلزامية مشار إليها بـ <span class="text-danger">*</span>
                </p>
                <div v-if="guestReviewError" class="alert alert-danger" role="alert">
                  {{ guestReviewError }}
                </div>
                <div class="rating d-flex align-items-center gap-2">
                  <strong>التقييم:</strong>
                  <div class="rating-box d-flex align-items-center gap-2">
                    <i 
                      v-for="star in 5" 
                      :key="star"
                      class="fa-solid fa-star"
                      :class="{ open: star <= guestReviewForm.rating }"
                      @click="guestReviewForm.rating = star"
                      style="cursor: pointer;"
                    ></i>
                  </div>
                </div>
                <form @submit="submitGuestReview">
                  <div class="mb-3">
                    <label for="reviewComment" class="form-label">مراجعتك <span class="text-danger">*</span></label>
                    <textarea 
                      v-model="guestReviewForm.comment" 
                      class="form-control" 
                      id="reviewComment" 
                      rows="3"
                      required
                    ></textarea>
                  </div>
                  <div class="mb-3">
                    <label for="reviewName" class="form-label">الاسم <span class="text-danger">*</span></label>
                    <input 
                      v-model="guestReviewForm.name" 
                      type="text" 
                      class="form-control" 
                      id="reviewName"
                      required
                    >
                  </div>
                  <div class="mb-3">
                    <label for="reviewEmail" class="form-label">البريد الإلكتروني <span class="text-danger">*</span></label>
                    <input 
                      v-model="guestReviewForm.email" 
                      type="email" 
                      class="form-control" 
                      id="reviewEmail" 
                      aria-describedby="emailHelp"
                      required
                    >
                  </div>
                  <div class="mb-3 form-check d-flex align-items-center gap-2">
                    <input type="checkbox" class="form-check-input" id="exampleCheck1">
                    <label class="form-check-label" for="exampleCheck1">احفظ اسمي، بريدي الإلكتروني، والموقع الإلكتروني في هذا المتصفح لاستخدامها المرة المقبلة في تعليقي.</label>
                  </div>
                  <button type="submit" class="main-btn border-0" :disabled="guestReviewLoading">
                    <span v-if="guestReviewLoading">جاري الإرسال...</span>
                    <span v-else>إرسال</span>
                  </button>
              </form>
              </div>
            </div>
          </div>
          
          <!-- Reviews List -->
          <div v-if="reviews.length > 0" class="reviews-list mt-5">
            <h5 class="mb-4">المراجعات ({{ totalReviewsCount }})</h5>
            <div v-if="reviewsLoading" class="text-center py-4">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">جاري التحميل...</span>
              </div>
            </div>
            <div v-else class="reviews-container">
              <div 
                v-for="(review, index) in reviews" 
                :key="review?.id || review?.review_id || index"
                class="review-item mb-4 p-3 border rounded"
              >
                <div class="review-header d-flex justify-content-between align-items-start mb-2">
                  <div class="review-author">
                    <strong class="d-block">{{ review?.name || review?.user?.name || review?.customer?.name || 'مستخدم' }}</strong>
                    <small class="text-muted">
                      {{ formatDate(review?.created_at || review?.date || review?.created_date) }}
                    </small>
                  </div>
                  <div class="review-rating d-flex align-items-center gap-1">
                    <span v-for="star in 5" :key="star" class="star-rating">
                      <i 
                        class="fa-solid fa-star"
                        :class="{ 'open': star <= (review?.rating || review?.stars || 0) }"
                      ></i>
                    </span>
                  </div>
                </div>
                <div class="review-content mt-3">
                  <p>{{ review?.comment || review?.review || review?.text || 'لا يوجد تعليق' }}</p>
                </div>
                <div v-if="review?.reply || review?.response" class="review-reply mt-3 p-3 bg-light rounded">
                  <div class="reply-header mb-2">
                    <strong class="text-primary">رد البائع:</strong>
                  </div>
                  <p class="mb-0">{{ review?.reply || review?.response }}</p>
                </div>
                <div class="review-actions mt-3 d-flex align-items-center gap-3">
                  <button 
                    class="btn btn-sm btn-outline-primary"
                    @click="likeReview(review?.id || review?.review_id)"
                    :disabled="reviewLoading"
                  >
                    <i class="fa-solid fa-thumbs-up"></i>
                    <span class="ms-1">{{ review?.likes_count || review?.likes || 0 }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="!reviewsLoading" class="text-center py-5 text-muted">
            <p>لا توجد مراجعات حتى الآن. كن أول من يقيم هذا المنتج!</p>
          </div>
        </div>
     </div>

    <!-- Login Modal -->
    <teleport to="body">
      <div v-if="showLoginModal" class="login-overlay" @click.self="closeLoginModal">
        <div class="login-modal" dir="rtl">
          <div class="login-header">
            <h2>{{ t('login') || 'تسجيل الدخول' }}</h2>
            <button class="close-btn" @click="closeLoginModal">
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
            </button>
          </div>
          
          <form @submit.prevent="handleLogin" class="login-form">
            <div class="form-group">
              <label for="email">{{ t('email') || 'البريد الإلكتروني' }}</label>
              <input 
                id="email"
                v-model="loginForm.email" 
                type="email" 
                :placeholder="t('email') || 'البريد الإلكتروني'"
                required
                :disabled="loginLoading"
              />
            </div>
            
            <div class="form-group">
              <label for="password">{{ t('password') || 'كلمة المرور' }}</label>
              <input 
                id="password"
                v-model="loginForm.password" 
                type="password" 
                :placeholder="t('password') || 'كلمة المرور'"
                required
                :disabled="loginLoading"
              />
            </div>
            
            <div v-if="loginError" class="error-message">
              {{ loginError }}
            </div>
            
            <button type="submit" class="login-btn" :disabled="loginLoading">
              <span v-if="loginLoading">{{ t('loading') || 'جاري التحميل...' }}</span>
              <span v-else>{{ t('login') || 'تسجيل الدخول' }}</span>
            </button>
          </form>
          
          <div class="login-footer">
            <p>ليس لديك حساب؟ <a href="#" @click.prevent="handleRegister">إنشاء حساب جديد</a></p>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Register Modal -->
    <teleport to="body">
      <div v-if="showRegisterModal" class="login-overlay" @click.self="closeRegisterModal">
        <div class="login-modal" dir="rtl">
          <div class="login-header">
            <h2>{{ t('register') || 'إنشاء حساب جديد' }}</h2>
            <button class="close-btn" @click="closeRegisterModal">
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
            </button>
          </div>
          
          <form @submit.prevent="handleRegisterSubmit" class="login-form">
            <div class="form-row">
              <div class="form-group">
                <label for="f_name">{{ t('first_name') || 'الاسم الأول' }} *</label>
                <input 
                  id="f_name" 
                  v-model="registerForm.f_name" 
                  type="text" 
                  :placeholder="t('first_name') || 'الاسم الأول'" 
                  required 
                  :disabled="registerLoading" 
                />
              </div>
              <div class="form-group">
                <label for="l_name">{{ t('last_name') || 'الاسم الأخير' }} *</label>
                <input 
                  id="l_name" 
                  v-model="registerForm.l_name" 
                  type="text" 
                  :placeholder="t('last_name') || 'الاسم الأخير'" 
                  required 
                  :disabled="registerLoading" 
                />
              </div>
            </div>

            <div class="form-group">
              <label for="register_email">{{ t('email') || 'البريد الإلكتروني' }} *</label>
              <input 
                id="register_email" 
                v-model="registerForm.email" 
                type="email" 
                :placeholder="t('email') || 'البريد الإلكتروني'" 
                required 
                :disabled="registerLoading" 
              />
            </div>

            <div class="form-group">
              <label for="register_phone">{{ t('phone') || 'رقم الهاتف' }} *</label>
              <input 
                id="register_phone" 
                v-model="registerForm.phone" 
                type="tel" 
                :placeholder="t('phone') || 'رقم الهاتف'" 
                required 
                :disabled="registerLoading" 
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="register_password">{{ t('password') || 'كلمة المرور' }} *</label>
                <input 
                  id="register_password" 
                  v-model="registerForm.password" 
                  type="password" 
                  :placeholder="t('password') || 'كلمة المرور'" 
                  required 
                  :disabled="registerLoading" 
                />
              </div>
              <div class="form-group">
                <label for="password_confirmation">{{ t('confirm_password') || 'تأكيد كلمة المرور' }} *</label>
                <input 
                  id="password_confirmation" 
                  v-model="registerForm.password_confirmation" 
                  type="password" 
                  :placeholder="t('confirm_password') || 'تأكيد كلمة المرور'" 
                  required 
                  :disabled="registerLoading" 
                />
              </div>
            </div>

            <div class="form-group">
              <label for="referral_code">{{ t('referral_code') || 'كود الإحالة' }} ({{ t('optional') || 'اختياري' }})</label>
              <input 
                id="referral_code" 
                v-model="registerForm.referral_code" 
                type="text" 
                :placeholder="t('referral_code') || 'كود الإحالة'" 
                :disabled="registerLoading" 
              />
            </div>

            <div v-if="registerError" class="error-message">
              {{ registerError }}
            </div>

            <button type="submit" class="login-btn" :disabled="registerLoading">
              <span v-if="registerLoading">{{ t('creating_account') || 'جاري إنشاء الحساب...' }}</span>
              <span v-else>{{ t('register') || 'إنشاء حساب' }}</span>
            </button>
          </form>
          
          <div class="login-footer">
            <p>{{ t('have_account') || 'لديك حساب بالفعل؟' }} <a href="#" @click.prevent="showLoginModal = true; closeRegisterModal()">{{ t('login') || 'تسجيل الدخول' }}</a></p>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Review Modal -->
    <teleport to="body">
      <div v-if="showReviewModal" class="review-overlay" @click.self="closeReviewModal">
        <div class="review-modal" dir="rtl">
          <div class="review-header">
            <h2>{{ t('product.write_review') || 'اكتب تقييمك' }}</h2>
            <button class="close-btn" @click="closeReviewModal">
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
            </button>
          </div>
          
          <form @submit.prevent="submitReview" class="review-form">
            <div class="form-group">
              <label>{{ t('product.your_rating') || 'تقييمك' }}</label>
              <div class="rating-input">
                <span 
                  v-for="i in 5" 
                  :key="i" 
                  class="star-input" 
                  :class="{ filled: i <= reviewForm.rating }"
                  @click="reviewForm.rating = i"
                >
                  ★
                </span>
              </div>
            </div>
            
            <div class="form-group">
              <label for="comment">{{ t('product.your_comment') || 'تعليقك' }}</label>
              <textarea 
                id="comment"
                v-model="reviewForm.comment" 
                :placeholder="t('product.write_comment_placeholder') || 'اكتب تعليقك عن المنتج...'"
                rows="4"
                required
                :disabled="reviewLoading"
              ></textarea>
            </div>
            
            <div v-if="reviewError" class="error-message">
              {{ reviewError }}
            </div>
            
            <button type="submit" class="submit-btn" :disabled="reviewLoading">
              <span v-if="reviewLoading">{{ t('product.sending') || 'جاري الإرسال...' }}</span>
              <span v-else>{{ t('product.submit_review') || 'إرسال التقييم' }}</span>
            </button>
          </form>
        </div>
      </div>
    </teleport>

    <!-- Reply Modal -->
    <teleport to="body">
      <div v-if="showReplyModal" class="reply-overlay" @click.self="closeReplyModal">
        <div class="reply-modal" dir="rtl">
          <div class="reply-header">
            <h2>{{ t('product.add_reply') || 'أضف رد' }}</h2>
            <button class="close-btn" @click="closeReplyModal">
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
            </button>
          </div>
          
          <form @submit.prevent="submitReply" class="reply-form">
            <div class="form-group">
              <label for="reply-text">{{ t('product.your_reply') || 'ردك' }}</label>
              <textarea 
                id="reply-text"
                v-model="replyText" 
                :placeholder="t('product.write_reply_placeholder') || 'اكتب ردك...'"
                rows="4"
                required
                :disabled="replyLoading"
              ></textarea>
            </div>
            
            <div v-if="replyError" class="error-message">
              {{ replyError }}
            </div>
            
            <button type="submit" class="submit-btn" :disabled="replyLoading">
              <span v-if="replyLoading">{{ t('product.sending') || 'جاري الإرسال...' }}</span>
              <span v-else>{{ t('product.submit_reply') || 'إرسال الرد' }}</span>
            </button>
          </form>
        </div>
      </div>
    </teleport>
  </div>

  <!-- Success Message -->
  <teleport to="body">
    <div v-if="showSuccessMessage" class="success-toast">
      <div class="success-content">
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <span>{{ successMessage }}</span>
      </div>
    </div>
  </teleport>
  
  <!-- Product Modal -->
  <div class="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-products">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div v-if="selectedProductForModal" class="row">
            <div class="col-lg-6 mb-3">
              <picture>
                <img class="mw-100 pic-img" :src="modalProductImage || placeholderImage" :alt="modalProductTitle" @error="onImgErr">
              </picture>
            </div>
            <div class="col-lg-6">
              <div class="product-content-popup">
                <h5>{{ modalProductTitle }}</h5>
                <div v-if="modalProductBrand.name" class="brands-popup d-flex align-items-center gap-2 mt-2 mb-2">
                  <strong class="me-2">البراند:</strong>
                  <NuxtLink :to="modalProductBrand.id ? `/brand/${modalProductBrand.id}` : '#'" class="text-decoration-none d-flex align-items-center gap-2">
                    <picture>
                      <img class="cover-image-class" :src="modalProductBrand.image" :alt="modalProductBrand.name" @error="(e: any) => { e.target.src = '/images/Group 1171274840.png' }">
                    </picture>
                    <span class="brand-name">{{ modalProductBrand.name }}</span>
                  </NuxtLink>
                </div>
                <h5 class="price final mt-3">
                  {{ formatPrice(modalProductPrice.final) }} 
                  <img src="/images/Group 1171274840.png" alt="ر.س" class="currency-icon" />
                </h5>
              </div>
              <div class="buttons d-flex align-items-center gap-2">
                <template v-if="hasProductOptions">
                  <NuxtLink :to="modalProductLink" class="main-btn" @click="handleProductDetails">تحديد خيارات</NuxtLink>
                </template>
                <template v-else>
                  <a href="#" class="main-btn" @click.prevent="handleModalAddToCart" :disabled="isAddingToCart">
                    <span v-if="!isAddingToCart">إضافة إلى السلة</span>
                    <span v-else class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  </a>
                </template>
                <NuxtLink :to="modalProductLink" class="second-btn" @click="handleProductDetails">تفاصيل المنتج</NuxtLink>
              </div>
              <div v-if="modalProductCategories.length > 0" class="cat border-top mt-3 pt-3">
                <strong class="d-block mb-2">التصنيفات:</strong>
                <ul class="d-flex align-items-center gap-2 p-0 m-0 list-unstyled flex-wrap">
                  <li v-for="(cat, index) in modalProductCategories" :key="index">
                    <NuxtLink class="text-decoration-none category-badge" :to="`/category/${cat.id}`">
                      {{ cat.name }}
                    </NuxtLink>
                  </li>
                </ul>
              </div>
              <strong class="mt-4 mb-2 d-block">مشاركة</strong>
              <div class="share d-flex align-items-center gap-2">
                <a href="#" class="text-decoration-none" @click.prevent="shareOnFacebook">
                  <i class="fa-brands fa-facebook"></i>
                </a>
                <a href="#" class="text-decoration-none" @click.prevent="shareOnTelegram">
                  <i class="fa-brands fa-telegram"></i>
                </a>
                <a href="#" class="text-decoration-none" @click.prevent="shareOnSnapchat">
                  <i class="fa-brands fa-square-snapchat"></i>
                </a>
                <a href="#" class="text-decoration-none" @click.prevent="shareOnLinkedIn">
                  <i class="fa-brands fa-linkedin"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .wrap{ padding:20px; max-width:1400px; margin:0 auto }
  .crumbs{ display:flex; align-items:center; gap:8px; color:#6b7280; margin-bottom:20px; font-size:14px }
  .crumbs a{ color:#6b7280; text-decoration:none }
  .crumbs a:hover{ color:#2563eb }
  .loader,.error{ padding:20px; background:#fafafa; border:1px solid #eee; border-radius:12px; text-align:center }

  /* Product Loading States */
  .product-loading {
    padding: 40px 0;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    margin-bottom: 40px;
  }

  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f4f6;
    border-top: 4px solid #F58040;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-progress {
    width: 300px;
    height: 6px;
    background: #f3f4f6;
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #F58040, #ff6b35);
    border-radius: 3px;
    transition: width 0.3s ease;
    position: relative;
  }

  .progress-bar::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    animation: progress-shimmer 1.5s infinite;
  }

  .loading-text {
    font-size: 16px;
    color: #6b7280;
    font-weight: 500;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes progress-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  /* Skeleton Product Layout */
  .skeleton-product {
    display: flex;
    gap: 40px;
    margin-bottom: 40px;
  }

  .skeleton-gallery {
    flex: 1;
    max-width: 50%;
  }

  .skeleton-main-image {
    width: 100%;
    height: 400px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 16px;
    margin-bottom: 12px;
  }

  .skeleton-thumbnails {
    display: flex;
    gap: 10px;
  }

  .skeleton-thumbnail {
    width: 60px;
    height: 60px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 8px;
  }

  .skeleton-info {
    flex: 1;
    max-width: 50%;
    padding: 0 20px;
  }

  .skeleton-brand {
    width: 120px;
    height: 20px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 4px;
    margin-bottom: 12px;
  }

  .skeleton-title {
    width: 80%;
    height: 32px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .skeleton-rating {
    width: 150px;
    height: 20px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .skeleton-price {
    width: 200px;
    height: 36px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 4px;
    margin-bottom: 24px;
  }

  .skeleton-variants {
    margin-bottom: 24px;
  }

  .skeleton-color-options {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  .skeleton-color {
    width: 60px;
    height: 60px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 12px;
  }

  .skeleton-size-options {
    display: flex;
    gap: 10px;
  }

  .skeleton-size {
    width: 60px;
    height: 40px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 8px;
  }

  .skeleton-add-to-cart {
    width: 100%;
    height: 48px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 8px;
  }

  @keyframes skeleton-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* Recommended Loading */
  .recommended-loading {
    margin-top: 20px;
  }

  .skeleton-recommended {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 20px;
  }

  .skeleton-recommended-card {
    background: white;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }

  .skeleton-card-image {
    width: 100%;
    height: 200px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .skeleton-card-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .skeleton-card-title {
    height: 20px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 4px;
    width: 80%;
  }

  .skeleton-card-price {
    height: 16px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 4px;
    width: 60%;
  }

  @keyframes skeleton-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  /* Responsive Skeleton */
  @media (max-width: 768px) {
    .skeleton-product {
      flex-direction: column;
      gap: 20px;
    }

    .skeleton-gallery,
    .skeleton-info {
      max-width: 100%;
    }

    .skeleton-main-image {
      height: 300px;
    }

    .skeleton-thumbnail {
      width: 50px;
      height: 50px;
    }
  }

  /* Product Layout */
  .product{ display:flex; margin-bottom:40px }
  .product .gallery {width: 50%;}
  @media (max-width: 900px){ .product{ grid-template-columns: 1fr; gap:20px } }

  /* Gallery */
  .gallery{ margin-bottom:20px }
  .no-images{ 
    background:#fafafa; 
    border:1px solid #eee; 
    border-radius:16px; 
    min-height:400px;
    display:flex;
    align-items:center;
    justify-content:center;
  }
  .no-images-content{ 
    text-align:center; 
    color:#9ca3af;
  }
  .no-images-content svg{ 
    margin-bottom:12px; 
    opacity:0.5;
  }
  .no-images-content p{ 
    margin:0; 
    font-size:16px;
  }
  .mySwiper2{ 
    background:#fafafa; 
    border:1px solid #eee; 
    border-radius:16px; 
    overflow:hidden; 
    margin-bottom:12px;
    min-height:400px;
  }
  .mySwiper2 img{ 
    width:100%; 
    height:100%; 
    object-fit:contain; 
    max-height:400px;
    display:block;
    transition:opacity 0.3s ease, transform 0.3s ease;
  }
  .mySwiper2 .swiper-slide{ 
    transition:opacity 0.3s ease, transform 0.3s ease;
  }
  .image-container{ 
    position:relative; 
    width:100%; 
    height:100%;
  }
  .image-loading{ 
    position:absolute; 
    top:0; 
    left:0; 
    right:0; 
    bottom:0; 
    background:rgba(255,255,255,0.9); 
    display:flex; 
    flex-direction:column; 
    align-items:center; 
    justify-content:center; 
    z-index:10;
    border-radius:12px;
  }
  .loading-spinner{ 
    width:32px; 
    height:32px; 
    border:3px solid #e5e7eb; 
    border-top:3px solid #2563eb; 
    border-radius:50%; 
    animation:spin 1s linear infinite; 
    margin-bottom:8px;
  }
  .image-loading span{ 
    font-size:12px; 
    color:#6b7280; 
    font-weight:500;
  }
  @keyframes spin{ 
    0%{ transform:rotate(0deg); } 
    100%{ transform:rotate(360deg); } 
  }
  .mySwiper{ 
    height:80px; 
    box-sizing:border-box; 
    padding:10px 0;
  }
  .mySwiper img{ 
    width:100%; 
    height:100%; 
    object-fit:cover; 
    border-radius:8px;
    border:2px solid #eee;
    transition:border-color 0.2s;
  }
  .mySwiper .swiper-slide-thumb-active img{ 
    border-color:#2563eb; 
    box-shadow:0 0 0 2px rgba(37, 99, 235, 0.1);
  }
  .mySwiper .swiper-slide{ 
    width:60px !important; 
    height:60px; 
    cursor:pointer;
  }

  /* Responsive Swiper Gallery */
  @media (max-width: 768px) {
    .gallery ,.info {
      width: 100% !important;
    }
    .product {
      flex-direction: column;
    }
    .mySwiper2{ 
      min-height:300px;
    }
    .mySwiper2 img{ 
      max-height:300px;
    }
    .mySwiper{ 
      height:70px;
    }
    .mySwiper .swiper-slide{ 
      width:50px; 
      height:50px; 
    }
  }

  /* Product Info */
  .info{ padding:0 20px;width: 50%; }
  .brand-section{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px }
  .brand-info{ display:flex; align-items:center; gap:12px }
  .brand{ font-size:18px; font-weight:600; color:#6b7280 }
  .original-badge{ background:#e5f7e5; color:#16a34a; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600 }
  .wishlist-btn{ 
    background:none; 
    border:none; 
    cursor:pointer; 
    color:#6b7280; 
    transition:all 0.3s ease;
    padding: 8px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .wishlist-btn:hover{ 
    color:#ef4444; 
    background: rgba(239, 68, 68, 0.1);
    transform: scale(1.1);
  }
  .wishlist-btn.active {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }
  .wishlist-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .wishlist-btn .spinner {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .title{ font-size:24px; font-weight:700; color:#111827; margin:0 0 16px; line-height:1.3 }

  .rating-section{ display:flex; align-items:center; gap:8px; margin-bottom:16px }
  .stars{ display:flex; gap:2px }
  .star{ color:#d1d5db; font-size:16px }
  .star.filled{ color:#f59e0b }
  .rating-text{ color:#6b7280; font-size:14px }

  .price-section{ display:flex; align-items:center; gap:12px; margin-bottom:16px }
  .price-main{ font-size:28px; font-weight:700; color:#111827 }
  .price-old{ font-size:18px; color:#9ca3af; text-decoration:line-through }
  .discount-badge{ background:#ef4444; color:#fff; padding:4px 8px; border-radius:6px; font-size:14px; font-weight:600 }

  .promotion-banner{ background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:8px 12px; margin-bottom:16px; text-align:center }
  .promo-text{ color:#dc2626; font-weight:600; font-size:14px }

  .disclaimer-box{ background:#fef7f7; border:1px solid #fed7d7; border-radius:8px; padding:12px; margin-bottom:20px }
  .disclaimer-box p{ margin:0 0 4px; font-size:12px; color:#7f1d1d }
  .disclaimer-box p:last-child{ margin-bottom:0 }

  .payment-options{ display:flex; gap:12px; margin-bottom:20px }
  .payment-option{ flex:1; border:1px solid #e5e7eb; border-radius:8px; padding:12px; background:#fff; cursor:pointer; transition:all 0.2s }
  .payment-option:hover{ border-color:#2563eb; box-shadow:0 0 0 2px rgba(37, 99, 235, 0.1) }
  .payment-logo{ font-weight:600; color:#111827; margin-bottom:4px }
  .payment-text{ font-size:12px; color:#6b7280; margin-bottom:4px }
  .payment-amount{ font-weight:600; color:#111827 }
  
  .currency-icon {
    width: 16px;
    height: 16px;
    margin-right: 2px;
    vertical-align: middle;
    display: inline-block;
  }

  .add-to-cart-section{ display:flex; gap:12px; align-items:center; margin-bottom:16px }
  .qty-selector{ display:flex; align-items:center; border:1px solid #e5e7eb; border-radius:8px; background:#fff }
  .qty-btn{ width:36px; height:36px; border:none; background:#f9fafb; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:600; color:#6b7280 }
  .qty-btn:hover{ background:#f3f4f6 }
  .qty-btn:disabled{ opacity:0.5; cursor:not-allowed }
  .qty-input{ width:60px; height:36px; border:none; text-align:center; font-size:16px; font-weight:600; outline:none }
  .add-to-cart-btn{ 
    flex:1; 
    background:linear-gradient(135deg, #111827, #374151); 
    color:#fff; 
    border:none; 
    border-radius:8px; 
    padding:12px 20px; 
    font-size:16px; 
    font-weight:600; 
    cursor:pointer; 
    transition:all 0.3s ease;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    position:relative;
    overflow:hidden;
  }
  .add-to-cart-btn:hover:not(:disabled){ 
    background:linear-gradient(135deg, #374151, #4b5563);
    transform:translateY(-1px);
    box-shadow:0 4px 12px rgba(17, 24, 39, 0.3);
  }
  .add-to-cart-btn:disabled{ 
    background:#9ca3af; 
    cursor:not-allowed;
    transform:none;
    box-shadow:none;
  }
  .add-to-cart-btn .spinner{ 
    animation:spin 1s linear infinite;
  }
  .add-to-cart-btn svg{ 
    flex-shrink:0;
  }
  .add-to-cart-btn span{ 
    font-weight:600;
  }

  .stock-status{ font-weight:600; font-size:14px }
  .stock-status.in{ color:#16a34a }
  .stock-status.out{ color:#ef4444 }

  /* Variant Selection */
  .variant-section{ 
    margin-bottom:24px; 
    padding:20px; 
    background:#fafafa; 
    border-radius:12px; 
    border:1px solid #e5e7eb;
  }
  .variant-title{ 
    font-size:16px; 
    font-weight:600; 
    color:#111827; 
    margin:0 0 16px; 
    display:flex; 
    align-items:center; 
    gap:8px;
  }
  .variant-title svg{ 
    color:#2563eb; 
    flex-shrink:0;
  }
  
  .color-options{ 
    display:flex; 
    gap:12px; 
    flex-wrap:wrap; 
  }
  .color-option-wrapper{ 
    position:relative; 
    transition:all 0.3s ease;
  }
  .color-option-wrapper.active{ 
    transform:translateY(-2px);
  }
  .color-option{ 
    width:60px; 
    height:60px; 
    border:3px solid #e5e7eb; 
    border-radius:12px; 
    cursor:pointer; 
    position:relative; 
    transition:all 0.3s ease;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    overflow:hidden;
    background:#fff;
    box-shadow:0 2px 8px rgba(0,0,0,0.1);
  }
  .color-option:hover{ 
    border-color:#2563eb; 
    transform:scale(1.05);
    box-shadow:0 4px 16px rgba(37, 99, 235, 0.2);
  }
  .color-option.active{ 
    border-color:#2563eb; 
    box-shadow:0 0 0 3px rgba(37, 99, 235, 0.2);
    transform:scale(1.05);
  }
  .color-image{ 
    width:100%; 
    height:100%; 
    border-radius:8px; 
    overflow:hidden;
  }
  .color-image img{ 
    width:100%; 
    height:100%; 
    object-fit:cover;
  }
  .color-circle{ 
    width:32px; 
    height:32px; 
    border-radius:50%; 
    border:2px solid rgba(255,255,255,0.3);
  }
  .color-name{ 
    font-size:10px; 
    color:#111827; 
    font-weight:600; 
    margin-top:4px; 
    text-align:center;
    background:rgba(255,255,255,0.9);
    padding:2px 4px;
    border-radius:4px;
    backdrop-filter:blur(4px);
  }
  
  .size-options{ 
    display:flex; 
    gap:10px; 
    flex-wrap:wrap; 
  }
  .size-option{ 
    padding:12px 20px; 
    border:2px solid #e5e7eb; 
    border-radius:8px; 
    background:#fff; 
    cursor:pointer; 
    font-size:14px; 
    font-weight:600; 
    color:#6b7280; 
    transition:all 0.3s ease;
    position:relative;
    min-width:50px;
    text-align:center;
    box-shadow:0 2px 4px rgba(0,0,0,0.05);
  }
  .size-option:hover:not(:disabled){ 
    border-color:#2563eb; 
    color:#111827;
    transform:translateY(-2px);
    box-shadow:0 4px 12px rgba(37, 99, 235, 0.15);
  }
  .size-option.active{ 
    border-color:#2563eb; 
    background:linear-gradient(135deg, #2563eb, #3b82f6); 
    color:#fff;
    transform:translateY(-2px);
    box-shadow:0 4px 16px rgba(37, 99, 235, 0.3);
  }
  .size-option.unavailable{ 
    opacity:0.4; 
    cursor:not-allowed; 
    background:#f9fafb;
    border-color:#d1d5db;
  }
  .size-option:disabled{ 
    cursor:not-allowed;
  }
  .size-value{ 
    display:block; 
    font-weight:600;
  }
  .unavailable-text{ 
    font-size:10px; 
    color:#ef4444; 
    display:block; 
    margin-top:2px;
  }
  
  .variant-info{ 
    background:linear-gradient(135deg, #f8fafc, #f1f5f9); 
    border:2px solid #e2e8f0; 
    border-radius:12px; 
    padding:20px; 
    margin-bottom:24px;
    box-shadow:0 4px 12px rgba(0,0,0,0.05);
  }
  .variant-header{ 
    display:flex; 
    align-items:center; 
    gap:8px; 
    margin-bottom:16px; 
    font-weight:600; 
    color:#111827; 
    font-size:16px;
  }
  .variant-header svg{ 
    color:#10b981; 
    flex-shrink:0;
  }
  .variant-details{ 
    display:grid; 
    grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); 
    gap:12px;
  }
  .variant-type, 
  .variant-sku, 
  .variant-price, 
  .variant-stock{ 
    display:flex; 
    justify-content:space-between; 
    align-items:center; 
    padding:8px 12px; 
    background:#fff; 
    border-radius:8px; 
    border:1px solid #e5e7eb;
  }
  .label{ 
    font-weight:500; 
    color:#6b7280; 
    font-size:13px;
  }
  .value{ 
    font-weight:600; 
    color:#111827; 
    font-size:14px;
  }
  .variant-stock .value.low{ 
    color:#ef4444; 
    font-weight:700;
  }

  /* Success Message */
  .success-message{ 
    position:fixed; 
    top:20px; 
    right:20px; 
    z-index:1000; 
    animation:slideInRight 0.3s ease;
  }
  .success-content{ 
    background:linear-gradient(135deg, #10b981, #059669); 
    color:#fff; 
    padding:12px 20px; 
    border-radius:8px; 
    box-shadow:0 4px 12px rgba(16, 185, 129, 0.3); 
    display:flex; 
    align-items:center; 
    gap:8px; 
    font-weight:500; 
    font-size:14px;
  }
  .success-content svg{ 
    flex-shrink:0; 
    color:#fff;
  }
  @keyframes slideInRight{ 
    from{ 
      transform:translateX(100%); 
      opacity:0; 
    } 
    to{ 
      transform:translateX(0); 
      opacity:1; 
    } 
  }

  /* Product Details Tabs */
  .product-details{ margin-top:40px; border-top:1px solid #e5e7eb; padding-top:20px }
  .tabs{ display:flex; border-bottom:1px solid #e5e7eb; margin-bottom:20px }
  .tab{ background:none; border:none; padding:12px 20px; cursor:pointer; font-size:14px; font-weight:500; color:#6b7280; border-bottom:2px solid transparent; transition:all 0.2s }
  .tab:hover{ color:#111827 }
  .tab.active{ color:#111827; border-bottom-color:#111827 }
  .tab-content{ min-height:200px }
  .tab-panel{ padding:20px 0 }

  .product-description h3{ font-size:20px; font-weight:700; color:#111827; margin:0 0 12px }
  .benefit-text{ font-size:16px; font-weight:600; color:#111827; margin:0 0 16px }
  .description-text{ color:#6b7280; line-height:1.6; margin-bottom:16px }
  .how-to-use{ color:#6b7280; line-height:1.6 }
  .no-content{ color:#9ca3af; font-style:italic; text-align:center; padding:40px 0 }

  .spec-row{ display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #f3f4f6 }
  .spec-row:last-child{ border-bottom:none }
  .spec-row:nth-child(even){ background:#f9fafb }
  .spec-label{ font-weight:600; color:#111827 }
  .spec-value{ color:#6b7280 }

   /* Reviews Header */
   .reviews-header{ 
     display:flex; 
     justify-content:space-between; 
     align-items:center; 
     margin-bottom:24px; 
     padding:20px; 
     background:#f9fafb; 
     border-radius:12px;
   }
   .reviews-summary{ 
     display:flex; 
     align-items:center; 
     gap:20px;
   }
   .rating-display{ 
     text-align:center;
   }
   .rating-number{ 
     font-size:48px; 
     font-weight:700; 
     color:#111827; 
     line-height:1;
   }
   .rating-stars{ 
     display:flex; 
     gap:2px; 
     justify-content:center; 
     margin:8px 0;
   }
   .rating-stars .star{ 
     color:#d1d5db; 
     font-size:20px;
   }
   .rating-stars .star.filled{ 
     color:#f59e0b;
   }
   .rating-text{ 
     color:#6b7280; 
     font-size:14px;
   }
   .reviews-actions{ 
     display:flex; 
     gap:12px; 
     align-items:center;
   }
   .write-review-btn{ 
     background:#8b5cf6; 
     color:#fff; 
     border:none; 
     border-radius:8px; 
     padding:10px 20px; 
     font-weight:600; 
     cursor:pointer; 
     transition:background 0.2s;
   }
   .write-review-btn:hover{ 
     background:#7c3aed;
   }
   .sort-select{ 
     border:1px solid #e5e7eb; 
     border-radius:8px; 
     padding:10px 12px; 
     background:#fff; 
     color:#6b7280; 
     font-size:14px;
   }

   /* Reviews List */
   .reviews-loading, .reviews-error, .no-reviews{ 
     text-align:center; 
     padding:40px 20px; 
     color:#6b7280;
   }
   .reviews-error{ 
     color:#ef4444;
   }
   .no-reviews-content{ 
     display:flex; 
     flex-direction:column; 
     align-items:center; 
     gap:16px;
   }
   .no-reviews-content svg{ 
     color:#d1d5db; 
     opacity:0.5;
   }
   .no-reviews-content h3{ 
     margin:0; 
     color:#6b7280; 
     font-size:18px;
   }
   .no-reviews-content p{ 
     margin:0; 
     color:#9ca3af; 
     font-size:14px;
   }
   .reviews{ 
     margin-top:20px;
   }
   .review-item{ 
     border:1px solid #e5e7eb; 
     border-radius:12px; 
     padding:20px; 
     margin-bottom:16px; 
     background:#fff; 
     transition:box-shadow 0.2s;
   }
   .review-item:hover{ 
     box-shadow:0 4px 12px rgba(0,0,0,0.1);
   }
   .review-header{ 
     display:flex; 
     align-items:center; 
     gap:12px; 
     margin-bottom:12px;
   }
   .review-stars{ 
     display:flex; 
     gap:2px;
   }
   .review-stars .star{ 
     color:#d1d5db; 
     font-size:16px;
   }
   .review-stars .star.filled{ 
     color:#f59e0b;
   }
   .review-author{ 
     font-weight:600; 
     color:#111827; 
     font-size:14px;
   }
   .review-date{ 
     color:#9ca3af; 
     font-size:12px; 
     margin-left:auto;
   }
   .review-text{ 
     color:#6b7280; 
     line-height:1.6; 
     margin-bottom:12px; 
     font-size:14px;
   }
   .review-actions{ 
     display:flex; 
     gap:20px;
   }
   .action-btn{ 
     background:none; 
     border:none; 
     color:#6b7280; 
     cursor:pointer; 
     font-size:12px; 
     display:flex; 
     align-items:center; 
     gap:4px; 
     transition:color 0.2s;
   }
   .action-btn:hover{ 
     color:#111827;
   }

   /* Responsive Reviews */
   @media (max-width: 768px) {
     .reviews-header{ 
       flex-direction:column; 
       gap:16px; 
       text-align:center;
     }
     .reviews-actions{ 
       flex-direction:column; 
       width:100%;
     }
     .write-review-btn{ 
       width:100%;
     }
     .sort-select{ 
       width:100%;
     }
     .rating-number{ 
       font-size:36px;
     }
     .review-header{ 
       flex-wrap:wrap; 
       gap:8px;
     }
     .review-date{ 
       margin-left:0; 
       width:100%;
     }
   }

  /* Login Modal */
  .modal-overlay{ 
    position:fixed; 
    top:0; 
    left:0; 
    right:0; 
    bottom:0; 
    background:rgba(0,0,0,0.5); 
    display:flex; 
    align-items:center; 
    justify-content:center; 
    z-index:1000; 
    padding:20px;
  }
  .modal-content{ 
    background:#fff; 
    border-radius:16px; 
    width:100%; 
    box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
  }
  .modal-header{ 
    display:flex; 
    justify-content:space-between; 
    align-items:center; 
    padding:20px 24px; 
    border-bottom:1px solid #e5e7eb;
  }
  .modal-header h3{ 
    margin:0; 
    font-size:18px; 
    font-weight:600; 
    color:#111827;
  }
  .close-btn{ 
    background:none; 
    border:none; 
    color:#6b7280; 
    cursor:pointer; 
    padding:4px; 
    border-radius:4px; 
    transition:background 0.2s;
  }
  .close-btn:hover{ 
    background:#f3f4f6;
  }
  .modal-body{ 
    padding:24px;
  }
  .modal-body p{ 
    margin:0 0 20px; 
    color:#6b7280; 
    text-align:center; 
    line-height:1.5;
  }
  .login-options{ 
    display:flex; 
    gap:12px;
  }
  .login-btn{ 
    flex:1; 
    padding:12px 20px; 
    border-radius:8px; 
    font-weight:600; 
    cursor:pointer; 
    transition:all 0.2s; 
    border:none;
  }
  .login-btn.primary{ 
    background:#8b5cf6; 
    color:#fff;
  }
  .login-btn.primary:hover{ 
    background:#7c3aed;
  }
  .login-btn.secondary{ 
    background:#f3f4f6; 
    color:#6b7280;
  }
  .login-btn.secondary:hover{ 
    background:#e5e7eb;
  }

  /* Responsive Modal */
  @media (max-width: 480px) {
    .modal-content{ 
      margin:10px; 
      max-width:none;
    }
    .login-options{ 
      flex-direction:column;
    }
    .modal-header{ 
      padding:16px 20px;
    }
    .modal-body{ 
      padding:20px;
    }
  }

  /* Responsive Variants */
  @media (max-width: 768px) {
    .variant-section{ 
      padding:16px; 
      margin-bottom:20px;
    }
    .color-options{ 
      gap:8px;
    }
    .color-option{ 
      width:50px; 
      height:50px;
    }
    .color-name{ 
      font-size:9px; 
      padding:1px 3px;
    }
    .size-options{ 
      gap:8px;
    }
    .size-option{ 
      padding:10px 16px; 
      font-size:13px; 
      min-width:45px;
    }
    .variant-info{ 
      padding:16px;
    }
    .variant-details{ 
      grid-template-columns:1fr; 
      gap:8px;
    }
    .variant-type, 
    .variant-sku, 
    .variant-price, 
    .variant-stock{ 
      padding:6px 10px;
    }
  }
  
  @media (max-width: 480px) {
    .variant-section{ 
      padding:12px; 
      margin-bottom:16px;
    }
    .color-option{ 
      width:45px; 
      height:45px;
    }
    .color-name{ 
      font-size:8px;
    }
    .size-option{ 
      padding:8px 12px; 
      font-size:12px; 
      min-width:40px;
    }
    .variant-info{ 
      padding:12px;
    }
  }

  /* Recommended */
  .rec{ margin-top:40px; padding-top:20px; border-top:1px solid #e5e7eb }
  .rec h2{ font-size:20px; font-weight:700; color:#111827; margin-bottom:16px }
  .grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:16px }

  /* Login Modal */
  .login-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 70;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .login-modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .login-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 24px 0;
  }

  .login-header h2 {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
    transition: background-color 0.2s ease;
  }

  .close-btn:hover {
    background: #f3f4f6;
  }

  .login-form {
    padding: 24px;
  }

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

  .form-group label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
  }

  .form-group input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.2s ease;
    box-sizing: border-box;
  }

  .form-group input:focus {
    outline: none;
    border-color: #6b46c1;
    box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1);
  }

  .login-btn {
    width: 100%;
    color: #fff;
    border: none;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .login-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .error-message {
    background: #fee;
    color: #c53030;
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 14px;
    margin-bottom: 16px;
    border: 1px solid #feb2b2;
  }

  .login-footer {
    padding: 16px 24px 24px;
    text-align: center;
    border-top: 1px solid #e5e7eb;
  }

  .login-footer p {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
  }

  .login-footer a {
    color: #6b46c1;
    text-decoration: none;
    font-weight: 600;
  }

  .login-footer a:hover {
    text-decoration: underline;
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  /* Review Modal */
  .review-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .review-modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .review-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 24px 0;
  }

  .review-header h2 {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .review-form {
    padding: 24px;
  }

  .rating-input {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .star-input {
    font-size: 32px;
    color: #d1d5db;
    cursor: pointer;
    transition: color 0.2s ease;
    user-select: none;
  }

  .star-input:hover {
    color: #f59e0b;
  }

  .star-input.filled {
    color: #f59e0b;
  }

  .form-group textarea {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.2s ease;
    box-sizing: border-box;
    resize: vertical;
    min-height: 100px;
    font-family: inherit;
  }

  .form-group textarea:focus {
    outline: none;
    border-color: #6b46c1;
    box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1);
  }

  .submit-btn {
    width: 100%;
    background: #6b46c1;
    color: #fff;
    border: none;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .submit-btn:hover:not(:disabled) {
    background: #553c9a;
  }

  .submit-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  /* Replies Section */
  .replies-section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
  }

  .replies-header h4 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .replies-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .reply-item {
    background: #f9fafb;
    border-radius: 8px;
    padding: 12px;
    border: 1px solid #e5e7eb;
  }

  .reply-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .reply-author {
    font-weight: 600;
    color: #111827;
    font-size: 13px;
  }

  .reply-date {
    color: #9ca3af;
    font-size: 12px;
  }

  .reply-text {
    color: #6b7280;
    line-height: 1.5;
    font-size: 14px;
  }

  /* Reply Modal */
  .reply-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .reply-modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .reply-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 24px 0;
  }

  .reply-header h2 {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .reply-form {
    padding: 24px;
  }

  /* Enhanced Action Buttons */
  .action-btn {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: color 0.2s;
    padding: 8px 12px;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .action-btn:hover {
    color: #111827;
    background: #f3f4f6;
  }

  .action-btn svg {
    width: 16px;
    height: 16px;
  }

  /* Recommended Products Swiper */
  .recommended-swiper {
    margin-top: 20px;
  }

  .recommended-swiper-container {
    padding: 10px 0;
  }

  .recommended-slide {
    height: auto;
  }

  .recommended-swiper-container :deep(.swiper-button-prev),
  .recommended-swiper-container :deep(.swiper-button-next) {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #fff;
    color: #111827;
    border: 1px solid #e5e7eb;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
    top: 50%;
    transform: translateY(-50%);
  }

  .recommended-swiper-container :deep(.swiper-button-prev) {
    left: -20px;
  }

  .recommended-swiper-container :deep(.swiper-button-next) {
    right: -20px;
  }

  .recommended-swiper-container :deep(.swiper-button-prev::after),
  .recommended-swiper-container :deep(.swiper-button-next::after) {
    font-size: 16px;
    font-weight: bold;
  }

  .recommended-swiper-container :deep(.swiper-button-disabled) {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* RTL Support for Swiper */
  [dir="rtl"] .recommended-swiper-container :deep(.swiper-button-prev) {
    left: auto;
    right: -20px;
  }

  [dir="rtl"] .recommended-swiper-container :deep(.swiper-button-next) {
    right: auto;
    left: -20px;
  }

  /* Success Toast Styles */
  .success-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
  }

  .success-content {
    background: #10b981;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    font-weight: 600;
    font-size: 14px;
    min-width: 200px;
  }

  .success-content svg {
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

  /* RTL Support */
  [dir="rtl"] .success-toast {
    right: auto;
    left: 20px;
  }

  [dir="rtl"] .success-content {
    text-align: right;
  }

  /* Product Modal Styles */
  .modal-products .modal-dialog {
    max-width: 800px;
  }

  .modal-products .pic-img {
    width: 100%;
    height: auto;
    border-radius: 12px;
    object-fit: contain;
  }

  .product-content-popup h5 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 12px;
  }

  .product-content-popup .price.final {
    font-size: 1.75rem;
    font-weight: 800;
    color: #ef4444;
  }

  .main-btn, .second-btn {
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
    display: inline-block;
    transition: all 0.2s ease;
    text-align: center;
  }

  .main-btn {
    background: #F58040;
    color: white;
    border: none;
  }

  .main-btn:hover:not(:disabled) {
    background: #e6733a;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(245, 128, 64, 0.3);
  }

  .main-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .second-btn {
    background: transparent;
    color: #F58040;
    border: 2px solid #F58040;
  }

  .second-btn:hover {
    background: #F58040;
    color: white;
  }

  .spinner-border-sm {
    width: 1rem;
    height: 1rem;
    border-width: 0.2em;
  }

  /* Brand and Categories Styles */
  .brands-popup {
    padding: 8px 0;
  }

  .brands-popup .cover-image-class {
    width: 40px;
    height: 40px;
    object-fit: contain;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    padding: 4px;
  }

  .brands-popup .brand-name {
    color: #111827;
    font-weight: 600;
    font-size: 14px;
    transition: color 0.2s ease;
  }

  .brands-popup a:hover .brand-name {
    color: #F58040;
  }

  .cat {
    padding-top: 16px;
    margin-top: 16px;
  }

  .category-badge {
    display: inline-block;
    padding: 6px 12px;
    background: #f3f4f6;
    color: #374151;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    border: 1px solid #e5e7eb;
  }

  .category-badge:hover {
    background: #F58040;
    color: #fff;
    border-color: #F58040;
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(245, 128, 64, 0.3);
  }

  .share a {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    color: #374151;
    transition: all 0.2s ease;
  }

  .share a:hover {
    background: #F58040;
    color: white;
    transform: translateY(-2px);
  }

  .share a i {
    font-size: 18px;
  }
</style>
