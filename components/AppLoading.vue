<template>
  <Transition name="loading">
    <div v-if="isLoading" class="app-loading">
      <div class="loading-content">
        <div class="logo-container">
          <img 
            src="/images/go-tawfeer-1-1.webp" 
            alt="Go Tawfeer" 
            class="loading-logo"
            @load="onLogoLoad"
            @error="onLogoError"
          />
        </div>
        <div v-if="message" class="loading-message">{{ message }}</div>
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const props = defineProps<{
  message?: string
}>()

const isLoading = ref(true)
const router = useRouter()
const route = useRoute()
let hideTimeout: any = null
let pageReadyTimeout: any = null
const currentRoute = ref('')

// Preload logo image
const onLogoLoad = () => {
  // Logo loaded successfully
}

const onLogoError = () => {
  // Fallback if logo fails to load
  console.warn('Loading logo failed to load')
}

const hideLoading = () => {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
  // Wait a bit to ensure page is fully rendered
  hideTimeout = setTimeout(() => {
    isLoading.value = false
  }, 200)
}

// Wait for page to be fully ready
const waitForPageReady = async () => {
  if (!process.client) return
  
  // Wait for router to be ready
  await router.isReady()
  
  // Wait for next tick to ensure DOM is updated
  await nextTick()
  
  // Wait a bit more for page content to render (use requestAnimationFrame for better performance)
  await new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve(true)
      })
    })
  })
  
  // Check if page is actually visible (not just loaded)
  if (document.readyState === 'complete') {
    // Wait for critical images to load (only first few images, max 1 second)
    const images = document.querySelectorAll('img')
    const criticalImages = Array.from(images).slice(0, 5).filter((img: any) => !img.complete)
    
    if (criticalImages.length > 0) {
      // Wait for critical images to load (max 1 second)
      await Promise.race([
        Promise.all(criticalImages.map((img: any) => 
          new Promise(resolve => {
            if (img.complete) {
              resolve(true)
            } else {
              img.onload = () => resolve(true)
              img.onerror = () => resolve(true)
              // Timeout after 1 second (reduced from 2)
              setTimeout(() => resolve(true), 1000)
            }
          })
        )),
        new Promise(resolve => setTimeout(resolve, 1000))
      ])
    }
    
    hideLoading()
  } else {
    // Wait for window load event
    window.addEventListener('load', () => {
      requestAnimationFrame(() => {
        hideLoading()
      })
    }, { once: true })
    
    // Force hide after 2 seconds max (reduced from 3)
    pageReadyTimeout = setTimeout(() => {
      isLoading.value = false
    }, 2000)
  }
}

// Watch for route changes to show loading
if (process.client && router) {
  router.beforeEach((to: any, from: any, next: any) => {
    // Only show loading if navigating to a different route
    if (to.path !== from.path) {
      isLoading.value = true
      currentRoute.value = to.path
      
      // Clear any existing timeouts
      if (hideTimeout) {
        clearTimeout(hideTimeout)
      }
      if (pageReadyTimeout) {
        clearTimeout(pageReadyTimeout)
      }
    }
    next()
  })

  router.afterEach(async () => {
    // Wait for page to be fully ready before hiding loading
    await waitForPageReady()
  })
}

// Initial load
onMounted(async () => {
  if (process.client) {
    currentRoute.value = route.path
    await waitForPageReady()
  }
})

onBeforeUnmount(() => {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
  if (pageReadyTimeout) {
    clearTimeout(pageReadyTimeout)
  }
  if (process.client) {
    window.removeEventListener('load', hideLoading)
  }
})
</script>

<style scoped>
.app-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #ffffff;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.logo-container {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s ease-in-out infinite;
}

.loading-logo {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  animation: fadeIn 0.5s ease-in;
}

.loading-message {
  font-size: 16px;
  color: #333;
  font-weight: 500;
  text-align: center;
  margin-top: 10px;
}

.loading-spinner {
  margin-top: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

/* Loading transition */
.loading-enter-active,
.loading-leave-active {
  transition: opacity 0.3s ease;
}

.loading-enter-from,
.loading-leave-to {
  opacity: 0;
}

/* RTL support */
html[dir="rtl"] .app-loading {
  direction: rtl;
}
</style>

