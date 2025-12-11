import clsx from 'clsx';
import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({ label, className, ...props }, ref) => (
  <label className="flex flex-col gap-1 text-sm text-slate-600">
    {label && <span className="font-medium text-slate-900">{label}</span>}
    <textarea
      ref={ref}
      className={clsx(
        'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none',
        className
      )}
      rows={props.rows || 3}
      {...props}
    />
  </label>
));

TextArea.displayName = 'TextArea';
