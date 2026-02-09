/**
 * ThreeJSRenderer - Core 3D renderer for makeup application
 * Uses Three.js to render realistic makeup textures on face mesh
 */

import * as THREE from 'three'

export interface MakeupTexture {
    type: string
    color: string
    opacity: number
    placement?: string
}

export class ThreeJSRenderer {
    private scene: THREE.Scene
    private camera: THREE.PerspectiveCamera
    private renderer: THREE.WebGLRenderer
    private faceMesh: THREE.Mesh | null = null
    private videoTexture: THREE.VideoTexture | null = null

    // Separate materials for different face regions
    private materials: Map<string, THREE.MeshBasicMaterial> = new Map()

    constructor(private canvas: HTMLCanvasElement, private video: HTMLVideoElement) {
        // Initialize Three.js scene
        this.scene = new THREE.Scene()

        // Setup camera
        const aspect = canvas.width / canvas.height
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000)
        this.camera.position.z = 1

        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true
        })
        this.renderer.setSize(canvas.width, canvas.height)
        this.renderer.setClearColor(0x000000, 0)

        // Setup video texture
        this.videoTexture = new THREE.VideoTexture(video)
        this.videoTexture.minFilter = THREE.LinearFilter
        this.videoTexture.magFilter = THREE.LinearFilter
    }

    /**
     * Update face mesh geometry from MediaPipe landmarks
     */
    updateFaceMesh(landmarks: any[]) {
        if (!landmarks || landmarks.length === 0) return

        // Convert landmarks to Three.js positions
        const positions: number[] = []
        const uvs: number[] = []

        landmarks.forEach((landmark, index) => {
            // Position (normalized coordinates)
            positions.push(
                (landmark.x - 0.5) * 2,  // X: -1 to 1
                -(landmark.y - 0.5) * 2, // Y: -1 to 1 (flipped)
                -landmark.z * 2          // Z: depth
            )

            // UV coordinates (for texture mapping)
            uvs.push(landmark.x, 1 - landmark.y)
        })

        // Create or update geometry
        if (!this.faceMesh) {
            const geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))

            // Create triangulation indices (simplified - full implementation would use Delaunay)
            const indices = this.generateFaceIndices(landmarks.length)
            geometry.setIndex(indices)

            // Create base material with video texture
            const material = new THREE.MeshBasicMaterial({
                map: this.videoTexture,
                transparent: true,
                side: THREE.DoubleSide
            })

            this.faceMesh = new THREE.Mesh(geometry, material)
            this.scene.add(this.faceMesh)
        } else {
            // Update existing geometry
            const geometry = this.faceMesh.geometry as THREE.BufferGeometry
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
            geometry.attributes.position.needsUpdate = true
            geometry.attributes.uv.needsUpdate = true
        }
    }

    /**
     * Apply makeup texture to specific face region
     */
    applyMakeup(makeupType: string, texture: THREE.Texture, region: string = 'full') {
        if (!this.faceMesh) return

        // Create or get material for this makeup type
        let material = this.materials.get(makeupType)

        if (!material) {
            material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 0.6,
                blending: THREE.CustomBlending,
                blendEquation: THREE.AddEquation,
                blendSrc: THREE.SrcAlphaFactor,
                blendDst: THREE.OneMinusSrcAlphaFactor
            })
            this.materials.set(makeupType, material)
        } else {
            material.map = texture
            material.needsUpdate = true
        }

        // For now, apply to entire mesh (will be refined with UV regions)
        this.faceMesh.material = material
    }

    /**
     * Generate face mesh indices (simplified triangulation)
     */
    private generateFaceIndices(landmarkCount: number): number[] {
        // This is a simplified version
        // Full implementation would use MediaPipe's face mesh topology
        const indices: number[] = []

        // MediaPipe Face Mesh has predefined triangulation
        // For now, return empty (will be implemented with proper topology)
        // TODO: Import MediaPipe face mesh triangulation data

        return indices
    }

    /**
     * Render the scene
     */
    render() {
        this.renderer.render(this.scene, this.camera)
    }

    /**
     * Resize renderer
     */
    resize(width: number, height: number) {
        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(width, height)
    }

    /**
     * Clear all makeup
     */
    clearMakeup() {
        this.materials.clear()
        if (this.faceMesh && this.videoTexture) {
            this.faceMesh.material = new THREE.MeshBasicMaterial({
                map: this.videoTexture,
                transparent: true
            })
        }
    }

    /**
     * Cleanup
     */
    dispose() {
        this.materials.forEach(material => material.dispose())
        this.materials.clear()

        if (this.faceMesh) {
            this.faceMesh.geometry.dispose()
            if (Array.isArray(this.faceMesh.material)) {
                this.faceMesh.material.forEach(m => m.dispose())
            } else {
                this.faceMesh.material.dispose()
            }
        }

        this.videoTexture?.dispose()
        this.renderer.dispose()
    }
}
