# Snapchat Pixel Integration Guide

## Overview
Snapchat Pixel integration for Go Tawfeer e-commerce platform with Saudi Riyal (SAR) currency support.

**Pixel ID:** `f607062b-c823-407a-9f93-1dc2542be238`

## Files Structure

### Plugins
- `plugins/snapchat.client.ts` - Main Snapchat Pixel initialization
- `plugins/snap-router.client.ts` - SPA page view tracking

### Composables
- `composables/useSnapchatPixel.ts` - Core Snapchat Pixel API
- `composables/useSnapchatEvents.ts` - High-level event tracking

### Configuration
- `config/app.config.ts` - Centralized app configuration
- `types/snapchat.ts` - TypeScript types and interfaces
- `utils/snapchat.ts` - Utility functions

## Usage Examples

### Track Product View
```typescript
import { useSnapchatEvents } from '~/composables/useSnapchatEvents'

const { trackProductView } = useSnapchatEvents()

onMounted(() => {
  trackProductView({
    id: 123,
    name: 'Product Name',
    price: 299.99
  })
})
```

### Track Add to Cart
```typescript
const { trackAddToCart } = useSnapchatEvents()

const addToCart = (product) => {
  trackAddToCart(product, 1)
}
```

### Track Purchase
```typescript
const { trackPurchaseComplete } = useSnapchatEvents()

onMounted(() => {
  trackPurchaseComplete({
    id: 'ORDER-123',
    total: 999.99,
    items: [
      { product_id: 1, name: 'Product 1', price: 299.99 },
      { product_id: 2, name: 'Product 2', price: 699.99 }
    ]
  })
})
```

### Track Search
```typescript
const { trackSearch } = useSnapchatEvents()

const handleSearch = (query) => {
  trackSearch(query)
}
```

### Track User Signup
```typescript
const { trackSignUp } = useSnapchatEvents()

const handleSignUp = (userData) => {
  trackSignUp({
    email: userData.email,
    phone: userData.phone
  })
}
```

## Currency Configuration

The system is configured to use **Saudi Riyal (SAR)** by default. All prices are automatically formatted and tracked in SAR.

### Currency Settings
- **Code:** SAR
- **Symbol:** ر.س
- **Locale:** ar-SA

## DataLayer Integration

All Snapchat events are automatically pushed to the DataLayer for Google Tag Manager integration.

```typescript
// Access DataLayer
window.dataLayer // Array of all tracked events

// Manually push to DataLayer
window.pushToDataLayer('custom_event', {
  custom_data: 'value'
})
```

## Event Types

### Standard Events
- `PAGE_VIEW` - Page view tracking
- `VIEW_CONTENT` - Product view
- `ADD_CART` - Add to cart
- `REMOVE_CART` - Remove from cart
- `INITIATE_CHECKOUT` - Checkout started
- `ADD_PAYMENT_INFO` - Payment info added
- `PURCHASE` - Purchase completed
- `SEARCH` - Search performed
- `SIGN_UP` - User signup
- `LOGIN` - User login

## Development

### Enable Debug Logging
Set `NODE_ENV=development` to see console logs for all tracked events.

### Validate Event Data
Use the utility functions from `utils/snapchat.ts`:
```typescript
import { sanitizeEventData, validateEventData } from '~/utils/snapchat'

const eventData = sanitizeEventData(rawData)
if (validateEventData(eventData)) {
  // Safe to track
}
```

## Best Practices

1. **Always include currency** - All monetary events should include `currency: 'SAR'`
2. **Use item IDs** - Track product IDs for better attribution
3. **Validate data** - Use utility functions to validate event data
4. **Avoid duplicates** - Router plugin automatically tracks page views
5. **Test in development** - Enable debug logging to verify events

## Troubleshooting

### Pixel not loading
- Check browser console for errors
- Verify Pixel ID is correct
- Ensure plugins are loaded (check nuxt.config.ts)

### Events not tracking
- Check DataLayer in browser console: `window.dataLayer`
- Verify Snapchat Pixel is initialized: `window.snaptr`
- Check for JavaScript errors in console

### Currency issues
- All prices should be numbers (not strings)
- Currency code should be 'SAR'
- Use utility functions for formatting

## Support

For issues or questions, refer to:
- Snapchat Pixel Documentation: https://businesshelp.snapchat.com/s/article/pixel-setup
- Google Tag Manager: https://tagmanager.google.com/
