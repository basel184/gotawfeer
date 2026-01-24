export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  
  try {
    // Get Tamara configuration
    const tamaraConfig = config.public.tamara
    
    // Prepare order data for Tamara
    const orderData = {
      order_reference_id: body.order_reference_id || `ORDER_${Date.now()}`,
      total_amount: {
        amount: body.total_amount || 0,
        currency: 'SAR'
      },
      description: body.description || 'طلب من متجر جو توفير',
      country_code: 'SA',
      payment_type: 'PAY_BY_INSTALMENTS',
      locale: body.locale || 'ar-SA',
      success_url: `${getRequestURL(event).origin}/checkout/success`,
      failure_url: `${getRequestURL(event).origin}/checkout/failure`,
      cancel_url: `${getRequestURL(event).origin}/checkout`,
      items: body.items || [],
      shipping_address: body.shipping_address || {},
      tax_amount: {
        amount: body.tax_amount || 0,
        currency: 'SAR'
      },
      shipping_amount: {
        amount: body.shipping_amount || 0,
        currency: 'SAR'
      },
      discount: body.discount ? {
        name: body.discount.name || '',
        amount: {
          amount: body.discount.amount || 0,
          currency: 'SAR'
        }
      } : null
    }
    
    // In production, you would call Tamara's API here
    // For now, create a mock session
    const mockSession = {
      order_id: orderData.order_reference_id,
      checkout_url: `https://checkout.tamara.co/checkout?order_id=${orderData.order_reference_id}&amount=${orderData.total_amount.amount}&currency=${orderData.total_amount.currency}&locale=${orderData.locale}&success_url=${encodeURIComponent(orderData.success_url)}&failure_url=${encodeURIComponent(orderData.failure_url)}&cancel_url=${encodeURIComponent(orderData.cancel_url)}`,
      status: 'created',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    }
    
    return {
      success: true,
      data: mockSession
    }
  } catch (error) {
    console.error('Tamara session creation error:', error)
    return {
      success: false,
      error: 'Failed to create Tamara session'
    }
  }
})

