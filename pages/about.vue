<template>
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <h1 class="mb-4">{{ t('footer.links.company.about') }}</h1>
        
        <div class="content">
          <p class="lead">{{ t('about.lead') }}</p>
          <p>{{ t('about.description') }}</p>
          
          <h2 class="mt-4">{{ t('about.vision') }}</h2>
          <h3>{{ t('about.vision_title') }}</h3>
          <p>{{ t('about.vision_content') }}</p>
          
          <h2 class="mt-4">{{ t('about.mission') }}</h2>
          <h3>{{ t('about.mission_title') }}</h3>
          <p>{{ t('about.mission_content') }}</p>
          
          <h2 class="mt-4">{{ t('about.why_us') }}</h2>
          <h3>{{ t('about.why_us_title') }}</h3>
          <div class="why-us-items">
            <div class="why-us-item">
              <h4>{{ t('about.why_us_items.unique_experience.title') }}</h4>
              <p>{{ t('about.why_us_items.unique_experience.content') }}</p>
            </div>
            <div class="why-us-item">
              <h4>{{ t('about.why_us_items.transparency.title') }}</h4>
              <p>{{ t('about.why_us_items.transparency.content') }}</p>
            </div>
            <div class="why-us-item">
              <h4>{{ t('about.why_us_items.competitive_prices.title') }}</h4>
              <p>{{ t('about.why_us_items.competitive_prices.content') }}</p>
            </div>
            <div class="why-us-item">
              <h4>{{ t('about.why_us_items.product_variety.title') }}</h4>
              <p>{{ t('about.why_us_items.product_variety.content') }}</p>
            </div>
          </div>

          <h2 class="mt-4">{{ t('about.everything_you_need') }}</h2>
          <h3>{{ t('about.faq_title') }}</h3>
          <div class="faq-items">
            <div class="faq-item">
              <h4>{{ t('about.faq.natural_products.question') }}</h4>
              <p>{{ t('about.faq.natural_products.answer') }}</p>
            </div>
            <div class="faq-item">
              <h4>{{ t('about.faq.shipping.question') }}</h4>
              <p>{{ t('about.faq.shipping.answer') }}</p>
            </div>
            <div class="faq-item">
              <h4>{{ t('about.faq.track_order.question') }}</h4>
              <p>{{ t('about.faq.track_order.answer') }}</p>
            </div>
            <div class="faq-item">
              <h4>{{ t('about.faq.offers.question') }}</h4>
              <p>{{ t('about.faq.offers.answer') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

// SEO Configuration
const seo = useSeo()

// Set SEO for about page
seo.setSeo({
  title: locale.value === 'ar' ? 'من نحن' : 'About Us',
  description: locale.value === 'ar' 
    ? 'تعرف على جو توفير - وجهتك الأولى للتسوق الإلكتروني في المملكة العربية السعودية. مهمتنا ورؤيتنا وقيمنا.'
    : 'Learn about Go Tawfeer - your premier destination for online shopping in Saudi Arabia. Our mission, vision, and values.',
  keywords: locale.value === 'ar' 
    ? 'من نحن، جو توفير، عن الشركة، مهمة، رؤية، قيم'
    : 'about us, Go Tawfeer, company, mission, vision, values',
  image: '/images/go-tawfeer-1-1.webp'
})
</script>

<style scoped>
.content h2 {
  color: #333;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.content h3 {
  color: #555;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  font-size: 1.3rem;
}

.content h4 {
  color: #666;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.content p {
  line-height: 1.6;
  margin-bottom: 1rem;
}

.content .lead {
  font-size: 1.25rem;
  font-weight: 300;
  color: #6c757d;
}

.why-us-items {
  margin-top: 1rem;
}

.why-us-item {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.why-us-item h4 {
  color: #333;
  margin-bottom: 0.5rem;
}

.why-us-item p {
  margin-bottom: 0;
  color: #666;
}

.faq-items {
  margin-top: 1rem;
}

.faq-item {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.faq-item h4 {
  color: #333;
  margin-bottom: 0.5rem;
}

.faq-item p {
  margin-bottom: 0;
  color: #666;
}
</style>
