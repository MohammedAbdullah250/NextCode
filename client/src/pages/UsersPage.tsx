import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../authContext';
import { Field } from '../components/Field';
import { ErrorBanner, Loading } from '../components/Feedback';
import { formatTimestamp } from '../format';
import { ROLE_LABELS, type ManagedUser, type Role } from '../types';
import { useApi } from '../useApi';
import type { Errors } from '../validation';

const ROLE_HELP: Record<Role, string> = {
  employee: 'Add products, update quantities and view inventory.',
  manager: 'Everything an employee can do, plus reports and removing products.',
  admin: 'Everything a manager can do, plus managing user accounts.',
};

// US-08: administrators create accounts and control roles.
export function UsersPage() {
  const { user: me } = useAuth();
  const { data, error, loading, reload } = useApi<{ users: ManagedUser[] }>('/users');
  const [actionError, setActionError] = useState<string | null>(null);

  async function change(user: ManagedUser, body: Partial<Pick<ManagedUser, 'role' | 'active'>>) {
    setActionError(null);
    try {
      await api(`/users/${user.id}`, { method: 'PATCH', body });
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function resetPassword(user: ManagedUser) {
    const password = window.prompt(`New password for ${user.username} (at least 8 characters):`);
    if (password === null) return;
    setActionError(null);
    try {
      await api(`/users/${user.id}`, { method: 'PATCH', body: { password } });
      window.alert(`Password for ${user.username} has been changed.`);
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Users</h1>
      </div>
      <div className="detail-grid">
        <section className="card card-flush">
          <h2 className="card-title">Accounts</h2>
          <ErrorBanner message={error ?? actionError} onRetry={error ? reload : undefined} />
          {loading && !data && <Loading />}
          {data && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Username</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Created</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} className={u.active ? undefined : 'row-inactive'}>
                      <td>
                        {u.username}
                        {u.id === me?.id && <span className="muted"> (you)</span>}
                      </td>
                      <td>
                        <select
                          aria-label={`Role for ${u.username}`}
                          value={u.role}
                          disabled={u.id === me?.id}
                          onChange={(e) => change(u, { role: e.target.value as Role })}
                        >
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{u.active ? 'Active' : 'Deactivated'}</td>
                      <td>{formatTimestamp(u.createdAt)}</td>
                      <td className="actions">
                        <button type="button" className="btn btn-small" onClick={() => resetPassword(u)}>
                          Reset password
                        </button>
                        {u.id !== me?.id && (
                          <button type="button" className="btn btn-small" onClick={() => change(u, { active: !u.active })}>
                            {u.active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="card">
          <h2>Add user</h2>
          <AddUserForm onCreated={reload} />
        </section>
      </div>
    </>
  );
}

function AddUserForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ username: '', password: '', role: 'employee' as Role });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const found: Errors = {};
    if (form.username.trim().length < 3) found.username = 'Username must be at least 3 characters.';
    if (form.password.length < 8) found.password = 'Password must be at least 8 characters.';
    setErrors(found);
    setMessage(null);
    setCreated(null);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await api('/users', { body: { ...form, username: form.username.trim() } });
      setCreated(form.username.trim());
      setForm({ username: '', password: '', role: form.role });
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setMessage(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {created && (
        <div className="banner banner-success" role="status">
          Account “{created}” created.
        </div>
      )}
      <ErrorBanner message={message} />
      <Field label="Username" error={errors.username}>
        <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" />
      </Field>
      <Field label="Temporary password" error={errors.password} hint="At least 8 characters. Share it with the user privately.">
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
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
