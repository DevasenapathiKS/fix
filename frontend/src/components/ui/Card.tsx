import type { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  actions?: ReactNode;
}

export const Card = ({ children, className, title, actions }: CardProps) => (
  <section className={clsx('rounded-2xl border border-white/60 bg-white/90 p-6 shadow-card backdrop-blur', className)}>
    {(title || actions) && (
      <header className="mb-4 flex items-center justify-between gap-4">
        {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
        {actions}
      </header>
    )}
    {children}
  </section>
);
