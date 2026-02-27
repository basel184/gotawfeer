// Snapchat Pixel Composable for Nuxt 3
// Handles all Snapchat tracking with proper SPA support

import { ref, onMounted } from 'vue'

declare global {
  interface Window {
    snaptr: any
    dataLayer: any[]
    pushToDataLayer: (event: string, data?: any) => void
  }
}

interface SnapchatEventData {
  event: string
  data?: Record<string, any>
  timestamp?: number
}

interface SnapchatPurchaseEvent {
  transaction_id: string
  price: number
  currency: string
  num_items?: number
  description?: string
  item_ids?: string[]
  [key: string]: any
}

interface SnapchatAddToCartEvent {
  item_ids: string[]
  price: number
  currency: string
  quantity?: number
  [key: string]: any
}

interface SnapchatViewContentEvent {
  item_ids: string[]
  price: number
  currency: string
  content_name?: string
  content_type?: string
  [key: string]: any
}

export function useSnapchatPixel() {
  const isInitialized = ref(false)
  const eventQueue = ref<SnapchatEventData[]>([])
  
  // Default config
  const config = {
    pixelId: 'f607062b-c823-407a-9f93-1dc2542be238',
    enabled: true,
    trackPageView: true,
    trackEvents: true
  }
  const currency = 'SAR'

  /**
   * Initialize Snapchat Pixel
   */
  const init = () => {
    if (!process.client || !config.enabled || isInitialized.value) {
      return
    }

    if (typeof window.snaptr === 'function') {
      isInitialized.value = true
      console.log('[Snapchat Pixel] Already initialized')
      return
    }

    // Initialize with pixel ID
    if (window.snaptr) {
      window.snaptr('init', config.pixelId)
      isInitialized.value = true
      console.log('[Snapchat Pixel] Initialized with ID:', config.pixelId)

      // Track initial page view
      if (config.trackPageView) {
        window.snaptr('track', 'PAGE_VIEW')
      }
    }
  }

  /**
   * Track event with Snapchat Pixel
   */
  const track = (event: string, data?: Record<string, any>) => {
    if (!process.client || !config.enabled || !window.snaptr) {
      console.warn('[Snapchat Pixel] Not initialized or disabled')
      return
    }

    try {
      const eventData = {
        ...data,
        currency: data?.currency || currency
      }

      window.snaptr('track', event, eventData)
      console.log('[Snapchat Pixel] Event tracked:', event, eventData)

      // Push to DataLayer
      if (window.pushToDataLayer) {
        window.pushToDataLayer(event, eventData)
      }
    } catch (error) {
      console.error('[Snapchat Pixel] Error tracking event:', error)
    }
  }

  /**
   * Track purchase event
   */
  const trackPurchase = (purchaseData: SnapchatPurchaseEvent) => {
    const data = {
      ...purchaseData,
      currency: purchaseData.currency || currency
    }
    track('PURCHASE', data)
  }

  /**
   * Track add to cart event
   */
  const trackAddToCart = (cartData: SnapchatAddToCartEvent) => {
    const data = {
      ...cartData,
      currency: cartData.currency || currency
    }
    track('ADD_CART', data)
  }

  /**
   * Track remove from cart event
   */
  const trackRemoveFromCart = (cartData: SnapchatAddToCartEvent) => {
    const data = {
      ...cartData,
      currency: cartData.currency || currency
    }
    track('REMOVE_CART', data)
  }

  /**
   * Track view content event
   */
  const trackViewContent = (contentData: SnapchatViewContentEvent) => {
    const data = {
      ...contentData,
      currency: contentData.currency || currency
    }
    track('VIEW_CONTENT', data)
  }

  /**
   * Track search event
   */
  const trackSearch = (searchString: string) => {
    track('SEARCH', {
      search_string: searchString
    })
  }

  /**
   * Track checkout initiation
   */
  const trackInitiateCheckout = (checkoutData?: Record<string, any>) => {
    track('INITIATE_CHECKOUT', {
      ...checkoutData,
      currency
    })
  }

  /**
   * Track payment info added
   */
  const trackAddPaymentInfo = (paymentData?: Record<string, any>) => {
    track('ADD_PAYMENT_INFO', {
      ...paymentData,
      currency
    })
  }

  /**
   * Track sign up event
   */
  const trackSignUp = (signUpData?: Record<string, any>) => {
    track('SIGN_UP', signUpData)
  }

  /**
   * Track login event
   */
  const trackLogin = (loginData?: Record<string, any>) => {
    track('LOGIN', loginData)
  }

  /**
   * Track page view
   */
  const trackPageView = () => {
    track('PAGE_VIEW')
  }

  /**
   * Get currency code
   */
  const getCurrency = () => currency

  /**
   * Initialize on mount
   */
  onMounted(() => {
    init()
  })

  return {
    isInitialized,
    init,
    track,
    trackPurchase,
    trackAddToCart,
    trackRemoveFromCart,
    trackViewContent,
    trackSearch,
    trackInitiateCheckout,
    trackAddPaymentInfo,
    trackSignUp,
    trackLogin,
    trackPageView,
    getCurrency
  }
}
