# Snapchat Pixel Integration Examples

## Product Page Example

```vue
<template>
  <div class="product-page">
    <h1>{{ product.name }}</h1>
    <p>السعر: {{ product.price }} ر.س</p>
    <button @click="addToCart">أضف إلى السلة</button>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSnapchatProduct } from '~/composables/useSnapchatProduct'

const { trackView, trackAddToCartFromProduct } = useSnapchatProduct()

const product = ref({
  id: 123,
  name: 'منتج رائع',
  price: 299.99,
  category: 'ملابس',
  sku: 'PROD-123'
})

// Track product view on mount
onMounted(() => {
  trackView(product.value)
})

// Track add to cart
const addToCart = () => {
  trackAddToCartFromProduct(product.value, 1)
  // Add to cart logic...
}
</script>
```

## Cart Page Example

```vue
<template>
  <div class="cart-page">
    <h1>سلتك</h1>
    <div v-for="item in cartItems" :key="item.id" class="cart-item">
      <h3>{{ item.name }}</h3>
      <p>{{ item.price }} ر.س</p>
      <button @click="removeItem(item.id)">إزالة</button>
    </div>
    <button @click="goToCheckout">متابعة الشراء</button>
  </div>
</template>

<script setup lang="ts">
import { useSnapchatCart } from '~/composables/useSnapchatCart'
import { useCart } from '~/composables/useCart'

const { watchCartChanges, trackCheckout } = useSnapchatCart()
const { items: cartItems, remove } = useCart()

// Watch for cart changes
onMounted(() => {
  watchCartChanges()
})

const removeItem = (itemId: number) => {
  remove(itemId)
}

const goToCheckout = async () => {
  await trackCheckout()
  // Navigate to checkout...
}
</script>
```

## Checkout Page Example

```vue
<template>
  <div class="checkout-page">
    <h1>الدفع</h1>
    <div class="order-summary">
      <p>الإجمالي: {{ orderTotal }} ر.س</p>
    </div>
    <form @submit.prevent="completeOrder">
      <input v-model="paymentMethod" type="text" placeholder="طريقة الدفع" />
      <button type="submit">إتمام الطلب</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSnapchatCheckout } from '~/composables/useSnapchatCheckout'
import { useCart } from '~/composables/useCart'

const { trackCheckoutView, trackPurchase } = useSnapchatCheckout()
const { items: cartItems } = useCart()
const paymentMethod = ref('')

const orderTotal = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
})

// Track checkout view on mount
onMounted(() => {
  trackCheckoutView({
    total: orderTotal.value,
    items: cartItems.value
  })
})

const completeOrder = async () => {
  const order = {
    id: 'ORDER-' + Date.now(),
    total: orderTotal.value,
    items: cartItems.value,
    payment_method: paymentMethod.value
  }

  // Track purchase
  trackPurchase(order)

  // Submit order...
}
</script>
```

## Search Page Example

```vue
<template>
  <div class="search-page">
    <input 
      v-model="searchQuery" 
      @input="handleSearch"
      placeholder="ابحث عن منتجات..."
    />
    <div v-for="product in results" :key="product.id" class="product-card">
      <h3>{{ product.name }}</h3>
      <p>{{ product.price }} ر.س</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSnapchatEvents } from '~/composables/useSnapchatEvents'

const { trackSearch } = useSnapchatEvents()
const searchQuery = ref('')
const results = ref([])

const handleSearch = async (event: Event) => {
  const query = (event.target as HTMLInputElement).value
  
  // Track search event
  if (query.length > 2) {
    trackSearch(query)
  }

  // Fetch results...
}
</script>
```

## User Authentication Example

```vue
<template>
  <div class="auth-page">
    <form @submit.prevent="handleSignUp">
      <input v-model="email" type="email" placeholder="البريد الإلكتروني" />
      <input v-model="phone" type="tel" placeholder="رقم الهاتف" />
      <button type="submit">إنشاء حساب</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSnapchatEvents } from '~/composables/useSnapchatEvents'

const { trackSignUp, trackLogin } = useSnapchatEvents()
const email = ref('')
const phone = ref('')

const handleSignUp = async () => {
  // Track signup
  trackSignUp({
    email: email.value,
    phone: phone.value
  })

  // Create account...
}

const handleLogin = async (credentials: any) => {
  // Track login
  trackLogin({
    email: credentials.email
  })

  // Authenticate...
}
</script>
```

## Manual Event Tracking

```typescript
import { useSnapchatPixel } from '~/composables/useSnapchatPixel'

const { track } = useSnapchatPixel()

// Track custom event
track('CUSTOM_EVENT', {
  custom_param: 'value',
  currency: 'SAR'
})

// Track with DataLayer
window.pushToDataLayer('CUSTOM_EVENT', {
  custom_param: 'value',
  currency: 'SAR'
})
```

## Accessing DataLayer

```typescript
// Get all tracked events
console.log(window.dataLayer)

// Filter events by type
const purchaseEvents = window.dataLayer.filter(e => e.event === 'PURCHASE')

// Get last event
const lastEvent = window.dataLayer[window.dataLayer.length - 1]
```

## Testing in Development

```typescript
// Enable debug logging
if (process.env.NODE_ENV === 'development') {
  console.log('DataLayer:', window.dataLayer)
  console.log('Snaptr initialized:', !!window.snaptr)
}

// Verify Pixel ID
console.log('Pixel ID:', 'f607062b-c823-407a-9f93-1dc2542be238')

// Check currency
console.log('Currency:', 'SAR')
```
