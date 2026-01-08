import { apiClient } from '../lib/api-client'

export interface Address {
  _id: string
  customer: string
  label: string
  contactName: string
  phone: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  isDefault: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateAddressData {
  label: string
  contactName: string
  phone: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  isDefault?: boolean
  notes?: string
}

export interface TimeSlot {
  label: string
  start: string
  end: string
  capacity: number
  templateId: string
}

export interface DaySlots {
  date: string
  slots: TimeSlot[]
}

export const addressService = {
  getAddresses: async (): Promise<Address[]> => {
    const response = await apiClient.get('/customer/addresses')
    return response.data.data
  },

  createAddress: async (data: CreateAddressData): Promise<Address> => {
    const response = await apiClient.post('/customer/addresses', data)
    return response.data.data
  },

  updateAddress: async (addressId: string, data: Partial<CreateAddressData>): Promise<Address> => {
    const response = await apiClient.put(`/customer/addresses/${addressId}`, data)
    return response.data.data
  },

  deleteAddress: async (addressId: string): Promise<void> => {
    await apiClient.delete(`/customer/addresses/${addressId}`)
  },

  markPreferred: async (addressId: string): Promise<Address> => {
    const response = await apiClient.post(`/customer/addresses/${addressId}/preferred`)
    return response.data.data
  },
}

export const timeSlotService = {
  getTimeSlots: async (startDate?: string, days: number = 7): Promise<DaySlots[]> => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    params.append('days', days.toString())
    
    const response = await apiClient.get(`/customer/time-slots?${params.toString()}`)
    return response.data.data
  },

  checkAvailability: async (data: {
    serviceItem: string
    start: string
    end: string
  }): Promise<{ available: boolean; reason?: string }> => {
    const response = await apiClient.post('/customer/time-slots/check', data)
    return response.data.data
  },
}
