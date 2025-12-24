import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../../services/customerApi';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../Components/Toast/Toast';
import { LoginRequiredModal, ConfirmModal } from '../../Components/Modal/Modal';
import type { AuthUser, CustomerAddress, OrderSummary } from '../../types/customer';
import './profile.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, logout } = useAuthStore();
  const [user, setUser] = useState<AuthUser | null>(authUser);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deleteAddressId, setDeleteAddressId] = useState<string | null>(null);
  const [deletingAddress, setDeletingAddress] = useState(false);
  const loggedIn = isAuthenticated();

  useEffect(() => {
    if (!loggedIn) {
      setShowLoginModal(true);
      return;
    }

    let cancelled = false;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const [profile, addressList, history] = await Promise.all([
          customerApi.getProfile(),
          customerApi.listAddresses(),
          customerApi.getHistory()
        ]);
        if (!cancelled) {
          setUser(profile);
          setAddresses(addressList);
          setOrders(history);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Unable to load profile. Please re-login.');
          toast.error('Failed to load profile');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  useEffect(() => {
    setUser(authUser);
  }, [authUser]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    toast.success('Logged out successfully');
    setShowLogoutConfirm(false);
    navigate('/');
  };

  const handleDeleteAddress = async () => {
    if (!deleteAddressId) return;
    
    try {
      setDeletingAddress(true);
      await customerApi.deleteAddress(deleteAddressId);
      setAddresses(prev => prev.filter(a => a._id !== deleteAddressId));
      toast.success('Address deleted');
      setDeleteAddressId(null);
    } catch (err) {
      toast.error('Failed to delete address');
    } finally {
      setDeletingAddress(false);
    }
  };

  if (showLoginModal) {
    return (
      <section className="page profile-page">
        <LoginRequiredModal
          isOpen={true}
          onClose={() => navigate('/')}
          onLogin={() => navigate('/login')}
          message="Please login to view your profile"
        />
      </section>
    );
  }

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'in_progress': case 'assigned': return 'info';
      case 'pending': case 'scheduled': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <section className="page profile-page">
      {error && (
        <div className="profile-banner error">
          <span className="banner-icon">⚠️</span>
          {error}
        </div>
      )}
      {loading && (
        <div className="profile-banner loading">
          <div className="spinner" />
          Loading your info...
        </div>
      )}

      <div className="profile-hero">
        <div className="hero-bg-pattern" />
        <div className="hero-content">
          <div className="avatar-section">
            <div className="avatar">
              <span>{getInitials(user?.name)}</span>
            </div>
            <div className="avatar-info">
              <span className="tier-badge">{user?.profile?.loyaltyTier ?? 'Standard'}</span>
              <h1>{user?.name ?? 'Welcome'}</h1>
              <p className="subtitle">Member since 2024</p>
            </div>
          </div>
          <div className="profile-actions">
            <button className="ghost" onClick={() => navigate('/')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Home
            </button>
            <button className="solid danger-outline" onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </button>
          </div>
        </div>

        <div className="contact-chips">
          {user?.email && (
            <div className="contact-chip">
              <span className="chip-icon">✉️</span>
              <span>{user.email}</span>
            </div>
          )}
          {user?.phone && (
            <div className="contact-chip">
              <span className="chip-icon">📱</span>
              <span>{user.phone}</span>
            </div>
          )}
        </div>

        <div className="quick-actions">
          <button className="action-card" onClick={() => navigate('/booking')}>
            <div className="action-icon blue">🔧</div>
            <div className="action-text">
              <strong>Book service</strong>
              <span>Schedule a new repair</span>
            </div>
          </button>
          <button className="action-card" onClick={() => navigate('/addresses')}>
            <div className="action-icon purple">📍</div>
            <div className="action-text">
              <strong>Add address</strong>
              <span>Save a new location</span>
            </div>
          </button>
          <button className="action-card" onClick={() => navigate('/orders')}>
            <div className="action-icon green">📦</div>
            <div className="action-text">
              <strong>My orders</strong>
              <span>View all orders</span>
            </div>
          </button>
        </div>

        <div className="stat-wrap">
          <div className="stat-card">
            <div className="stat-icon">📍</div>
            <div>
              <p className="value">{addresses.length}</p>
              <p className="label">Saved addresses</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div>
              <p className="value">{orders.length}</p>
              <p className="label">Total orders</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div>
              <p className="value">4.9</p>
              <p className="label">Avg rating given</p>
            </div>
          </div>
          <div className="stat-card highlight">
            <div className="stat-icon">✅</div>
            <div>
              <p className="value badge">{loggedIn ? 'Active' : 'Guest'}</p>
              <p className="label">Account status</p>
            </div>
          </div>
        </div>
      </div>

      {!loading && (
        <div className="profile-grid">
          <div className="panel addresses-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Addresses</p>
                <h3>Where we meet you</h3>
              </div>
              <button className="add-btn" onClick={() => navigate('/addresses')}>
                <span className="icon">+</span> Add new
              </button>
            </div>
            {addresses.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📍</div>
                <p>No saved addresses yet</p>
                <span className="muted">Add your first address when booking a service</span>
              </div>
            )}
            <div className="address-grid">
              {addresses.map((addr) => (
                <article key={addr._id} className={`address-card ${addr.isDefault ? 'default' : ''}`}>
                  <div className="card-header">
                    <div className="label-row">
                      <span className="addr-icon">
                        {addr.label?.toLowerCase().includes('work') ? '🏢' : addr.label?.toLowerCase().includes('office') ? '🏢' : '🏠'}
                      </span>
                      <strong>{addr.label ?? 'Home'}</strong>
                      {addr.isDefault && <span className="default-badge">Default</span>}
                    </div>
                    <div className="card-actions">
                      <button className="icon-btn" title="Edit address" onClick={() => navigate('/addresses')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button className="icon-btn danger" title="Delete address" onClick={() => setDeleteAddressId(addr._id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    <p className="contact-name">{addr.contactName ?? user?.name}</p>
                    <p className="street">{addr.line1}</p>
                    {addr.line2 && <p className="street">{addr.line2}</p>}
                    <p className="city-line">{addr.city}, {addr.state} {addr.postalCode}</p>
                    {addr.landmark && <p className="landmark">Near {addr.landmark}</p>}
                  </div>
                  {addr.phone && (
                    <div className="card-footer">
                      <span className="phone-icon">📞</span>
                      <span>{addr.phone}</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>

          <div className="panel orders-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Recent orders</p>
                <h3>Your service history</h3>
              </div>
              <button className="add-btn" onClick={() => navigate('/booking')}>
                <span className="icon">+</span> Book again
              </button>
            </div>
            {orders.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <p>No orders yet</p>
                <span className="muted">Your service requests will appear here</span>
              </div>
            )}
            <div className="orders-grid">
              {orders.slice(0, 6).map((order) => {
                const title = typeof order.serviceItem === 'string' ? order.serviceItem : order.serviceItem?.name;
                const statusColor = getStatusColor(order.status);
                return (
                  <article key={order._id} className="order-card">
                    <div className="order-header">
                      <div className="order-icon">🔧</div>
                      <div className="order-title">
                        <strong>{title}</strong>
                        {order.orderCode && <span className="order-code">#{order.orderCode}</span>}
                      </div>
                      {order.status && (
                        <span className={`status-pill ${statusColor}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <div className="order-body">
                      {order.issueDescription && (
                        <p className="order-desc">{order.issueDescription}</p>
                      )}
                      {order.preferredSlot && (
                        <div className="slot-info">
                          <span className="slot-icon">🕐</span>
                          <span>{order.preferredSlot.label}</span>
                          <span className="slot-time">{order.preferredSlot.start} - {order.preferredSlot.end}</span>
                        </div>
                      )}
                      {order.assignedTechnician && (
                        <div className="tech-info">
                          <span className="tech-avatar">👨‍🔧</span>
                          <span>{order.assignedTechnician.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="order-footer">
                      <button className="order-action" onClick={() => navigate(`/orders/${order._id}`)}>View details</button>
                      {order.status?.toLowerCase() === 'completed' && !order.customerExperience && (
                        <button className="order-action primary" onClick={() => navigate(`/orders/${order._id}`)}>Rate service</button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {orders.length > 6 && (
              <div className="view-all">
                <button className="ghost" onClick={() => navigate('/orders')}>View all {orders.length} orders →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!deleteAddressId}
        title="Delete Address"
        message="Are you sure you want to delete this address? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDeleteAddress}
        onCancel={() => setDeleteAddressId(null)}
        variant="danger"
        loading={deletingAddress}
      />
    </section>
  );
}
