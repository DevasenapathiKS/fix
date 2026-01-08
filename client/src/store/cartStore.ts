import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  serviceId: string
  serviceName: string
  categoryId: string
  categoryName: string
  price: number
  duration?: number
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (serviceId: string) => void
  updateQuantity: (serviceId: string, quantity: number) => void
  clearCart: () => void
  getTotalPrice: () => number
  getTotalItems: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const existingItem = get().items.find((i) => i.serviceId === item.serviceId)
        
        if (existingItem) {
          set({
            items: get().items.map((i) =>
              i.serviceId === item.serviceId
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          })
        } else {
          set({
            items: [...get().items, { ...item, quantity: 1 }],
          })
        }
      },

      removeItem: (serviceId) => {
        set({
          items: get().items.filter((i) => i.serviceId !== serviceId),
        })
      },

      updateQuantity: (serviceId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(serviceId)
          return
        }

        set({
          items: get().items.map((i) =>
            i.serviceId === serviceId ? { ...i, quantity } : i
          ),
        })
      },

      clearCart: () => {
        set({ items: [] })
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0)
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)
