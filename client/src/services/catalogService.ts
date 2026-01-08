import { apiClient } from '../lib/api-client'

export interface ServiceItem {
  imageUrl: any
  _id: string
  name: string
  description?: string
  basePrice: number
  duration?: number
  category: {
    _id: string
    name: string
  }
}

export interface ServiceCategory {
  _id: string
  name: string
  description?: string
  heroImage?: string
  services: ServiceItem[]
}

export const catalogService = {
  async getServices(): Promise<ServiceCategory[]> {
    const response = await apiClient.get('/customer/services')
    return response.data.data
  },

  async getServiceDetail(serviceId: string): Promise<ServiceItem> {
    const response = await apiClient.get(`/customer/services/${serviceId}`)
    return response.data.data
  },

  async searchServices(keyword: string): Promise<ServiceItem[]> {
    const response = await apiClient.get(`/customer/services/search?keyword=${keyword}`)
    return response.data.data
  },
}
