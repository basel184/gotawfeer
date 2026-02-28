// Google Ads Conversion Tracking Types

export interface GoogleAdsConversionConfig {
  conversionId: string
  conversionLabel: string
  currency: string
}

export interface GoogleAdsConversionEvent {
  event: string
  send_to?: string
  value?: number
  currency?: string
  transaction_id?: string
  [key: string]: any
}

export interface GoogleAdsProduct {
  item_id: string
  item_name: string
  price?: number
  quantity?: number
  [key: string]: any
}

export interface GoogleAdsCheckoutEvent {
  value: number
  currency: string
  items: GoogleAdsProduct[]
}

export interface GoogleAdsWindow extends Window {
  gtag?: (...args: any[]) => void
  dataLayer?: any[]
}
