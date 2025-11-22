import { ref, computed, readonly } from 'vue'

// Wishlist state
const wishlist = ref<any[]>([])
const loading = ref(false)
const error = ref('')
const lastFetch = ref<number>(0)
const CACHE_DURATION = 5000 // 5 seconds cache

// Wishlist count
const wishlistCount = computed(() => {
  return wishlist.value.length
})

// Get wishlist items
const list = async (force = false) => {
  // Check cache first
  const now = Date.now()
  if (!force && now - lastFetch.value < CACHE_DURATION && wishlist.value.length >= 0) {
    return wishlist.value
  }
  
  // Prevent multiple simultaneous requests
  if (loading.value) {
    return wishlist.value
  }
  
  try {
    loading.value = true
    error.value = ''
    
    const { $get } = useApi()
    const response = await $get('v1/customer/wish-list')
    
    if (response && Array.isArray(response)) {
      wishlist.value = response
    } else {
      wishlist.value = []
    }
    
    lastFetch.value = now
    // console.log('Wishlist loaded:', wishlist.value.length, 'items')
  } catch (err: any) {
    const statusCode = err?.statusCode || err?.status || err?.response?.status
    
    // Handle 404 errors silently (endpoint may not exist or user not authenticated)
    if (statusCode === 404) {
      wishlist.value = []
      error.value = ''
      // Don't log 404 errors - they're expected if endpoint doesn't exist or user is not logged in
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Wishlist] Endpoint not found (404) - this is normal if user is not authenticated')
      }
    } else {
      // Only log non-404 errors
      console.error('Error loading wishlist:', err)
      error.value = err?.data?.message || 'خطأ في تحميل قائمة الرغبات'
      wishlist.value = []
    }
  } finally {
    loading.value = false
  }
}

// Add to wishlist
const add = async (productId: string) => {
  // Check if already in wishlist first
  if (isInWishlist(productId)) {
    console.log('Product already in wishlist, skipping add')
    return
  }
  
  try {
    loading.value = true
    const { $post } = useApi()
    
    await $post('v1/customer/wish-list/add', {
      product_id: productId
    })
    
    // Reload wishlist
    await list()
    
    console.log('Product added to wishlist:', productId)
    
    // Show toast notification if available
    if (typeof window !== 'undefined' && (window as any).$toast) {
      (window as any).$toast.success('تم إضافة المنتج إلى المفضلة')
    }
  } catch (err: any) {
    console.error('Error adding to wishlist:', err)
    
    // Handle 409 Conflict (already in wishlist)
    if (err?.status === 409 || err?.data?.message?.includes('Already in your wishlist')) {
      console.log('Product already in wishlist, refreshing wishlist...')
      try {
        await list() // Refresh wishlist to sync state
      } catch (refreshErr) {
        console.error('Error refreshing wishlist:', refreshErr)
      }
      // Show toast notification if available
      if (typeof window !== 'undefined' && (window as any).$toast) {
        (window as any).$toast.info('المنتج موجود بالفعل في المفضلة')
      }
      return
    }
    
    throw err
  } finally {
    loading.value = false
  }
}

// Remove from wishlist
const remove = async (productId: string) => {
  try {
    loading.value = true
    const { $post } = useApi()
    
    // Use POST with body parameter as Laravel DELETE doesn't support body
    await $post('v1/customer/wish-list/remove', {
      product_id: productId
    })
    
    // Remove from local state
    wishlist.value = wishlist.value.filter(item => 
      item.product_id !== productId && 
      item.id !== productId &&
      item.product?.id !== productId
    )
    
    console.log('Product removed from wishlist:', productId)
    
    // Show toast notification if available
    if (typeof window !== 'undefined' && (window as any).$toast) {
      (window as any).$toast.success('تم إزالة المنتج من المفضلة')
    }
  } catch (err: any) {
    console.error('Error removing from wishlist:', err)
    
    // Handle 404 Not Found (not in wishlist)
    if (err?.status === 404 || err?.data?.message?.includes('not in your wishlist')) {
      console.log('Product not in wishlist, refreshing wishlist...')
      try {
        await list() // Refresh wishlist to sync state
      } catch (refreshErr) {
        console.error('Error refreshing wishlist:', refreshErr)
      }
      // Show toast notification if available
      if (typeof window !== 'undefined' && (window as any).$toast) {
        (window as any).$toast.info('المنتج غير موجود في المفضلة')
      }
      return
    }
    
    throw err
  } finally {
    loading.value = false
  }
}

// Check if product is in wishlist
const isInWishlist = (productId: string) => {
  const result = wishlist.value.some(item => {
    return (
      String(item.product_id) === String(productId) || 
      String(item.id) === String(productId) ||
      String(item.product?.id) === String(productId)
    )
  })
  
  return result
}

// Toggle wishlist status
const toggle = async (productId: string) => {
  try {
    if (isInWishlist(productId)) {
      await remove(productId)
    } else {
      await add(productId)
    }
  } catch (err: any) {
    console.error('Error toggling wishlist:', err)
    
    // Handle 409 Conflict (already in wishlist)
    if (err?.status === 409 || err?.data?.message?.includes('Already in your wishlist')) {
      console.log('Product already in wishlist, refreshing wishlist...')
      try {
        await list() // Refresh wishlist to sync state
      } catch (refreshErr) {
        console.error('Error refreshing wishlist:', refreshErr)
      }
      return
    }
    
    // Handle 404 Not Found (not in wishlist) or "No such data found"
    if (err?.status === 404 || err?.data?.message?.includes('not in your wishlist') || err?.data?.message?.includes('No such data found')) {
      console.log('Product not in wishlist, refreshing wishlist...')
      try {
        await list() // Refresh wishlist to sync state
      } catch (refreshErr) {
        console.error('Error refreshing wishlist:', refreshErr)
      }
      return
    }
    
    // Handle authentication errors
    if (err?.status === 401 || err?.status === 403) {
      console.log('يجب تسجيل الدخول أولاً')
      if (typeof window !== 'undefined' && (window as any).$nuxt) {
        const loginModalOpen = (window as any).$nuxt.$useState('loginModalOpen', () => false)
        loginModalOpen.value = true
      }
      return
    }
    
    // Handle network errors
    if (err?.name === 'FetchError' || err?.message?.includes('fetch')) {
      console.log('خطأ في الاتصال بالإنترنت')
      if (typeof window !== 'undefined' && (window as any).$toast) {
        (window as any).$toast.error('خطأ في الاتصال بالإنترنت')
      }
      return
    }
    
    console.error('Unexpected wishlist error:', err)
    try {
      await list()
    } catch (refreshErr) {
      console.error('Error refreshing wishlist:', refreshErr)
    }
    console.error('حدث خطأ غير متوقع أثناء تحديث المفضلة')
    if (typeof window !== 'undefined' && (window as any).$toast) {
      (window as any).$toast.error('حدث خطأ غير متوقع أثناء تحديث المفضلة')
    }
    throw err
  }
}

// Clear all wishlist items
const clearAll = async () => {
  try {
    loading.value = true
    const { $del } = useApi()
    
    await $del('v1/customer/wish-list/clear')
    
    wishlist.value = []
    
    console.log('Wishlist cleared')
    
    // Show toast notification if available
    if (typeof window !== 'undefined' && (window as any).$toast) {
      (window as any).$toast.success('تم مسح قائمة الرغبات')
    }
  } catch (err: any) {
    console.error('Error clearing wishlist:', err)
    throw err
  } finally {
    loading.value = false
  }
}

// Export composable
export function useWishlist() {
  return {
    wishlist: readonly(wishlist),
    loading: readonly(loading),
    error: readonly(error),
    wishlistCount,
    list,
    add,
    remove,
    toggle,
    clearAll,
    isInWishlist,
  }
}