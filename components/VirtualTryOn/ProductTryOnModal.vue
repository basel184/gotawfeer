<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="vto-modal-overlay" @click.self="closeModal">
        <div class="vto-modal-container">
          <div class="vto-modal-header">
            <h3 class="vto-modal-title">
              <i class="fas fa-camera me-2"></i>
              جربي {{ productName }}
            </h3>
            <button @click="closeModal" class="vto-modal-close" aria-label="إغلاق">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="vto-modal-body">
            <MakeupTryOn 
              v-if="isOpen && initialShade"
              :initialShade="initialShade"
              :productShades="productShades"
            />
            
            <div v-else class="vto-modal-loading">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">جاري التحميل...</span>
              </div>
              <p class="mt-3">جاري تحميل التجربة الافتراضية...</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import MakeupTryOn from './MakeupTryOn.vue'

interface Shade {
  id: number
  color: string
  opacity: number
  type: string
  name: string
}

interface Props {
  isOpen: boolean
  productName: string
  initialShade: Shade | null
  productShades?: Shade[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

// Watch for changes
watch(() => props.initialShade, (newShade) => {
  console.log('[ProductTryOnModal] Initial shade changed:', newShade)
})

watch(() => props.isOpen, (isOpen) => {
  console.log('[ProductTryOnModal] Modal open state:', isOpen)
  console.log('[ProductTryOnModal] Initial shade:', props.initialShade)
})

const closeModal = () => {
  emit('close')
}

// Close modal on ESC key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    closeModal()
  }
}

// Add/remove event listener
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', handleKeydown)
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = ''
  }
})

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.vto-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 9999999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow-y: auto;
}

.vto-modal-container {
  background: white;
  border-radius: 1.5rem;
  max-width: 95vw;
  max-height: 95vh;
  width: 100%;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.vto-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: #2575ba;
  color: white;
}

.vto-modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  display: flex;
  align-items: center;
}

.vto-modal-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  font-size: 1.25rem;
  transition: all 0.2s;
}

.vto-modal-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.vto-modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.vto-modal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #64748b;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .vto-modal-container,
.modal-leave-active .vto-modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .vto-modal-container,
.modal-leave-to .vto-modal-container {
  transform: scale(0.9);
}

/* Responsive */
@media (max-width: 768px) {
  .vto-modal-container {
    max-width: 100vw;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .vto-modal-header {
    padding: 1rem;
  }
  
  .vto-modal-title {
    font-size: 1rem;
  }
  
  .vto-modal-body {
    padding: 1rem;
  }
}
</style>
