<script setup lang="ts">
import { computed } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'
import { useI18n } from 'vue-i18n'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const props = defineProps<{ categories: any[] }>()
const { locale } = useI18n()

// Swiper modules
const swiperModules = [Navigation, Pagination, Autoplay]

// Check if current locale is RTL
const isRTL = computed(() => locale.value === 'ar')

// Helper function to get localized path with proper i18n handling
const getLocalizedPath = (path: string): string => {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  
  // Get current locale from i18n
  const currentLocale = locale.value || 'ar'
  
  // If English locale, add /en prefix
  if (currentLocale === 'en') {
    // Don't add prefix if already present
    if (cleanPath.startsWith('/en')) {
      return cleanPath
    }
    // Add /en prefix
    return `/en${cleanPath}`
  }
  
  // For Arabic (default), remove /en prefix if present
  if (cleanPath.startsWith('/en')) {
    return cleanPath.substring(3) || '/'
  }
  
  return cleanPath
}

const toLink = (c: any) => {
  const id = c?.id || c?.category_id
  if (!id) return null
  
  // Create shop link with category query parameter
  const shopPath = `/shop?category=${encodeURIComponent(String(id))}`
  
  // Apply i18n localization
  return getLocalizedPath(shopPath)
}

const cfg = useRuntimeConfig() as any
const assetBase = (cfg?.public?.apiBase || '').replace(/\/api(?:\/v\d+)?$/, '')
const fixPath = (s: string) => {
  let p = s.trim().replace(/\\/g, '/').replace(/^public\//, '').replace(/^app\/public\//, 'storage/')
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
  e.target.style.display = 'none'
}
</script>

<template>
  <div class="category-slider" :class="{ 'rtl-mode': isRTL }">
    <Swiper
      :modules="swiperModules"
      :slides-per-view="6"
      :space-between="15"
      :navigation="true"
      :loop="categories.length > 6"
      :rtl="isRTL"
      :key="locale"
      :breakpoints="{
        320: { slidesPerView: 2, spaceBetween: 10 },
        640: { slidesPerView: 3, spaceBetween: 10 },
        768: { slidesPerView: 4, spaceBetween: 15 },
        1024: { slidesPerView: 5, spaceBetween: 15 },
        1200: { slidesPerView: 6, spaceBetween: 15 }
      }"
      class="categories-swiper"
    >
      <SwiperSlide v-for="c in categories" :key="c.id || c.slug">
        <template v-if="toLink(c)">
          <NuxtLink :to="toLink(c)" class="pill">
            <div class="pill-content">
              <img v-if="c.icon_full_url" :src="toSrc(c.icon_full_url)" :alt="c.name" @error="onErr" class="category-icon" />
              <span class="category-name">{{ c.name }}</span>
            </div>
          </NuxtLink>
        </template>
        <div v-else class="pill disabled">
          <div class="pill-content">
            <img v-if="c.icon_full_url" :src="toSrc(c.icon_full_url)" :alt="c.name" @error="onErr" class="category-icon" />
            <span class="category-name">{{ c.name }}</span>
          </div>
        </div>
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<style scoped>
.category-slider {
  padding: 1rem 0;
  position: relative;
  width: 100%;
}

.categories-swiper {
  width: 100%;
  height: 100%;
  padding: 0 50px;
}

.categories-swiper :deep(.swiper-slide) {
  height: auto;
  display: flex;
  align-items: stretch;
}
html[dir="rtl"] .categories-swiper :deep(.swiper-button-prev){ right: 10px !important; left: auto !important; }
html[dir="rtl"] .categories-swiper :deep(.swiper-button-next){ left: 10px !important; right: auto !important; }
html[dir="ltr"] .categories-swiper :deep(.swiper-button-prev){ left: 10px !important; right: auto !important; }
html[dir="ltr"] .categories-swiper :deep(.swiper-button-next){ right: 10px !important; left: auto !important; }
/* Navigation arrows styling */
.categories-swiper :deep(.swiper-button-prev),
.categories-swiper :deep(.swiper-button-next) {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  color: #333;
}

.categories-swiper :deep(.swiper-button-prev:hover),
.categories-swiper :deep(.swiper-button-next:hover) {
  background: #f8f9fa;
  transform: translateY(-50%) scale(1.1);
}




.categories-swiper :deep(.swiper-button-prev::after),
.categories-swiper :deep(.swiper-button-next::after) {
  content: '';
  width: 12px;
  height: 12px;
  border: 2px solid #333;
  border-top: none;
  border-right: none;
}

/* LTR (English) - Default arrows */
.category-slider:not(.rtl-mode) .categories-swiper :deep(.swiper-button-prev::after) {
  transform: rotate(45deg);
}

.category-slider:not(.rtl-mode) .categories-swiper :deep(.swiper-button-next::after) {
  transform: rotate(-135deg);
}

/* RTL (Arabic) - Reversed arrows */
.category-slider.rtl-mode .categories-swiper :deep(.swiper-button-prev::after) {
  transform: rotate(-135deg);
}

.category-slider.rtl-mode .categories-swiper :deep(.swiper-button-next::after) {
  transform: rotate(45deg);
}

.categories-swiper :deep(.swiper-button-disabled) {
  opacity: 0.35;
  cursor: not-allowed;
}

.pill {
  padding: 0;
  border-radius: 12px;
  color: #374151;
  text-decoration: none;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: pointer;
}

.pill:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.pill.disabled {
  opacity: 0.6;
  cursor: default;
}

.pill.disabled:hover {
  transform: none;
  box-shadow: none;
}

.pill-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  width: 100%;
  text-align: center;
}

.category-icon {
  width: 100px;
  height: 100px;
  object-fit: cover;
  display: block;
  border-radius: 50%;
  transition: transform 0.3s ease;
}

.pill:hover .category-icon {
  transform: scale(1.05);
}

.category-name {
  font-size: 20px;
  font-weight: 500;
  line-height: 1.2;
  color: #374151;
  word-break: break-word;
}

/* Responsive */
@media (max-width: 768px) {
  .categories-swiper {
    padding: 0 40px;
  }
  
  .categories-swiper :deep(.swiper-button-prev),
  .categories-swiper :deep(.swiper-button-next) {
    width: 32px;
    height: 32px;
  }
  
  .categories-swiper :deep(.swiper-button-prev::after),
  .categories-swiper :deep(.swiper-button-next::after) {
    width: 10px;
    height: 10px;
  }
  
  .pill-content {
    padding: 12px 8px;
    gap: 6px;
  }
  
  .category-icon {
    width: 80px;
    height: 80px;
  }
  
  .category-name {
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .categories-swiper {
    padding: 0 30px;
  }
  
  .categories-swiper :deep(.swiper-button-prev),
  .categories-swiper :deep(.swiper-button-next) {
    width: 28px;
    height: 28px;
  }
  
  .category-icon {
    width: 70px;
    height: 70px;
  }
  
  .category-name {
    font-size: 14px;
  }
}
</style>
