import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '../../components/layout';
import { Button, Card, Loader, SelectField, TextField } from '../../components/ui';
import { customerApi } from '../../services/customer-api';
import { formatCurrency } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/error';
import styles from './PaymentsPage.module.css';

const paymentSchema = z.object({
  orderId: z.string().min(1, 'Select order'),
  amount: z.coerce.number().min(100, 'Enter amount'),
  method: z.enum(['cash', 'upi'])
});

type PaymentForm = z.infer<typeof paymentSchema>;

export const PaymentsPage = () => {
  const [params] = useSearchParams();
  const defaultOrderId = params.get('orderId') ?? '';
  const [activePaymentId, setActivePaymentId] = useState('');
  const [transactionRef, setTransactionRef] = useState('');

  const ordersQuery = useQuery({
    queryKey: ['orders', 'payments'],
    queryFn: () => customerApi.listOrders()
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      orderId: defaultOrderId,
      method: 'upi'
    }
  });

  const initMutation = useMutation({
    mutationFn: customerApi.initializePayment,
    onSuccess: (payment) => setActivePaymentId(payment._id)
  });

  const confirmMutation = useMutation({
    mutationFn: customerApi.confirmPayment,
    onSuccess: () => {
      setTransactionRef('');
      setActivePaymentId('');
    }
  });

  if (ordersQuery.isLoading || !ordersQuery.data) {
    return <Loader fullscreen label="Loading payments" />;
  }

  const outstandingOrders = ordersQuery.data.filter((order) => order.status !== 'completed');

  const qrPayload = typeof initMutation.data?.metadata?.qrPayload === 'string' ? initMutation.data.metadata.qrPayload : '';

  return (
    <div>
      <PageHeader title="Payments" subtitle="Securely release payments for completed visits." />

      <div className={styles.layout}>
        <Card elevated header={<h3>Initiate payment</h3>}>
          <form className={styles.form} onSubmit={handleSubmit((values) => initMutation.mutate(values))}>
            <SelectField
              label="Order"
              error={errors.orderId?.message}
              options={[
                { label: 'Select order', value: '' },
                ...ordersQuery.data.map((order) => ({
                  value: order._id,
                  label: `${order.serviceItem?.name} · ${formatCurrency(order.estimatedCost)}`
                }))
              ]}
              {...register('orderId')}
            />
            <TextField label="Amount" type="number" error={errors.amount?.message} {...register('amount')} />
            <SelectField
              label="Method"
              error={errors.method?.message}
              options={[
                { label: 'UPI', value: 'upi' },
                { label: 'Cash', value: 'cash' }
              ]}
              {...register('method')}
            />
            {initMutation.isError && <p className={styles.error}>{getErrorMessage(initMutation.error)}</p>}
            <Button type="submit" loading={initMutation.isPending}>
              Create payment request
            </Button>
          </form>
        </Card>

        {activePaymentId && qrPayload && (
          <Card elevated header={<h3>UPI QR</h3>}>
            <p className={styles.meta}>Scan via any UPI app</p>
            <div className={styles.qrBox}>{qrPayload}</div>
          </Card>
        )}

        <Card elevated header={<h3>Confirm payment</h3>}>
          <div className={styles.form}>
            <TextField label="Payment ID" value={activePaymentId} readOnly />
            <TextField label="Transaction reference" value={transactionRef} onChange={(event) => setTransactionRef(event.target.value)} />
            {confirmMutation.isError && <p className={styles.error}>{getErrorMessage(confirmMutation.error)}</p>}
            <Button
              type="button"
              variant="secondary"
              loading={confirmMutation.isPending}
              disabled={!activePaymentId || !transactionRef}
              onClick={() =>
                confirmMutation.mutate({
                  paymentId: activePaymentId,
                  transactionRef
                })
              }
            >
              Confirm payment
            </Button>
          </div>
        </Card>

        <Card header={<h3>Open orders</h3>}>
          {outstandingOrders.length === 0 ? (
            <p className={styles.meta}>All payments settled.</p>
          ) : (
            outstandingOrders.map((order) => (
              <div key={order._id} className={styles.orderRow}>
                <div>
                  <p className={styles.orderTitle}>{order.serviceItem?.name}</p>
                  <p className={styles.meta}>{formatCurrency(order.estimatedCost)}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setValue('orderId', order._id);
                    if (order.estimatedCost) {
                      setValue('amount', Number(order.estimatedCost));
                    }
                    setActivePaymentId('');
                  }}
                >
                  Pay
                </Button>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
};
