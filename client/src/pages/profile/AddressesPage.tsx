import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Loader, TextField } from '../../components/ui';
import { PageHeader } from '../../components/layout';
import { customerApi } from '../../services/customer-api';
import { getErrorMessage } from '../../utils/error';
import styles from './AddressesPage.module.css';

const addressSchema = z.object({
  label: z.string().optional(),
  contactName: z.string().min(2),
  phone: z.string().min(6),
  line1: z.string().min(2),
  city: z.string().min(2),
  state: z.string().min(2),
  postalCode: z.string().min(4)
});

type AddressForm = z.infer<typeof addressSchema>;

export const AddressesPage = () => {
  const queryClient = useQueryClient();
  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => customerApi.listAddresses()
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<AddressForm>({ resolver: zodResolver(addressSchema) });

  const createMutation = useMutation({
    mutationFn: customerApi.createAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      reset();
    }
  });

  const defaultMutation = useMutation({
    mutationFn: customerApi.markPreferred,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] })
  });

  const deleteMutation = useMutation({
    mutationFn: customerApi.deleteAddress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] })
  });

  if (isLoading || !addresses) {
    return <Loader fullscreen label="Loading addresses" />;
  }

  return (
    <div>
      <PageHeader title="Service addresses" subtitle="Organize residences, offices, and guest homes." />

      <div className={styles.layout}>
        <Card elevated header={<h3>Add new address</h3>}>
          <form className={styles.form} onSubmit={handleSubmit((values) => createMutation.mutate(values))}>
            <TextField label="Label" placeholder="Penthouse" {...register('label')} />
            <TextField label="Contact name" error={errors.contactName?.message} {...register('contactName')} />
            <TextField label="Phone" error={errors.phone?.message} {...register('phone')} />
            <TextField label="Address line" error={errors.line1?.message} {...register('line1')} />
            <div className={styles.row}>
              <TextField label="City" error={errors.city?.message} {...register('city')} />
              <TextField label="State" error={errors.state?.message} {...register('state')} />
            </div>
            <TextField label="Postal" error={errors.postalCode?.message} {...register('postalCode')} />
            {createMutation.isError && <p className={styles.error}>{getErrorMessage(createMutation.error)}</p>}
            <Button type="submit" loading={createMutation.isPending}>
              Save address
            </Button>
          </form>
        </Card>

        <div className={styles.addressList}>
          {addresses.map((address) => (
            <Card key={address._id} elevated header={<h3>{address.label ?? 'Primary residence'}</h3>}>
              <p className={styles.meta}>{address.line1}</p>
              <p className={styles.meta}>
                {address.city}, {address.state} {address.postalCode}
              </p>
              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={address.isDefault}
                  loading={defaultMutation.isPending}
                  onClick={() => defaultMutation.mutate(address._id)}
                >
                  {address.isDefault ? 'Default' : 'Set default'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(address._id)}
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
