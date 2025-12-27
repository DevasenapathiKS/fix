import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, Search } from 'lucide-react';
import { PageHeader } from '../../components/layout';
import { Button, Card, EmptyState, Loader } from '../../components/ui';
import { customerApi } from '../../services/customer-api';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import styles from './OrdersPage.module.css';

const statusFilters = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' }
];

export const OrdersPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => customerApi.listOrders()
  });

  if (isLoading) {
    return <Loader fullscreen label="Loading your work orders" />;
  }

  const filtered = orders
    ?.filter((order) => {
      if (!status) return true;
      if (status === 'active') {
        return order.status !== 'completed';
      }
      if (status === 'completed') {
        return order.status === 'completed';
      }
      return true;
    })
    ?.filter((order) => order.serviceItem?.name?.toLowerCase().includes(search.toLowerCase()) ?? true);

  return (
    <div>
      <PageHeader
        title="Work orders"
        subtitle="Search every visit, approval, and payment—kept in one organized log."
        actions={<Button onClick={() => navigate('/booking')}>New booking</Button>}
      />

      <div className={styles.filterRow}>
        <div className={styles.statusGroup}>
          {statusFilters.map((filter) => (
            <button
              type="button"
              key={filter.label}
              className={filter.value === status ? styles.statusActive : styles.statusButton}
              onClick={() => setStatus(filter.value)}
            >
              <Filter size={14} /> {filter.label}
            </button>
          ))}
        </div>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input placeholder="Search service" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      {filtered && filtered.length === 0 && (
        <EmptyState
          title="No records"
          description="Try a different filter or keyword."
          action={<Button onClick={() => navigate('/booking')}>Book service</Button>}
        />
      )}

      <div className={styles.ordersGrid}>
        {filtered?.map((order) => (
          <Card
            key={order._id}
            elevated
            header={
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardTitle}>{order.serviceItem?.name}</p>
                  <p className={styles.cardMeta}>{formatDateTime(order.scheduledAt)}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/orders/${order._id}`)}>
                  View
                </Button>
              </div>
            }
          >
            <div className={styles.cardRow}>
              <span>Status</span>
              <strong>{order.status.replaceAll('_', ' ')}</strong>
            </div>
            <div className={styles.cardRow}>
              <span>Technician</span>
              <strong>{order.assignedTechnician?.name ?? 'Not assigned'}</strong>
            </div>
            <div className={styles.cardRow}>
              <span>Estimate</span>
              <strong>{formatCurrency(order.estimatedCost)}</strong>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
