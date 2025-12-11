import clsx from 'clsx';
import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helpText?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, className, helpText, icon, ...props }, ref) => (
  <label className="flex flex-col gap-1 text-sm text-slate-600">
    {label && <span className="font-medium text-slate-900">{label}</span>}
    <div className="relative">
      {icon && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">{icon}</span>}
      <input
        ref={ref}
        className={clsx(
          'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none',
          icon && 'pl-10',
          className
        )}
        {...props}
      />
    </div>
    {helpText && <span className="text-xs text-slate-400">{helpText}</span>}
  </label>
));

Input.displayName = 'Input';
