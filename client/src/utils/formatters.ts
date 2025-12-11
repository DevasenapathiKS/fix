import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import advancedFormat from 'dayjs/plugin/advancedFormat';

dayjs.extend(relativeTime);
dayjs.extend(advancedFormat);

export const formatCurrency = (value?: number, currency = 'INR') => {
  const safe = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: safe % 1 === 0 ? 0 : 2
  }).format(safe);
};

export const formatDate = (value?: string, fallback = '—') => {
  if (!value) return fallback;
  return dayjs(value).format('DD MMM YYYY');
};

export const formatDateTime = (value?: string, fallback = '—') => {
  if (!value) return fallback;
  return dayjs(value).format('DD MMM YYYY · hh:mm A');
};

export const fromNow = (value?: string) => {
  if (!value) return '';
  return dayjs(value).fromNow();
};

export const formatDuration = (start?: string, end?: string) => {
  if (!start || !end) return '—';
  const diff = dayjs(end).diff(dayjs(start), 'minute');
  if (diff <= 0) return '< 1 min';
  if (diff < 60) return `${diff} mins`;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};
