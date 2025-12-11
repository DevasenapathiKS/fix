import type { AxiosError } from 'axios';

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong') => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message) return error.message;
  const axiosError = error as AxiosError<{ message?: string; error?: string }>;
  return (
    axiosError?.response?.data?.message || axiosError?.response?.data?.error || fallback
  );
};
