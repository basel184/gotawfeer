# 💄 دليل استخدام Makeup Virtual Try-On مع Nuxt.js

## 📋 نظرة عامة

هذا الدليل يوضح كيفية استخدام APIs التجربة الافتراضية للمكياج في تطبيق Nuxt.js 3.

---

## 🚀 الإعداد الأولي

### 1. تثبيت المكتبات المطلوبة

```bash
# إنشاء مشروع Nuxt 3 جديد
npx nuxi@latest init gotawfeer-makeup

cd gotawfeer-makeup

# تثبيت المكتبات
npm install @pinia/nuxt
npm install @nuxtjs/tailwindcss
npm install @vueuse/core
npm install lucide-vue-next
```

### 2. إعداد `nuxt.config.ts` 

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss'
  ],

  runtimeConfig: {
    public: {
      apiBase: 'https://admin.gotawfeer.com/api/v1'
    }
  },

  app: {
    head: {
      title: 'Gotawfeer - التجربة الافتراضية للمكياج',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'جربي المكياج افتراضياً قبل الشراء' }
      ]
    }
  }
})
```

---

## 📁 هيكل المشروع

```
gotawfeer-makeup/
├── composables/
│   └── useMakeupApi.ts          # API calls
├── stores/
│   └── makeup.ts                # Pinia store
├── components/
│   ├── MakeupCategoryCard.vue   # بطاقة الفئة
│   ├── MakeupProductCard.vue    # بطاقة المنتج
│   ├── MakeupColorPicker.vue    # اختيار اللون
│   └── MakeupSearch.vue         # البحث
├── pages/
│   ├── index.vue                # الصفحة الرئيسية
│   ├── makeup/
│   │   ├── index.vue            # صفحة المكياج
│   │   ├── [category].vue       # منتجات الفئة
│   │   └── product/
│   │       └── [id].vue         # تفاصيل المنتج
│   └── virtual-try-on/
│       └── [id].vue             # صفحة التجربة
└── types/
    └── makeup.ts                # TypeScript types
```

---

## 🎯 1. إنشاء Types

```typescript
// types/makeup.ts
export interface MakeupColor {
  id: number | null
  name: string
  code: string | null
  hex_code: string | null
}

export interface MakeupVariation {
  id: number | null
  type: string
  price: number | null
  qty: number
  in_stock: boolean
}

export interface MakeupBrand {
  id: number
  name: string
  image: string | null
}

export interface MakeupCategory {
  id: number
  name: string
}

export interface MakeupProduct {
  id: number
  name: string
  slug: string
  thumbnail: string | null
  images: string[]
  price: number
  discount: number
  discount_type: string
  final_price: number
  brand: MakeupBrand
  category: MakeupCategory
  sub_category: MakeupCategory
  colors: MakeupColor[]
  variations: MakeupVariation[]
  has_colors: boolean
  has_variations: boolean
  supports_virtual_try_on: boolean
  rating: number
  reviews_count: number
  description?: string
  all_images?: string[]
  reviews?: any[]
  makeup_type?: string
  makeup_category?: any
}

export interface MakeupCategoryInfo {
  category_id: number
  sub_category_ids: number[]
  name: string
  name_en: string
  type: 'face' | 'lips' | 'eyes'
}

export interface MakeupApiResponse<T> {
  success: boolean
  data: T
  total?: number
  limit?: number
  offset?: number
  message?: string
}
```

---

## 🔌 2. إنشاء Composable للـ API

```typescript
// composables/useMakeupApi.ts
import type { 
  MakeupProduct, 
  MakeupCategoryInfo, 
  MakeupApiResponse 
} from '~/types/makeup'

export const useMakeupApi = () => {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase

  // جلب الفئات المدعومة
  const getSupportedCategories = async () => {
    const { data, error } = await useFetch<MakeupApiResponse<Record<string, MakeupCategoryInfo>>>(
      `${baseURL}/makeup-virtual-try-on/supported-categories` 
    )

    if (error.value) {
      throw new Error('Failed to fetch categories')
    }

    return data.value
  }

  // جلب منتجات المكياج
  const getMakeupProducts = async (params: {
    makeup_type?: string
    category_id?: number
    sub_category_id?: number
    limit?: number
    offset?: number
  } = {}) => {
    const query = new URLSearchParams()
    
    if (params.makeup_type) query.append('makeup_type', params.makeup_type)
    if (params.category_id) query.append('category_id', params.category_id.toString())
    if (params.sub_category_id) query.append('sub_category_id', params.sub_category_id.toString())
    if (params.limit) query.append('limit', params.limit.toString())
    if (params.offset) query.append('offset', params.offset.toString())

    const { data, error } = await useFetch<MakeupApiResponse<MakeupProduct[]>>(
      `${baseURL}/makeup-virtual-try-on/products?${query.toString()}` 
    )

    if (error.value) {
      throw new Error('Failed to fetch products')
    }

    return data.value
  }

  // جلب تفاصيل منتج
  const getProductDetails = async (productId: number) => {
    const { data, error } = await useFetch<MakeupApiResponse<MakeupProduct>>(
      `${baseURL}/makeup-virtual-try-on/products/${productId}` 
    )

    if (error.value) {
      throw new Error('Failed to fetch product details')
    }

    return data.value
  }

  // البحث عن منتجات
  const searchProducts = async (query: string, makeup_type?: string, limit: number = 20) => {
    const params = new URLSearchParams()
    params.append('query', query)
    if (makeup_type) params.append('makeup_type', makeup_type)
    params.append('limit', limit.toString())

    const { data, error } = await useFetch<MakeupApiResponse<MakeupProduct[]>>(
      `${baseURL}/makeup-virtual-try-on/search?${params.toString()}` 
    )

    if (error.value) {
      throw new Error('Failed to search products')
    }

    return data.value
  }

  return {
    getSupportedCategories,
    getMakeupProducts,
    getProductDetails,
    searchProducts
  }
}
```

---

## 🗄️ 3. إنشاء Pinia Store

```typescript
// stores/makeup.ts
import { defineStore } from 'pinia'
import type { MakeupProduct, MakeupCategoryInfo } from '~/types/makeup'

export const useMakeupStore = defineStore('makeup', {
  state: () => ({
    categories: {} as Record<string, MakeupCategoryInfo>,
    products: [] as MakeupProduct[],
    selectedCategory: null as string | null,
    selectedProduct: null as MakeupProduct | null,
    isLoading: false,
    searchQuery: '',
    favorites: [] as number[],
    cart: [] as { product: MakeupProduct; color: string; variation: string }[]
  }),

  getters: {
    // المنتجات المفضلة
    favoriteProducts: (state) => {
      return state.products.filter(p => state.favorites.includes(p.id))
    },

    // عدد المنتجات في السلة
    cartCount: (state) => state.cart.length,

    // إجمالي السلة
    cartTotal: (state) => {
      return state.cart.reduce((total, item) => total + item.product.final_price, 0)
    },

    // الفئات حسب النوع
    categoriesByType: (state) => {
      const byType: Record<string, MakeupCategoryInfo[]> = {
        face: [],
        lips: [],
        eyes: []
      }

      Object.values(state.categories).forEach(cat => {
        byType[cat.type].push(cat)
      })

      return byType
    }
  },

  actions: {
    // تحميل الفئات
    async loadCategories() {
      this.isLoading = true
      try {
        const api = useMakeupApi()
        const response = await api.getSupportedCategories()
        if (response?.success) {
          this.categories = response.data
        }
      } catch (error) {
        console.error('Failed to load categories:', error)
      } finally {
        this.isLoading = false
      }
    },

    // تحميل المنتجات
    async loadProducts(params?: any) {
      this.isLoading = true
      try {
        const api = useMakeupApi()
        const response = await api.getMakeupProducts(params)
        if (response?.success) {
          this.products = response.data
        }
      } catch (error) {
        console.error('Failed to load products:', error)
      } finally {
        this.isLoading = false
      }
    },

    // تحميل تفاصيل منتج
    async loadProductDetails(productId: number) {
      this.isLoading = true
      try {
        const api = useMakeupApi()
        const response = await api.getProductDetails(productId)
        if (response?.success) {
          this.selectedProduct = response.data
        }
      } catch (error) {
        console.error('Failed to load product details:', error)
      } finally {
        this.isLoading = false
      }
    },

    // البحث
    async search(query: string, makeup_type?: string) {
      this.searchQuery = query
      this.isLoading = true
      try {
        const api = useMakeupApi()
        const response = await api.searchProducts(query, makeup_type)
        if (response?.success) {
          this.products = response.data
        }
      } catch (error) {
        console.error('Failed to search:', error)
      } finally {
        this.isLoading = false
      }
    },

    // إضافة/إزالة من المفضلة
    toggleFavorite(productId: number) {
      const index = this.favorites.indexOf(productId)
      if (index > -1) {
        this.favorites.splice(index, 1)
      } else {
        this.favorites.push(productId)
      }
      // حفظ في localStorage
      if (process.client) {
        localStorage.setItem('makeup_favorites', JSON.stringify(this.favorites))
      }
    },

    // إضافة للسلة
    addToCart(product: MakeupProduct, color: string, variation: string) {
      this.cart.push({ product, color, variation })
      // حفظ في localStorage
      if (process.client) {
        localStorage.setItem('makeup_cart', JSON.stringify(this.cart))
      }
    },

    // إزالة من السلة
    removeFromCart(index: number) {
      this.cart.splice(index, 1)
      if (process.client) {
        localStorage.setItem('makeup_cart', JSON.stringify(this.cart))
      }
    },

    // تحميل من localStorage
    loadFromStorage() {
      if (process.client) {
        const favorites = localStorage.getItem('makeup_favorites')
        if (favorites) {
          this.favorites = JSON.parse(favorites)
        }

        const cart = localStorage.getItem('makeup_cart')
        if (cart) {
          this.cart = JSON.parse(cart)
        }
      }
    }
  }
})
```

---

## 🎨 4. Components

### بطاقة الفئة

```vue
<!-- components/MakeupCategoryCard.vue -->
<template>
  <NuxtLink
    :to="`/makeup/${categoryKey}`"
    class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 p-6 transition-all hover:shadow-xl hover:scale-105"
  >
    <div class="flex flex-col items-center text-center space-y-4">
      <!-- أيقونة -->
      <div class="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center group-hover:bg-pink-500 transition-colors">
        <component :is="categoryIcon" class="w-8 h-8 text-pink-500 group-hover:text-white transition-colors" />
      </div>

      <!-- الاسم -->
      <div>
        <h3 class="text-lg font-bold text-gray-800">{{ category.name }}</h3>
        <p class="text-sm text-gray-500">{{ category.name_en }}</p>
      </div>

      <!-- عدد المنتجات -->
      <div v-if="productCount" class="text-xs text-gray-400">
        {{ productCount }} منتج
      </div>
    </div>

    <!-- Badge للنوع -->
    <div class="absolute top-2 right-2">
      <span class="px-2 py-1 text-xs rounded-full bg-white/80 text-gray-600">
        {{ typeLabel }}
      </span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { Sparkles, Heart, Eye } from 'lucide-vue-next'
import type { MakeupCategoryInfo } from '~/types/makeup'

const props = defineProps<{
  categoryKey: string
  category: MakeupCategoryInfo
  productCount?: number
}>()

const categoryIcon = computed(() => {
  switch (props.category.type) {
    case 'face':
      return Sparkles
    case 'lips':
      return Heart
    case 'eyes':
      return Eye
    default:
      return Sparkles
  }
})

const typeLabel = computed(() => {
  switch (props.category.type) {
    case 'face':
      return 'الوجه'
    case 'lips':
      return 'الشفاه'
    case 'eyes':
      return 'العيون'
    default:
      return ''
  }
})
</script>
```

---

### بطاقة المنتج

```vue
<!-- components/MakeupProductCard.vue -->
<template>
  <div class="group relative bg-white rounded-2xl shadow-md overflow-hidden transition-all hover:shadow-2xl">
    <!-- صورة المنتج -->
    <div class="relative aspect-square overflow-hidden bg-gray-100">
      <img
        :src="product.thumbnail || '/images/placeholder.svg'"
        :alt="product.name"
        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        @error="handleImageError"
      />

      <!-- Badge الخصم -->
      <div v-if="product.discount > 0" class="absolute top-2 left-2">
        <span class="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
          -{{ product.discount_type === 'percent' ? `${product.discount}%` : `${product.discount} ر.س` }}
        </span>
      </div>

      <!-- زر المفضلة -->
      <button
        @click.prevent="toggleFavorite"
        class="absolute top-2 right-2 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
      >
        <Heart
          :class="[
            'w-5 h-5 transition-colors',
            isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
          ]"
        />
      </button>

      <!-- Badge التجربة الافتراضية -->
      <div v-if="product.supports_virtual_try_on" class="absolute bottom-2 left-2">
        <span class="px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
          <Camera class="w-3 h-3" />
          جربي افتراضياً
        </span>
      </div>
    </div>

    <!-- معلومات المنتج -->
    <div class="p-4 space-y-3">
      <!-- العلامة التجارية -->
      <div class="text-xs text-gray-500">
        {{ product.brand.name }}
      </div>

      <!-- اسم المنتج -->
      <h3 class="font-bold text-gray-800 line-clamp-2 min-h-[2.5rem]">
        {{ product.name }}
      </h3>

      <!-- التقييم -->
      <div class="flex items-center gap-2">
        <div class="flex items-center">
          <Star class="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span class="text-sm font-medium text-gray-700 mr-1">{{ product.rating.toFixed(1) }}</span>
        </div>
        <span class="text-xs text-gray-400">({{ product.reviews_count }})</span>
      </div>

      <!-- الألوان -->
      <div v-if="product.has_colors && product.colors.length > 0" class="flex items-center gap-1">
        <div
          v-for="(color, index) in product.colors.slice(0, 5)"
          :key="index"
          class="w-6 h-6 rounded-full border-2 border-white shadow-sm"
          :style="{ backgroundColor: color.hex_code || '#ccc' }"
          :title="color.name"
        />
        <span v-if="product.colors.length > 5" class="text-xs text-gray-400">
          +{{ product.colors.length - 5 }}
        </span>
      </div>

      <!-- السعر -->
      <div class="flex items-baseline gap-2">
        <span class="text-xl font-bold text-pink-600">
          {{ product.final_price.toFixed(2) }} ر.س
        </span>
        <span v-if="product.discount > 0" class="text-sm text-gray-400 line-through">
          {{ product.price.toFixed(2) }} ر.س
        </span>
      </div>

      <!-- الأزرار -->
      <div class="flex gap-2">
        <NuxtLink
          :to="`/makeup/product/${product.id}`"
          class="flex-1 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg text-center font-medium hover:bg-gray-200 transition-colors"
        >
          التفاصيل
        </NuxtLink>
        
        <button
          v-if="product.supports_virtual_try_on"
          @click="startVirtualTryOn"
          class="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
        >
          <Camera class="w-4 h-4" />
          جربي
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Heart, Star, Camera } from 'lucide-vue-next'
import type { MakeupProduct } from '~/types/makeup'

const props = defineProps<{
  product: MakeupProduct
}>()

const makeupStore = useMakeupStore()
const router = useRouter()

const isFavorite = computed(() => {
  return makeupStore.favorites.includes(props.product.id)
})

const toggleFavorite = () => {
  makeupStore.toggleFavorite(props.product.id)
}

const startVirtualTryOn = () => {
  router.push(`/virtual-try-on/${props.product.id}`)
}

const handleImageError = (e: Event) => {
  (e.target as HTMLImageElement).src = '/images/placeholder.svg'
}
</script>
```

---

## 📄 5. الصفحات

### الصفحة الرئيسية

```vue
<!-- pages/index.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
    <!-- Hero Section -->
    <section class="container mx-auto px-4 py-16">
      <div class="text-center space-y-6 max-w-3xl mx-auto">
        <h1 class="text-5xl md:text-6xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
          جربي المكياج افتراضياً
        </h1>
        <p class="text-xl text-gray-600">
          اكتشفي أجمل منتجات المكياج وجربيها افتراضياً قبل الشراء
        </p>
        
        <!-- البحث -->
        <div class="max-w-2xl mx-auto">
          <MakeupSearch />
        </div>

        <!-- أزرار سريعة -->
        <div class="flex flex-wrap justify-center gap-4">
          <NuxtLink
            to="/makeup"
            class="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-medium hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
          >
            تصفح المنتجات
          </NuxtLink>
          <NuxtLink
            to="/virtual-try-on"
            class="px-8 py-3 bg-white text-gray-800 rounded-full font-medium hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl"
          >
            ابدأي التجربة
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- الفئات -->
    <section class="container mx-auto px-4 py-16">
      <h2 class="text-3xl font-bold text-center mb-12">تصفح حسب الفئة</h2>
      
      <div v-if="isLoading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div v-for="i in 10" :key="i" class="h-48 bg-gray-200 rounded-2xl animate-pulse" />
      </div>

      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <MakeupCategoryCard
          v-for="(category, key) in categories"
          :key="key"
          :category-key="key"
          :category="category"
        />
      </div>
    </section>

    <!-- منتجات مميزة -->
    <section class="container mx-auto px-4 py-16">
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-3xl font-bold">منتجات مميزة</h2>
        <NuxtLink to="/makeup" class="text-pink-600 hover:text-pink-700 font-medium">
          عرض الكل ←
        </NuxtLink>
      </div>

      <div v-if="isLoadingProducts" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div v-for="i in 8" :key="i" class="h-96 bg-gray-200 rounded-2xl animate-pulse" />
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <MakeupProductCard
          v-for="product in featuredProducts"
          :key="product.id"
          :product="product"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const makeupStore = useMakeupStore()

const categories = computed(() => makeupStore.categories)
const featuredProducts = computed(() => makeupStore.products.slice(0, 8))
const isLoading = computed(() => makeupStore.isLoading)
const isLoadingProducts = ref(true)

onMounted(async () => {
  makeupStore.loadFromStorage()
  await makeupStore.loadCategories()
  
  // تحميل منتجات مميزة
  await makeupStore.loadProducts({ limit: 8 })
  isLoadingProducts.value = false
})

useHead({
  title: 'Gotawfeer - التجربة الافتراضية للمكياج',
  meta: [
    { name: 'description', content: 'جربي المكياج افتراضياً قبل الشراء' }
  ]
})
</script>
```

---

## 🔗 الروابط المرتبطة

- صفحة المنتج: `/product/[slug]`
- صفحة التجربة الافتراضية: `/virtual-try-on/makeup`
- لوحة التحكم: `/admin/products`

---

## 📞 الدعم الفني

إذا واجهت أي مشاكل:
1. تأكد من أن الفئة الفرعية صحيحة
2. تحقق من صيغة كود اللون (يجب أن تكون #RRGGBB)
3. تأكد من أن الكمية > 0
4. امسح ذاكرة التخزين المؤقت وأعد تحميل الصفحة

---

## 📈 الفوائد

- ✅ تحسين تجربة المستخدم
- ✅ زيادة معدل التحويل
- ✅ تقليل معدل الإرجاع
- ✅ زيادة الثقة في الشراء
- ✅ تمييز المنتجات عن المنافسين
