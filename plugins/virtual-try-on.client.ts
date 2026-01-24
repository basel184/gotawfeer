// Virtual Try-On Plugin
export default defineNuxtPlugin(() => {
  // Register global components
  const components = [
    'VirtualTryOn/CameraCapture',
    'VirtualTryOn/ProductSelector', 
    'VirtualTryOn/VirtualTryOnResult'
  ]

  components.forEach(component => {
    // Components are auto-imported by Nuxt
  })

  // Add global utilities
  const utils = {
    // Format price for virtual try-on
    formatPrice(price: number, currency = 'SAR') {
      return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: currency
      }).format(price)
    },

    // Format confidence score
    formatConfidenceScore(score: number) {
      return Math.round(score * 100) + '%'
    },

    // Get measurement label in Arabic
    getMeasurementLabel(key: string) {
      const labels: Record<string, string> = {
        chest: 'الصدر',
        waist: 'الخصر', 
        hips: 'الوركين',
        shoulder_width: 'عرض الكتفين',
        arm_length: 'طول الذراع',
        leg_length: 'طول الساق',
        height: 'الطول'
      }
      return labels[key] || key
    },

    // Get body type label in Arabic
    getBodyTypeLabel(type: string) {
      const labels: Record<string, string> = {
        hourglass: 'الساعة الرملية',
        pear: 'الكمثرى',
        apple: 'التفاحة',
        rectangle: 'المستطيل',
        inverted_triangle: 'المثلث المقلوب'
      }
      return labels[type] || type
    },

    // Validate image file
    validateImageFile(file: File) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
      const maxSize = 10 * 1024 * 1024 // 10MB
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('نوع الملف غير مدعوم. يرجى اختيار صورة JPEG أو PNG')
      }
      
      if (file.size > maxSize) {
        throw new Error('حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت')
      }
      
      return true
    },

    // Generate unique session ID
    generateSessionId() {
      return 'vto_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    },

    // Calculate image aspect ratio
    calculateAspectRatio(width: number, height: number) {
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
      const divisor = gcd(width, height)
      return `${width / divisor}:${height / divisor}`
    },

    // Check if device supports camera
    async checkCameraSupport() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false
      }
      
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        return devices.some(device => device.kind === 'videoinput')
      } catch {
        return false
      }
    },

    // Get device info for virtual try-on
    getDeviceInfo() {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenWidth: screen.width,
        screenHeight: screen.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        pixelRatio: window.devicePixelRatio
      }
    },

    // Debounce function for search
    debounce<T extends (...args: any[]) => any>(
      func: T,
      wait: number
    ): (...args: Parameters<T>) => void {
      let timeout: NodeJS.Timeout
      return (...args: Parameters<T>) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => func.apply(this, args), wait)
      }
    },

    // Throttle function for scroll events
    throttle<T extends (...args: any[]) => any>(
      func: T,
      limit: number
    ): (...args: Parameters<T>) => void {
      let inThrottle: boolean
      return (...args: Parameters<T>) => {
        if (!inThrottle) {
          func.apply(this, args)
          inThrottle = true
          setTimeout(() => inThrottle = false, limit)
        }
      }
    }
  }

  // Make utilities available globally
  return {
    provide: {
      virtualTryOn: utils
    }
  }
})
