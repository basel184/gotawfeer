<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ categories: any[] }>()

const toLink = (c: any) => {
  const id = c?.id || c?.category_id
  const slug = c?.slug || c?.category_slug
  if (slug) return `/category/${encodeURIComponent(String(slug))}`
  if (id) return `/category/${encodeURIComponent(String(id))}`
  return null
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

// Slider functionality
const sliderRef = ref<HTMLElement>()
const scrollPosition = ref(0)
const canScrollLeft = ref(false)
const canScrollRight = ref(true)

const checkScrollButtons = () => {
  if (!sliderRef.value) return
  
  const { scrollLeft, scrollWidth, clientWidth } = sliderRef.value
  canScrollLeft.value = scrollLeft > 0
  canScrollRight.value = scrollLeft < scrollWidth - clientWidth - 1
}

const scrollLeft = () => {
  if (!sliderRef.value) return
  sliderRef.value.scrollBy({ left: -200, behavior: 'smooth' })
}

const scrollRight = () => {
  if (!sliderRef.value) return
  sliderRef.value.scrollBy({ left: 200, behavior: 'smooth' })
}

onMounted(() => {
  checkScrollButtons()
  if (sliderRef.value) {
    sliderRef.value.addEventListener('scroll', checkScrollButtons)
  }
})

onUnmounted(() => {
  if (sliderRef.value) {
    sliderRef.value.removeEventListener('scroll', checkScrollButtons)
  }
})
</script>

<template>
  <div class="category-slider">
    <!-- Categories container -->
    <div class="pills-container" ref="sliderRef">
      <div class="pills">
        <template v-for="c in categories" :key="c.id || c.slug">
          <NuxtLink v-if="toLink(c)" class="pill" :to="toLink(c)">
            <div class="pill-content">
              <img v-if="c.icon_full_url" :src="toSrc(c.icon_full_url)" :alt="c.name" @error="onErr" class="category-icon" />
              <span class="category-name">{{ c.name }}</span>
            </div>
          </NuxtLink>
          <span v-else class="pill disabled">
            <div class="pill-content">
              <img v-if="c.icon_full_url" :src="toSrc(c.icon_full_url)" :alt="c.name" @error="onErr" class="category-icon" />
              <span class="category-name">{{ c.name }}</span>
            </div>
          </span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-slider {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.scroll-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  color: #6b7280;
}

.scroll-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.scroll-left {
  left: -18px;
}

.scroll-right {
  right: -18px;
}

.pills-container {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 4px 0;
}

.pills-container::-webkit-scrollbar {
  display: none;
}

.pills {
  display: flex;
  gap: 12px;
  min-width: max-content;
}

.pill {
  padding: 0;
  border-radius: 12px;
  color: #374151;
  text-decoration: none;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  min-width: 120px;
  flex-shrink: 0;
  overflow: hidden;
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
  .scroll-btn {
    width: 32px;
    height: 32px;
  }
  
  .scroll-left {
    left: -16px;
  }
  
  .scroll-right {
    right: -16px;
  }
  
  .pills {
    gap: 8px;
  }
  
  .pill {
    min-width: 100px;
  }
  
  .pill-content {
    padding: 12px 8px;
    gap: 6px;
  }
  
  .category-icon {
    width: 100px;
    height: 100px;
  }
  
  .category-name {
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .scroll-btn {
    display: none;
  }
  
  .pills-container {
    padding: 0;
  }
  
  .pills {
    padding: 0;
  }
}
</style>
