
<template>
  <div>
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
