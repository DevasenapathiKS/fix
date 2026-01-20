import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'secondary' | 'danger';
  icon?: ReactNode;
  loading?: boolean;
}

export const Button = ({
  children,
  className,
  variant = 'primary',
  icon,
  loading,
  disabled,
  ...props
}: ButtonProps) => {
  const styles = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-white text-slate-900 border border-slate-200 hover:border-slate-900',
    ghost: 'bg-transparent text-slate-600 hover:text-slate-900',
    danger: 'bg-rose-600 text-white hover:bg-rose-700'
  };

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60',
        styles[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-l-white" aria-hidden />
      )}
      {icon}
      {children}
    </button>
  );
};
