import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { customerApi } from '../../services/customerApi';
import { toast } from '../../Components/Toast/Toast';
import { ConfirmModal, LoginRequiredModal } from '../../Components/Modal/Modal';
import type { CustomerAddress, TimeSlotDay } from '../../types/customer';
import './cart.css';

// Image error handler
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.src = 'https://via.placeholder.com/100x100?text=Service';
  e.currentTarget.onerror = null;
};

export default function CartPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { items, removeItem, updateQuantity, updateIssueDescription, clearCart, getTotalPrice } = useCartStore();
  
  // Checkout state
  const [showCheckout, setShowCheckout] = useState(false);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [slots, setSlots] = useState<TimeSlotDay[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{ label: string; start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrders, setSuccessOrders] = useState<string[]>([]);
  
  // Modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [removingItem, setRemovingItem] = useState(false);

  useEffect(() => {
    if (showCheckout && isAuthenticated()) {
      fetchCheckoutData();
    }
  }, [showCheckout, isAuthenticated]);

  const fetchCheckoutData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [addrs, timeSlots] = await Promise.all([
        customerApi.listAddresses(),
        customerApi.listTimeSlots()
      ]);
      setAddresses(addrs);
      setSlots(timeSlots);
      
      if (addrs.length) {
        const defaultAddr = addrs.find((a) => a.isDefault) ?? addrs[0];
        setSelectedAddress(defaultAddr._id);
      }
    } catch (err) {
      setError('Failed to load checkout data');
      toast.error('Failed to load checkout data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToCheckout = () => {
    if (!isAuthenticated()) {
      setShowLoginModal(true);
      return;
    }
    setShowCheckout(true);
  };

  const handleRemoveItem = (serviceId: string) => {
    setShowRemoveConfirm(serviceId);
  };

  const confirmRemoveItem = () => {
    if (showRemoveConfirm) {
      setRemovingItem(true);
      setTimeout(() => {
        const itemName = items.find(i => i.service._id === showRemoveConfirm)?.service.name;
        removeItem(showRemoveConfirm);
        toast.success(`${itemName || 'Item'} removed from cart`);
        setShowRemoveConfirm(null);
        setRemovingItem(false);
      }, 300);
    }
  };

  const handleClearCart = () => {
    setShowClearConfirm(true);
  };

  const confirmClearCart = () => {
    clearCart();
    toast.success('Cart cleared');
    setShowClearConfirm(false);
  };

  const handlePlaceOrders = async () => {
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

    setSubmitting(true);
    setError(null);

    try {
      // Prepare services array for single order with multiple services
      const services = items.map(item => {
        const categoryId = typeof item.category === 'object' && item.category._id 
          ? item.category._id 
          : '';
        
        return {
          serviceItem: item.service._id ?? '',
          serviceCategory: categoryId,
          quantity: item.quantity,
          issueDescription: item.issueDescription || ''
        };
      });

      // Place a single order with all services
      const order = await customerApi.placeOrder({
        customerAddressId: selectedAddress,
        preferredStart: selectedSlot.start,
        preferredEnd: selectedSlot.end,
        preferredLabel: selectedSlot.label,
        estimatedCost: getTotalPrice(),
        services
      });

      setSuccessOrders([order._id]);
      clearCart();
      toast.success('Order placed successfully!');
    } catch (err) {
      setError('Failed to place order. Please try again.');
      toast.error('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Success screen
  if (successOrders.length > 0) {
    return (
      <section className="page cart-page">
        <div className="success-container">
          <div className="success-icon">✓</div>
          <h1>Order Placed Successfully!</h1>
          <p>Your service booking has been confirmed with all selected services.</p>
          <div className="success-actions">
            <button className="primary-btn" onClick={() => navigate(`/orders/${successOrders[0]}`)}>
              View Order Details
            </button>
            <button className="secondary-btn" onClick={() => navigate('/services')}>
              Browse More Services
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <section className="page cart-page">
        <div className="empty-cart">
          <div className="empty-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>Add services to your cart to book them together</p>
          <button className="primary-btn" onClick={() => navigate('/services')}>
            Browse Services
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page cart-page">
      <div className="cart-header">
        <div>
          <p className="eyebrow">Your Cart</p>
          <h1>Review your services</h1>
          <p className="muted">{items.length} service{items.length > 1 ? 's' : ''} ready to book</p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️</span>
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="cart-layout">
        {/* Cart Items */}
        <div className="cart-items">
          {items.map((item) => (
            <div key={item.service._id} className="cart-item">
              <div className="cart-item-image">
                {item.service.heroImage ? (
                  <img 
                    src={item.service.heroImage} 
                    alt={item.service.name}
                    onError={handleImageError}
                  />
                ) : (
                  <div className="placeholder-image">🔧</div>
                )}
              </div>
              
              <div className="cart-item-details">
                <div className="item-header">
                  <div>
                    <h3>{item.service.name}</h3>
                    <span className="category-tag">
                      {typeof item.category === 'object' ? item.category.name : 'Service'}
                    </span>
                  </div>
                  <button 
                    className="remove-btn"
                    onClick={() => handleRemoveItem(item.service._id ?? '')}
                    title="Remove from cart"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
                
                {item.service.description && (
                  <p className="item-description">{item.service.description}</p>
                )}
                
                <div className="item-issue">
                  <label>Issue Description (optional)</label>
                  <textarea
                    placeholder="Describe the issue or requirements..."
                    value={item.issueDescription || ''}
                    onChange={(e) => updateIssueDescription(item.service._id ?? '', e.target.value)}
                    rows={2}
                  />
                </div>
                
                <div className="item-footer">
                  <div className="quantity-control">
                    <button 
                      onClick={() => updateQuantity(item.service._id ?? '', item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.service._id ?? '', item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="item-price">
                    {item.service.basePrice ? (
                      <>
                        <span className="unit-price">{formatCurrency(item.service.basePrice)} × {item.quantity}</span>
                        <span className="total-price">{formatCurrency(item.service.basePrice * item.quantity)}</span>
                      </>
                    ) : (
                      <span className="price-tbd">Price on inspection</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        <div className="cart-summary">
          <div className="summary-card">
            <h3>Order Summary</h3>
            
            <div className="summary-rows">
              {items.map((item) => (
                <div key={item.service._id} className="summary-row">
                  <span>{item.service.name} × {item.quantity}</span>
                  <span>
                    {item.service.basePrice 
                      ? formatCurrency(item.service.basePrice * item.quantity) 
                      : 'TBD'}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="summary-divider" />
            
            <div className="summary-total">
              <span>Estimated Total</span>
              <span>{formatCurrency(getTotalPrice())}</span>
            </div>
            
            <p className="summary-note">
              * Final price may vary based on inspection
            </p>

            {!showCheckout ? (
              <button 
                className="checkout-btn"
                onClick={handleProceedToCheckout}
              >
                Proceed to Checkout
              </button>
            ) : loading ? (
              <div className="checkout-loading">
                <div className="spinner" />
                <p>Loading checkout...</p>
              </div>
            ) : (
              <div className="checkout-form">
                {/* Address Selection */}
                <div className="form-group">
                  <label>Select Address</label>
                  {addresses.length === 0 ? (
                    <div className="no-addresses">
                      <p>No addresses found</p>
                      <button 
                        className="link-btn"
                        onClick={() => navigate('/addresses')}
                      >
                        + Add Address
                      </button>
                    </div>
                  ) : (
                    <div className="address-options">
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
                            onChange={(e) => setSelectedAddress(e.target.value)}
                          />
                          <div className="address-content">
                            <strong>{addr.label || 'Address'}</strong>
                            <span>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</span>
                            <span>{addr.city}, {addr.state} - {addr.postalCode}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Time Slot Selection */}
                <div className="form-group">
                  <label>Select Time Slot</label>
                  {slots.length === 0 ? (
                    <p className="no-slots">No available slots</p>
                  ) : (
                    <div className="slot-days">
                      {slots.slice(0, 5).map((day) => (
                        <div key={day.date} className="slot-day">
                          <div className="day-header">
                            {new Date(day.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="day-slots">
                            {day.slots.map((slot) => (
                              <button
                                key={`${day.date}-${slot.label}`}
                                className={`slot-btn ${
                                  selectedSlot?.start === slot.start && selectedSlot?.label === slot.label
                                    ? 'selected'
                                    : ''
                                }`}
                                onClick={() => setSelectedSlot({
                                  label: slot.label,
                                  start: slot.start,
                                  end: slot.end
                                })}
                              >
                                {slot.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  className="place-order-btn"
                  onClick={handlePlaceOrders}
                  disabled={submitting || !selectedAddress || !selectedSlot}
                >
                  {submitting ? (
                    <>
                      <div className="spinner-small" />
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      Place Order ({items.length} service{items.length > 1 ? 's' : ''})
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <button 
            className="clear-cart-btn"
            onClick={handleClearCart}
          >
            Clear Cart
          </button>
        </div>
      </div>

      {/* Modals */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => navigate('/login')}
        message="Please login to proceed with checkout"
      />

      <ConfirmModal
        isOpen={showClearConfirm}
        title="Clear Cart?"
        message="Are you sure you want to remove all items from your cart? This action cannot be undone."
        confirmText="Clear Cart"
        onConfirm={confirmClearCart}
        onCancel={() => setShowClearConfirm(false)}
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!showRemoveConfirm}
        title="Remove Item?"
        message={`Are you sure you want to remove "${items.find(i => i.service._id === showRemoveConfirm)?.service.name || 'this item'}" from your cart?`}
        confirmText="Remove"
        onConfirm={confirmRemoveItem}
        onCancel={() => setShowRemoveConfirm(null)}
        variant="danger"
        loading={removingItem}
      />
    </section>
  );
}
