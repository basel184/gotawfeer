export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  
  try {
    const amount = body.amount || 0
    const currency = body.currency || 'SAR'
    const country = body.country || 'SA'
    
    // Generate payment options based on amount
    const paymentOptions = []
    
    // Pay in full option
    paymentOptions.push({
      id: 'pay_in_full',
      name: 'ادفع كاملاً',
      description: 'ادفع المبلغ كاملاً بدون فوائد',
      amount: amount,
      installments: 1,
      interest_rate: '0%',
      monthly_payment: amount
    })
    
    // Split payment options
    if (amount >= 100) {
      paymentOptions.push({
        id: 'pay_in_2',
        name: 'ادفع على قسطين',
        description: 'قسطان بدون فوائد',
        amount: amount,
        installments: 2,
        interest_rate: '0%',
        monthly_payment: Math.round(amount / 2 * 100) / 100
      })
    }
    
    if (amount >= 200) {
      paymentOptions.push({
        id: 'pay_in_3',
        name: 'ادفع على 3 أقساط',
        description: 'ثلاثة أقساط بدون فوائد',
        amount: amount,
        installments: 3,
        interest_rate: '0%',
        monthly_payment: Math.round(amount / 3 * 100) / 100
      })
    }
    
    if (amount >= 300) {
      paymentOptions.push({
        id: 'pay_in_4',
        name: 'ادفع على 4 أقساط',
        description: 'أربعة أقساط بدون فوائد',
        amount: amount,
        installments: 4,
        interest_rate: '0%',
        monthly_payment: Math.round(amount / 4 * 100) / 100
      })
    }
    
    return {
      success: true,
      payment_options: paymentOptions
    }
  } catch (error) {
    console.error('Tamara payment options error:', error)
    return {
      success: false,
      error: 'Failed to get payment options'
    }
  }
})

