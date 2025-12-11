import type { ReactNode } from 'react';
import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  icon?: ReactNode;
  accent?: 'brand' | 'teal' | 'amber';
}

export const StatCard = ({ label, value, trend, icon, accent = 'brand' }: StatCardProps) => (
  <div className={`${styles.card} ${styles[accent]}`}>
    <div>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {trend && <p className={styles.trend}>{trend}</p>}
    </div>
    {icon && <div className={styles.icon}>{icon}</div>}
  </div>
);
