// Tamara API routes
export default defineEventHandler(async (event) => {
  return {
    message: 'Tamara API is working',
    endpoints: [
      'POST /api/v1/tamara/check-availability',
      'POST /api/v1/tamara/create-session',
      'POST /api/v1/tamara/payment-options'
    ]
  }
})

