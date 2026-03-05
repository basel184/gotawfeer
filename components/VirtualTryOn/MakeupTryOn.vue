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

// --- Smoothing & Drawing Helpers ---
let smoothedLandmarks: any[] | null = null
const SMOOTHING = 0.45

const smoothLandmarks = (raw: any[]): any[] => {
  if (!smoothedLandmarks || smoothedLandmarks.length !== raw.length) {
    smoothedLandmarks = raw.map(l => ({ x: l.x, y: l.y, z: l.z || 0 }))
    return smoothedLandmarks
  }
  for (let i = 0; i < raw.length; i++) {
    smoothedLandmarks[i].x += (raw[i].x - smoothedLandmarks[i].x) * (1 - SMOOTHING)
    smoothedLandmarks[i].y += (raw[i].y - smoothedLandmarks[i].y) * (1 - SMOOTHING)
    smoothedLandmarks[i].z += ((raw[i].z || 0) - smoothedLandmarks[i].z) * (1 - SMOOTHING)
  }
  return smoothedLandmarks
}

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const toCanvas = (lm: any[], indices: number[], w: number, h: number) =>
  indices.map(i => ({ x: lm[i].x * w, y: lm[i].y * h }))

const drawSmoothClosed = (ctx: CanvasRenderingContext2D, rawPts: { x: number; y: number }[]) => {
  let pts = rawPts
  const last = pts[pts.length - 1], first = pts[0]
  if (Math.abs(last.x - first.x) < 0.5 && Math.abs(last.y - first.y) < 0.5) pts = pts.slice(0, -1)
  const n = pts.length
  if (n < 3) { pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.closePath(); return }
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]
    const t = 0.4
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) * t / 3, p1.y + (p2.y - p0.y) * t / 3,
      p2.x - (p3.x - p1.x) * t / 3, p2.y - (p3.y - p1.y) * t / 3,
      p2.x, p2.y
    )
  }
  ctx.closePath()
}

const drawSmoothOpen = (ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) => {
  if (pts.length < 2) return
  ctx.moveTo(pts[0].x, pts[0].y)
  if (pts.length === 2) { ctx.lineTo(pts[1].x, pts[1].y); return }
  const t = 0.4
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = i < pts.length - 2 ? pts[i + 2] : pts[i + 1]
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) * t / 3, p1.y + (p2.y - p0.y) * t / 3,
      p2.x - (p3.x - p1.x) * t / 3, p2.y - (p3.y - p1.y) * t / 3,
      p2.x, p2.y
    )
  }
}

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
    const landmarks = smoothLandmarks(results.multiFaceLandmarks[0])
    
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
        case 'BROW': applyBrow(landmarks); break;
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
  const c = canvasRef.value
  const { color, opacity } = currentShade.value
  const w = c.width, h = c.height
  const outer = toCanvas(landmarks, LIP_OUTER, w, h)
  const inner = toCanvas(landmarks, LIP_INNER, w, h)

  const buildPath = () => {
    canvasCtx!.beginPath()
    drawSmoothClosed(canvasCtx!, outer)
    drawSmoothClosed(canvasCtx!, inner)
  }

  // Layer 1: Base with multiply for natural skin blending
  canvasCtx.save()
  buildPath()
  canvasCtx.globalCompositeOperation = 'multiply'
  canvasCtx.globalAlpha = opacity * 0.45
  canvasCtx.fillStyle = color
  canvasCtx.filter = 'blur(1px)'
  canvasCtx.fill('evenodd')
  canvasCtx.restore()

  // Layer 2: soft-light for color richness
  canvasCtx.save()
  buildPath()
  canvasCtx.globalCompositeOperation = 'soft-light'
  canvasCtx.globalAlpha = opacity * 0.7
  canvasCtx.fillStyle = color
  canvasCtx.filter = 'blur(0.5px)'
  canvasCtx.fill('evenodd')
  canvasCtx.restore()

  // Layer 3: Gloss highlight on lower lip center
  const bot = landmarks[17], top = landmarks[0]
  const lipH = Math.abs(bot.y - top.y) * h
  const cx = bot.x * w, cy = (bot.y * h + top.y * h) / 2 + lipH * 0.15
  const r = Math.max(lipH * 0.7, 1)
  canvasCtx.save()
  buildPath()
  canvasCtx.clip('evenodd')
  const g = canvasCtx.createRadialGradient(cx, cy, 0, cx, cy, r)
  g.addColorStop(0, `rgba(255,255,255,${opacity * 0.12})`)
  g.addColorStop(1, 'transparent')
  canvasCtx.globalCompositeOperation = 'screen'
  canvasCtx.fillStyle = g
  canvasCtx.fillRect(0, 0, w, h)
  canvasCtx.restore()
}

const applyBlush = (landmarks: any[]) => {
  if (!canvasCtx || !canvasRef.value) return
  const c = canvasRef.value
  const { color, opacity } = currentShade.value

  const drawCheek = (idx: number, angle: number) => {
    const x = landmarks[idx].x * c.width
    const y = landmarks[idx].y * c.height
    const rx = c.width * 0.085
    const ry = c.height * 0.055

    canvasCtx!.save()
    canvasCtx!.translate(x, y)
    canvasCtx!.rotate(angle)

    // Outer soft layer
    const g1 = canvasCtx!.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry))
    g1.addColorStop(0, color)
    g1.addColorStop(0.5, hexToRgba(color, 0.4))
    g1.addColorStop(1, 'transparent')
    canvasCtx!.globalCompositeOperation = 'soft-light'
    canvasCtx!.globalAlpha = opacity * 0.55
    canvasCtx!.fillStyle = g1
    canvasCtx!.beginPath()
    canvasCtx!.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    canvasCtx!.fill()

    // Inner concentrated layer
    const g2 = canvasCtx!.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry) * 0.5)
    g2.addColorStop(0, color)
    g2.addColorStop(1, 'transparent')
    canvasCtx!.globalAlpha = opacity * 0.3
    canvasCtx!.beginPath()
    canvasCtx!.ellipse(0, 0, rx * 0.55, ry * 0.55, 0, 0, Math.PI * 2)
    canvasCtx!.fillStyle = g2
    canvasCtx!.fill()

    canvasCtx!.restore()
  }

  drawCheek(234, -0.2)
  drawCheek(454, 0.2)
}

const applyFoundation = (landmarks: any[]) => {
  if (!canvasCtx || !canvasRef.value) return
  const c = canvasRef.value
  const { color, opacity } = currentShade.value
  const pts = toCanvas(landmarks, FACE_OVAL, c.width, c.height)

  const buildPath = () => { canvasCtx!.beginPath(); drawSmoothClosed(canvasCtx!, pts) }

  // Pass 1: soft-light base
  canvasCtx.save()
  buildPath()
  canvasCtx.globalCompositeOperation = 'soft-light'
  canvasCtx.globalAlpha = opacity * 0.35
  canvasCtx.fillStyle = color
  canvasCtx.filter = 'blur(12px)'
  canvasCtx.fill()
  canvasCtx.restore()

  // Pass 2: subtle overlay for skin smoothing
  canvasCtx.save()
  buildPath()
  canvasCtx.globalCompositeOperation = 'overlay'
  canvasCtx.globalAlpha = opacity * 0.15
  canvasCtx.fillStyle = color
  canvasCtx.filter = 'blur(20px)'
  canvasCtx.fill()
  canvasCtx.restore()
}

const applyLipliner = (landmarks: any[]) => {
  if (!canvasCtx || !canvasRef.value) return
  const c = canvasRef.value
  const { color, opacity } = currentShade.value
  const pts = toCanvas(landmarks, LIP_OUTER, c.width, c.height)

  canvasCtx.save()
  canvasCtx.beginPath()
  drawSmoothClosed(canvasCtx, pts)
  canvasCtx.strokeStyle = color
  canvasCtx.globalAlpha = opacity
  canvasCtx.lineWidth = 1.8
  canvasCtx.lineCap = 'round'
  canvasCtx.lineJoin = 'round'
  canvasCtx.filter = 'blur(0.5px)'
  canvasCtx.stroke()
  canvasCtx.restore()
}

const applyEyeshadow = (landmarks: any[]) => {
  if (!canvasCtx || !canvasRef.value) return
  const c = canvasRef.value
  const { color, opacity } = currentShade.value

  const drawEye = (indices: number[]) => {
    const pts = toCanvas(landmarks, indices, c.width, c.height)
    let cx = 0, cy = 0, minY = Infinity, maxY = -Infinity
    pts.forEach(p => { cx += p.x; cy += p.y; minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y) })
    cx /= pts.length; cy /= pts.length
    const h = maxY - minY

    // Layer 1: Base fill
    canvasCtx!.save()
    canvasCtx!.beginPath()
    drawSmoothClosed(canvasCtx!, pts)
    canvasCtx!.globalCompositeOperation = 'soft-light'
    canvasCtx!.globalAlpha = opacity * 0.7
    canvasCtx!.fillStyle = color
    canvasCtx!.filter = 'blur(3px)'
    canvasCtx!.fill()
    canvasCtx!.restore()

    // Layer 2: Gradient from lid to crease
    canvasCtx!.save()
    canvasCtx!.beginPath()
    drawSmoothClosed(canvasCtx!, pts)
    canvasCtx!.clip()
    const grad = canvasCtx!.createLinearGradient(cx, maxY, cx, minY - h * 0.3)
    grad.addColorStop(0, color)
    grad.addColorStop(0.6, hexToRgba(color, 0.3))
    grad.addColorStop(1, 'transparent')
    canvasCtx!.globalCompositeOperation = 'multiply'
    canvasCtx!.globalAlpha = opacity * 0.5
    canvasCtx!.fillStyle = grad
    canvasCtx!.fillRect(cx - c.width * 0.15, minY - h, c.width * 0.3, h * 3)
    canvasCtx!.restore()
  }

  drawEye(LEFT_EYE_TOP)
  drawEye(RIGHT_EYE_TOP)
}

const applyEyeliner = (landmarks: any[], isMascara = false) => {
  if (!canvasCtx || !canvasRef.value) return
  const c = canvasRef.value
  const { color, opacity } = currentShade.value

  const drawLiner = (indices: number[], baseWidth: number, extendWing: boolean, wingLen: number = 0) => {
    const pts = toCanvas(landmarks, indices, c.width, c.height)
    const reversed = [...pts].reverse()

    canvasCtx!.save()
    canvasCtx!.strokeStyle = color
    canvasCtx!.globalAlpha = isMascara ? opacity * 0.5 : opacity
    canvasCtx!.lineCap = 'round'
    canvasCtx!.lineJoin = 'round'
    canvasCtx!.filter = 'blur(0.3px)'

    // Draw smooth curve
    canvasCtx!.beginPath()
    drawSmoothOpen(canvasCtx!, reversed)

    // Wing with smooth quadratic curve
    if (extendWing && pts.length > 1) {
      const isLeft = indices[0] < 300
      const tip = pts[0]
      const dir = isLeft ? -1 : 1
      const wingX = tip.x + dir * wingLen * 0.9
      const wingY = tip.y + wingLen * 0.1
      const ctrlX = tip.x + dir * wingLen * 0.5
      const ctrlY = tip.y - wingLen * 0.15
      canvasCtx!.quadraticCurveTo(ctrlX, ctrlY, wingX, wingY)
    }

    canvasCtx!.lineWidth = baseWidth
    canvasCtx!.stroke()

    // Second softer pass for depth
    if (!isMascara && baseWidth > 2) {
      canvasCtx!.globalAlpha *= 0.35
      canvasCtx!.lineWidth = baseWidth * 0.5
      canvasCtx!.beginPath()
      drawSmoothOpen(canvasCtx!, reversed)
      canvasCtx!.stroke()
    }

    canvasCtx!.restore()
  }

  if (!isMascara) {
    switch(eyelinerPlacement.value) {
      case 'natural':
        drawLiner(LEFT_LINER, 2, false)
        drawLiner(RIGHT_LINER, 2, false)
        break
      case 'small_winged':
        drawLiner(LEFT_LINER, 2.2, true, c.width * 0.025)
        drawLiner(RIGHT_LINER, 2.2, true, c.width * 0.025)
        break
      case 'fringe_glam':
        drawLiner(LEFT_LINER, 2.8, true, c.width * 0.035)
        drawLiner(RIGHT_LINER, 2.8, true, c.width * 0.035)
        break
      case 'thick_winged':
        drawLiner(LEFT_LINER, 3.5, true, c.width * 0.045)
        drawLiner(RIGHT_LINER, 3.5, true, c.width * 0.045)
        break
      case 'cat_eye':
        drawLiner(LEFT_LINER, 4, true, c.width * 0.055)
        drawLiner(RIGHT_LINER, 4, true, c.width * 0.055)
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
  const c = canvasRef.value
  const { color, opacity } = currentShade.value

  const drawBrow = (indices: number[]) => {
    const pts = toCanvas(landmarks, indices, c.width, c.height)
    let minX = Infinity, maxX = -Infinity, cy = 0
    pts.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); cy += p.y })
    cy /= pts.length

    // Layer 1: Base fill
    canvasCtx!.save()
    canvasCtx!.beginPath()
    drawSmoothClosed(canvasCtx!, pts)
    canvasCtx!.globalCompositeOperation = 'multiply'
    canvasCtx!.globalAlpha = opacity * 0.6
    canvasCtx!.fillStyle = color
    canvasCtx!.filter = 'blur(1.5px)'
    canvasCtx!.fill()
    canvasCtx!.restore()

    // Layer 2: Gradient fade (lighter at tail)
    canvasCtx!.save()
    canvasCtx!.beginPath()
    drawSmoothClosed(canvasCtx!, pts)
    canvasCtx!.clip()
    const grad = canvasCtx!.createLinearGradient(minX, cy, maxX, cy)
    grad.addColorStop(0, hexToRgba(color, 0.6))
    grad.addColorStop(0.4, color)
    grad.addColorStop(1, hexToRgba(color, 0.3))
    canvasCtx!.globalCompositeOperation = 'multiply'
    canvasCtx!.globalAlpha = opacity * 0.4
    canvasCtx!.fillStyle = grad
    canvasCtx!.filter = 'blur(1px)'
    canvasCtx!.fillRect(minX - 5, cy - 20, maxX - minX + 10, 40)
    canvasCtx!.restore()
  }

  drawBrow(LEFT_BROW)
  drawBrow(RIGHT_BROW)
}

const applyConcealer = (landmarks: any[]) => {
  if (!canvasCtx || !canvasRef.value) return
  const c = canvasRef.value
  const { color, opacity } = currentShade.value

  const drawArea = (indices: number[]) => {
    const pts = toCanvas(landmarks, indices, c.width, c.height)
    let cx = 0, cy = 0
    pts.forEach(p => { cx += p.x; cy += p.y })
    cx /= pts.length; cy /= pts.length

    // Layer 1: Broad coverage
    canvasCtx!.save()
    canvasCtx!.beginPath()
    drawSmoothClosed(canvasCtx!, pts)
    canvasCtx!.globalCompositeOperation = 'soft-light'
    canvasCtx!.globalAlpha = opacity * 0.45
    canvasCtx!.fillStyle = color
    canvasCtx!.filter = 'blur(8px)'
    canvasCtx!.fill()
    canvasCtx!.restore()

    // Layer 2: Brightening center
    canvasCtx!.save()
    canvasCtx!.beginPath()
    drawSmoothClosed(canvasCtx!, pts)
    canvasCtx!.clip()
    const r = c.width * 0.06
    const g = canvasCtx!.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, hexToRgba(color, 0.3))
    g.addColorStop(1, 'transparent')
    canvasCtx!.globalCompositeOperation = 'screen'
    canvasCtx!.globalAlpha = opacity * 0.2
    canvasCtx!.fillStyle = g
    canvasCtx!.fillRect(cx - r, cy - r, r * 2, r * 2)
    canvasCtx!.restore()
  }

  drawArea(LEFT_UNDER_EYE)
  drawArea(RIGHT_UNDER_EYE)
}

const applyContour = (landmarks: any[]) => {
  if (!canvasCtx || !canvasRef.value) return
  const c = canvasRef.value
  const { color, opacity } = currentShade.value

  const drawZone = (idx: number, offsetY: number, rx: number, ry: number, angle: number = 0) => {
    const x = landmarks[idx].x * c.width
    const y = (landmarks[idx].y + offsetY) * c.height

    canvasCtx!.save()
    canvasCtx!.translate(x, y)
    canvasCtx!.rotate(angle)

    const grad = canvasCtx!.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry))
    grad.addColorStop(0, color)
    grad.addColorStop(0.5, hexToRgba(color, 0.4))
    grad.addColorStop(1, 'transparent')
    canvasCtx!.globalCompositeOperation = 'multiply'
    canvasCtx!.globalAlpha = opacity * 0.4
    canvasCtx!.fillStyle = grad
    canvasCtx!.beginPath()
    canvasCtx!.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    canvasCtx!.fill()

    canvasCtx!.restore()
  }

  const rBase = c.width * 0.08
  switch(contourPlacement.value) {
    case 'default':
      drawZone(123, 0.05, rBase, rBase * 0.65, -0.3)
      drawZone(352, 0.05, rBase, rBase * 0.65, 0.3)
      break
    case 'forehead':
      drawZone(54, -0.08, rBase * 0.9, rBase * 0.55, -0.2)
      drawZone(284, -0.08, rBase * 0.9, rBase * 0.55, 0.2)
      break
    case 'inner_eyebrow':
      drawZone(6, -0.02, rBase * 0.55, rBase * 0.4)
      drawZone(197, 0.01, rBase * 0.45, rBase * 0.35)
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
  try {
    isLoading.value = true
    isModelLoading.value = true
    
    // Stop camera if running
    if (camera) { 
      try {
        await camera.stop()
      } catch (e) {
        console.warn('[MakeupTryOn] Error stopping camera:', e)
      }
      camera = null 
    }
    smoothedLandmarks = null
    lastResults.value = null
    
    if (mode === 'camera') { 
      isCameraMode.value = true
      activeModelUrl.value = null
      await startCamera() 
    } 
    else if (mode === 'upload') { 
      isCameraMode.value = false
      activeModelUrl.value = null
    } 
    else if (mode === 'model' && modelUrl) { 
      isCameraMode.value = false
      activeModelUrl.value = modelUrl
      console.log('[MakeupTryOn] Switching to model mode:', modelUrl)
      await processStaticImage(modelUrl)
    }
  } catch (error) {
    console.error('[MakeupTryOn] Error in toggleMode:', error)
    cameraError.value = 'حدث خطأ أثناء تبديل الوضع'
  } finally {
    isLoading.value = false
    isModelLoading.value = false
  }
}

const processStaticImage = async (src: string) => {
  return new Promise<void>((resolve, reject) => {
    try {
      const img = new Image()
      img.crossOrigin = "anonymous"
      
      img.onload = async () => {
        try {
          console.log('[MakeupTryOn] Image loaded successfully:', src)
          
          if (canvasRef.value && canvasCtx) {
            const scale = Math.min(1, 800 / img.width)
            canvasRef.value.width = img.width * scale
            canvasRef.value.height = img.height * scale
            
            // Draw the image to canvas first
            canvasCtx.drawImage(img, 0, 0, canvasRef.value.width, canvasRef.value.height)
            console.log('[MakeupTryOn] Image drawn to canvas')
          }
          
          if (faceMesh) {
            console.log('[MakeupTryOn] Sending image to FaceMesh')
            await faceMesh.send({ image: img })
            console.log('[MakeupTryOn] FaceMesh processing complete')
          } else {
            console.warn('[MakeupTryOn] FaceMesh not initialized')
          }
          
          resolve()
        } catch (error) {
          console.error('[MakeupTryOn] Error processing image:', error)
          reject(error)
        }
      }
      
      img.onerror = (error) => {
        console.error('[MakeupTryOn] Failed to load image:', src, error)
        reject(new Error(`Failed to load image: ${src}`))
      }
      
      img.onabort = () => {
        console.error('[MakeupTryOn] Image loading aborted:', src)
        reject(new Error(`Image loading aborted: ${src}`))
      }
      
      console.log('[MakeupTryOn] Starting to load image:', src)
      img.src = src
    } catch (error) {
      console.error('[MakeupTryOn] Error in processStaticImage:', error)
      reject(error)
    }
  })
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
    canvasCtx = canvasRef.value.getContext('2d', { willReadFrequently: false })
    if (canvasCtx) {
      canvasCtx.imageSmoothingEnabled = true
      canvasCtx.imageSmoothingQuality = 'high'
    }
    // initThreeJS() // Initialize Three.js renderer
  }
  await initFaceMesh()
  if (modelLibrary.length > 0) {
    await toggleMode('model', modelLibrary[0])
  } else {
    await startCamera()
  }
})

onUnmounted(() => { 
  if (camera) camera.stop()
  if (faceMesh) faceMesh.close()
  if (threeRenderer) threeRenderer.dispose()
  if (textureManager) textureManager.clearCache()
})

// --- Data ---
const modelLibrary = [
  '/models-banners/model_0.png',
  '/models-banners/model_1.png',
  '/models-banners/model_2.png',
  '/models-banners/model_3.png',
  '/models-banners/model_4.png'
]
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
