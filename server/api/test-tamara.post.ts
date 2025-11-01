export default defineEventHandler(async (event) => {
  console.log('Test Tamara API called')
  return {
    success: true,
    message: 'Tamara API is working',
    timestamp: new Date().toISOString()
  }
})

