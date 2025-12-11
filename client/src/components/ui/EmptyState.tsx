import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className={styles.empty}>
    <div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
    {action}
  </div>
);
