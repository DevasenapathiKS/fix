const fallbackApi = 'http://57.159.28.81//api';

const normalizeBaseUrl = (value?: string) => {
  if (!value) return fallbackApi;
  const trimmed = value.trim().replace(/\/$/, '');
  return trimmed.length ? trimmed : fallbackApi;
};

export const appConfig = {
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_URL),
  brand: 'Fixzep'
};
