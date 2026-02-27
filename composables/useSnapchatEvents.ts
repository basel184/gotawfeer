// Snapchat Events Composable
// Comprehensive event tracking for e-commerce

import { useSnapchatPixel } from './useSnapchatPixel'

export function useSnapchatEvents() {
  const snapchat = useSnapchatPixel()

  /**
   * Track product view
   */
  const trackProductView = (product: any) => {
    snapchat.trackViewContent({
      item_ids: [product.id?.toString() || ''],
      price: product.price || 0,
      currency: 'SAR',
      content_name: product.name || product.title,
      content_type: 'product'
    })
  }

  /**
   * Track add to cart
   */
  const trackAddToCart = (product: any, quantity: number = 1) => {
    snapchat.trackAddToCart({
      item_ids: [product.id?.toString() || ''],
      price: product.price || 0,
      currency: 'SAR',
      quantity
    })
  }

  /**
   * Track remove from cart
   */
  const trackRemoveFromCart = (product: any, quantity: number = 1) => {
    snapchat.trackRemoveFromCart({
      item_ids: [product.id?.toString() || ''],
      price: product.price || 0,
      currency: 'SAR',
      quantity
    })
  }

  /**
   * Track checkout initiation
   */
  const trackCheckoutStart = (cartTotal: number, itemCount: number) => {
    snapchat.trackInitiateCheckout({
      price: cartTotal,
      currency: 'SAR',
      num_items: itemCount
    })
  }

  /**
   * Track purchase completion
   */
  const trackPurchaseComplete = (order: any) => {
    snapchat.trackPurchase({
      transaction_id: order.id?.toString() || '',
      price: order.total || order.amount || 0,
      currency: 'SAR',
      num_items: order.items?.length || 0,
      description: `Order #${order.id}`,
      item_ids: order.items?.map((item: any) => item.product_id?.toString() || '') || []
    })
  }

  /**
   * Track search
   */
  const trackSearch = (searchQuery: string) => {
    snapchat.trackSearch(searchQuery)
  }

  /**
   * Track user signup
   */
  const trackSignUp = (userData?: any) => {
    snapchat.trackSignUp({
      email: userData?.email,
      phone: userData?.phone
    })
  }

  /**
   * Track user login
   */
  const trackLogin = (userData?: any) => {
    snapchat.trackLogin({
      email: userData?.email
    })
  }

  /**
   * Track page view
   */
  const trackPageView = () => {
    snapchat.trackPageView()
  }

  return {
    trackProductView,
    trackAddToCart,
    trackRemoveFromCart,
    trackCheckoutStart,
    trackPurchaseComplete,
    trackSearch,
    trackSignUp,
    trackLogin,
    trackPageView
  }
}
