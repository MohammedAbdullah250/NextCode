import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError } from '../api';
import { useAuth } from '../authContext';
import { Field } from '../components/Field';
import { ErrorBanner } from '../components/Feedback';

export function LoginPage() {
  const { user, needsSetup, login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (needsSetup) return <Navigate to="/setup" replace />;
  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!username.trim()) next.username = 'Enter your username.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    setMessage(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Login failed.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Log in to FreshTrack" subtitle="Track fresh food stock and expiry dates.">
      <ErrorBanner message={message} />
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Username" error={errors.username}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
        </Field>
        <Field label="Password" error={errors.password}>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="muted small">Forgot your password? Ask your administrator to reset it.</p>
    </AuthCard>
  );
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <section className="card auth-card">
        <div className="auth-brand">
          <img src="/favicon.svg" alt="" width={40} height={40} />
          <span>FreshTrack</span>
        </div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
      </section>
    </main>
  );
}
