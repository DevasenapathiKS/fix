import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customerApi, type RegisterPayload } from '../../services/customerApi';
import { useAuthStore, type AuthState } from '../../store/authStore';
import { toast } from '../../Components/Toast/Toast';
import './auth.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((state: AuthState) => state.login);
  const [form, setForm] = useState<RegisterPayload>({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.name || !form.email || !form.phone || !form.password) {
      setError('Please fill all required fields.');
      toast.warning('Please fill in all fields');
      return;
    }
    if (form.phone.length < 10) {
      setError('Please enter a valid phone number.');
      toast.warning('Invalid phone number');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      toast.warning('Password too short');
      return;
    }
    try {
      setLoading(true);
      const data = await customerApi.register(form);
      loginStore(data);
      setSuccess('Account created. Redirecting...');
      toast.success('Account created successfully!');
      setTimeout(() => navigate('/'), 400);
    } catch (err) {
      setError('Registration failed. Please try again.');
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page">
      <div className="auth-shell">
        <h1>Create your account</h1>
        <p>Book trusted technicians, manage addresses, and track orders.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Jane Doe"
              autoComplete="name"
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            Phone
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="10-digit mobile number"
              autoComplete="tel"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Create a password"
              autoComplete="new-password"
            />
          </label>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>

          <div className="form-footer">
            <span>Already have an account?</span>
            <Link to="/login">Login</Link>
          </div>
        </form>
      </div>
    </section>
  );
}