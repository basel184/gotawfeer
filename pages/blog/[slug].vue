<template>
  <div class="blog-detail-page">
    <div class="container py-5">
      <!-- Loading State -->
      <div v-if="pending" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">{{ t('loading') }}</span>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error || !blog" class="alert alert-danger" role="alert">
        <div v-if="error">
          <strong>{{ t('blog.error_loading') }}</strong>
          <p class="mb-0 mt-2">
            <small>{{ error.message || error.toString() }}</small>
          </p>
        </div>
        <div v-else>
          {{ t('blog.not_found') }}
        </div>
        <NuxtLink to="/blogs" class="btn btn-sm btn-outline-primary mt-3">
          {{ t('blog.back_to_list') }}
        </NuxtLink>
      </div>

      <!-- Blog Content -->
      <div v-else class="row">
        <!-- Main Content -->
        <div class="col-lg-8">
          <article class="blog-article">
            <!-- Back Button -->
            <NuxtLink to="/blogs" class="back-link mb-4 d-inline-flex align-items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="me-2">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              {{ t('blog.back_to_list') }}
            </NuxtLink>

            <!-- Category -->
            <div v-if="blog.category" class="blog-category mb-3">
              <span class="badge bg-primary">{{ blog.category.name || blog.category }}</span>
            </div>

            <!-- Title -->
            <h1 class="blog-article-title mb-4">
              {{ blog.title || blog.name }}
            </h1>

            <!-- Meta Info -->
            <div class="blog-meta mb-4 pb-3 border-bottom">
              <div class="d-flex align-items-center flex-wrap gap-3">
                <small class="text-muted d-flex align-items-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="me-1">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                  </svg>
                  {{ formatDate(blog.created_at || blog.published_at) }}
                </small>
                <small v-if="blog.author" class="text-muted d-flex align-items-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="me-1">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  {{ blog.author.name || blog.author }}
                </small>
              </div>
            </div>

            <!-- Featured Image -->
            <div v-if="blog.image" class="blog-featured-image mb-4">
              <img
                :src="blog.image"
                :alt="blog.title || blog.name"
                class="img-fluid rounded"
                loading="lazy"
              />
            </div>

            <!-- Content -->
            <div class="blog-content">
              <div v-html="blog.content || blog.body || blog.description"></div>
            </div>

            <!-- Tags -->
            <div v-if="blog.tags && blog.tags.length > 0" class="blog-tags mt-4 pt-4 border-top">
              <h6 class="mb-3">{{ t('blog.tags') }}:</h6>
              <div class="d-flex flex-wrap gap-2">
                <span
                  v-for="tag in blog.tags"
                  :key="tag.id || tag"
                  class="badge bg-secondary"
                >
                  {{ tag.name || tag }}
                </span>
              </div>
            </div>
          </article>
        </div>

        <!-- Sidebar -->
        <div class="col-lg-4">
          <aside class="blog-sidebar">
            <!-- Popular Blogs -->
            <div v-if="popularBlogs && popularBlogs.length > 0" class="popular-blogs-section mb-4">
              <h3 class="sidebar-title mb-4">
                {{ t('blog.popular_blogs') }}
              </h3>
              <div class="popular-blogs-list">
                <div
                  v-for="popularBlog in popularBlogs"
                  :key="popularBlog.id || popularBlog.slug"
                  class="popular-blog-item mb-3"
                >
                  <NuxtLink
                    :to="`/blog/${popularBlog.slug}`"
                    class="popular-blog-link d-flex text-decoration-none"
                  >
                    <!-- Image -->
                    <div v-if="popularBlog.image" class="popular-blog-image me-3">
                      <img
                        :src="popularBlog.image"
                        :alt="popularBlog.title || popularBlog.name"
                        class="img-fluid rounded"
                        loading="lazy"
                      />
                    </div>
                    <!-- Content -->
                    <div class="popular-blog-content flex-grow-1">
                      <h6 class="popular-blog-title mb-1">
                        {{ popularBlog.title || popularBlog.name }}
                      </h6>
                      <small class="text-muted">
                        {{ formatDate(popularBlog.created_at || popularBlog.published_at) }}
                      </small>
                    </div>
                  </NuxtLink>
                </div>
              </div>
            </div>

            <!-- Categories (if available) -->
            <div v-if="categories && categories.length > 0" class="blog-categories-section">
              <h3 class="sidebar-title mb-4">
                {{ t('blog.categories') }}
              </h3>
              <ul class="list-unstyled">
                <li
                  v-for="category in categories"
                  :key="category.id || category"
                  class="mb-2"
                >
                  <NuxtLink
                    :to="`/blog?category=${category.slug || category.id}`"
                    class="text-decoration-none d-flex align-items-center"
                  >
                    <span class="me-2">→</span>
                    <span>{{ category.name || category }}</span>
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()
const { $get } = useApi()

// Get slug from route params and ensure it's properly handled
const slug = computed(() => {
  const param = route.params.slug
  if (!param) return ''
  
  // Ensure it's a string
  let slugValue = typeof param === 'string' ? param : String(param)
  
  // Decode if needed (Nuxt usually handles this, but be safe)
  try {
    if (slugValue.includes('%')) {
      slugValue = decodeURIComponent(slugValue)
    }
  } catch (e) {
    // If decode fails, use original
    console.warn('[Blog] Failed to decode slug:', slugValue, e)
  }
  
  return slugValue
})

// Fetch blog details
const { data: blogData, pending, error } = await useAsyncData(
  `blog-${slug.value}`,
  () => {
    const slugValue = slug.value
    console.log('[Blog] Fetching blog with slug:', slugValue)
    return $get(`v1/blog/${encodeURIComponent(slugValue)}`, { timeout: 5000 })
  }
)

const blog = computed(() => {
  if (!blogData.value) return null
  const data = blogData.value as any
  // Handle different response formats
  if (data.data) {
    return data.data
  }
  if (data.blog) {
    return data.blog
  }
  return data
})

// Set page title
const pageTitle = computed(() => {
  if (blog.value) {
    return blog.value.title || blog.value.name || t('blog.title')
  }
  return t('blog.title')
})

useHead({
  title: pageTitle
})

// Fetch popular blogs
const { data: popularBlogsData } = await useAsyncData(
  'popular-blogs',
  () => $get('v1/blog/popular', { timeout: 5000, silent: true })
)

const popularBlogs = computed(() => {
  if (!popularBlogsData.value) return []
  const data = popularBlogsData.value as any
  // Filter out current blog
  const allBlogs = Array.isArray(data)
    ? data
    : (data.data || data.blogs || [])
  
  return allBlogs
    .filter((b: any) => (b.slug || b.id) !== (blog.value?.slug || blog.value?.id))
    .slice(0, 5) // Limit to 5 popular blogs
})

// Fetch categories (optional)
const { data: categoriesData } = await useAsyncData(
  'blog-categories',
  () => $get('v1/blog/categories', { timeout: 5000, silent: true })
)

const categories = computed(() => {
  if (!categoriesData.value) return []
  const data = categoriesData.value as any
  return Array.isArray(data)
    ? data
    : (data.data || data.categories || [])
})

// Helper functions
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
.blog-detail-page {
  min-height: 60vh;
}

.back-link {
  color: #6c757d;
  font-size: 0.95rem;
  transition: color 0.3s ease;
}

.back-link:hover {
  color: #007bff;
}

.blog-article-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1.2;
}

.blog-meta {
  font-size: 0.9rem;
}

.blog-meta svg {
  vertical-align: middle;
}

.blog-featured-image {
  border-radius: 8px;
  overflow: hidden;
}

.blog-featured-image img {
  width: 100%;
  height: auto;
  max-height: 500px;
  object-fit: cover;
}

.blog-content {
  font-size: 1.1rem;
  line-height: 1.8;
  color: #495057;
  margin-top: 2rem;
}

.blog-content :deep(p) {
  margin-bottom: 1.5rem;
}

.blog-content :deep(h1),
.blog-content :deep(h2),
.blog-content :deep(h3),
.blog-content :deep(h4) {
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: #2c3e50;
  font-weight: 600;
}

.blog-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1.5rem 0;
}

.blog-content :deep(ul),
.blog-content :deep(ol) {
  margin-bottom: 1.5rem;
  padding-right: 1.5rem;
}

.blog-content :deep(li) {
  margin-bottom: 0.5rem;
}

.blog-tags {
  font-size: 0.9rem;
}

.blog-sidebar {
  position: sticky;
  top: 100px;
}

.sidebar-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e9ecef;
}

.popular-blogs-section {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
}

.popular-blog-item {
  padding-bottom: 1rem;
  border-bottom: 1px solid #e9ecef;
}

.popular-blog-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.popular-blog-link {
  color: #495057;
  transition: color 0.3s ease;
}

.popular-blog-link:hover {
  color: #007bff;
}

.popular-blog-image {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 4px;
}

.popular-blog-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.popular-blog-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.4;
  margin: 0;
}

.blog-categories-section {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
}

.blog-categories-section a {
  color: #495057;
  transition: color 0.3s ease;
}

.blog-categories-section a:hover {
  color: #007bff;
}

@media (max-width: 991px) {
  .blog-sidebar {
    position: static;
    margin-top: 3rem;
  }
  
  .blog-article-title {
    font-size: 2rem;
  }
}

@media (max-width: 768px) {
  .blog-article-title {
    font-size: 1.75rem;
  }
  
  .blog-content {
    font-size: 1rem;
  }
}
</style>

