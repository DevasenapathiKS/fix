import { useQuery } from '@tanstack/react-query';
import { CustomersAPI } from '../services/adminApi';
import { Card } from '../components/ui/Card';
import type { CustomerSummary } from '../types';

export const CustomersPage = () => {
  const { data: customers = [], isLoading } = useQuery<CustomerSummary[]>({ queryKey: ['customers'], queryFn: CustomersAPI.list });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Customers</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Customer Directory</h1>
      </div>

      <Card title="Customers">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Loading customers…
                  </td>
                </tr>
              )}
              {!isLoading && customers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No customers found.
                  </td>
                </tr>
              )}
              {customers.map((c) => (
                <tr key={c.id} className="cursor-default hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {c.phone || '—'}
                    <span className="block text-xs text-slate-400">{c.email || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{c.city || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {([c.addressLine1, c.addressLine2, c.postalCode].filter(Boolean) as string[]).join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default CustomersPage;
