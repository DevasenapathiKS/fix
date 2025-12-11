import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
}

export const Card = ({ elevated, header, footer, className, children, ...props }: CardProps) => (
  <div className={clsx(styles.card, { [styles.elevated]: elevated }, className)} {...props}>
    {header && <div className={styles.header}>{header}</div>}
    <div className={styles.body}>{children}</div>
    {footer && <div className={styles.footer}>{footer}</div>}
  </div>
);
