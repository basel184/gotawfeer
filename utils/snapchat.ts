// Snapchat Pixel Utilities

/**
 * Format price for Snapchat tracking
 */
export const formatPrice = (price: number): number => {
  return Math.round(price * 100) / 100
}

/**
 * Format currency code
 */
export const formatCurrency = (currency: string = 'SAR'): string => {
  return currency.toUpperCase()
}

/**
 * Generate transaction ID
 */
export const generateTransactionId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Build product item data
 */
export const buildProductItem = (product: any) => {
  return {
    id: product.id?.toString() || '',
    name: product.name || product.title || '',
    price: formatPrice(product.price || 0),
    category: product.category || '',
    sku: product.sku || '',
    image_url: product.image || product.thumbnail || ''
  }
}

/**
 * Build cart item data
 */
export const buildCartItem = (item: any) => {
  return {
    product_id: item.product_id?.toString() || item.id?.toString() || '',
    name: item.product_name || item.name || '',
    price: formatPrice(item.price || 0),
    quantity: item.quantity || 1,
    total: formatPrice((item.price || 0) * (item.quantity || 1))
  }
}

/**
 * Calculate cart total
 */
export const calculateCartTotal = (items: any[]): number => {
  return formatPrice(
    items.reduce((total, item) => {
      return total + (item.price || 0) * (item.quantity || 1)
    }, 0)
  )
}

/**
 * Validate Snapchat event data
 */
export const validateEventData = (eventData: Record<string, any>): boolean => {
  if (!eventData) return false
  if (typeof eventData !== 'object') return false
  return true
}

/**
 * Sanitize event data for Snapchat
 */
export const sanitizeEventData = (data: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(data)) {
    // Skip undefined or null values
    if (value === undefined || value === null) continue

    // Convert to appropriate types
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

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (currency: string = 'SAR'): string => {
  const symbols: Record<string, string> = {
    'SAR': 'ر.س',
    'AED': 'د.إ',
    'EGP': '£',
    'USD': '$',
    'EUR': '€'
  }
  return symbols[currency] || currency
}

/**
 * Format price with currency
 */
export const formatPriceWithCurrency = (price: number, currency: string = 'SAR'): string => {
  const symbol = getCurrencySymbol(currency)
  return `${formatPrice(price)} ${symbol}`
}
