export const formatDateTime = (iso: string) => {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(iso));
};

export const formatCurrency = (value?: number | null, currency: string = 'INR') => {
  const amount = typeof value === 'number' ? value : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount);
};
