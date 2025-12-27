import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { Calendar, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/layout';
import { Button, Card, Loader, SelectField, TextField } from '../../components/ui';
import { customerApi } from '../../services/customer-api';
import { getErrorMessage } from '../../utils/error';
import { formatDate } from '../../utils/formatters';
import styles from './BookingPage.module.css';

const bookingSchema = z.object({
  serviceCategory: z.string().min(1, 'Choose category'),
  serviceItem: z.string().min(1, 'Choose service'),
  customerAddressId: z.string().min(1, 'Select address'),
  issueDescription: z.string().min(5, 'Add short brief'),
  estimatedCost: z.coerce.number().optional()
});

type BookingForm = z.infer<typeof bookingSchema>;

export const BookingPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectServiceItem = params.get('serviceItem') ?? '';
  const [selectedSlot, setSelectedSlot] = useState<{ label: string; start: string; end: string } | null>(null);
  const [slotError, setSlotError] = useState('');

  const { data: catalog } = useQuery({ queryKey: ['services'], queryFn: () => customerApi.listServices() });
  const { data: addresses } = useQuery({ queryKey: ['addresses'], queryFn: () => customerApi.listAddresses() });
  const { data: slots } = useQuery({ queryKey: ['timeSlots'], queryFn: () => customerApi.listTimeSlots() });

  const {
    register,
    watch,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      serviceItem: preselectServiceItem
    }
  });

  const serviceCategoryField = register('serviceCategory', {
    onChange: () => {
      setValue('serviceItem', '');
    }
  });
  const serviceField = register('serviceItem');
  const issueField = register('issueDescription');
  const addressField = register('customerAddressId');

  const selectedCategory = watch('serviceCategory');
  const selectedAddressId = watch('customerAddressId');

  const serviceCategoryOptions = useMemo(
    () =>
      catalog?.map((category) => ({
        label: category.name,
        value: category._id
      })) ?? [],
    [catalog]
  );

  const serviceOptions = useMemo(() => {
    const category = catalog?.find((cat) => cat._id === selectedCategory);
    return (
      category?.services.map((service) => ({ value: service._id, label: service.name })) ??
      catalog?.flatMap((cat) => cat.services.map((service) => ({ value: service._id, label: service.name }))) ??
      []
    );
  }, [catalog, selectedCategory]);

  useEffect(() => {
    if (addresses?.length) {
      const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
      setValue('customerAddressId', defaultAddress._id);
    }
  }, [addresses, setValue]);

  const mutation = useMutation({
    mutationFn: customerApi.placeOrder,
    onSuccess: (order) => navigate(`/orders/${order._id}`)
  });

  const handleSlotSelect = (slot: { templateId: string; label: string; start: string; end: string }) => {
    setSelectedSlot(slot);
    setSlotError('');
  };

  const onSubmit = (values: BookingForm) => {
    if (!selectedSlot) {
      setSlotError('Select your preferred slot');
      return;
    }
    mutation.mutate({
      ...values,
      preferredStart: selectedSlot.start,
      preferredEnd: selectedSlot.end,
      preferredLabel: selectedSlot.label,
      attachments: []
    });
  };

  if (!catalog || !addresses || !slots) {
    return <Loader fullscreen label="Loading booking assistant" />;
  }

  return (
    <div>
      <PageHeader
        title="Book a concierge visit"
        subtitle="Tell us the issue, pick a slot, and we’ll dispatch the right crew with live updates."
      />

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        <Card elevated header={<h3>Select service</h3>}>
          <div className={styles.fieldGrid}>
            <SelectField
              label="Service category"
              error={errors.serviceCategory?.message}
              options={[{ label: 'Select category', value: '' }, ...serviceCategoryOptions]}
              {...serviceCategoryField}
            />

            <SelectField
              label="Service"
              error={errors.serviceItem?.message}
              options={[{ label: 'Select service', value: '' }, ...serviceOptions]}
              {...serviceField}
            />
          </div>
          <TextField
            label="Describe the issue"
            placeholder="Smart door lock not responding, need same-day fix"
            multiline
            error={errors.issueDescription?.message}
            {...issueField}
          />
        </Card>

        <Card elevated header={<h3>Select address</h3>}>
          <div className={styles.addressGrid}>
            {addresses.map((address) => (
              <label
                key={address._id}
                className={clsx(styles.addressCard, {
                  [styles.addressActive]: selectedAddressId === address._id
                })}
              >
                <input
                  type="radio"
                  value={address._id}
                  checked={selectedAddressId === address._id}
                  name={addressField.name}
                  ref={addressField.ref}
                  onBlur={addressField.onBlur}
                  onChange={(event) => addressField.onChange(event)}
                />
                <div>
                  <p className={styles.addressLabel}>{address.label ?? 'Primary'}</p>
                  <p className={styles.addressMeta}>{address.line1}</p>
                  <p className={styles.addressMeta}>{address.city}</p>
                </div>
              </label>
            ))}
          </div>
          {errors.customerAddressId && <p className={styles.error}>{errors.customerAddressId.message}</p>}
        </Card>

        <Card elevated header={<h3>Pick a slot</h3>}>
          <div className={styles.slotGrid}>
            {slots.map((day) => (
              <div key={day.date} className={styles.dayColumn}>
                <p className={styles.dayLabel}>{formatDate(day.date)}</p>
                {day.slots.map((slot) => {
                  const isSelected = selectedSlot?.start === slot.start;
                  return (
                    <button
                      type="button"
                      key={slot.templateId}
                      className={isSelected ? styles.slotActive : styles.slot}
                      onClick={() => handleSlotSelect(slot)}
                    >
                      <Calendar size={14} /> {slot.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {slotError && <p className={styles.error}>{slotError}</p>}
        </Card>

        {mutation.isError && <p className={styles.error}>{getErrorMessage(mutation.error)}</p>}

        <div className={styles.summaryCard}>
          <div>
            <p className={styles.summaryTitle}>Concierge assurance</p>
            <p className={styles.summaryCopy}>
              <ShieldCheck size={16} /> Verified technicians, protected entry, live ETA tracking, and digital approvals.
            </p>
          </div>
          <Button type="submit" loading={mutation.isPending}>
            Confirm booking
          </Button>
        </div>
      </form>
    </div>
  );
};
