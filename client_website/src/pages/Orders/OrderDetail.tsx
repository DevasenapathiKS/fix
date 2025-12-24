import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customerApi } from '../../services/customerApi';
import { useAuthStore } from '../../store/authStore';
import type { OrderDetail, CustomerApproval, InvoiceSummary } from '../../types/customer';
import './orderDetail.css';

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [approval, setApproval] = useState<CustomerApproval | null>(null);
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);
  const [techStatus, setTechStatus] = useState<{ status: string; lastCheckInAt?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rating form
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    if (!orderId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [orderData, approvalData, invoiceData, techData] = await Promise.all([
          customerApi.getOrder(orderId),
          customerApi.getAdditionalItems(orderId).catch(() => null),
          customerApi.getInvoice(orderId).catch(() => null),
          customerApi.getTechnicianStatus(orderId).catch(() => null)
        ]);
        setOrder(orderData);
        setApproval(approvalData);
        setInvoice(invoiceData);
        setTechStatus(techData);
      } catch (err) {
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId, isAuthenticated, navigate]);

  const handleApprove = async () => {
    if (!orderId) return;
    try {
      setApprovalLoading(true);
      const result = await customerApi.approveAdditionalItems(orderId, 'Approved via portal');
      setApproval(result);
      // Refresh order
      const updatedOrder = await customerApi.getOrder(orderId);
      setOrder(updatedOrder);
    } catch (err) {
      setError('Failed to approve items');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleReject = async () => {
    if (!orderId) return;
    try {
      setApprovalLoading(true);
      const result = await customerApi.rejectAdditionalItems(orderId, 'Rejected via portal');
      setApproval(result);
      const updatedOrder = await customerApi.getOrder(orderId);
      setOrder(updatedOrder);
    } catch (err) {
      setError('Failed to reject items');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    try {
      setRatingSubmitting(true);
      await customerApi.rateOrder(orderId, { rating, comment });
      const updatedOrder = await customerApi.getOrder(orderId);
      setOrder(updatedOrder);
    } catch (err) {
      setError('Failed to submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (!isAuthenticated()) return null;

  if (loading) {
    return (
      <section className="page order-detail-page">
        <div className="detail-loader">
          <div className="spinner" />
          <p>Loading order details...</p>
        </div>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="page order-detail-page">
        <div className="error-state">
          <p>Order not found</p>
          <button className="ghost" onClick={() => navigate('/orders')}>Back to orders</button>
        </div>
      </section>
    );
  }

  const serviceName = typeof order.serviceItem === 'string' ? order.serviceItem : order.serviceItem?.name;

  return (
    <section className="page order-detail-page">
      <div className="detail-header">
        <div>
          <p className="eyebrow">Order #{order._id?.slice(-8)}</p>
          <h1>{serviceName}</h1>
        </div>
        <button className="ghost" onClick={() => navigate('/orders')}>← Back to Orders</button>
      </div>

      {error && <div className="detail-banner error">{error}</div>}

      <div className="detail-grid">
        {/* Status Card */}
        <div className="detail-card">
          <h3>📋 Order Status</h3>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">Status</span>
              <span className={`status-badge ${getStatusColor(order.status)}`}>
                {order.status?.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="status-item">
              <span className="label">Scheduled</span>
              <span className="value">{formatDateTime(order.scheduledAt)}</span>
            </div>
            <div className="status-item">
              <span className="label">Estimated Cost</span>
              <span className="value">{formatCurrency(order.estimatedCost)}</span>
            </div>
            <div className="status-item">
              <span className="label">Address</span>
              <span className="value">{order.customerAddress?.line1 ?? '—'}</span>
            </div>
          </div>
        </div>

        {/* Technician Card */}
        <div className="detail-card">
          <h3>👨‍🔧 Technician</h3>
          <div className="tech-info">
            <div className="tech-avatar">👤</div>
            <div className="tech-details">
              <strong>{order.assignedTechnician?.name ?? 'Awaiting assignment'}</strong>
              <span>{order.assignedTechnician?.mobile ?? '—'}</span>
            </div>
          </div>
          {techStatus?.lastCheckInAt && (
            <p className="tech-checkin">Last check-in: {formatDateTime(techStatus.lastCheckInAt)}</p>
          )}
          <button className="ghost" disabled={!order.assignedTechnician}>
            📞 Contact Crew
          </button>
        </div>

        {/* Approvals Card */}
        <div className="detail-card">
          <h3>✅ Approvals</h3>
          {!approval || approval.status === 'not_required' ? (
            <p className="muted">No pending approvals</p>
          ) : (
            <div className="approval-content">
              <div className="approval-item">
                <strong>{approval.requestedItems?.[0]?.label}</strong>
                <span>{formatCurrency(approval.requestedItems?.[0]?.amount)}</span>
              </div>
              {approval.status === 'pending' && (
                <div className="approval-actions">
                  <button
                    className="approve-btn"
                    onClick={handleApprove}
                    disabled={approvalLoading}
                  >
                    {approvalLoading ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    className="reject-btn"
                    onClick={handleReject}
                    disabled={approvalLoading}
                  >
                    Reject
                  </button>
                </div>
              )}
              {approval.status !== 'pending' && (
                <span className={`approval-status ${approval.status}`}>
                  {approval.status}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Timeline Card */}
        <div className="detail-card">
          <h3>📜 Timeline</h3>
          {order.history && order.history.length > 0 ? (
            <ul className="timeline">
              {order.history.map((entry, idx) => (
                <li key={idx} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <strong>{entry.action}</strong>
                    <p>{entry.message}</p>
                    {entry.createdAt && <span className="timeline-time">{formatDateTime(entry.createdAt)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No history logged yet</p>
          )}
        </div>

        {/* Invoice Card */}
        <div className="detail-card">
          <h3>🧾 Invoice Summary</h3>
          <div className="invoice-rows">
            <div className="invoice-row">
              <span>Estimate</span>
              <strong>{formatCurrency(invoice?.totals.estimate)}</strong>
            </div>
            <div className="invoice-row">
              <span>Additions</span>
              <strong>{formatCurrency(invoice?.totals.additional)}</strong>
            </div>
            <div className="invoice-row total">
              <span>Final</span>
              <strong>{formatCurrency(invoice?.totals.final)}</strong>
            </div>
          </div>
          <button className="primary-btn" onClick={() => navigate(`/payments?orderId=${order._id}`)}>
            View Payment Options
          </button>
        </div>

        {/* Rating Card */}
        <div className="detail-card">
          <h3>⭐ Rate This Service</h3>
          {order.customerExperience ? (
            <div className="rating-display">
              <div className="rating-stars">
                {'⭐'.repeat(order.customerExperience.rating)}
              </div>
              <p className="rating-comment">{order.customerExperience.comment}</p>
              <span className="muted">Rated on {formatDateTime(order.customerExperience.ratedAt)}</span>
            </div>
          ) : (
            <form className="rating-form" onSubmit={handleRatingSubmit}>
              <div className="field">
                <label>Rating</label>
                <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((v) => (
                    <option key={v} value={v}>{v} Star{v > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Feedback</label>
                <textarea
                  placeholder="Share your experience..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
              </div>
              <button type="submit" className="submit-rating" disabled={ratingSubmitting}>
                {ratingSubmitting ? 'Submitting...' : '⭐ Submit Rating'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function getStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case 'completed': return 'success';
    case 'in_progress': case 'assigned': return 'info';
    case 'pending': case 'scheduled': return 'warning';
    case 'cancelled': return 'danger';
    default: return 'neutral';
  }
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
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
