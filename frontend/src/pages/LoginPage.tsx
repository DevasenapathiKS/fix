import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { LoginPayload } from '../types';

const defaultValues: LoginPayload = {
  email: '',
  password: '',
  role: 'admin'
};

export const LoginPage = () => {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<LoginPayload>({ defaultValues });
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (values: LoginPayload) => {
    await login(values);
    navigate('/', { replace: true });
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/5 bg-white/10 p-8 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.5em] text-white/70">Fixzep</p>
        <h1 className="mt-4 text-3xl font-bold text-white">Admin Control Login</h1>
        <p className="mt-2 text-sm text-white/70">Use your admin credentials to access mission control.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <Input
            type="email"
            label="Email"
            placeholder="admin@fixzep.com"
            {...register('email', { required: true })}
            className="bg-white/90"
          />
          <Input
            type="password"
            label="Password"
            placeholder="••••••••"
            {...register('password', { required: true })}
            className="bg-white/90"
          />
          <Button type="submit" loading={isSubmitting} className="w-full justify-center text-base">
            Enter Dashboard
          </Button>
        </form>
      </div>
    </div>
  );
};
