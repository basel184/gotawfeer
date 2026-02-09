/**
 * TextureManager - Generates and manages makeup textures
 */

import * as THREE from 'three'
import { UVMapper } from '../utils/UVMapper'

export interface TextureOptions {
    color: string
    opacity: number
    type: string
    placement?: string
    finish?: 'matte' | 'glossy' | 'satin'
}

export class TextureManager {
    private textureCache: Map<string, THREE.Texture> = new Map()
    private canvasCache: Map<string, HTMLCanvasElement> = new Map()

    /**
     * Generate foundation texture (full face)
     */
    generateFoundationTexture(
        width: number,
        height: number,
        color: string,
        opacity: number,
        landmarks: any[]
    ): THREE.Texture {
        const cacheKey = `foundation_${color}_${opacity}`

        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!

        // Create face mask
        const mask = UVMapper.createRegionMask(width, height, landmarks, UVMapper.FACE_OVAL, 15)

        // Fill with color
        ctx.fillStyle = color
        ctx.globalAlpha = opacity
        ctx.fillRect(0, 0, width, height)

        // Apply mask
        ctx.globalCompositeOperation = 'destination-in'
        ctx.drawImage(mask, 0, 0)

        const texture = new THREE.CanvasTexture(canvas)
        this.textureCache.set(cacheKey, texture)
        this.canvasCache.set(cacheKey, canvas)

        return texture
    }

    /**
     * Generate lipstick texture
     */
    generateLipstickTexture(
        width: number,
        height: number,
        color: string,
        opacity: number,
        landmarks: any[],
        finish: 'matte' | 'glossy' = 'matte'
    ): THREE.Texture {
        const cacheKey = `lipstick_${color}_${opacity}_${finish}`

        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!

        // Create lip masks
        const outerMask = UVMapper.createRegionMask(width, height, landmarks, UVMapper.LIPS_OUTER, 3)
        const innerMask = UVMapper.createRegionMask(width, height, landmarks, UVMapper.LIPS_INNER, 2)

        // Fill with color
        ctx.fillStyle = color
        ctx.globalAlpha = opacity
        ctx.fillRect(0, 0, width, height)

        // Apply outer lip mask
        ctx.globalCompositeOperation = 'destination-in'
        ctx.drawImage(outerMask, 0, 0)

        // Add glossy effect if needed
        if (finish === 'glossy') {
            ctx.globalCompositeOperation = 'lighter'
            ctx.globalAlpha = 0.3
            const gradient = ctx.createLinearGradient(0, height * 0.3, 0, height * 0.7)
            gradient.addColorStop(0, 'rgba(255,255,255,0)')
            gradient.addColorStop(0.5, 'rgba(255,255,255,0.8)')
            gradient.addColorStop(1, 'rgba(255,255,255,0)')
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, width, height)
        }

        const texture = new THREE.CanvasTexture(canvas)
        this.textureCache.set(cacheKey, texture)
        this.canvasCache.set(cacheKey, canvas)

        return texture
    }

    /**
     * Generate blush texture
     */
    generateBlushTexture(
        width: number,
        height: number,
        color: string,
        opacity: number,
        landmarks: any[]
    ): THREE.Texture {
        const cacheKey = `blush_${color}_${opacity}`

        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!

        // Get cheek positions
        const leftCheekBounds = UVMapper.getRegionUVBounds(landmarks, UVMapper.LEFT_CHEEK)
        const rightCheekBounds = UVMapper.getRegionUVBounds(landmarks, UVMapper.RIGHT_CHEEK)

        // Draw radial gradients on cheeks
        const drawCheekBlush = (bounds: any) => {
            const centerX = ((bounds.minU + bounds.maxU) / 2) * width
            const centerY = ((bounds.minV + bounds.maxV) / 2) * height
            const radius = Math.max(
                (bounds.maxU - bounds.minU) * width,
                (bounds.maxV - bounds.minV) * height
            ) * 0.6

            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
            gradient.addColorStop(0, color)
            gradient.addColorStop(1, 'rgba(0,0,0,0)')

            ctx.fillStyle = gradient
            ctx.globalAlpha = opacity
            ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2)
        }

        drawCheekBlush(leftCheekBounds)
        drawCheekBlush(rightCheekBounds)

        const texture = new THREE.CanvasTexture(canvas)
        this.textureCache.set(cacheKey, texture)
        this.canvasCache.set(cacheKey, canvas)

        return texture
    }

    /**
     * Generate eyeshadow texture
     */
    generateEyeshadowTexture(
        width: number,
        height: number,
        color: string,
        opacity: number,
        landmarks: any[]
    ): THREE.Texture {
        const cacheKey = `eyeshadow_${color}_${opacity}`

        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!

        // Create eye masks
        const leftEyeMask = UVMapper.createRegionMask(width, height, landmarks, UVMapper.LEFT_EYE_UPPER, 8)
        const rightEyeMask = UVMapper.createRegionMask(width, height, landmarks, UVMapper.RIGHT_EYE_UPPER, 8)

        // Fill with color
        ctx.fillStyle = color
        ctx.globalAlpha = opacity
        ctx.fillRect(0, 0, width, height)

        // Apply masks
        ctx.globalCompositeOperation = 'destination-in'
        ctx.drawImage(leftEyeMask, 0, 0)
        ctx.drawImage(rightEyeMask, 0, 0)

        const texture = new THREE.CanvasTexture(canvas)
        this.textureCache.set(cacheKey, texture)
        this.canvasCache.set(cacheKey, canvas)

        return texture
    }

    /**
     * Generate contour texture based on placement
     */
    generateContourTexture(
        width: number,
        height: number,
        color: string,
        opacity: number,
        landmarks: any[],
        placement: 'default' | 'forehead' | 'inner_eyebrow' = 'default'
    ): THREE.Texture {
        const cacheKey = `contour_${color}_${opacity}_${placement}`

        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!

        const drawContourZone = (landmarkIndex: number, radiusMultiplier: number = 0.08) => {
            if (!landmarks[landmarkIndex]) return

            const x = landmarks[landmarkIndex].x * width
            const y = landmarks[landmarkIndex].y * height
            const radius = width * radiusMultiplier

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
            gradient.addColorStop(0, color)
            gradient.addColorStop(1, 'rgba(0,0,0,0)')

            ctx.fillStyle = gradient
            ctx.globalAlpha = opacity * 0.4
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
        }

        switch (placement) {
            case 'default':
                // Cheekbones
                drawContourZone(123, 0.08)
                drawContourZone(352, 0.08)
                break
            case 'forehead':
                // Forehead sides
                drawContourZone(54, 0.07)
                drawContourZone(284, 0.07)
                break
            case 'inner_eyebrow':
                // Nose bridge
                drawContourZone(6, 0.05)
                drawContourZone(197, 0.04)
                break
        }

        const texture = new THREE.CanvasTexture(canvas)
        this.textureCache.set(cacheKey, texture)
        this.canvasCache.set(cacheKey, canvas)

        return texture
    }

    /**
     * Generate concealer texture (under-eye)
     */
    generateConcealerTexture(
        width: number,
        height: number,
        color: string,
        opacity: number,
        landmarks: any[]
    ): THREE.Texture {
        const cacheKey = `concealer_${color}_${opacity}`

        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!

        // Create under-eye masks
        const leftMask = UVMapper.createRegionMask(width, height, landmarks, UVMapper.LEFT_UNDER_EYE, 10)
        const rightMask = UVMapper.createRegionMask(width, height, landmarks, UVMapper.RIGHT_UNDER_EYE, 10)

        // Fill with color
        ctx.fillStyle = color
        ctx.globalAlpha = opacity * 0.5
        ctx.fillRect(0, 0, width, height)

        // Apply masks
        ctx.globalCompositeOperation = 'destination-in'
        ctx.drawImage(leftMask, 0, 0)
        ctx.drawImage(rightMask, 0, 0)

        const texture = new THREE.CanvasTexture(canvas)
        this.textureCache.set(cacheKey, texture)
        this.canvasCache.set(cacheKey, canvas)

        return texture
    }

    /**
     * Generate lip liner texture
     */
    generateLipLinerTexture(
        width: number,
        height: number,
        color: string,
        opacity: number,
        landmarks: any[]
    ): THREE.Texture {
        const cacheKey = `lipliner_${color}_${opacity}`

        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!

        // Draw lip outline
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.globalAlpha = opacity

        const drawLipOutline = (indices: number[]) => {
            ctx.beginPath()
            indices.forEach((index, i) => {
                if (landmarks[index]) {
                    const x = landmarks[index].x * width
                    const y = landmarks[index].y * height
                    if (i === 0) ctx.moveTo(x, y)
                    else ctx.lineTo(x, y)
                }
            })
            ctx.closePath()
            ctx.stroke()
        }

        drawLipOutline(UVMapper.LIPS_OUTER)

        const texture = new THREE.CanvasTexture(canvas)
        this.textureCache.set(cacheKey, texture)
        this.canvasCache.set(cacheKey, canvas)

        return texture
    }

    /**
     * Generate eyeliner texture (procedural, for fallback)
     */
    generateEyelinerTexture(
        width: number,
        height: number,
        color: string,
        opacity: number,
        landmarks: any[],
        style: 'natural' | 'winged' = 'natural'
    ): THREE.Texture {
        const cacheKey = `eyeliner_${color}_${opacity}_${style}`

        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!

        ctx.strokeStyle = color
        ctx.lineWidth = style === 'winged' ? 3 : 2
        ctx.globalAlpha = opacity
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        const drawEyeliner = (indices: number[], addWing: boolean = false) => {
            ctx.beginPath()
            indices.forEach((index, i) => {
                if (landmarks[index]) {
                    const x = landmarks[index].x * width
                    const y = landmarks[index].y * height
                    if (i === 0) ctx.moveTo(x, y)
                    else ctx.lineTo(x, y)
                }
            })

            // Add wing if requested
            if (addWing && indices.length > 0) {
                const lastIndex = indices[indices.length - 1]
                const secondLastIndex = indices[indices.length - 2]
                if (landmarks[lastIndex] && landmarks[secondLastIndex]) {
                    const lastX = landmarks[lastIndex].x * width
                    const lastY = landmarks[lastIndex].y * height
                    const wingLength = width * 0.03
                    ctx.lineTo(lastX + wingLength, lastY - wingLength * 0.5)
                }
            }

            ctx.stroke()
        }

        drawEyeliner(UVMapper.LEFT_EYELINER, style === 'winged')
        drawEyeliner(UVMapper.RIGHT_EYELINER, style === 'winged')

        const texture = new THREE.CanvasTexture(canvas)
        this.textureCache.set(cacheKey, texture)
        this.canvasCache.set(cacheKey, canvas)

        return texture
    }

    /**
     * Generate brow texture
     */
    generateBrowTexture(
        width: number,
        height: number,
        color: string,
        opacity: number,
        landmarks: any[]
    ): THREE.Texture {
        const cacheKey = `brow_${color}_${opacity}`

        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!

        // Create brow masks
        const leftMask = UVMapper.createRegionMask(width, height, landmarks, UVMapper.LEFT_EYEBROW, 3)
        const rightMask = UVMapper.createRegionMask(width, height, landmarks, UVMapper.RIGHT_EYEBROW, 3)

        // Fill with color
        ctx.fillStyle = color
        ctx.globalAlpha = opacity * 0.7
        ctx.fillRect(0, 0, width, height)

        // Apply masks
        ctx.globalCompositeOperation = 'destination-in'
        ctx.drawImage(leftMask, 0, 0)
        ctx.drawImage(rightMask, 0, 0)

        const texture = new THREE.CanvasTexture(canvas)
        this.textureCache.set(cacheKey, texture)
        this.canvasCache.set(cacheKey, canvas)

        return texture
    }

    /**
     * Generate mascara texture
     */
    generateMascaraTexture(
        width: number,
        height: number,
        color: string,
        opacity: number,
        landmarks: any[]
    ): THREE.Texture {
        const cacheKey = `mascara_${color}_${opacity}`

        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!

        ctx.strokeStyle = color
        ctx.lineWidth = 4
        ctx.globalAlpha = opacity * 0.5
        ctx.lineCap = 'round'

        const drawLashes = (indices: number[]) => {
            ctx.beginPath()
            indices.forEach((index, i) => {
                if (landmarks[index]) {
                    const x = landmarks[index].x * width
                    const y = landmarks[index].y * height
                    if (i === 0) ctx.moveTo(x, y)
                    else ctx.lineTo(x, y)
                }
            })
            ctx.stroke()
        }

        drawLashes(UVMapper.LEFT_EYELINER)
        drawLashes(UVMapper.RIGHT_EYELINER)

        const texture = new THREE.CanvasTexture(canvas)
        this.textureCache.set(cacheKey, texture)
        this.canvasCache.set(cacheKey, canvas)

        return texture
    }

    /**
     * Load external texture (for eyeliner styles)
     */
    async loadExternalTexture(url: string): Promise<THREE.Texture> {
        if (this.textureCache.has(url)) {
            return this.textureCache.get(url)!
        }

        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader()
            loader.load(
                url,
                (texture) => {
                    this.textureCache.set(url, texture)
                    resolve(texture)
                },
                undefined,
                reject
            )
        })
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.textureCache.forEach(texture => texture.dispose())
        this.textureCache.clear()
        this.canvasCache.clear()
    }

    /**
     * Update texture (force regeneration)
     */
    updateTexture(cacheKey: string) {
        const texture = this.textureCache.get(cacheKey)
        if (texture && texture instanceof THREE.CanvasTexture) {
            texture.needsUpdate = true
        }
    }
}
