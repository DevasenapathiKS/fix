import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customerApi } from '../../services/customerApi';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../Components/Toast/Toast';
import { LoginRequiredModal } from '../../Components/Modal/Modal';
import type { ServiceCategory, CustomerAddress, TimeSlotDay } from '../../types/customer';
import './booking.css';

interface SelectedSlot {
  label: string;
  start: string;
  end: string;
}

export default function BookingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectServiceItem = params.get('serviceItem') ?? '';
  const { isAuthenticated } = useAuthStore();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [slots, setSlots] = useState<TimeSlotDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Form state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedService, setSelectedService] = useState(preselectServiceItem);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [issueDescription, setIssueDescription] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      setShowLoginModal(true);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [cats, addrs, timeSlots] = await Promise.all([
          customerApi.listServices(),
          customerApi.listAddresses(),
          customerApi.listTimeSlots()
        ]);
        setCategories(cats);
        setAddresses(addrs);
        setSlots(timeSlots);

        // Set default address
        if (addrs.length) {
          const defaultAddr = addrs.find((a) => a.isDefault) ?? addrs[0];
          setSelectedAddress(defaultAddr._id);
        }
      } catch (err) {
        setError('Failed to load booking data. Please try again.');
        toast.error('Failed to load booking data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  const serviceOptions = useMemo(() => {
    if (!selectedCategory) {
      return categories.flatMap((cat) =>
        cat.services.map((s) => ({ value: s._id ?? '', label: s.name, category: cat._id }))
      );
    }
    const cat = categories.find((c) => c._id === selectedCategory);
    return cat?.services.map((s) => ({ value: s._id ?? '', label: s.name, category: cat._id })) ?? [];
  }, [categories, selectedCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedService) {
      setError('Please select a service');
      toast.warning('Please select a service');
      return;
    }
    if (!selectedAddress) {
      setError('Please select an address');
      toast.warning('Please select an address');
      return;
    }
    if (!selectedSlot) {
      setError('Please select a time slot');
      toast.warning('Please select a time slot');
      return;
    }
    if (issueDescription.length < 5) {
      setError('Please describe the issue (at least 5 characters)');
      toast.warning('Please describe the issue');
      return;
    }

    // Find category for selected service
    let categoryId = selectedCategory;
    if (!categoryId) {
      for (const cat of categories) {
        if (cat.services.some((s) => s._id === selectedService)) {
          categoryId = cat._id ?? '';
          break;
        }
      }
    }

    try {
      setSubmitting(true);
      const order = await customerApi.placeOrder({
        serviceCategory: categoryId,
        serviceItem: selectedService,
        customerAddressId: selectedAddress,
        preferredStart: selectedSlot.start,
        preferredEnd: selectedSlot.end,
        preferredLabel: selectedSlot.label,
        issueDescription,
        attachments: []
      });
      setSuccess('Booking confirmed! Redirecting to order details...');
      toast.success('Booking confirmed!');
      setTimeout(() => navigate(`/orders/${order._id}`), 1500);
    } catch (err) {
      setError('Failed to place booking. Please try again.');
      toast.error('Failed to place booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (showLoginModal) {
    return (
      <section className="page booking-page">
        <LoginRequiredModal
          isOpen={true}
          onClose={() => navigate('/')}
          onLogin={() => navigate('/login')}
          message="Please login to book a service"
        />
      </section>
    );
  }

  if (loading) {
    return (
      <section className="page booking-page">
        <div className="booking-loader">
          <div className="spinner" />
          <p>Loading booking assistant...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page booking-page">
      <div className="booking-header">
        <div>
          <p className="eyebrow">Fixzep Concierge</p>
          <h1>Book a service visit</h1>
          <p className="muted">We triage automatically, assign the right craftsman, and keep you notified end-to-end.</p>
        </div>
        <button className="ghost" onClick={() => navigate('/')}>← Back home</button>
      </div>

      {error && <div className="booking-banner error">{error}</div>}
      {success && <div className="booking-banner success">{success}</div>}

      <form className="booking-form" onSubmit={handleSubmit}>
        <div className="form-card">
          <h3>🔧 Select service</h3>
          <div className="field-grid">
            <div className="field">
              <label>Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedService('');
                }}
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Service</label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
              >
                <option value="">Select service</option>
                {serviceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Describe the issue</label>
            <textarea
              placeholder="e.g., Smart door lock not responding, need same-day fix"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="form-card">
          <h3>📍 Select address</h3>
          {addresses.length === 0 ? (
            <div className="empty-state small">
              <p>No addresses saved</p>
              <button type="button" className="ghost" onClick={() => navigate('/addresses')}>
                Add address
              </button>
            </div>
          ) : (
            <div className="address-grid">
              {addresses.map((addr) => (
                <label
                  key={addr._id}
                  className={`address-option ${selectedAddress === addr._id ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={addr._id}
                    checked={selectedAddress === addr._id}
                    onChange={() => setSelectedAddress(addr._id)}
                  />
                  <div className="addr-content">
                    <strong>{addr.label ?? 'Home'}</strong>
                    <span>{addr.line1}</span>
                    <span>{addr.city}, {addr.state}</span>
                  </div>
                  {addr.isDefault && <span className="default-tag">Default</span>}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="form-card">
          <h3>📅 Pick a time slot</h3>
          {slots.length === 0 ? (
            <p className="muted">No slots available. Please try again later.</p>
          ) : (
            <div className="slots-grid">
              {slots.map((day) => (
                <div key={day.date} className="day-column">
                  <p className="day-label">{formatDate(day.date)}</p>
                  {day.slots.map((slot) => {
                    const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                    return (
                      <button
                        type="button"
                        key={slot.templateId}
                        className={`slot-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedSlot({ label: slot.label, start: slot.start, end: slot.end })}
                      >
                        🕐 {slot.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="booking-summary">
          <div className="summary-info">
            <div className="assurance">
              <span className="icon">🛡️</span>
              <div>
                <strong>Concierge assurance</strong>
                <p>Background verification, live ETA tracking, and digital approvals included.</p>
              </div>
            </div>
          </div>
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Confirming...' : 'Confirm booking'}
          </button>
        </div>
      </form>
    </section>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
