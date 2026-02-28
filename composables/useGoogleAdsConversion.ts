// Google Ads Conversion Tracking Composable
// Handles Google Ads conversion events with proper currency support

export function useGoogleAdsConversion() {
  const conversionId = 'AW-17945118619'
  const currency = 'SAR'

  /**
   * Track purchase conversion
   */
  const trackPurchaseConversion = (order: any) => {
    if (!process.client || typeof (window as any).gtag !== 'function') {
      console.warn('[Google Ads] gtag not available')
      return
    }

    const transactionId = order.id || order.order_id || ''
    const value = order.total || order.amount || 0

    (window as any).gtag('event', 'conversion', {
      'send_to': `${conversionId}/Vm7MCL6qpPYbEJuP8-xC`,
      'value': parseFloat(value.toFixed(2)),
      'currency': currency,
      'transaction_id': transactionId.toString()
    })

    console.log('[Google Ads] Purchase conversion tracked:', {
      transactionId,
      value,
      currency
    })
  }

  /**
   * Track add to cart conversion
   */
  const trackAddToCartConversion = (product: any, quantity: number = 1) => {
    if (!process.client || typeof (window as any).gtag !== 'function') {
      console.warn('[Google Ads] gtag not available')
      return
    }

    const value = (product.price || 0) * quantity

    (window as any).gtag('event', 'add_to_cart', {
      'value': parseFloat(value.toFixed(2)),
      'currency': currency,
      'items': [
        {
          'item_id': product.id?.toString() || '',
          'item_name': product.name || product.title,
          'quantity': quantity,
          'price': parseFloat((product.price || 0).toFixed(2))
        }
      ]
    })

    console.log('[Google Ads] Add to cart conversion tracked:', {
      productId: product.id,
      quantity,
      value,
      currency
    })
  }

  /**
   * Track view item conversion
   */
  const trackViewItemConversion = (product: any) => {
    if (!process.client || typeof (window as any).gtag !== 'function') {
      console.warn('[Google Ads] gtag not available')
      return
    }

    (window as any).gtag('event', 'view_item', {
      'value': parseFloat((product.price || 0).toFixed(2)),
      'currency': currency,
      'items': [
        {
          'item_id': product.id?.toString() || '',
          'item_name': product.name || product.title,
          'price': parseFloat((product.price || 0).toFixed(2))
        }
      ]
    })

    console.log('[Google Ads] View item conversion tracked:', {
      productId: product.id,
      productName: product.name,
      price: product.price,
      currency
    })
  }

  /**
   * Track begin checkout conversion
   */
  const trackBeginCheckoutConversion = (cartTotal: number, itemCount: number) => {
    if (!process.client || typeof (window as any).gtag !== 'function') {
      console.warn('[Google Ads] gtag not available')
      return
    }

    (window as any).gtag('event', 'begin_checkout', {
      'value': parseFloat(cartTotal.toFixed(2)),
      'currency': currency,
      'items': [
        {
          'quantity': itemCount
        }
      ]
    })

    console.log('[Google Ads] Begin checkout conversion tracked:', {
      cartTotal,
      itemCount,
      currency
    })
  }

  /**
   * Get conversion ID
   */
  const getConversionId = () => conversionId

  /**
   * Get currency
   */
  const getCurrency = () => currency

  return {
    trackPurchaseConversion,
    trackAddToCartConversion,
    trackViewItemConversion,
    trackBeginCheckoutConversion,
    getConversionId,
    getCurrency
  }
}
