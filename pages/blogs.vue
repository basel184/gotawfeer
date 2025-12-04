<template>
  <div class="blog-page">
    <div class="container py-5">
      <!-- Page Header -->
      <div class="blog-header mb-5">
        <h1 class="blog-title">{{ t('blog.title') }}</h1>
        <p class="blog-subtitle">{{ t('blog.subtitle') }}</p>
      </div>

      <!-- Loading State -->
      <div v-if="pending" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">{{ t('loading') }}</span>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="alert alert-danger" role="alert">
        {{ t('blog.error_loading') }}
      </div>

      <!-- Blog List -->
      <div v-else-if="blogs && blogs.length > 0" class="row">
        <div
          v-for="blog in blogs"
          :key="blog.id || blog.slug"
          class="col-md-6 col-lg-4 mb-4"
        >
          <NuxtLink
            :to="`/blog/${blog.slug}`"
            class="blog-card card h-100 text-decoration-none"
          >
            <!-- Blog Image -->
            <div v-if="blog.image" class="blog-image-wrapper">
              <img
                :src="blog.image"
                :alt="blog.title || blog.name"
                class="blog-image card-img-top"
                loading="lazy"
              />
            </div>

            <!-- Blog Content -->
            <div class="card-body d-flex flex-column">
              <!-- Category -->
              <div v-if="blog.category" class="blog-category mb-2">
                <span class="badge bg-primary">{{ blog.category.name || blog.category }}</span>
              </div>

              <!-- Title -->
              <h3 class="blog-card-title card-title h5 mb-3">
                {{ blog.title || blog.name }}
              </h3>

              <!-- Excerpt -->
              <p v-if="blog.excerpt || blog.description" class="blog-excerpt card-text text-muted flex-grow-1">
                {{ truncateText(blog.excerpt || blog.description, 120) }}
              </p>

              <!-- Meta Info -->
              <div class="blog-meta mt-auto pt-3">
                <div class="d-flex align-items-center justify-content-between">
                  <small class="text-muted">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="me-1">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                    {{ formatDate(blog.created_at || blog.published_at) }}
                  </small>
                  <span class="text-primary">
                    {{ t('blog.read_more') }} →
                  </span>
                </div>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-5">
        <p class="text-muted">{{ t('blog.no_blogs') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { $get } = useApi()

// Set page title
useHead({
  title: t('blog.title')
})

// Fetch blogs
const { data: blogsData, pending, error } = await useAsyncData('blogs', () => 
  $get('v1/blog', { timeout: 5000 })
)

const blogs = computed(() => {
  if (!blogsData.value) return []
  const data = blogsData.value as any
  // Handle different response formats
  if (Array.isArray(data)) {
    return data
  }
  if (data.data && Array.isArray(data.data)) {
    return data.data
  }
  if (data.blogs && Array.isArray(data.blogs)) {
    return data.blogs
  }
  return []
})

// Helper functions
const truncateText = (text: string, maxLength: number): string => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  } catch {
    return dateString
  }
}
</script>

<style scoped>
.blog-page {
  min-height: 60vh;
}

.blog-header {
  text-align: center;
  padding: 2rem 0;
}

.blog-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.blog-subtitle {
  font-size: 1.1rem;
  color: #6c757d;
  max-width: 600px;
  margin: 0 auto;
}

.blog-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid #e9ecef;
  overflow: hidden;
}

.blog-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-decoration: none;
}

.blog-image-wrapper {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  background-color: #f8f9fa;
}

.blog-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.blog-card:hover .blog-image {
  transform: scale(1.05);
}

.blog-card-title {
  color: #2c3e50;
  font-weight: 600;
  line-height: 1.4;
  min-height: 3.5rem;
}

.blog-excerpt {
  font-size: 0.95rem;
  line-height: 1.6;
}

.blog-meta {
  border-top: 1px solid #e9ecef;
  padding-top: 1rem;
}

.blog-meta svg {
  vertical-align: middle;
}

.blog-category {
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .blog-title {
    font-size: 2rem;
  }
  
  .blog-subtitle {
    font-size: 1rem;
  }
}
</style>
