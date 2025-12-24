import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi, AddressPayload } from '../../services/customerApi';
import { CustomerAddress } from '../../types/customer';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../Components/Toast/Toast';
import { ConfirmModal, LoginRequiredModal } from '../../Components/Modal/Modal';
import './addresses.css';

const initialForm: AddressPayload = {
  label: '',
  contactName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  landmark: '',
  isDefault: false,
};

export default function Addresses() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressPayload>(initialForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAddresses = async () => {
    try {
      const data = await customerApi.listAddresses();
      setAddresses(data ?? []);
    } catch (err) {
      console.error('Failed to load addresses', err);
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      setShowLoginModal(true);
      return;
    }
    fetchAddresses();
  }, [isAuthenticated]);

  const openAdd = () => {
    setEditingId(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const openEdit = (addr: CustomerAddress) => {
    setEditingId(addr._id);
    setForm({
      label: addr.label ?? '',
      contactName: addr.contactName,
      phone: addr.phone ?? '',
      line1: addr.line1,
      line2: addr.line2 ?? '',
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      landmark: addr.landmark ?? '',
      isDefault: addr.isDefault ?? false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await customerApi.updateAddress(editingId, form);
        toast.success('Address updated');
      } else {
        await customerApi.createAddress(form);
        toast.success('Address added');
      }
      setShowModal(false);
      fetchAddresses();
    } catch (err) {
      console.error('Failed to save address', err);
      toast.error('Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await customerApi.deleteAddress(deleteConfirmId);
      toast.success('Address deleted');
      setDeleteConfirmId(null);
      fetchAddresses();
    } catch (err) {
      console.error('Failed to delete address', err);
      toast.error('Failed to delete address');
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await customerApi.markPreferred(id);
      toast.success('Default address updated');
      fetchAddresses();
    } catch (err) {
      console.error('Failed to set default address', err);
      toast.error('Failed to set default address');
    }
  };

  if (showLoginModal) {
    return (
      <div className="addresses-page">
        <LoginRequiredModal
          isOpen={true}
          onClose={() => navigate('/')}
          onLogin={() => navigate('/login')}
          message="Please login to manage your addresses"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="addresses-page">
        <div className="loader">
          <div className="spinner"></div>
          <span>Loading addresses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="addresses-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Manage</p>
          <h1>My Addresses</h1>
        </div>
        <button className="add-btn" onClick={openAdd}>
          <span>➕</span>
          Add New Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📍</span>
          <p>No addresses saved yet</p>
          <span className="muted">Add an address to use when booking services</span>
          <button className="add-btn" onClick={openAdd}>
            ➕ Add Address
          </button>
        </div>
      ) : (
        <div className="addresses-grid">
          {addresses.map((addr) => (
            <div
              key={addr._id}
              className={`address-card${addr.isDefault ? ' default' : ''}`}
            >
              {addr.isDefault && (
                <span className="default-badge">✓ Default</span>
              )}
              <div className="address-label">
                <span className="label-icon">
                  {(addr.label ?? '').toLowerCase() === 'home'
                    ? '🏠'
                    : (addr.label ?? '').toLowerCase() === 'work'
                    ? '🏢'
                    : '📍'}
                </span>
                <strong>{addr.label || 'Address'}</strong>
              </div>
              <p className="contact-name">{addr.contactName}</p>
              <p className="street">{addr.line1}</p>
              {addr.line2 && <p className="street">{addr.line2}</p>}
              <p className="city-state">
                {addr.city}, {addr.state} {addr.postalCode}
              </p>
              {addr.landmark && (
                <p className="landmark">
                  <span>📌</span> {addr.landmark}
                </p>
              )}
              {addr.phone && (
                <p className="phone">
                  <span>📞</span> {addr.phone}
                </p>
              )}
              <div className="card-actions">
                {!addr.isDefault && (
                  <button
                    className="set-default-btn"
                    onClick={() => handleSetDefault(addr._id)}
                  >
                    Set Default
                  </button>
                )}
                <button className="edit-btn" onClick={() => openEdit(addr)}>
                  ✏️ Edit
                </button>
                <button
                  className="delete-btn"
                  onClick={() => setDeleteConfirmId(addr._id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        title="Delete Address"
        message="Are you sure you want to delete this address? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
        variant="danger"
        loading={deleting}
      />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Address' : 'Add Address'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="address-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Home, Work, Office"
                    value={form.label ?? ''}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Contact Name *</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Address Line 1 *</label>
                <input
                  type="text"
                  placeholder="123 Main St, Apt 4B"
                  value={form.line1}
                  onChange={(e) => setForm({ ...form, line1: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Address Line 2</label>
                <input
                  type="text"
                  placeholder="Suite, Building, Floor (optional)"
                  value={form.line2 ?? ''}
                  onChange={(e) => setForm({ ...form, line2: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>State *</label>
                  <input
                    type="text"
                    placeholder="State"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Postal Code *</label>
                  <input
                    type="text"
                    placeholder="12345"
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Landmark</label>
                  <input
                    type="text"
                    placeholder="Near XYZ (optional)"
                    value={form.landmark ?? ''}
                    onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                  />
                </div>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.isDefault ?? false}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                />
                Set as default address
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Add Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
