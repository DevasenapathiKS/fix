import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CustomersAPI, OrdersAPI } from '../services/adminApi';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { CustomerSummary, Order } from '../types';
import { formatDateTime } from '../utils/format';
import toast from 'react-hot-toast';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

export const CustomersPage = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Create customer form state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddressLine1, setNewCustomerAddressLine1] = useState('');
  const [newCustomerAddressLine2, setNewCustomerAddressLine2] = useState('');
  const [newCustomerCity, setNewCustomerCity] = useState('');
  const [newCustomerState, setNewCustomerState] = useState('');
  const [newCustomerPostalCode, setNewCustomerPostalCode] = useState('');

  // Address form state
  const [addressLabel, setAddressLabel] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressPostalCode, setAddressPostalCode] = useState('');

  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery<CustomerSummary[]>({
    queryKey: ['customers'],
    queryFn: CustomersAPI.list
  });

  const { data: customerDetails, refetch: refetchDetails } = useQuery<CustomerSummary | null>({
    queryKey: ['customer-details', selectedCustomer?.phone],
    queryFn: () => selectedCustomer?.phone ? CustomersAPI.findByPhone(selectedCustomer.phone) : null,
    enabled: Boolean(selectedCustomer && detailsModalOpen)
  });

  const { data: customerOrders = [] } = useQuery<Order[]>({
    queryKey: ['customer-orders', selectedCustomer?.id],
    queryFn: () => OrdersAPI.list({ customerId: selectedCustomer!.id }),
    enabled: Boolean(selectedCustomer && detailsModalOpen)
  });

  const updateCustomerMutation = useMutation({
    mutationFn: (payload: { name?: string; email?: string; phone?: string }) =>
      CustomersAPI.update(selectedCustomer!.id, payload),
    onSuccess: (data) => {
      toast.success('Customer updated successfully');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-details'] });
      setEditModalOpen(false);
      if (data) {
        setSelectedCustomer(data);
      }
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update customer')
  });

  const updateAddressMutation = useMutation({
    mutationFn: (payload: { line1: string; line2?: string; city: string; state: string; postalCode?: string; addressId?: string }) =>
      CustomersAPI.updateAddress(selectedCustomer!.id, payload),
    onSuccess: () => {
      toast.success(editingAddress ? 'Address updated successfully' : 'Address added successfully');
      queryClient.invalidateQueries({ queryKey: ['customer-details'] });
      setAddressModalOpen(false);
      resetAddressForm();
      refetchDetails();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update address')
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (addressId: string) => CustomersAPI.deleteAddress(selectedCustomer!.id, addressId),
    onSuccess: () => {
      toast.success('Address deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['customer-details'] });
      refetchDetails();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to delete address')
  });

  const createCustomerMutation = useMutation({
    mutationFn: (payload: { name: string; phone: string; email?: string; address?: { line1: string; line2?: string; city: string; state: string; postalCode?: string } }) =>
      CustomersAPI.create(payload),
    onSuccess: () => {
      toast.success('Customer created successfully');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setCreateModalOpen(false);
      resetCreateForm();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to create customer')
  });

  const resetCreateForm = () => {
    setNewCustomerName('');
    setNewCustomerEmail('');
    setNewCustomerPhone('');
    setNewCustomerAddressLine1('');
    setNewCustomerAddressLine2('');
    setNewCustomerCity('');
    setNewCustomerState('');
    setNewCustomerPostalCode('');
  };

  const handleCreateCustomer = () => {
    if (!newCustomerName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!newCustomerPhone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    const payload: { name: string; phone: string; email?: string; address?: { line1: string; line2?: string; city: string; state: string; postalCode?: string } } = {
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
      email: newCustomerEmail.trim() || undefined
    };

    // Only include address if at least line1, city, and state are provided
    if (newCustomerAddressLine1.trim() && newCustomerCity.trim() && newCustomerState.trim()) {
      payload.address = {
        line1: newCustomerAddressLine1.trim(),
        line2: newCustomerAddressLine2.trim() || undefined,
        city: newCustomerCity.trim(),
        state: newCustomerState.trim(),
        postalCode: newCustomerPostalCode.trim() || undefined
      };
    }

    createCustomerMutation.mutate(payload);
  };

  const handleCustomerClick = (customer: CustomerSummary) => {
    setSelectedCustomer(customer);
    setDetailsModalOpen(true);
  };

  const handleCloseModal = () => {
    setDetailsModalOpen(false);
    setTimeout(() => setSelectedCustomer(null), 200);
  };

  const openEditModal = () => {
    if (selectedCustomer) {
      setEditName(customerDetails?.name || selectedCustomer.name || '');
      setEditEmail(customerDetails?.email || selectedCustomer.email || '');
      setEditPhone(customerDetails?.phone || selectedCustomer.phone || '');
      setEditModalOpen(true);
    }
  };

  const handleSaveCustomer = () => {
    if (!editName.trim()) {
      toast.error('Name is required');
      return;
    }
    updateCustomerMutation.mutate({
      name: editName.trim(),
      email: editEmail.trim() || undefined,
      phone: editPhone.trim() || undefined
    });
  };

  const openAddressModal = (address?: any) => {
    if (address) {
      setEditingAddress(address);
      setAddressLabel(address.label || '');
      setAddressLine1(address.line1 || '');
      setAddressLine2(address.line2 || '');
      setAddressCity(address.city || '');
      setAddressState(address.state || '');
      setAddressPostalCode(address.postalCode || '');
    } else {
      setEditingAddress(null);
      resetAddressForm();
    }
    setAddressModalOpen(true);
  };

  const resetAddressForm = () => {
    setEditingAddress(null);
    setAddressLabel('');
    setAddressLine1('');
    setAddressLine2('');
    setAddressCity('');
    setAddressState('');
    setAddressPostalCode('');
  };

  const handleSaveAddress = () => {
    if (!addressLine1.trim() || !addressCity.trim() || !addressState.trim()) {
      toast.error('Address line 1, city, and state are required');
      return;
    }
    updateAddressMutation.mutate({
      line1: addressLine1.trim(),
      line2: addressLine2.trim() || undefined,
      city: addressCity.trim(),
      state: addressState.trim(),
      postalCode: addressPostalCode.trim() || undefined,
      addressId: editingAddress?.id
    });
  };

  const handleDeleteAddress = (addressId: string) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      deleteAddressMutation.mutate(addressId);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Customers</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Customer Directory</h1>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} icon={<PlusIcon className="h-4 w-4" />}>
          Add Customer
        </Button>
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Contact Information</h3>
                <Button variant="secondary" onClick={openEditModal} icon={<PencilIcon className="h-4 w-4" />}>
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Name</p>
                  <p className="font-medium text-slate-900">{customerDetails?.name || selectedCustomer.name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="font-medium text-slate-900">{customerDetails?.phone || selectedCustomer.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="font-medium text-slate-900">{customerDetails?.email || selectedCustomer.email || '—'}</p>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Addresses</h3>
                <Button variant="secondary" onClick={() => openAddressModal()} icon={<PlusIcon className="h-4 w-4" />}>
                  Add Address
                </Button>
              </div>
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
                        <div className="flex items-center gap-2 ml-2">
                          {address.isDefault && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                              Default
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddressModal(address);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Edit address"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {!address.isDefault && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAddress(address.id);
                              }}
                              disabled={deleteAddressMutation.isPending}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
                              title="Delete address"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
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
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Order History ({customerOrders.length})</h3>
              {customerOrders.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
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

      {/* Edit Customer Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Customer"
      >
        <div className="space-y-4">
          <Input
            label="Name *"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Customer name"
          />
          <Input
            label="Email"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            placeholder="customer@email.com"
          />
          <Input
            label="Phone"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            placeholder="Phone number"
          />
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSaveCustomer} loading={updateCustomerMutation.isPending}>
              Save Changes
            </Button>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit/Add Address Modal */}
      <Modal
        open={addressModalOpen}
        onClose={() => {
          setAddressModalOpen(false);
          resetAddressForm();
        }}
        title={editingAddress ? 'Edit Address' : 'Add Address'}
      >
        <div className="space-y-4">
          <Input
            label="Label (optional)"
            value={addressLabel}
            onChange={(e) => setAddressLabel(e.target.value)}
            placeholder="e.g. Home, Office"
          />
          <Input
            label="Address Line 1 *"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            placeholder="Street address"
          />
          <Input
            label="Address Line 2"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder="Apartment, suite, etc."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City *"
              value={addressCity}
              onChange={(e) => setAddressCity(e.target.value)}
              placeholder="City"
            />
            <Input
              label="State *"
              value={addressState}
              onChange={(e) => setAddressState(e.target.value)}
              placeholder="State"
            />
          </div>
          <Input
            label="Postal Code"
            value={addressPostalCode}
            onChange={(e) => setAddressPostalCode(e.target.value)}
            placeholder="PIN Code"
          />
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSaveAddress} loading={updateAddressMutation.isPending}>
              {editingAddress ? 'Update Address' : 'Add Address'}
            </Button>
            <Button variant="secondary" onClick={() => {
              setAddressModalOpen(false);
              resetAddressForm();
            }}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Customer Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          resetCreateForm();
        }}
        title="Add New Customer"
        size="lg"
      >
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Contact Information</h3>
            <div className="space-y-4">
              <Input
                label="Name *"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Customer name"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Phone *"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="Phone number"
                />
                <Input
                  label="Email"
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="customer@email.com"
                />
              </div>
            </div>
          </div>

          {/* Address (Optional) */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Address (Optional)</h3>
            <div className="space-y-4">
              <Input
                label="Address Line 1"
                value={newCustomerAddressLine1}
                onChange={(e) => setNewCustomerAddressLine1(e.target.value)}
                placeholder="Street address"
              />
              <Input
                label="Address Line 2"
                value={newCustomerAddressLine2}
                onChange={(e) => setNewCustomerAddressLine2(e.target.value)}
                placeholder="Apartment, suite, etc."
              />
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="City"
                  value={newCustomerCity}
                  onChange={(e) => setNewCustomerCity(e.target.value)}
                  placeholder="City"
                />
                <Input
                  label="State"
                  value={newCustomerState}
                  onChange={(e) => setNewCustomerState(e.target.value)}
                  placeholder="State"
                />
                <Input
                  label="Postal Code"
                  value={newCustomerPostalCode}
                  onChange={(e) => setNewCustomerPostalCode(e.target.value)}
                  placeholder="PIN Code"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              If you provide an address, line 1, city, and state are required.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleCreateCustomer} loading={createCustomerMutation.isPending}>
              Create Customer
            </Button>
            <Button variant="secondary" onClick={() => {
              setCreateModalOpen(false);
              resetCreateForm();
            }}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomersPage;
