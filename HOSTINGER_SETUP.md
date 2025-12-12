# إعدادات Hostinger لـ Nuxt.js

## الخطوة 1: اختيار الإطار
بما أن Nuxt.js غير موجود في القائمة، استخدم أحد الخيارات التالية:

### ✅ الخيار الموصى به: **Express**
- اختر **Express** من القائمة
- هذا مناسب لأن Nuxt.js مع `node-server` preset يحتاج Node.js server

### أو استخدم: **Vue.js**
- اختر **Vue.js** من القائمة
- Nuxt.js مبني على Vue.js

### أو استخدم: **Vite**
- اختر **Vite** من القائمة
- Nuxt.js يستخدم Vite كـ bundler

---

## الخطوة 2: إعدادات البناء

### Build Command:
```
npm run build
```

### Output Directory:
```
.output
```
أو اتركه فارغاً إذا لم يعمل

### Start Command:
```
node .output/server/index.mjs
```

---

## الخطوة 3: إعدادات Node.js

### Node Version:
- اختر **18.x** أو **20.x**

### Root Directory:
- اتركه فارغاً (إذا كان المشروع في الجذر)
- أو ضع المسار الصحيح

---

## الخطوة 4: متغيرات البيئة

أضف هذه المتغيرات في إعدادات Hostinger:
```
NODE_ENV=production
```

---

## ملاحظات مهمة:

1. **إذا لم يعمل Output Directory:**
   - جرب `.output/public` بدلاً من `.output`
   - أو اتركه فارغاً تماماً

2. **إذا ظهر خطأ "No output directory found":**
   - هذا خطأ من إعدادات Hostinger وليس من الكود
   - تأكد من أن Output Directory صحيح
   - جرب حذف Output Directory وتركه فارغاً

3. **الملفات المطلوبة:**
   - `.output/server` → يحتوي على كود الخادم
   - `.output/public` → يحتوي على الملفات الثابتة

---

## بعد الإعداد:

1. قم بالبناء: `npm run build`
2. ارفع الملفات إلى Hostinger
3. تأكد من أن Start Command صحيح
4. شغّل التطبيق

