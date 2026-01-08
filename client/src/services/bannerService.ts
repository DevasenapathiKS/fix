import { apiClient } from '../lib/api-client'

export interface Banner {
  _id: string
  title: string
  subtitle?: string
  imageUrl: string
  link?: string
  order: number
  isActive: boolean
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

export const bannerService = {
  async getBanners(isActive?: boolean): Promise<Banner[]> {
    const params = isActive !== undefined ? { isActive } : {}
    const response = await apiClient.get('/banners', { params })
    return response.data.data
  },

  async getBanner(id: string): Promise<Banner> {
    const response = await apiClient.get(`/banners/${id}`)
    return response.data.data
  },
}
