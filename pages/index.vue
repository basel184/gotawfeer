<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import 'assets/css/custom.css'
import { useWishlist } from '../composables/useWishlist'
import { useCart } from '../composables/useCart'

const { t, locale } = useI18n()

// SEO Configuration
const seo = useSeo()

// Set SEO for homepage
seo.setSeo({
  title: locale.value === 'ar' ? 'الرئيسية' : 'Home',
  description: locale.value === 'ar' 
    ? 'مرحباً بكم في جو توفير، وجهتك الأولى للتسوق الإلكتروني في المملكة العربية السعودية. تسوق الآن من آلاف المنتجات الأصيلة بأسعار مميزة.'
    : 'Welcome to Go Tawfeer, your premier destination for online shopping in Saudi Arabia. Shop now from thousands of authentic products at great prices.',
  keywords: locale.value === 'ar' 
    ? 'جو توفير، تسوق إلكتروني، متجر إلكتروني، السعودية، منتجات أصلية، عطور، مكياج، إلكترونيات'
    : 'Go Tawfeer, online shopping, ecommerce, Saudi Arabia, authentic products, perfumes, makeup, electronics',
  image: '/images/go-tawfeer-1-1.webp'
})

// Lazy load Swiper components for better performance
const Swiper = defineAsyncComponent(() => import('swiper/vue').then(m => m.Swiper))
const SwiperSlide = defineAsyncComponent(() => import('swiper/vue').then(m => m.SwiperSlide))

// Lazy load Swiper modules and CSS
let swiperModules: any[] = []
let swiperStylesLoaded = false

const loadSwiperModules = async () => {
  if (swiperStylesLoaded) return
  
  // Load CSS dynamically
  if (process.client) {
    const loadCSS = (href: string) => {
      if (document.querySelector(`link[href="${href}"]`)) return
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      document.head.appendChild(link)
    }
    
    loadCSS('https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css')
  }
  
  // Load modules
  const { Navigation, Pagination, Autoplay } = await import('swiper/modules')
  swiperModules = [Navigation, Pagination, Autoplay]
  swiperStylesLoaded = true
}

// Active slide state for testimonials
const activeTestimonialSlide = ref(0)

// Countdown timer for promo (7 days)
const countdownDays = ref(7)
const countdownHours = ref(0)
const countdownMinutes = ref(0)
const countdownSeconds = ref(0)

// Countdown interval reference
let countdownInterval: any = null

// Initialize countdown - weekly countdown to next Saturday
const initializeCountdown = () => {
  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
  
  // Calculate next Saturday (Saturday = 6 in JavaScript Date)
  const getNextSaturday = (): Date => {
    const now = new Date()
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    let daysUntilSaturday: number
    
    if (currentDay === 6) {
      // If today is Saturday, countdown to next Saturday (7 days)
      daysUntilSaturday = 7
    } else {
      // Calculate days until next Saturday
      // If currentDay < 6, then daysUntilSaturday = 6 - currentDay
      // This covers Sunday (0) through Friday (5)
      daysUntilSaturday = 6 - currentDay
      if (daysUntilSaturday <= 0) {
        // If somehow negative, add 7 days
        daysUntilSaturday += 7
      }
    }
    
    const nextSaturday = new Date(now)
    nextSaturday.setDate(now.getDate() + daysUntilSaturday)
    nextSaturday.setHours(0, 0, 0, 0) // Set to midnight
    
    return nextSaturday
  }
  
  let endDate = getNextSaturday()
  
  const updateCountdown = () => {
    const now = new Date().getTime()
    let distance = endDate.getTime() - now
    
    // If countdown finished, get next Saturday
    if (distance < 0) {
      endDate = getNextSaturday()
      distance = endDate.getTime() - now
    }
    
    // Calculate time units
    countdownDays.value = Math.floor(distance / (1000 * 60 * 60 * 24))
    countdownHours.value = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    countdownMinutes.value = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
    countdownSeconds.value = Math.floor((distance % (1000 * 60)) / 1000)
  }
  
  // Update immediately
  updateCountdown()
  
  // Update every second
  countdownInterval = setInterval(updateCountdown, 1000)
}

// Cleanup on unmount
onBeforeUnmount(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  
  // Disconnect intersection observer
  if (process.client && sectionObserver) {
    sectionObserver.disconnect()
    sectionObserver = null
  }
})

// Format countdown number with leading zero
const formatCountdown = (num: number): string => {
  return num.toString().padStart(2, '0')
}

const { $get } = useApi()
// Config - load client-side only (non-critical)
const cfg = ref<any>(null)
const cfgPending = ref(false)

// No page loading - AppLoading handles it globally

// Load wishlist and cart on page load
const wishlist = useWishlist()
const cart = useCart()


// Lazy load sections on scroll
const visibleSections = ref<Set<number>>(new Set())
const sectionsLoading = ref<Set<number>>(new Set())

// Intersection Observer for lazy loading sections
let sectionObserver: IntersectionObserver | null = null

onMounted(async () => {
  // Load Swiper modules in background (non-blocking)
  loadSwiperModules().catch(() => {})
  
  // Load cart and wishlist in parallel (non-blocking)
  // Silently handle errors (404 is expected if user is not authenticated)
  Promise.all([
    wishlist.list().catch(() => {}), // Silently handle errors (404 is normal for guests)
    cart.list(true).catch(() => {}) // Force refresh to ensure cart is loaded
  ]).catch(() => {
    // All errors are already handled silently
  })
  
  // Load config (non-blocking)
  cfgPending.value = true
  $get('v1/config').then((data: any) => {
    cfg.value = data
  }).catch(() => {
    cfg.value = null
  }).finally(() => {
    cfgPending.value = false
  })
  
  // Load home sections (critical - load immediately with shorter timeout)
  sectionsPending.value = true
  try {
    // Use shorter timeout (3 seconds) for home sections
    const data = await $get('v1/home-sections', { timeout: 3000 })
    const sections = Array.isArray(data) ? data : (data?.data || data?.items || data?.products || [])
    homeSections.value = sections
    
    // Mark ALL sections as visible immediately (show all sections after load)
    sections.forEach((_: any, idx: number) => {
      visibleSections.value.add(idx)
    })
  } catch (error) {
    console.error('Error loading home sections:', error)
    homeSections.value = []
  } finally {
    sectionsPending.value = false
    
    // After sections load, ensure DOM is updated
    await nextTick()
    
    // Setup intersection observer after data is loaded
    if (process.client && sectionObserver) {
      requestAnimationFrame(() => {
        const sections = document.querySelectorAll('[data-section-index]')
        sections.forEach((section) => {
          sectionObserver?.observe(section)
        })
      })
    }
  }
  
  // Initialize countdown
  initializeCountdown()
  
  // Setup Intersection Observer for lazy loading sections
  if (process.client) {
    sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionIndex = parseInt(entry.target.getAttribute('data-section-index') || '0')
          if (!visibleSections.value.has(sectionIndex)) {
            visibleSections.value.add(sectionIndex)
            // Mark section as visible - it will load when rendered
          }
        }
      })
    }, {
      rootMargin: '300px', // Start loading 300px before section comes into view (increased for better UX)
      threshold: 0.01 // Lower threshold for earlier loading
    })
    
    // Observe all sections after DOM is ready
    nextTick(() => {
      requestAnimationFrame(() => {
        const sections = document.querySelectorAll('[data-section-index]')
        sections.forEach((section) => {
          sectionObserver?.observe(section)
        })
      })
    })

    // Enable smooth mouse drag scrolling for features-pills on desktop
    nextTick(() => {
      const pillsContainers = document.querySelectorAll('.features-pills .pills-container')
      pillsContainers.forEach((container: any) => {
        let isDown = false
        let startX: number
        let scrollLeft: number
        let velocity = 0
        let lastX: number
        let lastTime: number
        let animationFrame: number | null = null

        const smoothScroll = () => {
          if (Math.abs(velocity) > 0.5) {
            container.scrollLeft -= velocity
            velocity *= 0.95 // Friction
            animationFrame = requestAnimationFrame(smoothScroll)
          } else {
            velocity = 0
            if (animationFrame) {
              cancelAnimationFrame(animationFrame)
              animationFrame = null
            }
          }
        }

        container.addEventListener('mousedown', (e: MouseEvent) => {
          isDown = true
          container.style.cursor = 'grabbing'
          container.style.scrollBehavior = 'auto' // Disable smooth scroll during drag
          startX = e.pageX - container.offsetLeft
          scrollLeft = container.scrollLeft
          lastX = e.pageX
          lastTime = Date.now()
          velocity = 0
          
          // Cancel any ongoing momentum scroll
          if (animationFrame) {
            cancelAnimationFrame(animationFrame)
            animationFrame = null
          }
        })

        container.addEventListener('mouseleave', () => {
          if (isDown) {
            isDown = false
            container.style.cursor = 'grab'
            container.style.scrollBehavior = 'smooth'
            // Start momentum scrolling
            if (Math.abs(velocity) > 1) {
              smoothScroll()
            }
          }
        })

        container.addEventListener('mouseup', () => {
          if (isDown) {
            isDown = false
            container.style.cursor = 'grab'
            container.style.scrollBehavior = 'smooth'
            // Start momentum scrolling
            if (Math.abs(velocity) > 1) {
              smoothScroll()
            }
          }
        })

        container.addEventListener('mousemove', (e: MouseEvent) => {
          if (!isDown) return
          e.preventDefault()
          
          const x = e.pageX - container.offsetLeft
          const walk = (x - startX) * 1.5 // Smooth scroll speed
          container.scrollLeft = scrollLeft - walk
          
          // Calculate velocity for momentum scrolling
          const currentTime = Date.now()
          const timeDelta = currentTime - lastTime
          if (timeDelta > 0) {
            const xDelta = e.pageX - lastX
            velocity = (xDelta / timeDelta) * 16 // Normalize to 60fps
          }
          lastX = e.pageX
          lastTime = currentTime
        })
      })
    })
  }
})

// Modal state - global state for product modal
const selectedProductForModal = useState<any>('selectedProductForModal', () => null)

// Helper functions to extract product data for modal
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
  return toSrc(raw)
}

const getProductTitle = (product: any): string => {
  if (!product) return 'Product'
  return product?.name || product?.product_name || product?.product?.name || product?.product?.product_name || 'Product'
}

const getProductPrice = (product: any): { final: number; old: number; hasDiscount: boolean; discountPercent: number } => {
  if (!product) return { final: 0, old: 0, hasDiscount: false, discountPercent: 0 }
  
  const basePrice = Number(product?.unit_price ?? product?.price ?? product?.product?.unit_price ?? product?.product?.price ?? 0)
  const discount = Number(product?.discount ?? product?.product?.discount ?? 0)
  const discountType = product?.discount_type || product?.product?.discount_type || 'flat'
  
  const isPercent = String(discountType).toLowerCase().startsWith('per')
  const diff = discount && basePrice ? (isPercent ? (basePrice * discount) / 100 : discount) : 0
  const finalPrice = Math.max(0, basePrice - diff)
  const hasDiscount = finalPrice > 0 && finalPrice < basePrice
  const discountPercent = basePrice && discount ? Math.max(0, Math.round(isPercent ? discount : (discount / basePrice) * 100)) : 0
  
  return { final: finalPrice, old: basePrice, hasDiscount, discountPercent }
}

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
        brandImage = toSrc(imgSrc)
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

const getProductSku = (product: any): string => {
  if (!product) return ''
  // Use code as primary SKU, fallback to sku
  return product?.code || product?.product?.code || product?.sku || product?.product?.sku || ''
}

// Helper to normalize color code
const normalizeColorCode = (code: string | null | undefined): string => {
  if (!code) return ''
  return String(code).toUpperCase().replace(/^#/, '').trim()
}

// Helper to get color value for CSS
const getColorValue = (code: string | null | undefined): string => {
  if (!code) return '#000000'
  const normalized = normalizeColorCode(code)
  return normalized.startsWith('#') ? normalized : `#${normalized}`
}

// Helper to parse color_image if it's a JSON string
const parseColorImage = (colorImage: any): any[] | null => {
  if (!colorImage) return null
  if (Array.isArray(colorImage)) return colorImage
  if (typeof colorImage === 'string') {
    try {
      const parsed = JSON.parse(colorImage)
      return Array.isArray(parsed) ? parsed : null
    } catch (e) {
      return null
    }
  }
  return null
}

// Helper to normalize image path
const normalizeImagePath = (imagePath: string | null | undefined): string => {
  if (!imagePath || imagePath.trim() === '') return ''
  const trimmed = String(imagePath).trim()
  // If it's already a full URL, return as is
  if (/^(https?:|data:|blob:)/i.test(trimmed)) {
    return trimmed
  }
  // Otherwise build full URL
  const cfg = useRuntimeConfig() as any
  const assetBase = (cfg?.public?.apiBase || 'https://admin.gotawfeer.com/api').replace(/\/api(?:\/v\d+)?$/, '')
  const fixedPath = trimmed.replace(/^public\//, '').replace(/^storage\/app\/public\//, '').replace(/^storage\//, '')
  return `${assetBase}/storage/app/public/${fixedPath}`
}

// Get product colors
const getProductColors = (product: any): any[] => {
  if (!product) return []
  const cfg = useRuntimeConfig() as any
  const assetBase = (cfg?.public?.apiBase || 'https://admin.gotawfeer.com/api').replace(/\/api(?:\/v\d+)?$/, '')
  
  // Try colors_formatted first
  if (product?.colors_formatted && Array.isArray(product.colors_formatted) && product.colors_formatted.length > 0) {
    return product.colors_formatted.map((color: any) => {
      const codeNormalized = normalizeColorCode(color.code)
      const hexCode = color.code && !color.code.startsWith('#') ? `#${color.code.toUpperCase()}` : (color.code?.toUpperCase() || '')
      
      // Find corresponding image
      const colorImage = product.color_images_full_url?.find((img: any) => {
        const imgColorNormalized = normalizeColorCode(img.color)
        return imgColorNormalized === codeNormalized
      })
      
      let imagePath = ''
      if (colorImage?.image_name) {
        if (typeof colorImage.image_name === 'string') {
          imagePath = colorImage.image_name
        } else if (colorImage.image_name.path) {
          imagePath = colorImage.image_name.path
        } else if (colorImage.image_name.key) {
          imagePath = colorImage.image_name.key
        }
      } else if (color.image) {
        imagePath = color.image
      }
      
      const finalImagePath = normalizeImagePath(imagePath)
      
      return {
        name: color.name || hexCode || codeNormalized,
        originalName: color.name,
        code: codeNormalized,
        hexCode: hexCode,
        image: finalImagePath
      }
    })
  }
  
  // Try colors array
  if (product?.colors && Array.isArray(product.colors) && product.colors.length > 0) {
    return product.colors.map((color: any) => {
      if (typeof color === 'string') {
        const codeNormalized = normalizeColorCode(color)
        return {
          name: codeNormalized,
          originalName: null,
          code: codeNormalized,
          hexCode: getColorValue(color),
          image: ''
        }
      }
      
      const codeNormalized = normalizeColorCode(color.code || color.name)
      const hexCode = color.code && !color.code.startsWith('#') ? `#${color.code.toUpperCase()}` : (color.code?.toUpperCase() || getColorValue(color.code || color.name))
      
      let imagePath = ''
      if (color.image) {
        imagePath = color.image
      }
      
      const finalImagePath = normalizeImagePath(imagePath)
      
      return {
        name: color.name || hexCode || codeNormalized,
        originalName: color.name,
        code: codeNormalized,
        hexCode: hexCode,
        image: finalImagePath
      }
    })
  }
  
  return []
}

// Get product variations
const getProductVariations = (product: any): string[] => {
  if (!product) return []
  
  // Check if product has choice_options
  if (product?.choice_options && Array.isArray(product.choice_options) && product.choice_options.length > 0) {
    const variationsSet = new Set<string>()
    
    product.choice_options.forEach((option: any) => {
      if (option.options && Array.isArray(option.options)) {
        option.options.forEach((opt: string) => {
          if (opt && opt.trim()) {
            variationsSet.add(opt.trim())
          }
        })
      }
    })
    
    return Array.from(variationsSet).sort()
  }
  
  // Check if product has variation array
  if (product?.variation && Array.isArray(product.variation) && product.variation.length > 0) {
    const variationsSet = new Set<string>()
    
    product.variation.forEach((v: any) => {
      if (v.type && typeof v.type === 'string') {
        // Extract variation type (e.g., "100ml" from "WARM PEACH 004-100ml")
        const parts = v.type.split('-')
        if (parts.length >= 2) {
          const variationType = parts[parts.length - 1].trim()
          if (variationType) {
            variationsSet.add(variationType)
          }
        }
      }
    })
    
    return Array.from(variationsSet).sort()
  }
  
  return []
}

const formatPrice = (n: number): string => {
  if (!isFinite(n) || n <= 0) return '0'
  try { 
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) 
  } catch { 
    return String(n) 
  }
}

// Computed properties for modal
const modalProductImage = computed(() => getProductImage(selectedProductForModal.value))
const modalProductTitle = computed(() => getProductTitle(selectedProductForModal.value))
const modalProductPrice = computed(() => getProductPrice(selectedProductForModal.value))
const modalProductBrand = computed(() => getProductBrand(selectedProductForModal.value))
const modalProductCategories = computed(() => getProductCategories(selectedProductForModal.value))
const modalProductLink = computed(() => getProductLink(selectedProductForModal.value))
const modalProductSku = computed(() => getProductSku(selectedProductForModal.value))
const modalProductColors = computed(() => getProductColors(selectedProductForModal.value))
const modalProductVariations = computed(() => getProductVariations(selectedProductForModal.value))

// Share functions
const shareUrl = computed(() => {
  if (process.client && modalProductLink.value !== '#') {
    return window.location.origin + modalProductLink.value
  }
  return ''
})

const shareText = computed(() => {
  return t('home.share_text', { 
    title: modalProductTitle.value, 
    brand: modalProductBrand.value.name 
  })
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

// Success message state
const showSuccessMessage = ref(false)

// Function to show success message
const showSuccessToast = () => {
  showSuccessMessage.value = true
  setTimeout(() => {
    showSuccessMessage.value = false
  }, 3000)
}

// Function to open cart dropdown
const openCartDropdown = () => {
  if (process.client) {
    // Access cart dropdown state from AppHeader
    const appHeader = document.querySelector('header')
    if (appHeader) {
      // Trigger cart open event or directly access the state
      const event = new CustomEvent('open-cart')
      window.dispatchEvent(event)
    }
  }
}

// Add to cart function
const handleAddToCart = async () => {
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
    if (product?.code) cartData.sku = product.code
    
    await cart.add(cartData)
    // cart.add() already calls list(true) internally, so UI will update automatically
    
    // Show success message
    showSuccessToast()
    
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
    
    console.log('✅', t('product.product_added_to_cart_successfully'))
  } catch (error: any) {
    console.error('❌', t('product.error_adding_product_to_cart'), error)
    alert(t('product.error_adding_product_to_cart'))
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

// Admin-defined Home Sections (Collections)
// Load home sections - will be loaded in onMounted for faster initial render
const homeSections = ref<any[]>([])
const sectionsPending = ref(true)

// Load more state for each section
const sectionLoadingMore = ref<Map<number, boolean>>(new Map())
const sectionHasMore = ref<Map<number, boolean>>(new Map())
const sectionOffsets = ref<Map<number, number>>(new Map())

// Load more products for a section
const loadMoreProducts = async (sectionId: number, sectionIndex: number) => {
  if (sectionLoadingMore.value.get(sectionId)) return
  
  sectionLoadingMore.value.set(sectionId, true)
  
  try {
    const currentOffset = sectionOffsets.value.get(sectionId) || 8
    const response = await $get(`v1/home-sections/load-more/${sectionId}?offset=${currentOffset}&limit=8&locale=sa`)
    
    const newProducts = Array.isArray(response) ? response : (response?.data || response?.products || [])
    
    if (newProducts.length > 0) {
      // Add new products to the section
      const section = homeSections.value[sectionIndex]
      if (section && section.products) {
        section.products = [...section.products, ...newProducts]
      }
      
      // Update offset for next load
      sectionOffsets.value.set(sectionId, currentOffset + 8)
      
      // Check if there are more products
      sectionHasMore.value.set(sectionId, newProducts.length >= 8)
    } else {
      // No more products
      sectionHasMore.value.set(sectionId, false)
    }
  } catch (error) {
    console.error('Error loading more products:', error)
    sectionHasMore.value.set(sectionId, false)
  } finally {
    sectionLoadingMore.value.set(sectionId, false)
  }
}

// Check if section has more products to load
const canLoadMore = (sectionId: number): boolean => {
  return sectionHasMore.value.get(sectionId) !== false
}

// Check if section is currently loading more
const isLoadingMore = (sectionId: number): boolean => {
  return sectionLoadingMore.value.get(sectionId) === true
}



// Normalize helpers to handle {data: []} or [] or other keyed arrays
const toList = (v: any, key?: string) => {
  const val = v?.value ?? v
  if (!val) return []
  if (Array.isArray(val)) return val
  // Most common wrappers
  if (key && Array.isArray(val[key])) return val[key]
  if (Array.isArray(val.data)) return val.data
  if (Array.isArray(val.items)) return val.items
  if (Array.isArray(val.products)) return val.products
  if (Array.isArray(val.list)) return val.list
  // Try detecting first array value in object
  if (val && typeof val === 'object') {
    for (const k of Object.keys(val)) {
      if (Array.isArray((val as any)[k])) return (val as any)[k]
    }
  }
  return []
}

const sectionItems = computed<any[]>(() => toList(homeSections))
const hasSectionItems = computed(() => Array.isArray((sectionItems as any).value) && (sectionItems as any).value.length > 0)




// Minimal image helpers for side banners
const cfg2 = useRuntimeConfig() as any
const assetBase = (cfg2?.public?.apiBase || 'https://admin.gotawfeer.com/api').replace(/\/api(?:\/v\d+)?$/, '')
// Prefer Laravel web host for server-rendered pages (collections). Fallbacks handle dev (3000->8000)
const webBase = computed(() => {
  let base = assetBase || ''
  if (!base && typeof window !== 'undefined') {
    base = window.location.origin
  }
  // If we're on Nuxt dev server (3000), assume Laravel is 8000
  if (/^https?:\/\/localhost:3000$/i.test(base) || /^https?:\/\/127\.0\.0\.1:3000$/i.test(base)) {
    base = base.replace(':3000', ':8000')
  }
  return base
})
const fixPath = (s: string) => {
  let p = s.trim().replace(/\\/g, '/')
  
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
const toSrc = (u: any): string => {
  if (!u) return ''
  if (Array.isArray(u)) return toSrc(u[0])
  let s: any = u
  if (typeof u === 'string') {
    const t = u.trim()
    if (t.startsWith('[') || t.startsWith('{')) {
      try { return toSrc(JSON.parse(t)) } catch {}
    }
    s = t
  } else if (typeof u === 'object') {
    s = (u as any).path || (u as any).url || (u as any).image || ''
  }
  s = (typeof s === 'string' ? s : '').trim()
  if (!s) return ''
  if (/^(https?:|data:|blob:)/i.test(s)) return s
  return `${assetBase}/${fixPath(s)}`
}
const placeholderImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="16">No image</text></svg>'

const onImgErr = (e: any) => {
  e.target.src = placeholderImage
}

// Swiper is now handled by the component itself
</script>

<style scoped>
/* Section Header Actions */
.section-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Load More Button in Header */
.load-more-btn-header {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 20px;
  background: linear-gradient(135deg, #F58040, #e06830);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(245, 128, 64, 0.3);
  white-space: nowrap;
}

.load-more-btn-header:hover:not(:disabled) {
  background: linear-gradient(135deg, #e06830, #d05820);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 128, 64, 0.4);
}

.load-more-btn-header:active:not(:disabled) {
  transform: translateY(0);
}

.load-more-btn-header:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner-sm {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .section-header-actions {
    gap: 8px;
  }
  
  .load-more-btn-header {
    padding: 6px 14px;
    font-size: 12px;
  }
}

.special-products-layout {
  display: flex;
  gap: 0;
  flex-direction: row-reverse;
  align-items: stretch;
}

.products-carousel-section {
  background: #A21025;
  border-radius: 20px;
  padding: 10px 0;
  width: 70%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.products-carousel {
  position: relative;
  width: 100%;
  height: 100%;
}

.products-swiper {
  width: 100%;
  height: 100%;
  padding-inline-end: 43px;
  padding-inline-start: 5px;
}

.products-swiper :deep(.swiper-slide) {
  height: auto;
  align-items: stretch;
}

.products-swiper :deep(.swiper-button-prev),
.products-swiper :deep(.swiper-button-next) {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  color: #333;
}

.products-swiper :deep(.swiper-button-prev:hover),
.products-swiper :deep(.swiper-button-next:hover) {
  background: #f8f9fa;
  transform: translateY(-50%) scale(1.1);
}

.products-swiper :deep(.swiper-button-prev) {
  left: 10px;
}

.products-swiper :deep(.swiper-button-next) {
  right: 10px;
}

.products-swiper :deep(.swiper-button-prev::after),
.products-swiper :deep(.swiper-button-next::after) {
  content: '';
  width: 12px;
  height: 12px;
  border: 2px solid #333;
  border-top: none;
  border-right: none;
  transform: rotate(45deg);
}

.products-swiper :deep(.swiper-button-next::after) {
  transform: rotate(-135deg);
}

.promo-banner-section {
  display: flex;
  align-items: center;
  border-left: 5px dashed #fff;
  background: #A21025;
  justify-content: center;
  border-radius: 20px;
  text-align: center;
  position: relative;
  width: 30%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}


.banner-content {
  position: relative;
  z-index: 2;
}

.banner-title {
  color: white;
  font-size: 2.5rem;
  font-weight: bold;
  margin: 0;
  line-height: 1.2;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.banner-subtitle {
  color: white;
  font-size: 1.2rem;
  margin: 10px 0 0 0;
  font-weight: 500;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}




/* Product grid adjustments for special layout */
.special-layout .products-carousel :deep(.product-grid) {
  display: flex;
  gap: 15px;
  overflow-x: auto;
  padding: 10px 0;
  scrollbar-width: thin;
  scrollbar-color: #ccc transparent;
}

.special-layout .products-carousel :deep(.product-grid::-webkit-scrollbar) {
  height: 6px;
}

.special-layout .products-carousel :deep(.product-grid::-webkit-scrollbar-track) {
  background: #f1f1f1;
  border-radius: 3px;
}

.special-layout .products-carousel :deep(.product-grid::-webkit-scrollbar-thumb) {
  background: #ccc;
  border-radius: 3px;
}

.special-layout .products-carousel :deep(.product-grid::-webkit-scrollbar-thumb:hover) {
  background: #999;
}

.special-layout .products-carousel :deep(.product-card) {
  min-width: 200px;
  flex-shrink: 0;
}
</style>

<template>
  <div>
  <main class="home" dir="rtl">

      <!-- Dynamic Home Sections from Admin -->
    <!-- Show loading state while sections are loading (only if no data yet) -->
    <div v-if="sectionsPending " class="sections-loading text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('loading') }}</span>
      </div>
    </div>
    <section v-else-if="hasSectionItems" class="section ">
      <div 
        v-for="(s, idx) in (sectionItems as any)" 
        :key="s?.id || idx" 
        :data-section-index="idx"
        :class="['section', 'card', { 'special-layout': s?.sort_order === 2 }]"
      >
          <div class="container">
            <!-- Section Header for Products with View All link -->
            <div class="section-header" v-if="s?.type === 'products' && (s?.feed_type === 'category' ? s?.feed_category_id : s?.slug) && s?.show_title !== false">
              <h2 class="section-title">{{ s?.title }}</h2>
              <div class="section-header-actions">
                <button 
                  v-if="s?.id && canLoadMore(s.id)"
                  class="load-more-btn-header"
                  @click="loadMoreProducts(s.id, idx)"
                  :disabled="isLoadingMore(s.id)"
                >
                  <span v-if="isLoadingMore(s.id)" class="loading-spinner-sm"></span>
                  <span v-else>{{ t('home.load_more') || 'تحميل المزيد' }}</span>
                </button>
                <NuxtLink
                  :to="s?.feed_type === 'category' ? `/shop?category=${s?.feed_category_id}` : `/collection/${s?.slug}`"
                  class="view-all"
                >{{ t('home.view_all') || 'عرض الكل' }}</NuxtLink>
              </div>
            </div>
            <!-- Section Header for other types (testimonials, features, etc.) -->
            <div class="section-header2" v-else-if="s?.show_title !== false">
              <h2 class="section-title">{{ s?.title }}</h2>
              <hr style="color: #F58040;opacity: 1;width: 10%;">
            </div>
            <template v-if="s?.type === 'products' && Array.isArray(s?.products) && s.products.length">
              <!-- Special layout for sort_order: 2 -->
              <div v-if="s?.sort_order === 2" class="special-products-layout">
                <div class="products-carousel-section">
                  <div class="products-carousel">
                    <Swiper
                    v-if="s.products && s.products.length > 0"
                      :modules="swiperModules"
                      :slides-per-view="5"
                      :navigation="false"
                      :breakpoints="{
                        320: { slidesPerView: 1, spaceBetween: 10 },
                        640: { slidesPerView: 2, spaceBetween: 10 },
                        768: { slidesPerView: 3, spaceBetween: 15 },
                        1024: { slidesPerView: 4, spaceBetween: 15 },
                        1200: { slidesPerView: 5, spaceBetween: 15 }
                      }"
                    :watch-overflow="true"
                      class="products-swiper"
                    @swiper="(swiper) => { if (swiper && swiper.update) swiper.update() }"
                    >
                      <SwiperSlide 
                        v-for="(product, index) in s.products" 
                      :key="product.id || product.product_id || index"
                      >
                        <ProductCard :product="product" />
                      </SwiperSlide>
                    </Swiper>
                  </div>
                </div>
              <div class="promo-banner-section flex-column ">
                <div class="promo-countdown ">
                  <h4 class="d-flex text-white align-items-center justify-content-center gap-2" dir="ltr">
                    <span class="countdown-item">
                      <span class="countdown-number">{{ formatCountdown(countdownDays) }}</span>
                      <span class="countdown-label">{{ t('product.day') }}</span>
                    </span>
                    <span class="countdown-separator">:</span>
                    <span class="countdown-item">
                      <span class="countdown-number">{{ formatCountdown(countdownHours) }}</span>
                      <span class="countdown-label">{{ t('home.hour') }}</span>
                    </span>
                    <span class="countdown-separator">:</span>
                    <span class="countdown-item">
                      <span class="countdown-number">{{ formatCountdown(countdownMinutes) }}</span>
                      <span class="countdown-label">{{ t('home.minute') }}</span>
                    </span>
                    <span class="countdown-separator">:</span>
                    <span class="countdown-item">
                      <span class="countdown-number">{{ formatCountdown(countdownSeconds) }}</span>
                      <span class="countdown-label">{{ t('home.second') }}</span>
                    </span>
                  </h4>
                </div>
                  <div class="promo-banner">
                    <div class="banner-content">
                    <h3 class="banner-title">{{ t('home.strongest') }}</h3>
                    <h3 class="banner-title">{{ t('home.discounts') }}</h3>
                    <p class="banner-subtitle">{{ t('home.from_go_tawfeer') }}</p>
                      <div class="percentage-symbol">
                      <img src="../images/53a3.png" width="100" alt="" loading="lazy">
                      </div>
                    </div>
                  </div>
                </div>
              </div>

             
              <!-- Normal layout for other sections -->
              <ProductGrid v-else :products="s.products" />
            </template>
            <template v-else-if="s?.type === 'categories' && Array.isArray(s?.categories) && s.categories.length">
              <CategoryPills :categories="s.categories" />
            </template>
            <template v-else-if="s?.type === 'brands' && Array.isArray(s?.brands) && s.brands.length">
              <BrandCarousel :brands="s.brands" />
            </template>
            <template v-else-if="s?.type === 'banners' && Array.isArray(s?.banners) && s.banners.length">
              <div v-if="s?.banner_layout === 'slider'">
                <BannerCarousel :banners="s.banners" />
              </div>
              <div v-else>
                <PromoBannerRow :banners="s.banners" :columns="s?.banner_layout === 'grid_1' ? 1 : (s?.banner_layout === 'grid_2' ? 2 : (s?.banner_layout === 'grid_3' ? 3 : undefined))" />
              </div>
            </template>
            <template v-else-if="s?.type === 'testimonials' && Array.isArray(s?.testimonials_data) && s.testimonials_data.length">
              <div class="testimonials-section">
              <h2 class="text-white text-center pt-3">{{ t('home.customer_reviews') }}</h2>
                <div v-if="s?.testimonials_layout === 'slider'" class="testimonials-swiper">
                  <Swiper
                  v-if="s.testimonials_data && s.testimonials_data.length > 0"
                    :modules="swiperModules"
                    :slides-per-view="3"
                    :space-between="30"
                    :navigation="true"
                    :pagination="{ clickable: false }"
                    :autoplay="{
                      delay: 5000,
                      disableOnInteraction: false,
                    }"
                    :centered-slides="true"
                  :loop="s.testimonials_data.length > 3"
                  :watch-overflow="true"
                    :breakpoints="{
                      320: {
                        slidesPerView: 2,
                        spaceBetween: 5,
                        centeredSlides: true
                      },
                      1024: {
                        slidesPerView: 3,
                        spaceBetween: 5,
                        centeredSlides: true
                      }
                    }"
                  @swiper="(swiper) => { if (swiper && swiper.update) swiper.update() }"
                  @slide-change="(swiper) => { if (swiper) activeTestimonialSlide = swiper.activeIndex }"
                    class="testimonials-swiper-container"
                  >
                    <SwiperSlide v-for="(testimonial, index) in s.testimonials_data" :key="index" class="testimonial-slide" :class="{ 'center-slide': index === activeTestimonialSlide }">
                      <div class="testimonial-card" :class="{ 'center-card': index === activeTestimonialSlide }">
                        <div class="testimonial-info">
                          <div v-if="s?.show_stars && testimonial.rating" class="stars">
                            <span v-for="i in 5" :key="i" class="star" :class="{ 'filled': i <= testimonial.rating }">★</span>
                          </div>
                          <p class="testimonial-text">{{ testimonial.testimonial_text }}</p>
                        </div>
                        <div class="testimonial-content">
                          <div v-if="testimonial.image" class="testimonial-image">
                          <img :src="toSrc(testimonial.image)" :alt="testimonial.customer_name" @error="onImgErr" loading="lazy" />
                          </div>
                          <h4 class="customer-name">{{ testimonial.customer_name }}</h4>
                        </div>
                      </div>
                    </SwiperSlide>
                  </Swiper>
                </div>
                <div v-else class="testimonials-grid" :class="`grid-${s?.testimonials_layout?.replace('grid_', '') || '2'}`">
                  <div v-for="(testimonial, index) in s.testimonials_data" :key="index" class="testimonial-card">
                    <div class="testimonial-content">
                      <div v-if="testimonial.image" class="testimonial-image">
                      <img :src="toSrc(testimonial.image)" :alt="testimonial.customer_name" @error="onImgErr" loading="lazy" />
                      </div>
                      <div class="testimonial-info">
                        <h4 class="customer-name">{{ testimonial.customer_name }}</h4>
                        <div v-if="s?.show_stars && testimonial.rating" class="stars">
                          <span v-for="i in 5" :key="i" class="star" :class="{ 'filled': i <= testimonial.rating }">★</span>
                        </div>
                        <p class="testimonial-text">{{ testimonial.testimonial_text }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="s?.type === 'features' && Array.isArray(s?.features_data) && s.features_data.length">
              <div class="features-section">
                <div v-if="s?.features_layout === 'list'" class="features-list">
                  <div v-for="(feature, index) in s.features_data" :key="index" class="feature-item-list">
                    <div v-if="s?.show_icons && feature.icon" class="feature-icon">
                      <i :class="feature.icon"></i>
                    </div>
                    <div class="feature-content">
                      <h4 class="feature-title">{{ feature.title }}</h4>
                      <p class="feature-description">{{ feature.description }}</p>
                    </div>
                  </div>
                </div>
                <div v-else-if="s?.features_layout === 'pills'" class="features-pills">
                  <div class="pills-container">
                    <div class="pills">
                      <div v-for="(feature, index) in s.features_data" :key="index" class="pill">
                        <div class="pill-content">
                          <div v-if="s?.show_icons && feature.icon" class="feature-icon">
                            <i :class="feature.icon"></i>
                          </div>
                          <div class="feature-info">
                            <h4 class="feature-title">{{ feature.title }}</h4>
                            <p class="feature-description">{{ feature.description }}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="features-grid" :class="`grid-${s?.features_layout?.replace('grid_', '') || '2'}`">
                  <div v-for="(feature, index) in s.features_data" :key="index" class="feature-card">
                    <div v-if="s?.show_icons && feature.icon" class="feature-icon">
                      <i :class="feature.icon"></i>
                    </div>
                    <div class="feature-content">
                      <h4 class="feature-title">{{ feature.title }}</h4>
                      <p class="feature-description">{{ feature.description }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
    </section>

    <div class="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-products">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="btn-close" data-bs-dismiss="modal" :aria-label="t('close')"></button>
          </div>
          <div class="modal-body">
            <div v-if="selectedProductForModal" class="row">
              <div class="col-lg-6 mb-3">
                <picture>
                  <img class="mw-100 pic-img" :src="modalProductImage || placeholderImage" :alt="modalProductTitle" @error="onImgErr" loading="lazy">
                </picture>
              </div>
              <div class="col-lg-6">
                <div class="product-content-popup">
                  <h5>{{ modalProductTitle }}</h5>
                  <div v-if="modalProductBrand.name" class="brands-popup d-flex align-items-center gap-2 mt-2 mb-2">
                    <strong class="me-2">{{ t('product.brand') }}:</strong>
                    <NuxtLink :to="modalProductBrand.id ? `/brand/${modalProductBrand.id}` : '#'" class="text-decoration-none d-flex align-items-center gap-2">
                      <picture>
                        <img class="cover-image-class" :src="modalProductBrand.image" :alt="modalProductBrand.name" @error="(e: any) => { e.target.src = '/images/Group 1171274840.png' }" loading="lazy">
                      </picture>
                    </NuxtLink>
                  </div>
                  
                  <!-- Product SKU -->
                  <div v-if="modalProductSku" class="product-sku-modal mb-2">
                    <span class="sku-label">{{ t('product.sku') || 'رمز المنتج' }}:</span>
                    <span class="sku-value">{{ modalProductSku }}</span>
                  </div>
                  
                  <!-- Colors (Disabled) -->
                  <div v-if="modalProductColors.length > 0" class="variant-section-disabled mt-3">
                    <h6 class="variant-title-disabled mb-2">{{ t('product.select_color') || 'اختر اللون' }}</h6>
                    <div class="color-options-disabled">
                      <div
                        v-for="color in modalProductColors"
                        :key="color.code"
                        class="color-option-disabled"
                        :class="{ 'has-image': color.image && !color.originalName }"
                        :style="(color.image) 
                          ? { 
                              backgroundImage: `url(${color.image})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                              backgroundColor: color.hexCode || getColorValue(color.code)
                            }
                          : { 
                              backgroundColor: color.hexCode || getColorValue(color.code)
                            }"
                        :title="color.name || color.code || ''"
                      >
                      </div>
                    </div>
                  </div>

                  <!-- Variations (Disabled) -->
                  <div v-if="modalProductVariations.length > 0" class="variant-section-disabled mt-3">
                    <h6 class="variant-title-disabled mb-2">{{ t('product.select_variation') || 'اختر المتغير' }}</h6>
                    <div class="variation-options-disabled">
                      <div
                        v-for="variation in modalProductVariations"
                        :key="variation"
                        class="variation-option-disabled"
                      >
                        <span class="variation-value">{{ variation }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="pricing-section mt-3">
                    <div v-if="modalProductPrice.hasDiscount" class="old-price-row mb-2">
                      <span class="old">{{ formatPrice(modalProductPrice.old) }}</span>
                      <svg width="14" height="14" viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.41566 9.76641C6.24628 10.1389 6.13432 10.5431 6.09143 10.967L9.67578 10.2113C9.84515 9.83893 9.95703 9.43463 10 9.01074L6.41566 9.76641Z" fill="#808080" fill-opacity="0.6"/>
                        <path d="M9.67525 7.94574C9.84462 7.57335 9.95658 7.16905 9.99948 6.74516L7.20738 7.3341V6.20194L9.67516 5.68183C9.84454 5.30944 9.9565 4.90515 9.99939 4.48126L7.2073 5.0697V0.998106C6.77947 1.23635 6.39951 1.55347 6.09065 1.92753V5.30517L4.974 5.54057V0.444336C4.54616 0.682492 4.16621 0.999697 3.85734 1.37376V5.77587L1.35883 6.30243C1.18946 6.67482 1.07741 7.07911 1.03443 7.503L3.85734 6.90803V8.33379L0.832042 8.97138C0.662666 9.34377 0.550705 9.74806 0.507812 10.172L3.67446 9.50455C3.93224 9.45138 4.1538 9.30023 4.29784 9.09222L4.87859 8.23832V8.23815C4.93887 8.14981 4.974 8.04329 4.974 7.92857V6.67264L6.09065 6.43725V8.70157L9.67516 7.94557L9.67525 7.94574Z" fill="#808080" fill-opacity="0.6"/>
                      </svg>
                    </div>
                    <div class="price-row d-flex align-items-center gap-2">
                      <h5 class="price final mb-0">
                        {{ formatPrice(modalProductPrice.final) }} 
                        <img src="../images/Group 1171274840.png" alt="ر.س" class="currency-icon" loading="lazy" />
                      </h5>
                      <div v-if="modalProductPrice.hasDiscount" class="badge bg-danger">-{{ modalProductPrice.discountPercent }}%</div>
                    </div>
                  </div>
                </div>
                <div class="buttons d-flex align-items-center gap-2">
                  <template v-if="hasProductOptions">
                    <NuxtLink :to="modalProductLink" class="main-btn" @click="handleProductDetails">{{ t('product.select_options') }}</NuxtLink>
                  </template>
                  <template v-else>
                    <a href="#" class="main-btn" @click.prevent="handleAddToCart" :disabled="isAddingToCart">
                      <span v-if="!isAddingToCart">{{ t('product.add_to_cart') }}</span>
                      <span v-else class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    </a>
                  </template>
                  <NuxtLink :to="modalProductLink" class="second-btn" @click="handleProductDetails">{{ t('product.product_details') }}</NuxtLink>
                </div>
                <div v-if="modalProductCategories.length > 0" class="cat border-top mt-3 pt-3">
                  <strong class="d-block mb-2">{{ t('product.categories') }}:</strong>
                  <ul class="d-flex align-items-center gap-2 p-0 m-0 list-unstyled flex-wrap">
                    <li v-for="(cat, index) in modalProductCategories" :key="index">
                      <NuxtLink class="text-decoration-none category-badge" :to="`/category/${cat.id}`">
                        {{ cat.name }}
                      </NuxtLink>
                    </li>
                  </ul>
                </div>
                <strong class="mt-4 mb-2 d-block">{{ t('product.share') }}</strong>
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
    
    <!-- Success Toast Message -->
    <teleport to="body">
      <Transition name="slide-fade">
        <div v-if="showSuccessMessage" class="success-toast">
          <div class="success-content">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>{{ t('product.cart_added_successfully') }}</span>
          </div>
        </div>
      </Transition>
    </teleport>
  </main>
  </div>
</template>

<style scoped>
.testimonials-swiper-container :deep(.swiper-wrapper) {
  padding: 50px 0;
}
/* Swiper Navigation Buttons for Testimonials Section */
.testimonials-swiper-container :deep(.swiper-button-prev),
.testimonials-swiper-container :deep(.swiper-button-next) {
  color: #000F0B !important;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
  border: 2px solid #e5e7eb !important;
  padding: 15px 18px !important;
  border-radius: 50% !important;
  width: 55px !important;
  height: 55px !important;
  margin-top: 0 !important;
  display: flex ;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;

  z-index: 10 !important;
}

.testimonials-swiper-container :deep(.swiper-button-prev:hover),
.testimonials-swiper-container :deep(.swiper-button-next:hover) {
  background: linear-gradient(135deg, #f8f9fa 0%, #e5e7eb 100%) !important;
  border-color: #d1d5db !important;
  transform: scale(1.08) translateY(-2px) !important;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15) !important;
}

.testimonials-swiper-container :deep(.swiper-button-prev:active),
.testimonials-swiper-container :deep(.swiper-button-next:active) {
  transform: scale(0.95) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.testimonials-swiper-container :deep(.swiper-button-prev::after),
.testimonials-swiper-container :deep(.swiper-button-next::after) {
  font-size: 16px !important;
  font-weight: 700 !important;
  margin: 0 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
}

.section-header2 { display:flex; align-items:center;flex-direction: column;gap:0px; padding: 0 4px; justify-content: center; }
.home { background: #f6f6f6; }
.home-header { display:flex; align-items:center; justify-content:space-between; }
.brand { font-size: 22px; font-weight: 700; color: #111827; }

.hero { border-radius: 16px; }
.hero-grid { display:grid; grid-template-columns: 1fr; gap:12px; align-items: start; }
.hero-main { overflow:hidden; border-radius:16px; }
.hero-side { display:grid; grid-template-columns: 1fr; gap:12px; align-content: start }
.hero-side-card { position:relative; border-radius:14px; overflow:hidden; border:1px solid #eee; background:#fff; }
.hero-side-card img { width:100%; height: 160px; object-fit:cover; display:block; }
.hero-side-card .overlay { position:absolute; left:10px; bottom:10px; background:rgba(0,0,0,.45); color:#fff; padding:6px 10px; border-radius:8px; font-size:12px }

.section { display: flex; flex-direction: column; }
.section.card {margin-top: 10px;border-radius: 14px; background: #7fffd400;border: none;}

/* Testimonials section specific styling */
.section.card:has(.testimonials-section) {
  background-image: url('../images/BG2.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 0;
  padding-block: 60px;
}
.section.card:has(.testimonials-section) .section-header2 {
  display: none;
}
.section.card:has(.testimonials-section) .section-title {
  color: #ffffff;
}
.section-header { display:flex; align-items:baseline; gap:8px; padding-block: 10px; justify-content: space-between; }
.section-header h2 { font-size: 20px; font-weight: 700; color:#111827; }
.section-header .sub { color:#6b7280; font-size: 12px; }
.section-header .view-all {font-weight: 700;font-size: 14px;color: #000000;text-decoration: none;border: 1px solid #000;padding: 10px;border-radius: 10px; }
/* Testimonials Styles */
.testimonials-section { margin: 0; }
.testimonials-grid { display: grid; gap: 20px; }
.testimonials-grid.grid-2 { grid-template-columns: repeat(2, 1fr); }
.testimonials-grid.grid-3 { grid-template-columns: repeat(3, 1fr); }
.testimonials-grid.grid-4 { grid-template-columns: repeat(4, 1fr); }

/* Testimonials Swiper Styles */
.testimonials-swiper {
  position: relative;
  width: 100%;
  padding: 20px 0;
}

.testimonials-swiper-container {
  width: 100%;
  height: auto;
}

.testimonials-swiper-container .swiper-pagination {
  position: relative;
  margin-top: 20px;
}

.testimonials-swiper-container .swiper-pagination-bullet {
  background: #d1d5db;
  opacity: 1;
  width: 10px;
  height: 10px;
  transition: all 0.3s ease;
}

.testimonials-swiper-container .swiper-pagination-bullet-active {
  background: #f58040;
  transform: scale(1.2);
}

.testimonials-swiper-container .swiper-pagination-bullet:hover {
  background: #f58040;
  opacity: 0.7;
}

.testimonial-slide {
  height: auto;
  display: flex;
  align-items: stretch;
  transition: all 0.3s ease;
}

/* Center slide special styling */
.center-slide {
  transform: scale(1.1);
  z-index: 2;
}

.testimonial-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  width: 95%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.testimonial-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-color: #f58040;
}

/* Center card special styling */
.center-card {
  height: 200px;
  border: none;
  box-shadow: 0 8px 40px rgba(102, 126, 234, 0.3);
  transform: translateY(-8px);
}



.testimonial-content {
  display: flex;
  align-items: center;
  text-align: center;
  gap: 15px;
  height: 100%;
}

.testimonial-image {
  margin-bottom: 15px;
}

.testimonial-image img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #f3f4f6;
}

.testimonial-info {
  flex: 1;
  display: flex;
  margin-bottom: 10px;
  flex-direction: column;
  justify-content: space-between;
}

.customer-name {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 10px 0;
}

.stars {
  margin-bottom: 15px;
}

.star {
  font-size: 20px;
  color: #d1d5db;
  margin: 0 2px;
}

.star.filled {
  color: #fbbf24;
}

.testimonial-text {
  color: #6b7280;
  line-height: 1.6;
  font-size: 14px;
  margin: 0;
  flex: 1;
}
/* Remove duplicate testimonial-card styles - already defined above */

/* Features Styles */
.features-section { margin: 20px 0; }
.features-grid { display: grid; gap: 20px; }
.features-grid.grid-2 { grid-template-columns: repeat(2, 1fr); }
.features-grid.grid-3 { grid-template-columns: repeat(3, 1fr); }
.features-grid.grid-4 { grid-template-columns: repeat(4, 1fr); }
.features-list { display: flex; gap: 15px; justify-content: space-between;}
.feature-card, .feature-item-list { 
  border-radius: 12px; 
  padding: 20px; 
  transition: transform 0.2s, box-shadow 0.2s;
}
.feature-item-list { display: flex; align-items: center; gap: 15px;flex-direction: column;}
.feature-icon { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  width: 50px; 
  height: 50px; 
  background: #000000; 
  border-radius: 50%; 
  margin-bottom: 15px; 
  color: #ffffff; 
  font-size: 24px; 
}
.feature-item-list .feature-icon { 
  margin-bottom: 0; 
  flex-shrink: 0; 
}
.feature-content { flex: 1; text-align: center; }
.feature-title { 
  font-size: 18px; 
  font-weight: 600; 
  color: #111827; 
  margin: 0 0 10px 0; 
}
.feature-description { 
  color: #6b7280; 
  line-height: 1.6; 
  font-size: 14px; 
  margin: 0; 
}

/* Features Pills Layout (like categories) */
.features-pills {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.features-pills .pills-container {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 4px 0;
  /* Enable smooth scrolling on desktop */
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  cursor: grab;
  /* Smooth scrolling */
  will-change: scroll-position;
  transition: scroll-behavior 0.1s ease-out;
}

.features-pills .pills-container:active {
  cursor: grabbing;
  scroll-behavior: auto;
}

.features-pills .pills-container::-webkit-scrollbar {
  display: none;
}

.features-pills .pills {
  display: flex;
  gap: 12px;
  padding: 0 8px;
  min-width: max-content;
}

.features-pills .pill {
  padding: 0;
  border-radius: 12px;
  background: #fff;
  color: #374151;
  text-decoration: none;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  min-width: 200px;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.features-pills .pill:hover {
  border-color: #f58040;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 128, 64, 0.2);
}

.features-pills .pill-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  width: 100%;
  text-align: center;
}

.features-pills .feature-icon {
  font-size: 36px;
  color: #f58040;
  margin-bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 60px;
  height: 60px;
  background: rgba(245, 128, 64, 0.1);
  border-radius: 50%;
}

.features-pills .feature-info {
  flex: 1;
  width: 100%;
}

.features-pills .feature-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  color: #111827;
  margin: 0 0 8px 0;
  word-break: break-word;
}

.features-pills .feature-description {
  font-size: 13px;
  line-height: 1.4;
  color: #6b7280;
  margin: 0;
  word-break: break-word;
}

@media (max-width: 768px) {
  .promo-banner-section {
    width: 35%;
  }
  .products-carousel-section {
    width: 65%;
  }
  .banner-title { font-size: 1.7rem; }
  .testimonial-card {
    margin: 75px;
  }
  /* .features-list { flex-direction: column; } */
  .testimonials-grid.grid-2,
  .testimonials-grid.grid-3,
  .testimonials-grid.grid-4,
  .features-grid.grid-2,
  .features-grid.grid-3,
  .features-grid.grid-4 {
    grid-template-columns: 1fr;
  }
  .feature-item-list { flex-direction: column; text-align: center; }
  .feature-item-list .feature-icon { margin-bottom: 15px; }
  
  /* Mobile center slide adjustments */
  .center-slide {
    transform: scale(1.05);
  }
  
  .center-card {
    transform: translateY(-4px);
  }
  
  .center-card:hover {
    transform: translateY(-8px) scale(1.02);
  }
  
  /* Mobile features pills */
  .features-pills .pill {
    min-width: 160px;
  }
  
  .features-pills .pill-content {
    padding: 16px 12px;
    gap: 10px;
  }
  
  .features-pills .feature-icon {
    width: 50px;
    height: 50px;
    font-size: 28px;
  }
  
  .features-pills .feature-title {
    font-size: 14px;
  }
  
  .features-pills .feature-description {
    font-size: 12px;
  }
  
  
  .testimonial-image img {
    width: 60px;
    height: 60px;
  }
  
  .customer-name {
    font-size: 16px;
  }
  
  .testimonial-text {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .testimonials-swiper-container .swiper-button-next,
  .testimonials-swiper-container .swiper-button-prev {
    display: none;
  }
  
  .testimonial-image img {
    width: 50px;
    height: 50px;
  }
  
  .customer-name {
    font-size: 14px;
  }
  
  .testimonial-text {
    font-size: 12px;
  }
}

@media (min-width: 900px) {
  .brand { font-size: 26px; }
  .section-header h2 { font-size: 25px; }
  .hero-side { grid-template-columns: 1fr; }
  .hero-side-card img { height: 180px; }
}

/* Success Toast Styles */
.success-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
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

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* RTL Support */
[dir="rtl"] .success-toast {
  right: auto;
  left: 20px;
}

[dir="rtl"] .success-content {
  text-align: right;
}

.main-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  width: 100%;
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

/* Countdown Styles */
.countdown-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.countdown-number {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.countdown-label {
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.countdown-separator {
  font-size: 20px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 4px;
  padding: 0 2px;
}

.promo-countdown h4 {
  margin: 0;
  padding: 12px 16px;
  font-size: 16px;
}


@media (max-width: 768px) {
  .countdown-item {
    min-width: 50px;
    padding: 6px 8px;
  }
  
  .countdown-number {
    font-size: 36px;
  }
  
  .countdown-label {
    font-size: 9px;
  }
  
  .countdown-separator {
    font-size: 16px;
    margin: 0 2px;
  }
  
  .promo-countdown h4 {
    padding: 8px 12px;
    font-size: 14px;
  }
}
@media (max-width: 1199.98px) {
  .promo-banner-section {
    flex-direction: row !important;
  }
  .promo-countdown h4 {
    flex-direction: column;
  }
}
@media (max-width: 991.98px) {
  .promo-banner {
    display: none;
  }
}

/* Sections Loading Spinner */
.sections-loading {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sections-loading .spinner-border {
  width: 3rem;
  height: 3rem;
  border-width: 0.3em;
}

/* Pricing Section in Modal */
.pricing-section {
  margin-bottom: 12px;
}

.pricing-section .old-price-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pricing-section .old {
  color: #9ca3af;
  text-decoration: line-through;
  font-size: 14px;
}

.pricing-section .price-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pricing-section .price.final {
  color: #ef4444;
  font-weight: 800;
  font-size: 18px;
  margin: 0;
}

.pricing-section .currency-icon {
  width: 16px;
  height: 16px;
  margin-right: 2px;
  vertical-align: middle;
}

.pricing-section .badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}

/* Disabled Variants Styles */
.variant-section-disabled {
  margin-bottom: 16px;
}

.variant-title-disabled {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  margin: 0;
}

.color-options-disabled {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.color-option-disabled {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  cursor: not-allowed;
  opacity: 0.6;
  position: relative;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.variation-options-disabled {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.variation-option-disabled {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #f9fafb;
  cursor: not-allowed;
  opacity: 0.6;
}

.variation-value {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

/* Product SKU in Modal */
.product-sku-modal {
  font-size: 14px;
  color: #6b7280;
}

.product-sku-modal .sku-label {
  font-weight: 600;
  margin-left: 4px;
}

.product-sku-modal .sku-value {
  color: #374151;
  font-weight: 500;
}
</style>
