// Snapchat Pixel Types and Interfaces

export interface SnapchatPixelConfig {
  pixelId: string
  enabled: boolean
  trackPageView: boolean
  trackEvents: boolean
}

export interface SnapchatEventData {
  event: string
  data?: Record<string, any>
  timestamp?: number
}

export interface SnapchatPurchaseEvent {
  transaction_id: string
  price: number
  currency: string
  num_items?: number
  description?: string
  item_ids?: string[]
  [key: string]: any
}

export interface SnapchatAddToCartEvent {
  item_ids: string[]
  price: number
  currency: string
  quantity?: number
  [key: string]: any
}

export interface SnapchatViewContentEvent {
  item_ids: string[]
  price: number
  currency: string
  content_name?: string
  content_type?: string
  [key: string]: any
}

export interface SnapchatSearchEvent {
  search_string: string
  [key: string]: any
}

export interface DataLayerEvent {
  event: string
  [key: string]: any
}

export interface SnapchatPixelWindow {
  snaptr?: (...args: any[]) => void
  dataLayer?: DataLayerEvent[]
  pushToDataLayer?: (event: string, data?: Record<string, any>) => void
}

export const SNAPCHAT_EVENTS = {
  PAGE_VIEW: 'PAGE_VIEW',
  VIEW_CONTENT: 'VIEW_CONTENT',
  ADD_CART: 'ADD_CART',
  REMOVE_CART: 'REMOVE_CART',
  INITIATE_CHECKOUT: 'INITIATE_CHECKOUT',
  ADD_PAYMENT_INFO: 'ADD_PAYMENT_INFO',
  PURCHASE: 'PURCHASE',
  SEARCH: 'SEARCH',
  SIGN_UP: 'SIGN_UP',
  LOGIN: 'LOGIN'
} as const

export type SnapchatEventType = typeof SNAPCHAT_EVENTS[keyof typeof SNAPCHAT_EVENTS]
