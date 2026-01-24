import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(() => {
  // Import Bootstrap CSS and JS
  if (process.client) {
    // CSS is already loaded via app.vue
    // Load Bootstrap JS from CDN
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js'
    script.async = true
    document.head.appendChild(script)
  }
})
