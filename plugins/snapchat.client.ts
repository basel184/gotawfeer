declare global {
  interface Window {
    dataLayer: any[]
    pushToDataLayer: (event: string, data?: any) => void
    snaptr: any
  }
}

export default defineNuxtPlugin(() => {
  if (process.server) return

  // DataLayer initialization
  window.dataLayer = window.dataLayer || []

  window.pushToDataLayer = (event: string, data: any = {}) => {
    const eventData = {
      event,
      timestamp: new Date().toISOString(),
      ...data
    }
    window.dataLayer.push(eventData)
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[DataLayer]', eventData)
    }
  }

  // Snapchat Pixel Loader
  ;(function (e: any, t: any, n: string) {
    if (e.snaptr) return
    const a = (e.snaptr = function () {
      a.handleRequest
        ? a.handleRequest.apply(a, arguments)
        : a.queue.push(arguments)
    })
    a.queue = []

    const s = 'script'
    const r = t.createElement(s)
    r.async = true
    r.src = n

    const u = t.getElementsByTagName(s)[0]
    if (u && u.parentNode) {
      u.parentNode.insertBefore(r, u)
    }
  })(window, document, 'https://sc-static.net/scevent.min.js')

  // Initialize Snapchat Pixel with Saudi Riyal currency
  window.snaptr('init', 'f607062b-c823-407a-9f93-1dc2542be238', {
    currency: 'SAR'
  })

  // Track initial page view
  window.snaptr('track', 'PAGE_VIEW')

  // Push to DataLayer
  window.pushToDataLayer('PAGE_VIEW', {
    currency: 'SAR',
    locale: 'ar-SA'
  })
})
