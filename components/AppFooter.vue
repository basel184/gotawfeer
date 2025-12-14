<template>
  <footer class="app-footer" :dir="dir">
    <div class="footer-container">
      <!-- Main Footer Content -->
      <div class="footer-main">
        

        <!-- Brand Section -->
        <div class="footer-brand">
          <h5>{{ t('footer.brand.title') }}
          </h5>
          <p class="brand-description">
            {{ t('footer.brand.description') }}
          </p>
          <div class="info-contact d-flex flex-column gap-3">
            <div class="info-cont d-flex align-items-center gap-2">
              <i class="fa-solid fa-phone"></i>
              <a href="tel:+966537030838" dir="ltr" class="text-white text-decoration-none ">+966 53 703 0838</a>
            </div>
            <div class="info-cont d-flex align-items-center gap-2">
              <i class="fa-solid fa-envelope"></i>
              <a href="mailto:gotawfeer@gmail.com" dir="ltr" class="text-white text-decoration-none ">gotawfeer@gmail.com</a>
            </div>
          </div>
          <div class="social-links">
            <a href="https://snapchat.com/t/dpmi7a5g" class="social-link" aria-label="Google">
              <i class="fa-brands fa-snapchat"></i>
            </a>
            <a href="https://www.tiktok.com/@gotawfeer?_t=ZS-8xzCD5bV1Ca&_r=1" class="social-link" aria-label="Twitter">
              <i class="fa-brands fa-tiktok"></i>
            </a>
            <a href="https://www.instagram.com/gotawfeer/" class="social-link" aria-label="Instagram">
              <i class="fa-brands fa-instagram"></i>
            </a>
            <a href="https://www.facebook.com/share/1CVErHZmQ9/?mibextid=wwXIfr" class="social-link" aria-label="LinkedIn">
              <i class="fa-brands fa-facebook"></i>
            </a>
          </div>
        </div>

        <!-- Navigation Links -->
        <div class="footer-links">
          <!-- Main Links -->
            <div class="link-section">
              <ul class="link-list">
                <li><NuxtLink :to="getLocalizedPath('/special_requests')" class="footer-link">{{ t('footer.links.company.special_requests') }}</NuxtLink></li>
                <li><NuxtLink :to="getLocalizedPath('/intellectual-property-rights')" class="footer-link">{{ t('footer.links.company.intellectual_property') }}</NuxtLink></li>
              </ul>
            </div>



          <!-- Account Links -->
          <div class="link-section">
            <ul class="link-list">
              <li><NuxtLink :to="getLocalizedPath('/about')" class="footer-link">{{ t('footer.links.company.about') }}</NuxtLink></li>
              <li><NuxtLink :to="getLocalizedPath('/blogs')" class="footer-link">{{ t('footer.links.company.blog') }}</NuxtLink></li>
            </ul>
          </div>
        </div>
        <!-- Newsletter Section -->
        <div class="newsletter-section">
                    <!-- Company Links -->
          <div class="link-section">
            <ul class="link-list">
              <li><NuxtLink :to="getLocalizedPath('/privacy-policy')" class="footer-link">{{ t('footer.links.company.privacy_policy') }}</NuxtLink></li>
              <li><NuxtLink :to="getLocalizedPath('/shipping-return-policy')" class="footer-link">{{ t('footer.links.company.shipping_return_policy') }}</NuxtLink></li>
            </ul>
            <a href="/images/Certificate.pdf" target="_blank" rel="noopener noreferrer">
              <img src="/images/footer-social.jpg" :style="{ width: '50px' , borderRadius: '10px' }" alt="logo" class="logo-img">
            </a>
          </div>
        </div>
      </div>
    </div>
  </footer>

  <!-- Login Modal -->
  <teleport to="body">
    <div v-if="loginModalOpen" class="login-overlay" @click.self="closeLoginModal">
      <div class="login-modal" dir="rtl">
        <div class="login-header">
          <h2>{{ t('login') || 'تسجيل الدخول' }}</h2>
          <button class="close-btn" @click="closeLoginModal">
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
          </button>
        </div>
        
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label for="email">{{ t('email') || 'البريد الإلكتروني' }}</label>
            <input 
              id="email"
              v-model="loginForm.email" 
              type="email" 
              :placeholder="t('email') || 'البريد الإلكتروني'"
              required
              :disabled="loginLoading"
            />
          </div>
          
          <div class="form-group">
            <label for="password">{{ t('password') || 'كلمة المرور' }}</label>
            <input 
              id="password"
              v-model="loginForm.password" 
              type="password" 
              :placeholder="t('password') || 'كلمة المرور'"
              required
              :disabled="loginLoading"
            />
          </div>
          
          <div v-if="loginError" class="error-message">
            {{ loginError }}
          </div>
          
          <button type="submit" class="main-btn" :disabled="loginLoading">
            <span v-if="loginLoading">{{ t('login.loading') || 'جاري تسجيل الدخول...' }}</span>
            <span v-else>{{ t('login') || 'تسجيل الدخول' }}</span>
          </button>
        </form>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../composables/useAuth'

const { t, locale } = useI18n()
const dir = computed(() => locale.value === 'ar' ? 'rtl' : 'ltr')
const auth = useAuth()
const email = ref('')

// Helper function to get localized path with proper i18n handling
const getLocalizedPath = (path: string): string => {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  
  // Get current locale from i18n
  const currentLocale = locale.value || 'ar'
  
  // If English locale, add /en prefix
  if (currentLocale === 'en') {
    // Don't add prefix if already present
    if (cleanPath.startsWith('/en')) {
      return cleanPath
    }
    // Add /en prefix
    return `/en${cleanPath}`
  }
  
  // For Arabic (default), remove /en prefix if present
  if (cleanPath.startsWith('/en')) {
    return cleanPath.substring(3) || '/'
  }
  
  return cleanPath
}

// Login modal state
const loginModalOpen = ref(false)
const loginForm = ref({ email: '', password: '' })
const loginError = ref('')
const loginLoading = ref(false)

const subscribe = () => {
  if (email.value) {
    // Handle newsletter subscription
    console.log('Subscribing email:', email.value)
    // You can add API call here
    email.value = ''
  }
}

const handleOrdersClick = () => {
  if (auth.user.value) {
    navigateTo(getLocalizedPath('/account?orders=true'))
  } else {
    // Open login modal
    openLoginModal()
  }
}

// Login functions
async function handleLogin() {
  if (!loginForm.value.email || !loginForm.value.password) {
    loginError.value = t('login.required_fields') || 'جميع الحقول مطلوبة'
    return
  }
  
  loginLoading.value = true
  loginError.value = ''
  
  try {
    const response: any = await $fetch('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email_or_phone: loginForm.value.email,
        password: loginForm.value.password,
        type: 'email'
      }
    })
    
    // Handle different response formats
    if (response?.access_token) {
      auth.setToken(response.access_token)
      // Try to get user info
      try {
        const userInfo: any = await $fetch('/api/v1/customer/info')
        if (userInfo) auth.setUser(userInfo)
      } catch (e) {
        // If user info fails, still set token
        auth.setUser(response.user || response.data)
      }
      loginModalOpen.value = false
      loginForm.value = { email: '', password: '' }
      // Navigate to orders page after successful login
      navigateTo(getLocalizedPath('/account?orders=true'))
    } else if (response?.token) {
      auth.setToken(response.token)
      auth.setUser(response.user || response.data)
      loginModalOpen.value = false
      loginForm.value = { email: '', password: '' }
      // Navigate to orders page after successful login
      navigateTo(getLocalizedPath('/account?orders=true'))
    }
  } catch (error: any) {
    console.error('Login error:', error)
    // Handle validation errors
    if (error?.data?.errors && Array.isArray(error.data.errors)) {
      const errorMessages = error.data.errors.map((err: any) => err.message).join(', ')
      loginError.value = errorMessages
    } else {
      loginError.value = error?.data?.message || t('login.error') || 'خطأ في تسجيل الدخول'
    }
  } finally {
    loginLoading.value = false
  }
}

function openLoginModal() {
  loginModalOpen.value = true
  loginError.value = ''
  loginForm.value = { email: '', password: '' }
}

function closeLoginModal() {
  loginModalOpen.value = false
  loginError.value = ''
  loginForm.value = { email: '', password: '' }
}
</script>

<style scoped>
.app-footer {
  background-image: url('../images/BG.png');
  color: #ffffff;
  padding: 30px 0 70px;
  margin-top: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.footer-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}

.newsletter-content {
  position: relative;
  z-index: 2;
  width: 100%;
}

.newsletter-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 15px;
  color: #ffffff;
}

.newsletter-form {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
  padding: 5px;
  border-radius: 10px;
  background: #ffffff;
  
}

.email-input-wrapper {
  position: relative;
  flex: 1;
  width: 50%;
}

.email-icon {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  font-size: 16px;
}

.email-input {
  width: 100%;
  padding: 15px 50px 15px 15px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  background: #ffffff;
  color: #333;
}

.email-input::placeholder {
  color: #999;
}

.subscribe-btn {
  background: #f58040;
  color: #ffffff;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.subscribe-btn:hover:not(:disabled) {
  background: #e67030;
  transform: translateY(-2px);
}

.subscribe-btn:disabled {
  cursor: not-allowed;
}

/* Main Footer Content */
.footer-main {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 40px;
  align-items: start;
}

/* Brand Section */
.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.brand-logo {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.logo-text {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.logo-go {
  font-size: 36px;
  font-weight: 900;
  color: #f58040;
  position: relative;
}

.logo-go::after {
  content: '%';
  position: absolute;
  top: -5px;
  right: -15px;
  font-size: 20px;
  color: #f58040;
}

.logo-tawfeer {
  font-size: 24px;
  font-weight: 700;
  color: #4a90e2;
}

.logo-arabic {
  font-size: 18px;
  color: #4a90e2;
  font-weight: 500;
}

.brand-description {
  color: #cccccc;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.social-links {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #3a3a3a;
  border-radius: 50%;
  color: #ffffff;
  text-decoration: none;
  transition: all 0.3s ease;
}

.social-link:hover {
  background: #f58040;
  transform: translateY(-2px);
}

.social-link i {
  font-size: 16px;
}

/* Footer Links */
.footer-links {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 40px;
}

.link-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.link-title {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.link-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-link {
  color: #cccccc;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s ease;
}

.footer-link:hover {
  color: #f58040;
}

/* Responsive Design */
@media (max-width: 768px) {
  .footer-main {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .footer-links {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .newsletter-form {
    flex-direction: column;
    align-items: stretch;
  }
  
  .email-input-wrapper {
    min-width: auto;
  }
  
  .newsletter-title {
    font-size: 20px;
  }
  
  .brand-logo {
    text-align: center;
  }
}

@media (max-width: 1024px) {
  .footer-main {
    grid-template-columns: 1fr 1fr;
    gap: 30px;
  }
  
  .footer-links {
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .app-footer {
    padding: 30px 0 15px;
  }
  
  .footer-container {
    padding: 0 15px;
  }
  
  .newsletter-section {
    padding: 20px;
    margin-bottom: 30px;
  }
  
  .newsletter-title {
    font-size: 18px;
  }
  
  .email-input {
    padding: 12px 45px 12px 12px;
    font-size: 14px;
  }
  
  .subscribe-btn {
    padding: 12px 20px;
    font-size: 14px;
  }
  
  .logo-go {
    font-size: 28px;
  }
  
  .logo-tawfeer {
    font-size: 20px;
  }
  
  .logo-arabic {
    font-size: 16px;
  }
  
  .link-title {
    font-size: 16px;
  }
  
  .footer-link {
    font-size: 13px;
  }
}

/* RTL Support */
[dir="ltr"] .app-footer {
  direction: ltr;
}

[dir="ltr"] .email-icon {
  right: auto;
  left: 15px;
}

[dir="ltr"] .email-input {
  padding: 15px 15px 15px 50px;
}

[dir="ltr"] .newsletter-section::before {
  right: auto;
  left: 0;
  background: linear-gradient(-45deg, #3a3a3a 0%, transparent 100%);
}

[dir="ltr"] .logo-go::after {
  right: auto;
  left: -15px;
}

/* Login Modal Styles */
.login-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.login-modal {
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 400px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.login-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.login-header h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.form-group input {
  padding: 12px 15px;
  border: 2px solid #e1e1e1;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s ease;
  background: #fff;
}

.form-group input:focus {
  outline: none;
  border-color: #f58040;
}

.form-group input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 10px 15px;
  border-radius: 6px;
  font-size: 14px;
  border: 1px solid #fcc;
}

.login-btn {
  background: #f58040;
  color: white;
  border: none;
  padding: 15px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 10px;
}

.login-btn:hover:not(:disabled) {
  background: #e67030;
  transform: translateY(-1px);
}

.login-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

/* RTL Support for Modal */
[dir="rtl"] .login-modal {
  text-align: right;
}

[dir="ltr"] .login-modal {
  text-align: left;
}
</style>