<template>
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <h1 class="mb-4">{{ t('footer.links.company.about') }}</h1>
        
        <div class="content">
          <p class="lead">{{ t('about.lead') }}</p>
          <p>{{ t('about.description') }}</p>
          
          <h2>{{ t('about.mission') }}</h2>
          <p>{{ t('about.mission_content') }}</p>
          
          <h2>{{ t('about.vision') }}</h2>
          <p>{{ t('about.vision_content') }}</p>
          
          <h2>{{ t('about.values') }}</h2>
          <p>{{ t('about.values_content') }}</p>
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

.content p {
  line-height: 1.6;
  margin-bottom: 1rem;
}

.content .lead {
  font-size: 1.25rem;
  font-weight: 300;
  color: #6c757d;
}
</style>
