// Google Ads Utilities

/**
 * Format price for Google Ads
 */
export const formatPrice = (price: number): number => {
  return Math.round(price * 100) / 100
}

/**
 * Build Google Ads product item
 */
export const buildGoogleAdsProduct = (product: any) => {
  return {
    item_id: product.id?.toString() || '',
    item_name: product.name || product.title || '',
    price: formatPrice(product.price || 0),
    quantity: product.quantity || 1,
    item_category: product.category || '',
    item_brand: product.brand || ''
  }
}

/**
 * Build Google Ads conversion event
 */
export const buildConversionEvent = (
  conversionId: string,
  conversionLabel: string,
  value: number,
  currency: string = 'SAR',
  transactionId?: string
) => {
  return {
    send_to: `${conversionId}/${conversionLabel}`,
    value: formatPrice(value),
    currency,
    transaction_id: transactionId || ''
  }
}

/**
 * Validate Google Ads event data
 */
export const validateGoogleAdsEvent = (eventData: Record<string, any>): boolean => {
  if (!eventData) return false
  if (typeof eventData !== 'object') return false
  return true
}

/**
 * Sanitize Google Ads event data
 */
export const sanitizeGoogleAdsEvent = (data: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue

    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
      sanitized[key] = value
    } else if (Array.isArray(value)) {
      sanitized[key] = value.filter(v => v !== undefined && v !== null)
    } else if (typeof value === 'object') {
      sanitized[key] = JSON.stringify(value)
    }
  }

  return sanitized
}
