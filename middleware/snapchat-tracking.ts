// Snapchat Tracking Middleware
// Automatically track page views for all routes

export default defineRouteMiddleware((to, from) => {
  if (process.client && window.snaptr) {
    // Track page view
    window.snaptr('track', 'PAGE_VIEW')

    // Push to DataLayer
    if (window.pushToDataLayer) {
      window.pushToDataLayer('PAGE_VIEW', {
        path: to.path,
        name: to.name,
        currency: 'SAR'
      })
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Snapchat Middleware] Page view tracked:', to.path)
    }
  }
})
