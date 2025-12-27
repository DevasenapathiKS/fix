import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Star, User } from 'lucide-react';
import { PageHeader } from '../../components/layout';
import { Button, Card, Loader, StatusBadge, TextField, Timeline } from '../../components/ui';
import { customerApi } from '../../services/customer-api';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/error';
import styles from './OrderDetailPage.module.css';

export const OrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  if (!orderId) return null;

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => customerApi.getOrder(orderId)
  });

  const approvalQuery = useQuery({
    queryKey: ['order', orderId, 'approval'],
    queryFn: () => customerApi.getAdditionalItems(orderId)
  });

  const invoiceQuery = useQuery({
    queryKey: ['invoice', orderId],
    queryFn: () => customerApi.getInvoice(orderId)
  });

  const technicianStatusQuery = useQuery({
    queryKey: ['order', orderId, 'technician'],
    queryFn: () => customerApi.getTechnicianStatus(orderId)
  });

  const approveMutation = useMutation({
    mutationFn: () => customerApi.approveAdditionalItems(orderId, 'Approved via portal'),
    onSuccess: () => {
      approvalQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: () => customerApi.rejectAdditionalItems(orderId, 'Rejected via portal'),
    onSuccess: () => {
      approvalQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    }
  });

  const ratingMutation = useMutation({
    mutationFn: () => customerApi.rateOrder(orderId, { rating, comment }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', orderId] })
  });

  if (orderQuery.isLoading) {
    return <Loader fullscreen label="Fetching order" />;
  }

  const order = orderQuery.data;
  const approval = approvalQuery.data;
  const invoice = invoiceQuery.data;

  if (!order) return null;

  return (
    <div>
      <PageHeader
        title={order.serviceItem?.name ?? 'Order detail'}
        subtitle={`Order #${order._id} · Live status, approvals, and invoice in one place.`}
        actions={<Button onClick={() => navigate('/orders')}>Back to orders</Button>}
      />

      <div className={styles.layout}>
        <Card elevated>
          <div className={styles.statusRow}>
            <div>
              <p className={styles.label}>Status</p>
              <StatusBadge label={order.status.replaceAll('_', ' ')} tone="info" />
            </div>
            <div>
              <p className={styles.label}>Scheduled</p>
              <p className={styles.value}>{formatDateTime(order.scheduledAt)}</p>
            </div>
          </div>
          <div className={styles.statusRow}>
            <div>
              <p className={styles.label}>Estimated cost</p>
              <p className={styles.value}>{formatCurrency(order.estimatedCost)}</p>
            </div>
            <div>
              <p className={styles.label}>Address</p>
              <p className={styles.value}>{order.customerAddress?.line1}</p>
            </div>
          </div>
        </Card>

        <Card header={<h3>Technician</h3>}>
          <div className={styles.techRow}>
            <User size={32} />
            <div>
              <p className={styles.value}>{order.assignedTechnician?.name ?? 'Awaiting assignment'}</p>
              <p className={styles.label}>{order.assignedTechnician?.mobile ?? '—'}</p>
            </div>
          </div>
          {technicianStatusQuery.data?.lastCheckInAt && (
            <p className={styles.label}>Last check-in · {formatDateTime(technicianStatusQuery.data.lastCheckInAt)}</p>
          )}
          <Button variant="ghost" icon={<Phone size={16} />} disabled={!order.assignedTechnician}>
            Contact crew
          </Button>
        </Card>

        <Card header={<h3>Approvals</h3>}>
          {!approval || approval.status === 'not_required' ? (
            <p className={styles.label}>No pending approvals</p>
          ) : (
            <div>
              <p className={styles.value}>{approval.requestedItems?.[0]?.label}</p>
              <p className={styles.label}>{formatCurrency(approval.requestedItems?.[0]?.amount)}</p>
              {approval.status === 'pending' && (
                <div className={styles.approvalButtons}>
                  <Button
                    variant="secondary"
                    loading={approveMutation.isPending}
                    onClick={() => approveMutation.mutate()}
                  >
                    Approve
                  </Button>
                  <Button variant="ghost" loading={rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>
                    Reject
                  </Button>
                </div>
              )}
              {(approveMutation.isError || rejectMutation.isError) && (
                <p className={styles.error}>
                  {getErrorMessage(approveMutation.error || rejectMutation.error)}
                </p>
              )}
            </div>
          )}
        </Card>

        <Card header={<h3>Timeline</h3>}>
          {order.history && order.history.length > 0 ? <Timeline items={order.history} /> : <p>No history logged.</p>}
        </Card>

        <Card header={<h3>Invoice summary</h3>}>
          <div className={styles.invoiceRow}>
            <span>Estimate</span>
            <strong>{formatCurrency(invoice?.totals.estimate)}</strong>
          </div>
          <div className={styles.invoiceRow}>
            <span>Additions</span>
            <strong>{formatCurrency(invoice?.totals.additional)}</strong>
          </div>
          <div className={styles.invoiceRow}>
            <span>Final</span>
            <strong>{formatCurrency(invoice?.totals.final)}</strong>
          </div>
          <Button variant="secondary" onClick={() => navigate(`/payments?orderId=${order._id}`)}>
            View payment options
          </Button>
        </Card>

        <Card header={<h3>Rate this service</h3>}>
          {order.customerExperience ? (
            <div className={styles.reviewBlock}>
              <p className={styles.value}>{order.customerExperience.rating} / 5</p>
              <p className={styles.label}>{order.customerExperience.comment}</p>
            </div>
          ) : (
            <form
              className={styles.reviewForm}
              onSubmit={(event) => {
                event.preventDefault();
                ratingMutation.mutate();
              }}
            >
              <label className={styles.label}>
                Rating
                <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <TextField label="Feedback" multiline value={comment} onChange={(event) => setComment(event.target.value)} />
              <Button type="submit" loading={ratingMutation.isPending} icon={<Star size={16} />}>
                Submit rating
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
