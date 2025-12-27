import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './home.css';
import PromoSection from '../Promotion/Promotion';
import ServicesGrid from '../Servicegrid/ServiceGrid';
import Footer from '../Footer/Footer';
import { customerApi } from '../../services/customerApi';
import type { ServiceCategory, ServiceItem } from '../../types/services';
import type { OrderSummary } from '../../types/customer';
import { useAuthStore } from '../../store/authStore';

const fallbackCategories: ServiceCategory[] = [
  {
    name: 'Emergency fixes',
    description: 'Electricians, plumbers and carpenters on standby',
    heroImage: 'https://images.unsplash.com/photo-1581579184683-1aaf1ad8d3c1',
    services: [
      {
        name: 'Switchboard repair',
        basePrice: 129,
        heroImage: 'https://images.unsplash.com/photo-1581090700227-1e37b190418e',
        badge: 'Within 90 mins'
      },
      {
        name: 'Tap & leakage fix',
        basePrice: 139,
        heroImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
        badge: 'Water safe'
      },
      {
        name: 'Wall decor mounting',
        basePrice: 129,
        heroImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511',
        badge: 'No dust drilling'
      }
    ]
  },
  {
    name: 'Seasonal refresh',
    description: 'Deep cleaning and appliance revival',
    heroImage: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a',
    services: [
      {
        name: 'AC jet deep clean',
        basePrice: 499,
        heroImage: 'https://images.unsplash.com/photo-1583912267550-d9f6e5d09983',
        badge: '2x cooling'
      },
      {
        name: 'Kitchen degrease',
        basePrice: 699,
        heroImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
        badge: 'Food-safe'
      }
    ]
  }
];

const spotlightFallback: ServiceItem[] = [
  {
    name: 'Tap repair',
    basePrice: 139,
    heroImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
    rating: 4.8,
    reviews: '118K'
  },
  {
    name: 'Drill & hang (wall decor)',
    basePrice: 129,
    heroImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511',
    rating: 4.85,
    reviews: '99K'
  },
  {
    name: 'Switchboard repair',
    basePrice: 110,
    heroImage: 'https://images.unsplash.com/photo-1581090700227-1e37b190418e',
    rating: 4.84,
    reviews: '69K'
  },
  {
    name: 'Ceiling fan repair',
    basePrice: 199,
    heroImage: 'https://images.unsplash.com/photo-1616627457039-83b4cda5c7e3',
    rating: 4.81,
    reviews: '92K'
  }
];

const stats = [
  { label: 'Response', value: '45 min', helper: 'Average arrival to doorstep' },
  { label: 'Trust', value: '4.8*', helper: 'Avg. service rating' },
  { label: 'Coverage', value: '40+ cities', helper: 'Nationwide technicians' }
];

export default function HomeServices() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const loggedIn = isAuthenticated();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ServiceItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const remoteCategories = await customerApi.listCategories();
        if (!cancelled) {
          setCategories(Array.isArray(remoteCategories) ? remoteCategories : []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Live services are unavailable right now. Showing curated picks.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch recent orders if authenticated
  useEffect(() => {
    if (!loggedIn) {
      setRecentOrders([]);
      return;
    }

    let cancelled = false;
    const fetchOrders = async () => {
      try {
        setOrdersLoading(true);
        const data = await customerApi.listOrders();
        if (!cancelled) {
          setRecentOrders(data.slice(0, 4)); // Show only last 4 orders
        }
      } catch (err) {
        console.error('Failed to fetch recent orders');
      } finally {
        if (!cancelled) {
          setOrdersLoading(false);
        }
      }
    };

    fetchOrders();
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  useEffect(() => {
    if (searchTerm.trim().length < 3) {
      setSearchResults([]);
      return undefined;
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        setSearching(true);
        const results = await customerApi.searchServices(searchTerm.trim());
        if (!cancelled) {
          setSearchResults(results);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Search is temporarily unavailable.');
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchTerm]);

  const visibleCategories = useMemo(() => {
    const safe = Array.isArray(categories) ? categories : [];
    return safe.length ? safe : fallbackCategories;
  }, [categories]);

  const spotlightServices = useMemo(() => {
    if (searchTerm.trim().length >= 3) {
      if (searchResults.length) return searchResults;
      if (visibleCategories[0]?.services?.length) return visibleCategories[0].services;
      return spotlightFallback;
    }
    if (visibleCategories[0]?.services?.length) return visibleCategories[0].services;
    return spotlightFallback;
  }, [searchResults, searchTerm, visibleCategories]);

  return (
    <div className="page-shell">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Fixzep • Same-day home services</p>
          <h1>
            Reliable technicians with <span>concierge-level care</span>
          </h1>
          <p className="lede">
            Book vetted electricians, plumbers, cleaners and appliance experts. Transparent pricing, precise time slots,
            and live technician tracking.
          </p>

          <form className="search-row" onSubmit={(event) => event.preventDefault()}>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search for 'AC jet clean' or 'tap repair'"
              aria-label="Search services"
            />
            <button type="submit" disabled={searching}>
              {searching ? 'Searching...' : 'Find a service'}
            </button>
          </form>

          {error && <div className="inline-error">{error}</div>}

          <div className="stat-row">
            {stats.map((stat) => (
              <div key={stat.label} className="stat">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.helper}</span>
              </div>
            ))}
          </div>

          <div className="profile-cta">
            <div>
              <p className="eyebrow">Profile</p>
              <h3>{loggedIn && user ? `Welcome back, ${user.name ?? 'there'}` : 'Set up your profile'}</h3>
              <p className="muted">Manage addresses, see orders, and speed up checkout.</p>
            </div>
            <div className="cta-actions">
              {loggedIn && user ? (
                <>
                  <button className="ghost" onClick={() => navigate('/profile')}>
                    View profile
                  </button>
                  <button className="solid" onClick={() => navigate('/profile')}>
                    Saved addresses
                  </button>
                </>
              ) : (
                <>
                  <button className="ghost" onClick={() => navigate('/login')}>
                    Login
                  </button>
                  <button className="solid" onClick={() => navigate('/register')}>
                    Create account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="hero-panels">
          {visibleCategories.slice(0, 2).map((category) => (
            <div key={category.name} className="panel">
              <div className="panel-copy">
                <p className="panel-tag">Featured</p>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
                <div className="panel-meta">
                  <span>Priority slots</span>
                  <span>Background-verified pros</span>
                </div>
              </div>
              {category.heroImage && <img src={category.heroImage} alt={category.name} loading="lazy" />}
            </div>
          ))}
        </div>
      </section>

      <section className="category-strip">
        <div className="strip-header">
          <div>
            <p className="eyebrow">Browse by category</p>
            <h2>Select what fits your home</h2>
          </div>
          <span className="muted">Live availability refreshed every few minutes.</span>
        </div>

        <div className="strip-scroller">
          {visibleCategories.map((category) => (
            <article key={category.name} className="category-card">
              <div className="card-image">
                {category.heroImage ? (
                  <img 
                    src={category.heroImage} 
                    alt={category.name} 
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=200&fit=crop';
                      e.currentTarget.onerror = null;
                    }}
                  />
                ) : (
                  <div className="card-image-placeholder">🔧</div>
                )}
              </div>
              <div className="card-top">
                <h4>{category.name}</h4>
                <p>{category.description ?? 'Handpicked services with upfront pricing.'}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <ServicesGrid
        title={searchTerm.trim().length >= 3 ? 'Search results' : 'Popular this week'}
        description={
          searchTerm.trim().length >= 3
            ? `Showing matches for "${searchTerm.trim()}"`
            : 'Trusted picks our customers repeat the most.'
        }
        services={spotlightServices}
        loading={loading || searching}
      />

      {/* Recent Orders Section */}
      {loggedIn && (
        <section className="orders-section">
          <div className="orders-section-header">
            <div>
              <p className="eyebrow">Your Activity</p>
              <h2>Recent Job Cards</h2>
            </div>
            <button className="view-all-btn" onClick={() => navigate('/orders')}>
              View All →
            </button>
          </div>

          {ordersLoading ? (
            <div className="orders-loader">
              <div className="spinner" />
              <p>Loading your orders...</p>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="empty-orders">
              <div className="empty-icon">📦</div>
              <p>No orders yet</p>
              <span className="muted">Book a service to get started</span>
              <button className="solid" onClick={() => navigate('/booking')}>
                Book Service
              </button>
            </div>
          ) : (
            <div className="orders-grid">
              {recentOrders.map((order) => {
                const title = typeof order.serviceItem === 'string' ? order.serviceItem : order.serviceItem?.name;
                const statusColor = getStatusColor(order.status);
                return (
                  <article key={order._id} className="order-card">
                    <div className="order-card-header">
                      <div className="order-icon">🔧</div>
                      <div className="order-info">
                        <strong>{title}</strong>
                        <span className="order-date">{formatDateTime(order.scheduledAt)}</span>
                      </div>
                      <span className={`status-badge ${statusColor}`}>
                        {order.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="order-card-body">
                      <div className="order-row">
                        <span>Technician</span>
                        <strong>{order.assignedTechnician?.name ?? 'Not assigned'}</strong>
                      </div>
                      <div className="order-row">
                        <span>Estimate</span>
                        <strong>{formatCurrency(order.estimatedCost)}</strong>
                      </div>
                      {order.issueDescription && (
                        <p className="order-desc">{order.issueDescription}</p>
                      )}
                    </div>
                    <div className="order-card-footer">
                      <button className="ghost" onClick={() => navigate(`/orders/${order._id}`)}>
                        View Details →
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <PromoSection />
      <Footer />
    </div>
  );
}

function getStatusColor(status?: string): string {
  switch (status?.toLowerCase()) {
    case 'completed': return 'success';
    case 'in_progress': case 'assigned': return 'info';
    case 'pending': case 'scheduled': return 'warning';
    case 'cancelled': return 'danger';
    default: return 'neutral';
  }
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return 'Not scheduled';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}
