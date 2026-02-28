# Google Ads Conversion Tracking Integration

## نظرة عامة

تم تثبيت Google Ads Conversion Tracking في مشروع Go Tawfeer مع دعم كامل للعملة السعودية (SAR).

**معرّف التحويل:** `AW-17945118619`
**تسمية التحويل:** `Vm7MCL6qpPYbEJuP8-xC`

---

## 📦 الملفات المُنشأة

- `composables/useGoogleAdsConversion.ts` - Composable للتتبع
- `types/google-ads.ts` - أنواع TypeScript
- `utils/google-ads.ts` - دوال مساعدة
- `nuxt.config.ts` - تحديث الإعدادات

---

## 🚀 الاستخدام السريع

### تتبع الشراء
```typescript
import { useGoogleAdsConversion } from '~/composables/useGoogleAdsConversion'

const { trackPurchaseConversion } = useGoogleAdsConversion()

const completeOrder = (order) => {
  trackPurchaseConversion({
    id: order.id,
    total: order.total
  })
}
```

### تتبع إضافة إلى السلة
```typescript
const { trackAddToCartConversion } = useGoogleAdsConversion()

trackAddToCartConversion(product, quantity)
```

### تتبع مشاهدة المنتج
```typescript
const { trackViewItemConversion } = useGoogleAdsConversion()

trackViewItemConversion(product)
```

### تتبع بدء الدفع
```typescript
const { trackBeginCheckoutConversion } = useGoogleAdsConversion()

trackBeginCheckoutConversion(cartTotal, itemCount)
```

---

## 📊 الأحداث المدعومة

| الحدث | الوصف |
|------|-------|
| `conversion` | تحويل الشراء |
| `add_to_cart` | إضافة إلى السلة |
| `view_item` | مشاهدة المنتج |
| `begin_checkout` | بدء الدفع |

---

## 🔧 الإعدادات

### البيئة
```bash
NUXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID=AW-17945118619
NUXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=Vm7MCL6qpPYbEJuP8-xC
NUXT_PUBLIC_CURRENCY=SAR
```

---

## 💡 المميزات

✅ تتبع تحويلات الشراء
✅ تتبع أحداث السلة
✅ دعم العملة السعودية
✅ Type-Safe مع TypeScript
✅ Composables سهلة الاستخدام
✅ Utilities مفيدة

---

## 📝 أمثلة عملية

### صفحة الدفع
```vue
<script setup>
import { useGoogleAdsConversion } from '~/composables/useGoogleAdsConversion'

const { trackPurchaseConversion } = useGoogleAdsConversion()

const completeOrder = async () => {
  const order = await submitOrder()
  trackPurchaseConversion(order)
}
</script>
```

### صفحة المنتج
```vue
<script setup>
import { useGoogleAdsConversion } from '~/composables/useGoogleAdsConversion'

const { trackViewItemConversion, trackAddToCartConversion } = useGoogleAdsConversion()

onMounted(() => {
  trackViewItemConversion(product.value)
})

const addToCart = () => {
  trackAddToCartConversion(product.value, quantity.value)
}
</script>
```

---

## 🧪 الاختبار

### في المتصفح
```javascript
// تحقق من gtag
console.log(window.gtag)

// عرض DataLayer
console.log(window.dataLayer)

// اختبر حدث يدويًا
window.gtag('event', 'conversion', {
  'send_to': 'AW-17945118619/Vm7MCL6qpPYbEJuP8-xC',
  'value': 100,
  'currency': 'SAR',
  'transaction_id': 'TEST-001'
})
```

### في Google Ads
1. انتقل إلى Tools & Settings
2. اختر Conversions
3. اختر Conversion الخاص بك
4. تحقق من الأحداث الواردة

---

## 📞 الدعم

- [Google Ads Conversion Tracking](https://support.google.com/google-ads/answer/3103387)
- [Google Tag Manager](https://tagmanager.google.com/)
- [Google Analytics 4](https://analytics.google.com/)
