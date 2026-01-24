import { watch } from 'vue'

export default defineNuxtPlugin(() => {
  const { $i18n } = useNuxtApp()
  
  // Function to update HTML attributes based on locale
  const updateHtmlAttributes = () => {
    if (process.client) {
      const currentLocale = $i18n.locale.value || 'ar'
      const isArabic = currentLocale === 'ar'
      const lang = isArabic ? 'ar' : 'en'
      const dir = isArabic ? 'rtl' : 'ltr'
      
      document.documentElement.setAttribute('lang', lang)
      document.documentElement.setAttribute('dir', dir)
    }
  }
  
  // Watch for locale changes
  watch(() => $i18n.locale.value, () => {
    updateHtmlAttributes()
  }, { immediate: true })
  
  // Initialize on plugin load
  if (process.client) {
    updateHtmlAttributes()
  }
})
