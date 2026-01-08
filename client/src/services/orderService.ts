import { apiClient } from '../lib/api-client'

export interface OrderServiceItem {
  serviceItem: string
  serviceCategory?: string
  quantity: number
  issueDescription?: string
}

export interface CreateOrderData {
  services: OrderServiceItem[]
  customerAddressId: string
  preferredStart: string
  preferredEnd: string
  estimatedCost?: number
  attachments?: string[]
}

export interface Order {
  _id: string
  orderCode: string
  customer: {
    name: string
    phone: string
    email?: string
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    postalCode: string
  }
  services: Array<{
    serviceCategory?: any
    serviceItem?: any
    serviceName: string
    quantity: number
    issueDescription?: string
    estimatedCost: number
  }>
  estimatedCost: number
  status: string
  scheduledAt: string
  timeWindowStart: string
  timeWindowEnd: string
  notes?: string
  issueDescription?: string
  createdAt: string
  updatedAt: string
}

export const orderService = {
  createOrder: async (data: CreateOrderData): Promise<Order> => {
    const response = await apiClient.post('/customer/orders', data)
    return response.data.data
  },

  getOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get('/customer/orders')
    return response.data.data
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    const response = await apiClient.get(`/customer/orders/${orderId}`)
    return response.data.data
  },

  cancelOrder: async (orderId: string): Promise<Order> => {
    const response = await apiClient.patch(`/customer/orders/${orderId}/cancel`)
    return response.data.data
  },
}
