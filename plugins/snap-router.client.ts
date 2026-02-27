export default defineNuxtPlugin((nuxtApp: any) => {
  if (!process.client) return

  const router = nuxtApp.$router

  router.afterEach((to: any, from: any) => {
    // Track page view on route change
    if ((window as any).snaptr) {
      (window as any).snaptr('track', 'PAGE_VIEW')
    }

    // Push to DataLayer
    if ((window as any).pushToDataLayer) {
      (window as any).pushToDataLayer('PAGE_VIEW', {
        path: to.path,
        name: to.name,
        currency: 'SAR'
      })
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Snapchat Router] Page view tracked:', to.path)
    }
  })
})
