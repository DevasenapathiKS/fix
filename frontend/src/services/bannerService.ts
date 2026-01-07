import apiClient from './apiClient'

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
  createdBy?: { _id: string; name: string; email: string }
  createdAt: string
  updatedAt: string
}

export const bannerService = {
  async listBanners(isActive?: boolean) {
    const params = isActive !== undefined ? { isActive } : {}
    const { data } = await apiClient.get<{ data: Banner[] }>('/banners', { params })
    return data.data
  },

  async getBanner(bannerId: string) {
    const { data } = await apiClient.get<{ data: Banner }>(`/banners/${bannerId}`)
    return data.data
  },

  async createBanner(payload: Partial<Banner>) {
    const { data } = await apiClient.post<{ data: Banner }>('/banners', payload)
    return data.data
  },

  async updateBanner(bannerId: string, payload: Partial<Banner>) {
    const { data } = await apiClient.put<{ data: Banner }>(`/banners/${bannerId}`, payload)
    return data.data
  },

  async deleteBanner(bannerId: string) {
    const { data } = await apiClient.delete<{ data: { deleted: boolean } }>(`/banners/${bannerId}`)
    return data.data
  },

  async toggleBannerStatus(bannerId: string) {
    const { data } = await apiClient.patch<{ data: Banner }>(`/banners/${bannerId}/toggle`)
    return data.data
  },

  async reorderBanners(banners: { id: string; order: number }[]) {
    const { data } = await apiClient.post<{ data: Banner[] }>('/banners/reorder', { banners })
    return data.data
  },

  async uploadImage(file: File) {
    const formData = new FormData()
    formData.append('image', file)
    const { data } = await apiClient.post<{ data: { imageUrl: string } }>('/banners/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    // Construct full image URL using API base URL
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
    const imageUrl = data.data.imageUrl
    const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${apiBaseUrl.replace('/api', '')}${imageUrl}`
    return fullImageUrl
  },
}
