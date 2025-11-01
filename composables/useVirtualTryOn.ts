// Virtual Try-On Composable
export function useVirtualTryOn() {
  const { $get, $post } = useApi()
  
  // إنشاء جلسة جديدة
  const createSession = async (guestId?: string) => {
    try {
      const response = await $post('v1/virtual-try-on/create-session', {
        guest_id: guestId
      })
      return response.data
    } catch (error) {
      console.error('Failed to create session:', error)
      throw error
    }
  }

  // رفع صورة العميل
  const uploadCustomerPhoto = async (sessionToken: string, photoFile: File, measurements?: any, preferences?: any) => {
    try {
      const formData = new FormData()
      formData.append('session_token', sessionToken)
      formData.append('photo', photoFile)
      
      if (measurements) {
        formData.append('body_measurements', JSON.stringify(measurements))
      }
      
      if (preferences) {
        formData.append('preferences', JSON.stringify(preferences))
      }

      // استخدام $fetch مباشرة مع FormData
      const response = await $fetch('/api/v1/virtual-try-on/upload-customer-photo', {
        method: 'POST',
        body: formData
      })
      return response.data
    } catch (error) {
      console.error('Failed to upload photo:', error)
      throw error
    }
  }

  // الحصول على المنتجات المتوافقة
  const getCompatibleProducts = async (sessionToken: string, category?: string, limit = 20) => {
    try {
      const params = new URLSearchParams({
        session_token: sessionToken,
        limit: limit.toString()
      })
      
      if (category) {
        params.append('category', category)
      }

      const response = await $get(`v1/virtual-try-on/compatible-products?${params}`)
      return response.data
    } catch (error) {
      console.error('Failed to get compatible products:', error)
      throw error
    }
  }

  // توليد تجربة افتراضية
  const generateTryOn = async (sessionToken: string, productId: number, size: string, angle = 'front') => {
    try {
      const response = await $post('v1/virtual-try-on/generate-try-on', {
        session_token: sessionToken,
        product_id: productId,
        size: size,
        angle: angle
      })
      return response.data
    } catch (error) {
      console.error('Failed to generate try-on:', error)
      throw error
    }
  }

  // حفظ النتيجة
  const saveResult = async (sessionToken: string, productId: number, size: string, resultImages: any, measurementsUsed: any, confidenceScores: any) => {
    try {
      const response = await $post('v1/virtual-try-on/save-result', {
        session_token: sessionToken,
        product_id: productId,
        size: size,
        result_images: resultImages,
        measurements_used: measurementsUsed,
        ai_confidence_scores: confidenceScores
      })
      return response.data
    } catch (error) {
      console.error('Failed to save result:', error)
      throw error
    }
  }

  // الحصول على نتائج الجلسة
  const getSessionResults = async (sessionToken: string) => {
    try {
      const response = await $get(`v1/virtual-try-on/session-results?session_token=${sessionToken}`)
      return response.data
    } catch (error) {
      console.error('Failed to get session results:', error)
      throw error
    }
  }

  // مشاركة النتيجة
  const shareResult = async (resultId: number, platform: string) => {
    try {
      const response = await $post('v1/virtual-try-on/share-result', {
        result_id: resultId,
        platform: platform
      })
      return response.data
    } catch (error) {
      console.error('Failed to share result:', error)
      throw error
    }
  }

  return {
    createSession,
    uploadCustomerPhoto,
    getCompatibleProducts,
    generateTryOn,
    saveResult,
    getSessionResults,
    shareResult
  }
}
