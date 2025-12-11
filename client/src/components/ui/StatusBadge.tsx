import clsx from 'clsx';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  label: string;
  tone?: 'success' | 'info' | 'warning' | 'danger' | 'neutral';
}

export const StatusBadge = ({ label, tone = 'neutral' }: StatusBadgeProps) => (
  <span className={clsx(styles.badge, styles[tone])}>{label}</span>
);
