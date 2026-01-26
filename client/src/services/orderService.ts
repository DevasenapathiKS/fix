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
  media?: Array<{
    _id?: string
    url: string
    kind?: 'image' | 'video' | 'document'
    name?: string
  }>
  createdAt: string
  updatedAt: string
  history?: Array<{
    _id?: string
    action?: string
    message?: string
    metadata?: any
    performedAt?: string
    performedBy?: any
  }>
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

  cancelOrder: async (orderId: string, reason?: string): Promise<Order> => {
    const response = await apiClient.post(`/customer/orders/${orderId}/cancel`, reason ? { reason } : {})
    return response.data.data
  },

  getJobCard: async (orderId: string): Promise<{
    estimateAmount: number
    additionalCharges: number
    finalAmount: number
    paymentStatus: string
    status: string
    otp: string | null
    extraWork: Array<{ description: string; amount: number }>
    spareParts: Array<{ quantity: number; unitPrice: number }>
  }> => {
    const response = await apiClient.get(`/customer/orders/${orderId}/jobcard`)
    return response.data.data
  },

  postMessage: async (orderId: string, message: string): Promise<{ ok: boolean }> => {
    const response = await apiClient.post(`/customer/orders/${orderId}/messages`, { message })
    return response.data.data
  },
}
