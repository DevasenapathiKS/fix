import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CustomersAPI, OrdersAPI } from '../services/adminApi';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import type { CustomerSummary, Order } from '../types';
import { formatDateTime } from '../utils/format';

export const CustomersPage = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const { data: customers = [], isLoading } = useQuery<CustomerSummary[]>({ queryKey: ['customers'], queryFn: CustomersAPI.list });

  const { data: customerDetails } = useQuery<CustomerSummary | null>({
    queryKey: ['customer-details', selectedCustomer?.phone],
    queryFn: () => selectedCustomer?.phone ? CustomersAPI.findByPhone(selectedCustomer.phone) : null,
    enabled: Boolean(selectedCustomer && detailsModalOpen)
  });

  const { data: customerOrders = [] } = useQuery<Order[]>({
    queryKey: ['customer-orders', selectedCustomer?.id],
    queryFn: () => OrdersAPI.list({ customerId: selectedCustomer!.id }),
    enabled: Boolean(selectedCustomer && detailsModalOpen)
  });

  const handleCustomerClick = (customer: CustomerSummary) => {
    setSelectedCustomer(customer);
    setDetailsModalOpen(true);
  };

  const handleCloseModal = () => {
    setDetailsModalOpen(false);
    setTimeout(() => setSelectedCustomer(null), 200);
  };

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
                <tr key={c.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleCustomerClick(c)}>
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

      {/* Customer Details Modal */}
      <Modal
        open={detailsModalOpen}
        onClose={handleCloseModal}
        title={selectedCustomer?.name || 'Customer Details'}
        size="xl"
        showCloseButton
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="font-medium text-slate-900">{selectedCustomer.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="font-medium text-slate-900">{selectedCustomer.email || '—'}</p>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Addresses</h3>
              {customerDetails?.addresses && customerDetails.addresses.length > 0 ? (
                <div className="space-y-3">
                  {customerDetails.addresses.map((address, idx) => (
                    <div key={address.id || idx} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {address.label && (
                            <p className="text-xs font-semibold text-slate-700 mb-1">{address.label}</p>
                          )}
                          <p className="text-sm text-slate-900">{address.line1}</p>
                          {address.line2 && <p className="text-sm text-slate-600">{address.line2}</p>}
                          <p className="text-sm text-slate-600">
                            {[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}
                          </p>
                          {address.phone && (
                            <p className="text-xs text-slate-500 mt-1">Phone: {address.phone}</p>
                          )}
                        </div>
                        {address.isDefault && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No addresses on file</p>
              )}
            </div>

            {/* Order History */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Order History</h3>
              {customerOrders.length > 0 ? (
                <div className="space-y-3">
                  {customerOrders.map((order) => (
                    <div key={order._id} className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-slate-900">#{order._id.slice(-8)}</p>
                            <Badge variant={order.status}>{order.status}</Badge>
                          </div>
                          <p className="text-xs text-slate-600">
                            {typeof order.serviceItem === 'string' ? order.serviceItem : order.serviceItem?.name || 'Service'}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Scheduled: {formatDateTime(order.timeWindowStart)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No orders found</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomersPage;
