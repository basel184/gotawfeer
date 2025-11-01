<template>
  <div class="camera-capture">
    <div class="camera-container">
      <!-- Video Element -->
      <video
        ref="videoRef"
        class="camera-video"
        :class="{ 'is-active': isActive }"
        autoplay
        muted
        playsinline
      ></video>
      
      <!-- Canvas for Photo Capture -->
      <canvas ref="canvasRef" class="hidden"></canvas>
      
      <!-- Camera Controls -->
      <div class="camera-controls" v-if="isActive">
        <button
          @click="capturePhoto"
          class="capture-btn"
          :disabled="isCapturing"
        >
          <i class="fas fa-camera" v-if="!isCapturing"></i>
          <i class="fas fa-spinner fa-spin" v-else></i>
        </button>
        
        <button @click="switchCamera" class="switch-btn" v-if="cameras.length > 1">
          <i class="fas fa-sync-alt"></i>
        </button>
      </div>
      
      <!-- Camera Selection -->
      <div class="camera-selection" v-if="cameras.length > 1 && !isActive">
        <select v-model="selectedCamera" @change="onCameraChange">
          <option value="">اختر الكاميرا</option>
          <option
            v-for="camera in cameras"
            :key="camera.deviceId"
            :value="camera.deviceId"
          >
            {{ camera.label || `Camera ${camera.deviceId.slice(0, 8)}` }}
          </option>
        </select>
      </div>
    </div>
    
    <!-- Instructions -->
    <div class="instructions" v-if="!isActive">
      <div class="instruction-card">
        <i class="fas fa-camera"></i>
        <h3>التقاط صورة للتجربة الافتراضية</h3>
        <p>تأكد من:</p>
        <ul>
          <li>الوقوف في وضع مستقيم</li>
          <li>الإضاءة جيدة</li>
          <li>الملابس واضحة ومريحة</li>
          <li>الخلفية بسيطة</li>
        </ul>
        <button @click="startCameraHandler" class="start-btn" :disabled="!isSupported || isLoading">
          <i class="fas fa-play" v-if="!isLoading"></i>
          <i class="fas fa-spinner fa-spin" v-else></i>
          {{ isLoading ? 'جاري التحميل...' : 'بدء الكاميرا' }}
        </button>
      </div>
    </div>
    
    <!-- Error Message -->
    <div class="error-message" v-if="error">
      <i class="fas fa-exclamation-triangle"></i>
      <p>{{ error }}</p>
      <button @click="retry" class="retry-btn">إعادة المحاولة</button>
    </div>
    
    <!-- Loading Overlay -->
    <div class="loading-overlay" v-if="isLoading">
      <div class="spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  onPhotoCaptured?: (photo: File) => void
  onError?: (error: string) => void
}

const props = defineProps<Props>()

const emit = defineEmits<{
  photoCaptured: [photo: File]
  error: [error: string]
}>()

// Camera composable
const {
  isSupported,
  videoRef,
  canvasRef,
  error,
  isActive,
  checkCameraSupport,
  startCamera,
  stopCamera,
  capturePhotoAsFile,
  getAvailableCameras,
  switchCamera,
  cleanup
} = useCamera()

// Local state
const isCapturing = ref(false)
const isLoading = ref(false)
const loadingMessage = ref('')
const cameras = ref<MediaDeviceInfo[]>([])
const selectedCamera = ref('')
const currentCameraIndex = ref(0)

// Initialize
onMounted(async () => {
  isLoading.value = true
  loadingMessage.value = 'فحص دعم الكاميرا...'
  
  const supported = await checkCameraSupport()
  if (supported) {
    cameras.value = await getAvailableCameras()
    if (cameras.value.length > 0) {
      selectedCamera.value = cameras.value[0].deviceId
    }
  }
  
  isLoading.value = false
})

// Start camera
const startCameraHandler = async () => {
  isLoading.value = true
  loadingMessage.value = 'بدء الكاميرا...'
  
  const success = await startCamera({
    video: {
      deviceId: selectedCamera.value ? { exact: selectedCamera.value } : undefined,
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user'
    }
  })
  
  isLoading.value = false
  
  if (!success) {
    emit('error', error.value || 'فشل في بدء الكاميرا')
  }
}

// Capture photo
const capturePhoto = async () => {
  if (!isActive.value) return
  
  isCapturing.value = true
  
  try {
    const photoFile = await capturePhotoAsFile(`virtual-try-on-${Date.now()}.jpg`)
    
    // Emit the photo
    emit('photoCaptured', photoFile)
    
    // Call parent callback if provided
    if (props.onPhotoCaptured) {
      props.onPhotoCaptured(photoFile)
    }
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'فشل في التقاط الصورة'
    emit('error', errorMessage)
    
    if (props.onError) {
      props.onError(errorMessage)
    }
  } finally {
    isCapturing.value = false
  }
}

// Switch camera
const switchCameraHandler = async () => {
  if (cameras.value.length <= 1) return
  
  currentCameraIndex.value = (currentCameraIndex.value + 1) % cameras.value.length
  const nextCamera = cameras.value[currentCameraIndex.value]
  
  isLoading.value = true
  loadingMessage.value = 'تبديل الكاميرا...'
  
  const success = await switchCamera(nextCamera.deviceId)
  
  isLoading.value = false
  
  if (!success) {
    emit('error', 'فشل في تبديل الكاميرا')
  }
}

// Camera change handler
const onCameraChange = async () => {
  if (isActive.value) {
    await stopCamera()
  }
  
  if (selectedCamera.value) {
    await startCameraHandler()
  }
}

// Retry
const retry = async () => {
  await cleanup()
  await checkCameraSupport()
  cameras.value = await getAvailableCameras()
}

// Cleanup on unmount
onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.camera-capture {
  position: relative;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.camera-container {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* Mirror effect */
  transition: opacity 0.3s ease;
}

.camera-video.is-active {
  opacity: 1;
}

.camera-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 15px;
  align-items: center;
}

.capture-btn {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid #f58040;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #f58040;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.capture-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.capture-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #f58040;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #f58040;
  cursor: pointer;
  transition: all 0.3s ease;
}

.switch-btn:hover {
  background: #f58040;
  color: #fff;
}

.camera-selection {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
}

.camera-selection select {
  width: 100%;
  padding: 10px;
  border: 2px solid #f58040;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  color: #333;
}

.instructions {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.instruction-card {
  background: #fff;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  max-width: 300px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.instruction-card i {
  font-size: 48px;
  color: #f58040;
  margin-bottom: 20px;
}

.instruction-card h3 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 15px;
}

.instruction-card p {
  color: #666;
  margin-bottom: 10px;
}

.instruction-card ul {
  text-align: right;
  color: #666;
  margin-bottom: 20px;
  padding-right: 20px;
}

.instruction-card li {
  margin-bottom: 5px;
}

.start-btn {
  background: #f58040;
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
}

.start-btn:hover {
  background: #e67030;
  transform: translateY(-2px);
}

.start-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.error-message {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  background: #ff4444;
  color: #fff;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.error-message i {
  font-size: 24px;
}

.retry-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 1px solid #fff;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  background: #fff;
  color: #ff4444;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: #fff;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid #f58040;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.hidden {
  display: none;
}

.instructions {
  margin-top: 20px;
}

.instruction-card {
  background: #fff;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
}

.instruction-card i {
  font-size: 48px;
  color: #f58040;
  margin-bottom: 20px;
}

.instruction-card h3 {
  color: #333;
  margin-bottom: 15px;
  font-size: 24px;
}

.instruction-card p {
  color: #666;
  margin-bottom: 20px;
  font-size: 16px;
}

.instruction-card ul {
  list-style: none;
  padding: 0;
  margin: 0 0 30px 0;
  text-align: right;
}

.instruction-card li {
  color: #666;
  margin-bottom: 8px;
  padding: 5px 0;
  position: relative;
  padding-right: 20px;
}

.instruction-card li::before {
  content: "✓";
  color: #f58040;
  font-weight: bold;
  position: absolute;
  right: 0;
}

.start-btn {
  background: #f58040;
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.start-btn:hover:not(:disabled) {
  background: #e6733a;
  transform: translateY(-2px);
}

.start-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .camera-container {
    aspect-ratio: 4/5;
  }
  
  .instruction-card {
    padding: 20px;
    max-width: 250px;
  }
  
  .capture-btn {
    width: 60px;
    height: 60px;
    font-size: 20px;
  }
  
  .switch-btn {
    width: 45px;
    height: 45px;
    font-size: 16px;
  }
}
</style>
