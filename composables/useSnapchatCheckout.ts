// Snapchat Checkout Tracking Composable
// Specialized for checkout flow tracking

import { onMounted } from 'vue'
import { useSnapchatEvents } from './useSnapchatEvents'

export function useSnapchatCheckout() {
  const { trackCheckoutStart, trackPurchaseComplete } = useSnapchatEvents()

  /**
   * Track checkout page view
   */
  const trackCheckoutView = (cartData: any) => {
    const total = cartData?.total || 0
    const itemCount = cartData?.items?.length || 0

    trackCheckoutStart(total, itemCount)
  }

  /**
   * Track purchase completion
   */
  const trackPurchase = (order: any) => {
    if (!order) return

    trackPurchaseComplete({
      id: order.id || order.order_id,
      total: order.total || order.amount,
      items: order.items || [],
      payment_method: order.payment_method,
      shipping_method: order.shipping_method
    })
  }

  /**
   * Track payment info added
   */
  const trackPaymentInfo = (paymentData: any) => {
    if (!paymentData) return

    // Push to DataLayer
    if (window.pushToDataLayer) {
      window.pushToDataLayer('ADD_PAYMENT_INFO', {
        payment_method: paymentData.method,
        currency: 'SAR'
      })
    }

    // Track with Snapchat
    if (window.snaptr) {
      window.snaptr('track', 'ADD_PAYMENT_INFO', {
        payment_method: paymentData.method,
        currency: 'SAR'
      })
    }
  }

  /**
   * Auto-track checkout on mount
   */
  const autoTrackCheckout = (cartData: any) => {
    onMounted(() => {
      trackCheckoutView(cartData)
    })
  }

  /**
   * Auto-track purchase on mount
   */
  const autoTrackPurchase = (order: any) => {
    onMounted(() => {
      trackPurchase(order)
    })
  }

  return {
    trackCheckoutView,
    trackPurchase,
    trackPaymentInfo,
    autoTrackCheckout,
    autoTrackPurchase
  }
}
