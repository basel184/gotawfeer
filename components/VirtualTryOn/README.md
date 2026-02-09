# Three.js Virtual Try-On Integration Guide

## Overview
This directory contains the professional 3D texture mapping system for realistic makeup application.

## Architecture

```
components/VirtualTryOn/
├── renderers/
│   ├── ThreeJSRenderer.ts      # Core 3D renderer
│   └── TextureManager.ts        # Texture generation & caching
├── utils/
│   └── UVMapper.ts              # Face region UV mapping
└── MakeupTryOn.vue              # Main component (to be refactored)
```

## Installation

```bash
npm install three @types/three
```

## Usage Example

```typescript
import { ThreeJSRenderer } from './renderers/ThreeJSRenderer'
import { TextureManager } from './renderers/TextureManager'

// Initialize
const renderer = new ThreeJSRenderer(canvas, video)
const textureManager = new TextureManager()

// On face detection
function onFaceDetected(landmarks) {
  // Update face mesh
  renderer.updateFaceMesh(landmarks)
  
  // Apply makeup
  const lipstickTexture = textureManager.generateLipstickTexture(
    512, 512,
    '#C2185B',  // color
    0.7,        // opacity
    landmarks,
    'glossy'    // finish
  )
  
  renderer.applyMakeup('lipstick', lipstickTexture, 'lips')
  renderer.render()
}
```

## Supported Makeup Types

### 1. Foundation
```typescript
const texture = textureManager.generateFoundationTexture(
  width, height, color, opacity, landmarks
)
```

### 2. Lipstick
```typescript
const texture = textureManager.generateLipstickTexture(
  width, height, color, opacity, landmarks, 'matte' | 'glossy'
)
```

### 3. Blush
```typescript
const texture = textureManager.generateBlushTexture(
  width, height, color, opacity, landmarks
)
```

### 4. Eyeshadow
```typescript
const texture = textureManager.generateEyeshadowTexture(
  width, height, color, opacity, landmarks
)
```

### 5. Contour
```typescript
const texture = textureManager.generateContourTexture(
  width, height, color, opacity, landmarks, 
  'default' | 'forehead' | 'inner_eyebrow'
)
```

### 6. Eyeliner (External PNGs)
```typescript
const texture = await textureManager.loadExternalTexture(
  'https://loreal-cms-public.modiface.com/.../eyeliner_natural_top.png'
)
```

## Face Regions (UVMapper)

Available regions for precise texture application:

- `FACE_OVAL` - Full face (foundation)
- `LIPS_OUTER` / `LIPS_INNER` - Lips
- `LEFT_EYE_UPPER` / `RIGHT_EYE_UPPER` - Eyelids
- `LEFT_EYELINER` / `RIGHT_EYELINER` - Eyeliner area
- `LEFT_EYEBROW` / `RIGHT_EYEBROW` - Eyebrows
- `LEFT_CHEEK` / `RIGHT_CHEEK` - Cheeks (blush)
- `LEFT_UNDER_EYE` / `RIGHT_UNDER_EYE` - Concealer area
- `NOSE_BRIDGE` - Nose (contour)
- `FOREHEAD_LEFT` / `FOREHEAD_RIGHT` - Forehead (contour)

## Next Steps

1. **Install Three.js**: Run `npm install three @types/three`
2. **Refactor MakeupTryOn.vue**: Replace canvas 2D with ThreeJSRenderer
3. **Test**: Verify all makeup types render correctly
4. **Optimize**: Add texture caching and performance improvements

## Performance Tips

- Textures are cached automatically
- Use lower resolution textures for mobile (256x256 vs 512x512)
- Reuse textures when only color/opacity changes
- Clear cache when switching products: `textureManager.clearCache()`

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support  
- Safari: ✅ Full support (iOS 15+)
- Mobile: ✅ Optimized for mobile devices
