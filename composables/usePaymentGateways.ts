import { computed } from 'vue'

interface GatewayFlags {
  tamara: boolean
  tabby: boolean
  paymob_visa: boolean
  apple_pay: boolean
  [key: string]: boolean
}

const defaultGateways: GatewayFlags = {
  tamara: false,
  tabby: false,
  paymob_visa: false,
  apple_pay: false
}

export const usePaymentGateways = () => {
  const { $get } = useApi()

  const state = useState('payment-gateways', () => ({
    loading: false,
    error: null as string | null,
    gateways: { ...defaultGateways },
    fetched: false,
    lastFetched: 0
  }))

  const loadGateways = async (force = false) => {
    if (state.value.loading) return state.value.gateways
    if (state.value.fetched && !force) {
      return state.value.gateways
    }

    state.value.loading = true
    state.value.error = null

    try {
      const response = await $get('v1/config')
      const data = response?.data || response || {}
      const custom = data?.custom_payment_gateways || {}

      state.value.gateways = {
        ...defaultGateways,
        ...Object.fromEntries(
          Object.entries(custom).map(([key, value]) => [key, Boolean(value)])
        )
      }
      state.value.fetched = true
      state.value.lastFetched = Date.now()
    } catch (error: any) {
      state.value.error = error?.message || 'Failed to load payment gateways'
    } finally {
      state.value.loading = false
    }

    return state.value.gateways
  }

  const gateways = computed(() => state.value.gateways)
  const loading = computed(() => state.value.loading)
  const error = computed(() => state.value.error)

  const isEnabled = (gateway: keyof GatewayFlags) =>
    computed(() => Boolean(state.value.gateways[gateway]))

  return {
    gateways,
    loading,
    error,
    loadGateways,
    isEnabled
  }
}
