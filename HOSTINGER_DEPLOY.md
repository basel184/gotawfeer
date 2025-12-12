# تعليمات النشر على Hostinger

## البناء
البناء يعمل بشكل صحيح. الملفات موجودة في مجلد `.output`

## خطوات النشر على Hostinger:

### 1. البناء المحلي (تم بالفعل)
```bash
npm run build
```

### 2. رفع الملفات إلى Hostinger
ارفع محتويات مجلد `.output` إلى الخادم:
- `.output/public` → المجلد العام (public_html أو www)
- `.output/server` → مجلد الخادم (عادة في مجلد منفصل)

### 3. إعدادات Hostinger

#### في لوحة تحكم Hostinger:
1. **Node.js App Settings:**
   - **Start Command:** `node .output/server/index.mjs`
   - **Node Version:** 18.x أو 20.x
   - **Root Directory:** اتركه فارغاً أو ضع المسار الصحيح

2. **Build Settings (إذا كان Hostinger يقوم بالبناء تلقائياً):**
   - **Build Command:** `npm run build`
   - **Output Directory:** `.output` أو `.output/public` (حسب إعدادات Hostinger)

### 4. متغيرات البيئة
تأكد من إعداد متغيرات البيئة في Hostinger:
- `NODE_ENV=production`
- أي متغيرات أخرى يحتاجها التطبيق

### 5. تشغيل التطبيق
بعد رفع الملفات، قم بتشغيل:
```bash
node .output/server/index.mjs
```

## ملاحظات:
- إذا كان Hostinger يستخدم نظام بناء تلقائي، قد تحتاج إلى تعديل إعدادات "Output Directory" في لوحة التحكم
- الخطأ "No output directory found" قد يكون من إعدادات Hostinger وليس من الكود
- تأكد من أن Node.js مثبت ومفعل على Hostinger

