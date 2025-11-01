import { defineNuxtConfig } from 'nuxt/config'
// Nuxt 3 configuration
export default defineNuxtConfig({
  ssr: true,
  srcDir: '.',
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8000/api',
    }
  },
  nitro: {
    preset: 'vercel',
    compatibilityDate: '2025-09-11',
    routeRules: {
      '/api/**': { 
        proxy: 'http://localhost:8000/api/**',
        cors: true
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
  modules: [
    '@nuxtjs/i18n'
  ],
  plugins: [
    { src: '~/plugins/bootstrap.client.ts', mode: 'client' }
  ],
  // @ts-expect-error i18n module runtime typing
  i18n: {
    strategy: 'prefix_except_default', // default (ar) without prefix, others with prefix (/en)
    defaultLocale: 'ar',
    detectBrowserLanguage: false,
    langDir: 'locales',
    locales: [
      { code: 'ar', language: 'ar', name: 'العربية', dir: 'rtl', file: 'ar.json' },
      { code: 'en', language: 'en', name: 'English', dir: 'ltr', file: 'en.json' }
    ],
    vueI18n: './i18n.config.ts'
  }
})
