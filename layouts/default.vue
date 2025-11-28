<template>
  <div>
    <AppHeader />
    <main :dir="dir">
      <slot />
    </main>
    <AppFooter />
  </div>
  
</template>

<script setup>
const { locale } = useI18n()
const dir = computed(() => locale.value === 'ar' ? 'rtl' : 'ltr')
</script>
