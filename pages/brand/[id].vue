<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t, locale } = useI18n()
const { byBrand } = useProducts()

// SEO Configuration
const seo = useSeo()

const id = route.params.id as string
const { data } = await useAsyncData(`brand-${id}`, () => byBrand(id))
const items = computed(() => {
  const val: any = (data as any)?.value
  if (Array.isArray(val)) return val
  if (Array.isArray(val?.data)) return val.data
  return []
})

// Brand name for SEO
const brandName = computed(() => {
  return items.value[0]?.brand?.name || 
         items.value[0]?.brand_name ||
         (locale.value === 'ar' ? 'البراند' : 'Brand')
})

// Set SEO for brand page
watch([() => items.value, () => locale.value], () => {
  if (items.value.length > 0) {
    seo.setSeo({
      title: brandName.value,
      description: locale.value === 'ar' 
        ? `تصفح منتجات ${brandName.value} في متجر جو توفير. منتجات أصلية بأسعار مميزة.`
        : `Browse ${brandName.value} products at Go Tawfeer store. Authentic products at great prices.`,
      keywords: locale.value === 'ar' 
        ? `${brandName.value}, منتجات, براند, جو توفير`
        : `${brandName.value}, products, brand, Go Tawfeer`,
      image: '/images/go-tawfeer-1-1.webp'
    })
  }
}, { immediate: true })
</script>

<template>
  <div style="padding:16px;display:flex;flex-direction:column;gap:16px;">
    <SectionTitle title="Brand" />
    <ProductGrid :products="items" />
  </div>
 </template>
