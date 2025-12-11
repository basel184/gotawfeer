<template>
  <div class="floating-buttons">
    <!-- Scroll to Top Button -->
    <a 
      v-show="showScrollTop"
      @click.prevent="scrollToTop" 
      class="arrow-up d-flex align-items-center justify-content-center" 
      id="scrollTopBtn"
      role="button"
      :aria-label="t('home.back_to_top')"
    >
      <i class="fa-solid fa-chevron-up"></i>
    </a>
    
    <!-- WhatsApp Button -->
    <a 
      href="https://wa.me/966537030838" 
      target="_blank" 
      rel="noopener noreferrer"
      class="whatsapp d-flex align-items-center justify-content-center"
      :aria-label="t('whatsapp_contact') || 'Contact us on WhatsApp'"
    >
      <i class="fa-brands fa-whatsapp"></i>
    </a>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Scroll to top button state
const showScrollTop = ref(false)

// Scroll to top function
const scrollToTop = () => {
  if (process.client) {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}

// Handle scroll event to show/hide button
const handleScroll = () => {
  if (process.client) {
    showScrollTop.value = window.scrollY > 300
  }
}

// Add scroll event listener
onMounted(() => {
  if (process.client) {
    window.addEventListener('scroll', handleScroll)
    // Check initial scroll position
    handleScroll()
  }
})

// Remove scroll event listener
onBeforeUnmount(() => {
  if (process.client) {
    window.removeEventListener('scroll', handleScroll)
  }
})
</script>

<style scoped>

.arrow-up,
.whatsapp {
  pointer-events: auto;
  position: fixed;
  background: #2675BA;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow-up {
  bottom: 100px;
  left: 20px;
  width: 50px;
  height: 50px;
}

.arrow-up:hover {
  background: #e06a2e;
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(245, 128, 64, 0.4);
}

.arrow-up i {
  font-size: 20px;
}

.whatsapp {
  bottom: 20px;
  left: 20px;
  width: 50px;
  height: 50px;
  background: #25D366;
}

.whatsapp:hover {
  background: #20ba5a;
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(37, 211, 102, 0.4);
}

.whatsapp i {
  font-size: 24px;
}



/* Mobile Responsive */
@media (max-width: 768px) {
  .arrow-up {
    bottom: 90px;
    left: 15px;
    width: 45px;
    height: 45px;
  }

  .whatsapp {
    bottom: 15px;
    left: 15px;
    width: 45px;
    height: 45px;
  }


}
html[dir="ltr"] .arrow-up,
html[dir="ltr"] .whatsapp {
  left: auto;
  right: 20px;
}
html[dir="rtl"] .arrow-up,
html[dir="rtl"] .whatsapp {
  left: 20px;
  right: auto;
}
</style>

