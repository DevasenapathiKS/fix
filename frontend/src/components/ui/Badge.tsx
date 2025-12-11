import clsx from 'clsx';
import type { ReactNode } from 'react';

const variants: Record<string, string> = {
  new: 'bg-slate-100 text-slate-700',
  pending_assignment: 'bg-amber-100 text-amber-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
  follow_up: 'bg-orange-100 text-orange-800',
  unpaid: 'bg-rose-100 text-rose-700',
  partially_paid: 'bg-amber-100 text-amber-800',
  pending: 'bg-slate-100 text-slate-700',
  partial: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-700'
};

export const Badge = ({ variant = 'new', children }: { variant?: string; children: ReactNode }) => (
  <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold capitalize', variants[variant] || variants.new)}>
    {children}
  </span>
);
