/**
 * UVMapper - Maps face regions to UV coordinates for precise texture application
 * Based on MediaPipe Face Mesh 468 landmarks
 */

export interface FaceRegion {
    name: string
    landmarks: number[]
    uvBounds?: { minU: number; maxU: number; minV: number; maxV: number }
}

export class UVMapper {
    // MediaPipe Face Mesh landmark indices for different face regions

    // Full face (for foundation)
    static readonly FACE_OVAL = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
        397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
        172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10
    ]

    // Lips
    static readonly LIPS_OUTER = [
        61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321,
        405, 314, 17, 84, 181, 91, 146
    ]

    static readonly LIPS_INNER = [
        78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318,
        402, 317, 14, 87, 178, 88, 95
    ]

    // Eyes
    static readonly LEFT_EYE_UPPER = [226, 247, 30, 29, 27, 28, 56, 190, 243, 226]
    static readonly RIGHT_EYE_UPPER = [446, 467, 260, 259, 257, 258, 286, 414, 463, 446]

    static readonly LEFT_EYE_LOWER = [33, 7, 163, 144, 145, 153, 154, 155, 133]
    static readonly RIGHT_EYE_LOWER = [263, 249, 390, 373, 374, 380, 381, 382, 362]

    // Eyeliner area
    static readonly LEFT_EYELINER = [246, 161, 160, 159, 158, 157, 173]
    static readonly RIGHT_EYELINER = [466, 388, 387, 386, 385, 384, 398]

    // Eyebrows
    static readonly LEFT_EYEBROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
    static readonly RIGHT_EYEBROW = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]

    // Cheeks (for blush)
    static readonly LEFT_CHEEK = [123, 116, 117, 118, 119, 120, 121, 128, 245]
    static readonly RIGHT_CHEEK = [352, 345, 346, 347, 348, 349, 350, 357, 465]

    // Under-eye (for concealer)
    static readonly LEFT_UNDER_EYE = [
        33, 7, 163, 144, 145, 153, 154, 155, 133, 243, 190, 56, 28, 27, 29, 30, 247, 130
    ]
    static readonly RIGHT_UNDER_EYE = [
        263, 249, 390, 373, 374, 380, 381, 382, 362, 463, 414, 286, 258, 257, 259, 260, 467, 359
    ]

    // Nose (for contour)
    static readonly NOSE_BRIDGE = [6, 197, 195, 5, 4]
    static readonly NOSE_TIP = [1, 2, 98, 327]

    // Forehead (for contour)
    static readonly FOREHEAD_LEFT = [54, 103, 67, 109, 10, 338]
    static readonly FOREHEAD_RIGHT = [284, 251, 389, 356, 454, 323]

    /**
     * Get UV bounds for a specific face region
     */
    static getRegionUVBounds(landmarks: any[], indices: number[]): { minU: number; maxU: number; minV: number; maxV: number } {
        let minU = 1, maxU = 0, minV = 1, maxV = 0

        indices.forEach(index => {
            if (landmarks[index]) {
                const u = landmarks[index].x
                const v = landmarks[index].y
                minU = Math.min(minU, u)
                maxU = Math.max(maxU, u)
                minV = Math.min(minV, v)
                maxV = Math.max(maxV, v)
            }
        })

        return { minU, maxU, minV, maxV }
    }

    /**
     * Create a texture mask for a specific region
     */
    static createRegionMask(
        width: number,
        height: number,
        landmarks: any[],
        indices: number[],
        feather: number = 10
    ): HTMLCanvasElement {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!

        ctx.clearRect(0, 0, width, height)

        // Draw region as filled polygon
        ctx.beginPath()
        indices.forEach((index, i) => {
            if (landmarks[index]) {
                const x = landmarks[index].x * width
                const y = landmarks[index].y * height
                if (i === 0) {
                    ctx.moveTo(x, y)
                } else {
                    ctx.lineTo(x, y)
                }
            }
        })
        ctx.closePath()

        // Fill with white
        ctx.fillStyle = 'white'
        ctx.fill()

        // Apply feathering (blur)
        if (feather > 0) {
            ctx.filter = `blur(${feather}px)`
            ctx.drawImage(canvas, 0, 0)
            ctx.filter = 'none'
        }

        return canvas
    }

    /**
     * Get all defined regions
     */
    static getAllRegions(): Map<string, number[]> {
        return new Map([
            ['face', UVMapper.FACE_OVAL],
            ['lips_outer', UVMapper.LIPS_OUTER],
            ['lips_inner', UVMapper.LIPS_INNER],
            ['left_eye_upper', UVMapper.LEFT_EYE_UPPER],
            ['right_eye_upper', UVMapper.RIGHT_EYE_UPPER],
            ['left_eyeliner', UVMapper.LEFT_EYELINER],
            ['right_eyeliner', UVMapper.RIGHT_EYELINER],
            ['left_eyebrow', UVMapper.LEFT_EYEBROW],
            ['right_eyebrow', UVMapper.RIGHT_EYEBROW],
            ['left_cheek', UVMapper.LEFT_CHEEK],
            ['right_cheek', UVMapper.RIGHT_CHEEK],
            ['left_under_eye', UVMapper.LEFT_UNDER_EYE],
            ['right_under_eye', UVMapper.RIGHT_UNDER_EYE],
            ['nose_bridge', UVMapper.NOSE_BRIDGE],
            ['forehead_left', UVMapper.FOREHEAD_LEFT],
            ['forehead_right', UVMapper.FOREHEAD_RIGHT]
        ])
    }
}
