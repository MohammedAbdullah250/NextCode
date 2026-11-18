import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { ROLE_LABELS, type Role } from '../types';
import { hasErrors, validateAccount, type Errors } from '../validation';
import { ErrorBanner } from './ErrorBanner';
import { Field } from './Field';

const ROLE_HELP: Record<Role, string> = {
  employee: 'Adds products, updates quantities and sees expiry alerts.',
  manager: 'Everything an employee does, plus reports and removing products.',
  admin: 'Everything a manager does, plus managing accounts.',
};

export function AddUserForm({ onCreated }: { onCreated: (username: string) => void }) {
  const [form, setForm] = useState({ username: '', password: '', role: 'employee' as Role });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createAccount(e: FormEvent) {
    e.preventDefault();
    const found = validateAccount(form.username, form.password);
    setErrors(found);
    setMessage(null);
    if (hasErrors(found)) return;

    setBusy(true);
    try {
      const username = form.username.trim();
      await api('/users', { body: { ...form, username } });
      onCreated(username);
      setForm({ username: '', password: '', role: form.role });
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      setErrors(err.fields);
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel-body" onSubmit={createAccount} noValidate>
      <ErrorBanner message={message} />
      <Field label="Username" error={errors.username}>
        <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" />
      </Field>
      <Field label="Temporary password" error={errors.password} hint="At least 8 characters.">
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          autoComplete="new-password"
        />
      </Field>
      <Field label="Role" error={errors.role} hint={ROLE_HELP[form.role]}>
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Creating…' : 'Create account'}
      </button>
    </form>
  );
}
