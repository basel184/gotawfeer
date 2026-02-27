// Application Configuration
// Centralized config for currency, tracking, and app settings

export const appConfig = {
  // Currency Configuration
  currency: {
    code: 'SAR', // Saudi Riyal
    symbol: 'ر.س',
    name: 'الريال السعودي',
    locale: 'ar-SA'
  },

  // Snapchat Pixel Configuration
  snapchat: {
    pixelId: 'f607062b-c823-407a-9f93-1dc2542be238',
    enabled: true,
    trackPageView: true,
    trackEvents: true
  },

  // Facebook Pixel Configuration
  facebook: {
    enabled: true,
    trackPageView: true,
    trackEvents: true
  },

  // Google Tag Manager
  gtm: {
    id: 'GTM-NKR2KJGQ',
    enabled: true
  },

  // TikTok Pixel
  tiktok: {
    pixelId: 'D5H3M7BC77U894MD6PB0',
    enabled: true
  },

  // Clarity Analytics
  clarity: {
    projectId: 'updq0wpk1w',
    enabled: true
  },

  // Event Tracking Configuration
  tracking: {
    // Enable/disable tracking globally
    enabled: true,
    
    // Debounce time for events (ms)
    debounceTime: 300,
    
    // Event queue settings
    queueSize: 100,
    flushInterval: 5000,

    // Track user interactions
    trackUserInteractions: true,
    trackPageViews: true,
    trackScrollDepth: true,
    trackTimeOnPage: true
  },

  // DataLayer Configuration
  dataLayer: {
    enabled: true,
    debug: false,
    persistToLocalStorage: true
  },

  // E-commerce specific settings
  ecommerce: {
    currency: 'SAR',
    trackAddToCart: true,
    trackRemoveFromCart: true,
    trackViewItem: true,
    trackPurchase: true,
    trackCheckout: true,
    trackSearch: true
  }
}

export default appConfig
