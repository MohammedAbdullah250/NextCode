import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { ApiError } from '../api';
import { useAuth } from '../authContext';
import { AuthLayout } from '../components/AuthLayout';
import { Field } from '../components/Field';
import { ErrorBanner } from '../components/Feedback';

/** First run only: create the administrator account. */
export function SetupPage() {
  const { needsSetup, checking, setup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!checking && !needsSetup) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.username.trim().length < 3) next.username = 'Username must be at least 3 characters.';
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    setMessage(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await setup(form.username.trim(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setMessage(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <AuthLayout title="Set up your shop" subtitle="Create the administrator account first. You can add staff accounts afterwards.">
      <ErrorBanner message={message} />
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Your username" error={errors.username}>
          <input value={form.username} onChange={update('username')} autoComplete="username" autoFocus />
        </Field>
        <Field label="Password" error={errors.password} hint="At least 8 characters.">
          <input type="password" value={form.password} onChange={update('password')} autoComplete="new-password" />
        </Field>
        <Field label="Confirm password" error={errors.confirm}>
          <input type="password" value={form.confirm} onChange={update('confirm')} autoComplete="new-password" />
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Create administrator'}
        </button>
      </form>
    </AuthLayout>
  );
}
