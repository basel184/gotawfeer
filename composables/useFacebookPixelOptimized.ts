// Optimized Facebook Pixel Composable for SPA
// Fixes Add to Cart tracking issues with event-based approach

export function useFacebookPixelOptimized() {
  const config = useRuntimeConfig()
  const pixelId = config.public.fbPixelId

  /**
   * Initialize Facebook Pixel
   */
  const initPixel = () => {
    if (!process.client) return

    // Check if already initialized
    if (typeof (window as any).fbq === 'function') {
      return
    }

    // Initialize fbq
    ;(window as any).fbq('init', pixelId)
    ;(window as any).fbq('track', 'PageView')

    console.log('[Facebook Pixel] Initialized with ID:', pixelId)
  }

  /**
   * Track Add to Cart - Event-Based (fixes SPA issue)
   * This is called directly when user clicks "Add to Cart" button
   */
  const trackAddToCart = (product: any, quantity: number = 1) => {
    if (!process.client || typeof (window as any).fbq !== 'function') {
      console.warn('[Facebook Pixel] fbq not available')
      return
    }

    const price = parseFloat(product.price || 0)
    const value = price * quantity

    // Event-based tracking (fires immediately on button click)
    ;(window as any).fbq('track', 'AddToCart', {
      content_ids: [product.id?.toString() || ''],
      content_name: product.name || product.title || '',
      content_type: 'product',
      value: parseFloat(value.toFixed(2)),
      currency: 'SAR',
      quantity: quantity,
      content_category: product.category || ''
    })

    // Also push to DataLayer for GTM
    if (typeof (window as any).dataLayer !== 'undefined') {
      ;(window as any).dataLayer.push({
        event: 'add_to_cart',
        ecommerce: {
          items: [
            {
              item_id: product.id?.toString() || '',
              item_name: product.name || product.title || '',
              price: parseFloat(price.toFixed(2)),
              quantity: quantity,
              item_category: product.category || ''
            }
          ]
        }
      })
    }

    console.log('[Facebook Pixel] Add to Cart tracked:', {
      productId: product.id,
      productName: product.name,
      quantity,
      value,
      currency: 'SAR'
    })
  }

  /**
   * Track View Content (Product Page View)
   */
  const trackViewContent = (product: any) => {
    if (!process.client || typeof (window as any).fbq !== 'function') {
      console.warn('[Facebook Pixel] fbq not available')
      return
    }

    ;(window as any).fbq('track', 'ViewContent', {
      content_ids: [product.id?.toString() || ''],
      content_name: product.name || product.title || '',
      content_type: 'product',
      value: parseFloat((product.price || 0).toFixed(2)),
      currency: 'SAR',
      content_category: product.category || ''
    })

    console.log('[Facebook Pixel] View Content tracked:', {
      productId: product.id,
      productName: product.name
    })
  }

  /**
   * Track Initiate Checkout
   */
  const trackInitiateCheckout = (cartData: any) => {
    if (!process.client || typeof (window as any).fbq !== 'function') {
      console.warn('[Facebook Pixel] fbq not available')
      return
    }

    const items = cartData.items || []
    const value = cartData.total || 0
    const numItems = items.length

    ;(window as any).fbq('track', 'InitiateCheckout', {
      content_ids: items.map((item: any) => item.id?.toString() || ''),
      content_type: 'product',
      num_items: numItems,
      value: parseFloat(value.toFixed(2)),
      currency: 'SAR'
    })

    console.log('[Facebook Pixel] Initiate Checkout tracked:', {
      numItems,
      value,
      currency: 'SAR'
    })
  }

  /**
   * Track Purchase - Event-Based
   * Call this on success page with order data
   */
  const trackPurchase = (orderData: any) => {
    if (!process.client || typeof (window as any).fbq !== 'function') {
      console.warn('[Facebook Pixel] fbq not available')
      return
    }

    const value = orderData.value || orderData.total || 0
    const orderId = orderData.order_id || orderData.id || ''
    const items = orderData.content_ids || []
    const numItems = orderData.num_items || items.length || 1

    ;(window as any).fbq('track', 'Purchase', {
      content_ids: Array.isArray(items) ? items : [items],
      content_type: 'product',
      value: parseFloat(value.toFixed(2)),
      currency: 'SAR',
      num_items: numItems,
      order_id: orderId.toString()
    })

    console.log('[Facebook Pixel] Purchase tracked:', {
      orderId,
      value,
      numItems,
      currency: 'SAR'
    })
  }

  /**
   * Track Search
   */
  const trackSearch = (searchQuery: string) => {
    if (!process.client || typeof (window as any).fbq !== 'function') {
      console.warn('[Facebook Pixel] fbq not available')
      return
    }

    ;(window as any).fbq('track', 'Search', {
      search_string: searchQuery
    })

    console.log('[Facebook Pixel] Search tracked:', searchQuery)
  }

  /**
   * Track Custom Event
   */
  const trackCustomEvent = (eventName: string, eventData: Record<string, any> = {}) => {
    if (!process.client || typeof (window as any).fbq !== 'function') {
      console.warn('[Facebook Pixel] fbq not available')
      return
    }

    ;(window as any).fbq('track', eventName, eventData)

    console.log('[Facebook Pixel] Custom event tracked:', eventName, eventData)
  }

  /**
   * Get Pixel ID
   */
  const getPixelId = () => pixelId

  return {
    initPixel,
    trackAddToCart,
    trackViewContent,
    trackInitiateCheckout,
    trackPurchase,
    trackSearch,
    trackCustomEvent,
    getPixelId
  }
}
