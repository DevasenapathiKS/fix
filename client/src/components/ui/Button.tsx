import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon, loading, fullWidth, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(styles.button, styles[variant], styles[size], className, {
        [styles.fullWidth]: fullWidth,
        [styles.loading]: loading
      })}
      disabled={disabled || loading}
      {...props}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span>{loading ? 'Please wait…' : children}</span>
    </button>
  )
);

Button.displayName = 'Button';
