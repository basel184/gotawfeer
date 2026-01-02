<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

// Interfaces
interface Address {
  id: string
  address_type: string
  contact_person_name: string
  contact_person_number: string
  phone?: string
  address: string
  city: string
  zip?: string
  country: string
  latitude?: string
  longitude?: string
  is_billing?: number
}

const { t } = useI18n()
const { $get, $post, $put, $del } = useApi()

// Addresses data
const addresses = ref<Address[]>([])
const loading = ref(false)
const error = ref('')

// Address form
const showAddressForm = ref(false)
const editingAddress = ref<Address | null>(null)
const addressForm = ref({
  address_type: 'home',
  contact_person_name: '',
  contact_person_number: '',
  phone: '', // Required field
  address: '',
  city: '',
  zip: '55555',
  country: 'Saudi Arabia',
  latitude: '24.7136', // Default Riyadh coordinates
  longitude: '46.6753',
  is_billing: 1 // Required field (1 for yes, 0 for no)
})

const formLoading = ref(false)
const formError = ref('')

// Map state
const mapContainer = ref<HTMLElement | null>(null)
const map = ref<any>(null)
const marker = ref<any>(null)
const mapInitialized = ref(false)
const searchQuery = ref('')
const searching = ref(false)
const searchResults = ref<any[]>([])
const showSearchResults = ref(false)

// Load addresses
const loadAddresses = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await $get('v1/customer/address/list')
    addresses.value = response || []
  } catch (err: any) {
    console.error('Error loading addresses:', err)
    error.value = err?.data?.message || 'خطأ في تحميل العناوين'
  } finally {
    loading.value = false
  }
}

// Open add address form
const openAddForm = () => {
  editingAddress.value = null
  addressForm.value = {
    address_type: 'home',
    contact_person_name: '',
    contact_person_number: '',
    phone: '', // Required field
    address: '',
    city: '',
    zip: '',
    country: 'Saudi Arabia',
    latitude: '24.7136', // Default Riyadh coordinates
    longitude: '46.6753',
    is_billing: 1 // Required field (1 for yes, 0 for no)
  }
  formError.value = ''
  showAddressForm.value = true
}

// Open edit address form
const openEditForm = (address: Address) => {
  editingAddress.value = address
  addressForm.value = {
    address_type: address.address_type || 'home',
    contact_person_name: address.contact_person_name || '',
    contact_person_number: address.contact_person_number || '',
    phone: address.phone || address.contact_person_number || '', // Use phone or fallback to contact_person_number
    address: address.address || '',
    city: address.city || '',
    zip: address.zip || '',
    country: address.country || 'Saudi Arabia',
    latitude: address.latitude || '24.7136',
    longitude: address.longitude || '46.6753',
    is_billing: address.is_billing !== undefined ? address.is_billing : 1
  }
  formError.value = ''
  showAddressForm.value = true
}

// Close form
const closeForm = () => {
  showAddressForm.value = false
  editingAddress.value = null
  formError.value = ''
  // Cleanup map
  if (map.value) {
    map.value.remove()
    map.value = null
    marker.value = null
    mapInitialized.value = false
  }
}

// Initialize map
const initMap = async () => {
  if (!process.client || mapInitialized.value || !mapContainer.value) return
  
  try {
    // Dynamically import Leaflet - use client-side only
    // Use $fetch or dynamic import with proper handling
    const leafletModule = await import('leaflet')
    const L = (leafletModule as any).default || leafletModule
    
    // Fix Leaflet icon paths
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
    
    // Import CSS dynamically
    if (process.client && !document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
      link.crossOrigin = ''
      document.head.appendChild(link)
    }
    
    // Get coordinates from form or use default
    const lat = parseFloat(addressForm.value.latitude) || 24.7136
    const lng = parseFloat(addressForm.value.longitude) || 46.6753
    
    // Initialize map
    map.value = L.map(mapContainer.value, {
      center: [lat, lng],
      zoom: 13
    })
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map.value)
    
    // Add marker
    marker.value = L.marker([lat, lng], {
      draggable: true
    }).addTo(map.value)
    
    // Update coordinates when marker is dragged
    marker.value.on('dragend', (e: any) => {
      const position = e.target.getLatLng()
      addressForm.value.latitude = position.lat.toFixed(6)
      addressForm.value.longitude = position.lng.toFixed(6)
    })
    
    // Update marker when map is clicked
    map.value.on('click', (e: any) => {
      const { lat, lng } = e.latlng
      addressForm.value.latitude = lat.toFixed(6)
      addressForm.value.longitude = lng.toFixed(6)
      
      if (marker.value) {
        marker.value.setLatLng([lat, lng])
      } else {
        marker.value = L.marker([lat, lng], {
          draggable: true
        }).addTo(map.value)
        marker.value.on('dragend', (e: any) => {
          const position = e.target.getLatLng()
          addressForm.value.latitude = position.lat.toFixed(6)
          addressForm.value.longitude = position.lng.toFixed(6)
        })
      }
    })
    
    mapInitialized.value = true
    
    // Invalidate size after a short delay to ensure container is visible
    setTimeout(() => {
      if (map.value) {
        map.value.invalidateSize()
      }
    }, 300)
  } catch (error) {
    console.error('Error initializing map:', error)
  }
}

// Watch for form opening to initialize map
watch(showAddressForm, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    setTimeout(() => {
      initMap()
    }, 100)
  }
})

// Update marker position when coordinates change manually
watch([() => addressForm.value.latitude, () => addressForm.value.longitude], ([lat, lng]) => {
  if (map.value && marker.value && mapInitialized.value) {
    const latNum = parseFloat(lat) || 24.7136
    const lngNum = parseFloat(lng) || 46.6753
    marker.value.setLatLng([latNum, lngNum])
    map.value.setView([latNum, lngNum], map.value.getZoom())
  }
})

// Search for location on map
const searchLocation = async () => {
  if (!searchQuery.value.trim() || !map.value) return
  
  searching.value = true
  searchResults.value = []
  showSearchResults.value = false
  
  try {
    // Use Nominatim (OpenStreetMap) geocoding API
    const query = encodeURIComponent(searchQuery.value.trim())
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5&addressdetails=1&accept-language=ar,en`
    )
    
    const data = await response.json()
    
    if (Array.isArray(data) && data.length > 0) {
      searchResults.value = data
      showSearchResults.value = true
    } else {
      formError.value = 'لم يتم العثور على نتائج'
    }
  } catch (error) {
    console.error('Error searching location:', error)
    formError.value = 'حدث خطأ أثناء البحث'
  } finally {
    searching.value = false
  }
}

// Select search result
const selectSearchResult = (result: any) => {
  const lat = parseFloat(result.lat)
  const lng = parseFloat(result.lon)
  
  if (!isNaN(lat) && !isNaN(lng)) {
    // Update form coordinates
    addressForm.value.latitude = lat.toFixed(6)
    addressForm.value.longitude = lng.toFixed(6)
    
    // Update map view
    if (map.value) {
      map.value.setView([lat, lng], 15)
      
      // Update marker
      if (marker.value) {
        marker.value.setLatLng([lat, lng])
      }
    }
    
    // Update address fields if available
    const address = result.address || {}
    if (address.road || address.street) {
      addressForm.value.address = (address.road || address.street || '') + 
        (address.house_number ? ` ${address.house_number}` : '')
    }
    if (address.city || address.town || address.village) {
      addressForm.value.city = address.city || address.town || address.village || ''
    }
    
    // Clear search
    searchQuery.value = ''
    searchResults.value = []
    showSearchResults.value = false
  }
}

// Get current location
const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    formError.value = 'المتصفح لا يدعم تحديد الموقع'
    return
  }
  
  searching.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      
      addressForm.value.latitude = lat.toFixed(6)
      addressForm.value.longitude = lng.toFixed(6)
      
      if (map.value) {
        map.value.setView([lat, lng], 15)
        if (marker.value) {
          marker.value.setLatLng([lat, lng])
        }
      }
      
      searching.value = false
    },
    (error) => {
      console.error('Geolocation error:', error)
      formError.value = 'فشل في تحديد موقعك الحالي'
      searching.value = false
    }
  )
}

// Submit address form
const submitAddress = async () => {
  formLoading.value = true
  formError.value = ''

  try {
    // Prepare form data with required fields - ensure all required fields are present
    const formData = {
      address_type: addressForm.value.address_type,
      contact_person_name: addressForm.value.contact_person_name,
      contact_person_number: addressForm.value.contact_person_number,
      address: addressForm.value.address,
      city: addressForm.value.city,
      zip: addressForm.value.zip,
      country: addressForm.value.country,
      // Required fields with fallbacks - ensure they are not empty
      phone: addressForm.value.phone || addressForm.value.contact_person_number || '',
      latitude: addressForm.value.latitude ? String(addressForm.value.latitude) : '24.7136',
      longitude: addressForm.value.longitude ? String(addressForm.value.longitude) : '46.6753',
      is_billing: Number(addressForm.value.is_billing) || 1
    }

    console.log('Sending form data:', formData) // Debug log

    if (editingAddress.value) {
      // Update existing address
      await $put('v1/customer/address/update', {
        id: editingAddress.value.id,
        ...formData
      })
    } else {
      // Add new address
      await $post('v1/customer/address/add', formData)
    }
    
    closeForm()
    await loadAddresses()
  } catch (err: any) {
    console.error('Error saving address:', err)
    formError.value = err?.data?.message || 'خطأ في حفظ العنوان'
  } finally {
    formLoading.value = false
  }
}

// Delete address
const deleteAddress = async (addressId: string) => {
  if (!confirm('هل أنت متأكد من حذف هذا العنوان؟')) return

  try {
    await $del(`v1/customer/address?id=${addressId}`)
    await loadAddresses()
  } catch (err: any) {
    console.error('Error deleting address:', err)
  }
}

// Get address type name
const getAddressTypeName = (type: string) => {
  const types: Record<string, string> = {
    home: 'المنزل',
    work: 'العمل',
    other: 'أخرى'
  }
  return types[type] || type
}

// Load data on mount
onMounted(() => {
  loadAddresses()
})

// Cleanup on unmount
onBeforeUnmount(() => {
  if (map.value) {
    map.value.remove()
    map.value = null
    marker.value = null
  }
})
</script>

<template>
  <div class="addresses-page" dir="rtl">
    <div class="container">
      <div class="page-header">
        <h1>عنواني</h1>
        <p>إدارة عناوينك المحفوظة</p>
      </div>

      <div class="addresses-content">
        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>جاري تحميل العناوين...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-state">
          <div class="error-icon">⚠️</div>
          <h3>خطأ في التحميل</h3>
          <p>{{ error }}</p>
          <button @click="loadAddresses" class="retry-btn">إعادة المحاولة</button>
        </div>

        <!-- Addresses List -->
        <div v-else class="addresses-section">
          <div class="section-header">
            <h2>العناوين المحفوظة</h2>
            <button @click="openAddForm" class="add-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              إضافة عنوان جديد
            </button>
          </div>

          <!-- Empty State -->
          <div v-if="addresses.length === 0" class="empty-state">
            <div class="empty-icon">📍</div>
            <h3>لا توجد عناوين محفوظة</h3>
            <p>قم بإضافة عنوان لتسهيل عملية الطلب</p>
            <button @click="openAddForm" class="add-first-btn">إضافة أول عنوان</button>
          </div>

          <!-- Addresses Grid -->
          <div v-else class="addresses-grid">
            <ClientOnly>
              <div v-for="address in addresses" :key="address.id" class="address-card">
                <div class="address-header">
                  <div class="address-type">
                    <span class="type-badge">{{ getAddressTypeName(address.address_type) }}</span>
                  </div>
                  <div class="address-actions">
                    <button @click="openEditForm(address)" class="action-btn edit">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                      تعديل
                    </button>
                    <button @click="deleteAddress(address.id)" class="action-btn delete">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                      حذف
                    </button>
                  </div>
                </div>

                <div class="address-details">
                  <div class="contact-info">
                    <h4>{{ address.contact_person_name }}</h4>
                    <p>{{ address.contact_person_number }}</p>
                  </div>
                  <div class="address-info">
                    <p>{{ address.address }}</p>
                    <p>{{ address.city }}, {{ address.zip }}</p>
                    <p>{{ address.country }}</p>
                  </div>
                </div>
              </div>
            </ClientOnly>
          </div>
        </div>
      </div>
    </div>

    <!-- Address Form Modal -->
    <teleport to="body">
      <div v-if="showAddressForm" class="modal-overlay" @click.self="closeForm">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ editingAddress ? 'تعديل العنوان' : 'إضافة عنوان جديد' }}</h2>
            <button @click="closeForm" class="close-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
              </svg>
            </button>
          </div>

          <form @submit.prevent="submitAddress" class="address-form">
            <div class="form-group d-none">
              <label for="address_type">نوع العنوان</label>
              <select id="address_type" v-model="addressForm.address_type" required>
                <option value="home">المنزل</option>
                <option value="work">العمل</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="contact_person_name">اسم المستلم</label>
                <input
                  id="contact_person_name"
                  v-model="addressForm.contact_person_name"
                  type="text"
                  required
                  :disabled="formLoading"
                />
              </div>
              <div class="form-group">
                <label for="contact_person_number">رقم الهاتف</label>
                <input
                id="phone"
                v-model="addressForm.phone"
                type="tel"
                required
                placeholder="مثال: +966501234567"
                :disabled="formLoading"
              />
              </div>
            </div>

            <div class="form-group">
              <label for="address">العنوان التفصيلي</label>
              <input
                id="address"
                v-model="addressForm.address"
                required
                :disabled="formLoading"
              />
            </div>

            <div class="">
              <div class="form-group">
                <label for="city">المدينة</label>
                <input
                  id="city"
                  v-model="addressForm.city"
                  type="text"
                  required
                  :disabled="formLoading"
                />
              </div>
              <div class="form-group d-none">
                <label for="zip">الرمز البريدي</label>
                <input
                  id="zip"
                  v-model="addressForm.zip"
                  type="text"
                  :disabled="formLoading"
                />
              </div>
            </div>

            <div class="form-group d-none">
              <label for="country">البلد</label>
              <input
                id="country"
                v-model="addressForm.country"
                type="text"
                required
                :disabled="formLoading"
              />
            </div>

            <!-- Map Section -->
            <ClientOnly>
              <div class="form-group">
                <label>تحديد الموقع على الخريطة</label>
                <p class="map-instructions">ابحث عن موقعك أو انقر على الخريطة لتحديد الموقع أو اسحب العلامة</p>
                
                <!-- Search Box -->
                <div class="map-search-container">
                  <div class="search-input-wrapper">
                    <input
                      v-model="searchQuery"
                      type="text"
                      class="map-search-input"
                      placeholder="ابحث عن عنوان أو مكان..."
                      @keyup.enter="searchLocation"
                      @input="showSearchResults = false"
                      :disabled="formLoading || searching"
                    />
                    <button
                      type="button"
                      @click="searchLocation"
                      class="search-btn"
                      :disabled="formLoading || searching || !searchQuery.trim()"
                    >
                      <svg v-if="!searching" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                      </svg>
                      <div v-else class="search-spinner"></div>
                    </button>
                    <button
                      type="button"
                      @click="getCurrentLocation"
                      class="location-btn"
                      :disabled="formLoading || searching"
                      title="تحديد موقعي الحالي"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                      </svg>
                    </button>
                  </div>
                  
                  <!-- Search Results -->
                  <div v-if="showSearchResults && searchResults.length > 0" class="search-results">
                    <div
                      v-for="(result, index) in searchResults"
                      :key="index"
                      class="search-result-item"
                      @click="selectSearchResult(result)"
                    >
                      <div class="result-icon">📍</div>
                      <div class="result-content">
                        <div class="result-name">{{ result.display_name }}</div>
                        <div class="result-type">{{ result.type }}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div ref="mapContainer" class="map-container"></div>
              </div>
            </ClientOnly>

            <div class="form-row">
              <div class="form-group">
                <label for="latitude">خط العرض</label>
                <input
                  id="latitude"
                  v-model="addressForm.latitude"
                  type="text"
                  step="any"
                  placeholder="24.7136"
                  :disabled="formLoading"
                  readonly
                />
              </div>
              <div class="form-group">
                <label for="longitude">خط الطول</label>
                <input
                  id="longitude"
                  v-model="addressForm.longitude"
                  type="text"
                  step="any"
                  placeholder="46.6753"
                  :disabled="formLoading"
                  readonly
                />
              </div>
            </div>

            <div class="form-group d-none">
              <label for="is_billing">نوع العنوان</label>
              <select id="is_billing" v-model.number="addressForm.is_billing" :disabled="formLoading">
                <option :value="1">عنوان الفواتير</option>
                <option :value="0">عنوان الشحن فقط</option>
              </select>
            </div>

            <div v-if="formError" class="error-message">
              {{ formError }}
            </div>

            <div class="form-actions">
              <button type="button" @click="closeForm" class="cancel-btn" :disabled="formLoading">
                إلغاء
              </button>
              <button type="submit" class="submit-btn" :disabled="formLoading">
                <span v-if="formLoading">جاري الحفظ...</span>
                <span v-else>{{ editingAddress ? 'تحديث' : 'إضافة' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.addresses-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 20px 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px;
}

.page-header p {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #6b46c1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error State */
.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-state h3 {
  font-size: 24px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px;
}

.error-state p {
  font-size: 16px;
  margin: 0 0 24px;
}

.retry-btn {
  background: #6b46c1;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background: #553c9a;
}

/* Addresses Section */
.addresses-section {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.add-btn {
  background: #6b46c1;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-btn:hover {
  background: #553c9a;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 24px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px;
}

.empty-state p {
  font-size: 16px;
  margin: 0 0 24px;
}

.add-first-btn {
  background: #6b46c1;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-first-btn:hover {
  background: #553c9a;
}

/* Addresses Grid */
.addresses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.address-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  transition: box-shadow 0.2s;
}

.address-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.address-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.type-badge {
  background: #f3f4f6;
  color: #374151;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.address-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn.edit {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.action-btn.edit:hover {
  background: #e5e7eb;
}

.action-btn.delete {
  background: #fee;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.action-btn.delete:hover {
  background: #fecaca;
}

.address-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-info h4 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 4px;
}

.contact-info p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.address-info p {
  font-size: 14px;
  color: #374151;
  margin: 0 0 4px;
  line-height: 1.5;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 0;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
}

.address-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #6b46c1;
  box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1);
}

.form-group input:disabled,
.form-group select:disabled,
.form-group textarea:disabled {
  background: #f9fafb;
  color: #6b7280;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.error-message {
  background: #fee;
  color: #c53030;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
  border: 1px solid #feb2b2;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.cancel-btn {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.submit-btn {
  background: #6b46c1;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: #553c9a;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Map Styles */
.map-container {
  width: 100%;
  height: 400px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  overflow: hidden;
  margin-top: 8px;
}

.map-instructions {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 8px 0;
}

.form-group input[readonly] {
  background: #f9fafb;
  cursor: not-allowed;
}

/* Map Search Styles */
.map-search-container {
  position: relative;
  margin-bottom: 12px;
}

.search-input-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.map-search-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.map-search-input:focus {
  outline: none;
  border-color: #6b46c1;
  box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1);
}

.search-btn,
.location-btn {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #6b46c1;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-btn:hover:not(:disabled),
.location-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #6b46c1;
}

.search-btn:disabled,
.location-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #6b46c1;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  margin-top: 8px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.search-result-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f3f4f6;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: #f9fafb;
}

.result-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 4px;
  word-break: break-word;
}

.result-type {
  font-size: 12px;
  color: #6b7280;
  text-transform: capitalize;
}

/* Responsive */
@media (max-width: 768px) {
  .addresses-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .form-actions {
    flex-direction: column;
  }

  .cancel-btn,
  .submit-btn {
    width: 100%;
  }
}
</style>