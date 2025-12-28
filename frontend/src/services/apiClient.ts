import axios, { AxiosHeaders } from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'admin.eopsys.xyz/api',
  timeout: 15_000
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('fixzep_token');
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

export default apiClient;
