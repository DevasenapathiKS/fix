const fallbackApi = 'http://57.159.28.81:4000/api';

const normalizeBaseUrl = (value?: string) => {
  if (!value) return fallbackApi;
  try {
    const trimmed = value.trim().replace(/\/$/, '');
    return trimmed.length ? trimmed : fallbackApi;
  } catch (error) {
    console.warn('Invalid VITE_API_URL supplied, using fallback');
    return fallbackApi;
  }
};

export const appConfig = {
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_URL),
  productName: 'Fixzep Client',
  contactEmail: 'care@fixzep.com'
};
