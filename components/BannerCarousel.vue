<script setup lang="ts">
import { computed } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const props = defineProps<{
  banners: any[]
  layout?: 'slider' | 'carousel'
}>()

const isCarousel = computed(() => (props.layout || 'slider') === 'carousel')
const carouselBreakpoints = {
  320: {
    slidesPerView: 1.1,
    spaceBetween: 10
  },
  640: {
    slidesPerView: 1.6,
    spaceBetween: 12
  },
  1024: {
    slidesPerView: 2.5,
    spaceBetween: 16
  },
  1280: {
    slidesPerView: 5,
    spaceBetween: 20
  }
}

const modules = [Navigation, Pagination, Autoplay]

const cfg = useRuntimeConfig() as any
const apiBase = (cfg?.public?.apiBase || 'https://admin.gotawfeer.com/api')
const assetBase = apiBase.replace(/\/api(?:\/v\d+)?$/, '')
const fixPath = (s: string) => {
  let p = s.trim().replace(/\\/g, '/')
  
  // Handle different path formats
  if (p.startsWith('public/')) {
    p = p.replace(/^public\//, '')
  } else if (p.startsWith('app/public/')) {
    p = p.replace(/^app\/public\//, 'storage/')
  } else if (p.startsWith('storage/')) {
    // Already correct format
  } else if (!p.startsWith('http') && !p.startsWith('/')) {
    // If it's just a filename, determine the correct storage path
    if (p.includes('testimonial')) {
      p = `storage/testimonials/${p}`
    } else if (p.includes('brand')) {
      p = `storage/brand/${p}`
    } else if (p.includes('product')) {
      p = `storage/product/${p}`
    } else {
      p = `storage/${p}`
    }
  }
  
  // Clean up slashes
  p = p.replace(/\/+/g, '/').replace(/^\//, '')
  
  return p
}
const toSrc = (u: any): string => {
  if (!u) return ''
  if (Array.isArray(u)) return toSrc(u[0])
  let s: any = u
  if (typeof u === 'string') {
    const t = u.trim()
    if (t.startsWith('[') || t.startsWith('{')) {
      try { return toSrc(JSON.parse(t)) } catch { /* ignore */ }
    }
    s = t
  } else if (typeof u === 'object') {
    s = (u as any).path || (u as any).url || (u as any).image || ''
  }
  s = (typeof s === 'string' ? s : '').trim()
  if (!s) return ''
  if (/^(https?:|data:|blob:)/i.test(s)) return s
  return `${assetBase}/${fixPath(s)}`
}
const onErr = (e: any) => {
  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="20">No image</text></svg>'
}
</script>

<template>
  <div class="carousel" :class="{ 'carousel--multi': isCarousel }" dir="rtl">
    <ClientOnly>
      <Swiper
        class="hero-swiper"
        :modules="modules"
        :navigation="isCarousel"
        :pagination="!isCarousel"
        :loop="false"
        :slides-per-view="isCarousel ? 3 : 1"
        :spaceBetween="isCarousel ? 18 : 12"
        :dir="'rtl'"
        :breakpoints="isCarousel ? carouselBreakpoints : undefined"
      >
        <SwiperSlide v-for="(b,i) in banners" :key="b?.id || i">
          <div :class="['slide', { 'slide--multi': isCarousel }]">
            <a v-if="b?.url && b?.url !== '#'" :href="b.url" target="_blank" class="banner-link">
              <img :src="toSrc(b?.photo_full_url || b?.image_full_url || b?.image || b?.photo)" :alt="b?.title || 'Banner'" @error="onErr" />
              <div v-if="b?.title" class="caption" :class="{ 'caption--multi': isCarousel }">
                <span>{{ b.title }}</span>
                <p v-if="isCarousel && b?.subtitle" class="caption-subtitle">{{ b.subtitle }}</p>
              </div>
            </a>
            <template v-else>
              <img :src="toSrc(b?.photo_full_url || b?.image_full_url || b?.image || b?.photo)" :alt="b?.title || 'Banner'" @error="onErr" />
              <div v-if="b?.title" class="caption" :class="{ 'caption--multi': isCarousel }">
                <span>{{ b.title }}</span>
                <p v-if="isCarousel && b?.subtitle" class="caption-subtitle">{{ b.subtitle }}</p>
              </div>
            </template>
          </div>
        </SwiperSlide>
      </Swiper>
    </ClientOnly>
  </div>
  
</template>

<style scoped>
.carousel { position: relative }
.carousel--multi .hero-swiper { padding: 20px 0 40px }
.hero-swiper { --swiper-navigation-color:#111827; --swiper-theme-color:#111827 }
.slide { position:relative; transition: transform .3s ease, box-shadow .3s ease }
.slide:hover { transform: translateY(-4px); box-shadow:0 15px 35px rgba(0,0,0,.1) }
.slide--multi img { height: 260px }
img { width:100%; height:auto; object-fit:cover; border-radius:18px; border:1px solid rgba(255,255,255,.15) }
.caption { position:absolute; left:12px; bottom:12px; background:rgba(0,0,0,.45); color:#fff; padding:6px 10px; border-radius:8px; font-size:12px; display:inline-flex; flex-direction:column; gap:4px }
.caption--multi { left:20px; right:20px; bottom:20px; padding:16px; border-radius:14px; font-size:16px; line-height:1.4; background:linear-gradient(135deg, rgba(17,24,39,.9), rgba(59,130,246,.65)) }
.caption-subtitle { margin:0; font-size:14px; opacity:.8 }
.hero-swiper :deep(.swiper-button-prev),
.hero-swiper :deep(.swiper-button-next){ width:36px; height:36px; border-radius:999px; background:#fff; color:#111827; border:1px solid #e5e7eb; box-shadow:0 4px 14px rgba(0,0,0,.08) }
.hero-swiper :deep(.swiper-button-prev)::after,
.hero-swiper :deep(.swiper-button-next)::after{ font-size:14px }
.banner-link { display:block; text-decoration:none; color:inherit }
.banner-link img { display:block }
@media (max-width: 768px) {
  .slide--multi img {
    height: 340px
  }
}
@media (min-width: 900px){ img { height: 500px } }
</style>
