<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const props = defineProps<{ brands: any[] }>()

// Swiper modules
const swiperModules = [Navigation, Pagination, Autoplay]

const cfg = useRuntimeConfig() as any
const assetBase = (cfg?.public?.apiBase || 'https://gotawfeer.com/project/api').replace(/\/api(?:\/v\d+)?$/, '') + '/storage/app/public/brand/'

// Debug information
console.log('BrandCarousel - assetBase:', assetBase)
console.log('BrandCarousel - brands:', props.brands)

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
    // If it's just a filename, assume it's in storage/brand/
    p = `${p}`
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
    s = (u as any).path || (u as any).url || (u as any).image || (u as any).image_full_url || ''
  }
  
  s = (typeof s === 'string' ? s : '').trim()
  if (!s) return ''
  
  // If it's already a full URL, return as is
  if (/^(https?:|data:|blob:)/i.test(s)) return s
  
  // Fix the path
  const fixedPath = fixPath(s)
  const finalUrl = assetBase ? `${assetBase}/${fixedPath}` : `/${fixedPath}`
  
  // Debug information
  console.log('BrandCarousel - Original path:', s)
  console.log('BrandCarousel - Fixed path:', fixedPath)
  console.log('BrandCarousel - Final URL:', finalUrl)
  
  return finalUrl
}
const onErr = (e: any) => {
  console.warn('Brand image failed to load:', e.target.src)
  // Use a better fallback image
  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100%" height="100%" fill="%23f8f9fa" stroke="%23e9ecef" stroke-width="1"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236c757d" font-size="12" font-family="Arial, sans-serif">Brand</text></svg>'
}

// Helper function to get the best available image
const getBestImage = (brand: any) => {
  return brand?.image_full_url || brand?.logo_full_url || brand?.image || brand?.logo || ''
}

// Create brand link function (goes to shop with brand filter)
const toLink = (b: any) => {
  const id = b?.id || b?.brand_id
  if (id) return `/shop?brand=${encodeURIComponent(String(id))}`
  return null
}
</script>

<template>
  <div class="brands-container">
    <Swiper
      :modules="swiperModules"
      :slides-per-view="6"
      :space-between="15"
      :navigation="false"
      :loop="brands.length > 6"
      :breakpoints="{
        320: { slidesPerView: 2, spaceBetween: 10 },
        640: { slidesPerView: 3, spaceBetween: 10 },
        768: { slidesPerView: 4, spaceBetween: 15 },
        1024: { slidesPerView: 5, spaceBetween: 15 },
        1200: { slidesPerView: 6, spaceBetween: 15 }
      }"
      class="brands-swiper"
    >
      <SwiperSlide v-for="b in brands" :key="b.id">
        <template v-if="toLink(b)">
          <NuxtLink :to="toLink(b)" class="brand-card card h-100 border-0 text-decoration-none">
            <div class="card-body d-flex align-items-center justify-content-center p-3">
              <img 
                v-if="getBestImage(b)" 
                :src="toSrc(getBestImage(b))" 
                :alt="b.name || b.title || 'Brand'" 
                @load="() => console.log('Brand image loaded successfully:', toSrc(getBestImage(b)))"

                class="brand-image img-fluid" 
                loading="lazy"
              />
              <span v-else class="brand-name text-center fw-medium">{{ b.name || b.title || 'Brand' }}</span>
            </div>
          </NuxtLink>
        </template>
        <div v-else class="brand-card card h-100 border-0 shadow-sm disabled">
          <div class="card-body d-flex align-items-center justify-content-center p-3">
            <img 
              v-if="getBestImage(b)" 
              :src="toSrc(getBestImage(b))" 
              :alt="b.name || b.title || 'Brand'" 
              @load="() => console.log('Brand image loaded successfully:', toSrc(getBestImage(b)))"
              @error="onErr"
              class="brand-image img-fluid" 
              loading="lazy"
            />
            <span v-else class="brand-name text-center fw-medium">{{ b.name || b.title || 'Brand' }}</span>
          </div>
        </div>
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<style scoped>
.brands-container {
  padding: 1rem 0;
  position: relative;
}

.brands-swiper {
  width: 100%;
  height: 100%;
  padding: 0 50px;
}

.brands-swiper :deep(.swiper-slide) {
  height: auto;
  display: flex;
  align-items: stretch;
}

.brands-swiper :deep(.swiper-button-prev),
.brands-swiper :deep(.swiper-button-next) {
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

.brands-swiper :deep(.swiper-button-prev:hover),
.brands-swiper :deep(.swiper-button-next:hover) {
  background: #f8f9fa;
  transform: translateY(-50%) scale(1.1);
}

.brands-swiper :deep(.swiper-button-prev) {
  left: 10px;
}

.brands-swiper :deep(.swiper-button-next) {
  right: 10px;
}

.brands-swiper :deep(.swiper-button-prev::after),
.brands-swiper :deep(.swiper-button-next::after) {
  content: '';
  width: 12px;
  height: 12px;
  border: 2px solid #333;
  border-top: none;
  border-right: none;
  transform: rotate(45deg);
}

.brands-swiper :deep(.swiper-button-next::after) {
  transform: rotate(-135deg);
}

.brand-card {
  transition: all 0.3s ease;
  cursor: pointer;
  color: inherit;
  background: #00ffff00;
}
.brand-card .card-body {
  padding: 1rem;
}

.brand-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.brand-card.disabled {
  opacity: 0.6;
  cursor: default;
}

.brand-card.disabled:hover {
  transform: none;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075) !important;
}

.brand-image { 
  max-width: 100px; 
  max-height: 100px; 
  width: auto;
  height: auto;
  object-fit: contain; 
  display: block;
  transition: transform 0.3s ease;
  border-radius: 4px;
}

.brand-card:hover .brand-image {
  transform: scale(1.05);
}

.brand-name { 
  font-size: 0.875rem; 
  font-weight: 500;
  color: #6b7280;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .brand-image {
    max-width: 100px;
    max-height: 100px;
  }
  
  .brand-name {
    font-size: 0.75rem;
  }
}

/* Fallback for when no brands are available */
.brands-container:empty::before {
  content: "لا توجد علامات تجارية متاحة";
  display: block;
  text-align: center;
  color: #9ca3af;
  font-style: italic;
  padding: 2rem;
}
</style>
