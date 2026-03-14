# 🔧 دليل تصحيح خطأ YouCam InvalidParameters

## 📋 المشكلة

عند محاولة تطبيق المكياج الافتراضي، يحدث الخطأ:
```
[POST] "/api/youcam/task": 400 YouCam error [400]: InvalidParameters
```

---

## 🔍 تتبع المشكلة

### 1. تدفق البيانات

```
product/[slug].vue
  ↓
convertProductColorsToShades()
  ↓ (يرجع shades مع type: "lip_color" من API)
  ↓
ProductTryOnModal (يمرر initialShade و productShades)
  ↓
MakeupTryOn.vue
  ↓
buildEffects() (يبني payload بناءً على currentShade.type)
  ↓
/api/youcam/task (يُرسل الـ payload إلى YouCam API)
```

### 2. الـ Logging المضاف

تم إضافة logging في:
- **Frontend**: `MakeupTryOn.vue` - يطبع `currentShade` و `buildEffects()` output
- **Backend**: `server/api/youcam/task.post.ts` - يطبع الـ payload الكامل قبل الإرسال

### 3. الفحوصات المضافة

```typescript
// في MakeupTryOn.vue
if (!effects || effects.length === 0) {
  throw new Error(`لا يمكن بناء effects - نوع المكياج غير صحيح: ${currentShade.value?.type}`)
}

// في task.post.ts
if (!body.effects || !Array.isArray(body.effects) || body.effects.length === 0) {
  throw createError({ statusCode: 400, statusMessage: 'Missing or invalid effects array' })
}

if (!body.src_file_id && !body.src_file_url) {
  throw createError({ statusCode: 400, statusMessage: 'Missing image source' })
}
```

---

## 🎯 الخطوات التالية للتصحيح

### 1. فتح DevTools وتفعيل الـ Logging

```javascript
// في Console
// ابحث عن logs تبدأ بـ [MakeupTryOn] و [YouCam Task]
```

### 2. التحقق من البيانات المُرسلة

ابحث عن:
```
[MakeupTryOn] currentShade.value.type: "lip_color"
[MakeupTryOn] buildEffects() returned: [...]
[MakeupTryOn] Full taskBody being sent: {...}
```

### 3. التحقق من الـ Backend Logs

في terminal الـ Nuxt server، ابحث عن:
```
[YouCam Task] Raw body received: {...}
[YouCam Task] Effects: [...]
[YouCam Task] First effect: {...}
[YouCam Task] Validation passed, sending to YouCam...
```

---

## 🐛 الأسباب المحتملة

### السبب 1: `currentShade.type` غير صحيح
- **الأعراض**: `buildEffects()` يرجع `[]`
- **الحل**: تأكد من أن `initialShade` يحتوي على `type` صحيح

### السبب 2: الـ Payload لا يطابق متطلبات YouCam
- **الأعراض**: Validation يمر لكن YouCam يرفع `InvalidParameters`
- **الحل**: تحقق من format الـ effects في الـ logs

### السبب 3: صورة المصدر غير صحيحة
- **الأعراض**: `src_file_id` أو `src_file_url` غير موجود
- **الحل**: تأكد من أن الصورة تم رفعها بنجاح

---

## 📝 الملفات المعدلة

1. **`composables/useVirtualTryOnCategories.ts`**
   - تحديث `supportsVirtualTryOn()` للتحقق من `supports_virtual_try_on` من API أولاً
   - تحديث `getMakeupType()` للتحقق من `makeup_category` من API أولاً

2. **`pages/product/[slug].vue`**
   - تحديث logs في `openTryOnModal()`

3. **`components/VirtualTryOn/MakeupTryOn.vue`**
   - إضافة logging تفصيلي في `applyMakeup()`
   - إضافة validation للـ effects

4. **`server/api/youcam/task.post.ts`**
   - إضافة logging تفصيلي للـ payload
   - إضافة validation للـ required fields

---

## ✅ الخطوات للتحقق من الحل

1. افتح صفحة المنتج
2. اضغط على زر "جرّب المنتج افتراضياً"
3. اختر صورة أو استخدم الكاميرا
4. افتح DevTools (F12)
5. ابحث عن logs `[MakeupTryOn]` و `[YouCam Task]`
6. تحقق من أن:
   - `currentShade.type` صحيح
   - `buildEffects()` يرجع array غير فارغ
   - `src_file_id` أو `src_file_url` موجود
   - الـ payload يُرسل بنجاح

---

## 🔗 المراجع

- YouCam API Docs: https://yce-api-01.makeupar.com/docs
- Makeup Types: `foundation`, `contour`, `concealer`, `blush`, `lip_color`, `lip_liner`, `eye_shadow`, `eye_liner`, `eyelashes`, `eyebrows`
