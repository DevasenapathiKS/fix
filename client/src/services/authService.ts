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
    console.log('API URL:', import.meta.env.VITE_API_URL || 'http://localhost:4000/api')
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
    const response = await apiClient.get('/customer/auth/me')
    return response.data.data
  },
}
