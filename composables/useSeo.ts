import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

export const useSeo = () => {
  const { t, locale } = useI18n()
  const route = useRoute()
  
  const siteName = computed(() => {
    return locale.value === 'ar' ? 'جو توفير' : 'Go Tawfeer'
  })
  
  const siteDescription = computed(() => {
    return locale.value === 'ar' 
      ? 'مرحباً بكم في جو توفير، وجهتك الأولى للتسوق الإلكتروني في المملكة العربية السعودية.'
      : 'Welcome to Go Tawfeer, your premier destination for online shopping in Saudi Arabia.'
  })
  
  const siteUrl = computed(() => {
    if (process.client) {
      return window.location.origin
    }
    return 'https://gotawfeer.com'
  })
  
  const currentUrl = computed(() => {
    if (process.client) {
      return window.location.href
    }
    return `${siteUrl.value}${route.path}`
  })
  
  const setSeo = (options: {
    title?: string
    description?: string
    image?: string
    keywords?: string
    type?: string
    noindex?: boolean
  }) => {
    const finalTitle = options.title 
      ? `${options.title} | ${siteName.value}`
      : siteName.value
    
    const finalDescription = options.description || siteDescription.value
    
    // Handle image URL - support both relative and absolute paths
    let finalImage = options.image || '/images/go-tawfeer-1-1.webp'
    if (!finalImage.startsWith('http') && !finalImage.startsWith('/')) {
      finalImage = `/${finalImage}`
    }
    if (!finalImage.startsWith('http')) {
      finalImage = `${siteUrl.value}${finalImage}`
    }
    
    const finalType = options.type || 'website'
    
    useHead({
      title: finalTitle,
      meta: [
        { name: 'description', content: finalDescription },
        { name: 'keywords', content: options.keywords || '' },
        { name: 'robots', content: options.noindex ? 'noindex, nofollow' : 'index, follow' },
        
        // Open Graph
        { property: 'og:title', content: finalTitle },
        { property: 'og:description', content: finalDescription },
        { property: 'og:image', content: finalImage },
        { property: 'og:url', content: currentUrl.value },
        { property: 'og:type', content: finalType },
        { property: 'og:site_name', content: siteName.value },
        { property: 'og:locale', content: locale.value === 'ar' ? 'ar_SA' : 'en_US' },
        
        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: finalTitle },
        { name: 'twitter:description', content: finalDescription },
        { name: 'twitter:image', content: finalImage },
        
        // Additional
        { name: 'author', content: siteName.value },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
        { name: 'theme-color', content: '#2675BA' }
      ],
      link: [
        { rel: 'canonical', href: currentUrl.value },
        { rel: 'alternate', hreflang: 'ar', href: currentUrl.value.replace('/en', '') },
        { rel: 'alternate', hreflang: 'en', href: currentUrl.value.includes('/en') ? currentUrl.value : `${siteUrl.value}/en${route.path}` },
        { rel: 'alternate', hreflang: 'x-default', href: currentUrl.value.replace('/en', '') }
      ]
    })
  }
  
  return {
    siteName,
    siteDescription,
    siteUrl,
    currentUrl,
    setSeo
  }
}

