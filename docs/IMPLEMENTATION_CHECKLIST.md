# Snapchat Pixel Implementation Checklist

## ✅ Setup Complete

### Core Files Created
- [x] `config/app.config.ts` - Centralized configuration
- [x] `types/snapchat.ts` - TypeScript types
- [x] `utils/snapchat.ts` - Utility functions
- [x] `plugins/snapchat.client.ts` - Main plugin
- [x] `plugins/snap-router.client.ts` - Router tracking

### Composables Created
- [x] `composables/useSnapchatPixel.ts` - Core API
- [x] `composables/useSnapchatEvents.ts` - High-level events
- [x] `composables/useSnapchatCart.ts` - Cart tracking
- [x] `composables/useSnapchatProduct.ts` - Product tracking
- [x] `composables/useSnapchatCheckout.ts` - Checkout tracking

### Configuration Updated
- [x] `nuxt.config.ts` - Added Snapchat config
- [x] `.env.example` - Added environment variables

### Documentation Created
- [x] `docs/SNAPCHAT_PIXEL.md` - Main guide
- [x] `docs/SNAPCHAT_INTEGRATION_EXAMPLES.md` - Code examples
- [x] `docs/IMPLEMENTATION_CHECKLIST.md` - This file

## 🔧 Implementation Steps

### Step 1: Environment Setup
```bash
# Copy .env.example to .env
cp .env.example .env

# Update with your values (already set to defaults)
NUXT_PUBLIC_SNAPCHAT_PIXEL_ID=f607062b-c823-407a-9f93-1dc2542be238
NUXT_PUBLIC_CURRENCY=SAR
NUXT_PUBLIC_CURRENCY_SYMBOL=ر.س
```

### Step 2: Verify Plugin Loading
- [x] Plugins are auto-loaded by Nuxt
- [x] Client-only plugins (`.client.ts`) run only in browser
- [x] No additional configuration needed

### Step 3: Implement Tracking

#### Product Page
```typescript
import { useSnapchatProduct } from '~/composables/useSnapchatProduct'

const { trackView } = useSnapchatProduct()

onMounted(() => {
  trackView(product.value)
})
```

#### Cart Page
```typescript
import { useSnapchatCart } from '~/composables/useSnapchatCart'

const { watchCartChanges } = useSnapchatCart()

onMounted(() => {
  watchCartChanges()
})
```

#### Checkout Page
```typescript
import { useSnapchatCheckout } from '~/composables/useSnapchatCheckout'

const { trackCheckoutView, trackPurchase } = useSnapchatCheckout()

onMounted(() => {
  trackCheckoutView(cartData)
})

const completeOrder = () => {
  trackPurchase(order)
}
```

### Step 4: Test in Development

```bash
# Start dev server
npm run dev

# Open browser console
# Check for DataLayer events
window.dataLayer

# Verify Snapchat Pixel
window.snaptr

# Check for errors
console.log('Snapchat initialized:', !!window.snaptr)
```

### Step 5: Monitor Events

#### In Browser Console
```javascript
// View all events
console.table(window.dataLayer)

// Filter by event type
window.dataLayer.filter(e => e.event === 'PURCHASE')

// Get latest event
window.dataLayer[window.dataLayer.length - 1]
```

#### In Snapchat Ads Manager
1. Go to Ads Manager
2. Navigate to Events Manager
3. Select your Pixel
4. Check "Test Events"
5. Verify events are being received

## 📋 Pages to Update

### Priority 1 (Critical)
- [ ] Product detail page - Add `useSnapchatProduct`
- [ ] Cart page - Add `useSnapchatCart`
- [ ] Checkout page - Add `useSnapchatCheckout`
- [ ] Order confirmation page - Add purchase tracking

### Priority 2 (Important)
- [ ] Search page - Add `useSnapchatEvents` for search tracking
- [ ] User signup page - Add signup tracking
- [ ] User login page - Add login tracking
- [ ] Category pages - Add view tracking

### Priority 3 (Nice to Have)
- [ ] Homepage - Add page view tracking
- [ ] Product listing - Add view tracking
- [ ] Wishlist - Add custom events
- [ ] Reviews - Add custom events

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Pixel loads without errors
- [ ] DataLayer is initialized
- [ ] PAGE_VIEW events are tracked
- [ ] Router changes trigger PAGE_VIEW

### E-commerce Events
- [ ] Product view events tracked
- [ ] Add to cart events tracked
- [ ] Remove from cart events tracked
- [ ] Checkout initiation tracked
- [ ] Purchase events tracked

### Data Validation
- [ ] All prices are numbers
- [ ] Currency is always 'SAR'
- [ ] Product IDs are strings
- [ ] Timestamps are ISO format

### Browser Compatibility
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in mobile browsers

## 🐛 Troubleshooting

### Pixel Not Loading
```javascript
// Check if script loaded
console.log(window.snaptr)

// Check for errors
window.addEventListener('error', (e) => {
  console.error('Error:', e)
})
```

### Events Not Tracking
```javascript
// Check DataLayer
console.log(window.dataLayer)

// Manually push event
window.pushToDataLayer('TEST_EVENT', { test: true })

// Check Snapchat Pixel
window.snaptr('track', 'TEST_EVENT')
```

### Currency Issues
```javascript
// Verify currency
console.log('Currency:', 'SAR')

// Check event data
console.log(window.dataLayer[window.dataLayer.length - 1])
```

## 📊 Performance Monitoring

### Key Metrics
- [ ] Pixel load time < 2s
- [ ] Event tracking latency < 100ms
- [ ] No console errors
- [ ] No memory leaks

### Monitoring Tools
- Chrome DevTools Performance tab
- Network tab for script loading
- Console for errors and logs

## 🚀 Deployment

### Pre-deployment Checklist
- [ ] All pages updated with tracking
- [ ] Testing completed
- [ ] No console errors
- [ ] Performance acceptable

### Deployment Steps
1. Merge to main branch
2. Run `npm run build`
3. Deploy to production
4. Verify events in Snapchat Ads Manager
5. Monitor for 24 hours

### Post-deployment
- [ ] Monitor event volume
- [ ] Check for errors
- [ ] Verify conversion tracking
- [ ] Adjust as needed

## 📞 Support

For issues:
1. Check browser console for errors
2. Verify Pixel ID is correct
3. Check DataLayer: `window.dataLayer`
4. Review documentation
5. Contact Snapchat support if needed

## 📚 Resources

- [Snapchat Pixel Docs](https://businesshelp.snapchat.com/s/article/pixel-setup)
- [Google Tag Manager](https://tagmanager.google.com/)
- [Nuxt Plugins](https://nuxt.com/docs/guide/directory-structure/plugins)
- [Vue Composables](https://vuejs.org/guide/extras/composition-api-faq.html)
