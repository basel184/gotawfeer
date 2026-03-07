<script setup lang="ts">
/**
 * MakeupTryOn.vue
 * Virtual Makeup Try-On component powered by YouCam Makeup API (Perfect Corp).
 */
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'

interface Shade {
  color: string
  colorIntensity: number
  type: string
  name?: string
  id?: number
  texture?: string
  pattern?: string
  isImageColor?: boolean
}

const props = defineProps<{
  initialShade?: Shade
  productShades?: Shade[]
}>()

// --- State ---
const isCameraMode = ref(false)
const isLoading = ref(true)
const isProcessing = ref(false)
const cameraError = ref<string | null>(null)
const activeModelUrl = ref<string | null>(null)
const sourceImageUrl = ref<string | null>(null)
const resultImageUrl = ref<string | null>(null)
const currentShade = ref<Shade>(props.initialShade || {
  id: 1, color: "#C2185B", colorIntensity: 60, type: "lip_color", name: "توتي وردي", texture: "matte"
})

// Contour placements (YouCam pattern names)
const contourPlacement = ref('OvalFace6')
const contourPlacements = [
  { id: 'OvalFace6', name: 'افتراضي', image: 'https://loreal-cms-public.modiface.com/cmswebservice-linux/production/data/placement_images/320x320/contour_default.png' },
  { id: 'HeartFace2', name: 'قلب', image: 'https://loreal-cms-public.modiface.com/cmswebservice-linux/production/data/placement_images/320x320/contour_forehead_side2.png' },
  { id: 'RoundFace4', name: 'دائري', image: 'https://loreal-cms-public.modiface.com/cmswebservice-linux/production/data/placement_images/320x320/contour_inner_eyebrow.png' }
]

// Eyeliner placements (YouCam pattern names)
const eyelinerPlacement = ref('Arabic3')
const eyelinerPlacements = [
  { id: 'Arabic3', name: 'طبيعي', image: 'https://loreal-cms-public.modiface.com/cmswebservice-linux/production/data/placement_images/320x320/eyeliner_natural_top.png' },
  { id: '2colors1', name: 'جناح صغير', image: 'https://loreal-cms-public.modiface.com/cmswebservice-linux/production/data/placement_images/320x320/eyeliner_extrasmallwinged_top.png' },
  { id: '3colors2', name: 'جلام', image: 'https://loreal-cms-public.modiface.com/cmswebservice-linux/production/data/placement_images/320x320/eyeliner_fringe_glam.png' }
]

// --- Refs ---
const videoRef = ref<HTMLVideoElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const categoryScrollRef = ref<HTMLElement | null>(null)
const modelsScrollRef = ref<HTMLElement | null>(null)

const scrollContainer = (refEl: HTMLElement | null, direction: 'left' | 'right') => {
  if (!refEl) return
  refEl.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' })
}

// --- YouCam API: Build Effects Payload ---
// Confirmed working format: array of {category, palettes}, color="#RRGGBB", colorIntensity camelCase 0-100
const buildEffects = (): any[] => {
  const s = currentShade.value

  switch (s.type) {
    case 'foundation':
      return [{
        category: 'foundation',
        palettes: [{ color: s.color, colorIntensity: s.colorIntensity }]
      }]
    case 'contour':
      return [{
        category: 'contour',
        pattern: { name: contourPlacement.value },
        palettes: [{ color: s.color, colorIntensity: s.colorIntensity }]
      }]
    case 'concealer':
      return [{
        category: 'concealer',
        palettes: [{
          color: s.color,
          colorIntensity: s.colorIntensity,
          colorUnderEyeIntensity: s.colorIntensity,
          coverageLevel: 50
        }]
      }]
    case 'blush':
      return [{
        category: 'blush',
        pattern: { name: s.pattern || '1color1' },
        palettes: [{ color: s.color, texture: s.texture || 'matte', colorIntensity: s.colorIntensity }]
      }]
    case 'lip_color':
      return [{
        category: 'lip_color',
        palettes: [{ color: s.color, texture: s.texture || 'matte', colorIntensity: s.colorIntensity }]
      }]
    case 'lip_liner':
      return [{
        category: 'lip_liner',
        pattern: { name: s.pattern || 'LipLiner1' },
        palettes: [{ color: s.color, colorIntensity: s.colorIntensity }]
      }]
    case 'eye_shadow':
      return [{
        category: 'eye_shadow',
        pattern: { name: s.pattern || '1color1' },
        palettes: [{ color: s.color, texture: s.texture || 'matte', colorIntensity: s.colorIntensity }]
      }]
    case 'eye_liner':
      return [{
        category: 'eye_liner',
        pattern: { name: eyelinerPlacement.value },
        palettes: [{ color: s.color, texture: 'matte', colorIntensity: s.colorIntensity }]
      }]
    case 'eyelashes':
      return [{
        category: 'eyelashes',
        pattern: { name: s.pattern || 'Natural1' },
        palettes: [{ color: s.color, colorIntensity: s.colorIntensity }]
      }]
    case 'eyebrows':
      return [{
        category: 'eyebrows',
        palettes: [{ color: s.color, colorIntensity: s.colorIntensity }]
      }]
    case 'bronzer':
      return [{
        category: 'bronzer',
        pattern: { name: s.pattern || '1color1' },
        palettes: [{ color: s.color, texture: s.texture || 'matte', colorIntensity: s.colorIntensity }]
      }]
    case 'highlight':
      return [{
        category: 'highlight',
        pattern: { name: s.pattern || '1color1' },
        palettes: [{ color: s.color, texture: s.texture || 'shimmer', colorIntensity: s.colorIntensity }]
      }]
    case 'skin':
      return [{
        category: 'skin',
        palettes: [{ color: s.color, colorIntensity: s.colorIntensity }]
      }]
    default:
      return []
  }
}

// --- YouCam API: Apply Makeup ---
const applyMakeup = async () => {
  if (!sourceImageUrl.value) return
  isProcessing.value = true
  cameraError.value = null

  try {
    const taskBody: any = {
      effects: buildEffects(),
      version: '1.0'           // required by YouCam API
    }

    // If source is a data URL (camera/upload), upload to YouCam first
    if (sourceImageUrl.value.startsWith('data:')) {
      const uploadRes: any = await $fetch('/api/youcam/upload', {
        method: 'POST',
        body: { imageBase64: sourceImageUrl.value, file_name: 'selfie.jpg', content_type: 'image/jpeg' }
      })
      if (!uploadRes?.file_id) throw new Error('فشل رفع الصورة')
      taskBody.src_file_id = uploadRes.file_id
    } else {
      taskBody.src_file_url = sourceImageUrl.value
    }

    // Start task
    const taskRes: any = await $fetch('/api/youcam/task', { method: 'POST', body: taskBody })
    if (!taskRes?.data?.task_id) throw new Error('لم يتم استلام معرف المهمة')

    // Poll for results
    const taskId = taskRes.data.task_id
    let attempts = 0
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 1500))
      const status: any = await $fetch(`/api/youcam/status/${taskId}`)
      if (status?.data?.task_status === 'success') {
        resultImageUrl.value = status.data.results?.url || status.data.results?.[0]?.download_url
        return
      }
      if (status?.data?.task_status === 'error') {
        throw new Error(status.data.error_message || status.data.error || 'فشلت المعالجة')
      }
      attempts++
    }
    throw new Error('انتهت مهلة المعالجة')
  } catch (err: any) {
    console.error('[MakeupTryOn] Error:', err)
    cameraError.value = err.message || 'حدث خطأ أثناء المعالجة'
  } finally {
    isProcessing.value = false
  }
}

// Debounce
let applyTimeout: any = null
const debouncedApply = () => {
  if (applyTimeout) clearTimeout(applyTimeout)
  applyTimeout = setTimeout(() => applyMakeup(), 500)
}

// --- Mode Management ---
let mediaStream: MediaStream | null = null

const startCamera = async () => {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
      await videoRef.value.play()
    }
  } catch {
    cameraError.value = 'غير قادر على تشغيل الكاميرا'
  }
}

const stopCamera = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop())
    mediaStream = null
  }
}

const capturePhoto = () => {
  if (!videoRef.value) return
  const canvas = document.createElement('canvas')
  canvas.width = videoRef.value.videoWidth
  canvas.height = videoRef.value.videoHeight
  canvas.getContext('2d')?.drawImage(videoRef.value, 0, 0)
  sourceImageUrl.value = canvas.toDataURL('image/jpeg', 0.9)
  stopCamera()
  isCameraMode.value = false
  applyMakeup()
}

const toggleMode = async (mode: 'camera' | 'upload' | 'model', modelUrl?: string) => {
  isLoading.value = true
  cameraError.value = null
  resultImageUrl.value = null
  stopCamera()

  if (mode === 'camera') {
    isCameraMode.value = true
    activeModelUrl.value = null
    sourceImageUrl.value = null
    await startCamera()
  } else if (mode === 'upload') {
    isCameraMode.value = false
    activeModelUrl.value = null
    fileInputRef.value?.click()
  } else if (mode === 'model' && modelUrl) {
    isCameraMode.value = false
    activeModelUrl.value = modelUrl
    sourceImageUrl.value = `https://admin.gotawfeer.com${modelUrl}`
    await applyMakeup()
  }

  isLoading.value = false
}

const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    sourceImageUrl.value = e.target?.result as string
    isCameraMode.value = false
    activeModelUrl.value = null
    applyMakeup()
  }
  reader.readAsDataURL(file)
}

// --- Watchers ---
watch(currentShade, () => { if (sourceImageUrl.value) debouncedApply() }, { deep: true })
watch(contourPlacement, () => { if (sourceImageUrl.value && currentShade.value.type === 'contour') debouncedApply() })
watch(eyelinerPlacement, () => { if (sourceImageUrl.value && currentShade.value.type === 'eye_liner') debouncedApply() })

// --- Lifecycle ---
onMounted(async () => {
  if (modelLibrary.length > 0) {
    await toggleMode('model', modelLibrary[0])
  }
})

onUnmounted(() => {
  stopCamera()
  if (applyTimeout) clearTimeout(applyTimeout)
})

// --- Data ---
const modelLibrary = [
  '/models-banners/model_0.png',
  '/models-banners/model_1.png',
  '/models-banners/model_2.png',
  '/models-banners/model_3.png',
  '/models-banners/model_4.png',
  '/models-banners/model_5.jpg',
  '/models-banners/model_6.jpg',
  '/models-banners/model_7.jpg',
  '/models-banners/model_8.jpg',
]

const categories = [
  { id: 'foundation', name: 'كريم أساس', icon: 'fas fa-magic' },
  { id: 'contour', name: 'كونتور', icon: 'fas fa-mask' },
  { id: 'bronzer', name: 'برونزر', icon: 'fas fa-sun' },
  { id: 'concealer', name: 'كونسيلر', icon: 'fas fa-eye' },
  { id: 'highlight', name: 'هايلايتر', icon: 'fas fa-star' },
  { id: 'blush', name: 'بلاشر', icon: 'fas fa-smile' },
  { id: 'lip_color', name: 'أحمر شفاه', icon: 'fas fa-palette' },
  { id: 'lip_liner', name: 'محدد شفاه', icon: 'fas fa-pen' },
  { id: 'eye_shadow', name: 'ظلال عيون', icon: 'fas fa-eye-slash' },
  { id: 'eye_liner', name: 'كحل / آيلاينر', icon: 'fas fa-paint-brush' },
  { id: 'eyelashes', name: 'رموش / ماسكارا', icon: 'fas fa-eye' },
  { id: 'eyebrows', name: 'حواجب', icon: 'fas fa-minus' },
  { id: 'skin', name: 'بشرة', icon: 'fas fa-hand-sparkles' }
]

const activeCategory = ref(props.initialShade?.type || 'lip_color')

const defaultShades: Shade[] = [
  { id: 101, color: "#F5DEB3", colorIntensity: 40, type: "foundation", name: "رملي فاتح", texture: "matte" },
  { id: 102, color: "#D2B48C", colorIntensity: 50, type: "foundation", name: "بيج دافئ", texture: "matte" },
  { id: 103, color: "#C4A882", colorIntensity: 55, type: "foundation", name: "عسلي", texture: "matte" },
  { id: 201, color: "#8B4513", colorIntensity: 40, type: "contour", name: "نحت عميق" },
  { id: 202, color: "#A0522D", colorIntensity: 35, type: "contour", name: "نحت خفيف" },
  { id: 211, color: "#C4813A", colorIntensity: 40, type: "bronzer", name: "برونزر دافئ", texture: "matte", pattern: "1color1" },
  { id: 212, color: "#A0522D", colorIntensity: 35, type: "bronzer", name: "برونزر عميق", texture: "matte", pattern: "1color1" },
  { id: 213, color: "#D2691E", colorIntensity: 30, type: "bronzer", name: "برونزر ذهبي", texture: "shimmer", pattern: "1color1" },
  { id: 301, color: "#FFE4C4", colorIntensity: 50, type: "concealer", name: "إشراق" },
  { id: 302, color: "#FFDAB9", colorIntensity: 45, type: "concealer", name: "خوخي" },
  { id: 221, color: "#FFD700", colorIntensity: 40, type: "highlight", name: "ذهبي", texture: "shimmer", pattern: "1color1" },
  { id: 222, color: "#FFF8DC", colorIntensity: 35, type: "highlight", name: "شامبانيا", texture: "shimmer", pattern: "1color1" },
  { id: 223, color: "#FFB6C1", colorIntensity: 30, type: "highlight", name: "وردي ألماسي", texture: "shimmer", pattern: "1color1" },
  { id: 401, color: "#f48fb1", colorIntensity: 50, type: "blush", name: "وردي طبيعي", texture: "matte", pattern: "1color1" },
  { id: 402, color: "#e91e63", colorIntensity: 45, type: "blush", name: "فوشيا", texture: "matte", pattern: "1color1" },
  { id: 403, color: "#ff8a80", colorIntensity: 40, type: "blush", name: "مرجاني", texture: "satin", pattern: "1color1" },
  { id: 1, color: "#C2185B", colorIntensity: 60, type: "lip_color", name: "توتي وردي", texture: "matte" },
  { id: 2, color: "#9D112E", colorIntensity: 65, type: "lip_color", name: "أحمر ملكي", texture: "matte" },
  { id: 3, color: "#B71C1C", colorIntensity: 70, type: "lip_color", name: "أحمر كلاسيكي", texture: "gloss" },
  { id: 4, color: "#880E4F", colorIntensity: 60, type: "lip_color", name: "بنفسجي غامق", texture: "satin" },
  { id: 5, color: "#D4756B", colorIntensity: 50, type: "lip_color", name: "نود", texture: "matte" },
  { id: 601, color: "#5D101D", colorIntensity: 60, type: "lip_liner", name: "محدد داكن", texture: "matte", pattern: "LipLiner1" },
  { id: 602, color: "#8B4513", colorIntensity: 55, type: "lip_liner", name: "بني", texture: "matte", pattern: "LipLiner1" },
  { id: 701, color: "#4A235A", colorIntensity: 50, type: "eye_shadow", name: "بنفسجي سموكي", texture: "matte", pattern: "1color1" },
  { id: 702, color: "#795548", colorIntensity: 45, type: "eye_shadow", name: "بني دافئ", texture: "shimmer", pattern: "1color1" },
  { id: 703, color: "#1a237e", colorIntensity: 50, type: "eye_shadow", name: "أزرق ليلي", texture: "metallic", pattern: "1color1" },
  { id: 801, color: "#000000", colorIntensity: 70, type: "eye_liner", name: "أسود حبر", texture: "matte" },
  { id: 802, color: "#3E2723", colorIntensity: 60, type: "eye_liner", name: "بني غامق", texture: "matte" },
  { id: 901, color: "#111111", colorIntensity: 70, type: "eyelashes", name: "كثيف أسود", pattern: "Natural1" },
  { id: 902, color: "#000000", colorIntensity: 80, type: "eyelashes", name: "درامي", pattern: "UpperDense1" },
  { id: 1001, color: "#3E2723", colorIntensity: 55, type: "eyebrows", name: "بني غامق" },
  { id: 1002, color: "#1B1B1B", colorIntensity: 50, type: "eyebrows", name: "أسود" },
  { id: 1101, color: "#F5DEB3", colorIntensity: 40, type: "skin", name: "فاتح" },
  { id: 1102, color: "#D2B48C", colorIntensity: 45, type: "skin", name: "بيج" },
  { id: 1103, color: "#C4A882", colorIntensity: 50, type: "skin", name: "عسلي" }
]

const availableShades = ref<Shade[]>(
  props.productShades && props.productShades.length > 0
    ? props.productShades
    : defaultShades
)

const filteredShades = computed(() => availableShades.value.filter(s => s.type === activeCategory.value))
const selectShade = (shade: Shade) => currentShade.value = shade
watch(activeCategory, (newCat) => {
  const first = availableShades.value.find(s => s.type === newCat)
  if (first) currentShade.value = first
})
</script>

<template>
  <div class="vto-widget">
    <div class="vto-display">
      <div class="vto-main-canvas-container card">
        <!-- Loading / Processing / Error Overlay -->
        <div v-if="isLoading || isProcessing || cameraError" class="overlay">
          <div v-if="cameraError" class="error-msg">
            <i class="fas fa-exclamation-circle text-danger mb-3" style="font-size: 2rem;"></i>
            <p>{{ cameraError }}</p>
            <button @click="cameraError = null" class="btn btn-sm btn-outline-light rounded-pill px-4 mt-2">حاول مرة أخرى</button>
          </div>
          <div v-else class="loader-content">
            <div class="vto-spinner"></div>
            <p class="font-weight-bold">{{ isProcessing ? 'جاري تطبيق المكياج...' : 'تحميل...' }}</p>
          </div>
        </div>

        <!-- Camera Preview -->
        <video v-show="isCameraMode" ref="videoRef" class="vto-render" playsinline muted autoplay></video>

        <!-- Result Image -->
        <img v-if="resultImageUrl && !isCameraMode" :src="resultImageUrl" class="vto-render" alt="نتيجة المكياج" />

        <!-- Source Image (fallback when no result yet) -->
        <img v-else-if="sourceImageUrl && !sourceImageUrl.startsWith('data:') && !isCameraMode" :src="sourceImageUrl" class="vto-render" alt="الصورة الأصلية" />

        <!-- Camera Capture Button -->
        <button v-if="isCameraMode" class="capture-btn" @click="capturePhoto">
          <i class="fas fa-camera"></i>
          <span>التقاط صورة</span>
        </button>

        <!-- Mode Tabs -->
        <div class="vto-mode-tabs">
          <button @click="toggleMode('camera')" :class="{ active: isCameraMode }">كاميرا</button>
          <button @click="toggleMode('upload')" :class="{ active: !isCameraMode && !activeModelUrl }">رفع صورة</button>
        </div>

        <!-- Hidden File Input -->
        <input ref="fileInputRef" type="file" accept="image/*" class="d-none" @change="handleFileUpload" />
      </div>

      <!-- Model Bar -->
      <div class="models-bar card shadow-sm mt-3">
        <div class="slider-header-with-nav">
          <span class="bar-label">أو جربي على عارضة:</span>
          <div class="slider-nav">
            <button @click="scrollContainer(modelsScrollRef, 'left')" class="nav-arrow"><i class="fas fa-chevron-right"></i></button>
            <button @click="scrollContainer(modelsScrollRef, 'right')" class="nav-arrow"><i class="fas fa-chevron-left"></i></button>
          </div>
        </div>
        <div class="models-scroll" ref="modelsScrollRef">
          <div v-for="(mUrl, idx) in modelLibrary" :key="idx" class="model-thumb" :class="{ selected: activeModelUrl === mUrl }" @click="toggleMode('model', mUrl)">
            <img :src="mUrl" alt="Model" />
          </div>
        </div>
      </div>
    </div>

    <!-- Sidebar -->
    <div class="vto-sidebar card shadow-lg">
      <div class="category-slider-wrapper d-none">
        <button @click="scrollContainer(categoryScrollRef, 'left')" class="slider-arrow left"><i class="fas fa-chevron-right"></i></button>
        <div class="category-tabs" ref="categoryScrollRef">
          <button v-for="cat in categories" :key="cat.id" class="cat-tab" :class="{ active: activeCategory === cat.id }" @click="activeCategory = cat.id">
            <i :class="cat.icon"></i><span>{{ cat.name }}</span>
          </button>
        </div>
        <button @click="scrollContainer(categoryScrollRef, 'right')" class="slider-arrow right"><i class="fas fa-chevron-left"></i></button>
      </div>

      <div class="current-product">
        <span class="category">{{ categories.find(c => c.id === activeCategory)?.name }}</span>
        <h4>{{ currentShade.name }}</h4>
      </div>

      <div class="shade-picker">
        <label>اختر الدرجة:</label>
        <div class="shades-grid">
          <button v-for="shade in filteredShades" :key="shade.id" class="shade-btn" :class="{ selected: currentShade.id === shade.id }" :style="{ backgroundColor: shade.color }" @click="selectShade(shade)">
            <i v-if="currentShade.id === shade.id" class="fas fa-check"></i>
          </button>
        </div>
      </div>

      <!-- Contour Placement -->
      <div v-if="activeCategory === 'contour'" class="contour-placement-picker">
        <label>اختر مكان الكونتور:</label>
        <div class="placement-grid">
          <button v-for="p in contourPlacements" :key="p.id" class="placement-btn" :class="{ selected: contourPlacement === p.id }" @click="contourPlacement = p.id">
            <img :src="p.image" :alt="p.name" />
            <span>{{ p.name }}</span>
            <i v-if="contourPlacement === p.id" class="fas fa-check-circle"></i>
          </button>
        </div>
      </div>

      <!-- Eyeliner Placement -->
      <div v-if="activeCategory === 'eye_liner'" class="eyeliner-placement-picker">
        <label>اختر نمط الآيلاينر:</label>
        <div class="placement-grid">
          <button v-for="p in eyelinerPlacements" :key="p.id" class="placement-btn" :class="{ selected: eyelinerPlacement === p.id }" @click="eyelinerPlacement = p.id">
            <img :src="p.image" :alt="p.name" />
            <span>{{ p.name }}</span>
            <i v-if="eyelinerPlacement === p.id" class="fas fa-check-circle"></i>
          </button>
        </div>
      </div>

      <div class="intensity-slider">
        <div class="slider-header"><label>حدة اللون</label><span>{{ currentShade.colorIntensity }}%</span></div>
        <input type="range" v-model.number="currentShade.colorIntensity" min="10" max="100" step="5" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.vto-widget { 
  display: grid; 
  grid-template-columns: 1fr 520px; 
  gap: 1.25rem; 
  padding: 0.75rem; 
  max-width: 100%; 
  margin: 0 auto;
  height: 520px;
}
@media (max-width: 991px) { .vto-widget { grid-template-columns: 1fr; height: auto;} }
.vto-display { display: flex; flex-direction: column; overflow: hidden; }
.vto-main-canvas-container { 
  position: relative; 
  background: #000; 
  border-radius: 1.25rem; 
  overflow: hidden; 
  aspect-ratio: 1/1;
  box-shadow: 0 20px 40px rgba(0,0,0,0.15); 
}
.vto-render { width: 100%; height: 100%; object-fit: contain; }
.vto-mode-tabs { position: absolute; top: 1.25rem; left: 50%; transform: translateX(-50%); display: flex; background: rgba(0,0,0,0.5); backdrop-filter: blur(10px); padding: 0.3rem; border-radius: 2rem; z-index: 5; }
.vto-mode-tabs button { background: transparent; border: none; color: white; padding: 0.5rem 1.25rem; border-radius: 1.5rem; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
.vto-mode-tabs button.active { background: #C2185B; }

.capture-btn {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: #C2185B;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 2rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 5;
  box-shadow: 0 4px 15px rgba(194, 24, 91, 0.4);
  transition: transform 0.2s;
}
.capture-btn:hover { transform: translateX(-50%) scale(1.05); }
.capture-btn i { font-size: 1.2rem; }

.models-bar { padding: 0.75rem 1rem; border-radius: 1rem; background: white; border: none; }
.slider-header-with-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.bar-label { font-size: 0.8rem; font-weight: 700; color: #64748b; margin: 0; }
.slider-nav { display: flex; gap: 0.25rem; }
.nav-arrow { background: #f1f5f9; border: none; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #64748b; cursor: pointer; transition: background 0.2s; }
.nav-arrow:hover { background: #e2e8f0; color: #C2185B; }

.models-scroll { display: flex; gap: 0.8rem; overflow-x: auto; padding-bottom: 0.5rem; scrollbar-width: none; scroll-behavior: smooth; }
.models-scroll::-webkit-scrollbar { display: none; }

.model-thumb { flex: 0 0 55px; height: 55px; border-radius: 0.75rem; overflow: hidden; cursor: pointer; border: 2px solid transparent; }
.model-thumb.selected { border-color: #C2185B; transform: scale(1.05); }
.model-thumb img { width: 100%; height: 100%; object-fit: cover; }

.vto-sidebar { padding: 1.25rem; border-radius: 1.25rem; background: white; display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; }

.category-slider-wrapper { position: relative; display: flex; align-items: center; gap: 0.25rem; }
.slider-arrow { background: white; border: 1px solid #f1f5f9; width: 20px; height: 35px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: #64748b; cursor: pointer; z-index: 2; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.slider-arrow:hover { color: #C2185B; border-color: #C2185B; }

.category-tabs { display: flex; gap: 0.4rem; background: #f8fafc; padding: 0.3rem; border-radius: 1rem; overflow-x: auto; scrollbar-width: none; scroll-behavior: smooth; flex: 1; }
.cat-tab { flex: 0 0 auto; min-width: 80px; background: transparent; border: none; padding: 0.75rem 0.5rem; border-radius: 0.75rem; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; font-size: 0.7rem; font-weight: 700; color: #64748b; cursor: pointer; }
.cat-tab.active { background: white; color: #C2185B; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

.cat-tab i { font-size: 1.1rem; }
.category { font-size: 0.85rem; color: #C2185B; font-weight: 700; display: block; margin-bottom: 0.4rem; }
.current-product h4 { font-weight: 800; margin: 0; color: #1e293b; }
.shade-picker label { font-weight: 700; color: #475569; margin-bottom: 1rem; display: block; }
.shades-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 0.8rem; }
.shade-btn { aspect-ratio: 1; border-radius: 50%; border: 2px solid transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; background-size: cover; background-position: center; }
.shade-btn.selected { border-color: #1e293b; box-shadow: 0 0 0 3px rgba(194, 24, 91, 0.3); }
.shade-btn.image-color { background-repeat: no-repeat; }
.intensity-slider .slider-header { display: flex; justify-content: space-between; margin-bottom: 0.8rem; }
.intensity-slider label { font-weight: 700; color: #475569; }
.intensity-slider input { width: 100%; accent-color: #C2185B; }
.btn-primary { background-color: #C2185B; border-color: #C2185B; color: white; }
.vto-spinner { width: 2.5rem; height: 2.5rem; border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid #C2185B; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { 100% { transform: rotate(360deg); } }
.overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10; color: white; text-align: center; }

/* Contour Placement Picker */
.contour-placement-picker {
  margin: 1.5rem 0;
  padding: 1rem;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 12px;
}
.contour-placement-picker label {
  display: block;
  font-weight: 600;
  font-size: 0.95rem;
  color: #495057;
  margin-bottom: 0.75rem;
}
.placement-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}
.placement-btn {
  position: relative;
  background: white;
  border: 2px solid #dee2e6;
  border-radius: 10px;
  padding: 0.75rem 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.placement-btn img {
  width: 60px;
  height: 60px;
  object-fit: contain;
  border-radius: 8px;
}
.placement-btn span {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6c757d;
  text-align: center;
}
.placement-btn i.fa-check-circle {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  color: #28a745;
  font-size: 1.1rem;
}
.placement-btn:hover {
  border-color: #C2185B;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(194, 24, 91, 0.2);
}
.placement-btn.selected {
  border-color: #C2185B;
  background: linear-gradient(135deg, #fff5f8, #ffe6f0);
  box-shadow: 0 4px 12px rgba(194, 24, 91, 0.3);
}
.placement-btn.selected span {
  color: #C2185B;
  font-weight: 600;
}

@media (max-width: 768px) {
  .placement-grid { gap: 0.5rem; }
  .placement-btn { padding: 0.5rem 0.25rem; }
  .placement-btn img { width: 50px; height: 50px; }
  .placement-btn span { font-size: 0.7rem; }
}

/* Eyeliner Placement Picker */
.eyeliner-placement-picker {
  margin: 1.5rem 0;
  padding: 1rem;
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  border-radius: 12px;
}
.eyeliner-placement-picker label {
  display: block;
  font-weight: 600;
  font-size: 0.95rem;
  color: #1565c0;
  margin-bottom: 0.75rem;
}
</style>
