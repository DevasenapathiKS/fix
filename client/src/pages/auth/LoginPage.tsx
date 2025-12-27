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

const loginSchema = z.object({
  identifier: z.string().min(4, 'Enter email or phone'),
  password: z.string().min(6, 'Password is required')
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { login } = useCustomerSession();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: ''
    }
  });

  const mutation = useMutation({
    mutationFn: customerApi.login,
    onSuccess: (data) => {
      login(data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      navigate('/dashboard');
    }
  });

  const onSubmit = (values: LoginForm) => mutation.mutate(values);

  return (
    <div className={styles.authLayout}>
      <div className={styles.hero}>
        <p className={styles.subtitle}>Welcome back</p>
        <h1>Sign in to your client workspace.</h1>
        <p>
          Review visits, approvals, and payments from a single console with concierge support on standby.
        </p>
      </div>
      <section className={styles.panel}>
        <div>
          <h2>Client sign in</h2>
          <p className={styles.subtitle}>Use your registered email or phone to continue.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <TextField label="Email or phone" placeholder="riya@enterprise.com" error={errors.identifier?.message} {...register('identifier')} />
          <TextField label="Password" type="password" error={errors.password?.message} {...register('password')} />
          {mutation.isError && <p className={styles.subtitle}>{getErrorMessage(mutation.error, 'Could not sign in')}</p>}
          <Button type="submit" loading={mutation.isPending} fullWidth>
            Sign in
          </Button>
        </form>

        <p className={styles.formFooter}>
          New to Fixzep?{' '}
          <Link className={styles.switchLink} to="/auth/register">
            Create account
          </Link>
        </p>
      </section>
    </div>
  );
};
