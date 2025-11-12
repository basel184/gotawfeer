
<template>
  <div>
    <NuxtLayout>
      <NuxtPage :transition="{
        name: 'page',
        mode: 'out-in',
        duration: 150
      }" />
    </NuxtLayout>
  </div>
</template>

<script setup>
// Force Arabic locale on app initialization
const { $i18n } = useNuxtApp()
if (process.client) {
  $i18n.locale.value = 'ar'
  document.documentElement.setAttribute('lang', 'ar')
  document.documentElement.setAttribute('dir', 'rtl')
}
</script>

<style>
@import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
@import '/assets/css/custom.css';
body {
  margin: 0;
}

/* Page Transitions - Fast */
.page-enter-active,
.page-leave-active {
  transition: all 0.15s ease-out;
  position: relative;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(5px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.page-enter-to,
.page-leave-from {
  opacity: 1;
  transform: translateY(0);
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
