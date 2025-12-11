import clsx from 'clsx';
import { forwardRef } from 'react';
import type { ReactNode, SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, className, children, ...props }, ref) => (
  <label className="flex flex-col gap-1 text-sm text-slate-600">
    {label && <span className="font-medium text-slate-900">{label}</span>}
    <select
      ref={ref}
      className={clsx(
        'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-slate-900 focus:outline-none',
        className
      )}
      {...props}
    >
      {children}
    </select>
  </label>
));

Select.displayName = 'Select';
