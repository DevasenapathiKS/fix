import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customerApi, type LoginPayload } from '../../services/customerApi';
import { useAuthStore, type AuthState } from '../../store/authStore';
import { toast } from '../../Components/Toast/Toast';
import './auth.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((state: AuthState) => state.login);
  const [form, setForm] = useState<LoginPayload>({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.identifier || !form.password) {
      setError('Please enter both identifier and password.');
      toast.warning('Please fill in all fields');
      return;
    }
    try {
      setLoading(true);
      const data = await customerApi.login(form);
      loginStore(data);
      setSuccess('Logged in successfully. Redirecting...');
      toast.success('Welcome back!');
      setTimeout(() => navigate('/'), 400);
    } catch (err) {
      setError('Login failed. Please check your credentials.');
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page">
      <div className="auth-shell">
        <h1>Welcome back</h1>
        <p>Access your Fixzep account to book and track services.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Identifier (email or phone)
            <input
              value={form.identifier}
              onChange={(event) => setForm({ ...form, identifier: event.target.value })}
              placeholder="you@example.com or 9876543210"
              autoComplete="username"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </label>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>

          <div className="form-footer">
            <span>New here?</span>
            <Link to="/register">Create an account</Link>
          </div>
        </form>
      </div>
    </section>
  );
}
