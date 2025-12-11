import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock3, CreditCard, MapPin } from 'lucide-react';
import { PageHeader } from '../../components/layout';
import { Button, Card, EmptyState, Loader, StatCard, StatusBadge } from '../../components/ui';
import { customerApi } from '../../services/customer-api';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import styles from './DashboardPage.module.css';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', 'all'],
    queryFn: () => customerApi.listOrders()
  });

  const upcoming = useMemo(() => orders?.filter((order) => order.status !== 'completed').slice(0, 3) ?? [], [orders]);
  const completedCount = orders?.filter((order) => order.status === 'completed').length ?? 0;

  const stats = [
    {
      label: 'Active bookings',
      value: String(upcoming.length),
      trend: 'Next 7 days',
      accent: 'brand' as const,
      icon: <CalendarDays size={24} />
    },
    {
      label: 'Lifetime jobs',
      value: String(orders?.length ?? 0),
      trend: `${completedCount} completed`,
      accent: 'teal' as const,
      icon: <Clock3 size={24} />
    },
    {
      label: 'Total spend',
      value: formatCurrency(
        orders?.reduce((sum, order) => sum + (order.estimatedCost || 0), 0) ?? 0
      ),
      trend: 'Estimate basis',
      accent: 'amber' as const,
      icon: <CreditCard size={24} />
    }
  ];

  if (isLoading) {
    return <Loader fullscreen label="Preparing your dashboard" />;
  }

  return (
    <div>
      <PageHeader
        title="Client command center"
        subtitle="Monitor technicians, approvals, and payments without chasing WhatsApp threads."
        actions={<Button onClick={() => navigate('/booking')}>Book a service</Button>}
      />

      <div className={styles.statsGrid}>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <Card elevated header={<h3>Upcoming visits</h3>}>
        {upcoming.length === 0 && (
          <EmptyState
            title="No upcoming slots"
            description="You have no scheduled jobs. Book a concierge visit in under 2 minutes."
            action={<Button onClick={() => navigate('/booking')}>Schedule service</Button>}
          />
        )}

        <div className={styles.orderList}>
          {upcoming.map((order) => (
            <button
              key={order._id}
              type="button"
              className={styles.orderCard}
              onClick={() => navigate(`/orders/${order._id}`)}
            >
              <div className={styles.orderHeader}>
                <div>
                  <p className={styles.orderTitle}>{order.serviceItem?.name ?? 'Service'}</p>
                  <p className={styles.orderMeta}>{order.issueDescription}</p>
                </div>
                <StatusBadge label={order.status.replaceAll('_', ' ')} tone="info" />
              </div>

              <div className={styles.orderBody}>
                <div>
                  <p className={styles.orderHint}>Appointment</p>
                  <p className={styles.orderValue}>{formatDateTime(order.scheduledAt)}</p>
                </div>
                <div>
                  <p className={styles.orderHint}>Technician</p>
                  <p className={styles.orderValue}>{order.assignedTechnician?.name ?? 'TBD'}</p>
                </div>
                <div>
                  <p className={styles.orderHint}>Estimate</p>
                  <p className={styles.orderValue}>{formatCurrency(order.estimatedCost)}</p>
                </div>
              </div>

              <p className={styles.orderAddress}>
                <MapPin size={16} /> {order.customerAddress?.line1}
              </p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};
