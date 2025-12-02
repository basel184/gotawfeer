<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import { useWishlist } from '../composables/useWishlist'
import { useCart } from '../composables/useCart'

const props = defineProps<{ products: any[] }>()
const cart = useCart()
const wishlist = useWishlist()

onMounted(async () => {
  // Load cart and wishlist in background (non-blocking)
  // Silently handle errors (404 is expected if user is not authenticated)
  Promise.all([
    cart.list().catch(() => {}), // Silently handle errors
    wishlist.list().catch(() => {}) // Silently handle errors (404 is normal for guests)
  ]).catch(() => {
    // All errors are already handled silently
  })
})
// Per-product busy map to avoid global loader
const busy: any = ref<Record<string, boolean>>({})
const keyOf = (p: any) => String(p?.id || p?.product_id || p?.product?.id || '')
const withBusy = async (p: any, fn: () => Promise<any>) => {
  const k = keyOf(p)
  if (!k) return fn()
  busy.value[k] = true
  try { return await fn() } finally { delete busy.value[k] }
}

const modules = [Navigation]
const breakpoints = {
  0: { slidesPerView: 2.1, spaceBetween: 0 },
  480: { slidesPerView: 2.5, spaceBetween: 0 },
  640: { slidesPerView: 3.5, spaceBetween: 5 },
  900: { slidesPerView: 4.5, spaceBetween: 5 },
  1200: { slidesPerView: 7, spaceBetween: 5 }
}
</script>

<template>
  <div class="swiper-wrap" dir="rtl">
    <Swiper
      :modules="modules"
      navigation
      :breakpoints="breakpoints"
      :space-between="12"
      class="grid-swiper"
    >
      <SwiperSlide v-for="(p,i) in products" :key="p?.id || p?.slug || i">
        <div class="slide-inner">
          <ProductCard
            :product="p"
            :qty="cart.qtyOf(p)"
            :busy="busy[keyOf(p)]"
            @add="() => withBusy(p, () => cart.updateByProduct(p, 1))"
            @update="(e:any) => withBusy(p, () => cart.updateByProduct(p, e.qty))"
            @remove="() => withBusy(p, () => cart.removeByProduct(p))"
          />
        </div>
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<style scoped>
.swiper-wrap { position: relative }
.grid-swiper :deep(.swiper-button-prev),
.grid-swiper :deep(.swiper-button-next){
  width:36px; height:36px; border-radius:999px; background:#fff; color:#111827; border:1px solid #e5e7eb; box-shadow:0 4px 14px rgba(0,0,0,.08)
}
.grid-swiper :deep(.swiper-button-prev)::after,
.grid-swiper :deep(.swiper-button-next)::after{ font-size:14px }
.slide-inner{ padding: 2px }
</style>
