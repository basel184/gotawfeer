# 🔧 إصلاح مشاكل Facebook Pixel - Add to Cart

## 🔴 المشاكل المحددة

### 1. مشكلة SPA (Single Page Application)
- الموقع مبني على Nuxt.js (SPA)
- عند التنقل بين الصفحات لا يتم إعادة تحميل الصفحة
- Facebook Pixel لا يسجل حدث "Add to Cart" تلقائياً

### 2. مشكلة Event Binding
- الإشارة (Signal) للبيكسل لا تُرسل عند الضغط على زر الإضافة
- البيكسل ينتظر رابط معين لكن الموقع يغير الرابط بدون إعادة تحميل

### 3. تكرار الروابط والمسارات
- وجود عدة مسارات لعملية إتمام الطلب مما يسبب التباس في البيكسل

---

## ✅ الحل المطبق

### 1. Event-Based Tracking
تم إنشاء composable محسّن `useFacebookPixelOptimized` يتتبع الأحداث مباشرة عند حدوثها:

```typescript
import { useFacebookPixelOptimized } from '~/composables/useFacebookPixelOptimized'

const fbPixel = useFacebookPixelOptimized()

// عند الضغط على زر "Add to Cart"
const addToCart = (product) => {
  fbPixel.trackAddToCart(product, quantity)
}
```

### 2. الأحداث المدعومة

| الحدث | الوصف |
|------|-------|
| `trackAddToCart` | إضافة إلى السلة (Event-Based) |
| `trackViewContent` | مشاهدة المنتج |
| `trackInitiateCheckout` | بدء الدفع |
| `trackPurchase` | إتمام الشراء |
| `trackSearch` | البحث |
| `trackCustomEvent` | حدث مخصص |

---

## 🚀 الاستخدام

### صفحة المنتج
```vue
<script setup>
import { useFacebookPixelOptimized } from '~/composables/useFacebookPixelOptimized'

const fbPixel = useFacebookPixelOptimized()

onMounted(() => {
  // تتبع مشاهدة المنتج
  fbPixel.trackViewContent(product.value)
})

const addToCart = () => {
  // تتبع إضافة إلى السلة مباشرة
  fbPixel.trackAddToCart(product.value, quantity.value)
  
  // ثم أضف إلى السلة
  cart.add(product.value, quantity.value)
}
</script>
```

### صفحة السلة
```vue
<script setup>
import { useFacebookPixelOptimized } from '~/composables/useFacebookPixelOptimized'

const fbPixel = useFacebookPixelOptimized()

const goToCheckout = () => {
  // تتبع بدء الدفع
  fbPixel.trackInitiateCheckout(cartData.value)
  
  // ثم انتقل إلى الدفع
  router.push('/checkout')
}
</script>
```

### صفحة النجاح (Thank You)
```vue
<script setup>
import { useFacebookPixelOptimized } from '~/composables/useFacebookPixelOptimized'

const fbPixel = useFacebookPixelOptimized()

onMounted(() => {
  // تتبع الشراء
  fbPixel.trackPurchase({
    order_id: orderId.value,
    value: orderValue.value,
    content_ids: productIds.value,
    num_items: itemCount.value
  })
})
</script>
```

---

## 📊 البيانات المُرسلة

### Add to Cart
```javascript
{
  content_ids: ['product-123'],
  content_name: 'اسم المنتج',
  content_type: 'product',
  value: 99.99,
  currency: 'SAR',
  quantity: 1,
  content_category: 'فئة المنتج'
}
```

### Purchase
```javascript
{
  content_ids: ['product-123', 'product-456'],
  content_type: 'product',
  value: 299.99,
  currency: 'SAR',
  num_items: 2,
  order_id: 'ORDER-123'
}
```

---

## 🔍 التحقق

### في المتصفح
```javascript
// تحقق من تحميل Pixel
console.log(window.fbq)

// عرض جميع الأحداث
console.log(window.dataLayer)

// اختبر حدث يدويًا
window.fbq('track', 'AddToCart', {
  content_ids: ['test-123'],
  value: 99.99,
  currency: 'SAR'
})
```

### في Facebook Events Manager
1. انتقل إلى Events Manager
2. اختر الـ Pixel الخاص بك
3. اضغط على "Test Events"
4. تحقق من وصول الأحداث

---

## ⚙️ الإعدادات

### Facebook Pixel ID
```
1369120761123220
```

### العملة
```
SAR (الريال السعودي)
```

---

## 📝 الملاحظات المهمة

1. **استدعِ الدالة مباشرة عند الحدث** - لا تنتظر إعادة تحميل الصفحة
2. **أرسل البيانات الصحيحة** - تأكد من وجود `content_ids` و `value`
3. **استخدم العملة الصحيحة** - دائماً `SAR`
4. **تتبع في كل مكان** - صفحة المنتج، السلة، الدفع، النجاح

---

## 🎯 الخطوات التالية

1. ✅ تحديث صفحة المنتج - أضف `trackViewContent` و `trackAddToCart`
2. ✅ تحديث صفحة السلة - أضف `trackInitiateCheckout`
3. ✅ تحديث صفحة النجاح - أضف `trackPurchase`
4. ✅ اختبر في Facebook Events Manager

---

**الحالة: جاهز للاستخدام ✅**
