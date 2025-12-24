import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customerApi } from '../../services/customerApi';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../Components/Toast/Toast';
import { LoginRequiredModal } from '../../Components/Modal/Modal';
import type { OrderSummary, PaymentIntent } from '../../types/customer';
import './payments.css';

export default function PaymentsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const defaultOrderId = params.get('orderId') ?? '';
  const { isAuthenticated } = useAuthStore();

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Payment form
  const [selectedOrder, setSelectedOrder] = useState(defaultOrderId);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'upi' | 'cash'>('upi');
  const [submitting, setSubmitting] = useState(false);

  // Active payment
  const [activePayment, setActivePayment] = useState<PaymentIntent | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      setShowLoginModal(true);
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await customerApi.listOrders();
        setOrders(data);
        // Set amount from default order if available
        if (defaultOrderId) {
          const order = data.find((o) => o._id === defaultOrderId);
          if (order?.estimatedCost) {
            setAmount(String(order.estimatedCost));
          }
        }
      } catch (err) {
        setError('Failed to load orders');
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, defaultOrderId]);

  const handleInitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedOrder) {
      setError('Please select an order');
      toast.warning('Please select an order');
      return;
    }
    if (!amount || Number(amount) < 100) {
      setError('Please enter a valid amount (min ₹100)');
      toast.warning('Minimum payment amount is ₹100');
      return;
    }

    try {
      setSubmitting(true);
      const payment = await customerApi.initializePayment({
        orderId: selectedOrder,
        amount: Number(amount),
        method
      });
      setActivePayment(payment);
      setSuccess('Payment initialized! Complete the transaction.');
      toast.success('Payment initialized');
    } catch (err) {
      setError('Failed to initialize payment');
      toast.error('Failed to initialize payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!activePayment || !transactionRef) return;
    setError(null);

    try {
      setConfirming(true);
      await customerApi.confirmPayment({
        paymentId: activePayment._id,
        transactionRef
      });
      setSuccess('Payment confirmed successfully!');
      toast.success('Payment confirmed successfully!');
      setActivePayment(null);
      setTransactionRef('');
      setSelectedOrder('');
      setAmount('');
    } catch (err) {
      setError('Failed to confirm payment');
      toast.error('Failed to confirm payment');
    } finally {
      setConfirming(false);
    }
  };

  const selectOrder = (orderId: string) => {
    setSelectedOrder(orderId);
    const order = orders.find((o) => o._id === orderId);
    if (order?.estimatedCost) {
      setAmount(String(order.estimatedCost));
    }
    setActivePayment(null);
  };

  if (showLoginModal) {
    return (
      <section className="page payments-page">
        <LoginRequiredModal
          isOpen={true}
          onClose={() => navigate('/')}
          onLogin={() => navigate('/login')}
          message="Please login to manage payments"
        />
      </section>
    );
  }

  const outstandingOrders = orders.filter((o) => o.status !== 'completed');

  return (
    <section className="page payments-page">
      <div className="payments-header">
        <div>
          <p className="eyebrow">Transactions</p>
          <h1>Payments</h1>
          <p className="muted">Securely release payments for completed visits.</p>
        </div>
        <button className="ghost" onClick={() => navigate('/orders')}>← Back to Orders</button>
      </div>

      {error && <div className="payments-banner error">{error}</div>}
      {success && <div className="payments-banner success">{success}</div>}

      {loading ? (
        <div className="payments-loader">
          <div className="spinner" />
          <p>Loading payments...</p>
        </div>
      ) : (
        <div className="payments-grid">
          {/* Init Payment Card */}
          <div className="payment-card">
            <h3>💳 Initiate Payment</h3>
            <form className="payment-form" onSubmit={handleInitPayment}>
              <div className="field">
                <label>Select Order</label>
                <select value={selectedOrder} onChange={(e) => selectOrder(e.target.value)}>
                  <option value="">Choose order...</option>
                  {orders.map((order) => {
                    const name = typeof order.serviceItem === 'string' ? order.serviceItem : order.serviceItem?.name;
                    return (
                      <option key={order._id} value={order._id}>
                        {name} · {formatCurrency(order.estimatedCost)}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="field">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={100}
                />
              </div>
              <div className="field">
                <label>Payment Method</label>
                <select value={method} onChange={(e) => setMethod(e.target.value as 'upi' | 'cash')}>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <button type="submit" className="init-btn" disabled={submitting}>
                {submitting ? 'Processing...' : 'Create Payment Request'}
              </button>
            </form>
          </div>

          {/* QR Code / Confirmation Card */}
          {activePayment && (
            <div className="payment-card">
              <h3>📱 {method === 'upi' ? 'UPI Payment' : 'Cash Payment'}</h3>
              {method === 'upi' && activePayment.metadata?.qrPayload && (
                <div className="qr-section">
                  <p className="muted">Scan via any UPI app</p>
                  <div className="qr-placeholder">
                    <span>📲</span>
                    <code>{activePayment.metadata.qrPayload}</code>
                  </div>
                </div>
              )}
              <div className="confirm-section">
                <div className="field">
                  <label>Payment ID</label>
                  <input type="text" value={activePayment._id} readOnly />
                </div>
                <div className="field">
                  <label>Transaction Reference</label>
                  <input
                    type="text"
                    placeholder="Enter transaction ref..."
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                  />
                </div>
                <button
                  className="confirm-btn"
                  onClick={handleConfirmPayment}
                  disabled={confirming || !transactionRef}
                >
                  {confirming ? 'Confirming...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          )}

          {/* Outstanding Orders Card */}
          <div className="payment-card orders-card">
            <h3>📋 Open Orders</h3>
            {outstandingOrders.length === 0 ? (
              <p className="muted">All payments settled! 🎉</p>
            ) : (
              <div className="orders-list">
                {outstandingOrders.map((order) => {
                  const name = typeof order.serviceItem === 'string' ? order.serviceItem : order.serviceItem?.name;
                  return (
                    <div key={order._id} className="order-row">
                      <div className="order-info">
                        <strong>{name}</strong>
                        <span>{formatCurrency(order.estimatedCost)}</span>
                      </div>
                      <button className="pay-btn" onClick={() => selectOrder(order._id)}>
                        Pay
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}
