<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
// Nuxt i18n composable to build locale-switching links
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { useSwitchLocalePath } from '#i18n'
import { useWishlist } from '../composables/useWishlist'
import { useCompare } from '../composables/useCompare'
import CategoriesSidebar from './CategoriesSidebar.vue'

const router = useRouter()
const { $get, $post } = useApi()
const auth = useAuth()
const cart = useCart()
const wishlist = useWishlist()
const compare = useCompare()
const { t, locale: i18nLocale } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const uiDir = computed(() => ((i18nLocale as any).value === 'ar' ? 'rtl' : 'ltr'))
const isAr = computed(() => (i18nLocale as any).value === 'ar')
const currentLangCode = computed(() => (isAr.value ? 'AR' : 'EN'))


const isCartOpen = ref(false)

const toggleCart = () => {
  isCartOpen.value = !isCartOpen.value
}

const closeCart = () => {
  isCartOpen.value = false
}

// Cart count
const cartCount = computed(() => {
  const items = cart.items.value || []
  return items.reduce((total: number, item: any) => {
    return total + Number(item?.quantity || item?.qty || 0)
  }, 0)
})

// Cart total calculation
const cartTotal = computed(() => {
  const items = cart.items.value || []
  return items.reduce((total: number, item: any) => {
    let price = Number(item?.price || 0)
    
    // Try to get the correct base price from various sources
    if (item?.base_price && Number(item.base_price) > 0) {
      price = Number(item.base_price)
    }
    else if (item?.final_price && Number(item.final_price) > 0) {
      price = Number(item.final_price)
    }
    else if (item?.unit_price && Number(item.unit_price) > 0) {
      price = Number(item.unit_price)
    }
    else if (item?.selling_price && Number(item.selling_price) > 0) {
      price = Number(item.selling_price)
    }
    else if (item?.product?.unit_price && Number(item.product.unit_price) > 0) {
      price = Number(item.product.unit_price)
    }
    
    // Special case: If this is a variant product with color, use the correct price
    else if (item?.product_id === 6 && item?.color && item?.color !== '') {
      // Check size to determine correct price
      if (item?.size === '20') {
        price = 800  // Violet-20 variant price
      } else if (item?.size === '30') {
        price = 700  // Violet-30 variant price
      } else {
        price = 700  // Default variant price
      }
    }
    
    // Apply discount if exists
    let netPrice = price
    const discount = Number(item?.discount || 0)
    if (discount > 0) {
      const discountType = item?.discount_type || 'flat'
      const isPercent = String(discountType).toLowerCase().startsWith('per')
      const discountAmount = isPercent ? (price * discount) / 100 : discount
      netPrice = Math.max(0, price - discountAmount)
    }
    
    return total + (netPrice * Number(item?.quantity || item?.qty || 0))
  }, 0)
})

// Currency helper
const runtimeConfig = useRuntimeConfig() as any
const currencyCode = (runtimeConfig?.public?.currencyCode || 'SAR') as string

function money(n: any): string {
  const loc = i18nLocale.value === 'ar' ? 'ar-SA' : 'en-US'
  try {
    return new Intl.NumberFormat(loc, { style: 'currency' }).format(Number((n as any)?.value ?? n) || 0)
  } catch {
    const sym = (runtimeConfig?.public?.currencySymbol || (i18nLocale.value === 'ar' ? 'ر.س' : 'SAR')) as string
    const raw = (n as any)?.value ?? n
    const val = Number(raw != null ? raw : 0)
    return `${val.toFixed(2)}`
  }
}

// Wishlist count
const wishlistCount = computed(() => {
  return wishlist.wishlistCount.value || 0
})

// Comparison count
const compareCount = computed(() => {
  return compare.compareCount.value
})

// Load cart, wishlist and compare on mount
onMounted(async () => {
  try {
    await cart.list()
  } catch (e) {
    console.warn('Failed to load cart in header:', e)
  }
  
  // Load wishlist if user is authenticated
  if (auth.user.value) {
    try {
      await wishlist.list()
    } catch (e) {
      console.warn('Failed to load wishlist in header:', e)
    }
  }
  
  // Initialize compare from localStorage
  compare.init()
})

// Watch for auth changes to load wishlist
watch(() => auth.user.value, async (newUser) => {
  if (newUser) {
    try {
      await wishlist.list()
    } catch (e) {
      console.warn('Failed to load wishlist after login:', e)
    }
  } else {
    // Clear wishlist when user logs out
    // Clear wishlist when user logs out
    // wishlist.wishlist.value = []
  }
}, { immediate: false })

// Config
const { data: cfg } = await useAsyncData<any>('cfg-header', async () => {
  try {
    return await $get('v1/config')
  } catch (e) {
    return { name: '6valley' }
  }
})

const brandName = computed(() => {
  const v = cfg?.value as any
  return v?.company_name || v?.value?.name || v?.name || '6valley'
})

// Categories (fallback if API not ready)
type Cat = { id: number | string; name: string; children?: Cat[] }
const fallbackCats: Cat[] = [
  { id: 1, name: 'مكياج', children: [
    { id: '1-1', name: 'الوجه' },
    { id: '1-2', name: 'العيون' },
    { id: '1-3', name: 'الشفاه' },
  ]},
  { id: 2, name: 'العناية', children: [
    { id: '2-1', name: 'البشرة' },
    { id: '2-2', name: 'الشعر' },
  ]},
  { id: 3, name: 'العطور' },
]

const { data: catRes } = await useAsyncData<any>('header-cats', async () => {
  try {
    // Try a few common shapes
    const r = await $get('v1/categories')
    return r
  } catch (e) {
    return null
  }
})

function normalizeCat(item: any): Cat {
  const childrenSrc = Array.isArray(item?.children)
    ? item.children
    : Array.isArray(item?.childes)
      ? item.childes
      : []
  return {
    id: item?.id ?? item?.category_id ?? String(Math.random()),
    name: item?.name || item?.translation?.name || item?.title || '',
    children: childrenSrc.map((sc: any) => normalizeCat(sc)),
  }
}

const categories = computed<Cat[]>(() => {
  const raw = catRes?.value
  if (!raw) return fallbackCats
  if (Array.isArray(raw)) return raw.map(normalizeCat)
  if (Array.isArray(raw?.data)) return raw.data.map(normalizeCat)
  if (Array.isArray(raw?.categories)) return raw.categories.map(normalizeCat)
  return fallbackCats
})

// Get first 5 main categories for navigation
const mainCategories = computed<Cat[]>(() => {
  const cats = categories.value
  // If we have categories from API, take first 5
  if (cats.length > 0) {
    return cats.slice(0, 5)
  }
  // Fallback to predefined categories
  return fallbackCats.slice(0, 5)
})

// UI State
const showCats = ref(false)
const searchOpen = ref(false)
const q = ref('')
const loadingSearch = ref(false)
const suggestions = ref<string[]>([])
const products = ref<any[]>([])
const showLang = ref(false)
const loginModalOpen = useState('loginModalOpen', () => false)
const hoveredCategory = ref<any>(null)
const hoveredMegaCategory = ref<any>(null)
const keepMegaMenuOpen = ref(false)
const mobileMenuOpen = ref(false)
// Keep a lightweight dictionary for suggestions/typo-fix
const recentNames = ref<string[]>([])

// Global loading state
const globalLoading = ref(false)
const loadingProgress = ref(0)
const loadingMessage = ref('')

// Current route for active navigation
const route = useRoute()

// Watch for route changes and update locale accordingly
watch(() => route.path, (newPath) => {
  if (newPath.startsWith('/en/')) {
    if (i18nLocale.value !== 'en') {
      i18nLocale.value = 'en'
    }
  } else {
    if (i18nLocale.value !== 'ar') {
      i18nLocale.value = 'ar'
    }
  }
}, { immediate: true })

// Helper function to get localized path
// Cart dropdown helper functions
const getItemImage = (item: any): string => {
  const p = item?.product || {}
  
  // Helper to extract URL from object or string
  const extractUrl = (v: any): string | null => {
    if (!v) return null
    if (typeof v === 'string') return v
    if (typeof v === 'object' && v.path) return v.path
    if (typeof v === 'object' && v.key) return v.key
    return null
  }
  
  // Try full URLs first
  const fullUrl = extractUrl(p?.thumbnail_full_url) || 
                  extractUrl(p?.image_full_url) || 
                  extractUrl(item?.thumbnail_full_url) ||
                  extractUrl(item?.image_full_url)
  
  if (fullUrl && /^(https?:|data:|blob:)/i.test(fullUrl)) {
    return fullUrl
  }
  
  // Fallback to simple thumbnail/image fields
  const raw = p?.thumbnail || item?.thumbnail || p?.image || item?.image || ''
  if (!raw) return '/images/placeholder.png'
  
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw
  
  // Build path
  const assetBase = (runtimeConfig?.public?.apiBase || 'https://gotawfeer.com/project/api').replace(/\/api(?:\/v\d+)?$/, '')
  let path = String(raw).trim().replace(/\\/g, '/')
  path = path.replace(/^public\//, '').replace(/^app\/public\//, '').replace(/^storage\//, '')
  
  if (!path.includes('/')) {
    path = `storage/app/public/product/thumbnail/${path}`
  } else if (!path.startsWith('storage/')) {
    path = `storage/app/public/product/${path}`
  }
  
  return `${assetBase}/${path}`
}

const getItemName = (item: any): string => {
  const p = item?.product || {}
  return p?.name || item?.name || item?.product_name || p?.product_name || t('product') || 'منتج'
}

const getItemQuantity = (item: any): number => {
  return Number(item?.quantity || item?.qty || 1)
}

const formatItemPrice = (item: any): string => {
  let price = Number(item?.price || 0)
  
  // Try different price fields
  if (item?.base_price && Number(item.base_price) > 0) {
    price = Number(item.base_price)
  } else if (item?.final_price && Number(item.final_price) > 0) {
    price = Number(item.final_price)
  } else if (item?.unit_price && Number(item.unit_price) > 0) {
    price = Number(item.unit_price)
  } else if (item?.product?.unit_price && Number(item.product.unit_price) > 0) {
    price = Number(item.product.unit_price)
  }
  
  // Apply discount if exists
  const discount = Number(item?.discount || 0)
  if (discount > 0) {
    const discountType = item?.discount_type || 'flat'
    const isPercent = String(discountType).toLowerCase().startsWith('per')
    const discountAmount = isPercent ? (price * discount) / 100 : discount
    price = Math.max(0, price - discountAmount)
  }
  
  const qty = getItemQuantity(item)
  const total = price * qty
  
  return money(total)
}

const removeItem = async (item: any) => {
  const key = item?.id || item?.key
  if (!key) return
  
  try {
    await cart.remove(Number(key))
    await cart.list() // Refresh cart
  } catch (error: any) {
    console.error('Error removing item from cart:', error)
  }
}

const increaseQty = async (item: any) => {
  const key = item?.id || item?.key
  if (!key) return
  
  const currentQty = getItemQuantity(item)
  const newQty = currentQty + 1
  
  try {
    await cart.update({ key: Number(key), quantity: newQty })
    await cart.list() // Refresh cart
  } catch (error: any) {
    console.error('Error updating cart quantity:', error)
  }
}

const decreaseQty = async (item: any) => {
  const key = item?.id || item?.key
  if (!key) return
  
  const currentQty = getItemQuantity(item)
  
  if (currentQty > 1) {
    const newQty = currentQty - 1
    try {
      await cart.update({ key: Number(key), quantity: newQty })
      await cart.list() // Refresh cart
    } catch (error: any) {
      console.error('Error updating cart quantity:', error)
    }
  } else {
    // Remove item if quantity is 1
    await removeItem(item)
  }
}

const getRemainingForFreeShipping = (): number => {
  const FREE_SHIPPING_THRESHOLD = 200 // Adjust based on your requirement
  const remaining = FREE_SHIPPING_THRESHOLD - cartTotal.value
  return Math.max(0, remaining)
}

const handleImageError = (e: Event) => {
  const target = e.target as HTMLImageElement
  if (!target.src.includes('placeholder.png')) {
    target.src = '/images/placeholder.png'
    target.onerror = null // Prevent infinite loop
  }
}

const getLocalizedPath = (path: string) => {
  if (i18nLocale.value === 'en') {
    return path.startsWith('/en') ? path : '/en' + path
  } else {
    return path.startsWith('/en') ? path.substring(3) : path
  }
}

// Check if nav link is active
const isNavLinkActive = (path: string, exact = false) => {
  if (exact) {
    return route.path === path
  }
  return route.path.startsWith(path)
}

// Handle navigation click with loading
const handleNavClick = (pageName: string) => {
  // Start global loading
  const progressInterval = startGlobalLoading(`جاري تحميل ${pageName}...`)
  
  // Complete loading after a short delay
  setTimeout(() => {
    completeGlobalLoading(progressInterval)
  }, 800)
}

// Handle product click with loading
const handleProductClick = () => {
  // Start global loading
  const progressInterval = startGlobalLoading('جاري تحميل المنتج...')
  
  // Close search overlay
  searchOpen.value = false
  
  // Complete loading after a short delay
  setTimeout(() => {
    completeGlobalLoading(progressInterval)
  }, 600)
}

// Global loading functions
const startGlobalLoading = (message = 'جاري التحميل...') => {
  globalLoading.value = true
  loadingProgress.value = 0
  loadingMessage.value = message
  
  // Simulate progress
  const progressInterval = setInterval(() => {
    if (loadingProgress.value < 90) {
      loadingProgress.value += Math.random() * 30
    }
  }, 200)
  
  return progressInterval
}

const completeGlobalLoading = (progressInterval?: any) => {
  if (progressInterval) {
    clearInterval(progressInterval)
  }
  loadingProgress.value = 100
  setTimeout(() => {
    globalLoading.value = false
    loadingProgress.value = 0
    loadingMessage.value = ''
  }, 500)
}

// Login form state
const loginForm = ref({
  email: '',
  password: ''
})
const loginLoading = ref(false)
const loginError = ref('')
const loginSuccess = ref(false)
const logoutSuccess = ref(false)

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
const registerSuccess = ref(false)

// Build a dictionary from categories + popular chips + recent product names
const dictionary = computed<string[]>(() => {
  const set = new Set<string>()
  try {
    categories.value.forEach(c => {
      if (c?.name) set.add(String(c.name))
      ;(c.children || []).forEach(sc => { if (sc?.name) set.add(String(sc.name)) })
    })
  } catch {}
  popularChips.forEach(w => set.add(w))
  recentNames.value.forEach(w => set.add(w))
  return Array.from(set).filter(Boolean)
})

// Arabic-aware normalization to improve fuzzy matching
function normalizeArabic(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, '') // remove diacritics
    .replace(/\u0640/g, '') // tatweel
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()
}

// Simple Levenshtein distance for typo tolerance
function lev(a: string, b: string): number {
  a = normalizeArabic(a)
  b = normalizeArabic(b)
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      )
    }
  }
  return dp[m][n]
}

function getCorrections(term: string, max = 5): string[] {
  const q = normalizeArabic(term)
  if (!q) return []
  const pool = dictionary.value
  // Prefer contains matches first
  const containsMatches = pool.filter(w => normalizeArabic(w).includes(q))
  if (containsMatches.length) {
    // Sort by shortest and then lexicographically
    return containsMatches.sort((a,b)=>a.length - b.length || a.localeCompare(b)).slice(0, max)
  }
  // Fallback to Levenshtein distance
  const scored = pool.map(w => ({ w, d: lev(q, w) }))
  scored.sort((a,b)=> a.d - b.d || a.w.length - b.w.length)
  // Dynamic threshold: half the length (rounded up), min 1, max 4
  const threshold = Math.max(1, Math.min(4, Math.ceil(q.length / 2)))
  return scored.filter(s => s.d <= threshold).slice(0, max).map(s => s.w)
}

const popularChips = [
  'كريم اساس','كونسيلر','ريفلون','ماسكارا','برونزر','رموش','غسول','مرطب','سيروم','فيتامينات البشرة','العناية بالشعر'
]
const brandLogos = [
  'https://dummyimage.com/140x80/fff/333&text=TOPFACE',
  'https://dummyimage.com/140x80/fff/333&text=MAYBELLINE',
  'https://dummyimage.com/140x80/fff/333&text=NARS',
  'https://dummyimage.com/140x80/fff/333&text=ESSENCE',
]

async function fetchSearch(term: string) {
  if (!term || term.trim().length < 2) {
    suggestions.value = []
    products.value = []
    return
  }
  loadingSearch.value = true
  try {
    // Try common search endpoint shape; swallow errors gracefully
    console.log('[header] Searching for:', term)
    const r: any = await $get(`v1/products/search`, { params: { name: term, limit: 20 } })
    console.log('[header] Search response:', r)
    const rawList = Array.isArray(r?.products)
      ? r.products
      : Array.isArray(r?.data)
        ? r.data
        : Array.isArray(r?.products?.data)
          ? r.products.data
          : (Array.isArray(r) ? r : [])
    console.log('[header] Raw list:', rawList)
    // Normalize product fields used in UI
    const list = rawList.map((p: any) => ({
      ...p,
      name: p?.name || p?.product_name || p?.title || '',
      slug: p?.slug || p?.id,
      image_full_url: p?.image_full_url || p?.thumbnail || p?.image || p?.image_url,
      price: p?.price || p?.unit_price || p?.current_price || p?.selling_price,
    }))
    // Collect names for future suggestions
    recentNames.value = [
      ...new Set([
        ...recentNames.value,
        ...list.map((p: any) => String(p?.name || p?.product_name || '')).filter(Boolean)
      ])
    ]
    // Build suggestions: corrections + original term
    const corrections = getCorrections(term, 7)
    suggestions.value = Array.from(new Set([term, ...corrections]))
    products.value = list.slice(0, 20)
    console.log('[header] Final products count:', products.value.length)
  } catch (e) {
    console.error('[header] Search failed:', e)
    // Try fallback search
    try {
      const r: any = await $get(`v1/products`, { params: { search: term, limit: 20 } })
      const rawList = Array.isArray(r?.products)
        ? r.products
        : Array.isArray(r?.data)
          ? r.data
          : Array.isArray(r?.products?.data)
            ? r.products.data
            : (Array.isArray(r) ? r : [])
      const list = rawList.map((p: any) => ({
        ...p,
        name: p?.name || p?.product_name || p?.title || '',
        slug: p?.slug || p?.id,
        image_full_url: p?.image_full_url || p?.thumbnail || p?.image || p?.image_url,
        price: p?.price || p?.unit_price || p?.current_price || p?.selling_price,
      }))
      products.value = list.slice(0, 20)
      console.log('[header] Fallback search products count:', products.value.length)
    } catch (fallbackError) {
      console.error('[header] Fallback search also failed:', fallbackError)
      products.value = []
    }
    const corrections = getCorrections(term, 7)
    suggestions.value = Array.from(new Set([term, ...corrections]))
  } finally {
    loadingSearch.value = false
  }
}

let timer: any
watch(q, (val) => {
  clearTimeout(timer)
  timer = setTimeout(() => fetchSearch(val), 250)
})

function goSearch(term?: string) {
  const query = (term ?? q.value).trim()
  if (!query) return
  searchOpen.value = false
  
  // Start global loading
  const progressInterval = startGlobalLoading('جاري البحث...')
  
  // If no current hits, try a best correction
  const [best] = getCorrections(query, 1)
  const finalQ = (products.value.length === 0 && best && best !== query) ? best : query
  
  router.push({ path: '/shop', query: { q: finalQ } })
  
  // Complete loading after navigation
  setTimeout(() => {
    completeGlobalLoading(progressInterval)
  }, 1000)
}

function goCategory(cat: Cat) {
  // Navigate to category page or shop with category filter
  if (cat.id) {
    // Start global loading
    const progressInterval = startGlobalLoading('جاري تحميل التصنيف...')
    
    // Use getLocalizedPath to maintain locale prefix
    const localizedPath = getLocalizedPath('/shop')
    router.push({ path: localizedPath, query: { category: String(cat.id) } })
    
    // Complete loading after navigation
    setTimeout(() => {
      completeGlobalLoading(progressInterval)
    }, 1000)
  }
  showCats.value = false
}

function handleMegaMenuLeave() {
  // Add a small delay to allow moving to subcategories
  setTimeout(() => {
    if (!keepMegaMenuOpen.value) {
      showCats.value = false
      hoveredMegaCategory.value = null
    }
  }, 150)
}

// Reset keepMegaMenuOpen when showCats changes
watch(showCats, (newValue) => {
  if (!newValue) {
    keepMegaMenuOpen.value = false
    hoveredMegaCategory.value = null
  }
})

function changeLocale(loc: 'ar' | 'en') {
  // Start global loading
  const progressInterval = startGlobalLoading('جاري تغيير اللغة...')
  
  // Set locale first - this is crucial
  i18nLocale.value = loc
  showLang.value = false
  
  // Get current path and add/remove locale prefix
  let currentPath = route.path
  if (loc === 'en') {
    // Add /en prefix if not already present
    if (!currentPath.startsWith('/en')) {
      currentPath = '/en' + currentPath
    }
  } else {
    // Remove /en prefix for Arabic
    if (currentPath.startsWith('/en')) {
      currentPath = currentPath.substring(3)
    }
  }
  
  // Navigate to the new path
  router.push(currentPath)
  
  // Complete loading after navigation
  setTimeout(() => {
    completeGlobalLoading(progressInterval)
  }, 1000)
}

function switchTo(loc: 'ar' | 'en') {
  // Set locale first
  i18nLocale.value = loc
  showLang.value = false
  
  // Get current path and add/remove locale prefix
  let currentPath = route.path
  if (loc === 'en') {
    // Add /en prefix if not already present
    if (!currentPath.startsWith('/en')) {
      currentPath = '/en' + currentPath
    }
  } else {
    // Remove /en prefix for Arabic
    if (currentPath.startsWith('/en')) {
      currentPath = currentPath.substring(3)
    }
  }
  
  // Navigate to the new path and reload
  window.location.href = currentPath
}

// Login functions
async function handleLogin() {
  if (!loginForm.value.email || !loginForm.value.password) {
    loginError.value = t('login.required_fields') || 'جميع الحقول مطلوبة'
    return
  }
  
  loginLoading.value = true
  loginError.value = ''
  
  // Start global loading
  const progressInterval = startGlobalLoading('جاري تسجيل الدخول...')
  
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
      loginModalOpen.value = false
      loginForm.value = { email: '', password: '' }
      // Show success message
      loginSuccess.value = true
      setTimeout(() => {
        loginSuccess.value = false
        // Refresh the page after showing success message
        window.location.reload()
      }, 2000)
    } else if (response?.token) {
      auth.setToken(response.token)
      auth.setUser(response.user || response.data)
      loginModalOpen.value = false
      loginForm.value = { email: '', password: '' }
      // Show success message
      loginSuccess.value = true
      setTimeout(() => {
        loginSuccess.value = false
        // Refresh the page after showing success message
        window.location.reload()
      }, 2000)
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
    completeGlobalLoading(progressInterval)
  }
}

function openLoginModal() {
  loginModalOpen.value = true
  loginError.value = ''
  loginSuccess.value = false
  loginForm.value = { email: '', password: '' }
}

function closeLoginModal() {
  loginModalOpen.value = false
  loginError.value = ''
  loginSuccess.value = false
  loginForm.value = { email: '', password: '' }
}

// Register functions
function openRegisterModal() {
  showRegisterModal.value = true
  loginModalOpen.value = false
  registerError.value = ''
  registerSuccess.value = false
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

function closeRegisterModal() {
  showRegisterModal.value = false
  registerError.value = ''
  registerSuccess.value = false
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

const handleLogout = () => {
  if (confirm(t('logout_confirm') || 'هل أنت متأكد من تسجيل الخروج؟')) {
    auth.setToken(null)
    auth.setUser(null)
    mobileMenuOpen.value = false
    
    // Show success message
    logoutSuccess.value = true
    setTimeout(() => {
      logoutSuccess.value = false
      // Refresh the page after showing success message
      window.location.reload()
    }, 2000)
  }
}

async function handleRegisterSubmit() {
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

  // Start global loading
  const progressInterval = startGlobalLoading('جاري إنشاء الحساب...')

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
      // Show success message
      registerSuccess.value = true
      setTimeout(() => {
        registerSuccess.value = false
        // Refresh the page after showing success message
        window.location.reload()
      }, 2000)
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
    completeGlobalLoading(progressInterval)
  }
}


</script>


<template>
  <header class="app-header" :dir="uiDir">
    <!-- Main Header -->
    <!-- Categories Sidebar -->
    <CategoriesSidebar />


    <div class="main-header">
      <div class="container">
          <div class="row justify-content-around " style="width:100%;align-items: center;">
            <div class="col-3 col-md-1">
              <!-- Logo Section -->
              <div class="logo-section logo-desktop">
                <NuxtLink :to="getLocalizedPath('/')" class="brand">
                    <div class="logo-container">
                      <img src="/images/go-tawfeer-1-1.webp" alt="logo" class="logo-img">
                    </div>
                  </NuxtLink>
              </div>
                <!-- Mobile Menu Button -->
                <button class="mobile-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2Z"/>
                  </svg>
                </button>
            </div>
            <div class="col-7 col-md-7">
              <!-- Search Section -->
              <div class="search-section">
                <div class="search-container">
                  <div class="search-box search-box-desktop p-0 border 0">
                    <div class="so-search border-0">
                                <svg  width="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M11 6C13.7614 6 16 8.23858 16 11M16.6588 16.6549L21 21M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
                                <input v-model="q" type="text" :placeholder="t('search.placeholder')" @keyup.enter="goSearch()" autofocus />
                    </div>
                  </div>

                </div>
              </div>
              <div class="logo-section logo-mobile">
                <NuxtLink :to="getLocalizedPath('/')" class="brand">
                    <div class="logo-container">
                      <img src="/images/go-tawfeer-1-1.webp" alt="logo" class="logo-img">
                    </div>
                  </NuxtLink>
              </div>
            </div>
            <div class="col-2 col-md-4 d-none d-xl-block ">
              <!-- Actions Section -->
              <div class="actions-section">
                <div class="row mobile-none" >
                  <div class="col-6">
                    <div class="info-left" style="float: left;width: 90%;border-radius:25px;background: #F58040;">
                      <div class="d-flex align-items-center gap-2 justify-content-center ">
                        <div class="info-icon">
                          <svg class="bg-dark p-2 m-1" style="border-radius:50%" width="40" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M16 7.184C16 3.14 12.86 0 9 0S2 3.14 2 7c-1.163.597-2 1.696-2 3v2a3 3 0 0 0 3 3h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1 5 5 0 0 1 10 0 1 1 0 0 0-1 1v6a1 1 0 0 0 1 1v1h-2.592c-.206-.581-.756-1-1.408-1H8a1.5 1.5 0 0 0 0 3h6a2 2 0 0 0 2-2v-1.183A2.992 2.992 0 0 0 18 12v-2a2.99 2.99 0 0 0-2-2.816L-7 62" fill="#ffffff" fill-rule="evenodd"></path> </g></svg>
                        </div>
                        <div class="info-content text-center ">
                          <p style="font-size: 12px;"  class="mb-0 fw-bold text-white">{{ t('support_24_7') || 'دعم 24/7' }}
                            <br>
                            <span style="color: #232323">
                              537030838
                            </span>
                            
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="info-left" style="float: left;width: 90%;border-radius:25px;background: #F58040;">
                      <div class="d-flex align-items-center gap-2 justify-content-center ">
                        <div class="info-icon">
                          <svg class="bg-dark p-2 m-1" style="border-radius:50%" fill="#ffffff" width="40" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve" stroke="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <path d="M476.158,231.363l-13.259-53.035c3.625-0.77,6.345-3.986,6.345-7.839v-8.551c0-18.566-15.105-33.67-33.67-33.67h-60.392 V110.63c0-9.136-7.432-16.568-16.568-16.568H50.772c-9.136,0-16.568,7.432-16.568,16.568V256c0,4.427,3.589,8.017,8.017,8.017 c4.427,0,8.017-3.589,8.017-8.017V110.63c0-0.294,0.239-0.534,0.534-0.534h307.841c0.295,0,0.534,0.241,0.534,0.534v145.372 c0,4.427,3.589,8.017,8.017,8.017c4.427,0,8.017-3.589,8.017-8.017v-9.088h94.569c0.008,0,0.014,0.002,0.021,0.002 c0.008,0,0.015-0.001,0.022-0.001c11.637,0.008,21.518,7.646,24.912,18.171h-24.928c-4.427,0-8.017,3.589-8.017,8.017v17.102 c0,13.851,11.268,25.119,25.119,25.119h9.086v35.273h-20.962c-6.886-19.884-25.787-34.205-47.982-34.205 s-41.097,14.321-47.982,34.205h-3.86v-60.393c0-4.427-3.589-8.017-8.017-8.017c-4.427,0-8.017,3.589-8.017,8.017v60.391H192.817 c-6.886-19.884-25.787-34.205-47.982-34.205s-41.097,14.321-47.982,34.205H50.772c-0.295,0-0.534-0.241-0.534-0.534v-17.637 h34.739c4.427,0,8.017-3.589,8.017-8.017s-3.589-8.017-8.017-8.017h-42.75c-0.002,0-0.003,0-0.005,0s-0.003,0-0.005,0H8.017 c-4.427,0-8.017,3.589-8.017,8.017s3.589,8.017,8.017,8.017h26.188v17.637c0,9.136,7.432,16.568,16.568,16.568h43.304 c-0.002,0.178-0.014,0.356-0.014,0.534c0,27.995,22.777,50.772,50.772,50.772s50.772-22.777,50.772-50.772 c0-0.178-0.012-0.356-0.014-0.534h180.67c-0.002,0.178-0.014,0.356-0.014,0.534c0,27.995,22.777,50.772,50.772,50.772 c27.995,0,50.772-22.777,50.772-50.772c0-0.178-0.012-0.356-0.014-0.534h26.203c4.427,0,8.017-3.589,8.017-8.017v-85.511 C512,251.989,496.423,234.448,476.158,231.363z M375.182,144.301h60.392c9.725,0,17.637,7.912,17.637,17.637v0.534h-78.029 V144.301z M375.182,230.881v-52.376h71.235l13.094,52.376H375.182z M144.835,401.904c-19.155,0-34.739-15.583-34.739-34.739 s15.584-34.739,34.739-34.739c19.155,0,34.739,15.583,34.739,34.739S163.99,401.904,144.835,401.904z M427.023,401.904 c-19.155,0-34.739-15.583-34.739-34.739s15.584-34.739,34.739-34.739c19.155,0,34.739,15.583,34.739,34.739 S446.178,401.904,427.023,401.904z M495.967,299.29h-9.086c-5.01,0-9.086-4.076-9.086-9.086v-9.086h18.171V299.29z"></path> </g> </g> <g> <g> <path d="M144.835,350.597c-9.136,0-16.568,7.432-16.568,16.568c0,9.136,7.432,16.568,16.568,16.568 c9.136,0,16.568-7.432,16.568-16.568C161.403,358.029,153.971,350.597,144.835,350.597z"></path> </g> </g> <g> <g> <path d="M427.023,350.597c-9.136,0-16.568,7.432-16.568,16.568c0,9.136,7.432,16.568,16.568,16.568 c9.136,0,16.568-7.432,16.568-16.568C443.591,358.029,436.159,350.597,427.023,350.597z"></path> </g> </g> <g> <g> <path d="M332.96,316.393H213.244c-4.427,0-8.017,3.589-8.017,8.017s3.589,8.017,8.017,8.017H332.96 c4.427,0,8.017-3.589,8.017-8.017S337.388,316.393,332.96,316.393z"></path> </g> </g> <g> <g> <path d="M127.733,282.188H25.119c-4.427,0-8.017,3.589-8.017,8.017s3.589,8.017,8.017,8.017h102.614 c4.427,0,8.017-3.589,8.017-8.017S132.16,282.188,127.733,282.188z"></path> </g> </g> <g> <g> <path d="M204.693,136.818c-42.141,0-76.426,34.285-76.426,76.426s34.285,76.426,76.426,76.426s76.426-34.285,76.426-76.426 S246.834,136.818,204.693,136.818z M204.693,273.637c-33.3,0-60.392-27.092-60.392-60.392s27.092-60.392,60.392-60.392 s60.392,27.092,60.392,60.392S237.993,273.637,204.693,273.637z"></path> </g> </g> <g> <g> <path d="M236.015,233.229l-23.305-23.305V179.04c0-4.427-3.589-8.017-8.017-8.017s-8.017,3.589-8.017,8.017v34.205 c0,2.126,0.844,4.164,2.348,5.668l25.653,25.653c1.565,1.565,3.617,2.348,5.668,2.348s4.104-0.782,5.668-2.348 C239.146,241.435,239.146,236.36,236.015,233.229z"></path> </g> </g> </g></svg>
                        </div>
                        <div class="info-content text-center ">
                          <p style="font-size: 12px;"  class="mb-0 fw-bold text-white">{{ t('free_shipping') || 'شحن مجاني' }}
                            <br>
                            <span style="color:#232323">
                              {{ t('purchases_over_299') || 'للمشتريات فوق 299' }}
                            </span>
                            <img src="../images/Vector (4).png" alt="">
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>   

                
              </div>
            </div>
            <div class="col-2 col-md-4 d-flex align-items-center justify-content-center d-xl-none   ">
                <div class="sign-up-mobile">
                  <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.2332 14.6204C7.30234 14.6204 3.98508 15.2591 3.98508 17.7235C3.98508 20.1888 7.32409 20.8049 11.2332 20.8049C15.1632 20.8049 18.4813 20.1661 18.4813 17.7017C18.4813 15.2365 15.1423 14.6204 11.2332 14.6204ZM11.2332 2.68457C8.57033 2.68457 6.43677 4.81735 6.43677 7.47835C6.43677 10.1393 8.57033 12.273 11.2332 12.273C13.8952 12.273 16.0296 10.1393 16.0296 7.47835C16.0296 4.81735 13.8952 2.68457 11.2332 2.68457Z" fill="white"/>
                  </svg>
                </div>
            </div>
          </div>
      </div>
      <div class="search-box-container">
        <div class="search-box search-box-mobile w-75 m-auto ">
            <svg width="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M11 6C13.7614 6 16 8.23858 16 11M16.6588 16.6549L21 21M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
            <input type="text" :placeholder="t('search.placeholder')" readonly class="search-input" />
        </div>
      </div>
    </div>

    <!-- Navigation Bar -->
    <nav class="nav-bar">
      <div class="container">
        <div class="nav-left">
          <div class="categories-dropdown" @mouseenter="showCats = true" @mouseleave="showCats = false">
            <button class="categories-btn">
              <svg class="categories-icon" width="30" height="30" viewBox="0 0 24 24">
                <path fill="currentColor" d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2Z"/>
              </svg>
              <span>{{ t('all_categories') || 'جميع الأقسام' }}</span>
            </button>


          </div>
        </div>

        <div class="nav-center">
          <div class="nav-links">
            <!-- الرئيسية -->
            <div class="nav-item">
              <NuxtLink :to="getLocalizedPath('/')" :class="['nav-link', { active: isNavLinkActive('/', true) }]" @click="handleNavClick(t('home'))">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0.254739 4.02497C0.426161 3.65018 0.704179 3.33684 1.05254 3.12582L5.50232 0.315958C5.8287 0.109422 6.20503 0 6.58897 0C6.97292 0 7.34924 0.109422 7.67563 0.315958L12.1254 3.12582C12.4627 3.34525 12.7303 3.66007 12.8957 4.032C13.0666 4.40417 13.1241 4.82022 13.0608 5.22619L11.9053 12.2508C11.8312 12.7407 11.5871 13.187 11.2176 13.5083C10.8509 13.8219 10.389 13.9957 9.91083 14H3.29462C2.80695 14.0023 2.33425 13.8281 1.96037 13.5083C1.58886 13.1886 1.34431 12.7415 1.27262 12.2508L0.117188 5.22619C0.0471487 4.82066 0.0949697 4.40305 0.254739 4.02497ZM4.28499 10.8389H8.88608C9.06848 10.8389 9.24341 10.7649 9.37239 10.6331C9.50137 10.5014 9.57383 10.3227 9.57383 10.1364C9.57383 9.95011 9.50137 9.77144 9.37239 9.6397C9.24341 9.50796 9.06848 9.43395 8.88608 9.43395H4.28499C4.10258 9.43395 3.92765 9.50796 3.79867 9.6397C3.66969 9.77144 3.59723 9.95011 3.59723 10.1364C3.59723 10.3227 3.66969 10.5014 3.79867 10.6331C3.92765 10.7649 4.10258 10.8389 4.28499 10.8389Z" fill="#F58040"/>
                </svg>

                <span>{{ t('home') }}</span>
              </NuxtLink>
            </div>

            <!-- كل المنتجات -->
            <div class="nav-item">
              <NuxtLink :to="getLocalizedPath('/shop')" :class="['nav-link', { active: isNavLinkActive('/shop') }]" @click="handleNavClick(t('all_products'))">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M12.8009 1.00945H7.64177C7.4918 1.00945 7.37024 1.13101 7.37024 1.28098V6.44012C7.37024 6.59009 7.4918 6.71166 7.64177 6.71166H12.8009C12.9509 6.71166 13.0724 6.59009 13.0724 6.44012V1.28098C13.0724 1.13101 12.9509 1.00945 12.8009 1.00945ZM3.22402 0.579525L0.151975 3.65159C0.0459404 3.75762 0.0459404 3.92954 0.151975 4.03559L3.22404 7.10764C3.33007 7.21367 3.50199 7.21367 3.60804 7.10764L6.68009 4.03557C6.78612 3.92954 6.78612 3.75762 6.68009 3.65157L3.60802 0.579525C3.50199 0.473492 3.33007 0.473492 3.22402 0.579525ZM12.8009 7.79779H7.64177C7.4918 7.79779 7.37024 7.91935 7.37024 8.06933V13.2285C7.37024 13.3784 7.4918 13.5 7.64177 13.5H12.8009C12.9509 13.5 13.0724 13.3784 13.0724 13.2285V8.06933C13.0724 7.91935 12.9509 7.79779 12.8009 7.79779ZM6.01257 7.79779H0.853431C0.70346 7.79779 0.581898 7.91935 0.581898 8.06933V13.2285C0.581898 13.3784 0.70346 13.5 0.853431 13.5H6.01257C6.16254 13.5 6.28411 13.3784 6.28411 13.2285V8.06933C6.28411 7.91935 6.16254 7.79779 6.01257 7.79779Z" fill="black"/>
                </svg>

                <span>{{ t('all_products') }}</span>
              </NuxtLink>
            </div>

            <!-- التصنيفات -->
            <div class="nav-item">
              <NuxtLink :to="getLocalizedPath('/categories')" :class="['nav-link', { active: isNavLinkActive('/categories') }]" @click="handleNavClick(t('categories'))">
                <svg width="17" height="15" viewBox="0 0 17 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.11214 1.95833C2.11214 1.15333 2.76548 0.5 3.57048 0.5H5.65381C6.45881 0.5 7.11214 1.15333 7.11214 1.95833V4.04167C7.11214 4.42844 6.9585 4.79937 6.68501 5.07286C6.41152 5.34635 6.04058 5.5 5.65381 5.5H3.57048C3.1837 5.5 2.81277 5.34635 2.53928 5.07286C2.26579 4.79937 2.11214 4.42844 2.11214 4.04167V1.95833ZM11.0705 0.5C10.6837 0.5 10.3128 0.653645 10.0393 0.927136C9.76579 1.20063 9.61214 1.57156 9.61214 1.95833V4.04167C9.61214 4.84667 10.2655 5.5 11.0705 5.5H13.1538C13.5406 5.5 13.9115 5.34635 14.185 5.07286C14.4585 4.79937 14.6121 4.42844 14.6121 4.04167V1.95833C14.6121 1.57156 14.4585 1.20063 14.185 0.927136C13.9115 0.653645 13.5406 0.5 13.1538 0.5H11.0705ZM10.8621 1.95833C10.8621 1.90308 10.8841 1.85009 10.9232 1.81102C10.9622 1.77195 11.0152 1.75 11.0705 1.75H13.1538C13.2091 1.75 13.2621 1.77195 13.3011 1.81102C13.3402 1.85009 13.3621 1.90308 13.3621 1.95833V4.04167C13.3621 4.09692 13.3402 4.14991 13.3011 4.18898C13.2621 4.22805 13.2091 4.25 13.1538 4.25H11.0705C11.0152 4.25 10.9622 4.22805 10.9232 4.18898C10.8841 4.14991 10.8621 4.09692 10.8621 4.04167V1.95833ZM0.0288086 10.9167C0.0288086 9.9221 0.423897 8.96828 1.12716 8.26502C1.83042 7.56176 2.78425 7.16667 3.77881 7.16667H12.9455C13.94 7.16667 14.8939 7.56176 15.5971 8.26502C16.3004 8.96828 16.6955 9.9221 16.6955 10.9167C16.6955 11.9112 16.3004 12.8651 15.5971 13.5683C14.8939 14.2716 13.94 14.6667 12.9455 14.6667H3.77881C2.78425 14.6667 1.83042 14.2716 1.12716 13.5683C0.423897 12.8651 0.0288086 11.9112 0.0288086 10.9167ZM5.44548 10.9167C5.44548 10.7525 5.41314 10.59 5.35032 10.4383C5.28751 10.2867 5.19543 10.1489 5.07936 10.0328C4.96329 9.91671 4.82549 9.82464 4.67383 9.76182C4.52217 9.699 4.35963 9.66667 4.19548 9.66667C4.03132 9.66667 3.86878 9.699 3.71712 9.76182C3.56546 9.82464 3.42766 9.91671 3.31159 10.0328C3.19552 10.1489 3.10344 10.2867 3.04063 10.4383C2.97781 10.59 2.94548 10.7525 2.94548 10.9167C2.94548 11.2482 3.07717 11.5661 3.31159 11.8006C3.54601 12.035 3.86395 12.1667 4.19548 12.1667C4.527 12.1667 4.84494 12.035 5.07936 11.8006C5.31378 11.5661 5.44548 11.2482 5.44548 10.9167ZM9.61214 10.9167C9.61214 10.5851 9.48045 10.2672 9.24603 10.0328C9.01161 9.79836 8.69366 9.66667 8.36214 9.66667C8.03062 9.66667 7.71268 9.79836 7.47826 10.0328C7.24384 10.2672 7.11214 10.5851 7.11214 10.9167C7.11214 11.2482 7.24384 11.5661 7.47826 11.8006C7.71268 12.035 8.03062 12.1667 8.36214 12.1667C8.69366 12.1667 9.01161 12.035 9.24603 11.8006C9.48045 11.5661 9.61214 11.2482 9.61214 10.9167ZM12.5288 12.1667C12.8603 12.1667 13.1783 12.035 13.4127 11.8006C13.6471 11.5661 13.7788 11.2482 13.7788 10.9167C13.7788 10.5851 13.6471 10.2672 13.4127 10.0328C13.1783 9.79836 12.8603 9.66667 12.5288 9.66667C12.1973 9.66667 11.8793 9.79836 11.6449 10.0328C11.4105 10.2672 11.2788 10.5851 11.2788 10.9167C11.2788 11.2482 11.4105 11.5661 11.6449 11.8006C11.8793 12.035 12.1973 12.1667 12.5288 12.1667Z" fill="black"/>
                </svg>

                <span>{{ t('categories') }}</span>
              </NuxtLink>
            </div>

            <!-- وصل حديثا -->
            <div class="nav-item">
              <NuxtLink :to="getLocalizedPath('/shop?sort=newest')" :class="['nav-link', { active: route.query.sort === 'newest' }]" @click="handleNavClick(t('newest'))">
                <i class="fa-solid fa-briefcase"></i>
                <span>{{ t('newest') }}</span>
              </NuxtLink>
            </div>

            <!-- الاعلى مبيعا -->
            <div class="nav-item">
              <NuxtLink :to="getLocalizedPath('/shop?sort=best_selling')" :class="['nav-link', { active: route.query.sort === 'best_selling' }]" @click="handleNavClick(t('best_selling'))">
                <svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M0.972961 2.16667C0.972961 1.59203 1.20123 1.04093 1.60756 0.634602C2.01389 0.228273 2.56499 0 3.13963 0H11.8063C12.3809 0 12.932 0.228273 13.3384 0.634602C13.7447 1.04093 13.973 1.59203 13.973 2.16667V10.8333C13.973 11.408 13.7447 11.9591 13.3384 12.3654C12.932 12.7717 12.3809 13 11.8063 13H3.13963C2.56499 13 2.01389 12.7717 1.60756 12.3654C1.20123 11.9591 0.972961 11.408 0.972961 10.8333V2.16667ZM8.19518 3.61111C8.19518 3.41957 8.11909 3.23587 7.98365 3.10042C7.84821 2.96498 7.66451 2.88889 7.47296 2.88889C7.28142 2.88889 7.09772 2.96498 6.96227 3.10042C6.82683 3.23587 6.75074 3.41957 6.75074 3.61111V9.38889C6.75074 9.58043 6.82683 9.76413 6.96227 9.89958C7.09772 10.035 7.28142 10.1111 7.47296 10.1111C7.66451 10.1111 7.84821 10.035 7.98365 9.89958C8.11909 9.76413 8.19518 9.58043 8.19518 9.38889V3.61111ZM5.30629 5.77778C5.30629 5.58623 5.2302 5.40253 5.09476 5.26709C4.95932 5.13165 4.77562 5.05556 4.58407 5.05556C4.39253 5.05556 4.20883 5.13165 4.07338 5.26709C3.93794 5.40253 3.86185 5.58623 3.86185 5.77778V9.38889C3.86185 9.58043 3.93794 9.76413 4.07338 9.89958C4.20883 10.035 4.39253 10.1111 4.58407 10.1111C4.77562 10.1111 4.95932 10.035 5.09476 9.89958C5.2302 9.76413 5.30629 9.58043 5.30629 9.38889V5.77778ZM11.0841 7.94444C11.0841 7.7529 11.008 7.5692 10.8725 7.43376C10.7371 7.29831 10.5534 7.22222 10.3618 7.22222C10.1703 7.22222 9.9866 7.29831 9.85116 7.43376C9.71572 7.5692 9.63963 7.7529 9.63963 7.94444V9.38889C9.63963 9.58043 9.71572 9.76413 9.85116 9.89958C9.9866 10.035 10.1703 10.1111 10.3618 10.1111C10.5534 10.1111 10.7371 10.035 10.8725 9.89958C11.008 9.76413 11.0841 9.58043 11.0841 9.38889V7.94444Z" fill="black"/>
                </svg> 
                <span>{{ t('best_selling') }}</span>
              </NuxtLink>
            </div>

            <!-- عروض -->
            <div class="nav-item">
              <NuxtLink :to="getLocalizedPath('/shop?has_discount=true')" :class="['nav-link', { active: route.query.has_discount === 'true' }]" @click="handleNavClick(t('offers'))">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M5.90772 1.28016C5.80549 1.37267 5.69806 1.45926 5.58596 1.53951C5.39226 1.66951 5.1745 1.75921 4.9457 1.80471C4.84625 1.82421 4.74224 1.83266 4.53489 1.84891C4.01422 1.89051 3.75357 1.91131 3.53646 1.98801C3.28822 2.07566 3.06275 2.21777 2.8766 2.40392C2.69045 2.59006 2.54833 2.81553 2.46069 3.06376C2.38398 3.28086 2.36318 3.54151 2.32158 4.06216C2.31449 4.19981 2.29974 4.33696 2.27738 4.47296C2.23188 4.70176 2.14218 4.91951 2.01217 5.11321C1.95562 5.19771 1.88802 5.27701 1.75282 5.43496C1.41416 5.83276 1.24451 6.03166 1.14505 6.23966C0.915598 6.72066 0.915598 7.27966 1.14505 7.76066C1.24451 7.96866 1.41416 8.16756 1.75282 8.56536C1.88802 8.72331 1.95562 8.80261 2.01217 8.88711C2.14218 9.08081 2.23188 9.29856 2.27738 9.52736C2.29688 9.62681 2.30533 9.73081 2.32158 9.93816C2.36318 10.4588 2.38398 10.7195 2.46069 10.9366C2.54833 11.1848 2.69045 11.4103 2.8766 11.5964C3.06275 11.7826 3.28822 11.9247 3.53646 12.0123C3.75357 12.089 4.01422 12.1098 4.53489 12.1514C4.74224 12.1677 4.84625 12.1761 4.9457 12.1956C5.1745 12.2411 5.39226 12.3315 5.58596 12.4608C5.67047 12.5174 5.74977 12.585 5.90772 12.7202C6.30553 13.0588 6.50444 13.2285 6.71244 13.3279C7.19345 13.5574 7.75247 13.5574 8.23348 13.3279C8.44149 13.2285 8.64039 13.0588 9.0382 12.7202C9.19615 12.585 9.27546 12.5174 9.35996 12.4608C9.55366 12.3308 9.77142 12.2411 10.0002 12.1956C10.0997 12.1761 10.2037 12.1677 10.411 12.1514C10.9317 12.1098 11.1924 12.089 11.4095 12.0123C11.6577 11.9247 11.8832 11.7826 12.0693 11.5964C12.2555 11.4103 12.3976 11.1848 12.4852 10.9366C12.5619 10.7195 12.5827 10.4588 12.6243 9.93816C12.6406 9.73081 12.649 9.62681 12.6685 9.52736C12.714 9.29856 12.8044 9.08081 12.9337 8.88711C12.9903 8.80261 13.0579 8.72331 13.1931 8.56536C13.5318 8.16756 13.7014 7.96866 13.8009 7.76066C14.0303 7.27966 14.0303 6.72066 13.8009 6.23966C13.7014 6.03166 13.5318 5.83276 13.1931 5.43496C13.1006 5.33274 13.014 5.22531 12.9337 5.11321C12.8039 4.91944 12.7137 4.70182 12.6685 4.47296C12.6462 4.33696 12.6314 4.19981 12.6243 4.06216C12.5827 3.54151 12.5619 3.28086 12.4852 3.06376C12.3976 2.81553 12.2555 2.59006 12.0693 2.40392C11.8832 2.21777 11.6577 2.07566 11.4095 1.98801C11.1924 1.91131 10.9317 1.89051 10.411 1.84891C10.2734 1.84182 10.1362 1.82707 10.0002 1.80471C9.77136 1.75953 9.55374 1.66939 9.35996 1.53951C9.24799 1.45909 9.14057 1.3725 9.0382 1.28016C8.64039 0.941514 8.44149 0.771864 8.23348 0.672414C7.99602 0.558912 7.73616 0.5 7.47296 0.5C7.20976 0.5 6.94991 0.558912 6.71244 0.672414C6.50444 0.771864 6.30553 0.941514 5.90772 1.28016ZM9.96317 4.51066C10.0622 4.60986 10.1178 4.74427 10.1178 4.88441C10.1178 5.02455 10.0622 5.15897 9.96317 5.25816L5.73092 9.49096C5.68269 9.54374 5.62428 9.5862 5.55919 9.61578C5.4941 9.64535 5.4237 9.66143 5.35222 9.66304C5.28075 9.66465 5.20969 9.65176 5.14334 9.62515C5.07698 9.59854 5.01671 9.55876 4.96616 9.50821C4.9156 9.45765 4.87582 9.39738 4.84921 9.33103C4.82259 9.26468 4.80971 9.19362 4.81132 9.12215C4.81293 9.05068 4.82901 8.98027 4.85858 8.91519C4.88816 8.8501 4.93062 8.79169 4.9834 8.74346L9.215 4.51131C9.3142 4.41232 9.44862 4.35672 9.58876 4.35672C9.72891 4.35672 9.86333 4.41232 9.96252 4.51131L9.96317 4.51066ZM9.94172 8.76361C9.94172 8.95066 9.86742 9.13004 9.73516 9.2623C9.60289 9.39456 9.4235 9.46886 9.23646 9.46886C9.04941 9.46886 8.87002 9.39456 8.73776 9.2623C8.60549 9.13004 8.53119 8.95066 8.53119 8.76361C8.53119 8.57657 8.60549 8.39719 8.73776 8.26493C8.87002 8.13267 9.04941 8.05836 9.23646 8.05836C9.4235 8.05836 9.60289 8.13267 9.73516 8.26493C9.86742 8.39719 9.94172 8.57657 9.94172 8.76361ZM5.71012 5.94261C5.80273 5.94261 5.89444 5.92437 5.98001 5.88893C6.06558 5.85349 6.14333 5.80154 6.20882 5.73605C6.27431 5.67056 6.32626 5.59282 6.3617 5.50725C6.39714 5.42169 6.41539 5.32998 6.41539 5.23736C6.41539 5.14475 6.39714 5.05304 6.3617 4.96748C6.32626 4.88191 6.27431 4.80416 6.20882 4.73868C6.14333 4.67319 6.06558 4.62124 5.98001 4.5858C5.89444 4.55036 5.80273 4.53211 5.71012 4.53211C5.52307 4.53211 5.34368 4.60642 5.21142 4.73868C5.07915 4.87094 5.00485 5.05032 5.00485 5.23736C5.00485 5.42441 5.07915 5.60379 5.21142 5.73605C5.34368 5.86831 5.52307 5.94261 5.71012 5.94261Z" fill="black"/>
                </svg>

                <span>{{ t('offers') }}</span>
              </NuxtLink>
            </div>

            <!-- براندات -->
            <div class="nav-item">
              <NuxtLink :to="getLocalizedPath('/brands')" :class="['nav-link', { active: isNavLinkActive('/brands') }]" @click="handleNavClick(t('brands'))">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M6.49721 0.000929685C5.86672 -0.00788851 5.24077 0.108826 4.65572 0.344291C4.07067 0.579756 3.53819 0.929278 3.08922 1.37255C2.64025 1.81582 2.28374 2.344 2.04041 2.92639C1.79708 3.50879 1.67177 4.1338 1.67177 4.76511C1.67177 5.39641 1.79708 6.02142 2.04041 6.60382C2.28374 7.18621 2.64025 7.71439 3.08922 8.15766C3.53819 8.60093 4.07067 8.95045 4.65572 9.18592C5.24077 9.42138 5.86672 9.5381 6.49721 9.52928C7.75937 9.52928 8.96984 9.02729 9.86232 8.13375C10.7548 7.24021 11.2562 6.0283 11.2562 4.76464C11.2562 3.50098 10.7548 2.28907 9.86232 1.39553C8.96984 0.501987 7.75937 0.000929685 6.49721 0.000929685ZM6.68572 2.25356L7.31994 3.53095C7.33404 3.56317 7.35642 3.59108 7.3848 3.61182C7.41319 3.63256 7.44656 3.6454 7.48151 3.64902L8.88924 3.86285C8.92955 3.868 8.96755 3.88457 8.99879 3.9106C9.03002 3.93663 9.05319 3.97104 9.06557 4.0098C9.07796 4.04855 9.07904 4.09003 9.06869 4.12938C9.05835 4.16873 9.037 4.2043 9.00717 4.23193L7.96901 5.22112C7.95356 5.25066 7.94548 5.28352 7.94548 5.31687C7.94548 5.35023 7.95356 5.38308 7.96901 5.41263L8.16773 6.8146C8.17609 6.85497 8.17262 6.89689 8.15772 6.93533C8.14283 6.97377 8.11716 7.00708 8.0838 7.03125C8.05044 7.05541 8.01081 7.06941 7.96968 7.07155C7.92856 7.07369 7.8877 7.06388 7.85201 7.0433L6.59843 6.3795C6.56591 6.36474 6.53061 6.3571 6.49489 6.3571C6.45918 6.3571 6.42388 6.36474 6.39136 6.3795L5.13777 7.0433C5.10209 7.06388 5.06123 7.07369 5.0201 7.07155C4.97898 7.06941 4.93935 7.05541 4.90599 7.03125C4.87263 7.00708 4.84695 6.97377 4.83206 6.93533C4.81717 6.89689 4.8137 6.85497 4.82206 6.8146L5.05699 5.41263C5.06705 5.38012 5.06892 5.34562 5.06244 5.3122C5.05596 5.27879 5.04133 5.2475 5.01984 5.22112L3.98076 4.22449C3.95285 4.19659 3.93321 4.1615 3.924 4.12311C3.91479 4.08471 3.91638 4.04452 3.92859 4.00697C3.9408 3.96942 3.96316 3.936 3.99318 3.91039C4.02321 3.88479 4.05973 3.86801 4.09869 3.86192L5.50735 3.65645C5.5423 3.65283 5.57567 3.64 5.60406 3.61926C5.63244 3.59852 5.65482 3.57061 5.66892 3.53838L6.30314 2.261C6.32002 2.22474 6.34673 2.19395 6.38021 2.17213C6.4137 2.15031 6.45263 2.13833 6.49258 2.13756C6.53252 2.13678 6.57189 2.14724 6.60619 2.16775C6.6405 2.18825 6.66837 2.21798 6.68665 2.25356H6.68572ZM11.4215 8.05294C10.6212 9.25364 9.41128 10.1212 8.01823 10.4934L9.32938 12.7674C9.37525 12.847 9.44368 12.9112 9.526 12.9519C9.60833 12.9926 9.70086 13.008 9.7919 12.9961C9.88293 12.9841 9.96839 12.9454 10.0375 12.8849C10.1065 12.8243 10.1561 12.7446 10.18 12.6558L10.6535 10.8903L12.416 11.3636C12.5047 11.3872 12.5984 11.3841 12.6853 11.3545C12.7721 11.3249 12.8483 11.2702 12.9042 11.1973C12.96 11.1243 12.993 11.0365 12.999 10.9448C13.005 10.8531 12.9837 10.7617 12.9378 10.6821L11.4215 8.05294ZM4.98084 10.4943C3.58764 10.1236 2.3771 9.25732 1.57574 8.05759L0.0621552 10.6821C0.0162812 10.7617 -0.00500294 10.8531 0.00099157 10.9448C0.00698608 11.0365 0.0399903 11.1243 0.0958348 11.1973C0.151679 11.2702 0.227858 11.3249 0.314748 11.3545C0.401638 11.3841 0.49534 11.3872 0.584017 11.3636L2.34739 10.8903L2.82004 12.6558C2.84387 12.7446 2.89346 12.8243 2.96253 12.8849C3.03161 12.9454 3.11707 12.9841 3.20811 12.9961C3.29914 13.008 3.39168 12.9926 3.474 12.9519C3.55633 12.9112 3.62475 12.847 3.67062 12.7674L4.98084 10.4943Z" fill="black"/>
                </svg>

                <span>{{ t('brands') }}</span>
              </NuxtLink>
            </div>
          </div>
        </div>
        <div class="nav-right d-flex gap-2 align-items-center">
          
            <!-- Language Selector -->
            <div class="lang" @click="showLang = !showLang">
              <button class="lang-btn">
                <span>{{ currentLangCode }}</span>
                  <svg width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clip-path="url(#clip0_125_706)">
                  <path d="M11.2285 15.1875H15.7285C16.2845 15.1875 16.757 15.0621 17.1494 14.8435L11.2285 11.3116V15.1875ZM18.4454 12.9966C18.5095 12.7105 18.5421 12.4076 18.5421 12.0935V10.6872H14.5737L18.4443 12.9966M0.639456 4.99472C0.572801 5.29395 0.539784 5.59969 0.541019 5.90625V7.3125H4.52464L0.639456 4.99472ZM7.85352 2.8125H3.35352C2.80142 2.8125 2.33202 2.93625 1.94136 3.15169L7.85352 6.67856V2.8125ZM1.95936 14.8573C2.34636 15.0666 2.80958 15.1875 3.35352 15.1875H7.85352V11.3411L1.95936 14.8573ZM0.541019 10.6875V12.0938C0.541019 12.4175 0.575331 12.7294 0.643112 13.0227L4.55783 10.6875H0.541019ZM17.1671 3.16547C16.7717 2.94103 16.2927 2.8125 15.7285 2.8125H11.2285V6.70809L17.1671 3.16547ZM18.541 7.3125V5.90625C18.541 5.59856 18.5092 5.30184 18.4476 5.02116L14.6069 7.3125H18.541Z" fill="#2E3192"/>
                  <path d="M14.6069 7.3125L18.4476 5.02116C18.2716 4.21566 17.843 3.54881 17.1671 3.16547L11.2285 6.70809V2.8125H10.666V7.875H18.541V7.3125H14.6069ZM0.541016 10.125V10.6875H4.55783L0.643109 13.0227C0.829016 13.8257 1.27058 14.4849 1.95936 14.8573L7.85352 11.3411V15.1875H8.41602V10.125H0.541016ZM18.541 10.125H10.666V15.1875H11.2285V11.3116L17.1494 14.8438C17.8303 14.4647 18.2643 13.8015 18.4443 12.9971L14.5737 10.6875H18.541V10.125ZM7.85352 2.8125V6.67856L1.94136 3.15169C1.25792 3.52856 0.821141 4.19063 0.639172 4.99472L4.52464 7.3125H0.541016V7.875H8.41602V2.8125H7.85352Z" fill="#E6E7E8"/>
                  <path d="M10.666 7.875V2.8125H8.41602V7.875H0.541016V10.125H8.41602V15.1875H10.666V10.125H18.541V7.875H10.666Z" fill="#BE1E2D"/>
                  <path d="M6.71107 7.31288L1.07201 3.9466C0.950791 4.1266 0.853478 4.3246 0.773041 4.53554L5.42688 7.31288H6.71023M18.2851 13.5257L13.5564 10.6879H12.2469L17.9599 14.1245C18.0924 13.9393 18.2016 13.7386 18.2851 13.5268M17.6182 3.48535L11.2198 7.31288L12.5189 7.31373L18.0401 4.0082C17.9169 3.78404 17.787 3.63948 17.6182 3.48535ZM1.05092 14.0277C1.17743 14.2204 1.32968 14.3949 1.50345 14.5464L7.87123 10.6879H6.58788L1.05092 14.0277Z" fill="#BE1E2D"/>
                  </g>
                  <defs>
                  <clipPath id="clip0_125_706">
                  <rect width="18" height="18" fill="white" transform="translate(0.541016)"/>
                  </clipPath>
                  </defs>
                  </svg>
                <svg width="12" height="12" viewBox="0 0 24 24" class="chevron">
                  <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                </svg>
              </button>

              <div v-show="showLang" class="lang-menu">
                <div class="lang-title">{{ t('select_language') || 'اختر اللغة' }}</div>
                <div class="lang-grid">
                    <div class="lang-card" :class="{ checked: isAr }" @click="switchTo('ar')">
                    <div class="row">
                      <div class="col-6">
                        <div class="meta">
                            <span class="flag">🇸🇦</span>
                            <span class="label">العربية</span>
                        </div>
                      </div>
                      <div class="col-6">
                        <div class="radio" :class="{ checked: isAr }"></div>

                      </div>
                    </div>
                    </div>
                    <div class="lang-card" :class="{ checked: !isAr }" @click="switchTo('en')">
                      <div class="row">
                        <div class="col-6">
                          <div class="meta">
                              <span class="flag">🇺🇸</span>
                              <span class="label">English</span>
                          </div>
                        </div>
                        <div class="col-6">
                          <div class="radio" :class="{ checked: !isAr }"></div>
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            </div>
            <div class="profile">
              <template v-if="auth?.user?.value">
                  <NuxtLink class="profile-btn" :to="getLocalizedPath('/account')">
                    <svg viewBox="0 0 20 20" width="25" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill="#F58040" d="M9.99296258,10.5729355 C12.478244,10.5729355 14.4929626,8.55821687 14.4929626,6.0729355 C14.4929626,3.58765413 12.478244,1.5729355 9.99296258,1.5729355 C7.5076812,1.5729355 5.49296258,3.58765413 5.49296258,6.0729355 C5.49296258,8.55821687 7.5076812,10.5729355 9.99296258,10.5729355 Z M10,0 C13.3137085,0 16,2.6862915 16,6 C16,8.20431134 14.8113051,10.1309881 13.0399615,11.173984 C16.7275333,12.2833441 19.4976819,15.3924771 19.9947005,19.2523727 C20.0418583,19.6186047 19.7690435,19.9519836 19.3853517,19.9969955 C19.0016598,20.0420074 18.6523872,19.7816071 18.6052294,19.4153751 C18.0656064,15.2246108 14.4363723,12.0699838 10.034634,12.0699838 C5.6099956,12.0699838 1.93381693,15.231487 1.39476476,19.4154211 C1.34758036,19.7816499 0.998288773,20.0420271 0.614600177,19.9969899 C0.230911582,19.9519526 -0.0418789616,19.6185555 0.00530544566,19.2523267 C0.500630192,15.4077896 3.28612316,12.3043229 6.97954305,11.1838052 C5.19718955,10.1447285 4,8.21217353 4,6 C4,2.6862915 6.6862915,0 10,0 Z"></path> </g></svg>
                </NuxtLink>
              </template>
              <template v-else>
                  <button class="login-btn" @click="openLoginModal">
                  <svg width="12" height="15" viewBox="0 0 12 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.09837 9.7493C2.94516 9.7493 0.284165 10.2617 0.284165 12.2385C0.284165 14.2161 2.96261 14.7103 6.09837 14.7103C9.25086 14.7103 11.9126 14.1979 11.9126 12.2211C11.9126 10.2435 9.23414 9.7493 6.09837 9.7493ZM6.09837 0.174805C3.9623 0.174805 2.25083 1.88565 2.25083 4.02021C2.25083 6.15478 3.9623 7.86635 6.09837 7.86635C8.23372 7.86635 9.94592 6.15478 9.94592 4.02021C9.94592 1.88565 8.23372 0.174805 6.09837 0.174805Z" fill="#F58040"/>
                  </svg>
                  </button>
              </template>
            </div>
            
            <!-- Wishlist -->
            <template v-if="auth?.user?.value">
              <NuxtLink :to="getLocalizedPath('/account?tab=wishlist')" class="action-btn wishlist-btn position-relative">
                <svg width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.5358 1.03906C13.5173 1.03906 15.1242 2.65976 15.1242 4.6593C15.1242 6.27342 14.4962 10.1043 8.31481 13.9769C8.20409 14.0455 8.07697 14.0818 7.94736 14.0818C7.81775 14.0818 7.69063 14.0455 7.5799 13.9769C1.39848 10.1043 0.770509 6.27342 0.770509 4.6593C0.770509 2.65976 2.37741 1.03906 4.35893 1.03906C6.34046 1.03906 7.94736 3.23315 7.94736 3.23315C7.94736 3.23315 9.55425 1.03906 11.5358 1.03906Z" stroke="#F58040" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span v-if="wishlistCount >= 0" class="wishlist-badge badge bg-danger position-absolute top-0 start-100 translate-middle rounded-pill">{{ wishlistCount }}</span>
              </NuxtLink>
            </template>
            <template v-else>
              <button @click="openLoginModal" class="action-btn wishlist-btn position-relative">
                <svg width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.5358 1.03906C13.5173 1.03906 15.1242 2.65976 15.1242 4.6593C15.1242 6.27342 14.4962 10.1043 8.31481 13.9769C8.20409 14.0455 8.07697 14.0818 7.94736 14.0818C7.81775 14.0818 7.69063 14.0455 7.5799 13.9769C1.39848 10.1043 0.770509 6.27342 0.770509 4.6593C0.770509 2.65976 2.37741 1.03906 4.35893 1.03906C6.34046 1.03906 7.94736 3.23315 7.94736 3.23315C7.94736 3.23315 9.55425 1.03906 11.5358 1.03906Z" stroke="#F58040" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span v-if="wishlistCount >= 0" class="wishlist-badge badge bg-danger position-absolute top-0 start-100 translate-middle rounded-pill">{{ wishlistCount }}</span>
              </button>
            </template>
            
            <!-- Comparison -->
            <NuxtLink :to="getLocalizedPath('/compare')" class="action-btn compare-btn position-relative">
                            <svg width="17" height="19" viewBox="0 0 17 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clip-path="url(#clip0_77_773)">
                <path d="M0.770461 13.5738C0.770461 13.8868 0.867348 14.1577 1.06112 14.3865C1.2549 14.6152 1.49712 14.7236 1.78778 14.7115H2.78895C3.47793 14.7115 4.13461 14.5611 4.75899 14.2601C5.38338 13.9591 5.91626 13.5558 6.35764 13.0501C6.79901 12.5444 7.15965 11.9425 7.43955 11.2442C7.71944 10.5459 7.85401 9.8175 7.84325 9.05901C7.84325 8.13197 8.13391 7.33737 8.71523 6.6752C9.29656 6.01303 10.0124 5.68194 10.8629 5.68194H12.8814V6.80161C12.8814 7.05444 12.946 7.27115 13.0752 7.45174C13.2044 7.63234 13.3497 7.76477 13.5112 7.84905C13.6726 7.93332 13.861 7.9574 14.0763 7.92128C14.2916 7.88516 14.4693 7.78283 14.6092 7.61428L16.6277 5.35688C16.8322 5.11609 16.9291 4.8452 16.9184 4.54421C16.9076 4.24322 16.8107 3.97836 16.6277 3.74961L14.6092 1.49221C14.4477 1.32365 14.2647 1.22132 14.0602 1.1852C13.8556 1.14908 13.6673 1.17316 13.495 1.25744C13.3228 1.34171 13.1774 1.47415 13.059 1.65474C12.9406 1.83533 12.8814 2.04602 12.8814 2.28681V3.42454H10.8629C10.1847 3.42454 9.53339 3.57503 8.90901 3.87602C8.28462 4.17701 7.74636 4.57431 7.29422 5.06793C6.84207 5.56155 6.48144 6.16352 6.21231 6.87385C5.94317 7.58418 5.81399 8.31257 5.82476 9.05901C5.82476 9.99809 5.52871 10.7987 4.93662 11.4609C4.34453 12.1231 3.62864 12.4541 2.78895 12.4541H1.78778C1.50788 12.4541 1.26566 12.5625 1.06112 12.7792C0.856583 12.9959 0.759695 13.2608 0.770461 13.5738ZM0.770461 4.56227C0.770461 4.8753 0.867348 5.14016 1.06112 5.35688C1.2549 5.57359 1.49712 5.68194 1.78778 5.68194H2.78895C3.26262 5.68194 3.69861 5.79632 4.09693 6.02507C4.49524 6.25382 4.84512 6.56684 5.14654 6.96415C5.37261 6.19362 5.70634 5.50135 6.14771 4.88734C5.16808 3.91214 4.04849 3.42454 2.78895 3.42454H1.78778C1.50788 3.42454 1.26566 3.53892 1.06112 3.76767C0.856583 3.99642 0.759695 4.26128 0.770461 4.56227ZM7.52029 13.2668C8.4784 14.23 9.5926 14.7115 10.8629 14.7115H12.8814V15.8493C12.8814 16.0901 12.946 16.3068 13.0752 16.4994C13.2044 16.692 13.3497 16.8245 13.5112 16.8967C13.6726 16.9689 13.861 16.987 14.0763 16.9509C14.2916 16.9148 14.4693 16.8124 14.6092 16.6439L16.6277 14.3865C16.8322 14.1577 16.9291 13.8868 16.9184 13.5738C16.9076 13.2608 16.8107 13.0019 16.6277 12.7973L14.6092 10.5399C14.4477 10.3593 14.2647 10.2509 14.0602 10.2148C13.8556 10.1787 13.6673 10.2028 13.495 10.287C13.3228 10.3713 13.1774 10.5098 13.059 10.7024C12.9406 10.895 12.8814 11.1057 12.8814 11.3345V12.4541H10.8629C10.4 12.4541 9.964 12.3458 9.55492 12.1291C9.14584 11.9124 8.80135 11.5993 8.52146 11.19C8.28462 11.9605 7.9509 12.6528 7.52029 13.2668Z" fill="#F58040"/>
                </g>
                <defs>
                <clipPath id="clip0_77_773">
                <rect width="16.1479" height="18.0592" fill="white" transform="translate(0.770538 0.0292969)"/>
                </clipPath>
                </defs>
              </svg>
              <span v-if="compareCount > 0" class="compare-badge badge bg-danger position-absolute top-0 start-100 translate-middle rounded-pill">{{ compareCount }}</span>
            </NuxtLink>
            
<div class="cart-dropdown-wrapper">
    <!-- Cart Button -->
    <div class="action-btn cart-btn position-relative" @click="toggleCart">
      <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.7667 14.463C12.1639 14.463 11.6701 14.9674 11.6701 15.5904C11.6701 16.206 12.1639 16.7103 12.7667 16.7103C13.3767 16.7103 13.8705 16.206 13.8705 15.5904C13.8705 14.9674 13.3767 14.463 12.7667 14.463ZM4.5968 14.463C3.99404 14.463 3.50022 14.9674 3.50022 15.5904C3.50022 16.206 3.99404 16.7103 4.5968 16.7103C5.20681 16.7103 5.70063 16.206 5.70063 15.5904C5.70063 14.9674 5.20681 14.463 4.5968 14.463ZM16.1448 2.17489L16.0708 2.18116L14.3388 2.44742C14.0918 2.49266 13.9103 2.69959 13.8885 2.95176L13.7505 4.61313C13.7287 4.85121 13.5399 5.02921 13.3075 5.02921H3.50007C3.05709 5.02921 2.7666 5.18497 2.47612 5.52614C2.18563 5.86731 2.1348 6.35682 2.20016 6.80109L2.89006 11.6665C3.02077 12.6018 3.80508 13.2908 4.72737 13.2908H12.6503C13.6162 13.2908 14.415 12.535 14.4949 11.556L15.163 3.47094L16.2596 3.2781C16.5501 3.22618 16.7534 2.93693 16.7026 2.64026C16.6517 2.33691 16.3685 2.13591 16.0708 2.18116L16.1448 2.17489ZM5.8893 7.77269H7.90091C8.20591 7.77269 8.44556 8.01745 8.44556 8.32895C8.44556 8.63304 8.20591 8.88521 7.90091 8.88521H5.8893C5.5843 8.88521 5.34465 8.63304 5.34465 8.32895C5.34465 8.01745 5.5843 7.77269 5.8893 7.77269Z" fill="white"/>
      </svg>
      <span class="cart-badge badge bg-danger position-absolute top-0 start-100 translate-middle rounded-pill">1</span>
    </div>

    <!-- Cart Dropdown -->
  <Transition name="slide-cart">
    <div v-if="isCartOpen" class="cart-dropdown">
      <!-- Header -->
      <div class="cart-header">
        <button class="close-btn" @click="closeCart">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 1L1 13M1 1L13 13" stroke="#333" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>{{ t('close') || 'إغلاق' }}</span>
        </button>
        <h3>{{ t('cart.title') || 'سلة التسوق' }}</h3>
      </div>

      <!-- Loading State -->
      <div v-if="cart.loading.value" class="cart-loading">
        <div class="loading-spinner"></div>
        <p>{{ t('cart.loading') || 'جاري تحميل السلة...' }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!cart.items.value || cart.items.value.length === 0" class="cart-empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.7 15.3C4.3 15.7 4.6 16.5 5.1 16.5H17M17 13V17C17 18.1 17.9 19 19 19C20.1 19 21 18.1 21 17V13M9 19.5C9 20.3 9.7 21 10.5 21C11.3 21 12 20.3 12 19.5C12 18.7 11.3 18 10.5 18C9.7 18 9 18.7 9 19.5ZM19.5 19.5C19.5 20.3 20.2 21 21 21C21.8 21 22.5 20.3 22.5 19.5C22.5 18.7 21.8 18 21 18C20.2 18 19.5 18.7 19.5 19.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>{{ t('cart.empty') || 'سلة التسوق فارغة' }}</p>
      </div>

      <!-- Cart Items -->
      <div v-else class="cart-items">
        <div 
          v-for="item in cart.items.value" 
          :key="item.id || item.key"
          class="cart-item"
        >
          <button 
            class="remove-item" 
            @click="removeItem(item)"
            :disabled="cart.loading.value"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 1L1 11M1 1L11 11" stroke="#999" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
          
          <div class="item-image">
            <img 
              :src="getItemImage(item)" 
              :alt="getItemName(item)"
              @error="handleImageError"
            >
          </div>
          
          <div class="item-details">
            <h4>{{ getItemName(item) }}</h4>
            <p v-if="item.sku" class="item-sku">{{ t('cart.sku') || 'SKU' }}: {{ item.sku }}</p>
            
            <div class="item-quantity">
              <button 
                class="qty-btn" 
                @click="decreaseQty(item)"
                :disabled="cart.loading.value"
              >-</button>
              <input 
                type="text" 
                :value="getItemQuantity(item)" 
                readonly
              >
              <button 
                class="qty-btn" 
                @click="increaseQty(item)"
                :disabled="cart.loading.value"
              >+</button>
            </div>
            
            <div class="item-price">{{ formatItemPrice(item) }}</div>
          </div>
        </div>
      </div>

      <!-- Cart Footer -->
      <div v-if="!cart.loading.value && cart.items.value && cart.items.value.length > 0" class="cart-footer">
        <div class="cart-subtotal">
          <span>{{ t('cart.subtotal') || 'المجموع:' }}</span>
          <span class="total-amount">{{ money(cartTotal) }}</span>
        </div>
        
        <div v-if="getRemainingForFreeShipping() > 0" class="shipping-info">
          {{ t('cart.add_for_free_shipping') || 'أضف' }} 
          <span class="shipping-amount">{{ money(getRemainingForFreeShipping()) }}</span> 
          {{ t('cart.to_cart_for_free_shipping') || 'إلى سلة المشتريات واحصل على شحن مجاني!' }}
        </div>
        
        <NuxtLink 
          :to="getLocalizedPath('/cart')" 
          class="view-cart-btn"
          @click="closeCart"
        >
          {{ t('cart.view_cart') || 'عرض السلة' }}
        </NuxtLink>
        
        <NuxtLink 
          :to="getLocalizedPath('/checkout')" 
          class="checkout-btn"
          @click="closeCart"
        >
          {{ t('cart.checkout') || 'إتمام الطلب' }}
        </NuxtLink>
      </div>
    </div>
  </Transition>


    <!-- Overlay -->
<Transition name="fade">
  <div v-if="isCartOpen" class="cart-overlay" @click="closeCart"></div>
</Transition>

  </div>


            <!-- price -->
            <div class="nav-price d-flex align-items-center gap-2">  
              <p class="mb-0 fs-5 fw-bold ">
                {{ money(cartTotal) }}
              </p>
              <svg width="16" height="16" viewBox="0 0 13 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.99849 10.6314C7.79625 11.0563 7.66256 11.5173 7.61134 12.0008L11.8912 11.1389C12.0934 10.7142 12.227 10.253 12.2783 9.76953L7.99849 10.6314Z" fill="#232323"/>
                <path d="M11.8908 8.55603C12.093 8.13128 12.2267 7.67015 12.2779 7.18666L8.94402 7.8584V6.56707L11.8906 5.97384C12.0929 5.5491 12.2266 5.08796 12.2778 4.60448L8.94392 5.27564V0.631626C8.43307 0.903359 7.97938 1.26507 7.61059 1.69172V5.54423L6.27726 5.81271V0C5.76641 0.271638 5.31273 0.63344 4.94393 1.0601V6.0811L1.9606 6.68169C1.75836 7.10643 1.62457 7.56757 1.57325 8.05105L4.94393 7.37244V8.99864L1.33159 9.72587C1.12935 10.1506 0.995663 10.6117 0.944447 11.0952L4.72556 10.334C5.03336 10.2733 5.2979 10.1009 5.4699 9.86369L6.16333 8.88975V8.88956C6.23532 8.78879 6.27726 8.6673 6.27726 8.53645V7.10395L7.61059 6.83546V9.41813L11.8906 8.55584L11.8908 8.55603Z" fill="#232323"/>
              </svg>
            </div>
        </div>
      </div>
    </nav>

    <!-- Mobile Menu Overlay -->
    <teleport to="body">
      <div v-if="mobileMenuOpen" class="mobile-menu-overlay" @click.self="mobileMenuOpen = false">
        <div class="mobile-menu" :dir="uiDir">
          <div class="mobile-menu-header">
            <h3>{{ t('menu') || 'القائمة' }}</h3>
            <button class="close-btn" @click="mobileMenuOpen = false">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
              </svg>
            </button>
          </div>
          
          <div class="mobile-menu-content">
            <!-- Categories -->
            <div class="mobile-menu-section">
              <h4>{{ t('all_categories') || 'جميع الأقسام' }}</h4>
              <div class="mobile-menu-links">
                <NuxtLink 
                  v-for="category in mainCategories" 
                  :key="category.id"
                  :to="`/category/${category.id}`" 
                  class="mobile-menu-link"
                  @click="mobileMenuOpen = false"
                >
                  {{ category.name }}
                </NuxtLink>
              </div>
            </div>
            
            <!-- Quick Links -->
            <div class="mobile-menu-section">
              <h4>{{ t('quick_links') || 'روابط سريعة' }}</h4>
              <div class="mobile-menu-links">
                <NuxtLink :to="getLocalizedPath('/shop')" class="mobile-menu-link" @click="mobileMenuOpen = false">
                  {{ t('shop') || 'المتجر' }}
                </NuxtLink>
                <NuxtLink :to="getLocalizedPath('/brands')" class="mobile-menu-link" @click="mobileMenuOpen = false">
                  {{ t('brands') || 'العلامات التجارية' }}
                </NuxtLink>
                <NuxtLink :to="getLocalizedPath('/shop?has_discount=true')" class="mobile-menu-link" @click="mobileMenuOpen = false">
                  {{ t('offers') || 'العروض' }}
                </NuxtLink>
                <NuxtLink :to="getLocalizedPath('/contact')" class="mobile-menu-link" @click="mobileMenuOpen = false">
                  {{ t('contact') || 'اتصل بنا' }}
                </NuxtLink>
              </div>
            </div>
            
            <!-- Account Links -->
            <div class="mobile-menu-section">
              <h4>{{ t('account') || 'الحساب' }}</h4>
              <div class="mobile-menu-links">
                <template v-if="auth?.user?.value">
                  <NuxtLink :to="getLocalizedPath('/account')" class="mobile-menu-link" @click="mobileMenuOpen = false">
                    {{ t('my_account') || 'حسابي' }}
                  </NuxtLink>
                  <NuxtLink :to="getLocalizedPath('/account/orders')" class="mobile-menu-link" @click="mobileMenuOpen = false">
                    {{ t('my_orders') || 'طلباتي' }}
                  </NuxtLink>
                  <NuxtLink :to="getLocalizedPath('/account/wishlist')" class="mobile-menu-link" @click="mobileMenuOpen = false">
                    {{ t('wishlist') || 'قائمة الأمنيات' }}
                  </NuxtLink>
                  <button class="mobile-menu-link logout-btn" @click="handleLogout">
                    {{ t('logout') || 'تسجيل الخروج' }}
                  </button>
                </template>
                <template v-else>
                  <button class="mobile-menu-link" @click="openLoginModal(); mobileMenuOpen = false">
                    {{ t('login') || 'تسجيل الدخول' }}
                  </button>
                  <button class="mobile-menu-link" @click="openRegisterModal(); mobileMenuOpen = false">
                    {{ t('register') || 'إنشاء حساب' }}
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Search Overlay -->
    <teleport to="body">
      <div v-if="searchOpen" class="search-overlay" @click.self="searchOpen = false">
        <div class="so-header">
          <div class="so-search">
            <svg  width="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M11 6C13.7614 6 16 8.23858 16 11M16.6588 16.6549L21 21M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
            <input v-model="q" type="text" :placeholder="t('search.placeholder')" @keyup.enter="goSearch()" autofocus />
          </div>
          <button class="text-btn" @click="searchOpen = false">{{ t('search.close') }}</button>
        </div>

        <div class="so-body">

          <div class="suggest" v-if="q && (suggestions.length || products.length)">
            <div class="s-col">
              <div class="s-title">{{ t('search.suggestions_title') }}</div>
              <div class="s-item" v-for="(s,i) in suggestions" :key="i" @click="goSearch(s)">
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.6-.58 3.07-1.54 4.2l.2.2h.84l5 5l-1.5 1.5l-5-5v-.84l-.2-.2A6.516 6.516 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3Z"/></svg>
                <span v-html="s"></span>
              </div>
            </div>
            <div class="s-col">
              <div class="s-title">{{ t('search.products') }} ({{ products.length }})</div>
              <NuxtLink class="p-item" v-for="(p,i) in products" :key="i" :to="{ path:'/product/'+(p?.slug || p?.id), query: { from: 'search' } }" @click="handleProductClick">
                <img :src="p?.thumbnail_full_url?.path|| p?.thumbnail || 'https://dummyimage.com/56x56/f0f0f0/aaa'" alt="p" />
                <div class="p-info">
                  <div class="p-name">{{ p?.name || p?.product_name || t('search.product') }}</div>
                  <div class="p-price" v-if="p?.price">
                    <b>{{ p.price }}</b>
                  </div>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Success Message -->
    <teleport to="body">
      <div v-if="loginSuccess || registerSuccess || logoutSuccess" class="global-success-message">
        <div class="success-content">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <span v-if="loginSuccess">{{ t('login.success') || 'تم تسجيل الدخول بنجاح' }}</span>
          <span v-else-if="registerSuccess">{{ t('register.success') || 'تم إنشاء الحساب بنجاح' }}</span>
          <span v-else-if="logoutSuccess">{{ t('logout.success') || 'تم تسجيل الخروج بنجاح' }}</span>
        </div>
      </div>
    </teleport>

    <!-- Login Modal -->
    <teleport to="body">
      <div v-if="loginModalOpen" class="login-overlay" @click.self="closeLoginModal">
        <div class="login-modal" :dir="uiDir">
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
            
            <div v-if="loginSuccess" class="success-message">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              {{ t('login.success') || 'تم تسجيل الدخول بنجاح' }}
            </div>
            
            <button type="submit" class="login-btn2" style="    width: 100%;background: #232323;color: #fff;padding: 10px;border-radius: 10px;" :disabled="loginLoading">
              <span v-if="loginLoading">{{ t('loading') || 'جاري التحميل...' }}</span>
              <span v-else>{{ t('login') || 'تسجيل الدخول' }}</span>
            </button>
          </form>
          
          <div class="login-footer">
            <p>{{ t('no_account') || 'ليس لديك حساب؟' }} 
              <a href="#" @click.prevent="openRegisterModal">
                {{ t('register') || 'إنشاء حساب' }}
              </a>
            </p>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Register Modal -->
    <teleport to="body">
      <div v-if="showRegisterModal" class="login-overlay" @click.self="closeRegisterModal">
        <div class="login-modal" :dir="uiDir">
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

            <div v-if="registerSuccess" class="success-message">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              {{ t('register.success') || 'تم إنشاء الحساب بنجاح' }}
            </div>

            <button type="submit" class="login-btn" :disabled="registerLoading">
              <span v-if="registerLoading">{{ t('creating_account') || 'جاري إنشاء الحساب...' }}</span>
              <span v-else>{{ t('register') || 'إنشاء حساب' }}</span>
            </button>
          </form>
          
          <div class="login-footer">
            <p>{{ t('have_account') || 'لديك حساب بالفعل؟' }} 
              <a href="#" @click.prevent="openLoginModal(); closeRegisterModal()">
                {{ t('login') || 'تسجيل الدخول' }}
              </a>
            </p>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Global Loading Overlay -->
    <teleport to="body">
      <div v-if="globalLoading" class="global-loading-overlay">
        <div class="global-loading-container">
          <div class="global-loading-spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
          </div>
          
          <div class="global-loading-progress">
            <div class="progress-bar" :style="{ width: loadingProgress + '%' }"></div>
          </div>
          
          <div class="global-loading-message">
            {{ loadingMessage }}
          </div>
          
          <div class="global-loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Bottom navigation (mobile) -->
    <nav class="bottom-nav">
      <NuxtLink  class="bn-item">
        <div class="bn-icon-wrapper">
          <svg width="22" height="22" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 385.87"><path fill-rule="nonzero" d="M214.19 67.27h149.05V8.17c0-4.51 3.66-8.17 8.17-8.17 2.21 0 4.21.87 5.68 2.29l132.02 112.09c3.44 2.91 3.87 8.06.96 11.49-.32.39-.67.73-1.05 1.04L376.68 239.27c-3.44 2.91-8.59 2.48-11.49-.96a8.098 8.098 0 0 1-1.93-5.27l-.02-59.1H214.19c-4.51 0-8.17-3.66-8.17-8.17V75.45c0-4.52 3.66-8.18 8.17-8.18zm75.44 161.02H140.59c-4.51 0-8.17-3.66-8.17-8.18v-49.63L20.76 265.27l111.66 94.8v-49.64c0-4.51 3.66-8.17 8.17-8.17h149.04v-73.97zm-140.87-16.35h149.05c4.51 0 8.17 3.66 8.17 8.17v90.32c0 4.52-3.66 8.18-8.17 8.18H148.76v59.1a8.268 8.268 0 0 1-1.95 5.27c-2.9 3.43-8.05 3.86-11.49.96L2.98 271.58c-.38-.31-.73-.66-1.05-1.04-2.91-3.44-2.48-8.59.96-11.49l132.02-112.09a8.141 8.141 0 0 1 5.68-2.29c4.51 0 8.17 3.66 8.17 8.17v59.1zM371.41 83.62H222.37v73.97h149.04c4.52 0 8.18 3.66 8.18 8.18v49.64l111.65-94.8-111.65-94.8v49.64c0 4.51-3.66 8.17-8.18 8.17z"/></svg>
          <span v-if="cartCount > 0" class="bn-cart-badge">{{ cartCount }}</span>
        </div>
        <span>{{ t('bag') }}</span>
      </NuxtLink>
      <!-- <NuxtLink :to="getLocalizedPath('/')" class="bn-item">
        <svg width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3L2 12h3v8z"/></svg>
        <span>{{ t('home') }}</span>
      </NuxtLink>
      <NuxtLink :to="getLocalizedPath('/categories')" class="bn-item">
        <svg width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2Z"/></svg>
        <span>{{ t('categories') }}</span>
      </NuxtLink> -->
      <template v-if="auth?.user?.value">
        <NuxtLink :to="getLocalizedPath('/account?tab=wishlist')" class="bn-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.5783 8.50903 2.9987 7.05 2.9987C5.59096 2.9987 4.19169 3.5783 3.16 4.61C2.1283 5.6417 1.5487 7.04097 1.5487 8.5C1.5487 9.95903 2.1283 11.3583 3.16 12.39L12 21.23L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6053C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39467C21.7563 5.72723 21.351 5.1208 20.84 4.61Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>{{ t('wishlist') }}</span>
        </NuxtLink>
      </template>
      <template v-else>
        <button @click="openLoginModal" class="bn-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.5783 8.50903 2.9987 7.05 2.9987C5.59096 2.9987 4.19169 3.5783 3.16 4.61C2.1283 5.6417 1.5487 7.04097 1.5487 8.5C1.5487 9.95903 2.1283 11.3583 3.16 12.39L12 21.23L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6053C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39467C21.7563 5.72723 21.351 5.1208 20.84 4.61Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>{{ t('wishlist') }}</span>
        </button>
      </template>
      <NuxtLink :to="getLocalizedPath('/cart')" class="bn-item">
        <div class="bn-icon-wrapper">
          <svg width="22" height="22" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 122.9 107.5" style="enable-background:new 0 0 122.9 107.5" xml:space="preserve"><g><path d="M3.9,7.9C1.8,7.9,0,6.1,0,3.9C0,1.8,1.8,0,3.9,0h10.2c0.1,0,0.3,0,0.4,0c3.6,0.1,6.8,0.8,9.5,2.5c3,1.9,5.2,4.8,6.4,9.1 c0,0.1,0,0.2,0.1,0.3l1,4H119c2.2,0,3.9,1.8,3.9,3.9c0,0.4-0.1,0.8-0.2,1.2l-10.2,41.1c-0.4,1.8-2,3-3.8,3v0H44.7 c1.4,5.2,2.8,8,4.7,9.3c2.3,1.5,6.3,1.6,13,1.5h0.1v0h45.2c2.2,0,3.9,1.8,3.9,3.9c0,2.2-1.8,3.9-3.9,3.9H62.5v0 c-8.3,0.1-13.4-0.1-17.5-2.8c-4.2-2.8-6.4-7.6-8.6-16.3l0,0L23,13.9c0-0.1,0-0.1-0.1-0.2c-0.6-2.2-1.6-3.7-3-4.5 c-1.4-0.9-3.3-1.3-5.5-1.3c-0.1,0-0.2,0-0.3,0H3.9L3.9,7.9z M96,88.3c5.3,0,9.6,4.3,9.6,9.6c0,5.3-4.3,9.6-9.6,9.6 c-5.3,0-9.6-4.3-9.6-9.6C86.4,92.6,90.7,88.3,96,88.3L96,88.3z M53.9,88.3c5.3,0,9.6,4.3,9.6,9.6c0,5.3-4.3,9.6-9.6,9.6 c-5.3,0-9.6-4.3-9.6-9.6C44.3,92.6,48.6,88.3,53.9,88.3L53.9,88.3z M33.7,23.7l8.9,33.5h63.1l8.3-33.5H33.7L33.7,23.7z"/></g></svg>
          <span v-if="cartCount > 0" class="bn-cart-badge">{{ cartCount }}</span>
        </div>
        <span>{{ t('bag') }}</span>
      </NuxtLink>

    </nav>
  </header>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&family=IBM+Plex+Sans+Arabic:wght@100;200;300;400;500;600;700&family=Tajawal:wght@200;300;400;500;700;800;900&display=swap');
body {
  font-family: "Tajawal", sans-serif !important;
}
.cart-btn {
  background: #2675BA !important;
}
.logo-img {
  width: 100px;
  height: 100%;
  object-fit: contain;
}
.categories-icon {
  background: #232323;
  padding: 5px;
  border-radius: 50%;
}
/* Main Header Container */
.app-header { 
  background: #1a1a1a;
  z-index: 1000;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid #f0f0f0;
  width: 100%;
  transition: all 0.3s ease;
}

.container { 
  max-width: 1400px; 
  margin: 0 auto; 
  padding: 0 20px; 
}

/* Top Bar */
.top-bar {
  background: linear-gradient(135deg, #E1EDFF 0%, #764ba2 100%);
  color: white;
  padding: 8px 0;
  font-size: 14px;
}

.top-bar .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tagline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.tagline-icon {
  color: #ffd700;
}

.delivery-info {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.delivery-info:hover {
  background: rgba(255, 255, 255, 0.1);
}

.location-icon {
  color: #ffd700;
}

.chevron {
  transition: transform 0.2s ease;
}

.delivery-info:hover .chevron {
  transform: rotate(180deg);
}

/* Main Header */
.main-header {
  padding: 5px 0;
  border-bottom: 1px solid #f0f0f0;
}

/* Logo Section */
.logo-section {
  display: flex;
  align-items: center;
}

.brand {
  color: inherit;
  text-decoration: none;
  transition: transform 0.2s ease;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.brand:hover {
  transform: scale(1.02);
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #E1EDFF 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-arabic {
  font-weight: 700;
  font-size: 18px;
  color: #333;
  line-height: 1.2;
}

.brand-english {
  font-weight: 600;
  font-size: 14px;
  color: #666;
  letter-spacing: 1px;
}

/* Search Section */
.search-section {
  display: flex;
  justify-content: center;
}

.search-container {
  width: 100%;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 2px solid #f0f0f0;
  border-radius: 50px;
  padding: 8px 20px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.search-box:hover {
  border-color: #E1EDFF;
  background: #fff;
  box-shadow: 0 4px 16px #F58040;
}

.search-icon {
  color: #999;
  transition: color 0.2s ease;
}

.search-box:hover .search-icon {
  color: #E1EDFF;
}

.search-input {
  border: 0;
  outline: 0;
  background: transparent;
  width: 100%;
  font-size: 16px;
  color: #333;
}

.search-input::placeholder {
  color: #999;
}

/* Language Selector */
.lang {
  position: relative;
}

.lang-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 10px 14px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  color: #333;
}

.lang-btn:hover {
  border-color: #E1EDFF;
  background: #f8f9ff;
  box-shadow: 0 2px 8px #F58040;
}

#__nuxt [dir="rtl"] .lang-menu  {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  width: 280px;
  padding: 16px;
  z-index: 60;
  animation: slideDown 0.2s ease-out;
}
#__nuxt [dir="ltr"] .lang-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  width: 280px;
  padding: 16px;
  z-index: 60;
  animation: slideDown 0.2s ease-out;
}
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.lang-title {
  text-align: center;
  font-weight: 700;
  color: #333;
  margin-bottom: 12px;
  font-size: 16px;
}

.lang-grid {
  display: grid;
  gap: 8px;
}

.lang-card {
  background: #fff;
  border: 2px solid #f0f0f0;
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lang-card:hover {
  border-color: #e0e0e0;
  background: #f8f9ff;
}

.lang-card.checked {
  border-color: #E1EDFF;
  background: #f8f9ff;
}

.lang-card .row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.lang-card .meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lang-card .label {
  font-weight: 600;
  color: #333;
}

.lang-card .flag {
  font-size: 20px;
}

.lang-card .radio {
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
  border-radius: 50%;
  position: relative;
  transition: all 0.2s ease;
}

.lang-card .radio.checked {
  border-color: #E1EDFF;
}

.lang-card .radio.checked::after {
  content: '';
  position: absolute;
  inset: 4px;
  background: #E1EDFF;
  border-radius: 50%;
}

/* Profile Section */
.profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-btn, .login-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  background: #fff;
  color: #333;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.profile-btn:hover, .login-btn:hover {
  border-color: #E1EDFF;
  background: #f8f9ff;
  color: #E1EDFF;
  box-shadow: 0 2px 8px #F58040;
}

.logout-btn {
  background: transparent;
  border: 1px solid #e0e0e0;
  color: #666;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.logout-btn:hover {
  background: #fee;
  border-color: #fcc;
  color: #c53030;
}

/* Action Buttons */
.action-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 12px 5px;
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  background: #fff;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.action-btn:hover {
  border-color: #E1EDFF;
  background: #f8f9ff;
  color: #E1EDFF;
  box-shadow: 0 2px 8px #F58040;
}

.notification-badge, .cart-badge, .wishlist-badge, .compare-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #ff4757;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  border: 2px solid #fff;
}

/* Navigation Bar */
.nav-bar {
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.nav-bar .container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-left {
  display: flex;
  align-items: center;
}

.categories-dropdown {
  position: relative;
}

.categories-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 0;
  border-radius: 30px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  color: #333;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.categories-btn:hover {
  border-color: #E1EDFF;
  background: #f8f9ff;
  color: #000000;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}
.categories-btn:hover svg path {
  fill: #fff;
}
.categories-btn .categories-icon:hover {
  color: #ffffff;
}

.nav-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.nav-links {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  }

.nav-link {
  color: #333;
  text-decoration: none;
  font-weight: 600;
  padding: 12px 10px;
  transition: all 0.3s ease;
  position: relative;
  white-space: nowrap;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: center;
  justify-content: center;
}

.nav-link:hover {
  color: #F58040;
  transform: translateY(-2px);
}


.nav-link:active {
  transform: translateY(-1px);
}

/* Navigation Icons */
.nav-icon {
  flex-shrink: 0;
  transition: all 0.3s ease;
}

/* Active Navigation Link */
.nav-link svg path {
  fill: #000;
}
.nav-link:hover svg path,
.nav-link.active svg path {
  fill: var(--primary-color);
}
.nav-link.active {
  color: #F58040;
  background: transparent;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: -3px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 3px;
  background: #F58040;
  border-radius: 2px;
}

.nav-link.active::after,
.nav-link:hover::after {
  width: 100%;
} 
.nav-link.active .nav-icon {
  color: #F58040;
}

/* Navigation Item with Dropdown */
.nav-item {
  position: relative;
  display: inline-block;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-arrow {
  transition: transform 0.2s ease;
  opacity: 0.7;
}

.nav-item:hover .nav-arrow {
  transform: rotate(180deg);
  opacity: 1;
}

/* Subcategories Dropdown */
.subcategories-dropdown {
  position: absolute;
  top: 80%;
  left: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 400px;
  animation: slideDown 0.2s ease-out;
  margin-top: 8px;
}

.subcategories-content {
  padding: 16px 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  max-height: 300px;
  overflow-y: auto;
}

.subcategory-link {
  display: block;
  padding: 12px 16px;
  color: #333;
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  border-bottom: 1px solid #f0f0f0;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subcategory-link:hover {
  background: #F58040;
  color: #E1EDFF;
  border-left-color: #E1EDFF;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.subcategory-link:nth-child(3n+1) {
  border-top-left-radius: 12px;
}

.subcategory-link:nth-child(3n) {
  border-top-right-radius: 12px;
}

.subcategory-link:nth-last-child(-n+3) {
  border-bottom: none;
}

.subcategory-link:nth-last-child(1) {
  border-bottom-left-radius: 12px;
}

.subcategory-link:nth-last-child(2) {
  border-bottom-right-radius: 12px;
}

/* RTL Support for Subcategories */
[dir="rtl"] .subcategories-dropdown {
  left: auto;
  right: 0;
}

[dir="rtl"] .subcategory-link {
  border-left: none;
  border-right: 3px solid transparent;
  text-align: center;
}

[dir="rtl"] .subcategory-link:hover {
  border-left-color: transparent;
  border-right-color: #E1EDFF;
}

[dir="rtl"] .subcategory-link:nth-child(3n+1) {
  border-top-left-radius: 0;
  border-top-right-radius: 12px;
}

[dir="rtl"] .subcategory-link:nth-child(3n) {
  border-top-right-radius: 0;
  border-top-left-radius: 12px;
}

[dir="rtl"] .subcategory-link:nth-last-child(1) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 12px;
}

[dir="rtl"] .subcategory-link:nth-last-child(2) {
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 12px;
}

/* Mega Menu */
.mega-menu {
  position: absolute;
  top: calc(100% + 0px);
  right: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  width: min(1000px, 90vw);
  z-index: 60;
  animation: slideDown 0.3s ease-out;
}
[dir="ltr"] .mega-menu  {
  right: auto;
  left: 0;
}
.mega-content {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 0;
  padding: 0;
  min-height: 500px;
  max-height: 600px;
}

/* Main Categories Column */
.mega-main-categories {
  background: #f8f9ff;
  border-radius: 16px 0 0 16px;
  padding: 20px 0;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
  max-height: 600px;
}

.mega-category-item {
  position: relative;
  transition: all 0.2s ease;
}

.mega-category-item:hover {
  background: rgba(245, 128, 64, 0.1);
}

.mega-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 700;
  color: #333;
  padding: 16px 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-right: 3px solid transparent;
  font-size: 16px;
}

.mega-title:hover {
  color: #ffffff;
  background: #F58040;
  border-right-color: #F58040;
  transform: translateX(4px);
}

.mega-arrow {
  transition: transform 0.2s ease;
  opacity: 0.7;
}

.mega-category-item:hover .mega-arrow {
  transform: rotate(90deg);
  opacity: 1;
}

/* Subcategories Area */
.mega-subcategories-area {
  padding: 20px;
  display: flex;
  align-items: flex-start;
  position: relative;
}

.mega-subcategories {
  width: 100%;
}

.mega-subcategories-content {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
  position: relative;
  z-index: 1;
  padding: 20px;
}

.mega-subcategory-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  color: #333;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  position: relative;
  min-height: 80px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.mega-subcategory-item:hover {
  background: #F58040;
  color: #ffffff;
  border-color: #F58040;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 128, 64, 0.3);
  z-index: 2;
}

.mega-subcategory-item:nth-child(3n+1) {
  border-top-left-radius: 12px;
}

.mega-subcategory-item:nth-child(3n) {
  border-top-right-radius: 12px;
}

.mega-subcategory-item:nth-last-child(-n+3) {
  border-bottom: none;
}

.mega-subcategory-item:nth-last-child(1) {
  border-bottom-left-radius: 12px;
}

.mega-subcategory-item:nth-last-child(2) {
  border-bottom-right-radius: 12px;
}

/* Mega Menu Scrollbar */
.mega-main-categories::-webkit-scrollbar,
.mega-subcategories-content::-webkit-scrollbar {
  width: 6px;
}

.mega-main-categories::-webkit-scrollbar-track,
.mega-subcategories-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.mega-main-categories::-webkit-scrollbar-thumb,
.mega-subcategories-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.mega-main-categories::-webkit-scrollbar-thumb:hover,
.mega-subcategories-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Placeholder when no subcategory is hovered */
.mega-placeholder {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 350px;
}

.mega-placeholder img {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.brands {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  
}

.brands img {
  width: 60px;
  height: 30px;
  object-fit: contain;
  border-radius: 6px;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.brands img:hover {
  opacity: 1;
}

/* Right Actions (Legacy) */
.right { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
.action { display: inline-flex; align-items: center; gap: 8px; color: #555; }
.icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; border: 1px solid #eee; }
.text-btn { background: transparent; border: 0; color: #6b46c1; cursor: pointer; }
.profile { display: inline-flex; align-items: center; gap: 10px; }

/* Language dropdown */
.lang { position: relative; }
.lang-btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #eee; border-radius: 10px; padding: 8px 10px; background: #fff; cursor: pointer; }
.lang-menu { position: absolute; top: calc(100% + 0); inset-inline-end: 0; background: #fff; border: 1px solid #eee; border-radius: 12px; box-shadow: 0 10px 28px rgba(0,0,0,.12); width: 360px; padding: 12px; z-index: 50; }
.lang-title { text-align: center; font-weight: 700; color: #777; margin-bottom: 10px; }
.lang-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.lang-card { background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 12px; cursor: pointer; text-align: start; }
.lang-card:hover { border-color: #d9d9d9; background: #fafafa; }
.lang-card .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.lang-card .label { font-weight: 600; }
.lang-card .meta { display: inline-flex; align-items: center; gap: 8px; color: #555; }
.lang-card .badge { background: #eef7ee; color: #2b8a3e; border: 1px solid #d1ecd1; border-radius: 6px; padding: 2px 6px; font-size: 12px; }
.lang-card .flag { font-size: 18px; }
.lang-card .radio { width: 18px; height: 18px; border: 2px solid #bbb; border-radius: 50%; display: inline-block; position: relative; }
.lang-card .radio.checked { border-color: #6b46c1; }
.lang-card .radio.checked::after { content: ''; position: absolute; inset: 3px; background: #6b46c1; border-radius: 50%; }

.search-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 1001; display: grid; place-items: start center; padding-top: 6vh; }
.search-overlay .so-header { width: min(980px, 92vw); background: #fff; border-radius: 16px; padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 6px 18px rgba(0,0,0,.12); }
.so-search { flex: 1; display: flex; align-items: center; gap: 8px; border: 1px solid #eee; border-radius: 12px; padding: 10px 12px; }
.so-search input { border: 0; outline: 0; width: 100%; }

.so-body { width: min(980px, 92vw); background: #fff; border-radius: 16px; margin-top: 10px; padding: 16px; box-shadow: 0 6px 18px rgba(0,0,0,.12); max-height: 60vh; overflow-y: auto; }
.chips { display: flex; flex-wrap: wrap; gap: 10px; }
.chip { padding: 8px 12px; border: 1px solid #e5e5e5; border-radius: 999px; cursor: pointer; background: #fff; }
.chip:hover { background: #faf7ff; border-color: #e0d7ff; }
.brands-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin: 16px 0; }
.brands-grid img { width: 100%; height: 76px; object-fit: contain; border: 1px solid #eee; border-radius: 12px; background: #fff; }

.suggest { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; margin-top: 10px; }
.s-col:last-child { max-height: 400px; overflow-y: auto; }
.s-title { font-weight: 700; margin-bottom: 8px; }
.s-item { display: flex; align-items: center; gap: 8px; padding: 8px 6px; border-radius: 8px; cursor: pointer; }
.s-item:hover { background: #fafafa; }
.p-item { display: grid; grid-template-columns: 56px 1fr; gap: 10px; align-items: center; padding: 8px; border-radius: 10px; color: inherit; text-decoration: none; }
.p-item:hover { background: #fafafa; }
.p-item img { width: 56px; height: 56px; object-fit: cover; border-radius: 10px; border: 1px solid #eee; }
.p-name { font-size: 14px; line-height: 1.3; }
.p-price { color: #e91e63; }

.bottom-nav { position: fixed; bottom: 0; inset-inline: 0; background: #fff; border-top: 1px solid #eee; display: none; justify-content: space-around; padding: 6px 0; z-index: 45; }
.bn-item { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; color: #444; text-decoration: none; font-size: 12px; background: none; border: none; cursor: pointer; }
.bn-icon-wrapper { position: relative; display: flex; align-items: center; justify-content: center; }
.bn-cart-badge { position: absolute; top: -8px; right: -8px; background: #ff4757; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; border: 2px solid #fff; min-width: 18px; }

/* Login Modal Styles */
.login-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1002;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.login-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #eee;
}

.login-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #333;
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
  margin-bottom: 6px;
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #6b46c1;
  box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1);
}

.form-group input:disabled {
  background: #f5f5f5;
  color: #999;
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

.success-message {
  background: #f0fff4;
  color: #22543d;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
  border: 1px solid #9ae6b4;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

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

.login-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 12px 5px;
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  background: #fff;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.login-btn:hover:not(:disabled) {
  background: #f8f9ff;
}

.login-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.login-footer {
  padding: 16px 24px 24px;
  text-align: center;
  border-top: 1px solid #eee;
}

.login-footer p {
  margin: 0;
  color: #666;
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

/* Responsive Design */
@media (max-width: 1024px) {
  .main-header .container {
    grid-template-columns: 1fr 1.5fr 1fr;
    gap: 16px;
  }
  
  .nav-links {
    gap: 20px;
  }
  
  .mega-content {
    grid-template-columns: repeat(3, minmax(140px, 1fr)) 200px;
    gap: 20px;
    padding: 20px;
  }
}

@media (max-width: 1200px) {
  .logo-img {
    width: 80px;
  }
  .mobile-none {
    display: none;
  }
  .container {
    padding: 0 16px;
  }
  
  .top-bar {
    font-size: 12px;
    padding: 6px 0;
  }
  
  .main-header .container {
    grid-template-columns: auto 1fr auto auto;
    gap: 12px;
    padding: 12px 0;
    align-items: center;
  }
  
  .logo-section {
    justify-content: flex-start;
  }
  
  .search-section {
    order: 0;
  }
  
  .actions-section {
    order: 0;
    justify-content: flex-end;
    flex-wrap: nowrap;
    gap: 8px;
  }
  
  .nav-bar {
    display: none;
  }
  
  .nav-links {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
    min-height: 35px;
  }
  
  .nav-link {
    padding: 6px 10px;
    font-size: 13px;
    min-width: fit-content;
  }
  
  .subcategories-dropdown {
    min-width: 320px;
    margin-top: 6px;
  }
  
  .subcategories-content {
    grid-template-columns: repeat(2, 1fr);
    max-height: 250px;
  }
  
  .subcategory-link {
    padding: 10px 12px;
    font-size: 13px;
  }
  
  .mega-content {
    grid-template-columns: 180px 1fr;
  }
  
  .mega-subcategories-content {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .bottom-nav {
    display: flex;
  }
  
  .mega-menu {
    display: none !important;
  }
  
  .lang-menu {
    width: 260px;
    right: -20px;
  }
  
  .profile-btn, .login-btn {
    padding: 8px 12px;
    font-size: 14px;
  }
  
  .action-btn {
    width: 40px;
    height: 40px;
  }
  
  .notification-badge, .cart-badge, .wishlist-badge, .compare-badge {
    width: 18px;
    height: 18px;
    font-size: 10px;
  }
  
  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: inherit;
    border: none;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .mobile-menu-btn:hover {
    background: inherit;
    transform: translateY(-1px);
  }
    .mobile-menu-btn svg path {
      fill: #000
    }
  .login-modal {
    margin: 10px;
    max-width: none;
  }
  
  .login-header,
  .login-form,
  .login-footer {
    padding-left: 20px;
    padding-right: 20px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 0 12px;
  }
  
  .top-bar {
    display: none;
  }
  
  .main-header {
    padding: 12px 0;
  }
  
  .logo-container {
    gap: 8px;
  }
  
  .logo-circle {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }
  
  .brand-arabic {
    font-size: 16px;
  }
  
  .brand-english {
    font-size: 12px;
  }
  
  .search-box {
    padding: 12px 16px;
  }
  
  .search-input {
    font-size: 14px;
  }
  
  .actions-section {
    gap: 8px;
  }
  
  .profile-btn, .login-btn {
    padding: 6px 10px;
    font-size: 12px;
  }
  
  .action-btn {
    width: 36px;
    height: 36px;
  }
  
  .lang-btn {
    padding: 8px 10px;
    font-size: 12px;
  }
  
  .lang-menu {
    width: 240px;
    right: -10px;
  }
  
  .nav-bar {
    padding: 10px 0;
  }
  
  .nav-links {
    gap: 12px;
  }
  
  .nav-link {
    padding: 6px 10px;
    font-size: 13px;
  }
  
  .subcategories-dropdown {
    min-width: 280px;
    margin-top: 4px;
  }
  
  .subcategories-content {
    grid-template-columns: 1fr;
    max-height: 200px;
  }
  
  .subcategory-link {
    padding: 8px 12px;
    font-size: 12px;
  }
  
  .mega-content {
    grid-template-columns: 1fr;
    min-height: 300px;
  }
  
  .mega-main-categories {
    border-radius: 16px 16px 0 0;
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .mega-subcategories-content {
    grid-template-columns: 1fr;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .app-header {
    background: #1a1a1a;
  }
  
  .top-bar {
    background: linear-gradient(135deg, #4c63d2 0%, #5a4fcf 100%);
  }
  
  .nav-bar {
    background: #F5F5F5;
  }
  
  .brand-arabic, .brand-english {
    color: #fff;
  }
  
  
  .search-input {
    color: #fff;
  }
  
  .search-input::placeholder {
    color: #999;
  }
  
  .profile-btn, .login-btn, .action-btn {
    background: #E1EDFF;
    color: #F58040;
  }
  
    .lang-btn {
      background-color: inherit;
      border: 0;
    }
  .nav-link {
    color: #000000;
  }
  
  .subcategories-dropdown {
    background: #2a2a2a;
    border-color: #444;
  }
  
  .subcategory-link {
    color: #fff;
    border-bottom-color: #444;
  }
  
  .subcategory-link:hover {
    background: rgba(102, 126, 234, 0.2);
    color: #E1EDFF;
  }
  
  .mega-main-categories {
    background: #F58040;
    border-right-color: #444;
  }
  
  .mega-title {
    color: #fff;
  }
  
  .mega-title:hover {
    background: rgba(102, 126, 234, 0.2);
    color: #E1EDFF;
  }
  
  .mega-subcategory-item {
    color: #000000;
    border-bottom-color: #444;
  }

  .categories-btn {
    background: #F58040;
    border-color: #444;
    color: #fff;
  }
}

/* Mobile Menu Styles */
.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 0;
}

.mobile-menu {
  background: linear-gradient(135deg, #000000 0%, #000000 100%);
  width: 100%;
  height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
  overflow: hidden;
  animation: slideInFull 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
}

.mobile-menu::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%);
  z-index: 1;
}

.mobile-menu::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.05)"/><circle cx="10" cy="60" r="0.5" fill="rgba(255,255,255,0.05)"/><circle cx="90" cy="40" r="0.5" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  opacity: 0.3;
  z-index: 2;
}

@keyframes slideInFull {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.mobile-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  position: relative;
  z-index: 10;
}

.mobile-menu-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  z-index: -1;
}

.mobile-menu-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.mobile-menu-header .close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  cursor: pointer;
  padding: 12px;
  border-radius: 12px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.mobile-menu-header .close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.mobile-menu-content {
  padding: 24px 20px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  position: relative;
  z-index: 5;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.mobile-menu-content::-webkit-scrollbar {
  width: 6px;
}

.mobile-menu-content::-webkit-scrollbar-track {
  background: transparent;
}

.mobile-menu-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.mobile-menu-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.mobile-menu-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  z-index: -1;
}

.mobile-menu-section {
  margin-bottom: 32px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.mobile-menu-section h4 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 700;
  color: white;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  position: relative;
}

.mobile-menu-section h4::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 40px;
  height: 2px;
  background: linear-gradient(90deg, #fff, transparent);
}

.mobile-menu-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-menu-link {
  display: block;
  padding: 16px 20px;
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  font-size: 16px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  width: 100%;
  text-align: right;
  cursor: pointer;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.mobile-menu-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.mobile-menu-link:hover::before {
  left: 100%;
}

.mobile-menu-link:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  transform: translateX(-8px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
} 

.mobile-menu-link.logout-btn {
  color: #F58040;
  border: 1px solid rgba(255, 107, 107, 0.3);
  background: rgba(255, 107, 107, 0.1);
}

.mobile-menu-link.logout-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  color: #ff5252;
  border-color: rgba(255, 107, 107, 0.5);
  box-shadow: 0 8px 25px rgba(255, 107, 107, 0.3);
}

/* Global Loading Overlay */
.global-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease-out;
}

.global-loading-container {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  min-width: 300px;
  position: relative;
  overflow: hidden;
}

.global-loading-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(245, 128, 64, 0.1) 0%, rgba(102, 126, 234, 0.1) 100%);
  z-index: -1;
}

.global-loading-spinner {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
}

.spinner-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 4px solid transparent;
  border-radius: 50%;
  animation: spin 1.5s linear infinite;
}

.spinner-ring:nth-child(1) {
  border-top-color: #F58040;
  animation-delay: 0s;
}

.spinner-ring:nth-child(2) {
  border-right-color: #667eea;
  animation-delay: 0.5s;
}

.spinner-ring:nth-child(3) {
  border-bottom-color: #764ba2;
  animation-delay: 1s;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.global-loading-progress {
  width: 100%;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 20px;
  position: relative;
}

.global-loading-progress .progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #F58040, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.3s ease;
  position: relative;
}

.global-loading-progress .progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.global-loading-message {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.global-loading-dots {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.global-loading-dots span {
  width: 8px;
  height: 8px;
  background: #F58040;
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite both;
}

.global-loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.global-loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.global-loading-dots span:nth-child(3) {
  animation-delay: 0s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Hide mobile menu button on desktop */
@media (min-width: 1200px) {
  
  .mobile-menu-btn {
    display: none;
  }
}
/* =========== */
.info-left {
  width: 100% !important;
}
.cart-dropdown-wrapper {
  position: relative;
}

.action-btn {
  cursor: pointer;
  background: #333;
  padding: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cart-badge {
  font-size: 11px;
  padding: 2px 6px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Cart Dropdown */
.cart-dropdown {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 340px;
  background: white;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* Slide Transition */
.slide-cart-enter-active,
.slide-cart-leave-active {
  transition: transform 0.3s ease;
}

.slide-cart-enter-from,
.slide-cart-leave-to {
  transform: translateX(-100%);
}

.slide-cart-enter-to,
.slide-cart-leave-from {
  transform: translateX(0);
}

/* RTL Support */
[dir="rtl"] .cart-dropdown {
  left: auto;
  right: 0;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
}

[dir="rtl"] .slide-cart-enter-from,
[dir="rtl"] .slide-cart-leave-to {
  transform: translateX(100%);
}

/* Header */
.cart-header {
  padding: 15px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 15px;
}

.close-btn {
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.cart-header h3 {
  margin: 0;
  font-size: 18px;
  flex: 1;
}

/* Cart Items */
.cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.cart-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
}

.cart-item:last-child {
  border-bottom: none;
}

.remove-item {
  position: absolute;
  top: 10px;
  right: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

[dir="rtl"] .remove-item {
  right: auto;
  left: 0;
}

.item-image {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.item-details {
  flex: 1;
  padding-right: 20px;
}

[dir="rtl"] .item-details {
  padding-right: 0;
  padding-left: 20px;
}

.item-details h4 {
  font-size: 13px;
  margin: 0 0 5px 0;
  line-height: 1.3;
  color: #333;
}

.item-sku {
  font-size: 11px;
  color: #999;
  margin: 0 0 8px 0;
}

.item-quantity {
  display: inline-flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-top: 8px;
}

.qty-btn {
  background: none;
  border: none;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
}

.qty-btn:hover {
  background: #f5f5f5;
}

.item-quantity input {
  width: 30px;
  text-align: center;
  border: none;
  border-left: 1px solid #ddd;
  border-right: 1px solid #ddd;
  padding: 0 5px;
  height: 24px;
  font-size: 13px;
}

.item-price {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-top: 8px;
}

/* Footer */
.cart-footer {
  padding: 15px;
  border-top: 1px solid #eee;
  background: #fafafa;
  margin-top: auto;
}

.cart-subtotal {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 16px;
}

.total-amount {
  font-weight: 600;
  color: #333;
}

.shipping-info {
  background: #e3f2fd;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  color: #1976d2;
  margin-bottom: 15px;
  text-align: center;
}

.shipping-amount {
  font-weight: 600;
}

.view-cart-btn,
.checkout-btn {
  display: block;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 5px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
  text-decoration: none;
}

.view-cart-btn {
  background: white;
  border: 1px solid #ddd;
  color: #333;
  margin-bottom: 10px;
}

.view-cart-btn:hover {
  background: #f5f5f5;
}

.checkout-btn {
  background: #ff9800;
  color: white;
}

.checkout-btn:hover {
  background: #f57c00;
}

.view-cart-btn:disabled,
.checkout-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Cart Loading State */
.cart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.cart-loading .loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #2675BA;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.cart-loading p {
  color: #666;
  font-size: 14px;
  margin: 0;
}

/* Cart Empty State */
.cart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.cart-empty svg {
  color: #ccc;
  margin-bottom: 20px;
}

.cart-empty p {
  color: #666;
  font-size: 16px;
  margin: 0;
}

/* Overlay */
.cart-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 999;
}

/* Responsive */
@media (max-width: 480px) {
  .cart-dropdown {
    width: 100vw;
    max-width: 340px;
  }
}
.fade-enter-active, .fade-leave-active {
  transition: opacity .3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

</style>
