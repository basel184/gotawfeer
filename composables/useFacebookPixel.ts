// Facebook Pixel tracking composable for Nuxt 3
// Handles event-based tracking with proper SPA support and event deduplication

import { ref, onMounted } from 'vue'

declare global {
    interface Window {
        fbq?: (...args: any[]) => void
        _fbq?: (...args: any[]) => void
    }
}

export function useFacebookPixel() {
    const config = useRuntimeConfig()
    const route = useRoute()
    const router = useRouter()

    // Get Pixel ID from environment variable
    const pixelId = config.public.fbPixelId || ''

    // Track if pixel is initialized
    const isInitialized = ref(false)

    /**
     * Generate unique event ID for deduplication
     * Format: timestamp_random
     */
    const generateEventId = (): string => {
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 15)
        return `${timestamp}_${random}`
    }

    /**
     * Initialize Facebook Pixel
     * Should be called once on app mount
     */
    const init = () => {
        if (!process.client || !pixelId || isInitialized.value) {
            return
        }

        // Check if fbq is already loaded
        if (typeof window.fbq === 'function') {
            isInitialized.value = true
            console.log('[FB Pixel] Already initialized')
            return
        }

        // Wait for fbq to be available (loaded from nuxt.config.ts)
        const checkFbq = setInterval(() => {
            if (typeof window.fbq === 'function') {
                clearInterval(checkFbq)
                isInitialized.value = true
                console.log('[FB Pixel] Initialized successfully')

                // Track initial page view
                trackPageView()
            }
        }, 100)

        // Clear interval after 5 seconds if fbq is not loaded
        setTimeout(() => {
            clearInterval(checkFbq)
            if (!isInitialized.value) {
                console.warn('[FB Pixel] Failed to initialize - fbq not found')
            }
        }, 5000)
    }

    /**
     * Track PageView event
     * Should be called on route changes for SPA navigation
     */
    const trackPageView = () => {
        if (!process.client || !isInitialized.value) return

        try {
            window.fbq?.('track', 'PageView')
            console.log('[FB Pixel] PageView tracked:', route.fullPath)
        } catch (error) {
            console.error('[FB Pixel] Error tracking PageView:', error)
        }
    }

    /**
     * Track ViewContent event
     * Used on product pages
     */
    const trackViewContent = (params: {
        content_ids: string[]
        content_name: string
        content_type?: string
        value: number
        currency: string
    }) => {
        if (!process.client || !isInitialized.value) return

        try {
            const eventId = generateEventId()

            window.fbq?.('track', 'ViewContent', {
                content_ids: params.content_ids,
                content_name: params.content_name,
                content_type: params.content_type || 'product',
                value: params.value,
                currency: params.currency
            }, {
                eventID: eventId
            })

            console.log('[FB Pixel] ViewContent tracked:', params)
            return eventId
        } catch (error) {
            console.error('[FB Pixel] Error tracking ViewContent:', error)
            return null
        }
    }

    /**
     * Track AddToCart event
     * Used when user adds product to cart
     */
    const trackAddToCart = (params: {
        content_ids: string[]
        content_name: string
        content_type?: string
        value: number
        currency: string
        quantity?: number
    }) => {
        if (!process.client || !isInitialized.value) return

        try {
            const eventId = generateEventId()

            window.fbq?.('track', 'AddToCart', {
                content_ids: params.content_ids,
                content_name: params.content_name,
                content_type: params.content_type || 'product',
                value: params.value,
                currency: params.currency,
                ...(params.quantity && { quantity: params.quantity })
            }, {
                eventID: eventId
            })

            console.log('[FB Pixel] AddToCart tracked:', params)
            return eventId
        } catch (error) {
            console.error('[FB Pixel] Error tracking AddToCart:', error)
            return null
        }
    }

    /**
     * Track InitiateCheckout event
     * Used when user starts checkout process
     */
    const trackInitiateCheckout = (params: {
        content_ids: string[]
        num_items: number
        value: number
        currency: string
    }) => {
        if (!process.client || !isInitialized.value) return

        try {
            const eventId = generateEventId()

            window.fbq?.('track', 'InitiateCheckout', {
                content_ids: params.content_ids,
                num_items: params.num_items,
                value: params.value,
                currency: params.currency
            }, {
                eventID: eventId
            })

            console.log('[FB Pixel] InitiateCheckout tracked:', params)
            return eventId
        } catch (error) {
            console.error('[FB Pixel] Error tracking InitiateCheckout:', error)
            return null
        }
    }

    /**
     * Track Purchase event
     * Used on order success page
     */
    const trackPurchase = async (params: {
        content_ids: string[]
        num_items: number
        value: number
        currency: string
        order_id?: string
    }) => {
        if (!process.client || !isInitialized.value) return

        try {
            const eventId = generateEventId()

            // Track on client-side (browser)
            window.fbq?.('track', 'Purchase', {
                content_ids: params.content_ids,
                num_items: params.num_items,
                value: params.value,
                currency: params.currency,
                ...(params.order_id && { order_id: params.order_id })
            }, {
                eventID: eventId
            })

            console.log('[FB Pixel] Purchase tracked (client):', params)

            // Also send to server for Conversion API
            try {
                await $fetch('/api/facebook/conversion', {
                    method: 'POST',
                    body: {
                        event_name: 'Purchase',
                        event_id: eventId,
                        event_time: Math.floor(Date.now() / 1000),
                        user_data: {
                            client_ip_address: '', // Will be filled by server
                            client_user_agent: navigator.userAgent,
                            fbc: getCookie('_fbc'),
                            fbp: getCookie('_fbp')
                        },
                        custom_data: {
                            content_ids: params.content_ids,
                            num_items: params.num_items,
                            value: params.value,
                            currency: params.currency,
                            ...(params.order_id && { order_id: params.order_id })
                        }
                    }
                })

                console.log('[FB Pixel] Purchase tracked (server):', eventId)
            } catch (serverError) {
                console.error('[FB Pixel] Error tracking Purchase on server:', serverError)
            }

            return eventId
        } catch (error) {
            console.error('[FB Pixel] Error tracking Purchase:', error)
            return null
        }
    }

    /**
     * Get cookie value by name
     */
    const getCookie = (name: string): string | undefined => {
        if (!process.client) return undefined

        const value = `; ${document.cookie}`
        const parts = value.split(`; ${name}=`)
        if (parts.length === 2) {
            return parts.pop()?.split(';').shift()
        }
        return undefined
    }

    /**
     * Track custom event
     */
    const trackCustomEvent = (eventName: string, params?: any) => {
        if (!process.client || !isInitialized.value) return

        try {
            const eventId = generateEventId()

            window.fbq?.('trackCustom', eventName, params, {
                eventID: eventId
            })

            console.log('[FB Pixel] Custom event tracked:', eventName, params)
            return eventId
        } catch (error) {
            console.error('[FB Pixel] Error tracking custom event:', error)
            return null
        }
    }

    // Initialize on mount (client-side only)
    if (process.client) {
        onMounted(() => {
            init()

            // Track page views on route changes (SPA navigation)
            router.afterEach(() => {
                if (isInitialized.value) {
                    trackPageView()
                }
            })
        })
    }

    return {
        init,
        trackPageView,
        trackViewContent,
        trackAddToCart,
        trackInitiateCheckout,
        trackPurchase,
        trackCustomEvent,
        isInitialized
    }
}
