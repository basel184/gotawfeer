<script setup lang="ts">
/**
 * MakeupTryOn.vue
 * A high-performance Virtual Makeup Try-On component using MediaPipe Face Mesh.
 */
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { ThreeJSRenderer } from './renderers/ThreeJSRenderer'
import { TextureManager } from './renderers/TextureManager'

interface Shade {
  color: string
  opacity: number
  type: string
  name?: string
  id?: number
}

const props = defineProps<{
  initialShade?: Shade
  productShades?: Shade[]
}>()

// --- State Management ---
const isCameraMode = ref(true)
const isLoading = ref(true)
const isModelLoading = ref(true)
const cameraError = ref<string | null>(null)
const activeModelUrl = ref<string | null>(null)
const lastResults = ref<any>(null)
const currentShade = ref<Shade>(props.initialShade || {
  id: 1,
  color: "#C2185B",
  opacity: 0.55,
  type: "LIPSTICK",
  name: "Berry Pink"
})

// Contour placement options
const contourPlacement = ref('default')
const contourPlacements = [
  { id: 'default', name: 'افتراضي', image: 'https://loreal-cms-public.modiface.com/cmswebservice-linux/production/data/placement_images/320x320/contour_default.png' },
  { id: 'forehead', name: 'الجبهة', image: 'https://loreal-cms-public.modiface.com/cmswebservice-linux/production/data/placement_images/320x320/contour_forehead_side2.png' },
  { id: 'inner_eyebrow', name: 'بين الحواجب', image: 'https://loreal-cms-public.modiface.com/cmswebservice-linux/production/data/placement_images/320x320/contour_inner_eyebrow.png' }
]

// Eyeliner placement options
const eyelinerPlacement = ref('natural')
const eyelinerPlacements = [
  { id: 'natural', name: 'طبيعي', image: 'https://loreal-cms-public.modiface.com/cmswebservice-linux/production/data/placement_images/320x320/eyeliner_natural_top.png' },
  { id: 'small_winged', name: 'جناح صغير', image: 'https://loreal-cms-public.modiface.com/cmswebservice-linux/production/data/placement_images/320x320/eyeliner_extrasmallwinged_top.png' },
  { id: 'fringe_glam', name: 'جلام', image: 'https://loreal-cms-public.modiface.com/cmswebservice-linux/production/data/placement_images/320x320/eyeliner_fringe_glam.png' },
  { id: 'thick_winged', name: 'جناح عريض', image: 'https://loreal-cms-public.modiface.com/cmswebservice-linux/production/data/placement_images/320x320/eyeliner_wingedthick.png' },
  { id: 'cat_eye', name: 'عين القطة', image: 'https://loreal-cms-public.modiface.com/cmswebservice-linux/production/data/placement_images/320x320/eyeliner_cateye2_top.png' }
]



// --- Refs for HTML Elements ---
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const categoryScrollRef = ref<HTMLElement | null>(null)
const modelsScrollRef = ref<HTMLElement | null>(null)

/**
 * Scroll Helper
 */
const scrollContainer = (ref: HTMLElement | null, direction: 'left' | 'right') => {
  if (!ref) return
  const scrollAmount = 200
  ref.scrollBy({
    left: direction === 'left' ? -scrollAmount : scrollAmount,
    behavior: 'smooth'
  })
}

// --- MediaPipe & Canvas Vars ---
let faceMesh: any = null
let camera: any = null
let canvasCtx: CanvasRenderingContext2D | null = null

// --- Three.js Renderers ---
let threeRenderer: ThreeJSRenderer | null = null
let textureManager: TextureManager | null = null
const useThreeJS = ref(false) // Temporarily disabled until triangulation data is added

// --- Facial Landmark Indices ---
const LIP_OUTER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146]
const LIP_INNER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95]
const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10]
const LEFT_EYE_TOP = [226, 247, 30, 29, 27, 28, 56, 190, 243, 226]
const RIGHT_EYE_TOP = [446, 467, 260, 259, 257, 258, 286, 414, 463, 446]
const LEFT_LINER = [246, 161, 160, 159, 158, 157, 173]
const RIGHT_LINER = [466, 388, 387, 386, 385, 384, 398]
const LEFT_BROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
const RIGHT_BROW = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]
const LEFT_UNDER_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 243, 190, 56, 28, 27, 29, 30, 247, 130]
const RIGHT_UNDER_EYE = [263, 249, 390, 373, 374, 380, 381, 382, 362, 463, 414, 286, 258, 257, 259, 260, 467, 359]

/**
 * Initialize Three.js Renderer
 */
const initThreeJS = () => {
  if (!canvasRef.value || !videoRef.value) return
  
  try {
    threeRenderer = new ThreeJSRenderer(canvasRef.value, videoRef.value)
    textureManager = new TextureManager()
    console.log('✅ Three.js renderer initialized')
  } catch (error) {
    console.error('❌ Failed to initialize Three.js:', error)
    useThreeJS.value = false // Fallback to canvas 2D
  }
}

/**
 * Initialize MediaPipe Face Mesh
 */
const initFaceMesh = async () => {
  if (process.server) return
  const scripts = [
    'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
    'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
  ]
  try {
    for (const src of scripts) {
      if (!document.querySelector(`script[src="${src}"]`)) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = src; script.async = true
          script.onload = resolve; script.onerror = reject
          document.head.appendChild(script)
        })
      }
    }
    // @ts-ignore
    faceMesh = new FaceMesh({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` })
    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 })
    faceMesh.onResults(onResults)
    isModelLoading.value = false
  } catch (err) {
    cameraError.value = "فشل تحميل محرك الذكاء الاصطناعي"
  }
}

/**
 * Main Processing Loop
 */
const onResults = (results: any) => {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  
  lastResults.value = results
  
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0]
    
    // Use Three.js renderer if enabled
    if (useThreeJS.value && threeRenderer && textureManager) {
      renderWithThreeJS(landmarks, results.image)
    } else {
      // Fallback to canvas 2D
      if (!canvasCtx) return
      canvasCtx.save()
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height)
      canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height)
      
      const type = currentShade.value.type
      switch(type) {
        case 'LIPSTICK': applyLipstick(landmarks); break;
        case 'BLUSH': applyBlush(landmarks); break;
        case 'FOUNDATION': applyFoundation(landmarks); break;
        case 'CONCEALER': applyConcealer(landmarks); break;
        case 'LIPLINER': applyLipliner(landmarks); break;
        case 'EYESHADOW': applyEyeshadow(landmarks); break;
        case 'EYELINER': applyEyeliner(landmarks); break;
        case 'MASCARA': applyMascara(landmarks); break;
        case 'BROWS': applyBrow(landmarks); break;
        case 'CONTOUR': applyContour(landmarks); break;
      }
      canvasCtx.restore()
    }
  } else {
    // No face detected - show video feed
    if (canvasCtx) {
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height)
      canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height)
    }
  }
}

/**
 * Render using Three.js (NEW)
 */
const renderWithThreeJS = (landmarks: any[], image: any) => {
  if (!threeRenderer || !textureManager || !canvasRef.value) return
  
  const canvas = canvasRef.value
  const { color, opacity, type } = currentShade.value
  
  // Update face mesh geometry
  threeRenderer.updateFaceMesh(landmarks)
  
  // Generate and apply texture based on makeup type
  let texture
  
  switch(type) {
    case 'FOUNDATION':
      texture = textureManager.generateFoundationTexture(512, 512, color, opacity, landmarks)
      break
    
    case 'LIPSTICK':
      texture = textureManager.generateLipstickTexture(512, 512, color, opacity, landmarks, 'matte')
      break
    
    case 'BLUSH':
      texture = textureManager.generateBlushTexture(512, 512, color, opacity, landmarks)
      break
    
    case 'EYESHADOW':
      texture = textureManager.generateEyeshadowTexture(512, 512, color, opacity, landmarks)
      break
    
    case 'CONTOUR':
      texture = textureManager.generateContourTexture(512, 512, color, opacity, landmarks, contourPlacement.value as any)
      break
    
    case 'CONCEALER':
      texture = textureManager.generateConcealerTexture(512, 512, color, opacity, landmarks)
      break
    
    case 'LIPLINER':
      texture = textureManager.generateLipLinerTexture(512, 512, color, opacity, landmarks)
      break
    
    case 'EYELINER':
      // Use procedural for now (can load external PNGs later)
      const style = eyelinerPlacement.value === 'natural' ? 'natural' : 'winged'
      texture = textureManager.generateEyelinerTexture(512, 512, color, opacity, landmarks, style)
      break
    
    case 'BROWS':
      texture = textureManager.generateBrowTexture(512, 512, color, opacity, landmarks)
      break
    
    case 'MASCARA':
      texture = textureManager.generateMascaraTexture(512, 512, color, opacity, landmarks)
      break
  }
  
  if (texture) {
    threeRenderer.applyMakeup(type, texture)
  }
  
  // Render the scene
  threeRenderer.render()
}

// --- Specific Drawing Functions (All with null checks) ---

const applyLipstick = (landmarks: any[]) => {
  if (!canvasCtx || !canvasRef.value) return
  const canvas = canvasRef.value
  const { color, opacity } = currentShade.value
  canvasCtx.beginPath()
  const outerCoords = LIP_OUTER.map(idx => ({ x: landmarks[idx].x * canvas.width, y: landmarks[idx].y * canvas.height }))
  canvasCtx.moveTo(outerCoords[0].x, outerCoords[0].y)
  outerCoords.slice(1).forEach(pt => canvasCtx!.lineTo(pt.x, pt.y))
  canvasCtx.closePath()
  const innerCoords = LIP_INNER.map(idx => ({ x: landmarks[idx].x * canvas.width, y: landmarks[idx].y * canvas.height }))
  canvasCtx.moveTo(innerCoords[0].x, innerCoords[0].y)
  innerCoords.slice(1).forEach(pt => canvasCtx!.lineTo(pt.x, pt.y))
  canvasCtx.closePath()
  canvasCtx.save()
  canvasCtx.globalCompositeOperation = 'soft-light'
  canvasCtx.fillStyle = color
  canvasCtx.globalAlpha = opacity
  canvasCtx.filter = 'blur(1.5px)'
  canvasCtx.fill('evenodd')
  canvasCtx.filter = 'none'
  canvasCtx.restore()
}

const applyBlush = (landmarks: any[]) => {
  if (!canvasCtx || !canvasRef.value) return
  const canvas = canvasRef.value
  const { color, opacity } = currentShade.value
  const drawCheek = (centerIdx: number) => {
    const x = landmarks[centerIdx].x * canvas.width
    const y = landmarks[centerIdx].y * canvas.height
    const radius = canvas.width * 0.1
    const gradient = canvasCtx!.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent')
    canvasCtx!.save()
    canvasCtx!.globalAlpha = opacity * 0.6
    canvasCtx!.globalCompositeOperation = 'soft-light'
    canvasCtx!.fillStyle = gradient
    canvasCtx!.beginPath(); canvasCtx!.arc(x, y, radius, 0, Math.PI * 2); canvasCtx!.fill()
    canvasCtx!.restore()
  }
  drawCheek(234); drawCheek(454)
}

const applyFoundation = (landmarks: any[]) => {
  if (!canvasCtx || !canvasRef.value) return
  const canvas = canvasRef.value
  const { color, opacity } = currentShade.value
  canvasCtx.beginPath()
  const path = FACE_OVAL.map(i => ({ x: landmarks[i].x * canvas.width, y: landmarks[i].y * canvas.height }))
  canvasCtx.moveTo(path[0].x, path[0].y); path.slice(1).forEach(pt => canvasCtx!.lineTo(pt.x, pt.y)); canvasCtx.closePath()
  canvasCtx.save()
  canvasCtx.globalCompositeOperation = 'soft-light'
  canvasCtx.globalAlpha = opacity * 0.4
  canvasCtx.fillStyle = color
  canvasCtx.filter = 'blur(10px)'; canvasCtx.fill()
  canvasCtx.restore()
}

const applyLipliner = (landmarks: any[]) => {
  if (!canvasCtx || !canvasRef.value) return
  const canvas = canvasRef.value
  const { color, opacity } = currentShade.value
  canvasCtx.beginPath()
  const path = LIP_OUTER.map(i => ({ x: landmarks[i].x * canvas.width, y: landmarks[i].y * canvas.height }))
  canvasCtx.moveTo(path[0].x, path[0].y); path.slice(1).forEach(pt => canvasCtx!.lineTo(pt.x, pt.y)); canvasCtx.closePath()
  canvasCtx.save(); canvasCtx.strokeStyle = color; canvasCtx.globalAlpha = opacity
  canvasCtx.lineWidth = 2; canvasCtx.filter = 'blur(1px)'; canvasCtx.stroke()
  canvasCtx.restore()
}

const applyEyeshadow = (landmarks: any[]) => {
  if (!canvasCtx || !canvasRef.value) return
  const canvas = canvasRef.value
  const { color, opacity } = currentShade.value
  const drawEye = (indices: number[]) => {
    canvasCtx!.beginPath()
    const path = indices.map(i => ({ x: landmarks[i].x * canvas.width, y: landmarks[i].y * canvas.height }))
    canvasCtx!.moveTo(path[0].x, path[0].y); path.slice(1).forEach(pt => canvasCtx!.lineTo(pt.x, pt.y)); canvasCtx!.closePath()
    canvasCtx!.save(); canvasCtx!.globalCompositeOperation = 'soft-light'; canvasCtx!.globalAlpha = opacity
    canvasCtx!.fillStyle = color; canvasCtx!.filter = 'blur(4px)'; canvasCtx!.fill(); canvasCtx!.restore()
  }
  drawEye(LEFT_EYE_TOP); drawEye(RIGHT_EYE_TOP)
}

const applyEyeliner = (landmarks: any[], isMascara = false) => {
  if (!canvasCtx || !canvasRef.value) return
  const canvas = canvasRef.value
  const { color, opacity } = currentShade.value
  
  const drawLiner = (indices: number[], lineWidth: number = 2, extendWing: boolean = false, wingLength: number = 0) => {
    canvasCtx!.beginPath()
    const path = indices.map(i => ({ x: landmarks[i].x * canvas.width, y: landmarks[i].y * canvas.height }))
    
    // Reverse the path to draw from outer corner to inner corner
    const reversedPath = [...path].reverse()
    
    canvasCtx!.moveTo(reversedPath[0].x, reversedPath[0].y)
    reversedPath.slice(1).forEach(pt => canvasCtx!.lineTo(pt.x, pt.y))
    
    // Add wing extension if needed
    if (extendWing && path.length > 1) {
      const firstPoint = path[0]  // Changed from lastPoint to firstPoint
      
      // Determine if it's left or right eye
      const isLeftEye = indices[0] < 300
      
      // Wing should extend outward (toward temple) and slightly downward
      // For left eye: extend to the LEFT and down (toward left temple)
      // For right eye: extend to the RIGHT and down (toward right temple)
      
      // Calculate wing endpoint from FIRST point (inner corner)
      // Horizontal: outward from face center
      // Vertical: slightly downward for horizontal look
      const horizontalDirection = isLeftEye ? -1 : 1  // Left for left eye, right for right eye
      const wingX = firstPoint.x + (horizontalDirection * wingLength * 0.9)  // 90% horizontal
      const wingY = firstPoint.y + (wingLength * 0.1)  // 10% downward (changed from -0.4 upward)
      
      canvasCtx!.lineTo(wingX, wingY)
    }
    
    canvasCtx!.save()
    canvasCtx!.strokeStyle = color
    canvasCtx!.globalAlpha = isMascara ? opacity * 0.5 : opacity
    canvasCtx!.lineWidth = lineWidth
    canvasCtx!.lineCap = 'round'
    canvasCtx!.lineJoin = 'round'
    canvasCtx!.filter = 'blur(0.5px)'
    canvasCtx!.stroke()
    canvasCtx!.restore()
  }
  
  // Apply based on selected eyeliner style
  if (!isMascara) {
    switch(eyelinerPlacement.value) {
      case 'natural':
        drawLiner(LEFT_LINER, 2, false)
        drawLiner(RIGHT_LINER, 2, false)
        break
      case 'small_winged':
        drawLiner(LEFT_LINER, 2, true, canvas.width * 0.025)  // 2.5% of canvas width
        drawLiner(RIGHT_LINER, 2, true, canvas.width * 0.025)
        break
      case 'fringe_glam':
        drawLiner(LEFT_LINER, 2.5, true, canvas.width * 0.035)  // 3.5%
        drawLiner(RIGHT_LINER, 2.5, true, canvas.width * 0.035)
        break
      case 'thick_winged':
        drawLiner(LEFT_LINER, 3.5, true, canvas.width * 0.045)  // 4.5%
        drawLiner(RIGHT_LINER, 3.5, true, canvas.width * 0.045)
        break
      case 'cat_eye':
        drawLiner(LEFT_LINER, 4, true, canvas.width * 0.055)  // 5.5%
        drawLiner(RIGHT_LINER, 4, true, canvas.width * 0.055)
        break
    }
  } else {
    drawLiner(LEFT_LINER, 4, false)
    drawLiner(RIGHT_LINER, 4, false)
  }
}

const applyMascara = (landmarks: any[]) => applyEyeliner(landmarks, true)

const applyBrow = (landmarks: any[]) => {
  if (!canvasCtx || !canvasRef.value) return
  const canvas = canvasRef.value
  const { color, opacity } = currentShade.value
  const drawBrow = (indices: number[]) => {
    canvasCtx!.beginPath()
    const path = indices.map(i => ({ x: landmarks[i].x * canvas.width, y: landmarks[i].y * canvas.height }))
    canvasCtx!.moveTo(path[0].x, path[0].y); path.slice(1).forEach(pt => canvasCtx!.lineTo(pt.x, pt.y)); canvasCtx!.closePath()
    canvasCtx!.save(); canvasCtx!.globalCompositeOperation = 'multiply'; canvasCtx!.globalAlpha = opacity * 0.7
    canvasCtx!.fillStyle = color; canvasCtx!.filter = 'blur(2px)'; canvasCtx!.fill(); canvasCtx!.restore()
  }
  drawBrow(LEFT_BROW); drawBrow(RIGHT_BROW)
}

const applyConcealer = (landmarks: any[]) => {
  if (!canvasCtx || !canvasRef.value) return
  const canvas = canvasRef.value
  const { color, opacity } = currentShade.value
  const drawArea = (indices: number[]) => {
    canvasCtx!.beginPath()
    const path = indices.map(i => ({ x: landmarks[i].x * canvas.width, y: landmarks[i].y * canvas.height }))
    canvasCtx!.moveTo(path[0].x, path[0].y); path.slice(1).forEach(pt => canvasCtx!.lineTo(pt.x, pt.y)); canvasCtx!.closePath()
    canvasCtx!.save(); canvasCtx!.globalCompositeOperation = 'soft-light'; canvasCtx!.globalAlpha = opacity * 0.5
    canvasCtx!.fillStyle = color; canvasCtx!.filter = 'blur(8px)'; canvasCtx!.fill(); canvasCtx!.restore()
  }
  drawArea(LEFT_UNDER_EYE); drawArea(RIGHT_UNDER_EYE)
}

const applyContour = (landmarks: any[]) => {
  if (!canvasCtx || !canvasRef.value) return
  const canvas = canvasRef.value
  const { color, opacity } = currentShade.value
  
  const drawZone = (idx: number, offsetY: number = 0.05, radiusMultiplier: number = 0.08) => {
    const x = landmarks[idx].x * canvas.width
    const y = (landmarks[idx].y + offsetY) * canvas.height
    const radius = canvas.width * radiusMultiplier
    const gradient = canvasCtx!.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, 'transparent')
    canvasCtx!.save()
    canvasCtx!.globalCompositeOperation = 'multiply'
    canvasCtx!.globalAlpha = opacity * 0.4
    canvasCtx!.fillStyle = gradient
    canvasCtx!.beginPath()
    canvasCtx!.arc(x, y, radius, 0, Math.PI * 2)
    canvasCtx!.fill()
    canvasCtx!.restore()
  }
  
  // Apply based on selected placement
  switch(contourPlacement.value) {
    case 'default':
      // Cheekbones (default)
      drawZone(123, 0.05, 0.08)  // Left cheekbone
      drawZone(352, 0.05, 0.08)  // Right cheekbone
      break
    
    case 'forehead':
      // Forehead sides
      drawZone(54, -0.08, 0.07)   // Left forehead
      drawZone(284, -0.08, 0.07)  // Right forehead
      break
    
    case 'inner_eyebrow':
      // Between eyebrows (nose bridge)
      drawZone(6, -0.02, 0.05)    // Nose bridge top
      drawZone(197, 0.01, 0.04)   // Nose bridge middle
      break
  }
}

// --- Mode Management ---

const startCamera = async () => {
  if (!videoRef.value || !faceMesh) return
  isLoading.value = true
  try {
    // @ts-ignore
    camera = new Camera(videoRef.value, { onFrame: async () => { if (videoRef.value && isCameraMode.value) await faceMesh.send({ image: videoRef.value }) }, width: 640, height: 480 })
    await camera.start()
  } catch (err) { cameraError.value = "غير قادر على تشغيل الكاميرا" }
  finally { isLoading.value = false }
}

const toggleMode = async (mode: 'camera' | 'upload' | 'model', modelUrl?: string) => {
  isLoading.value = true
  if (camera) { await camera.stop(); camera = null }
  if (mode === 'camera') { isCameraMode.value = true; activeModelUrl.value = null; await startCamera() }
  else if (mode === 'upload') { isCameraMode.value = false; activeModelUrl.value = null }
  else if (mode === 'model' && modelUrl) { isCameraMode.value = false; activeModelUrl.value = modelUrl; await processStaticImage(modelUrl) }
  isLoading.value = false
}

const processStaticImage = async (src: string) => {
  const img = new Image(); img.crossOrigin = "anonymous"
  img.onload = async () => {
    if (canvasRef.value) {
      const scale = Math.min(1, 800 / img.width)
      canvasRef.value.width = img.width * scale; canvasRef.value.height = img.height * scale
    }
    await faceMesh.send({ image: img })
  }
  img.src = src
}

const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => processStaticImage(e.target?.result as string)
  reader.readAsDataURL(file)
}

const redrawWithCachedLandmarks = () => { if (lastResults.value) onResults(lastResults.value) }
watch(currentShade, () => { if (!isCameraMode.value) redrawWithCachedLandmarks() }, { deep: true })
watch(contourPlacement, () => { if (!isCameraMode.value) redrawWithCachedLandmarks() })
watch(eyelinerPlacement, () => { if (!isCameraMode.value) redrawWithCachedLandmarks() })


onMounted(async () => { 
  if (canvasRef.value) {
    canvasCtx = canvasRef.value.getContext('2d')
    // initThreeJS() // Initialize Three.js renderer
  }
  await initFaceMesh()
  await startCamera()
})

onUnmounted(() => { 
  if (camera) camera.stop()
  if (faceMesh) faceMesh.close()
  if (threeRenderer) threeRenderer.dispose()
  if (textureManager) textureManager.clearCache()
})

// --- Data ---
const modelLibrary = [1, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `https://dsf-cdn.loreal.io/vto/vto-lorealsa-maybellineny-usa-web-production-std/add_makeup_models_view${i}_thumbnail_image.jpg`)
const categories = [
  { id: 'FOUNDATION', name: 'كريم أساس', icon: 'fas fa-magic' },
  { id: 'CONTOUR', name: 'كونتور', icon: 'fas fa-mask' },
  { id: 'CONCEALER', name: 'كونسيلر', icon: 'fas fa-eye' },
  { id: 'BLUSH', name: 'بلاشر', icon: 'fas fa-smile' },
  { id: 'LIPSTICK', name: 'أحمر شفاه', icon: 'fas fa-palette' },
  { id: 'LIPLINER', name: 'محدد شفاه', icon: 'fas fa-pen' },
  { id: 'EYESHADOW', name: 'ظلال عيون', icon: 'fas fa-eye-slash' },
  { id: 'EYELINER', name: 'كحل / آيلاينر', icon: 'fas fa-paint-brush' },
  { id: 'MASCARA', name: 'ماسكارا', icon: 'fas fa-eye' },
  { id: 'BROW', name: 'حواجب', icon: 'fas fa-minus' }
]
const activeCategory = ref(props.initialShade?.type || 'LIPSTICK')
// Default shades
const defaultShades: Shade[] = [
  { id: 101, color: "#F5DEB3", opacity: 0.3, type: "FOUNDATION", name: "Light Sand" },
  { id: 201, color: "#8B4513", opacity: 0.25, type: "CONTOUR", name: "Deep Sculpt" },
  { id: 301, color: "#FFE4C4", opacity: 0.4, type: "CONCEALER", name: "Bright Eye" },
  { id: 401, color: "#f48fb1", opacity: 0.4, type: "BLUSH", name: "Natural Rose" },
  { id: 1, color: "#9D112E", opacity: 0.6, type: "LIPSTICK", name: "Deep Royal Red" },
  { id: 601, color: "#5D101D", opacity: 0.7, type: "LIPLINER", name: "Contour Pro" },
  { id: 701, color: "#4A235A", opacity: 0.4, type: "EYESHADOW", name: "Purple Smoke" },
  { id: 801, color: "#000000", opacity: 0.8, type: "EYELINER", name: "Ink Black" },
  { id: 901, color: "#111111", opacity: 0.9, type: "MASCARA", name: "Volume Max" },
  { id: 1001, color: "#3E2723", opacity: 0.6, type: "BROW", name: "Dark Brown" }
]

// Merge product shades with default shades
const availableShades = ref<Shade[]>([
  ...(props.productShades || []),
  ...defaultShades
])

console.log('[MakeupTryOn] Available shades:', availableShades.value)
console.log('[MakeupTryOn] Product shades:', props.productShades)
console.log('[MakeupTryOn] Active category:', activeCategory.value)
const filteredShades = computed(() => availableShades.value.filter(s => s.type === activeCategory.value))
const selectShade = (shade: Shade) => currentShade.value = shade
watch(activeCategory, (newCat) => { const first = availableShades.value.find(s => s.type === newCat); if (first) currentShade.value = first })
</script>

<template>
  <div class="vto-widget">
    <div class="vto-display">
      <div class="vto-main-canvas-container card">
        <div v-if="isModelLoading || isLoading || cameraError" class="overlay">
          <div v-if="cameraError" class="error-msg">
            <i class="fas fa-exclamation-circle text-danger mb-3" style="font-size: 2rem;"></i>
            <p>{{ cameraError }}</p>
            <button @click="toggleMode('upload')" class="btn btn-sm btn-outline-light rounded-pill px-4 mt-2">رفع صورة</button>
          </div>
          <div v-else class="loader-content">
            <div class="vto-spinner"></div>
            <p class="font-weight-bold">{{ isModelLoading ? 'تحميل...' : 'معالجة...' }}</p>
          </div>
        </div>
        <video ref="videoRef" class="hidden-v" playsinline muted></video>
        <canvas ref="canvasRef" width="640" height="480" class="vto-render"></canvas>
        <div class="vto-mode-tabs">
          <button @click="toggleMode('camera')" :class="{ active: isCameraMode }">مباشر</button>
          <button @click="toggleMode('upload')" :class="{ active: !isCameraMode && !activeModelUrl }">صورة</button>
        </div>
      </div>
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
      
      <!-- Contour Placement Selector (only show for CONTOUR type) -->
      <div v-if="activeCategory === 'CONTOUR'" class="contour-placement-picker">
        <label>اختر مكان الكونتور:</label>
        <div class="placement-grid">
          <button 
            v-for="placement in contourPlacements" 
            :key="placement.id" 
            class="placement-btn" 
            :class="{ selected: contourPlacement === placement.id }"
            @click="contourPlacement = placement.id"
          >
            <img :src="placement.image" :alt="placement.name" />
            <span>{{ placement.name }}</span>
            <i v-if="contourPlacement === placement.id" class="fas fa-check-circle"></i>
          </button>
        </div>
      </div>
      
      <!-- Eyeliner Placement Selector (only show for EYELINER type) -->
      <div v-if="activeCategory === 'EYELINER'" class="eyeliner-placement-picker">
        <label>اختر نمط الآيلاينر:</label>
        <div class="placement-grid placement-grid-5">
          <button 
            v-for="placement in eyelinerPlacements" 
            :key="placement.id" 
            class="placement-btn" 
            :class="{ selected: eyelinerPlacement === placement.id }"
            @click="eyelinerPlacement = placement.id"
          >
            <img :src="placement.image" :alt="placement.name" />
            <span>{{ placement.name }}</span>
            <i v-if="eyelinerPlacement === placement.id" class="fas fa-check-circle"></i>
          </button>
        </div>
      </div>
      
      <div class="intensity-slider">
        <div class="slider-header"><label>حدة اللون</label><span>{{ Math.round(currentShade.opacity * 100) }}%</span></div>
        <input type="range" v-model.number="currentShade.opacity" min="0.2" max="0.8" step="0.05" />
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
  aspect-ratio: 1/1; /* Square for smaller footprint */
  box-shadow: 0 20px 40px rgba(0,0,0,0.15); 
}
.vto-render { width: 100%; height: 100%; object-fit: contain; }
.hidden-v { display: none; }
.vto-mode-tabs { position: absolute; top: 1.25rem; left: 50%; transform: translateX(-50%); display: flex; background: rgba(0,0,0,0.5); backdrop-filter: blur(10px); padding: 0.3rem; border-radius: 2rem; z-index: 5; }
.vto-mode-tabs button { background: transparent; border: none; color: white; padding: 0.5rem 1.25rem; border-radius: 1.5rem; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
.vto-mode-tabs button.active { background: #C2185B; }
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

.vto-sidebar { padding: 1.25rem; border-radius: 1.25rem; background: white; display: flex; flex-direction: column; gap: 1rem; }

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
.shade-btn { aspect-ratio: 1; border-radius: 50%; border: 2px solid transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; }
.shade-btn.selected { border-color: #1e293b; }
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
  .placement-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
  
  .placement-btn {
    padding: 0.5rem 0.25rem;
  }
  
  .placement-btn img {
    width: 50px;
    height: 50px;
  }
  
  .placement-btn span {
    font-size: 0.7rem;
  }
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

.placement-grid-5 {
  grid-template-columns: repeat(5, 1fr);
}

@media (max-width: 768px) {
  .placement-grid-5 {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 480px) {
  .placement-grid-5 {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
