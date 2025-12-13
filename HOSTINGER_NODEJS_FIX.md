# حل مشكلة "node: command not found" على Hostinger

## المشكلة:
عند محاولة تشغيل `node server/index.mjs` من terminal، تحصل على:
```
bash: node: command not found
```

## السبب:
Node.js غير موجود في PATH أو غير مثبت في terminal.

---

## ✅ الحلول:

### الحل 1: استخدام Node.js App من لوحة التحكم (موصى به)

**لا تحتاج** لتشغيل Node.js من terminal. استخدم لوحة تحكم Hostinger:

1. اذهب إلى **Hostinger → Node.js App**
2. تأكد من:
   - **Start Command:** `node server/index.mjs`
   - **Status:** "Running" أو "Active"
3. اضغط **"Start"** أو **"Restart"**

Node.js App سيقوم بتشغيل التطبيق تلقائياً.

---

### الحل 2: العثور على Node.js في السيرفر

جرب هذه الأوامر للعثور على Node.js:

```bash
# البحث عن Node.js
which node
whereis node

# أو جرب المسارات الشائعة
/usr/bin/node
/usr/local/bin/node
/opt/nodejs/bin/node
~/.nvm/versions/node/*/bin/node

# أو ابحث في جميع المجلدات
find / -name "node" -type f 2>/dev/null | head -10
```

---

### الحل 3: استخدام NVM (Node Version Manager)

إذا كان NVM مثبتاً:

```bash
# تحميل NVM
source ~/.nvm/nvm.sh

# أو
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# ثم جرب
node --version
node server/index.mjs
```

---

### الحل 4: استخدام المسار الكامل

إذا وجدت Node.js في مكان معين (مثلاً `/usr/bin/node`):

```bash
/usr/bin/node server/index.mjs
```

أو أضفه إلى PATH:

```bash
export PATH=$PATH:/usr/bin
node server/index.mjs
```

---

### الحل 5: تثبيت Node.js (إذا لم يكن مثبتاً)

```bash
# باستخدام NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# أو باستخدام NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## ⚠️ ملاحظة مهمة:

**في Hostinger، الأفضل استخدام Node.js App من لوحة التحكم** بدلاً من تشغيله من terminal.

لوحة التحكم:
- ✅ تدير Node.js تلقائياً
- ✅ تعيد التشغيل تلقائياً عند الحاجة
- ✅ تتعامل مع الأخطاء
- ✅ توفر السجلات (Logs)

---

## 🔍 للتحقق من أن Node.js App يعمل:

1. اذهب إلى **Hostinger → Node.js App**
2. تحقق من **Status** → يجب أن يكون "Running"
3. تحقق من **Logs** → يجب أن ترى رسائل مثل:
   ```
   Server listening on port 3000
   ```
   أو
   ```
   Nitro server started
   ```

---

## 📝 إذا استمرت المشكلة:

1. **تحقق من Start Command في لوحة التحكم:**
   - يجب أن يكون: `node server/index.mjs`
   - تأكد من عدم وجود أخطاء إملائية

2. **تحقق من الملفات:**
   ```bash
   ls -la server/index.mjs
   ```
   يجب أن ترى الملف موجود.

3. **تحقق من الأذونات:**
   ```bash
   chmod 644 server/index.mjs
   chmod 755 server
   ```

4. **اتصل بدعم Hostinger:**
   - أخبرهم أن Node.js App لا يعمل
   - أرسل لهم السجلات (Logs)

