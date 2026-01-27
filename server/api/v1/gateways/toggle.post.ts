export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gateway, enabled } = body

  if (!gateway || typeof enabled !== 'boolean') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing or invalid gateway or enabled parameter'
    })
  }

  try {
    // Here you would update your database or configuration
    // For now, this is a placeholder that returns success
    // In production, you would:
    // 1. Validate the gateway name
    // 2. Update the database/config with the new state
    // 3. Possibly invalidate caches

    return {
      success: true,
      gateway,
      enabled,
      message: `Payment gateway ${gateway} has been ${enabled ? 'enabled' : 'disabled'}`
    }
  } catch (error) {
    console.error('Error toggling gateway:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to toggle payment gateway'
    })
  }
})
