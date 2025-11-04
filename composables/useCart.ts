// Reactive Cart composable integrating with backend REST endpoints
// Nuxt auto-imports defineComponent APIs at runtime; declare ref for TS when types aren't generated
declare function ref<T = any>(v?: T): { value: T }

// Singleton state
const items = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const lastFetch = ref<number>(0)
const CACHE_DURATION = 5000 // 5 seconds cache

export function useCart() {
  const { $get, $post, $put, $del } = useApi()

  const list = async (force = false) => {
    // Check cache first
    const now = Date.now()
    if (!force && now - lastFetch.value < CACHE_DURATION && items.value.length > 0) {
      return items.value
    }
    
    // Prevent multiple simultaneous requests
    if (loading.value) {
      return items.value
    }
    
    loading.value = true
    error.value = null
    try {
      const res: any = await $get('v1/cart/')
      // try {
      //   const plain = JSON.parse(JSON.stringify(res))
      //   console.log('[Cart:list] length:', Array.isArray(plain) ? plain.length : 'not-array')
      //   console.log('[Cart:list] first:', plain?.[0])
      // } catch {}
      // API returns an array of cart rows
      items.value = Array.isArray(res) ? res : []
      lastFetch.value = now
      return items.value
    } catch (e: any) {
      error.value = e?.message || 'Failed to load cart'
      throw e
    } finally {
      loading.value = false
    }
  }

  const keyFor = (product: any): number | null => {
    const pid = product?.id || product?.product_id || product?.product?.id
    if (!pid) return null
    // Try to also match by variant if exists
    const variant = product?.variant || product?.current_variant || product?.chosen_variant
    const found = items.value.find((it: any) => {
      const itPid = it?.product_id || it?.product?.id
      const itVar = it?.variant
      return String(itPid) === String(pid) && (!variant || !itVar || String(variant) === String(itVar))
    })
    return found?.id ?? found?.key ?? null
  }

  const qtyOf = (product: any): number => {
    const pid = product?.id || product?.product_id || product?.product?.id
    if (!pid) return 0
    const it = items.value.find((x: any) => String(x?.product_id || x?.product?.id) === String(pid))
    return Number(it?.quantity || it?.qty || 0)
  }

  const add = async (payload: any) => {
    loading.value = true
    error.value = null
    console.log('[Cart:add] payload:', payload)
    
    try {
      // Prepare data for API
      const apiData: any = {
        id: payload.product_id,
        quantity: payload.quantity || 1
      }
      
      // Add all variant-related fields
      if (payload.variant) apiData.variant = payload.variant
      if (payload.color) apiData.color = payload.color
      if (payload.size) apiData.size = payload.size
      if (payload.variant_type) apiData.variant_type = payload.variant_type
      if (payload.sku) apiData.sku = payload.sku
      if (payload.price) apiData.price = payload.price
      if (payload.base_price) apiData.base_price = payload.base_price
      if (payload.discount) apiData.discount = payload.discount
      if (payload.discount_type) apiData.discount_type = payload.discount_type
      
      // Try alternative field names that the API might recognize
      if (payload.price) apiData.final_price = payload.price
      if (payload.price) apiData.unit_price = payload.price
      if (payload.price) apiData.selling_price = payload.price
      
      console.log('[Cart:add] apiData:', apiData)
      
      const response = await $post('v1/cart/add', apiData).catch((err: any) => {
        console.error('[Cart:add] Error details:', {
          message: err.message,
          statusCode: err.statusCode,
          statusMessage: err.statusMessage,
          data: err.data,
          response: err.response
        })
        throw err
      })
      
      console.log('[Cart:add] Success:', response)
      // Force refresh cart list to update UI immediately
      await list(true)
      return items.value
    } catch (e: any) {
      const errorMessage = e?.data?.message || e?.message || 'Failed to add to cart'
      error.value = errorMessage
      console.error('[Cart:add] Final error:', errorMessage, e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const update = async (payload: { key: number; quantity: number }) => {
    loading.value = true
    error.value = null
    
    try {
      await $put('v1/cart/update', payload)
      // Force refresh cart list to update UI immediately
      await list(true)
      return items.value
    } catch (e: any) {
      error.value = e?.message || 'Failed to update cart'
      throw e
    } finally {
      loading.value = false
    }
  }

  const updateByProduct = async (product: any, quantity: number) => {
    const key = keyFor(product)
    if (!key) {
      // No key yet: treat as add
      const pid = product?.id || product?.product_id || product?.product?.id
      if (!pid) return list()
      await add({ product_id: Number(pid), quantity })
      return items.value
    }
    await update({ key: Number(key), quantity: Number(quantity) })
    return items.value
  }

  const remove = async (key: number) => {
    loading.value = true
    error.value = null
    
    try {
      await $del('v1/cart/remove', { key })
      // Force refresh cart list to update UI immediately
      await list(true)
      return items.value
    } catch (e: any) {
      error.value = e?.message || 'Failed to remove from cart'
      throw e
    } finally {
      loading.value = false
    }
  }

  const removeByProduct = async (product: any) => {
    const key = keyFor(product)
    if (!key) return items.value
    await remove(Number(key))
    return items.value
  }

  const clearAll = async () => {
    loading.value = true
    error.value = null
    
    try {
      // API requires a key param but value is unused; pass a sentinel
      await $del('v1/cart/remove-all', { key: 'all' })
      // Force refresh cart list to update UI immediately
      await list(true)
      return items.value
    } catch (e: any) {
      error.value = e?.message || 'Failed to clear cart'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, list, add, update, updateByProduct, remove, removeByProduct, clearAll, keyFor, qtyOf }
}
