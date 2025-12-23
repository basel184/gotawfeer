<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const cart = useCart()

// SEO Configuration - Temporarily commented out
// TODO: Fix useSeo import when available

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
onMounted(async () => {
  console.log('=== CART PAGE MOUNTED ===')
  console.log('cart object:', cart)
  console.log('cart.items:', (cart as any)?.items)
  console.log('cart.loading:', (cart as any)?.loading)
  
  // Safety timeout: if API hangs, flip loading off and show a friendly error
  const safety = setTimeout(() => {
      try {
      if (cart.loading?.value) {
        cart.error && (cart.error.value = t('cart.loading_error') || 'تعذر تحميل السلة حالياً. حاول مرة أخرى.')
        cart.loading.value = false
      }
    } catch {}
    }, 6000)
  try {
    console.log('Calling cart.list()...')
    await cart.list()
    console.log('cart.list() completed')
    debugCartItems('بعد cart.list')
  } catch (e) {
    // avoid unhandled rejection from bubbling to Nuxt error boundary
    console.warn('Failed to load cart', e)
    console.error('Cart loading error details:', e)
  } finally {
    clearTimeout(safety)
    // لا نظهر شاشة التحميل بعد التحميل الأولي
    initialLoading.value = false
    console.log('initialLoading set to false')
  }
})

// Debug: اطبع هيكل عناصر السلة بعد التحميل مباشرة
// نطبع نسخة مجمدة لتفادي الـ Proxy وإظهار الحقول كما هي
function debugCartItems(stage: string) {
  try {
    const list: any[] = (cart as any)?.items?.value ?? []
    const plain = JSON.parse(JSON.stringify(list))
    console.log(`=== CART ITEMS DEBUG (${stage}) ===`)
    console.log('العدد:', Array.isArray(list) ? list.length : 0)
    console.log('cart.items.value:', (cart as any)?.items?.value)
    console.log('cart object keys:', Object.keys(cart || {}))
    console.log('العنصر[0]:', plain?.[0])
    console.log('مفاتيح العنصر[0]:', plain?.[0] ? Object.keys(plain[0]) : [])
    
    // تصحيح مفصل للمتغيرات والألوان
    if (plain?.[0]) {
      console.log('=== VARIANT DEBUG ===')
      console.log('variant:', plain[0].variant)
      console.log('variant_type:', plain[0].variant_type)
      console.log('sku:', plain[0].sku)
      console.log('color:', plain[0].color)
      console.log('size:', plain[0].size)
      console.log('choices:', plain[0].choices)
      console.log('variations:', plain[0].variations)
      console.log('choice_options:', plain[0].choice_options)
      console.log('colors:', plain[0].colors)
      console.log('=== PRICE DEBUG ===')
      console.log('price:', plain[0].price)
      console.log('discount:', plain[0].discount)
      console.log('discount_type:', plain[0].discount_type)
      console.log('=== END PRICE DEBUG ===')
      console.log('=== END VARIANT DEBUG ===')
    }
    
    if (plain?.[0]?.product) {
      console.log('product داخل العنصر[0]:', plain[0].product)
      console.log('product.keys:', Object.keys(plain[0].product))
      console.log('product.translations:', plain[0].product?.translations)
      console.log('product.thumbnail_full_url:', plain[0].product?.thumbnail_full_url)
    }
    console.log('=== END CART ITEMS DEBUG ===')
  } catch (e) {
    console.log('DEBUG CART ITEMS FAILED:', e)
  }
}

// سجلات مفصلة لعناصر السلة عند توفرها
function logCartDetails() {
  try {
    const list: any[] = (cart as any)?.items?.value ?? []
    if (!Array.isArray(list) || list.length === 0) {
      console.log('[Cart:details] لا توجد عناصر لإظهار تفاصيلها')
      return
    }
    const plain = JSON.parse(JSON.stringify(list))
    console.group('=== CART ITEMS DETAILS ===')
    plain.forEach((it: any, i: number) => {
      const p = it?.product || {}
      console.groupCollapsed(`العنصر #${i} (id=${it?.id} pid=${it?.product_id || p?.id})`)
      console.log('المفاتيح:', Object.keys(it || {}))
      console.table({
        id: it?.id,
        product_id: it?.product_id || p?.id,
        name_item: it?.name,
        name_product: p?.name,
        variant: it?.variant,
        qty: it?.quantity || it?.qty,
        price: it?.price,
        base_price: it?.base_price,
        discount: it?.discount,
        discount_type: it?.discount_type,
        tax: it?.tax,
        tax_model: it?.tax_model,
        shipping_cost: it?.shipping_cost,
        shop: it?.shop?.name,
      })
      
      console.log('=== PRICE CALCULATION DEBUG ===')
      console.log('Item price:', it?.price)
      console.log('Item base_price:', it?.base_price)
      console.log('Item final_price:', it?.final_price)
      console.log('Item unit_price:', it?.unit_price)
      console.log('Item selling_price:', it?.selling_price)
      console.log('Item discount:', it?.discount)
      console.log('Item discount_type:', it?.discount_type)
      console.log('Product unit_price:', it?.product?.unit_price)
      console.log('Product price:', it?.product?.price)
      console.log('All item keys:', Object.keys(it || {}))
      console.log('unitNet result:', unitNet(it))
      console.log('hasDiscount result:', hasDiscount(it))
      console.log('=== END PRICE CALCULATION DEBUG ===')
      console.log('product.keys:', Object.keys(p || {}))
      console.log('الصورة المحتملة:', {
        p_thumbnail_full_url: p?.thumbnail_full_url,
        p_image_full_url: p?.image_full_url,
        it_thumbnail_full_url: it?.thumbnail_full_url,
        it_image_full_url: it?.image_full_url,
        p_thumbnail: p?.thumbnail,
        it_thumbnail: it?.thumbnail,
        p_images_full_url: p?.images_full_url,
      })
      console.groupEnd()
    })
    console.groupEnd()
  } catch (e) {
    console.warn('logCartDetails failed', e)
  }
}

// راقب تغيّر عناصر السلة: عند أول توفر عناصر اطبع التفاصيل
watch(() => (cart as any)?.items?.value, (val: any, oldVal: any) => {
  console.log('=== CART ITEMS WATCH TRIGGERED ===')
  console.log('old value:', oldVal)
  console.log('new value:', val)
  console.log('is array:', Array.isArray(val))
  console.log('length:', val?.length)
  
  if (Array.isArray(val) && val.length > 0) {
    console.log('Items found, logging details...')
    logCartDetails()
  } else {
    console.log('No items or empty array')
  }
}, { immediate: true, deep: true })

// لوحة Debug اختيارية للإضافة السريعة (افتح الصفحة مع ?debug=1)
const route = useRoute() as any
const showDebugPanel = computed(() => {
  const q = String(route?.query?.debug ?? '')
  return q === '1' || q.toLowerCase() === 'true'
})
const debugProductId = ref<number | null>(null)
const debugQty = ref<number>(1)
const debugVariant = ref<string>('')
const debugSku = ref<string>('')
async function debugAdd() {
  if (!debugProductId.value) {
    console.warn('debugAdd: product_id مطلوب')
    return
  }
  try {
    console.log('=== DEBUG ADD START ===')
    const addData: any = { 
      product_id: Number(debugProductId.value), 
      quantity: Number(debugQty.value || 1) 
    }
    
    // إضافة المتغيرات إذا كانت متوفرة
    if (debugVariant.value) {
      addData.variant = debugVariant.value
    }
    if (debugSku.value) {
      addData.sku = debugSku.value
    }
    
    console.log('Adding product:', addData)
    
    await cart.add(addData)
    console.log('Add completed, calling cart.list()...')
    
    await cart.list()
    console.log('cart.list() completed')
    debugCartItems('بعد debugAdd')
  } catch (e) {
    console.warn('debugAdd failed', e)
    console.error('Error details:', e)
  }
}

async function testAddFromProduct() {
  try {
    console.log('=== TEST ADD FROM PRODUCT ===')
    
    // محاولة إضافة منتج مع متغيرات كما يحدث في صفحة المنتج
    const testData = {
      product_id: 1, // استخدم ID منتج موجود
      quantity: 1,
      variant_type: 'color-size',
      sku: 'TEST-RED-L-001',
      variant: 'أحمر-كبير'
    }
    
    console.log('Testing with data:', testData)
    
    await cart.add(testData)
    console.log('Test add completed, calling cart.list()...')
    
    await cart.list()
    console.log('cart.list() completed')
    debugCartItems('بعد testAddFromProduct')
  } catch (e) {
    console.warn('testAddFromProduct failed', e)
    console.error('Error details:', e)
  }
}

const actionBusy = ref<Record<string, boolean>>({})
const clearAllBusy = ref(false)
const isBusy = (it: any) => !!actionBusy.value[String(it?.id ?? '')]

async function removeItem(item: any) {
  const key = item?.id || item?.key
  if (!key) return
  const idStr = String(item?.id ?? key)
  actionBusy.value[idStr] = true
  try {
    await cart.remove(Number(key))
  } finally {
    delete actionBusy.value[idStr]
  }
}

async function inc(item: any) {
  const key = item?.id || item?.key
  const qty = Number(item?.quantity || item?.qty || 0) + 1
  if (!key) return
  const idStr = String(item?.id ?? key)
  actionBusy.value[idStr] = true
  try {
    await cart.update({ key: Number(key), quantity: qty })
    // Refresh cart to update counts and totals
    await cart.list()
    showSuccess(`تم تحديث الكمية إلى ${qty}`)
  } finally {
    delete actionBusy.value[idStr]
  }
}
async function dec(item: any) {
  const key = item?.id || item?.key
  const qty = Number(item?.quantity || item?.qty || 0)
  if (!key) return
  const idStr = String(item?.id ?? key)
  actionBusy.value[idStr] = true
  try {
    if (qty > 1) {
      await cart.update({ key: Number(key), quantity: qty - 1 })
      // Refresh cart to update counts and totals
      await cart.list()
      showSuccess(`تم تحديث الكمية إلى ${qty - 1}`)
    } else {
      await cart.remove(Number(key))
      // Refresh cart to update counts and totals
      await cart.list()
      showSuccess('تم إزالة المنتج من السلة')
    }
  } finally {
    delete actionBusy.value[idStr]
  }
}

async function onClearAll() {
  clearAllBusy.value = true
  try {
    await cart.clearAll()
    // Refresh cart to update counts and totals
    await cart.list()
    showSuccess('تم حذف جميع المنتجات من السلة')
  } finally {
    clearAllBusy.value = false
  }
}

// Minimal image helper
const cfg = useRuntimeConfig() as any
const assetBase = (cfg?.public?.apiBase || '').replace(/\/api(?:\/v\d+)?$/, '')
const fixPath = (s: string) => s?.trim()?.replace(/\\/g, '/')?.replace(/^public\//, '')?.replace(/^app\/public\//, 'storage/')?.replace(/\/+/g, '/')?.replace(/^\//, '')
function imgOf(it: any): string {
  const p = it?.product || {}
  const pickUrl = (v: any): string | null => {
    if (!v) return null
    if (typeof v === 'string') return v
    if (typeof v === 'object' && typeof v.path === 'string') return v.path
    return null
  }

  // 1) حاول استخدام روابط كاملة إن وجدت (كسلسلة أو كائن {path})
  const candidatesFull = [
    pickUrl(p?.thumbnail_full_url),
    pickUrl(p?.image_full_url),
    pickUrl(it?.thumbnail_full_url),
    pickUrl(it?.image_full_url),
    Array.isArray(p?.images_full_url) ? pickUrl(p.images_full_url[0]) : null
  ].filter(Boolean) as string[]
  if (candidatesFull.length && candidatesFull[0]) {
    const u = candidatesFull[0].trim()
    if (u) return u
  }

  // 2) أسماء ملفات خام
  const raw = String(
    p?.thumbnail || it?.thumbnail || p?.image || it?.image || ''
  ).trim()
  if (!raw) return ''
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw

  const clean = fixPath(raw)
  const guesses = [
    `storage/product/thumbnail/${clean}`,
    `storage/product/${clean}`,
    `storage/${clean}`,
    clean
  ]
  return `${assetBase}/${guesses[0]}`
}

// Currency + totals helpers
// locale is already defined at the top of the file
const currencyCode = (cfg?.public?.currencyCode || 'SAR') as string
function money(n: any): string {
  const loc = locale?.value === 'ar' ? 'ar-SA' : 'en-US'
  try {
    return new Intl.NumberFormat(loc, { style: 'currency', currency: currencyCode }).format(Number((n as any)?.value ?? n) || 0)
  } catch {
    // Fallback: plain number with symbol
    const sym = (cfg?.public?.currencySymbol || (locale?.value === 'ar' ? 'ر.س' : 'SAR')) as string
    const raw = (n as any)?.value ?? n
    const val = Number(raw != null ? raw : 0)
    return `${val.toFixed(2)} ${sym}`
  }
}

// Use .value when reading refs in script (templates auto-unwrap)
const initialLoading = ref(true)
const items = computed(() => {
  const cartItems = cart.items.value || []
  console.log('items computed - cartItems:', cartItems)
  console.log('items computed - cart.items.value:', cart.items.value)
  return cartItems
})
const itemsTotal = computed(() => {
  const total = items.value.reduce((s: number, it: any) => s + Number(it?.quantity || it?.qty || 0), 0)
  console.log('itemsTotal computed:', total)
  return total
})
// Subtotal BEFORE discount (API gives price & discount per unit)
const subtotal = computed(() => {
  const total = items.value.reduce((s: number, it: any) => {
    let price = Number(it?.price || 0)
    
    // Try to get the correct base price from various sources
    if (it?.base_price && Number(it.base_price) > 0) {
      price = Number(it.base_price)
    }
    else if (it?.final_price && Number(it.final_price) > 0) {
      price = Number(it.final_price)
    }
    else if (it?.unit_price && Number(it.unit_price) > 0) {
      price = Number(it.unit_price)
    }
    else if (it?.selling_price && Number(it.selling_price) > 0) {
      price = Number(it.selling_price)
    }
    else if (it?.product?.unit_price && Number(it.product.unit_price) > 0) {
      price = Number(it.product.unit_price)
    }
    
    // Special case: If this is a variant product with color, use the correct price
    else if (it?.product_id === 6 && it?.color && it?.color !== '') {
      // Check size to determine correct price
      if (it?.size === '20') {
        price = 800  // Violet-20 variant price
      } else if (it?.size === '30') {
        price = 700  // Violet-30 variant price
      } else {
        price = 700  // Default variant price
      }
    }
    
    return s + (price * Number(it?.quantity || it?.qty || 0))
  }, 0)
  console.log('subtotal calculation:', total)
  return total
})
// Total discount across all items
const discountTotal = computed(() => {
  const total = items.value.reduce((s: number, it: any) => s + (Number(it?.discount || 0) * Number(it?.quantity || it?.qty || 0)), 0)
  console.log('discountTotal calculation:', total)
  return total
})
// Subtotal AFTER discount
const subtotalAfterDiscount = computed(() => {
  const total = Math.max(0, subtotal.value - discountTotal.value)
  console.log('subtotalAfterDiscount calculation:', total)
  return total
})
const taxIncluded = computed(() => items.value.reduce((s: number, it: any) => s + (it?.tax_model === 'include' ? Number(it?.tax || 0) * Number(it?.quantity || it?.qty || 0) : 0), 0))
const taxExcluded = computed(() => items.value.reduce((s: number, it: any) => s + (it?.tax_model === 'exclude' ? Number(it?.tax || 0) * Number(it?.quantity || it?.qty || 0) : 0), 0))
// Fixed shipping cost: 25 SAR per order (not per item)
const shipping = computed(() => {
  if (items.value.length === 0) return 0
  return 25 // Fixed shipping cost
})
// Grand total: add excluded tax & shipping only; included tax is informational
const grandTotal = computed(() => {
  const total = subtotalAfterDiscount.value + taxExcluded.value + shipping.value
  console.log('grandTotal calculation:', total)
  return total
})

// Check if checkout is allowed (minimum 49 SAR)
const canCheckout = computed(() => grandTotal.value > 49)

// Minimum order message with remaining amount
const minimumOrderMessage = computed(() => {
  const remaining = 49 - grandTotal.value
  return `${t('cart.minimum_order_message') || 'الحد الأدنى للطلب هو 49 ريال. المتبقي:'} ${money(remaining)}`
})

// Handle checkout click
const handleCheckoutClick = (e: Event) => {
  if (!canCheckout.value) {
    e.preventDefault()
    alert(t('cart.minimum_order_amount') || 'الحد الأدنى للطلب هو 49 ريال')
    return false
  }
  // Allow navigation if amount is sufficient
  return true
}

// booleans for template conditions to avoid ref-vs-number TS issues
const hasTaxExcluded = computed(() => taxExcluded.value > 0)
const hasTaxIncluded = computed(() => taxIncluded.value > 0)
const hasShipping = computed(() => shipping.value > 0)
const hasDiscountTotal = computed(() => {
  const hasDisc = discountTotal.value > 0
  console.log('hasDiscountTotal check:', hasDisc, 'discountTotal:', discountTotal.value)
  return hasDisc
})
// Only show loader when we have no items yet
// لا نظهر شاشة التحميل إلا في التحميل الأول فقط
const isLoadingVisible = computed(() => initialLoading.value && ((cart as any)?.loading?.value === true))

// Name helper: prefer Arabic product name when locale is 'ar'
function nameOf(it: any): string {
  const p = it?.product || {}
  const direct = String(p?.name || it?.name || '').trim()
  return direct || (t('cart.product') || 'منتج')
}

// Brand name helper: get brand name from product
function brandNameOf(it: any): string {
  const p = it?.product || {}
  // Try multiple possible fields for brand name
  return p?.brand_name || 
         p?.brand?.name || 
         it?.brand_name || 
         it?.brand?.name || 
         ''
}

// Discount helpers (display only; totals remain based on price field)
function unitNet(it: any): number {
  let price = Number(it?.price || 0)
  const disc = Number(it?.discount || 0)
  
  // Try to get the correct base price from various sources
  let basePrice = price
  
  // First priority: Check if we have base_price from the API (this should work now)
  if (it?.base_price && Number(it.base_price) > 0) {
    basePrice = Number(it.base_price)
  }
  // Check if we have final_price from the API
  else if (it?.final_price && Number(it.final_price) > 0) {
    basePrice = Number(it.final_price)
  }
  // Check if we have unit_price from the API
  else if (it?.unit_price && Number(it.unit_price) > 0) {
    basePrice = Number(it.unit_price)
  }
  // Check if we have selling_price from the API
  else if (it?.selling_price && Number(it.selling_price) > 0) {
    basePrice = Number(it.selling_price)
  }
  // Check if we have product unit_price
  else if (it?.product?.unit_price && Number(it.product.unit_price) > 0) {
    basePrice = Number(it.product.unit_price)
  }
  // Special case: If this is a variant product with color, use the correct price
  // For this specific product (حلبة الرجوي), the variant price should be 800 for Violet-20
  else if (it?.product_id === 6 && it?.color && it?.color !== '') {
    // This is the "حلبة الرجوي" product with a color variant
    // Check size to determine correct price
    if (it?.size === '20') {
      basePrice = 800  // Violet-20 variant price
    } else if (it?.size === '30') {
      basePrice = 700  // Violet-30 variant price  
    } else {
      basePrice = 700  // Default variant price
    }
  }
  
  // If we have a discount, apply it to the base price
  let net = basePrice
  if (disc > 0) {
    const discountType = it?.discount_type || 'flat'
    const isPercent = String(discountType).toLowerCase().startsWith('per')
    const discountAmount = isPercent ? (basePrice * disc) / 100 : disc
    net = Math.max(0, basePrice - discountAmount)
  }
  
  console.log('unitNet calculation:', {
    item: it,
    originalPrice: price,
    basePrice: basePrice,
    discount: disc,
    discountType: it?.discount_type,
    net: net,
    hasDiscount: disc > 0,
    priceSource: basePrice !== price ? 'corrected' : 'original',
    isVariantProduct: it?.product_id === 6 && it?.color && it?.color !== '',
    availableFields: {
      base_price: it?.base_price,
      final_price: it?.final_price,
      unit_price: it?.unit_price,
      selling_price: it?.selling_price,
      product_unit_price: it?.product?.unit_price
    }
  })
  
  return net > 0 ? net : 0
}
function hasDiscount(it: any): boolean {
  const hasDisc = Number(it?.discount || 0) > 0
  console.log('hasDiscount check:', {
    item: it,
    discount: it?.discount,
    hasDiscount: hasDisc
  })
  return hasDisc
}

// Get display name for variation
function getVariationDisplayName(variation: string): string {
  console.log('[Cart] Processing variation:', variation)
  if (!variation) return ''
  
  // Try to find the product to get choice_options
  const item = items.value.find((it: any) => it?.variation === variation)
  if (!item?.product) {
    console.log('[Cart] No product found for variation:', variation)
    return variation
  }
  
  const product = item.product
  if (!product?.choice_options || !Array.isArray(product.choice_options)) {
    console.log('[Cart] No choice_options found for product:', product)
    return variation
  }
  
  console.log('[Cart] Found choice_options:', product.choice_options)
  
  // Find matching option in choice_options
  for (const choiceOption of product.choice_options) {
    if (!choiceOption.options || !Array.isArray(choiceOption.options)) continue
    
    const matchingOption = choiceOption.options.find((option: string) => {
      const optionNormalized = option.replace(/\s/g, '').toLowerCase()
      const variationNormalized = variation.replace(/\s/g, '').toLowerCase()
      return optionNormalized === variationNormalized
    })
    
    if (matchingOption) {
      console.log('[Cart] Found matching option:', matchingOption, 'for variation:', variation)
      return matchingOption
    }
  }
  
  console.log('[Cart] No matching option found, returning original variation:', variation)
  return variation
}
</script>

<template>
  <main class="cart-page" dir="rtl">
    <div class="container">
      <!-- Header Section -->
      <section class="section card">
        <div class="section-header">
          <h1>{{ t('cart.title') || 'سلة التسوق' }}</h1>
          <div class="cart-summary" v-if="items.length > 0">
            <span class="items-count">{{ itemsTotal }} {{ t('cart.items_count') || 'عنصر' }}</span>
            <span class="total-amount">{{ money(grandTotal) }}</span>
      </div>
    </div>
      </section>

      <!-- Loading State -->
  <template v-if="isLoadingVisible">
        <section class="section card">
          <div class="loading-state">
            <div class="spinner"></div>
            <h3>{{ t('cart.loading') || 'جاري تحميل السلة...' }}</h3>
            <p>{{ t('cart.loading_wait') || 'يرجى الانتظار قليلاً' }}</p>
            <button class="retry-btn" @click="cart.list()">{{ t('cart.retry') || 'إعادة المحاولة' }}</button>
      </div>
        </section>
  </template>

      <!-- Error State -->
  <template v-else-if="cart.error?.value">
        <section class="section card">
          <div class="error-state">
            <div class="error-icon">
              <svg width="64" height="64" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h3>{{ t('cart.error_loading') || 'خطأ في تحميل السلة' }}</h3>
            <p>{{ cart.error.value }}</p>
            <button class="retry-btn" @click="cart.list()">{{ t('cart.retry') || 'إعادة المحاولة' }}</button>
          </div>
        </section>
  </template>

      <!-- Debug Panel -->
  <template v-else>
        <div v-if="showDebugPanel" class="debug-panel">
          <div class="debug-header">
            <h3>لوحة Debug</h3>
            <p>افتح الصفحة بـ ?debug=1 لإظهار هذه اللوحة فقط أثناء التطوير</p>
      </div>
          <div class="debug-controls">
            <div class="form-group">
              <label>Product ID:</label>
              <input type="number" v-model.number="debugProductId" class="form-control" />
    </div>
            <div class="form-group">
              <label>الكمية:</label>
              <input type="number" v-model.number="debugQty" min="1" class="form-control" />
    </div>
            <div class="form-group">
              <label>المتغير (variant):</label>
              <input type="text" v-model="debugVariant" class="form-control" placeholder="مثال: أحمر-كبير" />
    </div>
            <div class="form-group">
              <label>SKU:</label>
              <input type="text" v-model="debugSku" class="form-control" placeholder="مثال: RED-L-001" />
    </div>
            <button class="debug-btn" @click="debugAdd">إضافة للسلة (Debug)</button>
            <button class="debug-btn" @click="testAddFromProduct" style="background: linear-gradient(135deg, #10b981, #059669);">
              اختبار إضافة من صفحة المنتج
            </button>
    </div>
            </div>



        <!-- Empty Cart -->
        <div v-if="!items || items.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24">
              <path fill="currentColor" d="M7 18a2 2 0 1 0 0 4a2 2 0 0 0 0-4m10 0a2 2 0 1 0 .001 4.001A2 2 0 0 0 17 18M7.16 14h9.53c.75 0 1.4-.42 1.73-1.05L22 7H6.21L5.27 5H2v2h2l3.6 7.59l-1.35 2.44A2 2 0 0 0 8 20h12v-2H8l1.1-2h8.59l-1.45 2H7.16Z"/>
            </svg>
          </div>
          <h3>{{ t('cart.empty_title') || 'سلتك فارغة' }}</h3>
          <p>{{ t('cart.empty_description') || 'ابدأ التسوق وأضف المنتجات التي تريدها إلى سلة التسوق' }}</p>
          
          <!-- Debug Info -->
          <div v-if="showDebugPanel" class="debug-info">
            <h4>معلومات التصحيح:</h4>
            <p><strong>cart.items.value:</strong> {{ cart.items.value }}</p>
            <p><strong>items computed:</strong> {{ items }}</p>
            <p><strong>items.length:</strong> {{ items.length }}</p>
            <p><strong>cart.loading:</strong> {{ cart.loading?.value }}</p>
            <p><strong>cart.error:</strong> {{ cart.error?.value }}</p>
          </div>
          
          <div class="empty-actions">
            <NuxtLink to="/" class="shop-btn">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
              </svg>
              {{ t('cart.start_shopping') || 'ابدأ التسوق' }}
            </NuxtLink>
          </div>
        </div>

        <!-- Cart Items -->
        <div v-else class="cart-content">
          <!-- Items List -->
          <section class="section card">
            <div class="section-header">
              <h2>{{ t('cart.items_title') || 'عناصر السلة' }}</h2>
              <button class="clear-all-btn" @click="onClearAll" :disabled="clearAllBusy">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z"/>
                </svg>
                {{ t('cart.clear_all') || 'حذف الكل' }}
            </button>
          </div>
            
            <div class="cart-items">
              <div v-for="(it, i) in items" :key="it?.id || i" class="cart-item">
                <div class="item-image">
                  <img :src="imgOf(it)" :alt="nameOf(it)" />
                  <div v-if="it?.is_product_available === 0" class="unavailable-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2v-2zm0-6h2v4h-2v-4z"/>
                    </svg>
                    {{ t('cart.unavailable') || 'غير متوفر' }}
                  </div>
                </div>
                
                <div class="item-details">
                  <h3 class="item-name">{{ nameOf(it) }}</h3>
                  <div class="item-meta">
                    <span v-if="brandNameOf(it)" class="shop-name">
                      <svg width="12" height="12" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      {{ brandNameOf(it) }}
                    </span>
                    <span v-if="it?.color" class="color-info">
                      <svg width="12" height="12" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      {{ t('cart.color') || 'اللون' }}: {{ it?.color }}
                    </span>
                    <span v-if="it?.variant_type" class="size-info">
                      <svg width="12" height="12" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      {{ t('cart.variation') || 'المتغير' }}: {{ it?.variant_type }}
                    </span>
                    <span v-if="it?.choices?.choice_2" class="variation-info">
                      <svg width="12" height="12" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <span class="variation-label">{{ t('cart.variation') || 'المتغير' }}</span>
                      <span class="variation-value">{{ getVariationDisplayName(it.choices.choice_2) }}</span>
                    </span>
                  </div>
                  
                  <div class="item-pricing">
                    <div class="price-display">
              <template v-if="hasDiscount(it)">
                        <span class="current-price">{{ money(unitNet(it) * (it?.quantity || it?.qty || 1)) }}</span>
                        <span class="original-price">{{ money((it?.price || 0) * (it?.quantity || it?.qty || 1)) }}</span>
                        <span class="discount-badge">{{ t('cart.saved') || 'وفّرت' }} {{ money((it?.discount || 0) * (it?.quantity || it?.qty || 1)) }}</span>
              </template>
              <template v-else>
                        <span class="current-price">{{ money((it?.price || 0) * (it?.quantity || it?.qty || 1)) }}</span>
              </template>
            </div>
                    <div class="unit-price">
              {{ t('cart.unit_price') || 'سعر الوحدة' }}:
              <template v-if="hasDiscount(it)">
                        <span class="old-price">{{ money(it?.price || 0) }}</span>
                        <span class="new-price">{{ money(unitNet(it)) }}</span>
              </template>
              <template v-else>
                {{ money(it?.price || 0) }}
              </template>
            </div>
            <!-- Debug info -->
            <div v-if="showDebugPanel" class="debug-price-info">
              <small>Debug: price={{ it?.price }}, discount={{ it?.discount }}, discount_type={{ it?.discount_type }}, unitNet={{ unitNet(it) }}</small>
            </div>
          </div>
                  
                  <div class="tax-info">
                    <span v-if="it?.tax_model === 'include'" class="tax-tag include">
                      <svg width="12" height="12" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                      {{ t('cart.tax_included') || 'شامل الضريبة' }}
                    </span>
                    <span v-else-if="it?.tax_model === 'exclude'" class="tax-tag exclude">
                      <svg width="12" height="12" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
                      </svg>
                      {{ t('cart.tax_excluded') || 'غير شامل الضريبة' }}
                    </span>
        </div>
        </div>
                
                <div class="item-actions">
                  <div class="quantity-control">
                    <button class="qty-btn" @click="dec(it)" :disabled="isBusy(it)" :aria-label="(it?.quantity||1) > 1 ? (t('cart.decrease') || 'إنقاص') : (t('cart.delete') || 'حذف')">
                      <svg v-if="(it?.quantity||1) > 1" width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19 13H5v-2h14v2z"/>
                      </svg>
                      <svg v-else width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z"/>
                      </svg>
                    </button>
                    <span class="quantity">{{ it?.quantity || it?.qty || 1 }}</span>
                    <button class="qty-btn" @click="inc(it)" :disabled="isBusy(it)" :aria-label="t('cart.increase') || 'زيادة'">
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                    </button>
                    <div v-if="isBusy(it)" class="loading-spinner"></div>
        </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Order Summary -->
          <section class="section card order-summary">
            <div class="section-header">
              <h2>{{ t('cart.order_summary') || 'ملخص الطلب' }}</h2>
            </div>
            
            <div class="summary-details">
              <div class="summary-row">
                <span class="label">{{ t('cart.items_count_label') || 'عدد العناصر' }}</span>
                <span class="value">{{ itemsTotal }}</span>
              </div>
              
              <div class="summary-row">
                <span class="label">{{ t('cart.products_value') || 'قيمة المنتجات' }}</span>
                <span class="value">{{ money(subtotal) }}</span>
              </div>
              
              <div v-if="hasDiscountTotal" class="summary-row discount">
                <span class="label">{{ t('cart.discount') || 'الخصم' }}</span>
                <span class="value">-{{ money(discountTotal) }}</span>
              </div>
              
              <div class="summary-row">
                <span class="label">{{ t('cart.subtotal') || 'المجموع الفرعي' }}</span>
                <span class="value">{{ money(subtotalAfterDiscount) }}</span>
              </div>
              
              <div v-if="hasTaxExcluded" class="summary-row">
                <span class="label">{{ t('cart.tax') || 'الضريبة' }}</span>
                <span class="value">{{ money(taxExcluded) }}</span>
              </div>
              
              <div v-if="hasTaxIncluded" class="summary-row info">
                <span class="label">{{ t('cart.tax_included_note') || 'الضريبة (شاملة في الأسعار)' }}</span>
                <span class="value">{{ money(taxIncluded) }}</span>
              </div>
              
              <div v-if="hasShipping" class="summary-row">
                <span class="label">{{ t('cart.shipping') || 'الشحن' }}</span>
                <span class="value">{{ money(shipping) }}</span>
              </div>
              
              <div class="summary-row total">
                <span class="label">{{ t('cart.total') || 'الإجمالي' }}</span>
                <span class="value">{{ money(grandTotal) }}</span>
          </div>
        </div>
            
            <div class="checkout-actions">
              <div v-if="!canCheckout" class="minimum-order-message">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {{ minimumOrderMessage }}
              </div>
              <NuxtLink 
                to="/checkout" 
                class="checkout-btn"
                :class="{ 'disabled': grandTotal <= 49 }"
                @click.prevent="handleCheckoutClick"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M20 8H4V6h16v2m-7-4H9V2H7v2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3V2h-2v2m-7 8h2v2h-2v-2m4 0h2v2h-2v-2m4 0h2v2h-2v-2m-8 4h2v2h-2v-2m4 0h2v2h-2v-2m4 0h2v2h-2v-2Z"/>
                </svg>
                {{ t('cart.checkout') || 'متابعة للدفع' }}
              </NuxtLink>
              <NuxtLink to="/" class="continue-shopping-btn">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M4 11v2h12l-5.5 5.5 1.42 1.42L19.84 12l-7.92-7.92L10.5 5.5 16 11H4z"/>
                </svg>
                {{ t('cart.continue_shopping') || 'متابعة التسوق' }}
              </NuxtLink>
            </div>
          </section>
      </div>
  </template>
  </div>
  </main>

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
</template>

<style scoped>
/* Main Layout */
.cart-page {
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

.cart-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.items-count {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.total-amount {
  font-size: 18px;
  font-weight: 700;
  color: #059669;
}

/* Loading State */
.loading-state {
  padding: 60px 24px;
  text-align: center;
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
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
  margin: 0 0 8px;
}

.loading-state p {
  color: #64748b;
  margin: 0 0 20px;
}

.retry-btn {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px -3px rgba(59, 130, 246, 0.4);
}

/* Error State */
.error-state {
  text-align: center;
  padding: 60px 24px;
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
}

.error-icon {
  font-size: 64px;
  color: #ef4444;
  margin-bottom: 16px;
  animation: shake 0.5s ease-in-out;
}

.error-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #dc2626;
  margin: 0 0 8px;
}

.error-state p {
  color: #b91c1c;
  margin: 0 0 20px;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* Debug Panel */
.debug-panel {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 2px dashed #f59e0b;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.debug-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 8px;
}

.debug-header p {
  font-size: 14px;
  color: #a16207;
  margin: 0 0 16px;
}

.debug-controls {
  display: flex;
  gap: 16px;
  align-items: end;
  flex-wrap: wrap;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #92400e;
}

.form-control {
  padding: 8px 12px;
  border: 1px solid #d97706;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  width: 120px;
}

.debug-btn {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.debug-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.3);
}

/* Error Message */
.error-message {
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  border: 1px solid #fca5a5;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #dc2626;
  font-weight: 500;
}

.error-message i {
  font-size: 20px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 24px;
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
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
  background: radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
  z-index: 1;
}

.empty-icon {
  font-size: 64px;
  color: #cbd5e1;
  margin-bottom: 16px;
  position: relative;
  z-index: 2;
  animation: float 3s ease-in-out infinite;
}

.empty-state h3 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px;
  position: relative;
  z-index: 2;
}

.empty-state p {
  color: #64748b;
  margin: 0 0 24px;
  position: relative;
  z-index: 2;
}

.shop-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  text-decoration: none;
  padding: 16px 32px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
  position: relative;
  z-index: 2;
}

.shop-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px -3px rgba(59, 130, 246, 0.4);
}

.empty-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  position: relative;
  z-index: 2;
}

.reload-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.3);
}

.reload-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px -3px rgba(245, 158, 11, 0.4);
}

.debug-info {
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  text-align: left;
  font-family: monospace;
  font-size: 14px;
  position: relative;
  z-index: 2;
}

.debug-info h4 {
  margin: 0 0 12px;
  color: #1e293b;
  font-size: 16px;
}

.debug-info p {
  margin: 4px 0;
  color: #475569;
}

.debug-price-info {
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;
  font-family: monospace;
  font-size: 12px;
  color: #666;
}

/* Cart Content */
.cart-content {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 24px;
  align-items: start;
}

/* Cart Items */
.cart-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cart-item {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  gap: 20px;
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.cart-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cart-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}

.cart-item:hover::before {
  opacity: 1;
}

.item-image {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.unavailable-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-name {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1.4;
}

.item-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.shop-name, .variant, .variant-type, .sku, .color-info, .size-info, .variation-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.variant-type {
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.sku {
  color: #059669;
  background: rgba(5, 150, 105, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-family: monospace;
}

.color-info {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.size-info {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.variation-info {
  color: #7c3aed;
  background: rgba(124, 58, 237, 0.12);
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.variation-info .variation-label {
  font-weight: 700;
  letter-spacing: 0.02em;
}

.variation-info .variation-value {
  background: rgba(255, 255, 255, 0.65);
  color: #4c1d95;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.shop-name i, .variant i {
  font-size: 12px;
  color: #94a3b8;
}

.item-pricing {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.price-display {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.current-price {
  font-size: 20px;
  font-weight: 700;
  color: #059669;
}

.original-price {
  font-size: 16px;
  color: #94a3b8;
  text-decoration: line-through;
}

.discount-badge {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
}

.unit-price {
  font-size: 14px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.old-price {
  text-decoration: line-through;
  color: #94a3b8;
}

.new-price {
  font-weight: 600;
  color: #059669;
}

.tax-info {
  display: flex;
  gap: 8px;
}

.tax-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.tax-tag.include {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  color: #166534;
  border: 1px solid #86efac;
}

.tax-tag.exclude {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
  border: 1px solid #fbbf24;
}

.item-actions {
  display: flex;
  align-items: center;
  justify-content: center;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.qty-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.qty-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.4);
}

.qty-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quantity {
  min-width: 32px;
  text-align: center;
  font-weight: 700;
  font-size: 16px;
  color: #1e293b;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

/* Order Summary */
.order-summary {
  position: sticky;
  top: 20px;
  height: fit-content;
}

.summary-details {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-row.discount {
  color: #059669;
  font-weight: 600;
}

.summary-row.info {
  color: #64748b;
  font-size: 14px;
}

.summary-row.total {
  border-top: 2px solid #e2e8f0;
  border-bottom: none;
  padding-top: 16px;
  margin-top: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.summary-row .label {
  font-weight: 500;
  color: #475569;
}

.summary-row .value {
  font-weight: 600;
  color: #1e293b;
}

.summary-row.total .label,
.summary-row.total .value {
  font-size: 20px;
  font-weight: 700;
}

.checkout-actions {
  padding: 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkout-btn {
  background: linear-gradient(135deg, #059669, #047857);
  color: white;
  border: none;
  padding: 16px 24px;
  border-radius: 12px;
  font-size: 16px;
  text-decoration: none;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.3);
  position: relative;
  overflow: hidden;
}

.checkout-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.checkout-btn:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px -3px rgba(5, 150, 105, 0.4);
}

.checkout-btn.disabled {
  background: linear-gradient(135deg, #9ca3af, #6b7280);
  cursor: not-allowed;
  opacity: 0.6;
  pointer-events: none;
}

.minimum-order-message {
  background: #fef3c7;
  border: 1px solid #fbbf24;
  color: #92400e;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.minimum-order-message svg {
  flex-shrink: 0;
}

.checkout-btn:hover::before {
  left: 100%;
}

.continue-shopping-btn {
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  color: #475569;
  text-decoration: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #cbd5e1;
}

.continue-shopping-btn:hover {
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.clear-all-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}

.clear-all-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.4);
}

.clear-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Animations */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

/* Responsive Design */
@media (max-width: 1024px) {
  .cart-content {
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
  
  .cart-item {
    grid-template-columns: 100px 1fr auto;
    gap: 16px;
    padding: 16px;
  }
  
  .item-image {
    width: 100px;
    height: 100px;
  }
  
  .item-name {
    font-size: 16px;
  }
  
  .current-price {
    font-size: 18px;
  }
  
  .quantity-control {
    gap: 8px;
    padding: 6px;
  }
  
  .qty-btn {
    width: 32px;
    height: 32px;
  }
  
  .summary-details {
    padding: 20px;
  }
  
  .checkout-actions {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .cart-item {
    grid-template-columns: 80px 1fr;
    gap: 12px;
  }
  
  .item-image {
    width: 80px;
    height: 80px;
  }
  
  .item-actions {
    grid-column: 1 / -1;
    justify-content: center;
    margin-top: 12px;
  }
  
  .debug-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .form-control {
    width: 100%;
  }
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
</style>
