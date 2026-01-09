
<template>
  <div>
    <AppLoading />
    <noscript>
      <iframe 
        src="https://www.googletagmanager.com/ns.html?id=GTM-5796K66F"
        height="0"
        width="0"
        style="display:none;visibility:hidden"
      ></iframe>
    </noscript>
    <NuxtLayout>
      <NuxtPage :transition="{
        name: 'page',
        mode: 'default',
        duration: 50
      }" />
    </NuxtLayout>
  </div>
</template>

<script setup>
import { watch, computed, onMounted } from 'vue'

// Get i18n instance
const { $i18n } = useNuxtApp()
const { locale } = useI18n()

// Function to update HTML attributes based on locale
const updateHtmlAttributes = () => {
  if (process.client) {
    const currentLocale = locale.value || $i18n.locale.value || 'ar'
    const isArabic = currentLocale === 'ar'
    const lang = isArabic ? 'ar' : 'en'
    const dir = isArabic ? 'rtl' : 'ltr'
    
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', dir)
  }
}

// Watch for locale changes and update HTML attributes
watch(() => locale.value || $i18n.locale.value, () => {
  updateHtmlAttributes()
}, { immediate: true })

// Also use useHead for SSR support
useHead(() => {
  const currentLocale = locale.value || $i18n.locale.value || 'ar'
  const isArabic = currentLocale === 'ar'
  return {
    htmlAttrs: {
      lang: isArabic ? 'ar' : 'en',
      dir: isArabic ? 'rtl' : 'ltr'
    },
    meta: [
      { name: 'facebook-domain-verification', content: '1m0v9vhvrgpr5kj8cdegfh5wttfm1x' }
    ],
    script: [
      {
        innerHTML: `(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init','f607062b-c823-407a-9f93-1dc2542be238',{});snaptr('track','PAGE_VIEW');`,
        type: 'text/javascript'
      }
    ],
    __dangerouslyDisableSanitizers: ['script']
  }
})

// Initialize on mount
onMounted(() => {
  updateHtmlAttributes()

})
</script>

<style>
@import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
@import '/assets/css/custom.css';


/* Page Transitions - Instant for SPA navigation */
.page-enter-active {
  transition: opacity 0.05s ease-out;
}

.page-leave-active {
  transition: opacity 0.03s ease-in;
  position: absolute;
  width: 100%;
  top: 0;
  left: 0;
}

.page-enter-from {
  opacity: 0;
}

.page-leave-to {
  opacity: 0;
}

.page-enter-to,
.page-leave-from {
  opacity: 1;
}

/* RTL Support for transitions */
html[dir="rtl"] .page-enter-from {
  transform: translateY(10px);
}

html[dir="rtl"] .page-leave-to {
  transform: translateY(-10px);
}

/* Smooth scroll behavior */
html {
  scroll-behavior: smooth;
}
</style>
