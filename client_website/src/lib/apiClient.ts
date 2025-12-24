import axios, { type AxiosResponse } from 'axios';
import { appConfig } from '../config/env';
import { useAuthStore } from '../store/authStore';

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export async function unwrap<T>(request: Promise<AxiosResponse<ApiResponse<T> | T>>): Promise<T> {
  const response = await request;
  const payload = response.data as ApiResponse<T> | T;
  if (payload && typeof payload === 'object' && 'data' in (payload as ApiResponse<T>)) {
    return (payload as ApiResponse<T>).data;
  }
  return payload as T;
}
