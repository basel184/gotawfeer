// Snapchat Cart Tracking Composable
// Specialized for cart operations with automatic event tracking

import { watch } from 'vue'
import { useSnapchatEvents } from './useSnapchatEvents'
import { useCart } from './useCart'

export function useSnapchatCart() {
  const { trackAddToCart, trackRemoveFromCart, trackCheckoutStart } = useSnapchatEvents()
  const cart = useCart()

  /**
   * Watch cart items for changes and track events
   */
  const watchCartChanges = () => {
    let previousItems: any[] = []

    watch(
      () => cart.items,
      (newItems) => {
        if (!newItems || newItems.length === 0) return

        // Detect added items
        newItems.forEach((newItem) => {
          const previousItem = previousItems.find((item) => item.id === newItem.id)
          if (!previousItem) {
            // New item added
            trackAddToCart(
              {
                id: newItem.product_id || newItem.id,
                name: newItem.product_name || newItem.name,
                price: newItem.price
              },
              newItem.quantity || 1
            )
          } else if (previousItem.quantity !== newItem.quantity) {
            // Quantity changed
            const quantityDiff = (newItem.quantity || 1) - (previousItem.quantity || 1)
            if (quantityDiff > 0) {
              trackAddToCart(
                {
                  id: newItem.product_id || newItem.id,
                  name: newItem.product_name || newItem.name,
                  price: newItem.price
                },
                quantityDiff
              )
            }
          }
        })

        // Detect removed items
        previousItems.forEach((prevItem) => {
          const newItem = newItems.find((item) => item.id === prevItem.id)
          if (!newItem) {
            // Item removed
            trackRemoveFromCart(
              {
                id: prevItem.product_id || prevItem.id,
                name: prevItem.product_name || prevItem.name,
                price: prevItem.price
              },
              prevItem.quantity || 1
            )
          }
        })

        previousItems = JSON.parse(JSON.stringify(newItems))
      },
      { deep: true }
    )
  }

  /**
   * Track checkout initiation
   */
  const trackCheckout = async () => {
    const items = cart.items || []
    const total = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0)
    trackCheckoutStart(total, items.length)
  }

  /**
   * Get cart summary for tracking
   */
  const getCartSummary = () => {
    const items = cart.items || []
    const total = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0)
    const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0)

    return {
      items,
      total,
      itemCount,
      currency: 'SAR'
    }
  }

  return {
    watchCartChanges,
    trackCheckout,
    getCartSummary
  }
}
