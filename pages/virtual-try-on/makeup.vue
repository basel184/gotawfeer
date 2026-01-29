<template>
  <div class="makeup-vto-page">
    <div class="page-header">
      <div class="container text-center">
        <h1>تجربة المكياج الافتراضية</h1>
        <p>جربي الألوان والمنتجات مباشرة على وجهك باستخدام تقنية الواقع المعزز</p>
      </div>
    </div>

    <div class="page-content container">
      <!-- Breadcrumbs or simple navigation back -->
      <div class="navigation-info mb-4">
        <NuxtLink to="/" class="back-link">
          <i class="fas fa-chevron-right ml-2"></i>
          العودة للرئيسية
        </NuxtLink>
      </div>

      <MakeupTryOn />
      
      <div class="how-to-use mt-5 section card">
        <h3>كيفية الاستخدام</h3>
        <div class="row">
          <div class="col-md-4">
            <div class="how-to-item">
              <i class="fas fa-camera-retro"></i>
              <h4>1. شغلي الكاميرا</h4>
              <p>اسمح بالوصول للكاميرا لرؤية النتائج مباشرة.</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="how-to-item">
              <i class="fas fa-palette"></i>
              <h4>2. اختاري اللون</h4>
              <p>جربي درجات مختلفة من أحمر الشفاه.</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="how-to-item">
              <i class="fas fa-shopping-cart"></i>
              <h4>3. أضيفي للسلة</h4>
              <p>اشتري اللون الذي أعجبك فوراً.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MakeupTryOn from '~/components/VirtualTryOn/MakeupTryOn.vue'

useHead({
  title: 'تجربة المكياج الافتراضية - جو توفير',
  meta: [
    { name: 'description', content: 'جربي أحمر الشفاه ومنتجات التجميل افتراضياً باستخدام الكاميرا المباشرة أو برفع صورتك' }
  ]
})
</script>

<style scoped>
.makeup-vto-page {
  min-height: 100vh;
  background: #f8fafc;
  direction: rtl;
}

.page-header {
  background: linear-gradient(135deg, #C2185B 0%, #db2777 100%);
  color: white;
  padding: 50px 0;
  margin-bottom: 2rem;
  box-shadow: 0 4px 15px rgba(194, 24, 91, 0.2);
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 0.75rem;
}

.page-header p {
  font-size: 1.25rem;
  opacity: 0.95;
  max-width: 600px;
  margin: 0 auto;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  color: #64748b;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s;
}

.back-link:hover {
  color: #C2185B;
}

.section {
  padding: 2rem;
  background: white;
  border-radius: 1.25rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
}

.how-to-use h3 {
  text-align: center;
  margin-bottom: 2.5rem;
  font-weight: 700;
}

.how-to-item {
  text-align: center;
  padding: 1rem;
}

.how-to-item i {
  font-size: 2.5rem;
  color: #C2185B;
  margin-bottom: 1.25rem;
}

.how-to-item h4 {
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.how-to-item p {
  color: #64748b;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .page-header h1 {
    font-size: 2rem;
  }
}
</style>
