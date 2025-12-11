export default defineEventHandler(async (event) => {
  console.log('Tamara check-availability API called')
  const config = useRuntimeConfig()
  const body = await readBody(event)
  
  console.log('Request body:', body)
  
  try {
    // Get Tamara configuration
    const tamaraConfig = config.public.tamara
    
    // Check if order meets minimum requirements
    const orderTotal = body.order_data?.total_amount || 0
    const minAmount = 49 // Minimum amount for Tamara
    
    if (orderTotal < minAmount) {
      return {
        available: false,
        reason: 'Order amount too low',
        minimum_amount: minAmount
      }
    }
    
    // For now, return available for orders over minimum amount
    // In production, you would call Tamara's API to check availability
    return {
      available: true,
      payment_options: [
        {
          id: 'pay_in_full',
          name: 'ادفع كاملاً',
          description: 'ادفع المبلغ كاملاً بدون فوائد',
          installments: 1
        },
        {
          id: 'pay_in_2',
          name: 'ادفع على قسطين',
          description: 'قسطان بدون فوائد',
          installments: 2
        },
        {
          id: 'pay_in_3',
          name: 'ادفع على 3 أقساط',
          description: 'ثلاثة أقساط بدون فوائد',
          installments: 3
        },
        {
          id: 'pay_in_4',
          name: 'ادفع على 4 أقساط',
          description: 'أربعة أقساط بدون فوائد',
          installments: 4
        }
      ]
    }
  } catch (error) {
    console.error('Tamara availability check error:', error)
    return {
      available: false,
      error: 'Failed to check Tamara availability'
    }
  }
})
