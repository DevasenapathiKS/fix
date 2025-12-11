import axios from 'axios';
import { appConfig } from '../config/env';
import { useAuthStore } from '../store/auth.store';

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json'
  }
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
