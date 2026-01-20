import { apiClient } from '../lib/api-client'

export interface LoginCredentials {
  identifier: string
  password: string
}

export interface SignupData {
  name: string
  email: string
  password: string
  phone?: string
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    email: string
    name: string
    phone?: string
    role: string
  }
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('Login attempt with:', { identifier: credentials.identifier })
    console.log('API URL:', import.meta.env.VITE_API_URL || 'https://admin.eopsys.xyz/api')
    const response = await apiClient.post('/customer/auth/login', credentials)
    console.log('Login response:', response.data)
    return response.data.data
  },

  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await apiClient.post('/customer/auth/register', data)
    return response.data.data
  },

  async logout(): Promise<void> {
    await apiClient.post('/customer/auth/logout')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  async getCurrentUser(): Promise<AuthResponse['user']> {
    // Backend exposes profile at /customer/profile, not /auth/me
    const response = await apiClient.get('/customer/profile')
    return response.data.data
  },

  async updateProfile(data: Partial<{ name: string; phone: string }>): Promise<AuthResponse['user']> {
    const response = await apiClient.put('/customer/profile', data)
    return response.data.data
  },

  async forgotPassword(identifier: string): Promise<{
      data: any, message: string 
}> {
    const response = await apiClient.post('/customer/auth/forgot-password', { identifier })
    return response.data
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await apiClient.post('/customer/auth/reset-password', { token, password })
    return response.data
  },

  async deactivateAccount(): Promise<{ deactivated: boolean }> {
    const response = await apiClient.post('/customer/profile/deactivate')
    return response.data.data
  },
}
