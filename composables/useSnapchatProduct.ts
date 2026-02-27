// Snapchat Product Tracking Composable
// Specialized for product page tracking

import { onMounted } from 'vue'
import { useSnapchatEvents } from './useSnapchatEvents'
import { useRoute } from 'vue-router'

export function useSnapchatProduct() {
  const { trackProductView, trackAddToCart } = useSnapchatEvents()
  const route = useRoute()

  /**
   * Track product view on mount
   */
  const trackView = (product: any) => {
    if (!product) return

    trackProductView({
      id: product.id,
      name: product.name || product.title,
      price: product.price,
      category: product.category,
      sku: product.sku,
      image: product.image || product.thumbnail
    })
  }

  /**
   * Track add to cart from product page
   */
  const trackAddToCartFromProduct = (product: any, quantity: number = 1) => {
    if (!product) return

    trackAddToCart(
      {
        id: product.id,
        name: product.name || product.title,
        price: product.price
      },
      quantity
    )
  }

  /**
   * Auto-track product view on mount
   */
  const autoTrackProductView = (product: any) => {
    onMounted(() => {
      trackView(product)
    })
  }

  /**
   * Get product ID from route
   */
  const getProductIdFromRoute = (): string | null => {
    return (route.params.id as string) || null
  }

  return {
    trackView,
    trackAddToCartFromProduct,
    autoTrackProductView,
    getProductIdFromRoute
  }
}
