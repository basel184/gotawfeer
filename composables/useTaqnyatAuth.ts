import { ref } from 'vue'

export function useTaqnyatAuth() {
  const { $post, $get } = useApi()
  const auth = useAuth()
  const { t } = useI18n()

  const requestingOtp = ref(false)
  const verifyingOtp = ref(false)
  const resendingOtp = ref(false)
  const error = ref<string | null>(null)
  const success = ref<string | null>(null)

  /**
   * Request OTP code
   * @param phone - Phone number
   */
  async function requestOtp(phone: string) {
    if (!phone || phone.trim() === '') {
      error.value = t('taqnyat.phone_required') || 'رقم الهاتف مطلوب'
      return false
    }

    requestingOtp.value = true
    error.value = null
    success.value = null

    try {
      const response: any = await $post('v1/auth/taqnyat/request-otp', {
        phone: phone.trim()
      })

      if (response?.success || response?.message) {
        success.value = response.message || t('taqnyat.otp_sent') || 'تم إرسال رمز التحقق بنجاح'
        return true
      }

      error.value = response?.message || t('taqnyat.request_failed') || 'فشل في إرسال رمز التحقق'
      return false
    } catch (err: any) {
      console.error('Request OTP error:', err)
      // Handle nested data structure: err.data.data.message or err.data.message
      let errorMessage = ''
      if (err?.data?.data?.message) {
        errorMessage = err.data.data.message
      } else if (err?.data?.message) {
        errorMessage = err.data.message
      } else if (err?.message) {
        errorMessage = err.message
      } else {
        errorMessage = t('taqnyat.request_failed') || 'فشل في إرسال رمز التحقق'
      }
      error.value = errorMessage
      return false
    } finally {
      requestingOtp.value = false
    }
  }

  /**
   * Verify OTP code and login/register
   * @param phone - Phone number
   * @param otp - OTP code
   */
  async function verifyOtp(phone: string, otp: string) {
    if (!phone || phone.trim() === '') {
      error.value = t('taqnyat.phone_required') || 'رقم الهاتف مطلوب'
      return false
    }

    if (!otp || otp.trim() === '') {
      error.value = t('taqnyat.otp_required') || 'رمز التحقق مطلوب'
      return false
    }

    verifyingOtp.value = true
    error.value = null
    success.value = null

    try {
      const response: any = await $post('v1/auth/taqnyat/verify-otp', {
        phone: phone.trim(),
        otp: otp.trim()
      })

      // Handle different response formats
      if (response?.access_token) {
        auth.setToken(response.access_token)
        // Try to get user info
        try {
          const userInfo: any = await $get('v1/auth/taqnyat/me')
          if (userInfo) {
            auth.setUser(userInfo)
          }
        } catch (e) {
          // If user info fails, still set token
          auth.setUser(response.user || response.data)
        }
        success.value = t('taqnyat.login_success') || 'تم تسجيل الدخول بنجاح'
        return true
      } else if (response?.token) {
        auth.setToken(response.token)
        auth.setUser(response.user || response.data)
        success.value = t('taqnyat.login_success') || 'تم تسجيل الدخول بنجاح'
        return true
      } else if (response?.user) {
        // If no token but user data exists, try to get token from me endpoint
        auth.setUser(response.user)
        try {
          const userInfo: any = await $get('v1/auth/taqnyat/me')
          if (userInfo) {
            auth.setUser(userInfo)
          }
        } catch (e) {
          // Continue without token
        }
        success.value = t('taqnyat.login_success') || 'تم تسجيل الدخول بنجاح'
        return true
      }

      error.value = response?.message || t('taqnyat.verify_failed') || 'فشل في التحقق من رمز التحقق'
      return false
    } catch (err: any) {
      console.error('Verify OTP error:', err)
      // Handle validation errors
      if (err?.data?.errors && Array.isArray(err.data.errors)) {
        const errorMessages = err.data.errors.map((e: any) => e.message).join(', ')
        error.value = errorMessages
      } else {
        // Handle nested data structure: err.data.data.message or err.data.message
        let errorMessage = ''
        if (err?.data?.data?.message) {
          errorMessage = err.data.data.message
        } else if (err?.data?.message) {
          errorMessage = err.data.message
        } else if (err?.message) {
          errorMessage = err.message
        } else {
          errorMessage = t('taqnyat.verify_failed') || 'فشل في التحقق من رمز التحقق'
        }
        error.value = errorMessage
      }
      return false
    } finally {
      verifyingOtp.value = false
    }
  }

  /**
   * Resend OTP code
   * @param phone - Phone number
   */
  async function resendOtp(phone: string) {
    if (!phone || phone.trim() === '') {
      error.value = t('taqnyat.phone_required') || 'رقم الهاتف مطلوب'
      return false
    }

    resendingOtp.value = true
    error.value = null
    success.value = null

    try {
      const response: any = await $post('v1/auth/taqnyat/resend-otp', {
        phone: phone.trim()
      })

      if (response?.success || response?.message) {
        success.value = response.message || t('taqnyat.otp_resent') || 'تم إعادة إرسال رمز التحقق بنجاح'
        return true
      }

      error.value = response?.message || t('taqnyat.resend_failed') || 'فشل في إعادة إرسال رمز التحقق'
      return false
    } catch (err: any) {
      console.error('Resend OTP error:', err)
      // Handle nested data structure: err.data.data.message or err.data.message
      let errorMessage = ''
      if (err?.data?.data?.message) {
        errorMessage = err.data.data.message
      } else if (err?.data?.message) {
        errorMessage = err.data.message
      } else if (err?.message) {
        errorMessage = err.message
      } else {
        errorMessage = t('taqnyat.resend_failed') || 'فشل في إعادة إرسال رمز التحقق'
      }
      error.value = errorMessage
      return false
    } finally {
      resendingOtp.value = false
    }
  }

  /**
   * Get current user info
   */
  async function getMe() {
    try {
      const userInfo: any = await $get('v1/auth/taqnyat/me')
      if (userInfo) {
        auth.setUser(userInfo)
        return userInfo
      }
      return null
    } catch (err: any) {
      console.error('Get me error:', err)
      return null
    }
  }

  /**
   * Logout
   */
  async function logout() {
    try {
      await $post('v1/auth/taqnyat/logout', {})
      auth.setToken(null)
      auth.setUser(null)
      return true
    } catch (err: any) {
      console.error('Logout error:', err)
      // Even if logout fails, clear local auth
      auth.setToken(null)
      auth.setUser(null)
      return false
    }
  }

  /**
   * Clear error and success messages
   */
  function clearMessages() {
    error.value = null
    success.value = null
  }

  return {
    requestingOtp,
    verifyingOtp,
    resendingOtp,
    error,
    success,
    requestOtp,
    verifyOtp,
    resendOtp,
    getMe,
    logout,
    clearMessages
  }
}

