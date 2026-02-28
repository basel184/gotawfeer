# 🎯 ملخص تثبيت Google Ads Conversion Tracking - Go Tawfeer

## ✅ تم إنجازه

### 📦 الملفات المُنشأة (4 ملفات)

#### الـ Composables
- ✅ `composables/useGoogleAdsConversion.ts` - تتبع التحويلات

#### الأنواع والأدوات
- ✅ `types/google-ads.ts` - أنواع TypeScript
- ✅ `utils/google-ads.ts` - دوال مساعدة

#### التوثيق
- ✅ `docs/GOOGLE_ADS_INTEGRATION.md` - دليل شامل

#### التحديثات
- ✅ `nuxt.config.ts` - إضافة Google Ads scripts
- ✅ `.env.example` - متغيرات البيئة

---

## 🎯 معرّف التحويل

```
معرّف التحويل: AW-17945118619
تسمية التحويل: Vm7MCL6qpPYbEJuP8-xC
```

---

## 💰 العملة

```
الريال السعودي (SAR)
```

---

## 🚀 الاستخدام السريع

### تتبع الشراء
```typescript
import { useGoogleAdsConversion } from '~/composables/useGoogleAdsConversion'

const { trackPurchaseConversion } = useGoogleAdsConversion()

trackPurchaseConversion({
  id: 'ORDER-123',
  total: 299.99
})
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

## 🧪 الاختبار

### في المتصفح
```javascript
// تحقق من gtag
console.log(window.gtag)

// عرض DataLayer
console.log(window.dataLayer)

// اختبر حدث
window.gtag('event', 'conversion', {
  'send_to': 'AW-17945118619/Vm7MCL6qpPYbEJuP8-xC',
  'value': 100,
  'currency': 'SAR',
  'transaction_id': 'TEST-001'
})
```

---

## 📝 الخطوات التالية

1. **تحديث صفحة الدفع** - أضف `useGoogleAdsConversion`
2. **تحديث صفحة المنتج** - أضف تتبع المشاهدة
3. **تحديث صفحة السلة** - أضف تتبع الأحداث
4. **الاختبار** - تحقق من الأحداث في Google Ads

---

## 📚 التوثيق

- `docs/GOOGLE_ADS_INTEGRATION.md` - دليل شامل

---

## ✨ المميزات

✅ تتبع تحويلات الشراء
✅ تتبع أحداث السلة
✅ دعم العملة السعودية
✅ Type-Safe
✅ Composables سهلة
✅ Utilities مفيدة

---

## 🔧 الإعدادات

### البيئة
```bash
NUXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID=AW-17945118619
NUXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=Vm7MCL6qpPYbEJuP8-xC
NUXT_PUBLIC_CURRENCY=SAR
```

---

**الحالة: جاهز للاستخدام ✅**

جميع الملفات مُنشأة وجاهزة للاستخدام الفوري. ابدأ بتحديث صفحات المشروع باستخدام الـ Composable المتاح.
