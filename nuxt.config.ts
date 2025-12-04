import { defineNuxtConfig } from 'nuxt/config'

// Nuxt 3 configuration
export default defineNuxtConfig({
  ssr: true,
  srcDir: '.',
  
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
    }
  },
  
  nitro: {
    preset: 'vercel',
    compatibilityDate: '2025-09-11',
    routeRules: {
      '/api/**': { 
        cors: true,
        headers: { 'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE' }
      }
    }
  },
  
  typescript: {
    strict: false,
    typeCheck: false
  },
  
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag.startsWith('swiper-')
    }
  },
  
  app: {
    pageTransition: {
      name: 'page',
      mode: 'default', // Allow parallel transitions for faster SPA navigation
      duration: 50
    },
    // htmlAttrs will be set dynamically in app.vue based on i18n locale
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'جو توفير - Go Tawfeer',
      meta: [
        { name: 'description', content: 'مرحباً بكم في جو توفير، وجهتك الأولى للتسوق الإلكتروني في المملكة العربية السعودية.' },
        { name: 'format-detection', content: 'telephone=no' }
      ],
      link: [
        { rel: 'icon', type: 'image/webp', href: '/images/go-tawfeer-1-1.webp' },
        { rel: 'apple-touch-icon', type: 'image/webp', href: '/images/go-tawfeer-1-1.webp }
      ]
    }
  },
  
  experimental: {
    payloadExtraction: false, // Faster page transitions - don't extract payload
    viewTransition: false
  },
  
  // Route Rules - Critical for proper SSR/SPA behavior
  // Note: SSR is enabled globally, so we only need to set prerender: false for dynamic routes
  routeRules: {
    // Homepage - no prerender (dynamic content)
    '/': { 
      prerender: false
    },
    
    // Shop pages - no prerender (dynamic content)
    '/shop': { 
      prerender: false
    },
    '/shop/**': { 
      prerender: false
    },
    
    // Dynamic product pages
    '/product/**': {
      prerender: false
    },
    
    // Dynamic category pages
    '/category/**': {
      prerender: false
    },
    
    // Dynamic brand pages
    '/brand/**': {
      prerender: false
    },
    
    // Collection pages
    '/collection/**': {
      prerender: false
    },
    
    // Static pages - no prerender (may have dynamic content)
    '/about': {
      prerender: false
    },
    '/categories': {
      prerender: false
    },
    '/brands': {
      prerender: false
    },
    
    // Account pages - require auth (handled by middleware)
    '/account/**': {
      prerender: false
    },
    
    // Checkout pages
    '/checkout/**': {
      prerender: false
    },
    
    // English locale pages - same rules apply
    '/en/**': {
      prerender: false
    }
  },
  
  modules: [
    '@nuxtjs/i18n'
  ],
  
  plugins: [
    { src: '~/plugins/bootstrap.client.ts', mode: 'client' }
  ],
  
  // @ts-expect-error i18n module runtime typing
  // i18n configuration
  i18n: {
    strategy: 'prefix_except_default', // default (ar) without prefix, others with prefix (/en)
    defaultLocale: 'ar',
    detectBrowserLanguage: false, // Disable auto-detection for consistent behavior
    langDir: 'locales',
    locales: [
      { code: 'ar', language: 'ar', name: 'العربية', dir: 'rtl', file: 'ar.json' },
      { code: 'en', language: 'en', name: 'English', dir: 'ltr', file: 'en.json' }
    ],
    vueI18n: './i18n.config.ts',
    compilation: {
      strictMessage: false,
      escapeHtml: false
    },
    // Let Nuxt auto-discover routes instead of manual config
    // This ensures dynamic routes work correctly
    // customRoutes: 'config' was causing issues with dynamic routes
  }
})
