import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button, TextField } from '../../components/ui';
import { customerApi } from '../../services/customer-api';
import { useCustomerSession } from '../../hooks/useCustomerSession';
import { getErrorMessage } from '../../utils/error';
import styles from './Auth.module.css';

const registerSchema = z.object({
  name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(8, 'Phone number is required'),
  password: z.string().min(6, 'Password must be 6+ characters')
});

type RegisterForm = z.infer<typeof registerSchema>;

export const RegisterPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { login } = useCustomerSession();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema)
  });

  const mutation = useMutation({
    mutationFn: customerApi.register,
    onSuccess: (data) => {
      login(data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      navigate('/dashboard');
    }
  });

  const onSubmit = (values: RegisterForm) => mutation.mutate(values);

  return (
    <div className={styles.authLayout}>
      <div className={styles.hero}>
        <p className={styles.subtitle}>Premium onboarding</p>
        <h1>Set up your client access in minutes.</h1>
        <p>Register to book visits faster, approve work instantly, and keep payments in one secure place.</p>
      </div>
      <section className={styles.panel}>
        <div>
          <h2>Create your client account</h2>
          <p className={styles.subtitle}>We’ll send confirmations to your email and mobile.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <TextField label="Full name" placeholder="Aarav Patel" error={errors.name?.message} {...register('name')} />
          <TextField label="Work email" placeholder="name@company.com" error={errors.email?.message} {...register('email')} />
          <TextField label="Phone" placeholder="+91 98765 98765" error={errors.phone?.message} {...register('phone')} />
          <TextField label="Create password" type="password" error={errors.password?.message} {...register('password')} />
          {mutation.isError && <p className={styles.subtitle}>{getErrorMessage(mutation.error, 'Could not create account')}</p>}
          <Button type="submit" loading={mutation.isPending} fullWidth>
            Create account
          </Button>
        </form>

        <p className={styles.formFooter}>
          Already have access?{' '}
          <Link className={styles.switchLink} to="/auth/login">
            Sign in
          </Link>
        </p>
      </section>
    </div>
  );
};
