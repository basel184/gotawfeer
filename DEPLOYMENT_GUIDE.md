# دليل النشر على Hostinger

## المفهوم:
- ✅ البناء يتم **محلياً** على جهازك
- ✅ على السيرفر يتم رفع **الملفات المبنية فقط** (مجلد `dist`)

---

## الخطوات:

### 1. البناء المحلي:
```bash
npm run build
```
هذا سينتج:
- `.output` → الملفات المبنية الأصلية
- `dist` → نسخة من `.output` (هذا ما سنرفعه)

### 2. الملفات التي يجب رفعها إلى Hostinger:

ارفع **مجلد `dist` بالكامل** إلى Hostinger:

```
dist/
├── server/          ← كود الخادم
│   ├── index.mjs   ← نقطة البداية
│   └── ...
└── public/         ← الملفات الثابتة (CSS, JS, images)
    └── ...
```

### 3. أين تضع الملفات على Hostinger:

#### الخيار 1: في المجلد الرئيسي (public_html)
```
public_html/
└── dist/
    ├── server/
    └── public/
```

#### الخيار 2: في مجلد منفصل (موصى به)
```
your-domain.com/
├── dist/
│   ├── server/
│   └── public/
└── ...
```

### 4. إعدادات Node.js App في Hostinger:

في لوحة تحكم Hostinger → Node.js App:

- **Root Directory:** 
  - إذا وضعت `dist` في الجذر: اتركه فارغاً
  - إذا وضعت `dist` في مجلد فرعي: ضع المسار (مثلاً: `dist`)

- **Start Command:**
  ```
  node dist/server/index.mjs
  ```
  أو إذا كان Root Directory = `dist`:
  ```
  node server/index.mjs
  ```

- **Node Version:** 18.x أو 20.x

### 5. متغيرات البيئة:
```
NODE_ENV=production
```

---

## حل مشكلة 403 Forbidden:

### 1. تحقق من الملفات:
تأكد من أن:
- ✅ `dist/server/index.mjs` موجود
- ✅ `dist/public` موجود ويحتوي على الملفات

### 2. تحقق من Start Command:
- إذا كان Root Directory **فارغ** → `node dist/server/index.mjs`
- إذا كان Root Directory = `dist` → `node server/index.mjs`

### 3. تحقق من الأذونات:
على السيرفر:
```bash
chmod 755 dist
chmod 755 dist/server
chmod 644 dist/server/index.mjs
```

### 4. تحقق من Node.js App:
- ✅ Node.js App **مفعل**
- ✅ Node.js App **يعمل** (Status: Running)
- ✅ تحقق من السجلات (Logs) لمعرفة الأخطاء

### 5. جرب حذف `.htaccess`:
إذا استمرت المشكلة، احذف `.htaccess` مؤقتاً:
```bash
rm .htaccess
```

---

## ملاحظات مهمة:

1. **لا ترفع:**
   - ❌ `node_modules`
   - ❌ `.nuxt`
   - ❌ `pages`, `components`, `server` (الملفات المصدرية)
   - ❌ `package.json` (إلا إذا كان Hostinger يحتاجه)

2. **ارفع فقط:**
   - ✅ `dist/` بالكامل
   - ✅ `.htaccess` (اختياري)

3. **بعد كل تحديث:**
   - قم بالبناء محلياً: `npm run build`
   - ارفع مجلد `dist` الجديد
   - أعد تشغيل Node.js App في Hostinger

---

## هيكل الملفات النهائي على Hostinger:

```
your-domain.com/
├── dist/
│   ├── server/
│   │   ├── index.mjs        ← نقطة البداية
│   │   ├── chunks/
│   │   └── ...
│   └── public/
│       ├── _nuxt/
│       └── ...
└── .htaccess (اختياري)
```

