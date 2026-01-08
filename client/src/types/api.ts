export interface User {
  id: string
  email: string
  name: string
  phone?: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}
