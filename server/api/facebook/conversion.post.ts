// Facebook Conversion API server endpoint
// Sends events to Facebook's server-side API for better tracking reliability

import { H3Event } from 'h3'
import crypto from 'crypto'

export default defineEventHandler(async (event: H3Event) => {
    try {
        const config = useRuntimeConfig()
        const pixelId = config.public.fbPixelId
        const accessToken = config.public.fbConversionApiToken

        // Check if Conversion API is configured
        if (!pixelId || !accessToken) {
            console.warn('[FB Conversion API] Not configured - missing Pixel ID or Access Token')
            return {
                success: false,
                error: 'Conversion API not configured'
            }
        }

        // Get request body
        const body = await readBody(event)

        // Extract event data
        const {
            event_name,
            event_id,
            event_time,
            user_data = {},
            custom_data = {}
        } = body

        // Validate required fields
        if (!event_name || !event_id) {
            return {
                success: false,
                error: 'Missing required fields: event_name or event_id'
            }
        }

        // Get client IP address
        const clientIp = getRequestHeader(event, 'x-forwarded-for') ||
            getRequestHeader(event, 'x-real-ip') ||
            event.node.req.socket.remoteAddress || ''

        // Hash user data for privacy (SHA256)
        const hashData = (data: string): string => {
            if (!data) return ''
            return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex')
        }

        // Prepare user data with hashing
        const preparedUserData: any = {
            client_ip_address: clientIp,
            client_user_agent: user_data.client_user_agent || '',
        }

        // Add Facebook browser cookies if available
        if (user_data.fbc) preparedUserData.fbc = user_data.fbc
        if (user_data.fbp) preparedUserData.fbp = user_data.fbp

        // Hash email and phone if provided
        if (user_data.em) preparedUserData.em = hashData(user_data.em)
        if (user_data.ph) preparedUserData.ph = hashData(user_data.ph)

        // Prepare event payload
        const eventPayload = {
            data: [
                {
                    event_name,
                    event_time: event_time || Math.floor(Date.now() / 1000),
                    event_id,
                    event_source_url: user_data.event_source_url || '',
                    action_source: 'website',
                    user_data: preparedUserData,
                    custom_data
                }
            ]
        }

        // Send to Facebook Conversion API
        const fbApiUrl = `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`

        const response = await $fetch(fbApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventPayload)
        })

        console.log('[FB Conversion API] Event sent successfully:', {
            event_name,
            event_id,
            response
        })

        return {
            success: true,
            event_id,
            response
        }

    } catch (error: any) {
        console.error('[FB Conversion API] Error:', error)

        return {
            success: false,
            error: error.message || 'Failed to send event to Conversion API'
        }
    }
})
