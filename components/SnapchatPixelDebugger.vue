<template>
  <div v-if="isDevelopment" class="snapchat-debugger">
    <div class="debugger-header">
      <h3>🔍 Snapchat Pixel Debugger</h3>
      <button @click="toggleDebugger" class="toggle-btn">
        {{ isOpen ? '✕' : '⊕' }}
      </button>
    </div>

    <div v-if="isOpen" class="debugger-content">
      <div class="status-section">
        <h4>الحالة</h4>
        <p :class="{ 'status-ok': isSnaptrLoaded, 'status-error': !isSnaptrLoaded }">
          Snapchat Pixel: {{ isSnaptrLoaded ? '✓ محمّل' : '✗ غير محمّل' }}
        </p>
        <p :class="{ 'status-ok': isDataLayerReady, 'status-error': !isDataLayerReady }">
          DataLayer: {{ isDataLayerReady ? '✓ جاهز' : '✗ غير جاهز' }}
        </p>
        <p>العملة: <strong>{{ currency }}</strong></p>
      </div>

      <div class="events-section">
        <h4>الأحداث ({{ events.length }})</h4>
        <div class="events-list">
          <div v-for="(event, idx) in events.slice(-10)" :key="idx" class="event-item">
            <span class="event-name">{{ event.event }}</span>
            <span class="event-time">{{ formatTime(event.timestamp) }}</span>
          </div>
        </div>
      </div>

      <div class="actions-section">
        <h4>الإجراءات</h4>
        <button @click="testPageView" class="action-btn">اختبر PAGE_VIEW</button>
        <button @click="testAddToCart" class="action-btn">اختبر ADD_CART</button>
        <button @click="testPurchase" class="action-btn">اختبر PURCHASE</button>
        <button @click="clearEvents" class="action-btn danger">امسح الأحداث</button>
      </div>

      <div class="raw-data-section">
        <h4>البيانات الخام</h4>
        <pre>{{ JSON.stringify(events.slice(-3), null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const isDevelopment = process.env.NODE_ENV === 'development'
const isOpen = ref(false)
const events = ref<any[]>([])
const currency = ref('SAR')

const isSnaptrLoaded = computed(() => {
  return typeof window !== 'undefined' && typeof (window as any).snaptr === 'function'
})

const isDataLayerReady = computed(() => {
  return typeof window !== 'undefined' && Array.isArray((window as any).dataLayer)
})

const toggleDebugger = () => {
  isOpen.value = !isOpen.value
}

const formatTime = (timestamp: string) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('ar-SA')
}

const testPageView = () => {
  if ((window as any).snaptr) {
    (window as any).snaptr('track', 'PAGE_VIEW')
  }
  if ((window as any).pushToDataLayer) {
    (window as any).pushToDataLayer('PAGE_VIEW', { test: true })
  }
}

const testAddToCart = () => {
  if ((window as any).snaptr) {
    (window as any).snaptr('track', 'ADD_CART', {
      item_ids: ['TEST-001'],
      price: 99.99,
      currency: 'SAR'
    })
  }
  if ((window as any).pushToDataLayer) {
    (window as any).pushToDataLayer('ADD_CART', {
      item_ids: ['TEST-001'],
      price: 99.99,
      currency: 'SAR'
    })
  }
}

const testPurchase = () => {
  if ((window as any).snaptr) {
    (window as any).snaptr('track', 'PURCHASE', {
      transaction_id: 'TEST-' + Date.now(),
      price: 299.99,
      currency: 'SAR'
    })
  }
  if ((window as any).pushToDataLayer) {
    (window as any).pushToDataLayer('PURCHASE', {
      transaction_id: 'TEST-' + Date.now(),
      price: 299.99,
      currency: 'SAR'
    })
  }
}

const clearEvents = () => {
  if (typeof window !== 'undefined') {
    (window as any).dataLayer = []
    events.value = []
  }
}

onMounted(() => {
  // Watch DataLayer for changes
  const interval = setInterval(() => {
    if (typeof window !== 'undefined' && Array.isArray((window as any).dataLayer)) {
      events.value = (window as any).dataLayer
    }
  }, 500)
})
</script>

<style scoped>
.snapchat-debugger {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  border: 2px solid #fffc00;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-family: monospace;
  font-size: 12px;
  z-index: 9999;
  max-width: 400px;
}

.debugger-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #fffc00;
  color: #000;
  font-weight: bold;
  border-bottom: 2px solid #fffc00;
}

.debugger-header h3 {
  margin: 0;
  font-size: 14px;
}

.toggle-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.debugger-content {
  padding: 10px;
  max-height: 500px;
  overflow-y: auto;
}

.status-section,
.events-section,
.actions-section,
.raw-data-section {
  margin-bottom: 10px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.status-section h4,
.events-section h4,
.actions-section h4,
.raw-data-section h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: bold;
  color: #333;
}

.status-section p {
  margin: 4px 0;
  font-size: 11px;
}

.status-ok {
  color: #28a745;
}

.status-error {
  color: #dc3545;
}

.events-list {
  max-height: 150px;
  overflow-y: auto;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.event-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
  font-size: 11px;
}

.event-item:last-child {
  border-bottom: none;
}

.event-name {
  font-weight: bold;
  color: #0066cc;
}

.event-time {
  color: #666;
}

.actions-section {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.action-btn {
  flex: 1;
  min-width: 80px;
  padding: 6px 8px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
}

.action-btn:hover {
  background: #0052a3;
}

.action-btn.danger {
  background: #dc3545;
}

.action-btn.danger:hover {
  background: #c82333;
}

.raw-data-section pre {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  margin: 0;
  font-size: 10px;
  max-height: 150px;
  overflow-y: auto;
  color: #333;
}
</style>
