import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ServiceItem, ServiceCategory } from '../types/customer';

export interface CartItem {
  service: ServiceItem;
  category: ServiceCategory | { _id: string; name: string };
  quantity: number;
  issueDescription?: string;
}

export interface CartState {
  items: CartItem[];
  addItem: (service: ServiceItem, category: ServiceCategory | { _id: string; name: string }) => void;
  removeItem: (serviceId: string) => void;
  updateQuantity: (serviceId: string, quantity: number) => void;
  updateIssueDescription: (serviceId: string, description: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (service, category) => {
        const items = get().items;
        const existingIndex = items.findIndex(
          (item) => item.service._id === service._id
        );
        
        if (existingIndex >= 0) {
          // Item already exists, increment quantity
          const updated = [...items];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + 1
          };
          set({ items: updated });
        } else {
          // Add new item
          set({
            items: [...items, { service, category, quantity: 1 }]
          });
        }
      },
      
      removeItem: (serviceId) => {
        set({
          items: get().items.filter((item) => item.service._id !== serviceId)
        });
      },
      
      updateQuantity: (serviceId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(serviceId);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.service._id === serviceId ? { ...item, quantity } : item
          )
        });
      },
      
      updateIssueDescription: (serviceId, description) => {
        set({
          items: get().items.map((item) =>
            item.service._id === serviceId
              ? { ...item, issueDescription: description }
              : item
          )
        });
      },
      
      clearCart: () => set({ items: [] }),
      
      getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      
      getTotalPrice: () =>
        get().items.reduce(
          (sum, item) => sum + (item.service.basePrice ?? 0) * item.quantity,
          0
        )
    }),
    {
      name: 'fixzep-cart'
    }
  )
);
