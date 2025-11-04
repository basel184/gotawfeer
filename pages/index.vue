<script setup lang="ts">
import { ref, computed } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'assets/css/custom.css'
import { useWishlist } from '../composables/useWishlist'
import { useCart } from '../composables/useCart'

// Swiper modules
const swiperModules = [Navigation, Pagination, Autoplay]

// Active slide state for testimonials
const activeTestimonialSlide = ref(0)

const { $get } = useApi()
const { data: cfg } = await useAsyncData('cfg', () => $get('v1/config'))

// Load wishlist and cart on page load
const wishlist = useWishlist()
const cart = useCart()

onMounted(async () => {
  try {
    await Promise.all([
      wishlist.list(),
      cart.list(true) // Force refresh to ensure cart is loaded
    ])
  } catch (error) {
    console.error('Failed to load wishlist or cart:', error)
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
    if (product?.sku) cartData.sku = product.sku
    
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
    
    console.log('✅ تم إضافة المنتج للسلة بنجاح')
  } catch (error: any) {
    console.error('❌ خطأ في إضافة المنتج للسلة:', error)
    alert('حدث خطأ في إضافة المنتج للسلة')
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
const { data: homeSections } = await useAsyncData('home-sections', () => $get('v1/home-sections'))



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
const assetBase = (cfg2?.public?.apiBase || 'https://gotawfeer.com/project/api').replace(/\/api(?:\/v\d+)?$/, '')
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
  width: 75%;
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
  width: 25%;
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
  <main class="home" dir="rtl">
    <!-- Whatsapp -->
     <a href="javascript:void(0);" class="arrow-up d-flex align-items-center justify-content-center" id="scrollTopBtn">
      <i class="fa-solid fa-chevron-up"></i>
    </a>
     <a href="https://wa.me/#" target="_blank" class="whatsapp d-flex align-items-center justify-content-center">
      <i class="fa-brands fa-whatsapp"></i>
    </a>
      <!-- Dynamic Home Sections from Admin -->
      <section v-if="hasSectionItems" class="section ">
        <div v-for="(s, idx) in (sectionItems as any)" :key="s?.id || idx" 
             :class="['section', 'card', { 'special-layout': s?.sort_order === 2 }]">
          <div class="container">
            <!-- Section Header for Products with View All link -->
            <div class="section-header" v-if="s?.type === 'products' && (s?.feed_type === 'category' ? s?.feed_category_id : s?.slug) && s?.show_title !== false">
              <h2 class="section-title">{{ s?.title }}</h2>
              <NuxtLink
                :to="s?.feed_type === 'category' ? `/shop?category=${s?.feed_category_id}` : `/collection/${s?.slug}`"
                class="view-all"
              >عرض الكل</NuxtLink>
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
                      class="products-swiper"
                    >
                      <SwiperSlide 
                        v-for="(product, index) in s.products" 
                        :key="product.id || index"
                      >
                        <ProductCard :product="product" />
                      </SwiperSlide>
                    </Swiper>
                  </div>
                </div>
                <div class="promo-banner-section flex-column ">
                  <div class="promo-countdown ">
                    <h4 class="d-flex text-white" dir="ltr">
                      <p>07 :</p>
                      <p>40 :</p>
                      <p>46 </p>
                    </h4>
                  </div>
                  <div class="promo-banner">
                    <div class="banner-content">
                      <h3 class="banner-title">اقوى</h3>
                      <h3 class="banner-title">الخصومات</h3>
                      <p class="banner-subtitle">من جو توفير</p>
                      <div class="percentage-symbol">
                        <img src="../images/53a3.png" width="100" alt="">
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
                <h2 class="text-white text-center pt-3">آراء عملائنا</h2>
                <div v-if="s?.testimonials_layout === 'slider'" class="testimonials-swiper">
                  <Swiper
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
                    @slide-change="(swiper) => activeTestimonialSlide = swiper.activeIndex"
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
                            <img :src="toSrc(testimonial.image)" :alt="testimonial.customer_name" @error="onImgErr" />
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
                        <img :src="toSrc(testimonial.image)" :alt="testimonial.customer_name" @error="onImgErr" />
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
                    <img src="../images/Group 1171274840.png" alt="ر.س" class="currency-icon" />
                  </h5>
                </div>
                <div class="buttons d-flex align-items-center gap-2">
                  <template v-if="hasProductOptions">
                    <NuxtLink :to="modalProductLink" class="main-btn" @click="handleProductDetails">تحديد خيارات</NuxtLink>
                  </template>
                  <template v-else>
                    <a href="#" class="main-btn" @click.prevent="handleAddToCart" :disabled="isAddingToCart">
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
    
    <!-- Success Toast Message -->
    <teleport to="body">
      <Transition name="slide-fade">
        <div v-if="showSuccessMessage" class="success-toast">
          <div class="success-content">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>تم إضافة السلة بنجاح</span>
          </div>
        </div>
      </Transition>
    </teleport>
  </main>
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
</style>
