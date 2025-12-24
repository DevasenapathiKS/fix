import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../../services/customerApi';
import { toast } from '../../Components/Toast/Toast';
import type { OrderSummary, OrderDetail, InvoiceSummary, CustomerApproval } from '../../types/customer';
import './orders.css';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Job Card Modal State
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Rating Modal State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  
  // Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  
  // Approval State
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [additionalApproval, setAdditionalApproval] = useState<CustomerApproval | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await customerApi.listOrders();
      setOrders(response || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const openJobCard = async (orderId: string) => {
    try {
      setModalLoading(true);
      const [orderDetail, invoiceData, approvalData] = await Promise.all([
        customerApi.getOrder(orderId),
        customerApi.getInvoice(orderId).catch(() => null),
        customerApi.getAdditionalItems(orderId).catch(() => null)
      ]);
      setSelectedOrder(orderDetail);
      setInvoice(invoiceData);
      setAdditionalApproval(approvalData);
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const closeJobCard = () => {
    setSelectedOrder(null);
    setInvoice(null);
    setAdditionalApproval(null);
    setShowRatingModal(false);
    setShowCancelModal(false);
    setRatingValue(0);
    setRatingComment('');
    setCancelReason('');
  };

  // Handle rating submission
  const handleSubmitRating = async () => {
    if (!selectedOrder || ratingValue === 0) return;
    
    try {
      setRatingLoading(true);
      await customerApi.rateOrder(selectedOrder._id, {
        rating: ratingValue,
        comment: ratingComment || undefined
      });
      
      // Update the order with the new rating
      setSelectedOrder({
        ...selectedOrder,
        customerExperience: {
          rating: ratingValue,
          comment: ratingComment,
          ratedAt: new Date().toISOString()
        }
      });
      
      setShowRatingModal(false);
      setRatingValue(0);
      setRatingComment('');
      
      // Refresh orders list
      fetchOrders();
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Failed to submit rating:', error);
      toast.error('Failed to submit rating. Please try again.');
    } finally {
      setRatingLoading(false);
    }
  };

  // Handle order cancellation
  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    
    try {
      setCancelLoading(true);
      await customerApi.cancelOrder(selectedOrder._id, cancelReason || undefined);
      
      // Update the order status
      setSelectedOrder({
        ...selectedOrder,
        status: 'cancelled'
      });
      
      setShowCancelModal(false);
      setCancelReason('');
      
      // Refresh orders list
      fetchOrders();
      closeJobCard();
      toast.success('Order cancelled successfully');
    } catch (error) {
      console.error('Failed to cancel order:', error);
      toast.error('Failed to cancel order. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Handle approval/rejection of additional items
  const handleApprovalAction = async (action: 'approve' | 'reject') => {
    if (!selectedOrder) return;
    
    try {
      setApprovalLoading(true);
      const result = action === 'approve'
        ? await customerApi.approveAdditionalItems(selectedOrder._id)
        : await customerApi.rejectAdditionalItems(selectedOrder._id);
      
      setAdditionalApproval(result);
      
      // Refresh order details
      const updatedOrder = await customerApi.getOrder(selectedOrder._id);
      setSelectedOrder(updatedOrder);
      toast.success(action === 'approve' ? 'Additional items approved' : 'Additional items rejected');
    } catch (error) {
      console.error(`Failed to ${action} additional items:`, error);
      toast.error(`Failed to ${action} additional items. Please try again.`);
    } finally {
      setApprovalLoading(false);
    }
  };

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount?: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusClass = (status?: string) => {
    return `status-badge status-${status?.toLowerCase().replace(' ', '-').replace('_', '-') || 'pending'}`;
  };

  const getPaymentStatusClass = (status?: string) => {
    return `payment-badge payment-${status?.toLowerCase() || 'pending'}`;
  };

  // Helper to get service name
  const getServiceName = (order: OrderSummary | OrderDetail) => {
    if (typeof order.serviceItem === 'object' && order.serviceItem?.name) {
      return order.serviceItem.name;
    }
    return 'Service';
  };

  // Helper to get scheduled date
  const getScheduledDate = (order: OrderSummary | OrderDetail) => {
    return order.scheduledAt || order.timeWindowStart || order.createdAt;
  };

  // Helper to get time slot
  const getTimeSlot = (order: OrderSummary | OrderDetail) => {
    if (order.preferredSlot?.label) return order.preferredSlot.label;
    if (order.timeWindowStart && order.timeWindowEnd) {
      const start = new Date(order.timeWindowStart).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const end = new Date(order.timeWindowEnd).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return `${start} - ${end}`;
    }
    return 'Time TBD';
  };

  // Helper to get technician name
  const getTechnicianName = (order: OrderSummary | OrderDetail) => {
    return order.assignedTechnician?.name || null;
  };

  // Collect all images from order
  const getAllImages = () => {
    if (!selectedOrder || !selectedOrder.media) return [];
    return selectedOrder.media.map((m) => ({
      url: m.url,
      type: m.kind || 'Photo'
    }));
  };

  if (loading) {
    return (
      <div className="orders-page">
        <div className="orders-loading">
          <div className="spinner"></div>
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h1>My Orders</h1>
        <p>Track and manage all your service bookings</p>
      </div>

      {/* Filters */}
      <div className="orders-filters">
        <select 
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="orders-empty">
          <div className="orders-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3>No orders found</h3>
          <p>You haven't placed any orders yet. Book a service to get started!</p>
          <button className="orders-empty-btn" onClick={() => navigate('/booking')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Book a Service
          </button>
        </div>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map((order) => (
            <div 
              key={order._id} 
              className="order-card"
              onClick={() => openJobCard(order._id)}
            >
              <div className="order-card-header">
                <span className="order-number">#{order.orderCode || order._id.slice(-8).toUpperCase()}</span>
                <span className="order-date">{formatDate(getScheduledDate(order))}</span>
              </div>
              
              <div className="order-service">{getServiceName(order)}</div>
              
              <div className="order-info-row">
                <div className="order-info-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  {getTimeSlot(order)}
                </div>
                {getTechnicianName(order) && (
                  <div className="order-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {getTechnicianName(order)}
                  </div>
                )}
              </div>

              <div className="order-card-footer">
                <span className="order-amount">{formatCurrency(order.estimatedCost)}</span>
                <span className={getStatusClass(order.status)}>{order.status?.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Job Card Modal */}
      {(selectedOrder || modalLoading) && (
        <div className="modal-overlay" onClick={closeJobCard}>
          <div className="job-card-modal" onClick={(e) => e.stopPropagation()}>
            {modalLoading ? (
              <div className="orders-loading" style={{ padding: '4rem' }}>
                <div className="spinner"></div>
                <p>Loading job card...</p>
              </div>
            ) : selectedOrder && (
              <>
                {/* Modal Header */}
                <div className="job-card-header">
                  <div className="job-card-title">
                    <h2>Job Card</h2>
                    <span className="job-card-id">#{selectedOrder.orderCode || selectedOrder._id?.slice(-8).toUpperCase()}</span>
                    <span className={getStatusClass(selectedOrder.status)}>
                      {selectedOrder.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <button className="job-card-close" onClick={closeJobCard}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Content */}
                <div className="job-card-content">
                  <div className="job-card-grid">
                    
                    {/* Column 1 */}
                    <div className="job-card-column">
                      {/* Customer & Property Section */}
                      <div className="section-card">
                        <div className="section-header">
                          <span className="section-title">Customer & Property</span>
                        </div>
                        <div className="customer-info">
                          <div className="customer-name">{selectedOrder.customer?.name || 'Customer'}</div>
                          <div className="customer-detail">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {selectedOrder.customer?.phone || 'N/A'}
                          </div>
                          {selectedOrder.customerAddress && (
                            <div className="property-address">
                              <div>{selectedOrder.customerAddress.line1}</div>
                              {selectedOrder.customerAddress.line2 && <div>{selectedOrder.customerAddress.line2}</div>}
                              {selectedOrder.customerAddress.landmark && <div>Near: {selectedOrder.customerAddress.landmark}</div>}
                              <div>
                                {[selectedOrder.customerAddress.city, selectedOrder.customerAddress.state, selectedOrder.customerAddress.postalCode]
                                  .filter(Boolean).join(', ')}
                              </div>
                              <span className="property-type">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                                {selectedOrder.customerAddress.label || 'Address'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Documents & Photos Section */}
                      <div className="section-card">
                        <div className="section-header">
                          <span className="section-title">Documents & Photos</span>
                        </div>
                        {getAllImages().length > 0 ? (
                          <div className="photos-grid">
                            {getAllImages().map((img, idx) => (
                              <div 
                                key={idx} 
                                className="photo-item"
                                onClick={() => {
                                  setCurrentImageIndex(idx);
                                  setImageViewerOpen(true);
                                }}
                              >
                                <img src={img.url} alt={img.type} />
                                <div className="photo-item-overlay">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                  </svg>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="photos-empty">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                            <p>No photos available</p>
                          </div>
                        )}
                      </div>

                      {/* Customer Rating Section */}
                      <div className="section-card">
                        <div className="section-header">
                          <span className="section-title">Customer Rating</span>
                        </div>
                        {selectedOrder.customerExperience ? (
                          <div className="rating-display">
                            <div className="rating-stars">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg 
                                  key={star} 
                                  className={`star-icon ${star <= selectedOrder.customerExperience!.rating ? '' : 'empty'}`}
                                  viewBox="0 0 24 24" 
                                  fill={star <= selectedOrder.customerExperience!.rating ? 'currentColor' : 'none'}
                                  stroke="currentColor" 
                                  strokeWidth="2"
                                >
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              ))}
                            </div>
                            <span className="rating-value">{selectedOrder.customerExperience.rating}/5</span>
                            {selectedOrder.customerExperience.comment && (
                              <p className="rating-comment">"{selectedOrder.customerExperience.comment}"</p>
                            )}
                          </div>
                        ) : (
                          <div className="no-rating">
                            {selectedOrder.status === 'completed' 
                              ? 'No rating provided yet' 
                              : 'Rating available after job completion'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 2 */}
                    <div className="job-card-column">
                      {/* Service Details Section */}
                      <div className="section-card">
                        <div className="section-header">
                          <span className="section-title">Service Details</span>
                        </div>
                        <div className="service-info">
                          <div className="service-main">
                            <div className="service-icon">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                              </svg>
                            </div>
                            <div className="service-details">
                              <h4>{getServiceName(selectedOrder)}</h4>
                              <p>{typeof selectedOrder.serviceCategory === 'object' 
                                  ? selectedOrder.serviceCategory?.name 
                                  : selectedOrder.serviceCategory || 'Service'}</p>
                            </div>
                          </div>
                          <div className="service-specs">
                            <div className="spec-item">
                              <span className="spec-label">Estimated Cost</span>
                              <span className="spec-value">{formatCurrency(selectedOrder.estimatedCost)}</span>
                            </div>
                            <div className="spec-item">
                              <span className="spec-label">Duration</span>
                              <span className="spec-value">
                                {typeof selectedOrder.serviceItem === 'object' && 'durationMinutes' in selectedOrder.serviceItem && selectedOrder.serviceItem.durationMinutes 
                                  ? `${selectedOrder.serviceItem.durationMinutes} mins` 
                                  : '1-2 hours'}
                              </span>
                            </div>
                          </div>
                          {selectedOrder.issueDescription && (
                            <div className="service-issue">
                              <span className="spec-label">Issue Description</span>
                              <p className="issue-text">{selectedOrder.issueDescription}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Customer Approval Section */}
                      {(additionalApproval || selectedOrder.customerApproval) && 
                       (additionalApproval?.status !== 'not_required' || selectedOrder.customerApproval?.status !== 'not_required') && (
                        <div className="section-card">
                          <div className="section-header">
                            <span className="section-title">Additional Items Approval</span>
                          </div>
                          <div className="approvals-list">
                            <div className="approval-status-row" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span className={`approval-status ${(additionalApproval || selectedOrder.customerApproval)?.status}`}>
                                {(additionalApproval || selectedOrder.customerApproval)?.status}
                              </span>
                              {additionalApproval?.status === 'pending' && (
                                <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>⚠️ Action Required</span>
                              )}
                            </div>
                            {(additionalApproval || selectedOrder.customerApproval)?.requestedItems?.map((item, idx) => (
                              <div key={idx} className="approval-item">
                                <div className="approval-header">
                                  <span className="approval-type">{item.label}</span>
                                </div>
                                <div className="approval-amount">{formatCurrency(item.amount)}</div>
                                {item.rationale && (
                                  <div className="approval-description">{item.rationale}</div>
                                )}
                              </div>
                            ))}
                            {/* Inline approval buttons for pending items */}
                            {additionalApproval?.status === 'pending' && (
                              <div className="approval-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <button 
                                  className="approval-btn approve"
                                  onClick={() => handleApprovalAction('approve')}
                                  disabled={approvalLoading}
                                  style={{
                                    flex: 1,
                                    padding: '0.625rem 1rem',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    opacity: approvalLoading ? 0.6 : 1
                                  }}
                                >
                                  {approvalLoading ? 'Processing...' : '✓ Approve'}
                                </button>
                                <button 
                                  className="approval-btn reject"
                                  onClick={() => handleApprovalAction('reject')}
                                  disabled={approvalLoading}
                                  style={{
                                    flex: 1,
                                    padding: '0.625rem 1rem',
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    borderRadius: '0.5rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    opacity: approvalLoading ? 0.6 : 1
                                  }}
                                >
                                  {approvalLoading ? 'Processing...' : '✕ Reject'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Activity Tracking */}
                      <div className="section-card">
                        <div className="section-header">
                          <span className="section-title">Activity Tracking</span>
                        </div>
                        <div className="activity-timeline">
                          {selectedOrder.history && selectedOrder.history.length > 0 ? (
                            selectedOrder.history.map((activity, idx) => (
                              <div key={idx} className="activity-item">
                                <div className={`activity-dot ${activity.action?.toLowerCase()}`}></div>
                                <div className="activity-content">
                                  <div className="activity-title">{activity.action?.replace('_', ' ')}</div>
                                  <div className="activity-time">{formatDateTime(activity.createdAt)}</div>
                                  {activity.message && (
                                    <div className="activity-note">{activity.message}</div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="activity-item">
                              <div className="activity-dot created"></div>
                              <div className="activity-content">
                                <div className="activity-title">Order Created</div>
                                <div className="activity-time">{formatDateTime(selectedOrder.createdAt)}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column 3 */}
                    <div className="job-card-column">
                      {/* Technician Info */}
                      <div className="section-card">
                        <div className="section-header">
                          <span className="section-title">Assigned Technician</span>
                        </div>
                        {selectedOrder.assignedTechnician ? (
                          <div className="technician-card">
                            <div className="technician-avatar">
                              {selectedOrder.assignedTechnician.name?.charAt(0).toUpperCase() || 'T'}
                            </div>
                            <div className="technician-info">
                              <div className="technician-name">{selectedOrder.assignedTechnician.name}</div>
                              {selectedOrder.assignedTechnician.mobile && (
                                <div className="technician-contact">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  {selectedOrder.assignedTechnician.mobile}
                                </div>
                              )}
                              {selectedOrder.assignedTechnician.email && (
                                <div className="technician-contact">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  {selectedOrder.assignedTechnician.email}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="no-technician">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '0.5rem', opacity: 0.5 }}>
                              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            <p>No technician assigned yet</p>
                          </div>
                        )}
                      </div>

                      {/* Technician Tracking */}
                      {selectedOrder.technicianTracking && (
                        <div className="section-card">
                          <div className="section-header">
                            <span className="section-title">Technician Tracking</span>
                          </div>
                          <div className="checkins-list">
                            {selectedOrder.technicianTracking.lastCheckInAt && (
                              <div className="checkin-item">
                                <span className="checkin-type in">📍 Last Check-in</span>
                                <span className="checkin-time">{formatDateTime(selectedOrder.technicianTracking.lastCheckInAt)}</span>
                              </div>
                            )}
                            {selectedOrder.technicianTracking.note && (
                              <div className="activity-note" style={{ marginTop: '0.5rem' }}>
                                {selectedOrder.technicianTracking.note}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Job Status */}
                      <div className="section-card">
                        <div className="section-header">
                          <span className="section-title">Job Status</span>
                        </div>
                        <div className="status-section">
                          <div className="status-row">
                            <span className="status-label">Current Status</span>
                            <span className={getStatusClass(selectedOrder.status)}>
                              {selectedOrder.status?.replace('_', ' ')}
                            </span>
                          </div>
                          {invoice?.payment && (
                            <>
                              <div className="status-row">
                                <span className="status-label">Payment Status</span>
                                <span className={getPaymentStatusClass(invoice.payment.status)}>
                                  {invoice.payment.status}
                                </span>
                              </div>
                              <div className="status-row">
                                <span className="status-label">Payment Method</span>
                                <span className="status-value" style={{ textTransform: 'uppercase' }}>
                                  {invoice.payment.method}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Schedule */}
                      <div className="section-card">
                        <div className="section-header">
                          <span className="section-title">Schedule</span>
                        </div>
                        <div className="schedule-info">
                          <div className="schedule-item">
                            <div className="schedule-icon">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                            </div>
                            <div className="schedule-details">
                              <span className="schedule-label">Scheduled Date</span>
                              <span className="schedule-value">{formatDate(getScheduledDate(selectedOrder))}</span>
                            </div>
                          </div>
                          <div className="schedule-item">
                            <div className="schedule-icon">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v6l4 2" />
                              </svg>
                            </div>
                            <div className="schedule-details">
                              <span className="schedule-label">Time Slot</span>
                              <span className="schedule-value">{getTimeSlot(selectedOrder)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Cost Summary */}
                      <div className="section-card">
                        <div className="section-header">
                          <span className="section-title">Cost Summary</span>
                        </div>
                        
                        <div className="cost-summary">
                          {(invoice?.totals?.estimate || selectedOrder.estimatedCost) && (
                            <div className="cost-row">
                              <span className="cost-label">Estimated Cost</span>
                              <span className="cost-value">{formatCurrency(invoice?.totals?.estimate || selectedOrder.estimatedCost)}</span>
                            </div>
                          )}
                          {invoice?.totals?.additional && invoice.totals.additional > 0 && (
                            <div className="cost-row">
                              <span className="cost-label">Additional Charges</span>
                              <span className="cost-value">{formatCurrency(invoice.totals.additional)}</span>
                            </div>
                          )}
                          <div className="cost-row total">
                            <span className="cost-label">Total Amount</span>
                            <span className="cost-value">{formatCurrency(invoice?.totals?.final || selectedOrder.estimatedCost)}</span>
                          </div>
                          {invoice?.payment && (
                            <>
                              <div className="cost-row">
                                <span className="cost-label">Amount Paid</span>
                                <span className="cost-value" style={{ color: '#10b981' }}>
                                  {formatCurrency(invoice.payment.amount)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Additional Services from JobCard */}
                      {invoice?.jobCard?.additionalItems && invoice.jobCard.additionalItems.length > 0 && (
                        <div className="section-card">
                          <div className="section-header">
                            <span className="section-title">Additional Services & Parts</span>
                          </div>
                          <div className="additional-items-list">
                            {/* Extra Work / Services */}
                            {invoice.jobCard.additionalItems.filter(i => i.type === 'extra_work').length > 0 && (
                              <div className="items-category">
                                <div className="items-category-header">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                                  </svg>
                                  <span>Extra Services</span>
                                </div>
                                {invoice.jobCard.additionalItems.filter(i => i.type === 'extra_work').map((item, idx) => (
                                  <div key={`extra-${idx}`} className="additional-item">
                                    <div className="additional-item-header">
                                      <span className="item-type-badge extra_work">🔧 Service</span>
                                      <span className="item-amount">{formatCurrency(item.amount)}</span>
                                    </div>
                                    <div className="item-label">{item.label}</div>
                                    {item.description && (
                                      <div className="item-description">{item.description}</div>
                                    )}
                                    {item.category && (
                                      <div className="item-meta">Category: {item.category}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Spare Parts */}
                            {invoice.jobCard.additionalItems.filter(i => i.type === 'spare_part').length > 0 && (
                              <div className="items-category">
                                <div className="items-category-header">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                                  </svg>
                                  <span>Spare Parts Used</span>
                                </div>
                                {invoice.jobCard.additionalItems.filter(i => i.type === 'spare_part').map((item, idx) => (
                                  <div key={`part-${idx}`} className="additional-item spare-part">
                                    <div className="additional-item-header">
                                      <span className="item-type-badge spare_part">🔩 Part</span>
                                      <span className="item-amount">{formatCurrency(item.amount)}</span>
                                    </div>
                                    <div className="item-label">{item.label}</div>
                                    <div className="spare-part-details">
                                      {item.quantity && item.unitPrice && (
                                        <span className="detail-item">
                                          <strong>Qty:</strong> {item.quantity} × {formatCurrency(item.unitPrice)}
                                        </span>
                                      )}
                                      {item.partNumber && (
                                        <span className="detail-item">
                                          <strong>Part #:</strong> {item.partNumber}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Total Additional Charges */}
                            <div className="additional-items-total">
                              <span>Total Additional Charges</span>
                              <span className="total-amount">
                                {formatCurrency(invoice.jobCard.additionalItems.reduce((sum, item) => sum + (item.amount || 0), 0))}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Show message if no additional items but jobCard exists */}
                      {invoice?.jobCard && (!invoice.jobCard.additionalItems || invoice.jobCard.additionalItems.length === 0) && (
                        <div className="section-card">
                          <div className="section-header">
                            <span className="section-title">Additional Services & Parts</span>
                          </div>
                          <div className="empty-state">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '0.5rem', opacity: 0.4 }}>
                              <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                            </svg>
                            <p>No additional services or spare parts</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="job-card-actions">
                  {/* Pending Approval Actions */}
                  {additionalApproval?.status === 'pending' && (
                    <>
                      <button 
                        className="action-btn action-btn-primary"
                        onClick={() => handleApprovalAction('approve')}
                        disabled={approvalLoading}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        {approvalLoading ? 'Processing...' : 'Approve Additional Items'}
                      </button>
                      <button 
                        className="action-btn action-btn-danger"
                        onClick={() => handleApprovalAction('reject')}
                        disabled={approvalLoading}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M15 9l-6 6M9 9l6 6" />
                        </svg>
                        {approvalLoading ? 'Processing...' : 'Reject'}
                      </button>
                    </>
                  )}
                  
                  {selectedOrder.status === 'completed' && !selectedOrder.customerExperience && (
                    <button 
                      className="action-btn action-btn-primary"
                      onClick={() => setShowRatingModal(true)}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      Rate Service
                    </button>
                  )}
                  {invoice && (
                    <button className="action-btn action-btn-secondary">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                      </svg>
                      Download Invoice
                    </button>
                  )}
                  {['pending', 'confirmed'].includes(selectedOrder.status || '') && (
                    <button 
                      className="action-btn action-btn-danger"
                      onClick={() => setShowCancelModal(true)}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M15 9l-6 6M9 9l6 6" />
                      </svg>
                      Cancel Order
                    </button>
                  )}
                  <button className="action-btn action-btn-secondary" onClick={closeJobCard}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rating-modal-header">
              <h3>Rate Your Experience</h3>
              <button className="job-card-close" onClick={() => setShowRatingModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="rating-modal-content">
              <p>How was your service experience?</p>
              <div className="rating-stars-input">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-btn ${star <= ratingValue ? 'active' : ''}`}
                    onClick={() => setRatingValue(star)}
                  >
                    <svg viewBox="0 0 24 24" fill={star <= ratingValue ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                ))}
              </div>
              <textarea
                className="rating-comment-input"
                placeholder="Share your feedback (optional)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                rows={4}
              />
            </div>
            <div className="rating-modal-actions">
              <button 
                className="action-btn action-btn-secondary" 
                onClick={() => setShowRatingModal(false)}
              >
                Cancel
              </button>
              <button 
                className="action-btn action-btn-primary"
                onClick={handleSubmitRating}
                disabled={ratingValue === 0 || ratingLoading}
              >
                {ratingLoading ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cancel-modal-header">
              <h3>Cancel Order</h3>
              <button className="job-card-close" onClick={() => setShowCancelModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="cancel-modal-content">
              <div className="cancel-warning">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
                </svg>
                <p>Are you sure you want to cancel this order?</p>
                <span>This action cannot be undone.</span>
              </div>
              <textarea
                className="cancel-reason-input"
                placeholder="Reason for cancellation (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="cancel-modal-actions">
              <button 
                className="action-btn action-btn-secondary" 
                onClick={() => setShowCancelModal(false)}
              >
                Keep Order
              </button>
              <button 
                className="action-btn action-btn-danger"
                onClick={handleCancelOrder}
                disabled={cancelLoading}
              >
                {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {imageViewerOpen && getAllImages().length > 0 && (
        <div className="image-viewer-overlay" onClick={() => setImageViewerOpen(false)}>
          <button className="image-viewer-close" onClick={() => setImageViewerOpen(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          
          {currentImageIndex > 0 && (
            <button 
              className="image-viewer-nav prev"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex(prev => prev - 1);
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          
          <div className="image-viewer-content" onClick={(e) => e.stopPropagation()}>
            <img src={getAllImages()[currentImageIndex]?.url} alt="Preview" />
          </div>
          
          {currentImageIndex < getAllImages().length - 1 && (
            <button 
              className="image-viewer-nav next"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex(prev => prev + 1);
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
