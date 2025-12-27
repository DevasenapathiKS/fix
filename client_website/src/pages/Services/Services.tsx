import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../../services/customerApi';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../Components/Toast/Toast';
import type { ServiceCategory } from '../../types/customer';
import './services.css';

// Image error handler
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Service';
  e.currentTarget.onerror = null;
};

export default function ServicesPage() {
  const navigate = useNavigate();
  const { addItem, items } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await customerApi.listServices();
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Failed to load services. Please try again.');
        toast.error('Failed to load services');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleAddToCart = (service: typeof categories[0]['services'][0], category: ServiceCategory) => {
    if (!isAuthenticated()) {
      toast.warning('Please login to add items to cart');
      navigate('/login');
      return;
    }

    setAddingToCart(service._id || '');
    
    // Simulate a small delay for feedback
    setTimeout(() => {
      addItem(service, { _id: category._id || '', name: category.name });
      toast.success(`${service.name} added to cart`);
      setAddingToCart(null);
    }, 300);
  };

  const isInCart = (serviceId?: string) => {
    return items.some(item => item.service._id === serviceId);
  };

  const getCartQuantity = (serviceId?: string) => {
    const item = items.find(item => item.service._id === serviceId);
    return item?.quantity || 0;
  };

  const filteredCategories = useMemo(() => {
    const safeCategories = Array.isArray(categories) ? categories : [];
    if (!keyword) return safeCategories;
    const lower = keyword.toLowerCase();
    return safeCategories
      .map((category) => ({
        ...category,
        services: category.services.filter((service) => 
          service.name.toLowerCase().includes(lower) ||
          service.description?.toLowerCase().includes(lower)
        )
      }))
      .filter((category) => category.services.length > 0);
  }, [categories, keyword]);

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    customerApi.listServices()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {
        setError('Failed to load services. Please try again.');
        toast.error('Failed to load services');
      })
      .finally(() => setLoading(false));
  };

  return (
    <section className="page services-page">
      <div className="services-header">
        <div>
          <p className="eyebrow">Service Catalog</p>
          <h1>Choose a premium service</h1>
          <p className="muted">Every visit comes with Fixzep's 10-point safety assurance.</p>
        </div>
        <div className="header-actions">
          {cartItemCount > 0 && (
            <button className="cart-btn" onClick={() => navigate('/cart')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
              </svg>
              <span className="cart-count">{cartItemCount}</span>
              View Cart
            </button>
          )}
          <button className="primary-btn" onClick={() => navigate('/booking')}>
            Book Instantly
          </button>
        </div>
      </div>

      <div className="search-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search services... (AC Tune-up, False ceiling, EV charger)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          {keyword && (
            <button className="clear-search" onClick={() => setKeyword('')}>×</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="services-loader">
          <div className="spinner" />
          <p>Loading service catalog...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button className="retry-btn" onClick={handleRetry}>Try Again</button>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔧</div>
          <p>No services found</p>
          <span className="muted">Try a different search term</span>
          {keyword && (
            <button className="ghost-btn" onClick={() => setKeyword('')}>Clear Search</button>
          )}
        </div>
      ) : (
        <div className="categories-stack">
          {filteredCategories.map((category) => (
            <div key={category._id} className="category-section">
              <div className="category-header">
                <h2>{category.name}</h2>
                <p className="muted">{category.description}</p>
              </div>
              <div className="services-grid">
                {category.services.map((service) => {
                  const inCart = isInCart(service._id);
                  const cartQty = getCartQuantity(service._id);
                  const isAdding = addingToCart === service._id;
                  
                  return (
                    <article key={service._id} className="service-card">
                      <div className="service-image">
                        {service.heroImage ? (
                          <img 
                            src={service.heroImage} 
                            alt={service.name}
                            onError={handleImageError}
                            loading="lazy"
                          />
                        ) : (
                          <div className="placeholder-image">🔧</div>
                        )}
                        {inCart && (
                          <span className="in-cart-badge">
                            {cartQty} in cart
                          </span>
                        )}
                      </div>
                      <div className="service-content">
                        <div className="service-info">
                          <strong>{service.name}</strong>
                          <p>{service.description}</p>
                          {service.basePrice && (
                            <span className="price">From ₹{service.basePrice}</span>
                          )}
                        </div>
                        <div className="service-footer">
                          <span className="badge">
                            ✨ {service.badge ?? 'Certified experts'}
                          </span>
                          <div className="service-actions">
                            <button
                              className={`add-to-cart-btn ${inCart ? 'in-cart' : ''}`}
                              onClick={() => handleAddToCart(service, category)}
                              disabled={isAdding}
                            >
                              {isAdding ? (
                                <>
                                  <span className="btn-spinner" />
                                  Adding...
                                </>
                              ) : inCart ? (
                                <>+ Add More</>
                              ) : (
                                <>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="9" cy="21" r="1" />
                                    <circle cx="20" cy="21" r="1" />
                                    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                                  </svg>
                                  Add to Cart
                                </>
                              )}
                            </button>
                            <button
                              className="schedule-btn"
                              onClick={() => navigate(`/booking?serviceItem=${service._id}`)}
                            >
                              Schedule →
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
