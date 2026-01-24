<template>
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <h1 class="mb-4">{{ t('footer.links.company.intellectual_property') }}</h1>
        
        <div class="content">
          <h2>{{ t('intellectual_property.title') }}</h2>
          <p>{{ t('intellectual_property.content') }}</p>
          
          <h3>{{ t('intellectual_property.copyright') }}</h3>
          <p>{{ t('intellectual_property.copyright_content') }}</p>
          
          <h3>{{ t('intellectual_property.trademark') }}</h3>
          <p>{{ t('intellectual_property.trademark_content') }}</p>
          
          <h3>{{ t('intellectual_property.contact') }}</h3>
          <p>{{ t('intellectual_property.contact_content') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Set page title
useHead({
  title: t('footer.links.company.intellectual_property')
})
</script>

<style scoped>
.content h2, .content h3 {
  color: #333;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.content p {
  line-height: 1.6;
  margin-bottom: 1rem;
}
</style>
