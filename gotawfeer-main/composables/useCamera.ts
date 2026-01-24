// Camera Composable for Virtual Try-On
export function useCamera() {
  const isSupported = ref(false)
  const stream = ref<MediaStream | null>(null)
  const videoRef = ref<HTMLVideoElement | null>(null)
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const error = ref<string | null>(null)
  const isActive = ref(false)

  // فحص دعم الكاميرا
  const checkCameraSupport = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported')
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      if (videoDevices.length === 0) {
        throw new Error('No camera devices found')
      }
      
      isSupported.value = true
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Camera not supported'
      isSupported.value = false
      return false
    }
  }

  // بدء الكاميرا
  const startCamera = async (constraints: MediaStreamConstraints = {}) => {
    try {
      error.value = null
      
      const defaultConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      }

      const finalConstraints = { ...defaultConstraints, ...constraints }
      
      stream.value = await navigator.mediaDevices.getUserMedia(finalConstraints)
      
      if (videoRef.value) {
        videoRef.value.srcObject = stream.value
        videoRef.value.play()
        isActive.value = true
      }
      
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to start camera'
      isActive.value = false
      return false
    }
  }

  // إيقاف الكاميرا
  const stopCamera = () => {
    if (stream.value) {
      stream.value.getTracks().forEach(track => track.stop())
      stream.value = null
    }
    
    if (videoRef.value) {
      videoRef.value.srcObject = null
    }
    
    isActive.value = false
  }

  // التقاط صورة
  const capturePhoto = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!videoRef.value || !canvasRef.value) {
        reject(new Error('Video or canvas not available'))
        return
      }

      const video = videoRef.value
      const canvas = canvasRef.value
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }

      // تعيين أبعاد الكانفاس
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // رسم الفيديو على الكانفاس
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // تحويل إلى base64
      const dataURL = canvas.toDataURL('image/jpeg', 0.9)
      resolve(dataURL)
    })
  }

  // تحويل base64 إلى File
  const dataURLToFile = (dataURL: string, filename: string): File => {
    const arr = dataURL.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    
    return new File([u8arr], filename, { type: mime })
  }

  // التقاط صورة وتحويلها إلى File
  const capturePhotoAsFile = async (filename = 'photo.jpg'): Promise<File> => {
    const dataURL = await capturePhoto()
    return dataURLToFile(dataURL, filename)
  }

  // الحصول على قائمة الكاميرات المتاحة
  const getAvailableCameras = async (): Promise<MediaDeviceInfo[]> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.filter(device => device.kind === 'videoinput')
    } catch (err) {
      console.error('Failed to get cameras:', err)
      return []
    }
  }

  // تبديل الكاميرا
  const switchCamera = async (deviceId: string) => {
    await stopCamera()
    return await startCamera({
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })
  }

  // تنظيف الموارد
  const cleanup = () => {
    stopCamera()
    error.value = null
  }

  // تنظيف عند إلغاء التثبيت
  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    isSupported: readonly(isSupported),
    stream: readonly(stream),
    videoRef,
    canvasRef,
    error: readonly(error),
    isActive: readonly(isActive),
    
    // Methods
    checkCameraSupport,
    startCamera,
    stopCamera,
    capturePhoto,
    capturePhotoAsFile,
    dataURLToFile,
    getAvailableCameras,
    switchCamera,
    cleanup
  }
}
